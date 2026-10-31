# Iteration 4: signup rate limits, email verification, resend limits, global AI cap, reset->verified
import os
import uuid
import hashlib
import secrets
from datetime import datetime, timezone, timedelta

import pytest
import requests
from bson import ObjectId
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv("/app/frontend/.env")
load_dotenv("/app/backend/.env")
BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"
ADMIN = {"email": "knandanan@gmail.com", "password": "z-lQI9UdjCj48kvM"}
mdb = MongoClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]
PREFIX = "test_it4"


def hdr(t):
    return {"Authorization": f"Bearer {t}"}


def register(headers=None):
    email = f"{PREFIX}_{uuid.uuid4().hex[:6]}@example.com"
    r = requests.post(f"{API}/auth/register", headers=headers or {}, json={
        "email": email, "password": "Learner123!", "first_name": "TEST", "country": "Kenya",
        "work_function": "Other", "ai_experience": "Beginner"}, timeout=30)
    return email, r


def insert_verify_token(user_id, expired=False):
    tok = secrets.token_urlsafe(32)
    now = datetime.now(timezone.utc)
    mdb.email_verify_tokens.insert_one({
        "token_hash": hashlib.sha256(tok.encode()).hexdigest(), "user_id": user_id,
        "created_at": now - timedelta(hours=2) if expired else now,
        "expires_at": now - timedelta(minutes=1) if expired else now + timedelta(hours=24)})
    return tok


@pytest.fixture(scope="module", autouse=True)
def cleanup():
    mdb.signup_log.delete_many({})
    mdb.login_attempts.delete_many({})
    yield
    ids = [str(u["_id"]) for u in mdb.users.find({"email": {"$regex": f"^{PREFIX}_"}})]
    for coll in ("email_verify_tokens", "password_reset_tokens", "progress", "favourites", "ai_usage"):
        mdb[coll].delete_many({"user_id": {"$in": ids}})
    mdb.users.delete_many({"email": {"$regex": f"^{PREFIX}_"}})
    mdb.signup_log.delete_many({})
    mdb.login_attempts.delete_many({})


@pytest.fixture
def learner():
    mdb.signup_log.delete_many({})
    email, r = register()
    assert r.status_code == 200, r.text
    d = r.json()
    return {"email": email, "token": d["token"], "id": d["user"]["id"], "user": d["user"]}


# --- Registration / unverified state
class TestUnverified:
    def test_register_unverified(self, learner):
        assert learner["user"]["email_verified"] is False
        me = requests.get(f"{API}/auth/me", headers=hdr(learner["token"])).json()
        assert me["email_verified"] is False
        # welcome token created synchronously
        assert mdb.email_verify_tokens.count_documents({"user_id": learner["id"]}) == 1

    def test_ai_run_403(self, learner):
        r = requests.post(f"{API}/ai/run", headers=hdr(learner["token"]),
                          json={"prompt": "Hello there AI", "model": "gpt", "mode": "try"})
        assert r.status_code == 403
        assert "confirm your email" in r.json()["detail"]
        # quota must not be consumed
        assert mdb.ai_usage.count_documents({"user_id": learner["id"]}) == 0

    def test_resend_limit(self, learner):
        codes = []
        for _ in range(4):
            r = requests.post(f"{API}/auth/resend-verification", headers=hdr(learner["token"]))
            codes.append((r.status_code, r.json().get("detail") or r.json().get("message")))
        print("resend results:", codes)
        assert codes[0][0] == 200 and "sent a new confirmation" in codes[0][1]
        assert any(c == 429 for c, _ in codes)
        assert "wait an hour" in [m for c, m in codes if c == 429][0]
        assert codes[-1][0] == 429

    def test_resend_unauth(self):
        assert requests.post(f"{API}/auth/resend-verification").status_code == 401


