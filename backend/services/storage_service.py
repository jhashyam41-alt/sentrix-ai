import os
import requests
import uuid
from typing import Tuple

STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
APP_NAME = "rudrik"

storage_key = None

def init_storage():
    global storage_key
    if storage_key:
        return storage_key
    
    emergent_key = os.environ.get("EMERGENT_LLM_KEY")
    if not emergent_key:
        raise Exception("EMERGENT_LLM_KEY not found in environment")
    
    try:
        resp = requests.post(
            f"{STORAGE_URL}/init",
            json={"emergent_key": emergent_key},
            timeout=30
        )
        resp.raise_for_status()
        storage_key = resp.json()["storage_key"]
        return storage_key
    except Exception as e:
        raise Exception(f"Storage init failed: {e}")

def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data,
        timeout=120
    )
    resp.raise_for_status()
    return resp.json()

def get_object(path: str) -> Tuple[bytes, str]:
    key = init_storage()
    resp = requests.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key},
        timeout=60
    )
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")

def generate_upload_path(user_id: str, filename: str) -> str:
    ext = filename.split(".")[-1] if "." in filename else "bin"
    return f"{APP_NAME}/uploads/{user_id}/{uuid.uuid4()}.{ext}"
