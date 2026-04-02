"""
OpenSanctions AML/Sanctions Screening Service.
Calls real OpenSanctions API when OPENSANCTIONS_API_KEY is set,
otherwise returns realistic mock data for demo/testing.
"""
import os
import secrets
import uuid
import httpx
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

OPENSANCTIONS_API_KEY = os.environ.get("OPENSANCTIONS_API_KEY", "")
OPENSANCTIONS_BASE_URL = os.environ.get("OPENSANCTIONS_BASE_URL", "https://api.opensanctions.org")

DEMO_MODE = not bool(OPENSANCTIONS_API_KEY)

# FATF high-risk and monitored jurisdictions (2025-2026)
FATF_HIGH_RISK_COUNTRIES = {
    "KP", "IR", "MM",  # High-risk
    "SY", "YE", "AF",  # Under monitoring
    "BF", "CM", "CD", "HT", "KE", "ML", "MZ", "NG", "PH",
    "SN", "SS", "TZ", "VN", "ZA",  # Monitored
}


def _headers():
    h = {"Content-Type": "application/json"}
    if OPENSANCTIONS_API_KEY:
        h["Authorization"] = f"ApiKey {OPENSANCTIONS_API_KEY}"
    return h


async def screen_individual(name: str, date_of_birth: str = None, nationality: str = None) -> dict:
    """Screen an individual against sanctions/PEP lists."""
    if not DEMO_MODE:
        try:
            props = {"name": [name]}
            if date_of_birth:
                props["birthDate"] = [date_of_birth]
            if nationality:
                props["nationality"] = [nationality]

            payload = {"queries": {"q1": {"schema": "Person", "properties": props}}}

            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(
                    f"{OPENSANCTIONS_BASE_URL}/match/default",
                    json=payload,
                    headers=_headers(),
                )
                resp.raise_for_status()
                data = resp.json()

            results = data.get("responses", {}).get("q1", {}).get("results", [])
            matched = []
            for r in results:
                score = r.get("score", 0)
                props = r.get("properties", {})
                matched.append({
                    "entity_id": r.get("id", ""),
                    "name": (props.get("name") or [""])[0],
                    "score": round(score, 2),
                    "datasets": r.get("datasets", []),
                    "topics": props.get("topics", []),
                    "countries": props.get("country", []),
                })

            top_score = max((m["score"] for m in matched), default=0)
            risk_level = "HIGH" if top_score > 0.8 else "MEDIUM" if top_score > 0.5 else "LOW"
            has_pep = any("role.pep" in m.get("topics", []) for m in matched)
            has_sanction = any("sanction" in m.get("topics", []) for m in matched)

            return {
                "status": "completed",
                "screening_id": str(uuid.uuid4()),
                "screened_name": name,
                "match_count": len(matched),
                "top_score": top_score,
                "risk_level": risk_level,
                "has_pep_match": has_pep,
                "has_sanction_match": has_sanction,
                "matches": matched[:10],
                "country_risk": nationality.upper() in FATF_HIGH_RISK_COUNTRIES if nationality else False,
                "screened_at": datetime.now(timezone.utc).isoformat(),
                "mode": "live",
            }
        except Exception as e:
            logger.error(f"OpenSanctions API error: {e}")
            return {"status": "error", "message": f"OpenSanctions API error: {str(e)}"}

    # ─── Mock response ──────────────────────────────────────────────
    has_match = secrets.randbelow(10) < 3  # 30% chance
    mock_matches = []
    if has_match:
        num = 1 + secrets.randbelow(2)
        sanctions_lists = [
            "OFAC SDN", "EU Financial Sanctions", "UN Consolidated",
            "UK HM Treasury", "OpenSanctions PEP Dataset",
        ]
        topic_options = [["sanction"], ["role.pep"], ["sanction", "role.pep"], ["crime"]]
        for _ in range(num):
            score = round(0.5 + secrets.randbelow(50) / 100, 2)
            mock_matches.append({
                "entity_id": f"Q{secrets.randbelow(999999)}",
                "name": name,
                "score": score,
                "datasets": [sanctions_lists[secrets.randbelow(len(sanctions_lists))]],
                "topics": topic_options[secrets.randbelow(len(topic_options))],
                "countries": [nationality or "US"],
            })

    top_score = max((m["score"] for m in mock_matches), default=0)
    risk_level = "HIGH" if top_score > 0.8 else "MEDIUM" if top_score > 0.5 else "LOW"
    has_pep = any("role.pep" in m.get("topics", []) for m in mock_matches)
    has_sanction = any("sanction" in m.get("topics", []) for m in mock_matches)
    country_risk = nationality and nationality.upper() in FATF_HIGH_RISK_COUNTRIES

    return {
        "status": "completed",
        "screening_id": str(uuid.uuid4()),
        "screened_name": name,
        "match_count": len(mock_matches),
        "top_score": top_score,
        "risk_level": risk_level,
        "has_pep_match": has_pep,
        "has_sanction_match": has_sanction,
        "matches": mock_matches,
        "country_risk": bool(country_risk),
        "screened_at": datetime.now(timezone.utc).isoformat(),
        "mode": "demo",
    }


async def screen_batch(individuals: list) -> dict:
    """Screen a batch of individuals (max 50)."""
    batch = individuals[:50]
    results = []
    summary = {"total": len(batch), "high": 0, "medium": 0, "low": 0, "errors": 0}

    for person in batch:
        result = await screen_individual(
            name=person.get("name", ""),
            date_of_birth=person.get("dateOfBirth"),
            nationality=person.get("nationality"),
        )
        if result["status"] == "error":
            summary["errors"] += 1
        else:
            level = result["risk_level"]
            if level == "HIGH":
                summary["high"] += 1
            elif level == "MEDIUM":
                summary["medium"] += 1
            else:
                summary["low"] += 1
        results.append(result)

    return {
        "batch_id": str(uuid.uuid4()),
        "summary": summary,
        "results": results,
        "completed_at": datetime.now(timezone.utc).isoformat(),
        "mode": "demo" if DEMO_MODE else "live",
    }


def get_country_risk(country_code: str) -> bool:
    return country_code.upper() in FATF_HIGH_RISK_COUNTRIES if country_code else False


def get_service_status() -> dict:
    return {
        "opensanctions": {
            "mode": "demo" if DEMO_MODE else "live",
            "base_url": OPENSANCTIONS_BASE_URL,
            "api_key_configured": not DEMO_MODE,
        }
    }
