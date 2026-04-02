"""
Signzy KYC Service — calls real Signzy APIs when SIGNZY_API_KEY is set, 
otherwise returns realistic mock data for demo/testing.
"""
import os
import re
import uuid
import secrets
import httpx
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

SIGNZY_API_KEY = os.environ.get("SIGNZY_API_KEY", "")
SIGNZY_BASE_URL = os.environ.get("SIGNZY_BASE_URL", "https://api-preproduction.signzy.app")

DEMO_MODE = not bool(SIGNZY_API_KEY)

# Validation patterns
PAN_PATTERN = re.compile(r"^[A-Z]{5}[0-9]{4}[A-Z]$")
AADHAAR_PATTERN = re.compile(r"^\d{12}$")
VOTER_ID_PATTERN = re.compile(r"^[A-Z]{3}\d{7}$")
PASSPORT_PATTERN = re.compile(r"^[A-Z]\d{7}$")
DL_PATTERN = re.compile(r"^[A-Z]{2}\d{2}\s?\d{11}$")


def _headers():
    return {"Authorization": SIGNZY_API_KEY, "Content-Type": "application/json"}


async def _call_signzy(endpoint: str, payload: dict) -> dict:
    """Make a real Signzy API call."""
    url = f"{SIGNZY_BASE_URL}{endpoint}"
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(url, json=payload, headers=_headers())
        resp.raise_for_status()
        return resp.json()


# ─── PAN ────────────────────────────────────────────────────────────────

def validate_pan(pan: str) -> bool:
    return bool(PAN_PATTERN.match(pan.upper().strip()))


async def verify_pan(pan_number: str, full_name: str = None) -> dict:
    pan = pan_number.upper().strip()
    if not validate_pan(pan):
        return {"status": "error", "message": "Invalid PAN format. Expected: ABCDE1234F"}

    if not DEMO_MODE:
        try:
            result = await _call_signzy("/api/v3/pan/fetch", {"pan": pan})
            return {
                "status": "verified" if result.get("result", {}).get("name") else "failed",
                "pan_number": pan,
                "holder_name": result.get("result", {}).get("name", ""),
                "name_match": _name_match(full_name, result.get("result", {}).get("name", "")),
                "signzy_response": result,
                "verified_at": datetime.now(timezone.utc).isoformat(),
                "mode": "live",
            }
        except Exception as e:
            logger.error(f"Signzy PAN call failed: {e}")
            return {"status": "error", "message": f"Signzy API error: {str(e)}"}

    # Mock response
    is_valid = secrets.randbelow(10) < 8  # 80% success rate
    mock_name = full_name or "DEMO USER"
    return {
        "status": "verified" if is_valid else "failed",
        "pan_number": pan,
        "holder_name": mock_name.upper() if is_valid else "",
        "name_match": True if is_valid and full_name else None,
        "type": "Individual" if pan[3] == "P" else "Company",
        "verified_at": datetime.now(timezone.utc).isoformat(),
        "mode": "demo",
    }


# ─── AADHAAR ────────────────────────────────────────────────────────────

def validate_aadhaar(aadhaar: str) -> bool:
    return bool(AADHAAR_PATTERN.match(aadhaar.strip()))


def mask_aadhaar(aadhaar: str) -> str:
    return "XXXX-XXXX-" + aadhaar[-4:]


async def verify_aadhaar(aadhaar_number: str) -> dict:
    aadhaar = aadhaar_number.strip()
    if not validate_aadhaar(aadhaar):
        return {"status": "error", "message": "Invalid Aadhaar. Must be 12 digits."}

    masked = mask_aadhaar(aadhaar)

    if not DEMO_MODE:
        try:
            result = await _call_signzy("/api/v3/aadhaar/verify", {"uid": aadhaar})
            r = result.get("result", {})
            return {
                "status": "verified" if r.get("verified") else "failed",
                "aadhaar_masked": masked,
                "age_band": r.get("ageBand", ""),
                "state": r.get("state", ""),
                "gender": r.get("gender", ""),
                "verified_at": datetime.now(timezone.utc).isoformat(),
                "mode": "live",
            }
        except Exception as e:
            logger.error(f"Signzy Aadhaar call failed: {e}")
            return {"status": "error", "message": f"Signzy API error: {str(e)}"}

    # Mock
    states = ["Maharashtra", "Karnataka", "Gujarat", "Tamil Nadu", "Delhi", "Rajasthan"]
    genders = ["MALE", "FEMALE"]
    age_bands = ["18-25", "26-35", "36-45", "46-60", "60+"]
    is_valid = secrets.randbelow(10) < 8
    return {
        "status": "verified" if is_valid else "failed",
        "aadhaar_masked": masked,
        "age_band": age_bands[secrets.randbelow(len(age_bands))] if is_valid else "",
        "state": states[secrets.randbelow(len(states))] if is_valid else "",
        "gender": genders[secrets.randbelow(len(genders))] if is_valid else "",
        "verified_at": datetime.now(timezone.utc).isoformat(),
        "mode": "demo",
    }


