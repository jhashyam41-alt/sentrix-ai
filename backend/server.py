from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, UploadFile, File, Query
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from bson import ObjectId
import uuid

# Load environment variables first
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Import models and auth
from models import *
from auth import (
    hash_password, verify_password, create_access_token, create_refresh_token,
    create_temp_token, get_current_user, totp_service, validate_password
)
from services.storage_service import init_storage, put_object, get_object, generate_upload_path

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI(title="AMLGuard API")
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ===================================
# STARTUP AND INITIALIZATION
# ===================================

@app.on_event("startup")
async def startup_event():
    try:
        # Initialize storage
        init_storage()
        logger.info("Storage initialized")
    except Exception as e:
        logger.error(f"Storage init failed: {e}")
    
    # Create indexes
    await db.users.create_index("email", unique=True)
    await db.users.create_index([("tenant_id", 1), ("email", 1)])
    await db.customers.create_index([("tenant_id", 1)])
    await db.cases.create_index([("tenant_id", 1), ("customer_id", 1)])
    await db.audit_logs.create_index([("tenant_id", 1), ("timestamp", -1)])
    await db.tenants.create_index("company_name")
    await db.password_reset_tokens.create_index("expires_at", expireAfterSeconds=0)
    await db.login_attempts.create_index("identifier")
    logger.info("Database indexes created")
    
    # Seed admin and tenant
    await seed_admin_and_tenant()

async def create_default_tenant(db):
    """Create default tenant if it doesn't exist"""
    tenant_id = "default-tenant"
    tenant = await db.tenants.find_one({"id": tenant_id})
    if not tenant:
        tenant_doc = {
            "id": tenant_id,
            "company_name": "AMLGuard Demo",
            "primary_contact": os.environ.get("ADMIN_EMAIL", "admin@amlguard.com"),
            "subscription_plan": "enterprise",
            "customer_limit": 999999,
            "customer_count": 0,
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "settings": {}
        }
        await db.tenants.insert_one(tenant_doc)
        logger.info(f"Default tenant created: {tenant_id}")
    return tenant_id

async def create_admin_user(db, tenant_id):
    """Create or update admin user"""
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@amlguard.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "Admin123!@#")
    
    existing = await db.users.find_one({"email": admin_email})
    if existing == None:
        hashed = hash_password(admin_password)
        user_doc = {
            "_id": ObjectId(),
            "id": str(uuid.uuid4()),
            "email": admin_email,
            "password_hash": hashed,
            "name": "Super Admin",
            "role": "super_admin",
            "tenant_id": tenant_id,
            "totp_enabled": False,
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(user_doc)
        logger.info(f"Admin user created: {admin_email}")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {"password_hash": hash_password(admin_password)}}
        )
        logger.info(f"Admin password updated")
    
    return admin_email, admin_password

def write_test_credentials(admin_email, admin_password):
    """Write test credentials to file"""
    os.makedirs("/app/memory", exist_ok=True)
    with open("/app/memory/test_credentials.md", "w") as f:
        f.write(f"""# AMLGuard Test Credentials

## Admin Account
- Email: {admin_email}
- Password: {admin_password}
- Role: super_admin

## API Endpoints
- Login: POST /api/auth/login
- Register: POST /api/auth/register
- Get Current User: GET /api/auth/me
- Dashboard: GET /api/dashboard/stats
- Customers: GET /api/customers
""")

async def seed_admin_and_tenant():
    """Seed admin user and default tenant"""
    tenant_id = await create_default_tenant(db)
    admin_email, admin_password = await create_admin_user(db, tenant_id)
    write_test_credentials(admin_email, admin_password)

# ===================================
# HELPER FUNCTIONS
# ===================================

async def log_audit(tenant_id: str, user: dict, action_type: str, module: str, record_id: str = None, details: dict = None, request: Request = None):
    ip = request.client.host if request else "system"
    audit_doc = {
        "id": str(uuid.uuid4()),
        "tenant_id": tenant_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "user_id": user.get("id", "system"),
        "user_name": user.get("name", "System"),
        "user_role": user.get("role", "system"),
        "ip_address": ip,
        "action_type": action_type,
        "module": module,
        "record_id": record_id,
        "details": details
    }
    await db.audit_logs.insert_one(audit_doc)

