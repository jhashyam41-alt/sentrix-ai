"""
Sanctions.io screening service.
Calls the real Sanctions.io API when a key is available, falls back to demo mode.
Supports: Sanctions (75+ lists), PEP (1M+ records), Adverse Media, Criminal Watchlists.
"""
import os
import uuid
import hashlib
import random
import httpx
import logging
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger("sanctions_io")

SANCTIONS_IO_URL = "https://api.sanctions.io/search"

# FATF high-risk & monitored jurisdictions
FATF_HIGH_RISK = {
    "KP", "IR", "MM", "SY", "YE", "AF",
    "AL", "BB", "BF", "CM", "CD", "GI", "HT", "JM",
    "JO", "ML", "MZ", "NI", "PK", "PA", "PH",
    "SN", "SS", "TZ", "TR", "UG", "VN",
}

# Demo match data for fallback
_DEMO_MATCHES = [
    {
        "id": "NK-SANCTIONS-001",
        "caption": "Kim Jong Un",
        "schema_type": "Person",
        "score": 0.45,
        "datasets": ["us_ofac_sdn", "un_sc_sanctions"],
        "topics": ["sanction"],
        "match_type": "sanction",
        "properties": {"nationality": ["KP"], "birthDate": ["1984-01-08"]},
        "list_source": "OFAC SDN / UN Security Council",
        "country": "North Korea",
    },
    {
        "id": "PEP-RU-002",
        "caption": "Vladimir Putin",
        "schema_type": "Person",
        "score": 0.38,
        "datasets": ["ru_acf_bribetakers", "every_politician"],
        "topics": ["role.pep"],
        "match_type": "pep",
        "properties": {"nationality": ["RU"], "position": ["President of Russia"]},
        "list_source": "Global PEP Database",
        "country": "Russia",
    },
    {
        "id": "MEDIA-UK-003",
        "caption": "Robert Maxwell",
        "schema_type": "Person",
        "score": 0.32,
        "datasets": ["icij_offshoreleaks"],
        "topics": ["crime.fin"],
        "match_type": "adverse-media",
        "properties": {"nationality": ["GB"]},
        "list_source": "ICIJ Offshore Leaks / Media Reports",
        "country": "United Kingdom",
    },
    {
        "id": "SANC-IR-004",
        "caption": "Bank Melli Iran",
        "schema_type": "Organization",
        "score": 0.72,
        "datasets": ["eu_sanctions", "us_ofac_sdn"],
        "topics": ["sanction"],
        "match_type": "sanction",
        "properties": {"nationality": ["IR"]},
        "list_source": "EU Consolidated Sanctions / OFAC",
        "country": "Iran",
    },
    {
        "id": "PEP-IN-005",
        "caption": "Nirav Modi",
        "schema_type": "Person",
        "score": 0.55,
        "datasets": ["interpol_red_notices"],
        "topics": ["crime.fin", "wanted"],
        "match_type": "criminal",
        "properties": {"nationality": ["IN"]},
        "list_source": "Interpol Red Notices",
        "country": "India",
    },
]


def get_country_risk(country_code: str) -> bool:
    return (country_code or "").upper() in FATF_HIGH_RISK


async def screen_entity(
    name: str,
    api_key: Optional[str] = None,
    types: Optional[list] = None,
    date_of_birth: Optional[str] = None,
    nationality: Optional[str] = None,
) -> dict:
    """
    Screen an entity against Sanctions.io or fall back to demo mode.
    Returns a unified result dict regardless of mode.
    """
    if not types:
        types = ["sanction", "pep", "adverse-media"]

    if api_key:
        try:
            return await _live_screen(name, api_key, types, date_of_birth, nationality)
        except Exception as e:
            logger.warning(f"Sanctions.io API call failed, falling back to demo: {e}")
            result = _build_demo_result(name, date_of_birth, nationality, types)
            result["api_error"] = str(e)
            return result
    else:
        return _build_demo_result(name, date_of_birth, nationality, types)


async def validate_api_key(api_key: str) -> dict:
    """Validate a Sanctions.io API key by making a test search."""
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                SANCTIONS_IO_URL,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={"query": "test", "types": ["sanction"]},
            )
            if resp.status_code == 200:
                return {"valid": True, "message": "API key validated successfully"}
            elif resp.status_code == 401:
                return {"valid": False, "message": "Invalid API key"}
            elif resp.status_code == 403:
                return {"valid": False, "message": "API key lacks required permissions"}
            else:
                return {"valid": False, "message": f"API returned status {resp.status_code}"}
    except httpx.TimeoutException:
        return {"valid": False, "message": "Connection timed out — check your network"}
    except Exception as e:
        return {"valid": False, "message": f"Connection failed: {str(e)}"}


async def _live_screen(
    name: str,
    api_key: str,
    types: list,
    dob: Optional[str] = None,
    nationality: Optional[str] = None,
) -> dict:
    """Call the real Sanctions.io /search API."""
    payload = {
        "query": name,
        "types": types,
    }
    if dob:
        payload["date_of_birth"] = dob
    if nationality:
        payload["country"] = nationality

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            SANCTIONS_IO_URL,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
        )
        resp.raise_for_status()
        data = resp.json()

    matches = _parse_live_matches(data)
    top_score = max((m["score"] for m in matches), default=0)

    has_sanction = any(m.get("match_type") == "sanction" for m in matches)
    has_pep = any(m.get("match_type") == "pep" for m in matches)
    has_adverse = any(m.get("match_type") == "adverse-media" for m in matches)
    has_criminal = any(m.get("match_type") == "criminal" for m in matches)

    risk_level = _derive_risk_level(has_sanction, has_pep, has_criminal, nationality)
    country_flag = get_country_risk(nationality or "")

    return {
        "screening_id": f"scr_{uuid.uuid4().hex[:12]}",
        "screened_name": name,
        "date_of_birth": dob,
        "nationality": nationality,
        "total_matches": len(matches),
        "has_sanction_match": has_sanction,
        "has_pep_match": has_pep,
        "has_adverse_media": has_adverse,
        "has_criminal_match": has_criminal,
        "risk_level": risk_level,
        "top_score": top_score,
        "matches": matches,
        "country_risk": country_flag,
        "screened_at": datetime.now(timezone.utc).isoformat(),
        "mode": "live",
        "provider": "sanctions.io",
        "lists_checked": "75+",
    }


