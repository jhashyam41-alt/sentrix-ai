import os
import jwt
import bcrypt
import pyotp
import qrcode
from io import BytesIO
import base64
import secrets
import json
from datetime import datetime, timezone, timedelta
from fastapi import HTTPException, Request, Depends
from typing import Optional
from bson import ObjectId

JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 15
REFRESH_TOKEN_EXPIRE_DAYS = 7

def get_jwt_secret() -> str:
    return os.environ.get("JWT_SECRET", "default-secret-key")

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False

def create_access_token(user_id: str, email: str, tenant_id: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "tenant_id": tenant_id,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
        "type": "access"
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
        "type": "refresh"
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def create_temp_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=5),
        "type": "temp"
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request, db) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        user["_id"] = str(user["_id"])
        user.pop("password_hash", None)
        user.pop("totp_secret", None)
        user.pop("backup_codes", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

class TOTPService:
    def __init__(self, issuer_name: str = "AMLGuard"):
        self.issuer_name = issuer_name
    
    def generate_secret(self) -> str:
        return pyotp.random_base32()
    
    def get_totp(self, secret: str) -> pyotp.TOTP:
        return pyotp.TOTP(secret, issuer_name=self.issuer_name)
    
    def generate_qr_code(self, email: str, secret: str) -> str:
        totp = self.get_totp(secret)
        uri = totp.provisioning_uri(name=email, issuer_name=self.issuer_name)
        
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(uri)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        img_str = base64.b64encode(buffer.getvalue()).decode()
        
        return f"data:image/png;base64,{img_str}"
    
    def verify_totp(self, secret: str, token: str) -> bool:
        totp = self.get_totp(secret)
        return totp.verify(token, valid_window=1)
    
    def generate_backup_codes(self, count: int = 10) -> list[str]:
        return [secrets.token_hex(4).upper() for _ in range(count)]
    
    def hash_backup_code(self, code: str) -> str:
        return hash_password(code)
    
    def verify_backup_code(self, code: str, hashed: str) -> bool:
        return verify_password(code, hashed)
    
    def get_hashed_backup_codes(self, codes: list[str]) -> str:
        hashed_codes = [self.hash_backup_code(code) for code in codes]
        return json.dumps(hashed_codes)

totp_service = TOTPService()

def validate_password(password: str) -> bool:
    if len(password) < 12:
        return False
    if not any(c.isupper() for c in password):
        return False
    if not any(c.isdigit() for c in password):
        return False
    if not any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in password):
        return False
    return True

async def check_permission(user: dict, required_roles: list[str]) -> bool:
    return user.get("role") in required_roles