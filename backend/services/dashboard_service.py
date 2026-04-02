"""
Dashboard stats service — extracts aggregation logic from the route handler.
"""
from datetime import datetime, timezone


async def gather_dashboard_stats(db, tenant_id: str, user_role: str) -> dict:
    """Build the full dashboard payload for a tenant."""

    total_customers = await db.customers.count_documents({"tenant_id": tenant_id})
    pending_reviews = await db.customers.count_documents({
        "tenant_id": tenant_id,
        "status": {"$in": ["submitted", "under_review"]},
    })
    high_risk = await db.customers.count_documents({
        "tenant_id": tenant_id,
        "risk_level": {"$in": ["high", "unacceptable"]},
    })
    open_cases = await db.cases.count_documents({
        "tenant_id": tenant_id,
        "status": {"$in": ["open", "in_progress", "escalated", "pending_info"]},
    })

    recent_customers = await db.customers.find(
        {"tenant_id": tenant_id}, {"_id": 0}
    ).sort("created_at", -1).limit(5).to_list(5)

    open_cases_list = await db.cases.find(
        {"tenant_id": tenant_id, "status": {"$in": ["open", "in_progress", "escalated"]}},
        {"_id": 0},
    ).sort("created_at", -1).limit(5).to_list(5)

    kyc_stats = await _kyc_stats(db, tenant_id)
    risk_distribution = await _risk_distribution(db, tenant_id)
    screening_stats = await _screening_stats(db, tenant_id)
    cdd_breakdown = await _cdd_breakdown(db, tenant_id)
    api_usage = await _api_usage(db, tenant_id) if user_role == "super_admin" else {}

    from services.signzy_service import get_service_status as signzy_status
    from services.opensanctions_service import get_service_status as os_status

    return {
        "total_customers": total_customers,
        "pending_reviews": pending_reviews,
        "high_risk_customers": high_risk,
        "open_cases": open_cases,
        "recent_customers": recent_customers,
        "open_cases_list": open_cases_list,
        "kyc_stats": kyc_stats,
        "risk_distribution": risk_distribution,
        "screening_stats": screening_stats,
        "cdd_breakdown": cdd_breakdown,
        "api_usage": api_usage,
        "integrations": {**signzy_status(), **os_status()},
    }


# ── Private helpers ───────────────────────────────────────────────────

async def _kyc_stats(db, tenant_id: str) -> dict:
    total = await db.kyc_verifications.count_documents({"tenant_id": tenant_id})
    verified = await db.kyc_verifications.count_documents({"tenant_id": tenant_id, "verification_status": "verified"})
    failed = await db.kyc_verifications.count_documents({"tenant_id": tenant_id, "verification_status": "failed"})
    return {"total": total, "verified": verified, "failed": failed}


async def _risk_distribution(db, tenant_id: str) -> dict:
    low = await db.customers.count_documents({"tenant_id": tenant_id, "risk_level": "low"})
    medium = await db.customers.count_documents({"tenant_id": tenant_id, "risk_level": "medium"})
    high = await db.customers.count_documents({"tenant_id": tenant_id, "risk_level": "high"})
    unacceptable = await db.customers.count_documents({"tenant_id": tenant_id, "risk_level": "unacceptable"})
    return {"low": low, "medium": medium, "high": high, "unacceptable": unacceptable}


async def _screening_stats(db, tenant_id: str) -> dict:
    pep = await db.customers.count_documents({"tenant_id": tenant_id, "pep_status": "match"})
    sanctions = await db.customers.count_documents({"tenant_id": tenant_id, "sanctions_status": "potential_match"})
    adverse = await db.customers.count_documents({"tenant_id": tenant_id, "adverse_media_status": "hits_found"})
    return {"pep_matches": pep, "sanctions_matches": sanctions, "adverse_media_hits": adverse}


async def _cdd_breakdown(db, tenant_id: str) -> dict:
    sdd = await db.customers.count_documents({"tenant_id": tenant_id, "cdd_tier": "sdd"})
    standard = await db.customers.count_documents({"tenant_id": tenant_id, "cdd_tier": "standard_cdd"})
    edd = await db.customers.count_documents({"tenant_id": tenant_id, "cdd_tier": "edd"})
    return {"sdd": sdd, "standard_cdd": standard, "edd": edd}


async def _api_usage(db, tenant_id: str) -> dict:
    keys = await db.api_keys.find({"tenant_id": tenant_id}, {"_id": 0, "id": 1}).to_list(50)
    key_ids = [k["id"] for k in keys]
    total_calls = await db.api_call_logs.count_documents({"client_id": {"$in": key_ids}}) if key_ids else 0
    active_keys = await db.api_keys.count_documents({"tenant_id": tenant_id, "is_active": True})
    return {"total_api_calls": total_calls, "active_api_keys": active_keys}
