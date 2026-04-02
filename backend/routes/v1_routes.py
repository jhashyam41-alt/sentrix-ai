"""
Public API v1 Routes — /api/v1/screen, /api/v1/screening/*, /api/v1/risk/*
Requires API key authentication via X-API-Key header.
"""
from fastapi import APIRouter, HTTPException, Request
from datetime import datetime, timezone
import uuid

router = APIRouter(prefix="/api/v1", tags=["Public API v1"])


async def _get_db():
    from shared.deps import get_db
    return get_db()


async def _validate_api_key(request: Request):
    """Validate API key from X-API-Key header."""
    api_key = request.headers.get("X-API-Key")
    if not api_key:
        raise HTTPException(401, "Missing X-API-Key header")

    db = await _get_db()
    key_doc = await db.api_keys.find_one({"api_key": api_key, "is_active": True})
    if not key_doc:
        raise HTTPException(401, "Invalid or revoked API key")

    # Rate limiting (simple in-memory — in production use Redis)
    now = datetime.now(timezone.utc)
    minute_key = f"{api_key}:{now.strftime('%Y%m%d%H%M')}"
    rate_doc = await db.api_rate_limits.find_one({"key": minute_key})
    limit = key_doc.get("rate_limit_per_minute", 60)

    if rate_doc and rate_doc.get("count", 0) >= limit:
        raise HTTPException(429, "Rate limit exceeded")

    await db.api_rate_limits.update_one(
        {"key": minute_key},
        {"$inc": {"count": 1}, "$setOnInsert": {"created_at": now.isoformat()}},
        upsert=True,
    )

    return key_doc


async def _log_api_call(db, key_doc, endpoint, status_code, response_time_ms):
    await db.api_call_logs.insert_one({
        "id": str(uuid.uuid4()),
        "client_id": key_doc["id"],
        "client_name": key_doc["client_name"],
        "api_key": key_doc["api_key"][:8] + "...",
        "endpoint": endpoint,
        "status_code": status_code,
        "response_time_ms": response_time_ms,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })


# ─── Individual Screening ────────────────────────────────────────────

@router.post("/screening/individual")
async def screen_individual(data: dict, request: Request):
    import time
    start = time.time()
    key_doc = await _validate_api_key(request)
    db = await _get_db()

    from services.opensanctions_service import screen_individual as svc_screen

    name = data.get("name", "")
    if not name:
        raise HTTPException(400, "name is required")

    result = await svc_screen(
        name=name,
        date_of_birth=data.get("dateOfBirth"),
        nationality=data.get("nationality"),
    )

    # Save to db
    result["client_id"] = key_doc["id"]
    await db.v1_screenings.insert_one({**result, "_type": "individual"})

    elapsed = round((time.time() - start) * 1000)
    await _log_api_call(db, key_doc, "/v1/screening/individual", 200, elapsed)
    result.pop("_id", None)
    return result


# ─── Batch Screening ─────────────────────────────────────────────────

@router.post("/screening/batch")
async def screen_batch(data: dict, request: Request):
    import time
    start = time.time()
    key_doc = await _validate_api_key(request)
    db = await _get_db()

    from services.opensanctions_service import screen_batch as svc_batch

    individuals = data.get("individuals", [])
    if not individuals:
        raise HTTPException(400, "individuals array is required")
    if len(individuals) > 50:
        raise HTTPException(400, "Maximum 50 individuals per batch")

    result = await svc_batch(individuals)
    result["client_id"] = key_doc["id"]
    await db.v1_screenings.insert_one({**result, "_type": "batch"})

    elapsed = round((time.time() - start) * 1000)
    await _log_api_call(db, key_doc, "/v1/screening/batch", 200, elapsed)
    result.pop("_id", None)
    return result


# ─── Combined Risk Score ─────────────────────────────────────────────

@router.post("/risk/score")
async def calculate_risk_score(data: dict, request: Request):
    import time
    start = time.time()
    key_doc = await _validate_api_key(request)
    db = await _get_db()

    customer_id = data.get("customerId")
    if not customer_id:
        raise HTTPException(400, "customerId is required")

    from services.risk_service import calculate_v1_risk_score
    result = await calculate_v1_risk_score(db, customer_id)

    await db.risk_scores.insert_one({**result, "client_id": key_doc["id"]})

    elapsed = round((time.time() - start) * 1000)
    await _log_api_call(db, key_doc, "/v1/risk/score", 200, elapsed)
    result.pop("_id", None)
    return result


# ─── Unified Screening Endpoint ──────────────────────────────────────

@router.post("/screen")
async def unified_screen(data: dict, request: Request):
    """Main public endpoint — run multiple checks in parallel."""
    import time
    start = time.time()
    key_doc = await _validate_api_key(request)
    db = await _get_db()

    name = data.get("name", "")
    if not name:
        raise HTTPException(400, "name is required")

    checks = data.get("checks", ["sanctions", "pep", "risk_score"])
    id_type = data.get("idType")
    id_number = data.get("idNumber")
    dob = data.get("dateOfBirth")
    nationality = data.get("nationality")

    screening_id = f"scr_{uuid.uuid4().hex[:12]}"
    result = {
        "screeningId": screening_id,
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
        }.get(id_type.upper())
        if kyc_fn:
            result["kyc"] = await kyc_fn()
        else:
            result["kyc"] = {"status": "unsupported", "message": f"ID type {id_type} not supported"}

    # Sanctions + PEP check (same API call)
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
    result["mode"] = "demo" if not key_doc.get("signzy_key") else "live"

    # Save record
    await db.v1_screenings.insert_one({
        **result, "client_id": key_doc["id"], "_type": "unified",
    })

    elapsed = round((time.time() - start) * 1000)
    await _log_api_call(db, key_doc, "/v1/screen", 200, elapsed)
    result.pop("_id", None)
    return result
