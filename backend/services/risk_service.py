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


def build_risk_update(new_risk_score: int, current_cdd_status: str | None = None) -> dict:
    """Return a dict of fields to $set on the customer document after risk changes."""
    from server import auto_assign_cdd_tier

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