# ─── VOTER ID ───────────────────────────────────────────────────────────

def validate_voter_id(vid: str) -> bool:
    return bool(VOTER_ID_PATTERN.match(vid.upper().strip()))


async def verify_voter_id(voter_id: str) -> dict:
    vid = voter_id.upper().strip()
    if not validate_voter_id(vid):
        return {"status": "error", "message": "Invalid Voter ID format. Expected: ABC1234567"}

    if not DEMO_MODE:
        try:
            result = await _call_signzy("/api/v3/voterid/fetch", {"epicNumber": vid})
            return {
                "status": "verified" if result.get("result") else "failed",
                "voter_id": vid,
                "holder_name": result.get("result", {}).get("name", ""),
                "constituency": result.get("result", {}).get("constituency", ""),
                "verified_at": datetime.now(timezone.utc).isoformat(),
                "mode": "live",
            }
        except Exception as e:
            logger.error(f"Signzy Voter ID call failed: {e}")
            return {"status": "error", "message": f"Signzy API error: {str(e)}"}

    is_valid = secrets.randbelow(10) < 8
    return {
        "status": "verified" if is_valid else "failed",
        "voter_id": vid,
        "holder_name": "DEMO VOTER" if is_valid else "",
        "constituency": "Demo Constituency" if is_valid else "",
        "verified_at": datetime.now(timezone.utc).isoformat(),
        "mode": "demo",
    }


# ─── PASSPORT ───────────────────────────────────────────────────────────

def validate_passport(passport: str) -> bool:
    return bool(PASSPORT_PATTERN.match(passport.upper().strip()))


async def verify_passport(passport_number: str) -> dict:
    pno = passport_number.upper().strip()
    if not validate_passport(pno):
        return {"status": "error", "message": "Invalid Passport format. Expected: A1234567"}

    if not DEMO_MODE:
        try:
            result = await _call_signzy("/api/v3/passport/fetch", {"passportNumber": pno})
            return {
                "status": "verified" if result.get("result") else "failed",
                "passport_number": pno,
                "holder_name": result.get("result", {}).get("name", ""),
                "nationality": result.get("result", {}).get("nationality", ""),
                "verified_at": datetime.now(timezone.utc).isoformat(),
                "mode": "live",
            }
        except Exception as e:
            logger.error(f"Signzy Passport call failed: {e}")
            return {"status": "error", "message": f"Signzy API error: {str(e)}"}

    is_valid = secrets.randbelow(10) < 8
    return {
        "status": "verified" if is_valid else "failed",
        "passport_number": pno,
        "holder_name": "DEMO PASSPORT HOLDER" if is_valid else "",
        "nationality": "INDIAN" if is_valid else "",
        "verified_at": datetime.now(timezone.utc).isoformat(),
        "mode": "demo",
    }


# ─── DRIVING LICENSE ────────────────────────────────────────────────────

def validate_dl(dl: str) -> bool:
    return bool(DL_PATTERN.match(dl.upper().strip().replace(" ", "")))


async def verify_driving_license(dl_number: str) -> dict:
    dl = dl_number.upper().strip()
    if not validate_dl(dl):
        return {"status": "error", "message": "Invalid DL format. Expected: KA0120201234567"}

    if not DEMO_MODE:
        try:
            result = await _call_signzy("/api/v3/dl/fetch", {"dlNumber": dl})
            return {
                "status": "verified" if result.get("result") else "failed",
                "dl_number": dl,
                "holder_name": result.get("result", {}).get("name", ""),
                "vehicle_class": result.get("result", {}).get("vehicleClass", []),
                "verified_at": datetime.now(timezone.utc).isoformat(),
                "mode": "live",
            }
        except Exception as e:
            logger.error(f"Signzy DL call failed: {e}")
            return {"status": "error", "message": f"Signzy API error: {str(e)}"}

    is_valid = secrets.randbelow(10) < 8
    return {
        "status": "verified" if is_valid else "failed",
        "dl_number": dl,
        "holder_name": "DEMO DL HOLDER" if is_valid else "",
        "vehicle_class": ["LMV", "MCWG"] if is_valid else [],
        "verified_at": datetime.now(timezone.utc).isoformat(),
        "mode": "demo",
    }


# ─── Helpers ────────────────────────────────────────────────────────────

def _name_match(submitted: str | None, api_name: str) -> bool | None:
    if not submitted or not api_name:
        return None
    return submitted.upper().strip() in api_name.upper() or api_name.upper() in submitted.upper().strip()


def get_service_status() -> dict:
    return {
        "signzy": {
            "mode": "demo" if DEMO_MODE else "live",
            "base_url": SIGNZY_BASE_URL,
            "api_key_configured": not DEMO_MODE,
        }
    }
