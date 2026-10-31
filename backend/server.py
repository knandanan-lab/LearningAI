from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import json
import uuid
import hashlib
import secrets
import logging
import httpx
from fastapi.responses import StreamingResponse
from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal

import bcrypt
import jwt
from bson import ObjectId
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, BackgroundTasks
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field
from starlette.middleware.cors import CORSMiddleware

from lessons_seed import CATEGORIES, build_lessons
from emailer import send_email, reset_email_html, welcome_email_html

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


def make_token(user_id: str, tv: int = 0) -> str:
    payload = {"sub": user_id, "type": "access", "tv": tv, "exp": datetime.now(timezone.utc) + timedelta(days=7)}
    return jwt.encode(payload, os.environ["JWT_SECRET"], algorithm=JWT_ALG)


def public_user(u: dict) -> dict:
    return {
        "id": str(u["_id"]), "email": u["email"], "first_name": u.get("first_name", ""),
        "country": u.get("country", ""), "work_function": u.get("work_function", ""),
        "ai_experience": u.get("ai_experience", ""), "role": u.get("role", "learner"),
        "has_password": bool(u.get("password_hash")),
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
    if not user or payload.get("tv", 0) != user.get("token_version", 0):
        raise HTTPException(401, "Your session has ended. Please log in again.")
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
async def register(body: RegisterIn, background: BackgroundTasks):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(400, "An account with this email already exists")
    doc = body.model_dump(exclude={"password", "email"})
    doc.update(email=email, password_hash=hash_password(body.password), role="learner",
               created_at=datetime.now(timezone.utc).isoformat())
    res = await db.users.insert_one(doc)
    doc["_id"] = res.inserted_id
    background.add_task(send_welcome, email, doc["first_name"])
    return {"token": make_token(str(res.inserted_id)), "user": public_user(doc)}


@api.post("/auth/login")
async def login(body: LoginIn, request: Request):
    email = body.email.lower()
    ident = email
    attempt = await db.login_attempts.find_one({"identifier": ident})
    now = datetime.now(timezone.utc)
    locked_until = attempt.get("locked_until") if attempt else None
    if locked_until and locked_until.tzinfo is None:
        locked_until = locked_until.replace(tzinfo=timezone.utc)
    if attempt and locked_until and locked_until <= now:
        await db.login_attempts.delete_many({"identifier": ident})
        attempt = None
    if attempt and attempt.get("count", 0) >= 5:
        raise HTTPException(429, "Too many attempts. Please try again in 15 minutes.")
    user = await db.users.find_one({"email": email})
    if not user or not user.get("password_hash") or not verify_password(body.password, user["password_hash"]):
        count = (attempt or {}).get("count", 0) + 1
        await db.login_attempts.update_one(
            {"identifier": ident},
            {"$set": {"count": count, "locked_until": now + timedelta(minutes=15)}}, upsert=True)
        raise HTTPException(401, "Incorrect email or password")
    await db.login_attempts.delete_many({"identifier": ident})
    return {"token": make_token(str(user["_id"]), user.get("token_version", 0)), "user": public_user(user)}


@api.get("/auth/me")
async def me(user: dict = Depends(current_user)):
    return public_user(user)


class ForgotIn(BaseModel):
    email: EmailStr


class ResetIn(BaseModel):
    token: str
    password: str = Field(min_length=8, max_length=128)


class ChangePasswordIn(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=128)


async def send_reset(email: str, link: str):
    try:
        await send_email(to=email, subject="Reset your AI in 15 password", html=reset_email_html(link))
    except Exception:
        logging.exception("Password reset email failed")


async def send_welcome(email: str, first_name: str):
    try:
        first = await db.lessons.find_one({}, {"_id": 0, "id": 1}, sort=[("order", 1)])
        link = f"{os.environ['FRONTEND_URL'].rstrip('/')}/lessons/{first['id']}"
        await send_email(to=email, subject="Welcome to AI in 15", html=welcome_email_html(first_name, link))
    except Exception:
        logging.exception("Welcome email failed")


async def create_reset_link(user: dict) -> str:
    token = secrets.token_urlsafe(32)
    now = datetime.now(timezone.utc)
    await db.password_reset_tokens.insert_one({
        "token_hash": hashlib.sha256(token.encode()).hexdigest(), "user_id": str(user["_id"]),
        "created_at": now, "expires_at": now + timedelta(hours=1), "used": False})
    return f"{os.environ['FRONTEND_URL'].rstrip('/')}/reset-password?token={token}"


@api.post("/auth/forgot-password")
async def forgot_password(body: ForgotIn, background: BackgroundTasks):
    email = body.email.lower()
    user = await db.users.find_one({"email": email})
    hour_ago = datetime.now(timezone.utc) - timedelta(hours=1)
    if user and await db.password_reset_tokens.count_documents(
            {"user_id": str(user["_id"]), "created_at": {"$gt": hour_ago}}) < 3:
        background.add_task(send_reset, email, await create_reset_link(user))
    return {"message": "If an account exists for this email, a reset link has been sent."}


@api.post("/admin/reset-link")
async def admin_reset_link(body: ForgotIn, _: dict = Depends(admin_user)):
    user = await db.users.find_one({"email": body.email.lower()})
    if not user:
        raise HTTPException(404, "No account found with this email")
    return {"link": await create_reset_link(user), "expires_in_minutes": 60}


@api.post("/auth/reset-password")
async def reset_password(body: ResetIn):
    doc = await db.password_reset_tokens.find_one(
        {"token_hash": hashlib.sha256(body.token.encode()).hexdigest(), "used": False})
    expires = doc and doc["expires_at"]
    if expires and expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if not doc or expires < datetime.now(timezone.utc):
        raise HTTPException(400, "This reset link is invalid or has expired. Please request a new one.")
    user = await db.users.find_one({"_id": ObjectId(doc["user_id"])})
    if not user:
        raise HTTPException(400, "This reset link is invalid or has expired. Please request a new one.")
    await db.users.update_one({"_id": user["_id"]}, {"$set": {"password_hash": hash_password(body.password)},
                                                     "$inc": {"token_version": 1}})
    await db.password_reset_tokens.update_many({"user_id": doc["user_id"]}, {"$set": {"used": True}})
    await db.login_attempts.delete_many({"identifier": user["email"]})
    return {"message": "Your password has been reset. You can now log in."}


@api.post("/auth/change-password")
async def change_password(body: ChangePasswordIn, user: dict = Depends(current_user)):
    if not user.get("password_hash") or not verify_password(body.current_password, user["password_hash"]):
        raise HTTPException(400, "Your current password is incorrect")
    if body.new_password == body.current_password:
        raise HTTPException(400, "Please choose a new password that is different from your current one")
    tv = user.get("token_version", 0) + 1
    await db.users.update_one({"_id": user["_id"]}, {"$set": {"password_hash": hash_password(body.new_password),
                                                              "token_version": tv}})
    return {"message": "Password changed", "token": make_token(str(user["_id"]), tv)}


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
    res = await db.lessons.update_one({"id": lesson_id}, {"$set": body.model_dump(exclude={"order"})})
    if res.matched_count == 0:
        raise HTTPException(404, "Lesson not found")
    others = await db.lessons.find({"id": {"$ne": lesson_id}}, {"_id": 0, "id": 1}).sort("order", 1).to_list(100)
    ids = [o["id"] for o in others]
    ids.insert(min(max(body.order, 1), len(ids) + 1) - 1, lesson_id)
    for i, lid in enumerate(ids):
        await db.lessons.update_one({"id": lid}, {"$set": {"order": i + 1}})
    return await db.lessons.find_one({"id": lesson_id}, {"_id": 0})


@api.get("/admin/stats")
async def admin_stats(_: dict = Depends(admin_user)):
    users = await db.users.count_documents({"role": "learner"})
    completions = await db.progress.count_documents({})
    agg = await db.progress.aggregate([{"$group": {"_id": "$lesson_id", "count": {"$sum": 1}}}]).to_list(100)
    counts = {a["_id"]: a["count"] for a in agg}
    ragg = await db.progress.aggregate([
        {"$match": {"reflection": {"$in": ["Yes", "Maybe", "Not yet"]}}},
        {"$group": {"_id": {"l": "$lesson_id", "r": "$reflection"}, "count": {"$sum": 1}}}]).to_list(500)
    refl = {}
    for a in ragg:
        refl.setdefault(a["_id"]["l"], {"Yes": 0, "Maybe": 0, "Not yet": 0})[a["_id"]["r"]] = a["count"]
    lessons = await db.lessons.find({}, {"_id": 0, "id": 1, "title": 1, "order": 1}).sort("order", 1).to_list(100)
    return {"registered_users": users, "lessons_completed": completions,
            "by_lesson": [{**lsn, "completions": counts.get(lsn["id"], 0),
                           "reflections": refl.get(lsn["id"], {"Yes": 0, "Maybe": 0, "Not yet": 0})} for lsn in lessons]}


# ---------- Google sign-in (Emergent managed) ----------
class GoogleIn(BaseModel):
    session_id: str


@api.post("/auth/google")
async def google_login(body: GoogleIn, background: BackgroundTasks):
    async with httpx.AsyncClient(timeout=15) as hc:
        r = await hc.get("https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                         headers={"X-Session-ID": body.session_id})
    if r.status_code != 200:
        raise HTTPException(401, "Google sign-in failed. Please try again.")
    data = r.json()
    email = data["email"].lower()
    user = await db.users.find_one({"email": email})
    if not user:
        doc = {"email": email, "password_hash": "", "first_name": (data.get("name") or "").split(" ")[0][:60],
               "country": "", "work_function": "", "ai_experience": "", "role": "learner",
               "auth_provider": "google", "created_at": datetime.now(timezone.utc).isoformat()}
        res = await db.users.insert_one(doc)
        doc["_id"] = res.inserted_id
        user = doc
        background.add_task(send_welcome, email, doc["first_name"])
    return {"token": make_token(str(user["_id"]), user.get("token_version", 0)), "user": public_user(user)}


# ---------- AI practice (Emergent LLM key) ----------
MODELS = {
    "claude": ("anthropic", "claude-sonnet-5-5"),
    "gpt": ("openai", "gpt-6-luna"),
    "gemini": ("gemini", "gemini-3-flash-preview"),
}
TRY_SYSTEM = ("You are a helpful workplace assistant for working professionals in Africa. Use clear British "
              "English. Be concise and practical. If the prompt contains placeholders in square brackets, make "
              "sensible fictional assumptions and say so in one line. Remind the user to check facts where relevant. "
              "Write in plain text without markdown symbols such as asterisks or hashes.")
FEEDBACK_SYSTEM = ("You are a friendly coach helping beginners write better prompts for AI tools at work. Use "
                   "clear British English. Do NOT carry out the task in the prompt. Reply in under 200 words with "
                   "these headings: What works well; What to improve (task, context, output, constraints); "
                   "Confidentiality check (flag any names, personal data or sensitive business details); "
                   "Improved prompt. Write in plain text without markdown symbols such as asterisks or hashes.")


class AIIn(BaseModel):
    prompt: str = Field(min_length=5, max_length=4000)
    model: Literal["claude", "gpt", "gemini"] = "gpt"
    mode: Literal["try", "feedback"] = "try"


async def check_ai_quota(user_id: str):
    today = datetime.now(timezone.utc).date().isoformat()
    limit = int(os.environ["AI_DAILY_LIMIT"])
    doc = await db.ai_usage.find_one_and_update(
        {"user_id": user_id, "date": today}, {"$inc": {"count": 1}}, upsert=True, return_document=True)
    if doc["count"] > limit:
        raise HTTPException(429, f"You have reached today's limit of {limit} AI requests. Please try again tomorrow.")


@api.post("/ai/run")
async def ai_run(body: AIIn, user: dict = Depends(current_user)):
    await check_ai_quota(str(user["_id"]))
    provider, model = MODELS[body.model]
    system = TRY_SYSTEM if body.mode == "try" else FEEDBACK_SYSTEM
    text = body.prompt if body.mode == "try" else f"Please give feedback on this prompt:\n\n{body.prompt}"
    chat = LlmChat(api_key=os.environ["EMERGENT_LLM_KEY"], session_id=f"{user['_id']}-{uuid.uuid4().hex}",
                   system_message=system).with_model(provider, model)

    async def events():
        try:
            async for ev in chat.stream_message(UserMessage(text=text)):
                if isinstance(ev, TextDelta):
                    yield f"data: {json.dumps({'t': ev.content})}\n\n"
                elif isinstance(ev, StreamDone):
                    break
        except Exception:
            logging.exception("AI error")
            await db.ai_usage.update_one({"user_id": str(user["_id"]), "date": datetime.now(timezone.utc).date().isoformat()},
                                         {"$inc": {"count": -1}})
            yield f"data: {json.dumps({'error': 'The AI service is unavailable. Please try again later.'})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(events(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


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
    await db.password_reset_tokens.create_index("expires_at", expireAfterSeconds=0)
    await db.password_reset_tokens.create_index("token_hash")
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
