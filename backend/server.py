from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal

import bcrypt
import jwt
from bson import ObjectId
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field
from starlette.middleware.cors import CORSMiddleware

from lessons_seed import CATEGORIES, build_lessons

client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = client[os.environ['DB_NAME']]

app = FastAPI()
api = APIRouter(prefix="/api")
JWT_ALG = "HS256"
CATEGORY_IDS = {c["id"] for c in CATEGORIES}


def hash_password(p: str) -> str:
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()


def verify_password(p: str, h: str) -> bool:
    return bcrypt.checkpw(p.encode(), h.encode())


def make_token(user_id: str) -> str:
    payload = {"sub": user_id, "type": "access", "exp": datetime.now(timezone.utc) + timedelta(days=7)}
    return jwt.encode(payload, os.environ["JWT_SECRET"], algorithm=JWT_ALG)


def public_user(u: dict) -> dict:
    return {
        "id": str(u["_id"]), "email": u["email"], "first_name": u.get("first_name", ""),
        "country": u.get("country", ""), "work_function": u.get("work_function", ""),
        "ai_experience": u.get("ai_experience", ""), "role": u.get("role", "learner"),
    }


async def current_user(request: Request) -> dict:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(auth[7:], os.environ["JWT_SECRET"], algorithms=[JWT_ALG])
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
    except (jwt.InvalidTokenError, Exception):
        raise HTTPException(401, "Invalid or expired session")
    if not user:
        raise HTTPException(401, "User not found")
    return user


