"""
OpenSanctions screening service (MOCK / LIVE).
Provides sanctions, PEP, and adverse media screening against OpenSanctions data.
"""
import os
import random
import uuid
import hashlib
from datetime import datetime, timezone

DEMO_MODE = not os.environ.get("OPENSANCTIONS_API_KEY")
BASE_URL = os.environ.get("OPENSANCTIONS_BASE_URL", "https://api.opensanctions.org")

# FATF high-risk & monitored jurisdictions
FATF_HIGH_RISK = {
    "KP", "IR", "MM", "SY", "YE", "AF",
    "AL", "BB", "BF", "CM", "CD", "GI", "HT", "JM",
    "JO", "ML", "MZ", "NI", "PK", "PA", "PH",
    "SN", "SS", "TZ", "TR", "UG", "VN",
}

# Curated demo matches for realistic data
_DEMO_MATCHES = [
    {
        "id": "NK-SANCTIONS-001",
        "caption": "Kim Jong Un",
        "schema_type": "Person",
        "score": 0.45,
        "datasets": ["us_ofac_sdn", "un_sc_sanctions"],
        "topics": ["sanction"],
        "properties": {"nationality": ["KP"], "birthDate": ["1984-01-08"]},
    },
    {
        "id": "PEP-RU-002",
        "caption": "Vladimir Putin",
        "schema_type": "Person",
        "score": 0.38,
        "datasets": ["ru_acf_bribetakers", "every_politician"],
        "topics": ["role.pep"],
        "properties": {"nationality": ["RU"], "position": ["President of Russia"]},
    },
    {
        "id": "MEDIA-UK-003",
        "caption": "Robert Maxwell",
        "schema_type": "Person",
        "score": 0.32,
        "datasets": ["icij_offshoreleaks"],
        "topics": ["crime.fin"],
        "properties": {"nationality": ["GB"]},
    },
]


def get_country_risk(country_code: str) -> bool:
    """Check if a country code is FATF high-risk / monitored."""
    return (country_code or "").upper() in FATF_HIGH_RISK


async def screen_individual(name: str, date_of_birth: str = None, nationality: str = None) -> dict:
    """Screen an individual against sanctions / PEP / adverse media lists."""
    if DEMO_MODE:
        return _build_demo_result(name, date_of_birth, nationality)

    return await _live_screen(name, date_of_birth, nationality)


def _build_demo_result(name: str, dob: str = None, nationality: str = None) -> dict:
    """Construct a realistic demo screening result."""
    seed = int(hashlib.sha256(name.lower().encode()).hexdigest()[:8], 16)
    rng = random.Random(seed)

    has_match = rng.random() < 0.3
    matches = _pick_demo_matches(rng) if has_match else []
    top_score = max((m["score"] for m in matches), default=0)

    has_sanction = any("sanction" in m.get("topics", []) for m in matches)
    has_pep = any("role.pep" in m.get("topics", []) for m in matches)

    risk_level = _derive_risk_level(has_sanction, has_pep, nationality)
    country_flag = get_country_risk(nationality or "")

    return {
        "screening_id": f"scr_{uuid.uuid4().hex[:12]}",
        "screened_name": name,
        "date_of_birth": dob,
        "nationality": nationality,
        "total_matches": len(matches),
        "has_sanction_match": has_sanction,
        "has_pep_match": has_pep,
        "risk_level": risk_level,
        "top_score": top_score,
        "matches": matches,
        "country_risk": country_flag,
        "screened_at": datetime.now(timezone.utc).isoformat(),
        "mode": "demo",
    }


def _pick_demo_matches(rng: random.Random) -> list:
    count = rng.randint(1, min(3, len(_DEMO_MATCHES)))
    return [
        {**m, "score": round(rng.uniform(0.3, 0.95), 2)}
        for m in rng.sample(_DEMO_MATCHES, count)
    ]


def _derive_risk_level(has_sanction: bool, has_pep: bool, nationality: str | None) -> str:
    if has_sanction:
        return "HIGH"
    if has_pep:
        return "MEDIUM"
    if nationality and get_country_risk(nationality):
        return "MEDIUM"
    return "LOW"


async def _live_screen(name: str, dob: str = None, nationality: str = None) -> dict:
    """Call the real OpenSanctions /match API."""
    import httpx

    api_key = os.environ.get("OPENSANCTIONS_API_KEY", "")
    params = {"api_key": api_key}
    payload = {
        "schema": "Person",
        "properties": {"name": [name]},
    }
    if dob:
        payload["properties"]["birthDate"] = [dob]
    if nationality:
        payload["properties"]["nationality"] = [nationality]

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(f"{BASE_URL}/match/default", params=params, json=payload)
        resp.raise_for_status()
        data = resp.json()

    matches = _parse_live_matches(data)
    top_score = max((m["score"] for m in matches), default=0)
    has_sanction = any("sanction" in m.get("topics", []) for m in matches)
    has_pep = any("role.pep" in m.get("topics", []) for m in matches)
    risk_level = _derive_risk_level(has_sanction, has_pep, nationality)

    return {
        "screening_id": f"scr_{uuid.uuid4().hex[:12]}",
        "screened_name": name,
        "date_of_birth": dob,
        "nationality": nationality,
        "total_matches": len(matches),
        "has_sanction_match": has_sanction,
        "has_pep_match": has_pep,
        "risk_level": risk_level,
        "top_score": top_score,
        "matches": matches,
        "country_risk": get_country_risk(nationality or ""),
        "screened_at": datetime.now(timezone.utc).isoformat(),
        "mode": "live",
    }


def _parse_live_matches(data: dict) -> list:
    return [
        {
            "id": r.get("id"),
            "caption": r.get("caption"),
            "schema_type": r.get("schema"),
            "score": r.get("score", 0),
            "datasets": r.get("datasets", []),
            "topics": r.get("topics", []),
            "properties": {
                "nationality": r.get("properties", {}).get("nationality", []),
                "birthDate": r.get("properties", {}).get("birthDate", []),
            },
        }
        for r in data.get("results", [])
        if r.get("score", 0) >= 0.3
    ]


async def screen_batch(individuals: list) -> dict:
    """Screen multiple individuals in batch mode."""
    results = []
    for ind in individuals:
        name = ind.get("name", "")
        dob = ind.get("dateOfBirth")
        nationality = ind.get("nationality")
        result = await screen_individual(name, dob, nationality)
        results.append(result)

    high = sum(1 for r in results if r.get("risk_level") == "HIGH")
    medium = sum(1 for r in results if r.get("risk_level") == "MEDIUM")
    low = sum(1 for r in results if r.get("risk_level") == "LOW")

    return {
        "batch_id": f"batch_{uuid.uuid4().hex[:12]}",
        "summary": {
            "total": len(individuals),
            "high": high,
            "medium": medium,
            "low": low,
        },
        "results": results,
        "screened_at": datetime.now(timezone.utc).isoformat(),
        "mode": "demo" if DEMO_MODE else "live",
    }


def get_service_status() -> dict:
    return {
        "opensanctions": {
            "mode": "live" if not DEMO_MODE else "demo",
            "base_url": BASE_URL,
            "api_key_configured": not DEMO_MODE,
        }
    }