def format_api_error(detail):
    if detail == None:
        return "Something went wrong"
    if isinstance(detail, str):
        return detail
    if isinstance(detail, list):
        return " ".join([str(e.get("msg", e)) for e in detail if e])
    return str(detail)

# ===================================
# AUTHENTICATION ROUTES
# ===================================

@api_router.post("/auth/register")
async def register(req: RegisterRequest):
    if not validate_password(req.password):
        raise HTTPException(400, "Password must be at least 12 characters with uppercase, number, and symbol")
    
    existing = await db.users.find_one({"email": req.email.lower()})
    if existing:
        raise HTTPException(400, "Email already registered")
    
    user_id = str(uuid.uuid4())
    user_doc = {
        "_id": ObjectId(),
        "id": user_id,
        "email": req.email.lower(),
        "password_hash": hash_password(req.password),
        "name": req.name,
        "role": req.role.value,
        "tenant_id": req.tenant_id,
        "totp_enabled": False,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_doc)
    user_doc["_id"] = str(user_doc["_id"])
    user_doc.pop("password_hash")
    
    return {"message": "User registered successfully", "user": user_doc}

@api_router.post("/auth/login")
async def login(req: LoginRequest, response: Response):
    email = req.email.lower()
    user = await db.users.find_one({"email": email})
    
    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(401, "Invalid credentials")
    
    if not user.get("is_active"):
        raise HTTPException(403, "Account is deactivated")
    
    # Check 2FA
    if user.get("totp_enabled"):
        temp_token = create_temp_token(str(user["_id"]))
        return {
            "totp_required": True,
            "temp_token": temp_token
        }
    
    # No 2FA - return access token
    access_token = create_access_token(str(user["_id"]), email, user["tenant_id"])
    refresh_token = create_refresh_token(str(user["_id"]))
    
    response.set_cookie("access_token", access_token, httponly=True, secure=False, samesite="lax", max_age=900)
    response.set_cookie("refresh_token", refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800)
    
    user["_id"] = str(user["_id"])
    user.pop("password_hash")
    user.pop("totp_secret", None)
    user.pop("backup_codes", None)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@api_router.post("/auth/2fa/verify")
async def verify_2fa(req: TOTPVerifyRequest, temp_token: str, response: Response):
    import jwt
    try:
        payload = jwt.decode(temp_token, os.environ.get("JWT_SECRET"), algorithms=["HS256"])
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        
        if not user or not user.get("totp_enabled"):
            raise HTTPException(404, "2FA not enabled")
        
        if totp_service.verify_totp(user["totp_secret"], req.token):
            access_token = create_access_token(str(user["_id"]), user["email"], user["tenant_id"])
            refresh_token = create_refresh_token(str(user["_id"]))
            
            response.set_cookie("access_token", access_token, httponly=True, secure=False, samesite="lax", max_age=900)
            response.set_cookie("refresh_token", refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800)
            
            user["_id"] = str(user["_id"])
            user.pop("password_hash")
            user.pop("totp_secret")
            user.pop("backup_codes", None)
            
            return {
                "access_token": access_token,
                "token_type": "bearer",
                "user": user
            }
        
        raise HTTPException(401, "Invalid TOTP token")
    except Exception as e:
        raise HTTPException(401, f"Verification failed: {str(e)}")

@api_router.get("/auth/me")
async def get_me(request: Request):
    user = await get_current_user(request, db)
    return user

@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")
    return {"message": "Logged out successfully"}

@api_router.post("/auth/2fa/setup/initiate")
async def initiate_2fa_setup(request: Request):
    user = await get_current_user(request, db)
    
    secret = totp_service.generate_secret()
    backup_codes = totp_service.generate_backup_codes()
    qr_code = totp_service.generate_qr_code(user["email"], secret)
    
    return {
        "secret": secret,
        "qr_code": qr_code,
        "backup_codes": backup_codes
    }

