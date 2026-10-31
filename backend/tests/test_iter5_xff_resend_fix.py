# Iteration 5: retest XFF-spoof signup limit fix, resend-verification count fix, quick regression
import os
import uuid

import pytest
import requests
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv("/app/frontend/.env")
load_dotenv("/app/backend/.env")
BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"
mdb = MongoClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]
PREFIX = "test_it5"
SPOOFS = ["1.1.1.1", "2.2.2.2", "3.3.3.3", "4.4.4.4", "5.5.5.5", "6.6.6.6"]


def hdr(t):
    return {"Authorization": f"Bearer {t}"}


def register(headers=None):
    email = f"{PREFIX}_{uuid.uuid4().hex[:6]}@example.com"
    r = requests.post(f"{API}/auth/register", headers=headers or {}, json={
        "email": email, "password": "Learner123!", "first_name": "TEST", "country": "Kenya",
        "work_function": "Other", "ai_experience": "Beginner"}, timeout=30)
    return email, r


@pytest.fixture(scope="module", autouse=True)
def cleanup():
    mdb.signup_log.delete_many({})
    yield
    ids = [str(u["_id"]) for u in mdb.users.find({"email": {"$regex": f"^{PREFIX}_"}})]
    for coll in ("email_verify_tokens", "password_reset_tokens", "progress", "favourites", "ai_usage"):
        mdb[coll].delete_many({"user_id": {"$in": ids}})
    mdb.users.delete_many({"email": {"$regex": f"^{PREFIX}_"}})
    mdb.signup_log.delete_many({})
    mdb.login_attempts.delete_many({"identifier": {"$regex": f"^{PREFIX}_"}})


# --- Fix 1: XFF spoofing no longer bypasses per-IP limit
class TestXffSpoof:
    def test_spoofed_xff_cannot_bypass(self):
        mdb.signup_log.delete_many({})
        for i in range(5):
            _, r = register({"X-Forwarded-For": SPOOFS[i]})
            assert r.status_code == 200, f"signup {i+1}: {r.status_code} {r.text}"
        _, r = register({"X-Forwarded-For": SPOOFS[5]})
        assert r.status_code == 429, r.text
        assert "Too many new accounts from your network" in r.json()["detail"]
        logs = list(mdb.signup_log.find({}, {"_id": 0, "ip": 1}))
        ips = {d["ip"] for d in logs}
        print("signup_log ips:", ips)
        assert len(logs) == 5
        assert len(ips) == 1
        assert not ips & set(SPOOFS)

    def test_multi_value_spoof_also_blocked(self):
        # attacker sends a chain of fake values
        _, r = register({"X-Forwarded-For": "9.9.9.9, 8.8.8.8, 7.7.7.7"})
        assert r.status_code == 429, r.text
        mdb.signup_log.delete_many({})


# --- Fix 2: resend verification allows 3 resends, 4th 429
class TestResend:
    def test_resend_three_then_429(self):
        mdb.signup_log.delete_many({})
        _, r = register()
        assert r.status_code == 200, r.text
        tok, uid = r.json()["token"], r.json()["user"]["id"]
        assert mdb.email_verify_tokens.count_documents({"user_id": uid}) == 1
        for i in range(3):
            rr = requests.post(f"{API}/auth/resend-verification", headers=hdr(tok), timeout=30)
            assert rr.status_code == 200, f"resend {i+1}: {rr.status_code} {rr.text}"
        assert mdb.email_verify_tokens.count_documents({"user_id": uid}) == 4
        rr = requests.post(f"{API}/auth/resend-verification", headers=hdr(tok), timeout=30)
        assert rr.status_code == 429, rr.text
        assert "wait an hour" in rr.json()["detail"]
        assert mdb.email_verify_tokens.count_documents({"user_id": uid}) == 4


# --- Quick regression
class TestRegression:
    def test_register_login_ai403(self):
        mdb.signup_log.delete_many({})
        email, r = register()
        assert r.status_code == 200
        assert r.json()["user"]["email_verified"] is False
        lr = requests.post(f"{API}/auth/login", json={"email": email, "password": "Learner123!"}, timeout=30)
        assert lr.status_code == 200
        tok = lr.json()["token"]
        me = requests.get(f"{API}/auth/me", headers=hdr(tok)).json()
        assert me["email"] == email and me["email_verified"] is False
        ai = requests.post(f"{API}/ai/run", headers=hdr(tok),
                           json={"prompt": "Hello there AI", "model": "gpt", "mode": "try"}, timeout=30)
        assert ai.status_code == 403
        assert "confirm your email" in ai.json()["detail"]

    def test_admin_login(self):
        r = requests.post(f"{API}/auth/login", json={"email": "knandanan@gmail.com",
                                                     "password": "z-lQI9UdjCj48kvM"}, timeout=30)
        assert r.status_code == 200
        assert r.json()["user"]["role"] == "admin"