async def admin_user(user: dict = Depends(current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(403, "Administrator access only")
    return user


Experience = Literal["Beginner", "Some experience", "Confident user"]


class ProfileIn(BaseModel):
    first_name: str = Field(min_length=1, max_length=60)
    country: str = Field(min_length=1, max_length=60)
    work_function: str = Field(min_length=1, max_length=80)
    ai_experience: Experience


class RegisterIn(ProfileIn):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class CompleteIn(BaseModel):
    quiz_answer: Optional[int] = None
    reflection: Optional[Literal["Yes", "Maybe", "Not yet"]] = None


class Question(BaseModel):
    text: str
    options: List[str] = Field(min_length=2, max_length=6)
    correct_index: int
    feedback: str


class LessonIn(BaseModel):
    title: str
    category: str
    task_label: str
    order: int
    outcome: str
    learn: str
    example: str
    exercise: str
    prompt_title: str
    prompt: str
    review: List[str]
    question: Question


# ---------- Auth ----------
@api.post("/auth/register")
async def register(body: RegisterIn):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(400, "An account with this email already exists")
    doc = body.model_dump(exclude={"password", "email"})
    doc.update(email=email, password_hash=hash_password(body.password), role="learner",
               created_at=datetime.now(timezone.utc).isoformat())
    res = await db.users.insert_one(doc)
    doc["_id"] = res.inserted_id
    return {"token": make_token(str(res.inserted_id)), "user": public_user(doc)}


@api.post("/auth/login")
async def login(body: LoginIn, request: Request):
    email = body.email.lower()
    ident = f"{request.client.host if request.client else ''}:{email}"
    attempt = await db.login_attempts.find_one({"identifier": ident})
    now = datetime.now(timezone.utc)
    if attempt and attempt.get("count", 0) >= 5 and attempt.get("locked_until", now) > now:
        raise HTTPException(429, "Too many attempts. Please try again in 15 minutes.")
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        count = (attempt or {}).get("count", 0) + 1
        await db.login_attempts.update_one(
            {"identifier": ident},
            {"$set": {"count": count, "locked_until": now + timedelta(minutes=15)}}, upsert=True)
        raise HTTPException(401, "Incorrect email or password")
    await db.login_attempts.delete_many({"identifier": ident})
    return {"token": make_token(str(user["_id"])), "user": public_user(user)}


@api.get("/auth/me")
async def me(user: dict = Depends(current_user)):
    return public_user(user)


@api.put("/profile")
async def update_profile(body: ProfileIn, user: dict = Depends(current_user)):
    await db.users.update_one({"_id": user["_id"]}, {"$set": body.model_dump()})
    return public_user(await db.users.find_one({"_id": user["_id"]}))


# ---------- Content ----------
@api.get("/categories")
async def categories():
    return CATEGORIES


@api.get("/lessons")
async def list_lessons(user: dict = Depends(current_user)):
    return await db.lessons.find({}, {"_id": 0}).sort("order", 1).to_list(100)


@api.get("/lessons/{lesson_id}")
async def get_lesson(lesson_id: str, user: dict = Depends(current_user)):
    lesson = await db.lessons.find_one({"id": lesson_id}, {"_id": 0})
    if not lesson:
        raise HTTPException(404, "Lesson not found")
    return lesson


# ---------- Progress ----------
@api.get("/progress")
async def get_progress(user: dict = Depends(current_user)):
    return await db.progress.find({"user_id": str(user["_id"])}, {"_id": 0, "user_id": 0}).to_list(100)


@api.post("/progress/{lesson_id}")
async def complete_lesson(lesson_id: str, body: CompleteIn, user: dict = Depends(current_user)):
    lesson = await db.lessons.find_one({"id": lesson_id})
    if not lesson:
        raise HTTPException(404, "Lesson not found")
    data = {"lesson_id": lesson_id, "completed_at": datetime.now(timezone.utc).isoformat()}
    if body.quiz_answer is not None:
        data["quiz_answer"] = body.quiz_answer
        data["quiz_correct"] = body.quiz_answer == lesson["question"]["correct_index"]
    if body.reflection:
        data["reflection"] = body.reflection
    await db.progress.update_one({"user_id": str(user["_id"]), "lesson_id": lesson_id},
                                 {"$set": data}, upsert=True)
    return data


# ---------- Favourites ----------
@api.get("/favourites")
async def get_favourites(user: dict = Depends(current_user)):
    docs = await db.favourites.find({"user_id": str(user["_id"])}, {"_id": 0}).to_list(100)
    return [d["lesson_id"] for d in docs]


@api.post("/favourites/{lesson_id}")
async def add_favourite(lesson_id: str, user: dict = Depends(current_user)):
    if not await db.lessons.find_one({"id": lesson_id}):
        raise HTTPException(404, "Prompt not found")
    await db.favourites.update_one({"user_id": str(user["_id"]), "lesson_id": lesson_id},
                                   {"$set": {"lesson_id": lesson_id}}, upsert=True)
    return {"ok": True}


@api.delete("/favourites/{lesson_id}")
async def remove_favourite(lesson_id: str, user: dict = Depends(current_user)):
    await db.favourites.delete_one({"user_id": str(user["_id"]), "lesson_id": lesson_id})
    return {"ok": True}


# ---------- Admin ----------
@api.put("/admin/lessons/{lesson_id}")
async def admin_update_lesson(lesson_id: str, body: LessonIn, _: dict = Depends(admin_user)):
    if body.category not in CATEGORY_IDS:
        raise HTTPException(400, "Unknown category")
    if not 0 <= body.question.correct_index < len(body.question.options):
        raise HTTPException(400, "Correct answer must match one of the options")
    res = await db.lessons.update_one({"id": lesson_id}, {"$set": body.model_dump()})
    if res.matched_count == 0:
        raise HTTPException(404, "Lesson not found")
    return await db.lessons.find_one({"id": lesson_id}, {"_id": 0})


@api.get("/admin/stats")
async def admin_stats(_: dict = Depends(admin_user)):
    users = await db.users.count_documents({"role": "learner"})
    completions = await db.progress.count_documents({})
    agg = await db.progress.aggregate([{"$group": {"_id": "$lesson_id", "count": {"$sum": 1}}}]).to_list(100)
    counts = {a["_id"]: a["count"] for a in agg}
    lessons = await db.lessons.find({}, {"_id": 0, "id": 1, "title": 1, "order": 1}).sort("order", 1).to_list(100)
    return {"registered_users": users, "lessons_completed": completions,
            "by_lesson": [{**lsn, "completions": counts.get(lsn["id"], 0)} for lsn in lessons]}


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.progress.create_index([("user_id", 1), ("lesson_id", 1)], unique=True)
    await db.favourites.create_index([("user_id", 1), ("lesson_id", 1)], unique=True)
    await db.login_attempts.create_index("identifier")
    if await db.lessons.count_documents({}) == 0:
        await db.lessons.insert_many(build_lessons())
    admin_email = os.environ["ADMIN_EMAIL"].lower()
    if not await db.users.find_one({"email": admin_email}):
        await db.users.insert_one({
            "email": admin_email, "password_hash": hash_password(os.environ["ADMIN_PASSWORD"]),
            "first_name": "Administrator", "country": "Kenya", "work_function": "Other",
            "ai_experience": "Confident user", "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat()})
    else:
        await db.users.update_one({"email": admin_email}, {"$set": {"role": "admin"}})


@app.on_event("shutdown")
async def shutdown():
    client.close()