# --- Verification endpoint
class TestVerify:
    def test_verify_valid(self, learner):
        tok = insert_verify_token(learner["id"])
        r = requests.post(f"{API}/auth/verify-email", json={"token": tok})
        assert r.status_code == 200 and "confirmed" in r.json()["message"]
        assert requests.get(f"{API}/auth/me", headers=hdr(learner["token"])).json()["email_verified"] is True
        # token reuse fails
        assert requests.post(f"{API}/auth/verify-email", json={"token": tok}).status_code == 400
        # resend for verified user returns already confirmed
        r = requests.post(f"{API}/auth/resend-verification", headers=hdr(learner["token"]))
        assert r.status_code == 200 and "already confirmed" in r.json()["message"]

    def test_verify_invalid(self):
        r = requests.post(f"{API}/auth/verify-email", json={"token": "nope"})
        assert r.status_code == 400 and "invalid or has expired" in r.json()["detail"]
        r = requests.post(f"{API}/auth/verify-email", json={"token": ""})
        assert r.status_code == 400

    def test_verify_expired(self, learner):
        tok = insert_verify_token(learner["id"], expired=True)
        r = requests.post(f"{API}/auth/verify-email", json={"token": tok})
        assert r.status_code == 400
        assert mdb.users.find_one({"_id": ObjectId(learner["id"])})["email_verified"] is False


# --- Admin reset link -> verified
class TestResetVerifies:
    def test_reset_sets_verified(self, learner):
        at = requests.post(f"{API}/auth/login", json=ADMIN).json()["token"]
        admin_me = requests.get(f"{API}/auth/me", headers=hdr(at)).json()
        assert admin_me["email_verified"] is True and admin_me["role"] == "admin"
        r = requests.post(f"{API}/admin/reset-link", headers=hdr(at), json={"email": learner["email"]})
        assert r.status_code == 200
        tok = r.json()["link"].split("token=")[1]
        r = requests.post(f"{API}/auth/reset-password", json={"token": tok, "password": "NewPass123!"})
        assert r.status_code == 200
        lt = requests.post(f"{API}/auth/login", json={"email": learner["email"], "password": "NewPass123!"}).json()
        assert lt["user"]["email_verified"] is True


# --- Global AI cap
class TestGlobalCap:
    def test_global_cap(self, learner):
        mdb.users.update_one({"_id": ObjectId(learner["id"])}, {"$set": {"email_verified": True}})
        today = datetime.now(timezone.utc).date().isoformat()
        prev = mdb.ai_usage.find_one({"user_id": "__all__", "date": today})
        mdb.ai_usage.update_one({"user_id": "__all__", "date": today}, {"$set": {"count": 500}}, upsert=True)
        try:
            r = requests.post(f"{API}/ai/run", headers=hdr(learner["token"]),
                              json={"prompt": "Hello there AI", "model": "gpt", "mode": "try"})
            assert r.status_code == 429
            assert "limit for all learners" in r.json()["detail"]
            u = mdb.ai_usage.find_one({"user_id": learner["id"], "date": today})
            assert u["count"] == 0  # user's count rolled back
        finally:
            if prev:
                mdb.ai_usage.update_one({"_id": prev["_id"]}, {"$set": {"count": prev["count"]}})
            else:
                mdb.ai_usage.delete_one({"user_id": "__all__", "date": today})


# --- Signup limits
class TestSignupLimits:
    def test_per_ip_limit(self):
        mdb.signup_log.delete_many({})
        results = [register()[1] for _ in range(6)]
        codes = [r.status_code for r in results]
        print("signup codes:", codes, list(mdb.signup_log.find({}, {"_id": 0, "ip": 1})))
        assert codes[:5] == [200] * 5
        assert codes[5] == 429
        assert "Too many new accounts from your network" in results[5].json()["detail"]
        mdb.signup_log.delete_many({})

    def test_xff_spoof(self):
        """Check if a client-supplied X-Forwarded-For bypasses the per-IP limit"""
        mdb.signup_log.delete_many({})
        for _ in range(5):
            assert register()[1].status_code == 200
        _, r = register(headers={"X-Forwarded-For": "203.0.113.77"})
        ips = mdb.signup_log.distinct("ip")
        print("spoof status:", r.status_code, "ips logged:", ips)
        mdb.signup_log.delete_many({})
        assert r.status_code == 429, "X-Forwarded-For spoofing bypasses per-IP signup limit"

    def test_global_limit(self):
        mdb.signup_log.delete_many({})
        now = datetime.now(timezone.utc)
        mdb.signup_log.insert_many([{"ip": f"10.9.{i}.1", "created_at": now} for i in range(60)])
        _, r = register()
        mdb.signup_log.delete_many({})
        assert r.status_code == 429 and "Registration is busy" in r.json()["detail"]
