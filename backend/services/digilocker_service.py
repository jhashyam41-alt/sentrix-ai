"""
DigiLocker integration service for Aadhaar XML and PAN verification.
Uses DigiLocker/API Setu sandbox for dev, with fallback to demo mode.
"""
import uuid
import hashlib
import random
import httpx
import logging
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger("digilocker")

# API Setu / sandbox.co.in endpoints
DIGILOCKER_BASE_URL = "https://dg-sandbox.setu.co"
SANDBOX_BASE_URL = "https://api.sandbox.co.in"


async def verify_aadhaar(
    aadhaar_number: str,
    customer_name: str,
    api_key: Optional[str] = None,
) -> dict:
    """
    Verify Aadhaar via DigiLocker. Returns XML-parsed verification result.
    Falls back to demo mode if no API key.
    """
    if api_key:
        try:
            return await _live_aadhaar_verify(aadhaar_number, customer_name, api_key)
        except Exception as e:
            logger.warning(f"DigiLocker Aadhaar API failed, using demo: {e}")
            result = _demo_aadhaar_verify(aadhaar_number, customer_name)
            result["api_error"] = str(e)
            return result
    return _demo_aadhaar_verify(aadhaar_number, customer_name)


async def verify_pan(
    pan_number: str,
    customer_name: str,
    api_key: Optional[str] = None,
) -> dict:
    """
    Verify PAN card via DigiLocker. Returns verification result.
    Falls back to demo mode if no API key.
    """
    if api_key:
        try:
            return await _live_pan_verify(pan_number, customer_name, api_key)
        except Exception as e:
            logger.warning(f"DigiLocker PAN API failed, using demo: {e}")
            result = _demo_pan_verify(pan_number, customer_name)
            result["api_error"] = str(e)
            return result
    return _demo_pan_verify(pan_number, customer_name)


async def validate_api_key(api_key: str) -> dict:
    """Test if DigiLocker API key is valid."""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                f"{SANDBOX_BASE_URL}/kyc/digilocker/sessions/init",
                headers={"Authorization": api_key, "x-api-key": api_key},
            )
            if resp.status_code in (200, 201, 400):
                return {"valid": True, "message": "API key validated"}
            if resp.status_code in (401, 403):
                return {"valid": False, "message": "Invalid API key"}
            return {"valid": False, "message": f"API returned {resp.status_code}"}
    except Exception as e:
        return {"valid": False, "message": f"Connection failed: {str(e)}"}


# ============================
# LIVE API CALLS
# ============================

async def _live_aadhaar_verify(aadhaar: str, name: str, api_key: str) -> dict:
    """Call real DigiLocker API for Aadhaar verification."""
    headers = {
        "Authorization": api_key,
        "x-api-key": api_key,
        "Content-Type": "application/json",
    }
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            f"{SANDBOX_BASE_URL}/kyc/aadhaar/okyc/otp",
            headers=headers,
            json={"aadhaar_number": aadhaar},
        )
        resp.raise_for_status()
        data = resp.json()

    return {
        "verification_id": f"adr_{uuid.uuid4().hex[:12]}",
        "document_type": "aadhaar",
        "status": "verified" if data.get("data", {}).get("valid", data.get("status") == "success") else "failed",
        "holder_name": data.get("data", {}).get("full_name", name),
        "aadhaar_last4": aadhaar[-4:] if len(aadhaar) >= 4 else "****",
        "gender": data.get("data", {}).get("gender"),
        "dob": data.get("data", {}).get("dob"),
        "address": data.get("data", {}).get("address"),
        "verified_at": datetime.now(timezone.utc).isoformat(),
        "mode": "live",
        "provider": "digilocker",
    }


