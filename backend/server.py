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
from models import (
    UserRole, OnboardingStatus, CDDTier, CDDStatus, RiskLevel, 
    ScreeningStatus, CasePriority, CaseStatus, CaseType,
    User, LoginRequest, RegisterRequest, TOTPSetupResponse, TOTPVerifyRequest,
    Customer, IndividualCustomerData, CorporateCustomerData, RiskScoreBreakdown,
    Case, CaseComment, AuditLog, Tenant, SubscriptionPlan, Notification
)
from auth import (
    hash_password, verify_password, create_access_token, create_refresh_token,
    create_temp_token, get_current_user, totp_service, validate_password
)
from services.storage_service import init_storage, put_object, get_object, generate_upload_path

# Helper function to auto-assign CDD tier based on risk score
def auto_assign_cdd_tier(risk_score: int) -> str:
    if risk_score <= 30:
        return "sdd"
    elif risk_score <= 65:
        return "standard_cdd"
    else:
        return "edd"

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
    # Create shyam@sentrixai.com admin from environment variables
    sentrix_email = os.environ.get("SENTRIX_ADMIN_EMAIL", "shyam@sentrixai.com")
    sentrix_password = os.environ.get("SENTRIX_ADMIN_PASSWORD", "Sentrix@2024")
    
    sentrix_user = await db.users.find_one({"email": sentrix_email})
    if sentrix_user is None:
        hashed = hash_password(sentrix_password)
        user_doc = {
            "_id": ObjectId(),
            "id": str(uuid.uuid4()),
            "email": sentrix_email,
            "password_hash": hashed,
            "name": "Shyam - Super Admin",
            "role": "super_admin",
            "tenant_id": tenant_id,
            "totp_enabled": False,
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(user_doc)
        logger.info(f"Sentrix admin user created: {sentrix_email}")
    
    # Create default admin@amlguard.com admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@amlguard.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "Admin123!@#")
    
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
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
        logger.info("Admin password updated")
    
    return sentrix_email, sentrix_password, admin_email, admin_password

def write_test_credentials(sentrix_email, sentrix_password, admin_email, admin_password):
    """Write test credentials to file"""
    os.makedirs("/app/memory", exist_ok=True)
    with open("/app/memory/test_credentials.md", "w") as f:
        f.write(f"""# AMLGuard Test Credentials

## Sentrix Admin Account (Primary)
- Email: {sentrix_email}
- Password: {sentrix_password}
- Role: super_admin

## Default Admin Account
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
    sentrix_email, sentrix_password, admin_email, admin_password = await create_admin_user(db, tenant_id)
    write_test_credentials(sentrix_email, sentrix_password, admin_email, admin_password)

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
    if detail is None:
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
async def register(req: RegisterRequest, request: Request):
    if not validate_password(req.password):
        raise HTTPException(400, "Password must be at least 12 characters with uppercase, number, and symbol")
    
    existing = await db.users.find_one({"email": req.email.lower()})
    if existing:
        raise HTTPException(400, "Email already registered")
    
    # Check if this is the first user (excluding seed admins)
    user_count = await db.users.count_documents({})
    is_first_user = user_count <= 2  # 2 seed admins already exist
    
    # First user becomes Super Admin
    user_role = "super_admin" if is_first_user else req.role.value
    
    user_id = str(uuid.uuid4())
    user_doc = {
        "_id": ObjectId(),
        "id": user_id,
        "email": req.email.lower(),
        "password_hash": hash_password(req.password),
        "name": req.name,
        "role": user_role,
        "tenant_id": req.tenant_id,
        "totp_enabled": False,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_doc)
    await log_audit(req.tenant_id, {"id": "system", "name": "System", "role": "system"}, 
                   "user_registered", "auth", user_id, 
                   {"email": req.email.lower(), "role": user_role}, request)
    
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
    
    # KYC Verification Stats
    total_kyc = await db.kyc_verifications.count_documents({"tenant_id": tenant_id})
    kyc_verified = await db.kyc_verifications.count_documents({"tenant_id": tenant_id, "verification_status": "verified"})
    kyc_failed = await db.kyc_verifications.count_documents({"tenant_id": tenant_id, "verification_status": "failed"})
    
    # Risk distribution
    risk_low = await db.customers.count_documents({"tenant_id": tenant_id, "risk_level": "low"})
    risk_medium = await db.customers.count_documents({"tenant_id": tenant_id, "risk_level": "medium"})
    risk_high = await db.customers.count_documents({"tenant_id": tenant_id, "risk_level": "high"})
    risk_unacceptable = await db.customers.count_documents({"tenant_id": tenant_id, "risk_level": "unacceptable"})
    
    # Screening stats
    pep_matches = await db.customers.count_documents({"tenant_id": tenant_id, "pep_status": "match"})
    sanctions_matches = await db.customers.count_documents({"tenant_id": tenant_id, "sanctions_status": "potential_match"})
    adverse_media_hits = await db.customers.count_documents({"tenant_id": tenant_id, "adverse_media_status": "hits_found"})
    
    # API usage (for super_admin)
    api_usage = {}
    if user["role"] == "super_admin":
        keys = await db.api_keys.find({"tenant_id": tenant_id}, {"_id": 0, "id": 1}).to_list(50)
        key_ids = [k["id"] for k in keys]
        total_api_calls = await db.api_call_logs.count_documents({"client_id": {"$in": key_ids}}) if key_ids else 0
        active_keys = await db.api_keys.count_documents({"tenant_id": tenant_id, "is_active": True})
        api_usage = {
            "total_api_calls": total_api_calls,
            "active_api_keys": active_keys,
        }
    
    # CDD tier breakdown
    cdd_sdd = await db.customers.count_documents({"tenant_id": tenant_id, "cdd_tier": "sdd"})
    cdd_standard = await db.customers.count_documents({"tenant_id": tenant_id, "cdd_tier": "standard_cdd"})
    cdd_edd = await db.customers.count_documents({"tenant_id": tenant_id, "cdd_tier": "edd"})
    
    # Integration status
    from services.signzy_service import get_service_status as signzy_status
    from services.opensanctions_service import get_service_status as os_status
    
    return {
        "total_customers": total_customers,
        "pending_reviews": pending_reviews,
        "high_risk_customers": high_risk,
        "open_cases": open_cases,
        "recent_customers": recent_customers,
        "open_cases_list": open_cases_list,
        "kyc_stats": {
            "total": total_kyc,
            "verified": kyc_verified,
            "failed": kyc_failed,
        },
        "risk_distribution": {
            "low": risk_low,
            "medium": risk_medium,
            "high": risk_high,
            "unacceptable": risk_unacceptable,
        },
        "screening_stats": {
            "pep_matches": pep_matches,
            "sanctions_matches": sanctions_matches,
            "adverse_media_hits": adverse_media_hits,
        },
        "cdd_breakdown": {
            "sdd": cdd_sdd,
            "standard_cdd": cdd_standard,
            "edd": cdd_edd,
        },
        "api_usage": api_usage,
        "integrations": {**signzy_status(), **os_status()},
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

def _build_audit_query(tenant_id: str, action_type: str = None, user_name: str = None,
                       module: str = None, start_date: str = None, end_date: str = None) -> dict:
    """Build MongoDB query for audit logs (shared by list + export)."""
    query = {"tenant_id": tenant_id}
    if action_type:
        query["action_type"] = action_type
    if user_name:
        query["user_name"] = {"$regex": user_name, "$options": "i"}
    if module:
        query["module"] = module
    if start_date or end_date:
        ts_filter = {}
        if start_date:
            ts_filter["$gte"] = start_date
        if end_date:
            ts_filter["$lte"] = end_date + "T23:59:59"
        query["timestamp"] = ts_filter
    return query

@api_router.get("/audit-logs")
async def get_audit_logs(
    request: Request,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    action_type: Optional[str] = None,
    user_name: Optional[str] = None,
    module: Optional[str] = None,
    limit: int = 100,
    skip: int = 0
):
    user = await get_current_user(request, db)

    if user["role"] not in ["super_admin", "compliance_officer", "read_only_auditor"]:
        raise HTTPException(403, "Access denied")

    query = _build_audit_query(user["tenant_id"], action_type, user_name, module, start_date, end_date)

    logs = await db.audit_logs.find(query, {"_id": 0}).sort("timestamp", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.audit_logs.count_documents(query)

    return {
        "logs": logs,
        "total": total
    }

@api_router.get("/audit-logs/filters")
async def get_audit_log_filters(request: Request):
    """Return distinct action types and modules for filter dropdowns."""
    user = await get_current_user(request, db)
    if user["role"] not in ["super_admin", "compliance_officer", "read_only_auditor"]:
        raise HTTPException(403, "Access denied")

    action_types = await db.audit_logs.distinct("action_type", {"tenant_id": user["tenant_id"]})
    modules = await db.audit_logs.distinct("module", {"tenant_id": user["tenant_id"]})
    users_list = await db.audit_logs.distinct("user_name", {"tenant_id": user["tenant_id"]})
    return {"action_types": sorted(action_types), "modules": sorted(modules), "users": sorted(users_list)}

@api_router.get("/audit-logs/export/csv")
async def export_audit_csv(
    request: Request,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    action_type: Optional[str] = None,
    user_name: Optional[str] = None,
    module: Optional[str] = None
):
    import csv
    import io
    user = await get_current_user(request, db)
    if user["role"] not in ["super_admin", "compliance_officer", "read_only_auditor"]:
        raise HTTPException(403, "Access denied")

    query = _build_audit_query(user["tenant_id"], action_type, user_name, module, start_date, end_date)
    logs = await db.audit_logs.find(query, {"_id": 0}).sort("timestamp", -1).to_list(5000)

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["Timestamp", "User", "Role", "Action", "Module", "Record ID", "IP Address", "Details"])
    for log in logs:
        writer.writerow([
            log.get("timestamp", ""),
            log.get("user_name", ""),
            log.get("user_role", ""),
            log.get("action_type", ""),
            log.get("module", ""),
            log.get("record_id", ""),
            log.get("ip_address", ""),
            str(log.get("details", ""))
        ])

    await log_audit(user["tenant_id"], user, "audit_log_exported", "audit", None, {"format": "csv"}, request)

    return Response(
        content=buf.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=audit_log_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.csv"}
    )

@api_router.get("/audit-logs/export/pdf")
async def export_audit_pdf(
    request: Request,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    action_type: Optional[str] = None,
    user_name: Optional[str] = None,
    module: Optional[str] = None
):
    from services.pdf_service import generate_audit_pdf

    user = await get_current_user(request, db)
    if user["role"] not in ["super_admin", "compliance_officer", "read_only_auditor"]:
        raise HTTPException(403, "Access denied")

    query = _build_audit_query(user["tenant_id"], action_type, user_name, module, start_date, end_date)
    logs = await db.audit_logs.find(query, {"_id": 0}).sort("timestamp", -1).to_list(5000)

    pdf_bytes = generate_audit_pdf(logs)

    await log_audit(user["tenant_id"], user, "audit_log_exported", "audit", None, {"format": "pdf"}, request)

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=audit_log_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.pdf"}
    )

# ===================================
# CASE MANAGEMENT ROUTES
# ===================================

async def auto_create_case(params: dict, db):
    """Helper function to auto-create cases.
    
    params keys: tenant_id, customer_id, customer_name, case_type, priority, created_by, details
    """
    tenant_id = params["tenant_id"]
    case_number = await db.cases.count_documents({"tenant_id": tenant_id}) + 1
    case_id = f"CASE-{case_number:05d}"
    
    now = datetime.now(timezone.utc).isoformat()
    case_doc = {
        "id": str(uuid.uuid4()),
        "case_id": case_id,
        "tenant_id": tenant_id,
        "customer_id": params["customer_id"],
        "customer_name": params["customer_name"],
        "case_type": params["case_type"],
        "priority": params["priority"],
        "status": "open",
        "assigned_to": None,
        "due_date": None,
        "sar_filed": False,
        "sar_reference": None,
        "sar_filed_date": None,
        "disposition": None,
        "disposition_note": None,
        "created_at": now,
        "updated_at": now,
        "created_by": params["created_by"],
        "details": params.get("details", {})
    }
    
    await db.cases.insert_one(case_doc)
    return case_id

@api_router.get("/cases/{case_id}/notes")
async def get_case_notes(case_id: str, request: Request):
    user = await get_current_user(request, db)
    
    case = await db.cases.find_one({"id": case_id, "tenant_id": user["tenant_id"]})
    if not case:
        raise HTTPException(404, "Case not found")
    
    notes = await db.case_notes.find({"case_id": case_id}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return {"notes": notes}

@api_router.post("/cases/{case_id}/notes")
async def add_case_note(case_id: str, data: dict, request: Request):
    user = await get_current_user(request, db)
    
    case = await db.cases.find_one({"id": case_id, "tenant_id": user["tenant_id"]})
    if not case:
        raise HTTPException(404, "Case not found")
    
    note_doc = {
        "id": str(uuid.uuid4()),
        "case_id": case_id,
        "author_id": user["id"],
        "author_name": user["name"],
        "author_role": user["role"],
        "note": data.get("note"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.case_notes.insert_one(note_doc)
    await db.cases.update_one({"id": case_id}, {"$set": {"updated_at": datetime.now(timezone.utc).isoformat()}})
    
    await log_audit(user["tenant_id"], user, "case_note_added", "cases", case_id, request=request)
    
    note_doc.pop("_id", None)
    return {"message": "Note added successfully", "note": note_doc}

@api_router.post("/cases/{case_id}/escalate")
async def escalate_case(case_id: str, data: dict, request: Request):
    user = await get_current_user(request, db)
    
    case = await db.cases.find_one({"id": case_id, "tenant_id": user["tenant_id"]})
    if not case:
        raise HTTPException(404, "Case not found")
    
    escalated_to = data.get("escalated_to")
    reason = data.get("reason")
    
    update_data = {
        "status": "escalated",
        "assigned_to": escalated_to,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.cases.update_one({"id": case_id, "tenant_id": user["tenant_id"]}, {"$set": update_data})
    
    # Add escalation note
    note_doc = {
        "id": str(uuid.uuid4()),
        "case_id": case_id,
        "author_id": user["id"],
        "author_name": user["name"],
        "author_role": user["role"],
        "note": f"Case escalated to {escalated_to}. Reason: {reason}",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "is_system": True
    }
    await db.case_notes.insert_one(note_doc)
    
    # Send email notification
    from services.email_service import email_service
    officer_user = await db.users.find_one({"id": escalated_to})
    if officer_user:
        await email_service.send_email(
            officer_user.get("email"),
            f"Case Escalated - {case['case_id']}",
            f"Case {case['case_id']} escalated. Customer: {case['customer_name']}. Priority: {case['priority']}. Reason: {reason}"
        )
    
    await log_audit(user["tenant_id"], user, "case_escalated", "cases", case_id,
                   {"escalated_to": escalated_to, "reason": reason}, request)
    
    return {"message": "Case escalated successfully"}

@api_router.post("/cases/{case_id}/sar")
async def update_sar_flag(case_id: str, data: dict, request: Request):
    user = await get_current_user(request, db)
    
    case = await db.cases.find_one({"id": case_id, "tenant_id": user["tenant_id"]})
    if not case:
        raise HTTPException(404, "Case not found")
    
    sar_reference = data.get("sar_reference")
    
    update_data = {
        "sar_filed": True,
        "sar_reference": sar_reference,
        "sar_filed_date": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.cases.update_one({"id": case_id, "tenant_id": user["tenant_id"]}, {"$set": update_data})
    
    # Add SAR note
    note_doc = {
        "id": str(uuid.uuid4()),
        "case_id": case_id,
        "author_id": user["id"],
        "author_name": user["name"],
        "author_role": user["role"],
        "note": f"SAR filed. Reference: {sar_reference}",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "is_system": True
    }
    await db.case_notes.insert_one(note_doc)
    
    await log_audit(user["tenant_id"], user, "sar_filed", "cases", case_id,
                   {"sar_reference": sar_reference}, request)
    
    return {"message": "SAR flag updated successfully"}

@api_router.post("/cases/{case_id}/close")
async def close_case(case_id: str, data: dict, request: Request):
    user = await get_current_user(request, db)
    
    case = await db.cases.find_one({"id": case_id, "tenant_id": user["tenant_id"]})
    if not case:
        raise HTTPException(404, "Case not found")
    
    disposition = data.get("disposition")
    disposition_note = data.get("disposition_note")
    
    if not disposition or not disposition_note:
        raise HTTPException(400, "Both disposition and disposition note are required to close a case")
    
    valid_dispositions = ["no_further_action", "sar_filed", "customer_exited", "monitoring_increased", "referred_to_law_enforcement"]
    if disposition not in valid_dispositions:
        raise HTTPException(400, f"Invalid disposition. Must be one of: {', '.join(valid_dispositions)}")
    
    update_data = {
        "status": "closed",
        "disposition": disposition,
        "disposition_note": disposition_note,
        "closed_at": datetime.now(timezone.utc).isoformat(),
        "closed_by": user["id"],
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.cases.update_one({"id": case_id, "tenant_id": user["tenant_id"]}, {"$set": update_data})
    
    # Add closure note
    note_doc = {
        "id": str(uuid.uuid4()),
        "case_id": case_id,
        "author_id": user["id"],
        "author_name": user["name"],
        "author_role": user["role"],
        "note": f"Case closed. Disposition: {disposition.replace('_', ' ').title()}. Note: {disposition_note}",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "is_system": True
    }
    await db.case_notes.insert_one(note_doc)
    
    await log_audit(user["tenant_id"], user, "case_closed", "cases", case_id,
                   {"disposition": disposition}, request)
    
    return {"message": "Case closed successfully"}

@api_router.put("/cases/{case_id}")
async def update_case(case_id: str, data: dict, request: Request):
    user = await get_current_user(request, db)
    
    case = await db.cases.find_one({"id": case_id, "tenant_id": user["tenant_id"]})
    if not case:
        raise HTTPException(404, "Case not found")
    
    # Only allow updating certain fields
    allowed_fields = ["priority", "status", "assigned_to", "due_date"]
    update_data = {k: v for k, v in data.items() if k in allowed_fields}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.cases.update_one({"id": case_id, "tenant_id": user["tenant_id"]}, {"$set": update_data})
    
    await log_audit(user["tenant_id"], user, "case_updated", "cases", case_id, update_data, request)
    
    return {"message": "Case updated successfully"}

# ===================================
# CDD MANAGEMENT ROUTES
# ===================================

@api_router.post("/cdd/{customer_id}/update-status")
async def update_cdd_status(customer_id: str, data: dict, request: Request):
    user = await get_current_user(request, db)
    
    customer = await db.customers.find_one({"id": customer_id, "tenant_id": user["tenant_id"]})
    if not customer:
        raise HTTPException(404, "Customer not found")
    
    cdd_status = data.get("cdd_status")
    valid_statuses = ["not_started", "in_progress", "complete", "expired", "requires_edd", "edd_in_progress", "edd_complete"]
    
    if cdd_status not in valid_statuses:
        raise HTTPException(400, f"Invalid CDD status. Must be one of: {', '.join(valid_statuses)}")
    
    update_data = {
        "cdd_status": cdd_status,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # If marking as complete, set review and expiry dates
    if cdd_status == "complete" or cdd_status == "edd_complete":
        risk_level = customer.get("risk_level", "medium")
        review_date = datetime.now(timezone.utc)
        
        # Set expiry based on risk level
        if risk_level == "low":
            expiry_years = 3
        elif risk_level == "medium":
            expiry_years = 2
        else:  # high or unacceptable
            expiry_years = 1
        
        expiry_date = review_date + timedelta(days=365 * expiry_years)
        
        update_data["cdd_review_date"] = review_date.isoformat()
        update_data["cdd_expiry_date"] = expiry_date.isoformat()
    
    await db.customers.update_one(
        {"id": customer_id, "tenant_id": user["tenant_id"]},
        {"$set": update_data}
    )
    
    await log_audit(user["tenant_id"], user, "cdd_status_updated", "cdd", customer_id,
                   {"new_status": cdd_status}, request)
    
    return {"message": "CDD status updated successfully", "cdd_status": cdd_status}

@api_router.post("/cdd/{customer_id}/edd-checklist")
async def update_edd_checklist(customer_id: str, data: dict, request: Request):
    user = await get_current_user(request, db)
    
    customer = await db.customers.find_one({"id": customer_id, "tenant_id": user["tenant_id"]})
    if not customer:
        raise HTTPException(404, "Customer not found")
    
    checklist_item = data.get("item")
    checked = data.get("checked", False)
    
    # Get existing EDD checklist or create new
    edd_checklist = customer.get("edd_checklist", {
        "enhanced_sof_evidence": False,
        "enhanced_sow_evidence": False,
        "senior_approval": False,
        "site_visit_conducted": False,
        "monitoring_frequency_set": False,
        "edd_report_signed_off": False
    })
    
    if checklist_item not in edd_checklist:
        raise HTTPException(400, "Invalid checklist item")
    
    edd_checklist[checklist_item] = checked
    
    # Check if all items are complete
    all_complete = all(edd_checklist.values())
    
    update_data = {
        "edd_checklist": edd_checklist,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # If all items complete, auto-update CDD status to edd_complete
    if all_complete and customer.get("cdd_status") == "edd_in_progress":
        update_data["cdd_status"] = "edd_complete"
        
        # Set expiry date (EDD customers are high risk = 1 year)
        review_date = datetime.now(timezone.utc)
        expiry_date = review_date + timedelta(days=365)
        update_data["cdd_review_date"] = review_date.isoformat()
        update_data["cdd_expiry_date"] = expiry_date.isoformat()
    
    await db.customers.update_one(
        {"id": customer_id, "tenant_id": user["tenant_id"]},
        {"$set": update_data}
    )
    
    await log_audit(user["tenant_id"], user, "edd_checklist_updated", "cdd", customer_id,
                   {"item": checklist_item, "checked": checked, "all_complete": all_complete}, request)
    
    return {
        "message": "EDD checklist updated successfully",
        "edd_checklist": edd_checklist,
        "all_complete": all_complete
    }

@api_router.get("/cdd/expiring-reviews")
async def get_expiring_reviews(request: Request, days: int = 30):
    user = await get_current_user(request, db)
    
    # Calculate date 30 days from now
    threshold_date = (datetime.now(timezone.utc) + timedelta(days=days)).isoformat()
    
    # Find customers with expiring CDD reviews
    expiring_customers = await db.customers.find({
        "tenant_id": user["tenant_id"],
        "cdd_expiry_date": {"$lte": threshold_date},
        "cdd_status": {"$in": ["complete", "edd_complete"]}
    }, {"_id": 0}).to_list(100)
    
    # Send email alerts for expiring reviews
    from services.email_service import email_service
    
    if expiring_customers:
        for cust in expiring_customers:
            cust_name = cust.get("customer_data", {}).get("full_name") or cust.get("customer_data", {}).get("company_legal_name", "Customer")
            exp_date = cust.get("cdd_expiry_date")
            
            await email_service.send_email(
                user.get("email"),
                f"CDD Review Expiring Soon - {cust_name}",
                f"CDD review expiring for {cust_name} (ID: {cust.get('id')}). Tier: {cust.get('cdd_tier', 'N/A')}. Expiry: {exp_date}"
            )
    
    return {
        "expiring_count": len(expiring_customers),
        "customers": expiring_customers
    }

# ===================================
# ADVERSE MEDIA SCREENING ROUTES
# ===================================

@api_router.post("/screening/adverse-media/{customer_id}")
async def screen_adverse_media(customer_id: str, request: Request):
    user = await get_current_user(request, db)
    
    customer = await db.customers.find_one({"id": customer_id, "tenant_id": user["tenant_id"]})
    if not customer:
        raise HTTPException(404, "Customer not found")
    
    # Import screening service
    from services.screening_service import screening_service
    
    customer_data = customer.get("customer_data", {})
    adverse_media_result = await screening_service.screen_adverse_media(customer_data)
    
    # Store adverse media screening result
    screening_doc = {
        "id": str(uuid.uuid4()),
        "customer_id": customer_id,
        "tenant_id": user["tenant_id"],
        **adverse_media_result,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.adverse_media_screenings.insert_one(screening_doc)
    
    # Update customer with adverse media status
    update_data = {
        "adverse_media_screening": adverse_media_result,
        "adverse_media_status": "hits_found" if adverse_media_result.get("has_hits") else "no_hits",
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.customers.update_one(
        {"id": customer_id, "tenant_id": user["tenant_id"]},
        {"$set": update_data}
    )
    
    await log_audit(user["tenant_id"], user, "adverse_media_screening_run", "screening", customer_id, 
                   {"has_hits": adverse_media_result.get("has_hits"), "hit_count": len(adverse_media_result.get("hits", []))}, request)
    
    return {"message": "Adverse media screening completed", "adverse_media_screening": adverse_media_result}

@api_router.post("/screening/adverse-media/{customer_id}/mark-hit")
async def mark_adverse_media_hit(customer_id: str, data: dict, request: Request):
    user = await get_current_user(request, db)
    
    customer = await db.customers.find_one({"id": customer_id, "tenant_id": user["tenant_id"]})
    if not customer:
        raise HTTPException(404, "Customer not found")
    
    hit_id = data.get("hit_id")
    relevance = data.get("relevance")  # relevant, not_relevant, under_review
    
    if relevance not in ["relevant", "not_relevant", "under_review"]:
        raise HTTPException(400, "Invalid relevance value")
    
    # Update the hit in adverse media screening
    adverse_media = customer.get("adverse_media_screening", {})
    hits = adverse_media.get("hits", [])
    
    hit_updated = False
    for hit in hits:
        if hit.get("id") == hit_id:
            hit["relevance"] = relevance
            hit["reviewed_by"] = user["id"]
            hit["reviewed_at"] = datetime.now(timezone.utc).isoformat()
            hit_updated = True
            break
    
    if not hit_updated:
        raise HTTPException(404, "Hit not found")
    
    adverse_media["hits"] = hits
    
    # Update risk score if marked as relevant
    current_risk_score = customer.get("risk_score", 0)
    new_risk_score = min(current_risk_score + 15, 100) if relevance == "relevant" else current_risk_score
    
    from services.risk_service import calculate_risk_level
    risk_level = calculate_risk_level(new_risk_score)
    cdd_tier = auto_assign_cdd_tier(new_risk_score)
    
    update_data = {
        "adverse_media_screening": adverse_media,
        "risk_score": new_risk_score,
        "risk_level": risk_level,
        "cdd_tier": cdd_tier,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if cdd_tier == "edd" and customer.get("cdd_status") not in ["edd_in_progress", "edd_complete"]:
        update_data["cdd_status"] = "requires_edd"
    
    await db.customers.update_one(
        {"id": customer_id, "tenant_id": user["tenant_id"]},
        {"$set": update_data}
    )
    
    await log_audit(user["tenant_id"], user, "adverse_media_hit_marked", "screening", customer_id,
                   {"hit_id": hit_id, "relevance": relevance, "new_risk_score": new_risk_score}, request)
    
    return {"message": "Hit marked successfully", "risk_score": new_risk_score}

# ===================================
# PEP SCREENING ROUTES
# ===================================

@api_router.post("/screening/pep/{customer_id}")
async def screen_pep(customer_id: str, request: Request):
    user = await get_current_user(request, db)
    
    customer = await db.customers.find_one({"id": customer_id, "tenant_id": user["tenant_id"]})
    if not customer:
        raise HTTPException(404, "Customer not found")
    
    # Import screening service
    from services.screening_service import screening_service
    
    customer_data = customer.get("customer_data", {})
    pep_result = await screening_service.screen_pep(customer_data)
    
    # Store PEP screening result
    pep_screening_doc = {
        "id": str(uuid.uuid4()),
        "customer_id": customer_id,
        "tenant_id": user["tenant_id"],
        **pep_result,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.pep_screenings.insert_one(pep_screening_doc)
    
    # Update customer with PEP status
    update_data = {
        "pep_screening": pep_result,
        "pep_status": "match" if pep_result.get("is_pep") else "no_match",
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # If PEP detected, increase risk score and potentially trigger EDD
    if pep_result.get("is_pep"):
        pep_tier = pep_result.get("pep_tier")
        from services.risk_service import calculate_pep_points, calculate_risk_level
        pep_points = calculate_pep_points(pep_tier)
        
        new_risk_score = min(customer.get("risk_score", 0) + pep_points, 100)
        update_data["risk_score"] = new_risk_score
        update_data["cdd_tier"] = auto_assign_cdd_tier(new_risk_score)
        update_data["risk_level"] = calculate_risk_level(new_risk_score)
        
        if update_data["risk_level"] == "high":
            if update_data["cdd_tier"] == "edd" and customer.get("cdd_status") not in ["edd_in_progress", "edd_complete"]:
                update_data["cdd_status"] = "requires_edd"
        
        from services.email_service import email_service
        await email_service.send_email(
            user.get("email"),
            f"PEP Match Detected - {customer_data.get('full_name', 'Customer')}",
            f"PEP match detected for {customer_data.get('full_name', 'N/A')}. Tier: {pep_tier}. Risk Score: {new_risk_score}/100."
        )
        
        customer_name = customer_data.get("full_name") or customer_data.get("company_legal_name", "Unknown")
        priority = "critical" if pep_tier == "tier1" else "high" if pep_tier == "tier2" else "medium"
        await auto_create_case({
            "tenant_id": user["tenant_id"],
            "customer_id": customer_id,
            "customer_name": customer_name,
            "case_type": "pep_match",
            "priority": priority,
            "created_by": user["id"],
            "details": {"pep_tier": pep_tier, "risk_score": new_risk_score, "trigger": "pep_screening"},
        }, db)
    
    await db.customers.update_one(
        {"id": customer_id, "tenant_id": user["tenant_id"]},
        {"$set": update_data}
    )
    
    await log_audit(user["tenant_id"], user, "pep_screening_run", "screening", customer_id, 
                   {"is_pep": pep_result.get("is_pep"), "pep_tier": pep_result.get("pep_tier")}, request)
    
    return {"message": "PEP screening completed", "pep_screening": pep_result}

# ===================================
# SCREENING ROUTES (MOCK)
# ===================================

@api_router.post("/screening/run-quick")
async def run_quick_screening(data: dict, request: Request):
    """Quick screening from the Screening Hub (no customer required)."""
    user = await get_current_user(request, db)

    name = data.get("name", "")
    if not name:
        raise HTTPException(400, "name is required")

    checks = data.get("checks", ["sanctions", "pep"])
    nationality = data.get("nationality")
    dob = data.get("dateOfBirth")
    id_type = data.get("idType")
    id_number = data.get("idNumber")

    result = {
        "screeningId": f"scr_{uuid.uuid4().hex[:12]}",
        "status": "completed",
        "name": name,
        "checks_requested": checks,
    }

    # KYC check
    if "kyc" in checks and id_type and id_number:
        from services import signzy_service
        kyc_fn = {
            "PAN": lambda: signzy_service.verify_pan(id_number, name),
            "AADHAAR": lambda: signzy_service.verify_aadhaar(id_number),
            "VOTER_ID": lambda: signzy_service.verify_voter_id(id_number),
            "PASSPORT": lambda: signzy_service.verify_passport(id_number),
            "DL": lambda: signzy_service.verify_driving_license(id_number),
        }.get(id_type.upper() if id_type else "")
        if kyc_fn:
            result["kyc"] = await kyc_fn()

    # Sanctions + PEP
    if "sanctions" in checks or "pep" in checks:
        from services.opensanctions_service import screen_individual as svc_screen
        screening = await svc_screen(name, dob, nationality)
        if "sanctions" in checks:
            result["sanctions"] = {
                "status": "match" if screening.get("has_sanction_match") else "clear",
                "matches": [m for m in screening.get("matches", []) if "sanction" in m.get("topics", [])],
            }
        if "pep" in checks:
            result["pep"] = {
                "status": "match" if screening.get("has_pep_match") else "clear",
                "matches": [m for m in screening.get("matches", []) if "role.pep" in m.get("topics", [])],
            }
        result["riskLevel"] = screening.get("risk_level", "LOW")
        result["riskScore"] = int(screening.get("top_score", 0) * 100)

    result["completedAt"] = datetime.now(timezone.utc).isoformat()
    result["mode"] = "demo"

    await log_audit(user["tenant_id"], user, "quick_screening_run", "screening", None,
                   {"name": name, "checks": checks}, request)

    return result


@api_router.post("/screening/run/{customer_id}")
async def run_screening(customer_id: str, request: Request):
    user = await get_current_user(request, db)
    
    customer = await db.customers.find_one({"id": customer_id, "tenant_id": user["tenant_id"]})
    if not customer:
        raise HTTPException(404, "Customer not found")
    
    # Use screening service for all screenings
    from services.screening_service import screening_service
    customer_data = customer.get("customer_data", {})
    
    sanctions_result = await screening_service.screen_sanctions(customer_data)
    pep_result = await screening_service.screen_pep(customer_data)
    adverse_result = await screening_service.screen_adverse_media(customer_data)
    
    screening_results = {
        "sanctions": sanctions_result,
        "pep": pep_result,
        "adverse_media": adverse_result
    }
    
    # Update customer with screening results
    update_data = {
        "sanctions_status": sanctions_result["status"],
        "pep_status": "match" if pep_result.get("is_pep") else "no_match",
        "adverse_media_status": "hits_found" if adverse_result.get("has_hits") else "no_hits",
        "pep_screening": pep_result,
        "adverse_media_screening": adverse_result,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Calculate risk score
    risk_score = 15  # Base
    if sanctions_result["status"] == "potential_match":
        risk_score += 25
    if pep_result.get("is_pep"):
        risk_score += 20
    if adverse_result.get("has_hits"):
        risk_score += 15
    
    from services.risk_service import calculate_risk_level
    update_data["risk_score"] = risk_score
    update_data["risk_level"] = calculate_risk_level(risk_score)
    update_data["cdd_tier"] = auto_assign_cdd_tier(risk_score)
    
    await db.customers.update_one(
        {"id": customer_id, "tenant_id": user["tenant_id"]},
        {"$set": update_data}
    )
    
    # Auto-create cases for matches
    customer_name = customer_data.get("full_name") or customer_data.get("company_legal_name", "Unknown")
    
    if sanctions_result["status"] == "potential_match":
        await auto_create_case({
            "tenant_id": user["tenant_id"],
            "customer_id": customer_id,
            "customer_name": customer_name,
            "case_type": "sanctions_match",
            "priority": "critical",
            "created_by": user["id"],
            "details": {"matched_list": sanctions_result.get("matched_list"), "trigger": "bulk_screening"},
        }, db)
    
    if pep_result.get("is_pep"):
        pep_tier = pep_result.get("pep_tier", "tier3")
        priority = "critical" if pep_tier == "tier1" else "high" if pep_tier == "tier2" else "medium"
        await auto_create_case({
            "tenant_id": user["tenant_id"],
            "customer_id": customer_id,
            "customer_name": customer_name,
            "case_type": "pep_match",
            "priority": priority,
            "created_by": user["id"],
            "details": {"pep_tier": pep_tier, "trigger": "bulk_screening"},
        }, db)
    
    await log_audit(user["tenant_id"], user, "screening_run", "screening", customer_id, request=request)
    
    return {"message": "Screening completed", "results": screening_results}

# Include routers
app.include_router(api_router)

# Include modular routers (lazy-import to avoid circular deps)
from routes.kyc_routes import router as kyc_router
from routes.v1_routes import router as v1_router
from routes.api_key_routes import router as api_key_router
app.include_router(kyc_router)
app.include_router(v1_router)
app.include_router(api_key_router)

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