def _parse_live_matches(data: dict) -> list:
    """Parse Sanctions.io API response into our standard match format."""
    results = data.get("results", data.get("matches", data.get("data", [])))
    if not isinstance(results, list):
        results = []

    matches = []
    for r in results:
        score = r.get("score", r.get("match_score", r.get("relevance", 0)))
        if isinstance(score, (int, float)) and score > 100:
            score = score / 100.0
        if isinstance(score, (int, float)) and score < 1:
            score = score

        match_type = r.get("type", r.get("match_type", r.get("category", "unknown")))
        if match_type in ("sanction", "sanctions"):
            match_type = "sanction"
        elif match_type in ("pep", "PEP", "politically_exposed_person"):
            match_type = "pep"
        elif match_type in ("adverse-media", "adverse_media", "media"):
            match_type = "adverse-media"
        elif match_type in ("criminal", "crime", "watchlist"):
            match_type = "criminal"

        matches.append({
            "id": r.get("id", r.get("entity_id", str(uuid.uuid4().hex[:12]))),
            "caption": r.get("name", r.get("caption", r.get("entity_name", "Unknown"))),
            "schema_type": r.get("schema", r.get("entity_type", "Person")),
            "score": round(float(score), 2) if isinstance(score, (int, float)) else 0,
            "datasets": r.get("datasets", r.get("sources", r.get("lists", []))),
            "topics": [match_type] if match_type != "unknown" else r.get("topics", []),
            "match_type": match_type,
            "properties": {
                "nationality": r.get("properties", {}).get("nationality",
                    r.get("country", r.get("nationality", []))),
                "birthDate": r.get("properties", {}).get("birthDate",
                    r.get("date_of_birth", [])),
            },
            "list_source": ", ".join(r.get("datasets", r.get("sources", r.get("lists", ["Sanctions.io"])))),
            "country": _extract_country(r),
        })

    return matches


def _extract_country(r: dict) -> str:
    nat = r.get("country", r.get("nationality", ""))
    if isinstance(nat, list):
        return nat[0] if nat else ""
    props = r.get("properties", {})
    nat_list = props.get("nationality", props.get("country", []))
    if isinstance(nat_list, list) and nat_list:
        return nat_list[0]
    return str(nat) if nat else ""


def _derive_risk_level(
    has_sanction: bool, has_pep: bool, has_criminal: bool, nationality: Optional[str]
) -> str:
    if has_sanction or has_criminal:
        return "HIGH"
    if has_pep:
        return "MEDIUM"
    if nationality and get_country_risk(nationality):
        return "MEDIUM"
    return "LOW"


def _build_demo_result(
    name: str, dob: Optional[str], nationality: Optional[str], types: list
) -> dict:
    seed = int(hashlib.sha256(name.lower().encode()).hexdigest()[:8], 16)
    rng = random.Random(seed)

    has_match = rng.random() < 0.3
    matches = _pick_demo_matches(rng, types) if has_match else []
    top_score = max((m["score"] for m in matches), default=0)

    has_sanction = any(m.get("match_type") == "sanction" for m in matches)
    has_pep = any(m.get("match_type") == "pep" for m in matches)
    has_adverse = any(m.get("match_type") == "adverse-media" for m in matches)
    has_criminal = any(m.get("match_type") == "criminal" for m in matches)

    risk_level = _derive_risk_level(has_sanction, has_pep, has_criminal, nationality)
    country_flag = get_country_risk(nationality or "")

    return {
        "screening_id": f"scr_{uuid.uuid4().hex[:12]}",
        "screened_name": name,
        "date_of_birth": dob,
        "nationality": nationality,
        "total_matches": len(matches),
        "has_sanction_match": has_sanction,
        "has_pep_match": has_pep,
        "has_adverse_media": has_adverse,
        "has_criminal_match": has_criminal,
        "risk_level": risk_level,
        "top_score": top_score,
        "matches": matches,
        "country_risk": country_flag,
        "screened_at": datetime.now(timezone.utc).isoformat(),
        "mode": "demo",
        "provider": "demo",
        "lists_checked": "3 (demo)",
    }


def _pick_demo_matches(rng: random.Random, types: list) -> list:
    type_map = {
        "sanction": ["sanction"],
        "pep": ["pep"],
        "adverse-media": ["adverse-media"],
        "criminal": ["criminal"],
    }
    allowed_topics = set()
    for t in types:
        allowed_topics.update(type_map.get(t, [t]))

    eligible = [m for m in _DEMO_MATCHES if m.get("match_type") in allowed_topics]
    if not eligible:
        eligible = _DEMO_MATCHES

    count = rng.randint(1, min(3, len(eligible)))
    return [
        {**m, "score": round(rng.uniform(0.3, 0.95), 2)}
        for m in rng.sample(eligible, count)
    ]


def get_service_status(api_key: Optional[str] = None) -> dict:
    return {
        "sanctions_io": {
            "mode": "live" if api_key else "demo",
            "provider": "Sanctions.io",
            "api_key_configured": bool(api_key),
            "lists": "75+ sanctions lists, 1M+ PEP records, adverse media, criminal watchlists",
        }
    }
