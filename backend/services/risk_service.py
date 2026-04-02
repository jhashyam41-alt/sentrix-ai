"""
Risk scoring helpers for AMLGuard.
Centralises risk level calculation and CDD tier assignment.
"""


PEP_TIER_POINTS = {"tier1": 30, "tier2": 20, "tier3": 10, "rca": 5}


def calculate_risk_level(score: int) -> str:
    if score <= 30:
        return "low"
    if score <= 65:
        return "medium"
    return "high"


def calculate_pep_points(pep_tier: str) -> int:
    return PEP_TIER_POINTS.get(pep_tier, 0)


def auto_assign_cdd_tier(risk_score: int) -> str:
    """Assign CDD tier based on risk score."""
    if risk_score <= 30:
        return "sdd"
    if risk_score <= 65:
        return "standard_cdd"
    return "edd"


def build_risk_update(new_risk_score: int, current_cdd_status: str | None = None) -> dict:
    """Return a dict of fields to $set on the customer document after risk changes."""
    risk_level = calculate_risk_level(new_risk_score)
    cdd_tier = auto_assign_cdd_tier(new_risk_score)

    update = {
        "risk_score": new_risk_score,
        "risk_level": risk_level,
        "cdd_tier": cdd_tier,
    }

    if cdd_tier == "edd" and current_cdd_status not in ("edd_in_progress", "edd_complete"):
        update["cdd_status"] = "requires_edd"

    return update


async def calculate_v1_risk_score(db, customer_id: str) -> dict:
    """Full risk score calculation for the Public API v1 endpoint.
    Extracted from v1_routes.py to reduce route handler complexity.
    """
    from services.opensanctions_service import get_country_risk
    import uuid
    from datetime import datetime, timezone

    kyc_records = await db.kyc_verifications.find(
        {"customer_id": customer_id}, {"_id": 0}
    ).to_list(20)
    customer = await db.customers.find_one({"id": customer_id}, {"_id": 0})

    breakdown = _calculate_kyc_risk(kyc_records)
    breakdown.update(_calculate_screening_risk(customer))
    breakdown["country_risk"] = _calculate_country_risk(customer, get_country_risk)

    total = min(sum(breakdown.values()), 100)
    level = _score_to_level(total)
    recommendations = _build_recommendations(breakdown)

    return {
        "risk_score_id": str(uuid.uuid4()),
        "customer_id": customer_id,
        "risk_score": total,
        "risk_level": level,
        "breakdown": breakdown,
        "recommendations": recommendations,
        "calculated_at": datetime.now(timezone.utc).isoformat(),
    }


def _calculate_kyc_risk(kyc_records: list) -> dict:
    if not kyc_records:
        return {"kyc": 15}
    any_failed = any(r["verification_status"] == "failed" for r in kyc_records)
    return {"kyc": 30 if any_failed else 0}


def _calculate_screening_risk(customer: dict | None) -> dict:
    result = {"sanctions": 0, "pep": 0, "adverse_media": 0}
    if not customer:
        return result

    sanctions = customer.get("sanctions_status", "no_match")
    if sanctions == "potential_match":
        result["sanctions"] = 40
    elif sanctions == "unknown":
        result["sanctions"] = 10

    if customer.get("pep_status") == "match":
        result["pep"] = 20

    if customer.get("adverse_media_status") == "hits_found":
        result["adverse_media"] = 15

    return result


def _calculate_country_risk(customer: dict | None, risk_fn) -> int:
    if not customer:
        return 0
    nationality = customer.get("customer_data", {}).get("nationality", "")
    return 10 if risk_fn(nationality) else 0


def _score_to_level(total: int) -> str:
    if total <= 25:
        return "LOW"
    if total <= 50:
        return "MEDIUM"
    if total <= 75:
        return "HIGH"
    return "CRITICAL"


def _build_recommendations(breakdown: dict) -> list:
    recs = []
    if breakdown.get("kyc", 0) > 0:
        recs.append("Complete KYC verification for all documents")
    if breakdown.get("sanctions", 0) > 0:
        recs.append("Review sanctions match — may require SAR filing")
    if breakdown.get("pep", 0) > 0:
        recs.append("Enhanced due diligence recommended for PEP match")
    if breakdown.get("adverse_media", 0) > 0:
        recs.append("Review adverse media hits for relevance")
    if breakdown.get("country_risk", 0) > 0:
        recs.append("High-risk jurisdiction — apply enhanced monitoring")
    return recs
