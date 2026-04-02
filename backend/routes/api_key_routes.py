"""
API Key Management Routes — admin can create/revoke/list API keys for clients.
"""
from fastapi import APIRouter, HTTPException, Request
from datetime import datetime, timezone
import uuid
import secrets

router = APIRouter(prefix="/api/api-keys", tags=["API Keys"])


async def _get_deps(request: Request):
    from shared.deps import get_current_user, get_db, log_audit
    user = await get_current_user(request)
    if user["role"] != "super_admin":
        raise HTTPException(403, "Only super admins can manage API keys")
    return get_db(), user, log_audit


@router.get("")
async def list_api_keys(request: Request):
    db, user, _ = await _get_deps(request)
    keys = await db.api_keys.find(
        {"tenant_id": user["tenant_id"]}, {"_id": 0, "secret_hash": 0}
    ).sort("created_at", -1).to_list(100)
    return {"api_keys": keys}


@router.post("")
async def create_api_key(data: dict, request: Request):
    db, user, log_audit = await _get_deps(request)

    client_name = data.get("client_name", "").strip()
    if not client_name:
        raise HTTPException(400, "client_name is required")

    api_key = f"sk_{'test' if True else 'live'}_{secrets.token_hex(24)}"
    secret_key = secrets.token_hex(32)

    doc = {
        "id": str(uuid.uuid4()),
        "tenant_id": user["tenant_id"],
        "client_name": client_name,
        "api_key": api_key,
        "secret_hash": secret_key,  # In prod, hash this
        "is_active": True,
        "rate_limit_per_minute": data.get("rate_limit", 60),
        "webhook_url": data.get("webhook_url"),
        "created_by": user["id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.api_keys.insert_one(doc)

    await log_audit(user["tenant_id"], user, "api_key_created", "api_keys", doc["id"], {"client_name": client_name}, request)

    return {
        "message": "API key created",
        "api_key": api_key,
        "secret_key": secret_key,
        "client_name": client_name,
        "id": doc["id"],
    }


@router.put("/{key_id}/revoke")
async def revoke_api_key(key_id: str, request: Request):
    db, user, log_audit = await _get_deps(request)

    result = await db.api_keys.update_one(
        {"id": key_id, "tenant_id": user["tenant_id"]},
        {"$set": {"is_active": False, "revoked_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.modified_count == 0:
        raise HTTPException(404, "API key not found")

    await log_audit(user["tenant_id"], user, "api_key_revoked", "api_keys", key_id, {}, request)
    return {"message": "API key revoked"}


@router.get("/usage")
async def get_api_usage(request: Request):
    """Get API call stats for current tenant."""
    db, user, _ = await _get_deps(request)

    # Get all keys for tenant
    keys = await db.api_keys.find({"tenant_id": user["tenant_id"]}, {"_id": 0, "id": 1, "client_name": 1}).to_list(50)
    key_ids = [k["id"] for k in keys]

    # Get call counts
    pipeline = [
        {"$match": {"client_id": {"$in": key_ids}}},
        {"$group": {
            "_id": {"client_id": "$client_id", "endpoint": "$endpoint"},
            "count": {"$sum": 1},
            "avg_response_ms": {"$avg": "$response_time_ms"},
        }},
    ]
    stats = await db.api_call_logs.aggregate(pipeline).to_list(200)

    # Total calls today
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    today_count = await db.api_call_logs.count_documents({
        "client_id": {"$in": key_ids},
        "timestamp": {"$gte": today}
    })

    total = await db.api_call_logs.count_documents({"client_id": {"$in": key_ids}})

    return {
        "total_calls": total,
        "today_calls": today_count,
        "active_keys": len([k for k in keys]),
        "endpoint_stats": stats,
    }


@router.get("/integration-status")
async def get_integration_status(request: Request):
    """Show status of all external integrations."""
    await _get_deps(request)  # auth check
    from services.signzy_service import get_service_status as signzy_status
    from services.opensanctions_service import get_service_status as os_status

    return {
        **signzy_status(),
        **os_status(),
    }
