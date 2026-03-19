from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer
from fastapi.responses import StreamingResponse
from motor.motor_asyncio import AsyncIOMotorClient
from starlette.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone, timedelta
from bson import ObjectId
import bcrypt
import jwt
import io
import csv
import qrcode
import base64
import os
import logging
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'c4k-inventory-secret-2025-change-in-prod')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 8

mongo_url = os.environ['MONGO_URL']
db_name = os.environ['DB_NAME']
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

app = FastAPI(title="C4K Inventory API")
api_router = APIRouter(prefix="/api")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ── helpers ──────────────────────────────────────────────────────────────────

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
    except Exception:
        return False

def create_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    to_encode["exp"] = expire
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired. Please log in again.")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

def doc_to_dict(doc: dict) -> dict:
    if not doc:
        return None
    result = dict(doc)
    result['id'] = str(result.pop('_id'))
    return result

async def get_admin_user(current_user=Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


# ── models ────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    username: str
    password: str

class ChangePasswordRequest(BaseModel):
    new_password: str
    confirm_password: str

class StatusUpdate(BaseModel):
    status: str

class CreateUserRequest(BaseModel):
    username: str
    initial_password: str
    role: Optional[str] = "technician"

class ResetUserPasswordRequest(BaseModel):
    new_password: str

class ComputerData(BaseModel):
    serial_no: str
    recipient_name: Optional[str] = ""
    parent_name: Optional[str] = ""
    school: Optional[str] = ""
    school_id: Optional[str] = ""
    address: Optional[str] = ""
    city: Optional[str] = ""
    state: Optional[str] = ""
    zip_code: Optional[str] = ""
    phone: Optional[str] = ""
    os_win10: Optional[bool] = False
    os_win11: Optional[bool] = False
    os_home: Optional[bool] = False
    os_pro: Optional[bool] = False
    os_activated: Optional[bool] = False
    opendns_preferred: Optional[bool] = False
    opendns_alternate: Optional[bool] = False
    program_firefox: Optional[bool] = False
    program_chrome: Optional[bool] = False
    program_avira: Optional[bool] = False
    program_libre_office: Optional[bool] = False
    program_cd_burner_xp: Optional[bool] = False
    program_java: Optional[bool] = False
    program_vlc_player: Optional[bool] = False
    desktop_computer: Optional[bool] = False
    laptop_computer: Optional[bool] = False
    manufacturer: Optional[str] = ""
    cpu_cores: Optional[str] = ""
    cpu_speed: Optional[str] = ""
    cpu_name: Optional[str] = ""
    touch_screen_yes: Optional[bool] = False
    touch_screen_no: Optional[bool] = False
    imaged_by: Optional[str] = ""
    reviewed_by: Optional[str] = ""
    delivered_by: Optional[str] = ""
    modal: Optional[str] = ""
    ram: Optional[str] = ""
    storage_hdd: Optional[bool] = False
    storage_ssd: Optional[bool] = False
    storage_size: Optional[str] = ""
    bios_version: Optional[str] = ""
    special_features: Optional[str] = ""
    date_imaged: Optional[str] = ""
    date_reviewed: Optional[str] = ""
    date_delivered: Optional[str] = ""
    oig_1_1: Optional[bool] = False
    oig_2_1: Optional[bool] = False
    oig_2_2: Optional[bool] = False
    oig_2_3: Optional[bool] = False
    oig_2_4: Optional[bool] = False
    oig_3_1: Optional[bool] = False
    oig_3_2: Optional[bool] = False
    oig_3_3: Optional[bool] = False
    oig_3_4: Optional[bool] = False
    oig_3_5: Optional[bool] = False
    oig_3_6: Optional[bool] = False
    oig_3_7: Optional[bool] = False
    inventory_status: Optional[str] = "Processing"


# ── auth routes ───────────────────────────────────────────────────────────────

@api_router.post("/auth/login")
async def login(data: LoginRequest):
    user = await db.users.find_one({"username": data.username})
    if not user or not verify_password(data.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    token = create_token({"sub": str(user["_id"]), "username": user["username"]})
    return {
        "access_token": token,
        "token_type": "bearer",
        "must_change_password": user.get("must_change_password", False),
        "username": user["username"],
        "role": user.get("role", "admin"),
    }

@api_router.post("/auth/change-password")
async def change_password(data: ChangePasswordRequest, current_user=Depends(get_current_user)):
    if data.new_password != data.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")
    if len(data.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters long")
    hashed = hash_password(data.new_password)
    await db.users.update_one(
        {"_id": current_user["_id"]},
        {"$set": {"hashed_password": hashed, "must_change_password": False}}
    )
    return {"message": "Password changed successfully"}

@api_router.get("/auth/me")
async def get_me(current_user=Depends(get_current_user)):
    return {
        "username": current_user["username"],
        "role": current_user.get("role", "admin"),
        "must_change_password": current_user.get("must_change_password", False),
    }


# ── computer routes ───────────────────────────────────────────────────────────

@api_router.get("/computers")
async def list_computers(current_user=Depends(get_current_user)):
    computers = await db.computers.find({}).sort("created_at", -1).to_list(1000)
    return [doc_to_dict(c) for c in computers]

@api_router.post("/computers", status_code=201)
async def create_computer(data: ComputerData, current_user=Depends(get_current_user)):
    existing = await db.computers.find_one({"serial_no": data.serial_no})
    if existing:
        raise HTTPException(status_code=409, detail=f"Serial No. '{data.serial_no}' already exists")
    now = datetime.now(timezone.utc).isoformat()
    doc = data.model_dump()
    doc["created_at"] = now
    doc["updated_at"] = now
    doc["created_by"] = current_user["username"]
    result = await db.computers.insert_one(doc)
    created = await db.computers.find_one({"_id": result.inserted_id})
    return doc_to_dict(created)

@api_router.get("/computers/{serial_no}")
async def get_computer(serial_no: str, current_user=Depends(get_current_user)):
    doc = await db.computers.find_one({"serial_no": serial_no})
    if not doc:
        raise HTTPException(status_code=404, detail="Computer not found")
    return doc_to_dict(doc)

@api_router.put("/computers/{serial_no}")
async def update_computer(serial_no: str, data: ComputerData, current_user=Depends(get_current_user)):
    existing = await db.computers.find_one({"serial_no": serial_no})
    if not existing:
        raise HTTPException(status_code=404, detail="Computer not found")
    restricted = ["Donated", "Sold"]
    if current_user.get("role") != "admin" and data.inventory_status in restricted:
        raise HTTPException(status_code=403, detail="Only admins can set status to Donated or Sold")
    update_doc = data.model_dump()
    update_doc["updated_at"] = datetime.now(timezone.utc).isoformat()
    update_doc["updated_by"] = current_user["username"]
    update_doc["created_at"] = existing.get("created_at", update_doc["updated_at"])
    update_doc["created_by"] = existing.get("created_by", current_user["username"])
    await db.computers.update_one({"serial_no": serial_no}, {"$set": update_doc})
    updated = await db.computers.find_one({"serial_no": serial_no})
    return doc_to_dict(updated)

@api_router.patch("/computers/{serial_no}/status")
async def update_status(serial_no: str, data: StatusUpdate, current_user=Depends(get_current_user)):
    valid = ["Processing", "In Stock", "Donated", "Sold", "Pending Review", "Pending Delivery"]
    if data.status not in valid:
        raise HTTPException(status_code=400, detail="Invalid status")
    restricted = ["Donated", "Sold"]
    if current_user.get("role") != "admin" and data.status in restricted:
        raise HTTPException(status_code=403, detail="Only admins can set status to Donated or Sold")
    result = await db.computers.update_one(
        {"serial_no": serial_no},
        {"$set": {"inventory_status": data.status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Computer not found")
    return {"message": "Status updated", "status": data.status}

@api_router.delete("/computers/{serial_no}")
async def delete_computer(serial_no: str, current_user=Depends(get_current_user)):
    result = await db.computers.delete_one({"serial_no": serial_no})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Computer not found")
    return {"message": "Deleted successfully"}


# ── admin user management ─────────────────────────────────────────────────────

def user_to_dict(user: dict) -> dict:
    return {
        "id": str(user["_id"]),
        "username": user["username"],
        "role": user.get("role", "technician"),
        "must_change_password": user.get("must_change_password", False),
        "created_at": user.get("created_at", ""),
    }

@api_router.get("/admin/users")
async def list_users(admin=Depends(get_admin_user)):
    users = await db.users.find({}).sort("created_at", 1).to_list(500)
    return [user_to_dict(u) for u in users]

@api_router.post("/admin/users", status_code=201)
async def create_user(data: CreateUserRequest, admin=Depends(get_admin_user)):
    if len(data.username.strip()) < 3:
        raise HTTPException(status_code=400, detail="Username must be at least 3 characters")
    if len(data.initial_password) < 8:
        raise HTTPException(status_code=400, detail="Initial password must be at least 8 characters")
    existing = await db.users.find_one({"username": data.username.strip().lower()})
    if existing:
        raise HTTPException(status_code=409, detail=f"Username '{data.username}' already exists")
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "username": data.username.strip().lower(),
        "hashed_password": hash_password(data.initial_password),
        "role": data.role if data.role in ["admin", "technician"] else "technician",
        "must_change_password": True,
        "created_at": now,
    }
    result = await db.users.insert_one(doc)
    created = await db.users.find_one({"_id": result.inserted_id})
    return user_to_dict(created)

@api_router.put("/admin/users/{username}/reset-password")
async def reset_user_password(username: str, data: ResetUserPasswordRequest, admin=Depends(get_admin_user)):
    if len(data.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    result = await db.users.update_one(
        {"username": username},
        {"$set": {"hashed_password": hash_password(data.new_password), "must_change_password": True}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": f"Password reset for '{username}'. User must change on next login."}

@api_router.delete("/admin/users/{username}")
async def delete_user(username: str, admin=Depends(get_admin_user)):
    if username == admin["username"]:
        raise HTTPException(status_code=400, detail="You cannot delete your own account")
    result = await db.users.delete_one({"username": username})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": f"User '{username}' deleted successfully"}


# ── qr code ───────────────────────────────────────────────────────────────────

@api_router.get("/computers/{serial_no}/qr")
async def generate_qr(serial_no: str, current_user=Depends(get_current_user)):
    qr = qrcode.QRCode(version=1, box_size=8, border=4)
    qr.add_data(serial_no)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    buf.seek(0)
    img_b64 = base64.b64encode(buf.read()).decode('utf-8')
    return {"qr_code": f"data:image/png;base64,{img_b64}", "serial_no": serial_no}


# ── csv export ────────────────────────────────────────────────────────────────

@api_router.get("/export/csv")
async def export_csv(current_user=Depends(get_current_user)):
    computers = await db.computers.find({}).sort("created_at", -1).to_list(1000)
    output = io.StringIO()
    fieldnames = [
        "serial_no", "inventory_status", "recipient_name", "parent_name",
        "school", "school_id", "address", "city", "state", "zip_code", "phone",
        "os_win10", "os_win11", "os_home", "os_pro", "os_activated",
        "opendns_preferred", "opendns_alternate",
        "program_firefox", "program_chrome", "program_avira", "program_libre_office",
        "program_cd_burner_xp", "program_java", "program_vlc_player",
        "desktop_computer", "laptop_computer", "manufacturer", "modal",
        "cpu_name", "cpu_cores", "cpu_speed", "ram", "storage_size",
        "storage_hdd", "storage_ssd", "bios_version", "special_features",
        "touch_screen_yes", "touch_screen_no",
        "imaged_by", "date_imaged", "reviewed_by", "date_reviewed",
        "delivered_by", "date_delivered",
        "oig_1_1", "oig_2_1", "oig_2_2", "oig_2_3", "oig_2_4",
        "oig_3_1", "oig_3_2", "oig_3_3", "oig_3_4", "oig_3_5", "oig_3_6", "oig_3_7",
        "created_at", "updated_at", "created_by",
    ]
    writer = csv.DictWriter(output, fieldnames=fieldnames, extrasaction='ignore')
    writer.writeheader()
    for comp in computers:
        row = {k: comp.get(k, '') for k in fieldnames}
        writer.writerow(row)
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=c4k_inventory.csv"},
    )


# ── startup ───────────────────────────────────────────────────────────────────

app.include_router(api_router)


@app.on_event("startup")
async def startup():
    existing = await db.users.find_one({"username": "admin"})
    if not existing:
        await db.users.insert_one({
            "username": "admin",
            "hashed_password": hash_password("admin"),
            "role": "admin",
            "must_change_password": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        logger.info("Default admin user created (must change password on first login)")
    await db.computers.create_index("serial_no", unique=True)
    await db.users.create_index("username", unique=True)


@app.on_event("shutdown")
async def shutdown():
    client.close()