@api_router.post("/auth/2fa/setup/confirm")
async def confirm_2fa_setup(req: dict, request: Request):
    user = await get_current_user(request, db)
    
    secret = req.get("secret")
    token = req.get("token")
    backup_codes = req.get("backup_codes", [])
    
    if not totp_service.verify_totp(secret, token):
        raise HTTPException(400, "Invalid TOTP token")
    
    hashed_codes = totp_service.get_hashed_backup_codes(backup_codes)
    
    await db.users.update_one(
        {"_id": ObjectId(user["id"])},
        {"$set": {
            "totp_secret": secret,
            "totp_enabled": True,
            "backup_codes": hashed_codes,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    await log_audit(user["tenant_id"], user, "totp_enabled", "auth", user["id"], request=request)
    
    return {"message": "2FA enabled successfully"}

# ===================================
# DASHBOARD ROUTES
# ===================================

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(request: Request):
    user = await get_current_user(request, db)
    tenant_id = user["tenant_id"]
    
    total_customers = await db.customers.count_documents({"tenant_id": tenant_id})
    pending_reviews = await db.customers.count_documents({
        "tenant_id": tenant_id,
        "status": {"$in": ["submitted", "under_review"]}
    })
    high_risk = await db.customers.count_documents({
        "tenant_id": tenant_id,
        "risk_level": {"$in": ["high", "unacceptable"]}
    })
    open_cases = await db.cases.count_documents({
        "tenant_id": tenant_id,
        "status": {"$in": ["open", "in_progress", "escalated", "pending_info"]}
    })
    
    # Get recent customers
    recent_customers = await db.customers.find(
        {"tenant_id": tenant_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(5).to_list(5)
    
    # Get open cases
    open_cases_list = await db.cases.find(
        {"tenant_id": tenant_id, "status": {"$in": ["open", "in_progress", "escalated"]}},
        {"_id": 0}
    ).sort("created_at", -1).limit(5).to_list(5)
    
    return {
        "total_customers": total_customers,
        "pending_reviews": pending_reviews,
        "high_risk_customers": high_risk,
        "open_cases": open_cases,
        "recent_customers": recent_customers,
        "open_cases_list": open_cases_list
    }

# ===================================
# CUSTOMER ROUTES
# ===================================

@api_router.post("/customers")
async def create_customer(data: dict, request: Request):
    user = await get_current_user(request, db)
    tenant_id = user["tenant_id"]
    
    # Check tenant limits
    tenant = await db.tenants.find_one({"id": tenant_id})
    if tenant and tenant["customer_count"] >= tenant["customer_limit"]:
        raise HTTPException(403, "Customer limit reached. Please upgrade your plan.")
    
    customer_id = str(uuid.uuid4())
    customer_doc = {
        "id": customer_id,
        "tenant_id": tenant_id,
        "customer_type": data.get("customer_type", "individual"),
        "status": "in_progress",
        "risk_score": 0,
        "risk_level": "low",
        "cdd_tier": "standard_cdd",
        "cdd_status": "not_started",
        "screening_status": "no_match",
        "sanctions_status": "no_match",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user["id"],
        "customer_data": data.get("customer_data", {})
    }
    
    await db.customers.insert_one(customer_doc)
    await db.tenants.update_one({"id": tenant_id}, {"$inc": {"customer_count": 1}})
    await log_audit(tenant_id, user, "customer_created", "customers", customer_id, request=request)
    
    customer_doc.pop("_id", None)
    return customer_doc

@api_router.get("/customers")
async def list_customers(
    request: Request,
    status: Optional[str] = None,
    risk_level: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 50,
    skip: int = 0
):
    user = await get_current_user(request, db)
    tenant_id = user["tenant_id"]
    
    query = {"tenant_id": tenant_id}
    if status:
        query["status"] = status
    if risk_level:
        query["risk_level"] = risk_level
    
    customers = await db.customers.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.customers.count_documents(query)
    
    return {
        "customers": customers,
        "total": total,
        "limit": limit,
        "skip": skip
    }

@api_router.get("/customers/{customer_id}")
async def get_customer(customer_id: str, request: Request):
    user = await get_current_user(request, db)
    customer = await db.customers.find_one({"id": customer_id, "tenant_id": user["tenant_id"]}, {"_id": 0})
    
    if not customer:
        raise HTTPException(404, "Customer not found")
    
    # Get related cases
    cases = await db.cases.find({"customer_id": customer_id, "tenant_id": user["tenant_id"]}, {"_id": 0}).to_list(100)
    customer["cases"] = cases
    
    return customer

@api_router.put("/customers/{customer_id}")
async def update_customer(customer_id: str, data: dict, request: Request):
    user = await get_current_user(request, db)
    
    existing = await db.customers.find_one({"id": customer_id, "tenant_id": user["tenant_id"]})
    if not existing:
        raise HTTPException(404, "Customer not found")
    
    data["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.customers.update_one(
        {"id": customer_id, "tenant_id": user["tenant_id"]},
        {"$set": data}
    )
    
    await log_audit(user["tenant_id"], user, "customer_updated", "customers", customer_id, request=request)
    
    return {"message": "Customer updated successfully"}

# ===================================
# CASES ROUTES
# ===================================

@api_router.post("/cases")
async def create_case(data: dict, request: Request):
    user = await get_current_user(request, db)
    tenant_id = user["tenant_id"]
    
    case_number = await db.cases.count_documents({"tenant_id": tenant_id}) + 1
    case_id = f"CASE-{case_number:05d}"
    
    case_doc = {
        "id": str(uuid.uuid4()),
        "case_id": case_id,
        "tenant_id": tenant_id,
        "customer_id": data["customer_id"],
        "customer_name": data["customer_name"],
        "case_type": data["case_type"],
        "priority": data.get("priority", "medium"),
        "status": "open",
        "assigned_to": data.get("assigned_to"),
        "due_date": data.get("due_date"),
        "sar_filed": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user["id"]
    }
    
    await db.cases.insert_one(case_doc)
    await log_audit(tenant_id, user, "case_created", "cases", case_doc["id"], request=request)
    
    case_doc.pop("_id", None)
    return case_doc

@api_router.get("/cases")
async def list_cases(
    request: Request,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    limit: int = 50,
    skip: int = 0
):
    user = await get_current_user(request, db)
    tenant_id = user["tenant_id"]
    
    query = {"tenant_id": tenant_id}
    if status:
        query["status"] = status
    if priority:
        query["priority"] = priority
    
    cases = await db.cases.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.cases.count_documents(query)
    
    return {
        "cases": cases,
        "total": total
    }

@api_router.get("/cases/{case_id}")
async def get_case(case_id: str, request: Request):
    user = await get_current_user(request, db)
    case = await db.cases.find_one({"id": case_id, "tenant_id": user["tenant_id"]}, {"_id": 0})
    
    if not case:
        raise HTTPException(404, "Case not found")
    
    # Get comments
    comments = await db.case_comments.find({"case_id": case_id}, {"_id": 0}).sort("created_at", 1).to_list(100)
    case["comments"] = comments
    
    return case

@api_router.post("/cases/{case_id}/comments")
async def add_case_comment(case_id: str, data: dict, request: Request):
    user = await get_current_user(request, db)
    
    case = await db.cases.find_one({"id": case_id, "tenant_id": user["tenant_id"]})
    if not case:
        raise HTTPException(404, "Case not found")
    
    comment_doc = {
        "id": str(uuid.uuid4()),
        "case_id": case_id,
        "author_id": user["id"],
        "author_name": user["name"],
        "author_role": user["role"],
        "comment": data["comment"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.case_comments.insert_one(comment_doc)
    await db.cases.update_one({"id": case_id}, {"$set": {"updated_at": datetime.now(timezone.utc).isoformat()}})
    
    comment_doc.pop("_id", None)
    return comment_doc

# ===================================
# FILE UPLOAD ROUTES
# ===================================

@api_router.post("/files/upload")
async def upload_file(
    file: UploadFile = File(...),
    customer_id: str = Query(...),
    request: Request = None
):
    user = await get_current_user(request, db)
    
    # Validate file size (10MB max)
    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(400, "File size exceeds 10MB limit")
    
    # Validate file type
    allowed_types = ["application/pdf", "image/jpeg", "image/jpg", "image/png"]
    if file.content_type not in allowed_types:
        raise HTTPException(400, f"File type {file.content_type} not allowed")
    
    # Upload to storage
    path = generate_upload_path(user["id"], file.filename)
    result = put_object(path, contents, file.content_type)
    
    # Store in database
    file_doc = {
        "id": str(uuid.uuid4()),
        "storage_path": result["path"],
        "original_filename": file.filename,
        "content_type": file.content_type,
        "size": result["size"],
        "customer_id": customer_id,
        "tenant_id": user["tenant_id"],
        "uploaded_by": user["id"],
        "is_deleted": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.files.insert_one(file_doc)
    file_doc.pop("_id", None)
    
    return file_doc

@api_router.get("/files/{file_id}/download")
async def download_file(file_id: str, request: Request, auth: Optional[str] = Query(None)):
    # Support query param auth for img tags
    if auth:
        request.headers.__dict__["_list"].append((b"authorization", f"Bearer {auth}".encode()))
    
    user = await get_current_user(request, db)
    
    file_doc = await db.files.find_one({"id": file_id, "tenant_id": user["tenant_id"], "is_deleted": False})
    if not file_doc:
        raise HTTPException(404, "File not found")
    
    data, content_type = get_object(file_doc["storage_path"])
    
    return Response(content=data, media_type=file_doc.get("content_type", content_type))

# ===================================
# AUDIT LOG ROUTES
# ===================================

@api_router.get("/audit-logs")
async def get_audit_logs(
    request: Request,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    action_type: Optional[str] = None,
    limit: int = 100,
    skip: int = 0
):
    user = await get_current_user(request, db)
    
    # Only certain roles can view audit logs
    if user["role"] not in ["super_admin", "compliance_officer", "read_only_auditor"]:
        raise HTTPException(403, "Access denied")
    
    query = {"tenant_id": user["tenant_id"]}
    if action_type:
        query["action_type"] = action_type
    
    logs = await db.audit_logs.find(query, {"_id": 0}).sort("timestamp", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.audit_logs.count_documents(query)
    
    return {
        "logs": logs,
        "total": total
    }

# ===================================
# SCREENING ROUTES (MOCK)
# ===================================

@api_router.post("/screening/run/{customer_id}")
async def run_screening(customer_id: str, request: Request):
    user = await get_current_user(request, db)
    
    customer = await db.customers.find_one({"id": customer_id, "tenant_id": user["tenant_id"]})
    if not customer:
        raise HTTPException(404, "Customer not found")
    
    # Mock screening results
    import secrets
    # Use secrets for cryptographically secure random selection
    sanctions_options = ["no_match", "no_match", "no_match", "potential_match"]
    pep_options = [False, False, False, True]
    adverse_options = [False, False, True]
    
    screening_results = {
        "sanctions": {"status": sanctions_options[secrets.randbelow(len(sanctions_options))]},
        "pep": {"is_pep": pep_options[secrets.randbelow(len(pep_options))]},
        "adverse_media": {"has_hits": adverse_options[secrets.randbelow(len(adverse_options))]}
    }
    
    # Update customer with screening results
    update_data = {
        "sanctions_status": screening_results["sanctions"]["status"],
        "pep_status": "match" if screening_results["pep"]["is_pep"] else "no_match",
        "adverse_media_status": "hits_found" if screening_results["adverse_media"]["has_hits"] else "no_hits",
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Calculate risk score
    risk_score = 15  # Base
    if screening_results["sanctions"]["status"] == "potential_match":
        risk_score += 20
    if screening_results["pep"]["is_pep"]:
        risk_score += 20
    if screening_results["adverse_media"]["has_hits"]:
        risk_score += 15
    
    update_data["risk_score"] = risk_score
    update_data["risk_level"] = "low" if risk_score < 30 else "medium" if risk_score < 66 else "high"
    
    await db.customers.update_one(
        {"id": customer_id},
        {"$set": update_data}
    )
    
    await log_audit(user["tenant_id"], user, "screening_run", "screening", customer_id, request=request)
    
    return {"message": "Screening completed", "results": screening_results}

# Include router
app.include_router(api_router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