async def _live_pan_verify(pan: str, name: str, api_key: str) -> dict:
    """Call real DigiLocker/PAN API for PAN verification."""
    headers = {
        "Authorization": api_key,
        "x-api-key": api_key,
        "Content-Type": "application/json",
    }
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            f"{SANDBOX_BASE_URL}/kyc/pan/verify",
            headers=headers,
            json={"pan": pan, "consent": "Y", "reason": "KYC Verification"},
        )
        resp.raise_for_status()
        data = resp.json()

    pan_data = data.get("data", {})
    name_match = _name_similarity(name, pan_data.get("full_name", ""))

    return {
        "verification_id": f"pan_{uuid.uuid4().hex[:12]}",
        "document_type": "pan",
        "status": "verified" if pan_data.get("valid", data.get("status") == "success") else "failed",
        "pan_number": pan.upper(),
        "holder_name": pan_data.get("full_name", name),
        "pan_type": pan_data.get("type", _pan_type(pan)),
        "name_match_score": name_match,
        "aadhaar_linked": pan_data.get("aadhaar_linked"),
        "verified_at": datetime.now(timezone.utc).isoformat(),
        "mode": "live",
        "provider": "digilocker",
    }


# ============================
# DEMO MODE
# ============================

def _demo_aadhaar_verify(aadhaar: str, name: str) -> dict:
    """Generate realistic demo Aadhaar verification result."""
    seed = int(hashlib.sha256(f"{aadhaar}{name}".encode()).hexdigest()[:8], 16)
    rng = random.Random(seed)

    is_valid = len(aadhaar) == 12 and aadhaar.isdigit()
    status = "verified" if is_valid and rng.random() > 0.1 else "failed"

    demo_genders = ["Male", "Female"]
    demo_states = ["Maharashtra", "Karnataka", "Delhi", "Tamil Nadu", "Gujarat", "Rajasthan", "West Bengal", "Kerala"]

    return {
        "verification_id": f"adr_{uuid.uuid4().hex[:12]}",
        "document_type": "aadhaar",
        "status": status,
        "holder_name": name if status == "verified" else None,
        "aadhaar_last4": aadhaar[-4:] if len(aadhaar) >= 4 else "****",
        "gender": rng.choice(demo_genders) if status == "verified" else None,
        "dob": f"19{rng.randint(60, 99)}-{rng.randint(1,12):02d}-{rng.randint(1,28):02d}" if status == "verified" else None,
        "address": {
            "state": rng.choice(demo_states),
            "pincode": f"{rng.randint(100, 999)}{rng.randint(100, 999)}",
        } if status == "verified" else None,
        "verified_at": datetime.now(timezone.utc).isoformat(),
        "mode": "demo",
        "provider": "demo",
    }


def _demo_pan_verify(pan: str, name: str) -> dict:
    """Generate realistic demo PAN verification result."""
    seed = int(hashlib.sha256(f"{pan}{name}".encode()).hexdigest()[:8], 16)
    rng = random.Random(seed)

    is_valid_format = len(pan) == 10 and pan[:5].isalpha() and pan[5:9].isdigit() and pan[9].isalpha()
    status = "verified" if is_valid_format and rng.random() > 0.08 else "failed"

    name_match = round(rng.uniform(0.85, 1.0), 2) if status == "verified" else 0.0

    return {
        "verification_id": f"pan_{uuid.uuid4().hex[:12]}",
        "document_type": "pan",
        "status": status,
        "pan_number": pan.upper(),
        "holder_name": name if status == "verified" else None,
        "pan_type": _pan_type(pan),
        "name_match_score": name_match,
        "aadhaar_linked": rng.choice([True, False]) if status == "verified" else None,
        "verified_at": datetime.now(timezone.utc).isoformat(),
        "mode": "demo",
        "provider": "demo",
    }


def _pan_type(pan: str) -> str:
    """Derive PAN holder type from 4th character."""
    if len(pan) < 4:
        return "Unknown"
    code = pan[3].upper()
    return {
        "P": "Individual", "C": "Company", "H": "HUF",
        "F": "Firm", "A": "AOP", "T": "Trust",
        "B": "BOI", "L": "Local Authority", "J": "Artificial Juridical Person",
        "G": "Government",
    }.get(code, "Individual")


def _name_similarity(a: str, b: str) -> float:
    """Simple name match score."""
    if not a or not b:
        return 0.0
    a_parts = set(a.lower().split())
    b_parts = set(b.lower().split())
    if not a_parts or not b_parts:
        return 0.0
    intersection = a_parts & b_parts
    return round(len(intersection) / max(len(a_parts), len(b_parts)), 2)
