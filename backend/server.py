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
from services.risk_service import auto_assign_cdd_tier

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Detect production environment (non-localhost MongoDB means production)
IS_PRODUCTION = "localhost" not in mongo_url and "127.0.0.1" not in mongo_url
COOKIE_SECURE = IS_PRODUCTION
COOKIE_SAMESITE = "none" if IS_PRODUCTION else "lax"

# Create the main app
app = FastAPI(title="Rudrik API")
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
    await db.screening_records.create_index([("tenant_id", 1), ("created_at", -1)])
    logger.info("Database indexes created")
    
    # Seed admin and tenant
    await seed_admin_and_tenant()
    # Seed demo screening records
    await seed_demo_screenings()
    # Seed demo customers
    await seed_demo_customers()
    # Seed demo cases
    await seed_demo_cases()
    # Seed demo audit logs
    await seed_demo_audit_logs()
    # Seed recent activity for dashboard feed
    await seed_recent_activity()
    # Seed default settings
    await seed_default_settings()
    # Seed demo team members
    await seed_demo_team_members()

async def create_default_tenant(db):
    """Create default tenant if it doesn't exist"""
    tenant_id = "default-tenant"
    tenant = await db.tenants.find_one({"id": tenant_id})
    if not tenant:
        tenant_doc = {
            "id": tenant_id,
            "company_name": "Rudrik Demo",
            "primary_contact": os.environ.get("ADMIN_EMAIL", "admin@rudrik.io"),
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
    """Create or update admin user — idempotent and migration-safe"""
    sentrix_email = os.environ.get("SENTRIX_ADMIN_EMAIL", "shyam@rudrik.io")
    sentrix_password = os.environ.get("SENTRIX_ADMIN_PASSWORD", "Assword@0231")
    
    # Migrate old shyam@sentrixai.com → new email if old exists and new email differs
    if sentrix_email != "shyam@sentrixai.com":
        old_user = await db.users.find_one({"email": "shyam@sentrixai.com"})
        if old_user:
            # Delete any existing user at target email to avoid duplicate key
            await db.users.delete_one({"email": sentrix_email})
            await db.users.update_one(
                {"email": "shyam@sentrixai.com"},
                {"$set": {
                    "email": sentrix_email,
                    "password_hash": hash_password(sentrix_password),
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }}
            )
            logger.info(f"Migrated admin user: shyam@sentrixai.com -> {sentrix_email}")
    
    # Ensure primary admin exists with correct password
    sentrix_user = await db.users.find_one({"email": sentrix_email})
    if sentrix_user is None:
        user_doc = {
            "_id": ObjectId(),
            "id": str(uuid.uuid4()),
            "email": sentrix_email,
            "password_hash": hash_password(sentrix_password),
            "name": "Shyam - Super Admin",
            "role": "super_admin",
            "tenant_id": tenant_id,
            "totp_enabled": False,
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(user_doc)
        logger.info(f"Primary admin user created: {sentrix_email}")
    elif not verify_password(sentrix_password, sentrix_user["password_hash"]):
        await db.users.update_one(
            {"email": sentrix_email},
            {"$set": {"password_hash": hash_password(sentrix_password)}}
        )
        logger.info(f"Primary admin password updated: {sentrix_email}")
    
    # Create default admin@rudrik.io admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@rudrik.io")
    admin_password = os.environ.get("ADMIN_PASSWORD", "Admin123!@#")
    
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        user_doc = {
            "_id": ObjectId(),
            "id": str(uuid.uuid4()),
            "email": admin_email,
            "password_hash": hash_password(admin_password),
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
        f.write(f"""# Rudrik Test Credentials

## Primary Admin Account
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


async def seed_demo_screenings():
    """Seed 30 demo screening records with realistic Indian names and mixed results."""
    count = await db.screening_records.count_documents({"tenant_id": "default-tenant"})
    if count >= 30:
        return

    import random
    import hashlib

    names = [
        ("Aarav Sharma", "M", "1990-03-12", "IN", "PAN", "BQNPS5678A"),
        ("Priya Patel", "F", "1985-07-22", "IN", "AADHAAR", "987654321012"),
        ("Rohan Gupta", "M", "1978-11-05", "IN", "PASSPORT", "J8765432"),
        ("Ananya Singh", "F", "1992-01-18", "IN", "VOTER_ID", "MNL4567890"),
        ("Vikram Reddy", "M", "1988-06-30", "IN", "DL", "AP0220190567890"),
        ("Meera Iyer", "F", "1995-09-14", "IN", "PAN", "CXNPI3456B"),
        ("Arjun Nair", "M", "1982-12-01", "IN", "AADHAAR", "567812345678"),
        ("Kavya Joshi", "F", "1991-04-25", "IN", "PAN", "DHLPJ7890C"),
        ("Siddharth Kumar", "M", "1975-08-19", "IN", "PASSPORT", "K1234567"),
        ("Deepa Menon", "F", "1989-02-28", "IN", "VOTER_ID", "KRL6789012"),
        ("Rajesh Verma", "M", "1980-10-15", "IN", "PAN", "AXMPV2345D"),
        ("Shreya Rao", "F", "1993-06-08", "IN", "DL", "KA0120181234567"),
        ("Aditya Mishra", "M", "1987-03-20", "IN", "AADHAAR", "234567890123"),
        ("Neha Kapoor", "F", "1994-11-30", "IN", "PAN", "FHSPK6789E"),
        ("Karan Malhotra", "M", "1983-05-17", "PK", "PASSPORT", "AB1234567"),
        ("Pooja Deshmukh", "F", "1990-08-09", "IN", "VOTER_ID", "MH45678901"),
        ("Varun Thakur", "M", "1986-01-23", "IN", "PAN", "GKLPT8901F"),
        ("Ishita Bose", "F", "1996-07-12", "IN", "AADHAAR", "345678901234"),
        ("Manish Agrawal", "M", "1979-09-04", "IN", "DL", "UP1420170987654"),
        ("Ritu Saxena", "F", "1991-12-16", "IN", "PAN", "HMNPS4567G"),
        ("Amit Chauhan", "M", "1984-04-28", "IR", "PASSPORT", "C9876543"),
        ("Sunita Devi", "F", "1988-10-07", "IN", "VOTER_ID", "BR12345678"),
        ("Pankaj Tiwari", "M", "1977-02-14", "IN", "PAN", "JQRPT1234H"),
        ("Divya Hegde", "F", "1993-05-21", "IN", "AADHAAR", "456789012345"),
        ("Nikhil Shetty", "M", "1990-08-30", "IN", "DL", "MH0220200123456"),
        ("Geeta Pillai", "F", "1985-11-11", "IN", "PAN", "KXLPG5678I"),
        ("Harish Choudhary", "M", "1981-07-03", "AF", "PASSPORT", "D5432198"),
        ("Swati Kulkarni", "F", "1994-03-26", "IN", "PAN", "LMNPK9012J"),
        ("Rakesh Pandey", "M", "1976-06-19", "IN", "VOTER_ID", "UP56789012"),
        ("Anita Mahajan", "F", "1989-09-08", "MM", "PASSPORT", "E1234987"),
    ]

    checks_combos = [
        ["kyc", "sanctions", "pep", "adverse_media"],
        ["sanctions", "pep"],
        ["kyc", "sanctions"],
        ["kyc", "sanctions", "pep", "adverse_media"],
        ["sanctions", "pep", "adverse_media"],
    ]

    statuses = ["completed", "completed", "completed", "completed", "completed",
                "completed", "completed", "completed", "completed", "flagged"]

    docs = []
    base_time = datetime.now(timezone.utc) - timedelta(days=45)

    for i, (name, gender, dob, nat, id_type, id_num) in enumerate(names):
        seed = int(hashlib.sha256(name.lower().encode()).hexdigest()[:8], 16)
        r = random.Random(seed)

        checks = checks_combos[i % len(checks_combos)]
        has_sanction_match = r.random() < 0.15
        has_pep_match = r.random() < 0.20
        has_adverse_media = r.random() < 0.12

        # Calculate risk
        risk_score = 5
        kyc_result = {"status": "verified" if r.random() < 0.85 else "failed", "mode": "demo"}
        if kyc_result["status"] == "failed":
            risk_score += 20

        sanctions_result = {"status": "match" if has_sanction_match else "clear", "matches": []}
        if has_sanction_match:
            risk_score += 35
            sanctions_result["matches"] = [{
                "id": f"SANC-{r.randint(1000,9999)}",
                "caption": f"Matched Entity {r.randint(1,50)}",
                "score": round(r.uniform(0.55, 0.95), 2),
                "datasets": [r.choice(["us_ofac_sdn", "eu_sanctions", "un_sc_sanctions"])],
                "topics": ["sanction"],
            }]

        pep_result = {"status": "match" if has_pep_match else "clear", "matches": []}
        if has_pep_match:
            risk_score += 20
            pep_result["matches"] = [{
                "id": f"PEP-{r.randint(1000,9999)}",
                "caption": f"PEP Match — {r.choice(['State Minister', 'MP', 'District Collector', 'Bank Director'])}",
                "score": round(r.uniform(0.40, 0.85), 2),
                "topics": ["role.pep"],
            }]

        adverse_media_result = {"status": "hits_found" if has_adverse_media else "clear", "hits": []}
        if has_adverse_media:
            risk_score += 15
            adverse_media_result["hits"] = [{
                "source": r.choice(["Times of India", "Economic Times", "NDTV", "Reuters"]),
                "headline": r.choice([
                    "Individual linked to financial irregularities",
                    "Named in corporate fraud investigation",
                    "Associated with money laundering probe",
                ]),
                "date": (base_time - timedelta(days=r.randint(30, 365))).strftime("%Y-%m-%d"),
            }]

        risk_score = min(risk_score, 100)
        if risk_score <= 25:
            risk_level = "LOW"
        elif risk_score <= 50:
            risk_level = "MEDIUM"
        elif risk_score <= 75:
            risk_level = "HIGH"
        else:
            risk_level = "CRITICAL"

        created = base_time + timedelta(days=i * 1.5, hours=r.randint(0, 23), minutes=r.randint(0, 59))

        # Use FATF high-risk countries for some entries
        from services.opensanctions_service import get_country_risk
        country_risk = get_country_risk(nat)
        if country_risk and risk_score < 40:
            risk_score += 10
            if risk_score > 25:
                risk_level = "MEDIUM"

        docs.append({
            "id": str(uuid.uuid4()),
            "tenant_id": "default-tenant",
            "full_name": name,
            "date_of_birth": dob,
            "nationality": nat,
            "gender": gender,
            "id_type": id_type,
            "id_number": id_num,
            "checks_run": checks,
            "risk_score": risk_score,
            "risk_level": risk_level,
            "status": statuses[i % len(statuses)],
            "kyc_result": kyc_result if "kyc" in checks else None,
            "sanctions_result": sanctions_result if "sanctions" in checks else None,
            "pep_result": pep_result if "pep" in checks else None,
            "adverse_media_result": adverse_media_result if "adverse_media" in checks else None,
            "country_risk": country_risk,
            "matched_entities": (
                (sanctions_result.get("matches", []) if has_sanction_match else []) +
                (pep_result.get("matches", []) if has_pep_match else [])
            ),
            "created_at": created.isoformat(),
            "completed_at": (created + timedelta(seconds=r.randint(3, 12))).isoformat(),
            "created_by": "system",
            "mode": "demo",
        })

    await db.screening_records.delete_many({"tenant_id": "default-tenant", "mode": "demo"})
    await db.screening_records.insert_many(docs)
    logger.info(f"Seeded {len(docs)} demo screening records")


async def seed_demo_customers():
    """Seed 25 demo customers with realistic Indian names, 3 PEP matches."""
    count = await db.customers.count_documents({"tenant_id": "default-tenant", "mode": "demo"})
    if count >= 25:
        return

    import random
    import hashlib

    CUSTOMERS = [
        # PEP matches (3) — Indian politician-sounding names
        {"name": "Rajendra Prasad Yadav", "dob": "1968-04-12", "nat": "IN", "gender": "M", "occupation": "Politician / MLA",
         "pep": True, "pep_tier": "tier1", "pep_position": "Member of Legislative Assembly, Bihar",
         "risk": 72, "sanctions": "no_match", "am": True},
        {"name": "Smt. Laxmi Devi Sharma", "dob": "1975-08-22", "nat": "IN", "gender": "F", "occupation": "Cabinet Minister",
         "pep": True, "pep_tier": "tier2", "pep_position": "State Cabinet Minister, Rajasthan",
         "risk": 65, "sanctions": "no_match", "am": False},
        {"name": "Balakrishnan Nair Pillai", "dob": "1962-01-30", "nat": "IN", "gender": "M", "occupation": "Senior Bureaucrat",
         "pep": True, "pep_tier": "tier1", "pep_position": "Former Secretary, Ministry of Finance",
         "risk": 78, "sanctions": "potential_match", "am": True},
        # Regular customers (22)
        {"name": "Aarav Mehta", "dob": "1990-05-15", "nat": "IN", "gender": "M", "occupation": "Software Engineer",
         "pep": False, "risk": 12, "sanctions": "no_match", "am": False},
        {"name": "Diya Agarwal", "dob": "1988-11-03", "nat": "IN", "gender": "F", "occupation": "CA / Auditor",
         "pep": False, "risk": 8, "sanctions": "no_match", "am": False},
        {"name": "Kabir Singhania", "dob": "1982-07-28", "nat": "IN", "gender": "M", "occupation": "Import/Export Business",
         "pep": False, "risk": 45, "sanctions": "no_match", "am": True},
        {"name": "Ananya Krishnamurthy", "dob": "1995-03-19", "nat": "IN", "gender": "F", "occupation": "Doctor",
         "pep": False, "risk": 5, "sanctions": "no_match", "am": False},
        {"name": "Rohit Choudhary", "dob": "1979-09-08", "nat": "IN", "gender": "M", "occupation": "Real Estate Developer",
         "pep": False, "risk": 52, "sanctions": "no_match", "am": True},
        {"name": "Priya Venkatesh", "dob": "1993-12-25", "nat": "IN", "gender": "F", "occupation": "Bank Manager",
         "pep": False, "risk": 18, "sanctions": "no_match", "am": False},
        {"name": "Arjun Saxena", "dob": "1986-06-14", "nat": "IN", "gender": "M", "occupation": "Jewellery Trader",
         "pep": False, "risk": 38, "sanctions": "no_match", "am": False},
        {"name": "Meera Jain", "dob": "1991-02-07", "nat": "IN", "gender": "F", "occupation": "Startup Founder",
         "pep": False, "risk": 15, "sanctions": "no_match", "am": False},
        {"name": "Siddharth Malhotra", "dob": "1977-10-30", "nat": "IN", "gender": "M", "occupation": "Shipping Logistics",
         "pep": False, "risk": 55, "sanctions": "potential_match", "am": False},
        {"name": "Neha Gupta", "dob": "1994-08-16", "nat": "IN", "gender": "F", "occupation": "Pharmacist",
         "pep": False, "risk": 10, "sanctions": "no_match", "am": False},
        {"name": "Vikram Thakur", "dob": "1984-01-22", "nat": "IN", "gender": "M", "occupation": "Construction Contractor",
         "pep": False, "risk": 42, "sanctions": "no_match", "am": True},
        {"name": "Rashi Oberoi", "dob": "1997-05-09", "nat": "IN", "gender": "F", "occupation": "IT Consultant",
         "pep": False, "risk": 7, "sanctions": "no_match", "am": False},
        {"name": "Manish Tiwari", "dob": "1973-03-18", "nat": "IN", "gender": "M", "occupation": "Money Exchange Operator",
         "pep": False, "risk": 68, "sanctions": "potential_match", "am": True},
        {"name": "Sunita Desai", "dob": "1989-07-04", "nat": "IN", "gender": "F", "occupation": "Teacher",
         "pep": False, "risk": 6, "sanctions": "no_match", "am": False},
        {"name": "Pankaj Chopra", "dob": "1981-11-27", "nat": "IN", "gender": "M", "occupation": "Restaurant Chain Owner",
         "pep": False, "risk": 22, "sanctions": "no_match", "am": False},
        {"name": "Kavya Nambiar", "dob": "1996-09-13", "nat": "IN", "gender": "F", "occupation": "Data Analyst",
         "pep": False, "risk": 4, "sanctions": "no_match", "am": False},
        {"name": "Harish Pandey", "dob": "1970-12-05", "nat": "IN", "gender": "M", "occupation": "Mining Business",
         "pep": False, "risk": 60, "sanctions": "no_match", "am": True},
        {"name": "Deepa Rajput", "dob": "1992-04-20", "nat": "IN", "gender": "F", "occupation": "Lawyer",
         "pep": False, "risk": 14, "sanctions": "no_match", "am": False},
        {"name": "Amit Bhatia", "dob": "1985-08-11", "nat": "PK", "gender": "M", "occupation": "Textile Exporter",
         "pep": False, "risk": 48, "sanctions": "no_match", "am": False},
        {"name": "Geeta Iyer", "dob": "1987-06-30", "nat": "IN", "gender": "F", "occupation": "Chartered Accountant",
         "pep": False, "risk": 11, "sanctions": "no_match", "am": False},
        {"name": "Nikhil Reddy", "dob": "1978-02-14", "nat": "IN", "gender": "M", "occupation": "Pharma Distributor",
         "pep": False, "risk": 35, "sanctions": "no_match", "am": False},
    ]

    id_types = ["PAN", "AADHAAR", "PASSPORT", "VOTER_ID", "DL"]
    kyc_statuses = ["verified", "verified", "verified", "pending", "failed"]
    statuses_pool = ["approved", "approved", "approved", "under_review", "submitted"]
    base_time = datetime.now(timezone.utc) - timedelta(days=90)

    docs = []
    timeline_docs = []
    note_docs = []

    for i, c in enumerate(CUSTOMERS):
        cid = str(uuid.uuid4())
        seed = int(hashlib.sha256(c["name"].encode()).hexdigest()[:8], 16)
        rng = random.Random(seed)
        created = base_time + timedelta(days=i * 3, hours=rng.randint(0, 23))

        risk = c["risk"]
        if risk <= 30:
            risk_level = "low"
        elif risk <= 65:
            risk_level = "medium"
        else:
            risk_level = "high"

        if risk <= 30:
            cdd_tier = "sdd"
        elif risk <= 65:
            cdd_tier = "standard_cdd"
        else:
            cdd_tier = "edd"

        id_type = rng.choice(id_types)
        kyc_status = kyc_statuses[i % len(kyc_statuses)]
        status = statuses_pool[i % len(statuses_pool)]

        pep_data = None
        if c["pep"]:
            pep_data = {
                "is_pep": True,
                "pep_tier": c.get("pep_tier", "tier1"),
                "position": c.get("pep_position", ""),
                "screened_at": (created + timedelta(hours=2)).isoformat(),
            }
            status = "under_review"

        doc = {
            "id": cid,
            "tenant_id": "default-tenant",
            "customer_type": "individual",
            "status": status,
            "risk_score": risk,
            "risk_level": risk_level,
            "cdd_tier": cdd_tier,
            "cdd_status": "complete" if risk <= 30 else "in_progress",
            "screening_status": "match" if c["pep"] or c["sanctions"] == "potential_match" else "no_match",
            "sanctions_status": c["sanctions"],
            "pep_status": "match" if c["pep"] else "no_match",
            "adverse_media_status": "hits_found" if c["am"] else "no_hits",
            "kyc_status": kyc_status,
            "id_type": id_type,
            "last_screened": (created + timedelta(days=rng.randint(1, 30))).isoformat(),
            "created_at": created.isoformat(),
            "updated_at": (created + timedelta(days=rng.randint(1, 10))).isoformat(),
            "created_by": "system",
            "mode": "demo",
            "pep_screening": pep_data,
            "customer_data": {
                "full_name": c["name"],
                "date_of_birth": c["dob"],
                "nationality": c["nat"],
                "gender": c["gender"],
                "occupation": c["occupation"],
                "country_of_residence": c["nat"],
                "email": f"{c['name'].split()[0].lower()}@example.com",
                "phone": f"+91 {rng.randint(70000, 99999)} {rng.randint(10000, 99999)}",
            },
            "documents": [
                {"doc_type": id_type, "doc_number": f"DEMO-{rng.randint(100000, 999999)}", "status": kyc_status,
                 "uploaded_at": (created + timedelta(minutes=30)).isoformat()},
            ],
            "risk_breakdown": {
                "kyc": 20 if kyc_status == "failed" else 0,
                "sanctions": 35 if c["sanctions"] == "potential_match" else 0,
                "pep": 20 if c["pep"] else 0,
                "adverse_media": 15 if c["am"] else 0,
                "country_risk": 10 if c["nat"] in ("PK", "IR", "AF", "MM") else 0,
                "occupation_risk": 10 if c["occupation"] in ("Money Exchange Operator", "Jewellery Trader", "Mining Business") else 0,
            },
        }
        docs.append(doc)

        # Build timeline events
        events = [
            {"type": "customer_created", "label": "Customer Onboarded", "ts": created},
            {"type": "kyc_submitted", "label": f"KYC Document ({id_type}) Submitted", "ts": created + timedelta(minutes=30)},
        ]
        if kyc_status == "verified":
            events.append({"type": "kyc_verified", "label": "KYC Verified", "ts": created + timedelta(hours=1)})
        elif kyc_status == "failed":
            events.append({"type": "kyc_failed", "label": "KYC Verification Failed", "ts": created + timedelta(hours=1)})
        events.append({"type": "sanctions_screened", "label": "Sanctions Screening Completed",
                       "ts": created + timedelta(hours=2), "result": c["sanctions"]})
        events.append({"type": "pep_screened", "label": "PEP Screening Completed",
                       "ts": created + timedelta(hours=2, minutes=10),
                       "result": "match" if c["pep"] else "clear"})
        if c["pep"]:
            events.append({"type": "pep_match", "label": f"PEP Match Found — {c.get('pep_position', '')}",
                          "ts": created + timedelta(hours=2, minutes=15)})
            events.append({"type": "case_opened", "label": "Investigation Case Opened",
                          "ts": created + timedelta(hours=3)})
        if c["am"]:
            events.append({"type": "adverse_media_hit", "label": "Adverse Media Hit Found",
                          "ts": created + timedelta(hours=4)})
        if c["sanctions"] == "potential_match":
            events.append({"type": "sanctions_match", "label": "Potential Sanctions Match — Review Required",
                          "ts": created + timedelta(hours=2, minutes=5)})

        for ev in events:
            timeline_docs.append({
                "id": str(uuid.uuid4()),
                "customer_id": cid,
                "tenant_id": "default-tenant",
                "event_type": ev["type"],
                "label": ev["label"],
                "result": ev.get("result"),
                "timestamp": ev["ts"].isoformat(),
                "mode": "demo",
            })

        # Add notes for some customers
        if i < 8:
            note_texts = [
                "Initial KYC review completed. Documents appear valid.",
                "Risk assessment reviewed and approved by compliance officer.",
                "Customer provided additional documentation for verification.",
                "Flagged for enhanced monitoring due to transaction patterns.",
                "PEP screening completed. Match requires senior review.",
                "Annual CDD review scheduled for next quarter.",
                "Source of funds documentation verified.",
                "Customer cooperative during due diligence process.",
            ]
            note_docs.append({
                "id": str(uuid.uuid4()),
                "customer_id": cid,
                "tenant_id": "default-tenant",
                "text": note_texts[i % len(note_texts)],
                "created_by": "system",
                "created_by_name": "Compliance Officer",
                "created_at": (created + timedelta(days=rng.randint(1, 5))).isoformat(),
                "mode": "demo",
            })

    await db.customers.delete_many({"tenant_id": "default-tenant", "mode": "demo"})
    await db.customer_timeline.delete_many({"tenant_id": "default-tenant", "mode": "demo"})
    await db.customer_notes.delete_many({"tenant_id": "default-tenant", "mode": "demo"})

    await db.customers.insert_many(docs)
    if timeline_docs:
        await db.customer_timeline.insert_many(timeline_docs)
    if note_docs:
        await db.customer_notes.insert_many(note_docs)
    logger.info(f"Seeded {len(docs)} demo customers, {len(timeline_docs)} timeline events, {len(note_docs)} notes")

async def seed_demo_cases():
    """Seed 8 demo cases linked to existing demo customers."""
    count = await db.cases.count_documents({"tenant_id": "default-tenant", "mode": "demo"})
    if count >= 8:
        return

    import random

    DEMO_CASES = [
        {"customer_name": "Rajendra Prasad Yadav", "case_type": "pep_match", "priority": "critical", "status": "open", "days_ago": 10, "assigned_to": None,
         "description": "PEP Match — MLA Bihar. Tier 1 politically exposed person requiring enhanced due diligence."},
        {"customer_name": "Balakrishnan Nair Pillai", "case_type": "sanctions_match", "priority": "critical", "status": "in_progress", "days_ago": 5, "assigned_to": "Priya Sharma",
         "description": "Potential sanctions match detected. Former Secretary Ministry of Finance flagged on screening."},
        {"customer_name": "Smt. Laxmi Devi Sharma", "case_type": "pep_match", "priority": "high", "status": "escalated", "days_ago": 8, "assigned_to": "Anita Desai",
         "description": "PEP Match — State Cabinet Minister Rajasthan. Escalated for MLRO review."},
        {"customer_name": "Kabir Singhania", "case_type": "adverse_media", "priority": "medium", "status": "open", "days_ago": 2, "assigned_to": None,
         "description": "Adverse media hits found relating to import/export irregularities."},
        {"customer_name": "Manish Tiwari", "case_type": "suspicious_transaction", "priority": "high", "status": "in_progress", "days_ago": 4, "assigned_to": "Rahul Verma",
         "description": "Unusual transaction patterns flagged for money exchange operator. Multiple high-value transfers."},
        {"customer_name": "Siddharth Malhotra", "case_type": "sanctions_match", "priority": "high", "status": "open", "days_ago": 6, "assigned_to": None,
         "description": "Potential sanctions match in shipping logistics. OFAC watchlist partial match."},
        {"customer_name": "Rohit Choudhary", "case_type": "adverse_media", "priority": "medium", "status": "closed", "days_ago": 15, "assigned_to": "Priya Sharma",
         "description": "Adverse media investigation for real estate developer. Cleared after review.",
         "sar_filed": True, "disposition": "sar_filed", "resolution_type": "true_match_sar_filed"},
        {"customer_name": "Harish Pandey", "case_type": "suspicious_transaction", "priority": "medium", "status": "escalated", "days_ago": 1, "assigned_to": "Rahul Verma",
         "description": "Mining business with unexplained fund sources. Escalated for enhanced review."},
    ]

    await db.cases.delete_many({"tenant_id": "default-tenant", "mode": "demo"})
    await db.case_notes.delete_many({"mode": "demo"})

    base_time = datetime.now(timezone.utc)

    for i, c in enumerate(DEMO_CASES):
        customer = await db.customers.find_one(
            {"tenant_id": "default-tenant", "customer_data.full_name": c["customer_name"]},
            {"_id": 0, "id": 1, "risk_score": 1, "risk_level": 1}
        )
        customer_id = customer["id"] if customer else str(uuid.uuid4())
        customer_risk = customer.get("risk_score", 50) if customer else 50
        customer_risk_level = customer.get("risk_level", "medium") if customer else "medium"

        created_at = base_time - timedelta(days=c["days_ago"], hours=i)
        case_number = i + 1

        case_doc = {
            "id": str(uuid.uuid4()),
            "case_id": f"CASE-{case_number:05d}",
            "tenant_id": "default-tenant",
            "customer_id": customer_id,
            "customer_name": c["customer_name"],
            "case_type": c["case_type"],
            "priority": c["priority"],
            "status": c["status"],
            "assigned_to": c["assigned_to"],
            "description": c["description"],
            "customer_risk_score": customer_risk,
            "customer_risk_level": customer_risk_level,
            "due_date": (created_at + timedelta(days=14)).isoformat(),
            "sar_filed": c.get("sar_filed", False),
            "sar_reference": f"SAR-2025-{case_number:04d}" if c.get("sar_filed") else None,
            "sar_filed_date": (created_at + timedelta(days=5)).isoformat() if c.get("sar_filed") else None,
            "disposition": c.get("disposition"),
            "disposition_note": "Investigation complete. SAR filed with FIU." if c.get("disposition") else None,
            "resolution_type": c.get("resolution_type"),
            "created_at": created_at.isoformat(),
            "updated_at": (created_at + timedelta(hours=2)).isoformat(),
            "created_by": "system",
            "mode": "demo",
        }

        if c["status"] == "closed":
            case_doc["closed_at"] = (created_at + timedelta(days=3)).isoformat()
            case_doc["closed_by"] = "system"

        await db.cases.insert_one(case_doc)

        note_templates = [
            {"note": f"Case auto-created by screening engine. {c['description']}", "is_system": True, "hours_offset": 0},
            {"note": "Initial review completed. Documents collected for analysis.", "is_system": False, "hours_offset": 2},
        ]
        if c["status"] in ("in_progress", "escalated", "closed"):
            note_templates.append({"note": "Investigation underway. Reviewing transaction history and source of funds.", "is_system": False, "hours_offset": 24})
        if c["status"] == "escalated":
            note_templates.append({"note": f"Case escalated to {c['assigned_to']} for senior review.", "is_system": True, "hours_offset": 48})
        if c["status"] == "closed":
            note_templates.append({"note": "Investigation complete. SAR filed with Financial Intelligence Unit.", "is_system": True, "hours_offset": 72})

        for n in note_templates:
            note_doc = {
                "id": str(uuid.uuid4()),
                "case_id": case_doc["id"],
                "author_id": "system",
                "author_name": c["assigned_to"] or "System",
                "author_role": "compliance_officer",
                "note": n["note"],
                "is_system": n["is_system"],
                "created_at": (created_at + timedelta(hours=n["hours_offset"])).isoformat(),
                "mode": "demo",
            }
            await db.case_notes.insert_one(note_doc)

    logger.info("Seeded 8 demo cases with notes")


async def seed_demo_audit_logs():
    """Seed 100 realistic demo audit log entries spanning the last 30 days."""
    count = await db.audit_logs.count_documents({"tenant_id": "default-tenant", "mode": "demo"})
    if count >= 100:
        return

    import random

    await db.audit_logs.delete_many({"tenant_id": "default-tenant", "mode": "demo"})

    users = [
        {"id": "admin-001", "name": "Shyam - Super Admin", "role": "super_admin"},
        {"id": "tm-001", "name": "Priya Sharma", "role": "compliance_officer"},
        {"id": "tm-002", "name": "Rahul Verma", "role": "analyst"},
        {"id": "tm-003", "name": "Anita Desai", "role": "compliance_officer"},
    ]

    customer_names = [
        "Rajendra Prasad Yadav", "Balakrishnan Nair Pillai", "Smt. Laxmi Devi Sharma",
        "Kabir Singhania", "Manish Tiwari", "Siddharth Malhotra", "Rohit Choudhary",
        "Harish Pandey", "Arun Kumar Singh", "Neha Banerjee", "Vikash Mehta",
        "Pradeep Rawat", "Geeta Bala Subramaniam", "Farid Khan"
    ]

    ips = ["10.0.1.15", "10.0.1.22", "10.0.2.8", "10.0.1.45", "10.0.3.12", "10.0.1.99"]

    action_templates = [
        {"action_type": "screening_run", "module": "screening", "weight": 18,
         "details_fn": lambda cn: {"customer_name": cn, "screening_type": random.choice(["sanctions", "pep", "adverse_media"]), "result": random.choice(["clear", "potential_match", "match"]), "score": random.randint(5, 95)}},
        {"action_type": "case_created", "module": "cases", "weight": 10,
         "details_fn": lambda cn: {"customer_name": cn, "case_type": random.choice(["pep_match", "sanctions_match", "adverse_media", "suspicious_transaction"]), "priority": random.choice(["critical", "high", "medium"])}},
        {"action_type": "case_resolved", "module": "cases", "weight": 6,
         "details_fn": lambda cn: {"customer_name": cn, "resolution_type": random.choice(["true_match_sar_filed", "false_positive", "true_match_risk_accepted", "duplicate"]), "days_open": random.randint(1, 21)}},
        {"action_type": "api_key_created", "module": "api_keys", "weight": 4,
         "details_fn": lambda _: {"client_name": random.choice(["Payment Gateway", "Mobile App", "Partner Portal", "Risk Engine"]), "rate_limit": random.choice([100, 500, 1000])}},
        {"action_type": "customer_created", "module": "customers", "weight": 14,
         "details_fn": lambda cn: {"customer_name": cn, "customer_type": random.choice(["individual", "corporate"]), "risk_level": random.choice(["low", "medium", "high"])}},
        {"action_type": "user_login", "module": "auth", "weight": 20,
         "details_fn": lambda _: {"method": "password", "success": True, "mfa_used": random.choice([True, False])}},
        {"action_type": "sar_filed", "module": "cases", "weight": 4,
         "details_fn": lambda cn: {"customer_name": cn, "sar_reference": f"SAR-2026-{random.randint(1000, 9999)}", "case_type": random.choice(["pep_match", "sanctions_match", "suspicious_transaction"])}},
        {"action_type": "settings_changed", "module": "settings", "weight": 3,
         "details_fn": lambda _: {"setting": random.choice(["risk_thresholds", "notification_preferences", "screening_config", "tenant_name"]), "changed_by": "admin"}},
        {"action_type": "case_status_changed", "module": "cases", "weight": 8,
         "details_fn": lambda cn: {"customer_name": cn, "old_status": random.choice(["open", "in_progress"]), "new_status": random.choice(["in_progress", "escalated"])}},
        {"action_type": "quick_screening_run", "module": "screening", "weight": 5,
         "details_fn": lambda cn: {"customer_name": cn, "checks": random.choice([["sanctions"], ["pep"], ["sanctions", "pep", "adverse_media"]]), "risk_score": random.randint(10, 90)}},
        {"action_type": "customer_updated", "module": "customers", "weight": 5,
         "details_fn": lambda cn: {"customer_name": cn, "fields_updated": random.choice([["risk_level"], ["cdd_tier"], ["documents"], ["contact_info"]])}},
        {"action_type": "case_assigned", "module": "cases", "weight": 3,
         "details_fn": lambda cn: {"customer_name": cn, "assigned_to": random.choice(["Priya Sharma", "Rahul Verma", "Anita Desai"])}},
    ]

    weighted_templates = []
    for t in action_templates:
        weighted_templates.extend([t] * t["weight"])

    base_time = datetime.now(timezone.utc)
    entries = []

    for i in range(100):
        template = random.choice(weighted_templates)
        user = random.choice(users)
        cn = random.choice(customer_names)
        hours_ago = random.uniform(0.5, 30 * 24)
        ts = base_time - timedelta(hours=hours_ago)

        entry = {
            "id": str(uuid.uuid4()),
            "tenant_id": "default-tenant",
            "timestamp": ts.isoformat(),
            "user_id": user["id"],
            "user_name": user["name"],
            "user_role": user["role"],
            "ip_address": random.choice(ips),
            "action_type": template["action_type"],
            "module": template["module"],
            "record_id": str(uuid.uuid4()),
            "details": template["details_fn"](cn),
            "mode": "demo",
        }
        entries.append(entry)

    if entries:
        await db.audit_logs.insert_many(entries)
    logger.info("Seeded 100 demo audit log entries")


async def seed_recent_activity():
    """Seed 15 diverse recent activity entries for the dashboard feed."""
    # Always refresh recent feed entries on startup
    await db.audit_logs.delete_many({"tenant_id": "default-tenant", "mode": "recent_feed"})

    base_time = datetime.now(timezone.utc)
    users_pool = [
        {"id": "tm-001", "name": "Priya Sharma", "role": "compliance_officer"},
        {"id": "tm-002", "name": "Rahul Verma", "role": "analyst"},
        {"id": "tm-003", "name": "Anita Desai", "role": "compliance_officer"},
        {"id": "admin-001", "name": "Shyam - Super Admin", "role": "super_admin"},
    ]

    entries = [
        {"action_type": "screening_run", "module": "screening", "user_idx": 1,
         "details": {"customer_name": "Rahul Sharma", "screening_type": "sanctions", "result": "clear", "score": 12}, "secs_ago": 10},
        {"action_type": "screening_run", "module": "screening", "user_idx": 0,
         "details": {"customer_name": "Priya Patel", "screening_type": "pep", "result": "match", "score": 78}, "secs_ago": 35},
        {"action_type": "screening_run", "module": "screening", "user_idx": 1,
         "details": {"customer_name": "Ahmed Khan", "screening_type": "sanctions", "result": "potential_match", "score": 85}, "secs_ago": 70},
        {"action_type": "case_resolved", "module": "cases", "user_idx": 2,
         "details": {"customer_name": "Vikram Mehta", "resolution_type": "false_positive", "days_open": 4}, "secs_ago": 120},
        {"action_type": "screening_run", "module": "screening", "user_idx": 0,
         "details": {"customer_name": "Anjali Gupta", "screening_type": "adverse_media", "result": "clear", "score": 22}, "secs_ago": 180},
        {"action_type": "customer_created", "module": "customers", "user_idx": 1,
         "details": {"customer_name": "Deepak Reddy", "customer_type": "individual", "risk_level": "low"}, "secs_ago": 250},
        {"action_type": "case_created", "module": "cases", "user_idx": 0,
         "details": {"customer_name": "Suresh Iyer", "case_type": "pep_match", "priority": "high"}, "secs_ago": 320},
        {"action_type": "screening_run", "module": "screening", "user_idx": 2,
         "details": {"customer_name": "Meera Joshi", "screening_type": "sanctions", "result": "clear", "score": 8}, "secs_ago": 400},
        {"action_type": "sar_filed", "module": "cases", "user_idx": 2,
         "details": {"customer_name": "Rajendra Prasad Yadav", "sar_reference": "SAR-2026-0412", "case_type": "pep_match"}, "secs_ago": 480},
        {"action_type": "case_status_changed", "module": "cases", "user_idx": 1,
         "details": {"customer_name": "Kabir Singhania", "old_status": "open", "new_status": "in_progress"}, "secs_ago": 560},
        {"action_type": "customer_created", "module": "customers", "user_idx": 0,
         "details": {"customer_name": "Nandini Bose", "customer_type": "corporate", "risk_level": "medium"}, "secs_ago": 640},
        {"action_type": "screening_run", "module": "screening", "user_idx": 1,
         "details": {"customer_name": "Farhan Qureshi", "screening_type": "pep", "result": "clear", "score": 15}, "secs_ago": 720},
        {"action_type": "case_assigned", "module": "cases", "user_idx": 3,
         "details": {"customer_name": "Manish Tiwari", "assigned_to": "Anita Desai"}, "secs_ago": 800},
        {"action_type": "screening_run", "module": "screening", "user_idx": 2,
         "details": {"customer_name": "Lakshmi Narayan", "screening_type": "adverse_media", "result": "potential_match", "score": 52}, "secs_ago": 880},
        {"action_type": "user_login", "module": "auth", "user_idx": 3,
         "details": {"customer_name": None, "method": "password", "success": True, "mfa_used": True}, "secs_ago": 960},
    ]

    import random
    ips = ["10.0.1.15", "10.0.1.22", "10.0.2.8", "10.0.1.45"]

    docs = []
    for e in entries:
        user = users_pool[e["user_idx"]]
        docs.append({
            "id": str(uuid.uuid4()),
            "tenant_id": "default-tenant",
            "timestamp": (base_time - timedelta(seconds=e["secs_ago"])).isoformat(),
            "user_id": user["id"],
            "user_name": user["name"],
            "user_role": user["role"],
            "ip_address": random.choice(ips),
            "action_type": e["action_type"],
            "module": e["module"],
            "record_id": str(uuid.uuid4()),
            "details": e["details"],
            "mode": "recent_feed",
        })

    await db.audit_logs.insert_many(docs)
    logger.info("Seeded 15 recent activity entries for dashboard feed")


async def seed_default_settings():
    """Seed default tenant settings if not present."""
    existing = await db.settings.find_one({"tenant_id": "default-tenant"})
    if existing:
        return

    settings_doc = {
        "tenant_id": "default-tenant",
        "general": {
            "company_name": "Rudrik Demo",
            "timezone": "Asia/Kolkata",
            "currency": "INR",
        },
        "risk_scoring": {
            "kyc_failure_weight": 25,
            "sanctions_match_weight": 30,
            "pep_match_weight": 20,
            "adverse_media_weight": 15,
            "country_risk_weight": 10,
        },
        "integrations": {
            "signzy": {"enabled": True, "api_key": "", "status": "demo"},
            "opensanctions": {"enabled": True, "api_key": "", "status": "demo"},
            "sanction_scanner": {"enabled": False, "api_key": "", "status": "disconnected"},
        },
        "notifications": {
            "high_risk_screening": True,
            "case_escalated": True,
            "daily_summary": False,
            "api_usage_threshold": False,
        },
        "compliance_rules": {
            "auto_create_case_high_risk": True,
            "auto_escalate_unacceptable_risk": True,
            "block_onboarding_kyc_fails": False,
            "rescreen_interval_days": 90,
        },
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.settings.insert_one(settings_doc)
    logger.info("Seeded default tenant settings")


async def seed_demo_team_members():
    """Seed demo team members for the Team tab."""
    team = [
        {"name": "Priya Sharma", "email": "priya@rudrik.io", "role": "compliance_officer"},
        {"name": "Rahul Verma", "email": "rahul@rudrik.io", "role": "analyst"},
        {"name": "Anita Desai", "email": "anita@rudrik.io", "role": "compliance_officer"},
    ]
    for m in team:
        existing = await db.users.find_one({"email": m["email"]})
        if existing:
            continue
        user_doc = {
            "id": str(uuid.uuid4()),
            "email": m["email"],
            "name": m["name"],
            "role": m["role"],
            "tenant_id": "default-tenant",
            "company_name": "Rudrik Demo",
            "password_hash": "demo_placeholder",
            "is_active": True,
            "status": "active",
            "totp_secret": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "mode": "demo",
        }
        await db.users.insert_one(user_doc)
    logger.info("Seeded demo team members")


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
    
    response.set_cookie("access_token", access_token, httponly=True, secure=COOKIE_SECURE, samesite=COOKIE_SAMESITE, max_age=900)
    response.set_cookie("refresh_token", refresh_token, httponly=True, secure=COOKIE_SECURE, samesite=COOKIE_SAMESITE, max_age=604800)
    
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
            
            response.set_cookie("access_token", access_token, httponly=True, secure=COOKIE_SECURE, samesite=COOKIE_SAMESITE, max_age=900)
            response.set_cookie("refresh_token", refresh_token, httponly=True, secure=COOKIE_SECURE, samesite=COOKIE_SAMESITE, max_age=604800)
            
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
    response.delete_cookie("access_token", secure=COOKIE_SECURE, samesite=COOKIE_SAMESITE)
    response.delete_cookie("refresh_token", secure=COOKIE_SECURE, samesite=COOKIE_SAMESITE)
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
    from services.dashboard_service import gather_dashboard_stats
    return await gather_dashboard_stats(db, user["tenant_id"], user["role"])


@api_router.get("/dashboard/activity-feed")
async def get_activity_feed(request: Request):
    user = await get_current_user(request, db)
    logs = await db.audit_logs.find(
        {"tenant_id": user["tenant_id"]},
        {"_id": 0, "id": 1, "timestamp": 1, "user_name": 1, "action_type": 1, "details": 1}
    ).sort("timestamp", -1).limit(15).to_list(15)

    action_labels = {
        "screening_run": "Screening Complete",
        "quick_screening_run": "Quick Screening",
        "case_created": "New Case Opened",
        "case_resolved": "Case Resolved",
        "customer_created": "Customer Onboarded",
        "customer_updated": "Customer Updated",
        "user_login": "Logged In",
        "sar_filed": "SAR Filed",
        "sar_report_generated": "SAR Report Generated",
        "case_status_changed": "Case Status Changed",
        "case_assigned": "Case Assigned",
        "api_key_created": "API Key Generated",
        "settings_changed": "Settings Updated",
    }

    feed = []
    for log in logs:
        details = log.get("details") or {}
        action_type = log["action_type"]

        # Generate richer labels based on details
        if action_type == "screening_run" or action_type == "quick_screening_run":
            result = details.get("result", "")
            if result == "match":
                label = details.get("screening_type", "").replace("_", " ").title() + " Match Found"
            elif result == "potential_match":
                label = "High Risk Alert"
            else:
                label = "KYC Verified"
        else:
            label = action_labels.get(action_type, action_type.replace("_", " ").title())

        feed.append({
            "id": log.get("id", ""),
            "timestamp": log["timestamp"],
            "user_name": log["user_name"],
            "action": label,
            "customer_name": details.get("customer_name"),
            "action_type": log["action_type"],
        })

    return {"feed": feed}


@api_router.get("/dashboard/trends")
async def get_dashboard_trends(request: Request):
    user = await get_current_user(request, db)
    now = datetime.now(timezone.utc)

    days = []
    for i in range(6, -1, -1):
        day_start = (now - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        q = {"tenant_id": user["tenant_id"], "timestamp": {"$gte": day_start.isoformat(), "$lt": day_end.isoformat()}}

        customers = await db.audit_logs.count_documents({**q, "action_type": "customer_created"})
        screenings = await db.audit_logs.count_documents({**q, "action_type": {"$in": ["screening_run", "quick_screening_run"]}})
        cases = await db.audit_logs.count_documents({**q, "action_type": {"$in": ["case_created", "case_resolved"]}})
        risk = await db.audit_logs.count_documents({**q, "action_type": "screening_run", "details.result": {"$in": ["match", "potential_match"]}})

        days.append({
            "date": day_start.strftime("%b %d"),
            "customers": customers,
            "screenings": screenings,
            "cases": cases,
            "risk": risk,
        })

    return {"trends": days}

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
    kyc_status: Optional[str] = None,
    nationality: Optional[str] = None,
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
    if kyc_status:
        query["kyc_status"] = kyc_status
    if nationality:
        query["customer_data.nationality"] = nationality
    if search:
        query["$or"] = [
            {"customer_data.full_name": {"$regex": search, "$options": "i"}},
            {"customer_data.company_legal_name": {"$regex": search, "$options": "i"}},
            {"id": {"$regex": search, "$options": "i"}},
        ]
    
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


@api_router.get("/customers/{customer_id}/timeline")
async def get_customer_timeline(customer_id: str, request: Request):
    user = await get_current_user(request, db)
    events = await db.customer_timeline.find(
        {"customer_id": customer_id, "tenant_id": user["tenant_id"]}, {"_id": 0}
    ).sort("timestamp", 1).to_list(100)
    return {"events": events}


@api_router.get("/customers/{customer_id}/notes")
async def get_customer_notes(customer_id: str, request: Request):
    user = await get_current_user(request, db)
    notes = await db.customer_notes.find(
        {"customer_id": customer_id, "tenant_id": user["tenant_id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return {"notes": notes}


@api_router.post("/customers/{customer_id}/notes")
async def add_customer_note(customer_id: str, data: dict, request: Request):
    user = await get_current_user(request, db)
    text = data.get("text", "").strip()
    if not text:
        raise HTTPException(400, "Note text is required")

    note = {
        "id": str(uuid.uuid4()),
        "customer_id": customer_id,
        "tenant_id": user["tenant_id"],
        "text": text,
        "created_by": user["id"],
        "created_by_name": user.get("name", user.get("email", "Unknown")),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.customer_notes.insert_one(note)
    note.pop("_id", None)

    await log_audit(user["tenant_id"], user, "note_added", "customers", customer_id,
                   {"note_preview": text[:80]}, request)

    return note


@api_router.get("/customers/{customer_id}/screenings")
async def get_customer_screenings(customer_id: str, request: Request):
    """Get all screening records for a customer (by name match)."""
    user = await get_current_user(request, db)
    customer = await db.customers.find_one(
        {"id": customer_id, "tenant_id": user["tenant_id"]}, {"_id": 0, "customer_data": 1}
    )
    if not customer:
        raise HTTPException(404, "Customer not found")

    name = customer.get("customer_data", {}).get("full_name", "")
    if not name:
        return {"screenings": []}

    screenings = await db.screening_records.find(
        {"tenant_id": user["tenant_id"], "full_name": {"$regex": f"^{name}$", "$options": "i"}},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    return {"screenings": screenings}

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

@api_router.get("/cases/stats")
async def get_case_stats(request: Request):
    user = await get_current_user(request, db)
    tenant_id = user["tenant_id"]

    pipeline = [
        {"$match": {"tenant_id": tenant_id}},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]
    status_counts = {}
    async for doc in db.cases.aggregate(pipeline):
        status_counts[doc["_id"]] = doc["count"]

    total = sum(status_counts.values())
    sar_count = await db.cases.count_documents({"tenant_id": tenant_id, "sar_filed": True})
    critical_count = await db.cases.count_documents({"tenant_id": tenant_id, "priority": "critical", "status": {"$ne": "closed"}})

    return {
        "total": total,
        "open": status_counts.get("open", 0),
        "in_progress": status_counts.get("in_progress", 0),
        "escalated": status_counts.get("escalated", 0),
        "closed": status_counts.get("closed", 0),
        "sar_filed": sar_count,
        "critical": critical_count,
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

@api_router.get("/audit-logs/stats")
async def get_audit_log_stats(request: Request):
    """Return today's audit log statistics."""
    user = await get_current_user(request, db)
    if user["role"] not in ["super_admin", "compliance_officer", "read_only_auditor"]:
        raise HTTPException(403, "Access denied")

    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    tenant_q = {"tenant_id": user["tenant_id"], "timestamp": {"$gte": today_start}}

    total_today = await db.audit_logs.count_documents(tenant_q)
    unique_users = await db.audit_logs.distinct("user_name", tenant_q)
    screenings_today = await db.audit_logs.count_documents({**tenant_q, "action_type": {"$in": ["screening_run", "quick_screening_run", "pep_screening_run", "adverse_media_screening_run"]}})
    cases_resolved_today = await db.audit_logs.count_documents({**tenant_q, "action_type": "case_resolved"})

    return {
        "total_today": total_today,
        "unique_users": len(unique_users),
        "screenings_today": screenings_today,
        "cases_resolved_today": cases_resolved_today,
    }

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
# SETTINGS ROUTES
# ===================================

@api_router.get("/settings")
async def get_settings(request: Request):
    user = await get_current_user(request, db)
    settings = await db.settings.find_one({"tenant_id": user["tenant_id"]}, {"_id": 0})
    if not settings:
        return {"error": "Settings not found"}
    return settings


@api_router.put("/settings/general")
async def update_general_settings(data: dict, request: Request):
    user = await get_current_user(request, db)
    if user["role"] != "super_admin":
        raise HTTPException(403, "Only super admins can change general settings")

    allowed = {"company_name", "timezone", "currency"}
    update = {k: v for k, v in data.items() if k in allowed}
    await db.settings.update_one(
        {"tenant_id": user["tenant_id"]},
        {"$set": {f"general.{k}": v for k, v in update.items()}}
    )
    await log_audit(user["tenant_id"], user, "settings_changed", "settings", None, {"section": "general", "fields": list(update.keys())}, request)
    return {"message": "General settings updated"}


@api_router.put("/settings/risk-scoring")
async def update_risk_scoring(data: dict, request: Request):
    user = await get_current_user(request, db)
    if user["role"] not in ["super_admin", "compliance_officer"]:
        raise HTTPException(403, "Access denied")

    allowed = {"kyc_failure_weight", "sanctions_match_weight", "pep_match_weight", "adverse_media_weight", "country_risk_weight"}
    update = {}
    limits = {"kyc_failure_weight": 40, "sanctions_match_weight": 40, "pep_match_weight": 30, "adverse_media_weight": 20, "country_risk_weight": 15}
    for k, v in data.items():
        if k in allowed:
            update[k] = max(0, min(int(v), limits.get(k, 40)))

    await db.settings.update_one(
        {"tenant_id": user["tenant_id"]},
        {"$set": {f"risk_scoring.{k}": v for k, v in update.items()}}
    )
    await log_audit(user["tenant_id"], user, "settings_changed", "settings", None, {"section": "risk_scoring", "weights": update}, request)
    return {"message": "Risk scoring weights updated"}


@api_router.put("/settings/integrations/{provider}")
async def update_integration(provider: str, data: dict, request: Request):
    user = await get_current_user(request, db)
    if user["role"] != "super_admin":
        raise HTTPException(403, "Only super admins can change integrations")

    valid_providers = ["signzy", "opensanctions", "sanction_scanner"]
    if provider not in valid_providers:
        raise HTTPException(400, "Invalid provider")

    update_fields = {}
    if "enabled" in data:
        update_fields[f"integrations.{provider}.enabled"] = bool(data["enabled"])
    if "api_key" in data:
        key = data["api_key"]
        update_fields[f"integrations.{provider}.api_key"] = key
        update_fields[f"integrations.{provider}.status"] = "connected" if key else "demo"

    await db.settings.update_one({"tenant_id": user["tenant_id"]}, {"$set": update_fields})
    await log_audit(user["tenant_id"], user, "settings_changed", "settings", None, {"section": "integrations", "provider": provider}, request)
    return {"message": f"{provider} settings updated"}


@api_router.post("/settings/integrations/{provider}/test")
async def test_integration(provider: str, request: Request):
    user = await get_current_user(request, db)
    valid_providers = ["signzy", "opensanctions", "sanction_scanner"]
    if provider not in valid_providers:
        raise HTTPException(400, "Invalid provider")

    settings = await db.settings.find_one({"tenant_id": user["tenant_id"]}, {"_id": 0})
    integration = settings.get("integrations", {}).get(provider, {}) if settings else {}
    api_key = integration.get("api_key", "")

    if api_key:
        status = "connected"
        message = f"Successfully connected to {provider.replace('_', ' ').title()}"
    else:
        status = "demo"
        message = f"{provider.replace('_', ' ').title()} running in demo mode (no API key)"

    await db.settings.update_one(
        {"tenant_id": user["tenant_id"]},
        {"$set": {f"integrations.{provider}.status": status}}
    )
    return {"status": status, "message": message}


@api_router.put("/settings/notifications")
async def update_notifications(data: dict, request: Request):
    user = await get_current_user(request, db)
    if user["role"] not in ["super_admin", "compliance_officer"]:
        raise HTTPException(403, "Access denied")

    allowed = {"high_risk_screening", "case_escalated", "daily_summary", "api_usage_threshold"}
    update = {k: bool(v) for k, v in data.items() if k in allowed}
    await db.settings.update_one(
        {"tenant_id": user["tenant_id"]},
        {"$set": {f"notifications.{k}": v for k, v in update.items()}}
    )
    await log_audit(user["tenant_id"], user, "settings_changed", "settings", None, {"section": "notifications", "toggles": update}, request)
    return {"message": "Notification settings updated"}


@api_router.put("/settings/compliance-rules")
async def update_compliance_rules(data: dict, request: Request):
    user = await get_current_user(request, db)
    if user["role"] not in ["super_admin", "compliance_officer"]:
        raise HTTPException(403, "Access denied")

    allowed = {"auto_create_case_high_risk", "auto_escalate_unacceptable_risk", "block_onboarding_kyc_fails", "rescreen_interval_days"}
    update = {}
    for k, v in data.items():
        if k in allowed:
            update[k] = int(v) if k == "rescreen_interval_days" else bool(v)

    await db.settings.update_one(
        {"tenant_id": user["tenant_id"]},
        {"$set": {f"compliance_rules.{k}": v for k, v in update.items()}}
    )
    await log_audit(user["tenant_id"], user, "settings_changed", "settings", None, {"section": "compliance_rules", "rules": update}, request)
    return {"message": "Compliance rules updated"}


@api_router.get("/settings/team")
async def get_team_members_settings(request: Request):
    user = await get_current_user(request, db)
    members = await db.users.find(
        {"tenant_id": user["tenant_id"]},
        {"_id": 0, "id": 1, "name": 1, "email": 1, "role": 1, "is_active": 1, "status": 1, "created_at": 1}
    ).to_list(100)
    for m in members:
        if not m.get("status"):
            m["status"] = "active" if m.get("is_active", True) else "inactive"
    return {"members": members}


@api_router.post("/settings/team/invite")
async def invite_team_member(data: dict, request: Request):
    user = await get_current_user(request, db)
    if user["role"] != "super_admin":
        raise HTTPException(403, "Only super admins can invite members")

    email = data.get("email", "").lower().strip()
    name = data.get("name", "").strip()
    role = data.get("role", "analyst")

    if not email or not name:
        raise HTTPException(400, "Name and email are required")

    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(400, "Email already registered")

    valid_roles = ["compliance_officer", "analyst", "read_only_auditor"]
    if role not in valid_roles:
        raise HTTPException(400, f"Invalid role. Must be one of: {', '.join(valid_roles)}")

    member_doc = {
        "id": str(uuid.uuid4()),
        "email": email,
        "name": name,
        "role": role,
        "tenant_id": user["tenant_id"],
        "company_name": user.get("company_name", ""),
        "password_hash": "invited_placeholder",
        "is_active": True,
        "status": "invited",
        "totp_secret": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(member_doc)
    await log_audit(user["tenant_id"], user, "team_member_invited", "settings", member_doc["id"], {"email": email, "role": role}, request)
    return {"message": f"Invitation sent to {email}", "member": {"id": member_doc["id"], "name": name, "email": email, "role": role, "status": "invited"}}


@api_router.put("/settings/team/{member_id}/role")
async def update_team_member_role(member_id: str, data: dict, request: Request):
    user = await get_current_user(request, db)
    if user["role"] != "super_admin":
        raise HTTPException(403, "Only super admins can change roles")

    member = await db.users.find_one({"id": member_id, "tenant_id": user["tenant_id"]})
    if not member:
        raise HTTPException(404, "Member not found")

    new_role = data.get("role")
    valid_roles = ["super_admin", "compliance_officer", "analyst", "read_only_auditor"]
    if new_role not in valid_roles:
        raise HTTPException(400, "Invalid role")

    await db.users.update_one({"id": member_id}, {"$set": {"role": new_role}})
    await log_audit(user["tenant_id"], user, "team_member_role_changed", "settings", member_id, {"old_role": member["role"], "new_role": new_role}, request)
    return {"message": "Role updated"}


@api_router.delete("/settings/team/{member_id}")
async def remove_team_member(member_id: str, request: Request):
    user = await get_current_user(request, db)
    if user["role"] != "super_admin":
        raise HTTPException(403, "Only super admins can remove members")

    if member_id == user["id"]:
        raise HTTPException(400, "Cannot remove yourself")

    member = await db.users.find_one({"id": member_id, "tenant_id": user["tenant_id"]})
    if not member:
        raise HTTPException(404, "Member not found")

    await db.users.delete_one({"id": member_id})
    await log_audit(user["tenant_id"], user, "team_member_removed", "settings", member_id, {"email": member["email"]}, request)
    return {"message": "Member removed"}



# ===================================
# SANCTIONS.IO API KEY MANAGEMENT
# ===================================

@api_router.get("/settings/screening-status")
async def get_screening_status(request: Request):
    """Get the current screening provider status (live vs demo)."""
    user = await get_current_user(request, db)
    tenant_settings = await db.settings.find_one({"tenant_id": user["tenant_id"]})
    api_key = (tenant_settings or {}).get("sanctions_io_api_key")
    from services.sanctions_io_service import get_service_status
    return get_service_status(api_key)

@api_router.post("/settings/sanctions-api-key")
async def save_sanctions_api_key(data: dict, request: Request):
    """Save and validate a Sanctions.io API key for the tenant."""
    user = await get_current_user(request, db)
    if user["role"] not in ("super_admin", "compliance_officer"):
        raise HTTPException(403, "Only admins and compliance officers can manage API keys")

    api_key = data.get("api_key", "").strip()
    if not api_key:
        # Remove key
        await db.settings.update_one(
            {"tenant_id": user["tenant_id"]},
            {"$unset": {"sanctions_io_api_key": ""}},
        )
        await log_audit(user["tenant_id"], user, "sanctions_api_key_removed", "settings", None, {}, request)
        return {"status": "removed", "mode": "demo", "message": "API key removed. Screening now uses demo mode."}

    # Validate the key
    from services.sanctions_io_service import validate_api_key
    validation = await validate_api_key(api_key)

    if not validation["valid"]:
        raise HTTPException(400, validation["message"])

    # Save the key
    await db.settings.update_one(
        {"tenant_id": user["tenant_id"]},
        {"$set": {"sanctions_io_api_key": api_key}},
        upsert=True,
    )
    await log_audit(user["tenant_id"], user, "sanctions_api_key_saved", "settings", None,
                   {"provider": "sanctions.io"}, request)

    return {"status": "saved", "mode": "live", "message": "Sanctions.io API key validated and saved. Live screening enabled."}

@api_router.delete("/settings/sanctions-api-key")
async def remove_sanctions_api_key(request: Request):
    """Remove the Sanctions.io API key for the tenant."""
    user = await get_current_user(request, db)
    if user["role"] not in ("super_admin", "compliance_officer"):
        raise HTTPException(403, "Only admins and compliance officers can manage API keys")

    await db.settings.update_one(
        {"tenant_id": user["tenant_id"]},
        {"$unset": {"sanctions_io_api_key": ""}},
    )
    await log_audit(user["tenant_id"], user, "sanctions_api_key_removed", "settings", None, {}, request)
    return {"status": "removed", "mode": "demo", "message": "API key removed. Screening now uses demo mode."}


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

@api_router.patch("/cases/{case_id}/status")
async def quick_update_case_status(case_id: str, data: dict, request: Request):
    """Quick status update for Kanban drag-and-drop."""
    user = await get_current_user(request, db)

    case = await db.cases.find_one({"id": case_id, "tenant_id": user["tenant_id"]})
    if not case:
        raise HTTPException(404, "Case not found")

    new_status = data.get("status")
    valid_statuses = ["open", "in_progress", "escalated", "closed"]
    if new_status not in valid_statuses:
        raise HTTPException(400, f"Invalid status. Must be one of: {', '.join(valid_statuses)}")

    old_status = case.get("status")
    update_data = {
        "status": new_status,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    await db.cases.update_one({"id": case_id}, {"$set": update_data})

    note_doc = {
        "id": str(uuid.uuid4()),
        "case_id": case_id,
        "author_id": user["id"],
        "author_name": user["name"],
        "author_role": user["role"],
        "note": f"Status changed from {old_status.replace('_', ' ')} to {new_status.replace('_', ' ')}",
        "is_system": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.case_notes.insert_one(note_doc)

    await log_audit(user["tenant_id"], user, "case_status_changed", "cases", case_id,
                   {"old_status": old_status, "new_status": new_status}, request)

    return {"message": "Status updated", "old_status": old_status, "new_status": new_status}


@api_router.post("/cases/{case_id}/resolve")
async def resolve_case(case_id: str, data: dict, request: Request):
    """Resolve a case with a resolution type."""
    user = await get_current_user(request, db)

    case = await db.cases.find_one({"id": case_id, "tenant_id": user["tenant_id"]})
    if not case:
        raise HTTPException(404, "Case not found")

    resolution_type = data.get("resolution_type")
    valid_types = ["true_match_sar_filed", "true_match_risk_accepted", "false_positive", "duplicate"]
    if resolution_type not in valid_types:
        raise HTTPException(400, "Invalid resolution type")

    resolution_labels = {
        "true_match_sar_filed": "True Match — SAR Filed",
        "true_match_risk_accepted": "True Match — Risk Accepted",
        "false_positive": "False Positive",
        "duplicate": "Duplicate",
    }

    now = datetime.now(timezone.utc).isoformat()
    update_data = {
        "status": "closed",
        "resolution_type": resolution_type,
        "disposition": resolution_type,
        "disposition_note": f"Resolved as: {resolution_labels[resolution_type]}",
        "closed_at": now,
        "closed_by": user["id"],
        "updated_at": now,
    }

    if resolution_type == "true_match_sar_filed" and not case.get("sar_filed"):
        update_data["sar_filed"] = True
        update_data["sar_reference"] = f"SAR-{datetime.now(timezone.utc).strftime('%Y')}-{uuid.uuid4().hex[:6].upper()}"
        update_data["sar_filed_date"] = now

    await db.cases.update_one({"id": case_id}, {"$set": update_data})

    note_doc = {
        "id": str(uuid.uuid4()),
        "case_id": case_id,
        "author_id": user["id"],
        "author_name": user["name"],
        "author_role": user["role"],
        "note": f"Case resolved: {resolution_labels[resolution_type]}",
        "is_system": True,
        "created_at": now,
    }
    await db.case_notes.insert_one(note_doc)

    await log_audit(user["tenant_id"], user, "case_resolved", "cases", case_id,
                   {"resolution_type": resolution_type, "label": resolution_labels[resolution_type]}, request)

    return {"message": "Case resolved", "resolution_type": resolution_type}


@api_router.put("/cases/{case_id}/assign")
async def assign_case(case_id: str, data: dict, request: Request):
    """Assign a case to a team member."""
    user = await get_current_user(request, db)

    case = await db.cases.find_one({"id": case_id, "tenant_id": user["tenant_id"]})
    if not case:
        raise HTTPException(404, "Case not found")

    assigned_to = data.get("assigned_to")
    now = datetime.now(timezone.utc).isoformat()

    await db.cases.update_one({"id": case_id}, {"$set": {"assigned_to": assigned_to, "updated_at": now}})

    note_doc = {
        "id": str(uuid.uuid4()),
        "case_id": case_id,
        "author_id": user["id"],
        "author_name": user["name"],
        "author_role": user["role"],
        "note": f"Case assigned to {assigned_to}" if assigned_to else "Case unassigned",
        "is_system": True,
        "created_at": now,
    }
    await db.case_notes.insert_one(note_doc)

    await log_audit(user["tenant_id"], user, "case_assigned", "cases", case_id,
                   {"assigned_to": assigned_to}, request)

    return {"message": "Case assigned", "assigned_to": assigned_to}


@api_router.post("/cases/{case_id}/generate-sar")
async def generate_sar_report(case_id: str, request: Request):
    """Generate a mock SAR report with pre-filled data."""
    user = await get_current_user(request, db)

    case = await db.cases.find_one({"id": case_id, "tenant_id": user["tenant_id"]}, {"_id": 0})
    if not case:
        raise HTTPException(404, "Case not found")

    customer = await db.customers.find_one(
        {"id": case["customer_id"], "tenant_id": user["tenant_id"]},
        {"_id": 0}
    )

    customer_data = customer.get("customer_data", {}) if customer else {}
    sar_reference = f"SAR-{datetime.now(timezone.utc).strftime('%Y')}-{uuid.uuid4().hex[:6].upper()}"

    report = {
        "sar_reference": sar_reference,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "generated_by": user["name"],
        "case_id": case.get("case_id"),
        "filing_institution": "Rudrik — Compliance Intelligence",
        "subject": {
            "full_name": customer_data.get("full_name", case.get("customer_name", "Unknown")),
            "date_of_birth": customer_data.get("date_of_birth", "N/A"),
            "nationality": customer_data.get("nationality", "N/A"),
            "occupation": customer_data.get("occupation", "N/A"),
            "phone": customer_data.get("phone", "N/A"),
            "email": customer_data.get("email", "N/A"),
        },
        "risk_assessment": {
            "risk_score": customer.get("risk_score", "N/A") if customer else "N/A",
            "risk_level": customer.get("risk_level", "N/A") if customer else "N/A",
            "pep_status": customer.get("pep_status", "N/A") if customer else "N/A",
            "sanctions_status": customer.get("sanctions_status", "N/A") if customer else "N/A",
            "adverse_media": customer.get("adverse_media_status", "N/A") if customer else "N/A",
        },
        "case_details": {
            "case_type": case.get("case_type", "").replace("_", " ").title(),
            "priority": case.get("priority", "N/A"),
            "description": case.get("description", "N/A"),
            "created_at": case.get("created_at", "N/A"),
            "assigned_to": case.get("assigned_to", "Unassigned"),
        },
        "narrative": (
            f"This Suspicious Activity Report is filed in relation to {customer_data.get('full_name', case.get('customer_name', 'the subject'))}. "
            f"The case was opened due to {case.get('case_type', 'compliance concern').replace('_', ' ')} with a risk score of "
            f"{customer.get('risk_score', 'N/A') if customer else 'N/A'}/100 ({(customer.get('risk_level', 'N/A') if customer else 'N/A').upper()} risk). "
            f"{case.get('description', '')}"
        ),
        "status": "DRAFT — Pending Review",
    }

    await log_audit(user["tenant_id"], user, "sar_report_generated", "cases", case_id,
                   {"sar_reference": sar_reference}, request)

    return report


@api_router.get("/team-members")
async def get_team_members(request: Request):
    """Return demo team members for case assignment."""
    await get_current_user(request, db)
    return {
        "members": [
            {"id": "tm-001", "name": "Priya Sharma", "role": "Compliance Officer"},
            {"id": "tm-002", "name": "Rahul Verma", "role": "Senior Analyst"},
            {"id": "tm-003", "name": "Anita Desai", "role": "MLRO"},
        ]
    }

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
# SCREENING HISTORY ROUTES
# ===================================

@api_router.get("/screenings")
async def list_screenings(
    request: Request,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    risk_level: str = Query(None),
    status: str = Query(None),
    search: str = Query(None),
):
    """List all screening records for the tenant."""
    user = await get_current_user(request, db)
    query = {"tenant_id": user["tenant_id"]}

    if risk_level:
        query["risk_level"] = risk_level.upper()
    if status:
        query["status"] = status
    if search:
        query["full_name"] = {"$regex": search, "$options": "i"}

    total = await db.screening_records.count_documents(query)
    skip = (page - 1) * limit
    records = await db.screening_records.find(
        query, {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)

    return {
        "screenings": records,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit,
    }


@api_router.get("/screenings/{screening_id}")
async def get_screening(screening_id: str, request: Request):
    """Get a single screening record."""
    user = await get_current_user(request, db)
    record = await db.screening_records.find_one(
        {"id": screening_id, "tenant_id": user["tenant_id"]}, {"_id": 0}
    )
    if not record:
        raise HTTPException(404, "Screening record not found")
    return record


@api_router.post("/screenings/run")
async def run_full_screening(data: dict, request: Request):
    """Run a full screening and persist the record."""
    user = await get_current_user(request, db)

    full_name = data.get("fullName", "").strip()
    if not full_name:
        raise HTTPException(400, "fullName is required")

    dob = data.get("dateOfBirth")
    nationality = data.get("nationality", "")
    id_type = data.get("idType", "")
    id_number = data.get("idNumber", "")
    checks = data.get("checks", ["sanctions", "pep"])

    screening_id = str(uuid.uuid4())
    risk_score = 5
    kyc_result = None
    sanctions_result = None
    pep_result = None
    adverse_media_result = None
    matched_entities = []

    # Step 1: KYC verification
    if "kyc" in checks and id_type and id_number:
        from services import signzy_service
        kyc_fn = {
            "PAN": lambda: signzy_service.verify_pan(id_number, full_name),
            "AADHAAR": lambda: signzy_service.verify_aadhaar(id_number),
            "VOTER_ID": lambda: signzy_service.verify_voter_id(id_number),
            "PASSPORT": lambda: signzy_service.verify_passport(id_number),
            "DL": lambda: signzy_service.verify_driving_license(id_number),
        }.get(id_type.upper())
        if kyc_fn:
            kyc_result = await kyc_fn()
            if kyc_result.get("status") == "failed":
                risk_score += 20

    # Step 2 & 3 & 4: Sanctions + PEP + Adverse Media via Sanctions.io
    from services.sanctions_io_service import screen_entity, get_country_risk
    
    # Priority: request body api_key > tenant settings key
    sanctions_api_key = data.get("api_key") or None
    if not sanctions_api_key:
        tenant_settings = await db.settings.find_one({"tenant_id": user["tenant_id"]})
        sanctions_api_key = (tenant_settings or {}).get("sanctions_io_api_key")
    
    screening_types = []
    if "sanctions" in checks:
        screening_types.append("sanction")
    if "pep" in checks:
        screening_types.append("pep")
    if "adverse_media" in checks:
        screening_types.append("adverse-media")
    
    screening_data = None
    if screening_types:
        screening_data = await screen_entity(
            full_name, api_key=sanctions_api_key,
            types=screening_types, date_of_birth=dob, nationality=nationality,
        )

    if "sanctions" in checks:
        has_sanction = screening_data.get("has_sanction_match", False) if screening_data else False
        sanction_matches = [m for m in screening_data.get("matches", []) if m.get("match_type") == "sanction"] if screening_data else []
        sanctions_result = {"status": "match" if has_sanction else "clear", "matches": sanction_matches}
        if has_sanction:
            risk_score += 35
            matched_entities.extend(sanction_matches)

    if "pep" in checks:
        has_pep = screening_data.get("has_pep_match", False) if screening_data else False
        pep_matches = [m for m in screening_data.get("matches", []) if m.get("match_type") == "pep"] if screening_data else []
        pep_result = {"status": "match" if has_pep else "clear", "matches": pep_matches}
        if has_pep:
            risk_score += 20
            matched_entities.extend(pep_matches)

    if "adverse_media" in checks:
        has_adverse = screening_data.get("has_adverse_media", False) if screening_data else False
        am_matches = [m for m in screening_data.get("matches", []) if m.get("match_type") in ("adverse-media", "criminal")] if screening_data else []
        adverse_media_result = {
            "status": "hits_found" if has_adverse else "clear",
            "hits": am_matches,
        }
        if has_adverse:
            risk_score += 15

    # Country risk
    country_risk = get_country_risk(nationality)
    if country_risk:
        risk_score += 10

    risk_score = min(risk_score, 100)
    if risk_score <= 25:
        risk_level = "LOW"
    elif risk_score <= 50:
        risk_level = "MEDIUM"
    elif risk_score <= 75:
        risk_level = "HIGH"
    else:
        risk_level = "CRITICAL"

    screening_mode = screening_data.get("mode", "demo") if screening_data else "demo"
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "id": screening_id,
        "tenant_id": user["tenant_id"],
        "full_name": full_name,
        "date_of_birth": dob,
        "nationality": nationality,
        "id_type": id_type,
        "id_number": id_number,
        "checks_run": checks,
        "risk_score": risk_score,
        "risk_level": risk_level,
        "status": "flagged" if risk_level in ("HIGH", "CRITICAL") else "completed",
        "kyc_result": kyc_result,
        "sanctions_result": sanctions_result,
        "pep_result": pep_result,
        "adverse_media_result": adverse_media_result,
        "country_risk": country_risk,
        "matched_entities": matched_entities,
        "created_at": now,
        "completed_at": now,
        "created_by": user["id"],
        "mode": screening_mode,
        "provider": screening_data.get("provider", "demo") if screening_data else "demo",
    }

    # Include api_error if the live call failed and fell back to demo
    if screening_data and screening_data.get("api_error"):
        doc["api_error"] = screening_data["api_error"]

    await db.screening_records.insert_one(doc)
    doc.pop("_id", None)

    await log_audit(user["tenant_id"], user, "screening_run", "screening", screening_id,
                   {"full_name": full_name, "checks": checks, "risk_level": risk_level, "mode": screening_mode}, request)

    return doc


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

    # Sanctions + PEP via Sanctions.io
    if "sanctions" in checks or "pep" in checks:
        from services.sanctions_io_service import screen_entity
        
        sanctions_api_key = data.get("api_key") or None
        if not sanctions_api_key:
            tenant_settings = await db.settings.find_one({"tenant_id": user["tenant_id"]})
            sanctions_api_key = (tenant_settings or {}).get("sanctions_io_api_key")
        
        screening_types = []
        if "sanctions" in checks:
            screening_types.append("sanction")
        if "pep" in checks:
            screening_types.append("pep")
        
        screening = await screen_entity(
            name, api_key=sanctions_api_key,
            types=screening_types, date_of_birth=dob, nationality=nationality,
        )
        if "sanctions" in checks:
            result["sanctions"] = {
                "status": "match" if screening.get("has_sanction_match") else "clear",
                "matches": [m for m in screening.get("matches", []) if m.get("match_type") == "sanction"],
            }
        if "pep" in checks:
            result["pep"] = {
                "status": "match" if screening.get("has_pep_match") else "clear",
                "matches": [m for m in screening.get("matches", []) if m.get("match_type") == "pep"],
            }
        result["riskLevel"] = screening.get("risk_level", "LOW")
        result["riskScore"] = int(screening.get("top_score", 0) * 100)
        result["mode"] = screening.get("mode", "demo")
        result["provider"] = screening.get("provider", "demo")

    result["completedAt"] = datetime.now(timezone.utc).isoformat()

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

# Initialise shared deps module so routes never import from server.py
import shared.deps as deps
deps.init(db, log_audit)

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
