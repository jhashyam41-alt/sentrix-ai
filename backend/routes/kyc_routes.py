"""
KYC Verification Routes — POST /api/kyc/verify-{type}
Uses Signzy in live mode, mock data in demo mode.
"""
from fastapi import APIRouter, HTTPException, Request
from datetime import datetime, timezone
import uuid

router = APIRouter(prefix="/api/kyc", tags=["KYC"])


async def _get_deps(request: Request):
    """Get db + user from app state."""
    from server import get_current_user, db, log_audit
    user = await get_current_user(request, db)
    return db, user, log_audit


@router.post("/verify-pan")
async def verify_pan(data: dict, request: Request):
    db, user, log_audit = await _get_deps(request)
    from services.signzy_service import verify_pan as svc_verify_pan

    pan = data.get("panNumber", "")
    full_name = data.get("fullName", "")
    customer_id = data.get("customerId")

    result = await svc_verify_pan(pan, full_name)
    if result.get("status") == "error":
        raise HTTPException(400, result["message"])

    record = {
        "id": str(uuid.uuid4()),
        "tenant_id": user["tenant_id"],
        "customer_id": customer_id,
        "verification_type": "pan",
        "id_number": pan,
        "verification_status": result["status"],
        "details": result,
        "verified_at": result["verified_at"],
        "created_by": user["id"],
    }
    await db.kyc_verifications.insert_one(record)

    if customer_id:
        await _update_customer_kyc(db, customer_id, user["tenant_id"], "pan", result)

    await log_audit(user["tenant_id"], user, "kyc_verification", "kyc", customer_id, {"type": "pan", "status": result["status"]}, request)
    return {**result, "verification_id": record["id"]}


@router.post("/verify-aadhaar")
async def verify_aadhaar(data: dict, request: Request):
    db, user, log_audit = await _get_deps(request)
    from services.signzy_service import verify_aadhaar as svc_verify, mask_aadhaar

    aadhaar = data.get("aadhaarNumber", "")
    customer_id = data.get("customerId")

    result = await svc_verify(aadhaar)
    if result.get("status") == "error":
        raise HTTPException(400, result["message"])

    record = {
        "id": str(uuid.uuid4()),
        "tenant_id": user["tenant_id"],
        "customer_id": customer_id,
        "verification_type": "aadhaar",
        "id_number": mask_aadhaar(aadhaar),
        "verification_status": result["status"],
        "details": result,
        "verified_at": result["verified_at"],
        "created_by": user["id"],
    }
    await db.kyc_verifications.insert_one(record)

    if customer_id:
        await _update_customer_kyc(db, customer_id, user["tenant_id"], "aadhaar", result)

    await log_audit(user["tenant_id"], user, "kyc_verification", "kyc", customer_id, {"type": "aadhaar", "status": result["status"]}, request)
    return {**result, "verification_id": record["id"]}


@router.post("/verify-voter-id")
async def verify_voter_id_route(data: dict, request: Request):
    db, user, log_audit = await _get_deps(request)
    from services.signzy_service import verify_voter_id as svc_verify

    vid = data.get("voterIdNumber", "")
    customer_id = data.get("customerId")

    result = await svc_verify(vid)
    if result.get("status") == "error":
        raise HTTPException(400, result["message"])

    record = {
        "id": str(uuid.uuid4()),
        "tenant_id": user["tenant_id"],
        "customer_id": customer_id,
        "verification_type": "voter_id",
        "id_number": vid,
        "verification_status": result["status"],
        "details": result,
        "verified_at": result["verified_at"],
        "created_by": user["id"],
    }
    await db.kyc_verifications.insert_one(record)

    if customer_id:
        await _update_customer_kyc(db, customer_id, user["tenant_id"], "voter_id", result)

    await log_audit(user["tenant_id"], user, "kyc_verification", "kyc", customer_id, {"type": "voter_id", "status": result["status"]}, request)
    return {**result, "verification_id": record["id"]}


@router.post("/verify-passport")
async def verify_passport_route(data: dict, request: Request):
    db, user, log_audit = await _get_deps(request)
    from services.signzy_service import verify_passport as svc_verify

    pno = data.get("passportNumber", "")
    customer_id = data.get("customerId")

    result = await svc_verify(pno)
    if result.get("status") == "error":
        raise HTTPException(400, result["message"])

    record = {
        "id": str(uuid.uuid4()),
        "tenant_id": user["tenant_id"],
        "customer_id": customer_id,
        "verification_type": "passport",
        "id_number": pno,
        "verification_status": result["status"],
        "details": result,
        "verified_at": result["verified_at"],
        "created_by": user["id"],
    }
    await db.kyc_verifications.insert_one(record)

    if customer_id:
        await _update_customer_kyc(db, customer_id, user["tenant_id"], "passport", result)

    await log_audit(user["tenant_id"], user, "kyc_verification", "kyc", customer_id, {"type": "passport", "status": result["status"]}, request)
    return {**result, "verification_id": record["id"]}


@router.post("/verify-driving-license")
async def verify_dl_route(data: dict, request: Request):
    db, user, log_audit = await _get_deps(request)
    from services.signzy_service import verify_driving_license as svc_verify

    dl = data.get("dlNumber", "")
    customer_id = data.get("customerId")

    result = await svc_verify(dl)
    if result.get("status") == "error":
        raise HTTPException(400, result["message"])

    record = {
        "id": str(uuid.uuid4()),
        "tenant_id": user["tenant_id"],
        "customer_id": customer_id,
        "verification_type": "driving_license",
        "id_number": dl,
        "verification_status": result["status"],
        "details": result,
        "verified_at": result["verified_at"],
        "created_by": user["id"],
    }
    await db.kyc_verifications.insert_one(record)

    if customer_id:
        await _update_customer_kyc(db, customer_id, user["tenant_id"], "driving_license", result)

    await log_audit(user["tenant_id"], user, "kyc_verification", "kyc", customer_id, {"type": "driving_license", "status": result["status"]}, request)
    return {**result, "verification_id": record["id"]}


@router.get("/verifications/{customer_id}")
async def get_customer_verifications(customer_id: str, request: Request):
    db, user, _ = await _get_deps(request)
    records = await db.kyc_verifications.find(
        {"customer_id": customer_id, "tenant_id": user["tenant_id"]},
        {"_id": 0}
    ).sort("verified_at", -1).to_list(50)
    return {"verifications": records}


@router.get("/status")
async def get_kyc_status(request: Request):
    """Return Signzy integration status."""
    from services.signzy_service import get_service_status
    await _get_deps(request)  # auth check
    return get_service_status()


async def _update_customer_kyc(db, customer_id: str, tenant_id: str, doc_type: str, result: dict):
    """Update customer record with latest KYC verification."""
    await db.customers.update_one(
        {"id": customer_id, "tenant_id": tenant_id},
        {"$set": {
            f"kyc_verifications.{doc_type}": {
                "status": result["status"],
                "verified_at": result["verified_at"],
                "mode": result.get("mode", "unknown"),
            },
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }}
    )
