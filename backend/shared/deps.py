"""
Dependency injection module for route files.
Centralises access to db, auth, and audit logging so routes never import from server.py.
"""
from fastapi import Request
from datetime import datetime, timezone


# Late-bound references — set by server.py at startup
_db = None
_log_audit_fn = None


def init(db_ref, log_audit_ref):
    """Called once by server.py after db is ready."""
    global _db, _log_audit_fn
    _db = db_ref
    _log_audit_fn = log_audit_ref


def get_db():
    """Return the Motor database instance."""
    if _db is None:
        raise RuntimeError("shared.deps not initialised — call deps.init() first")
    return _db


async def get_current_user(request: Request):
    """Validate JWT/cookie and return user dict. Delegates to auth.py."""
    from auth import get_current_user as _auth_get_user
    db = get_db()
    return await _auth_get_user(request, db)


async def log_audit(tenant_id, user, action_type, module, record_id, details, request):
    """Append an immutable audit-log entry."""
    if _log_audit_fn is not None:
        await _log_audit_fn(tenant_id, user, action_type, module, record_id, details, request)
    else:
        db = get_db()
        ip = request.headers.get("x-forwarded-for", request.client.host if request.client else "unknown")
        await db.audit_logs.insert_one({
            "tenant_id": tenant_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "user_id": user.get("id", "system"),
            "user_name": user.get("name", "System"),
            "user_role": user.get("role", "system"),
            "ip_address": ip,
            "action_type": action_type,
            "module": module,
            "record_id": record_id,
            "details": details,
        })
