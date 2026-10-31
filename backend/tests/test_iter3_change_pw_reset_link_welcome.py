# Iteration 3: learner change password, admin reset link, welcome email (background), google-only has_password
import os
import time
import uuid
import subprocess
from datetime import datetime, timezone, timedelta
from urllib.parse import urlparse, parse_qs

import jwt
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


def login(email, password):
    return requests.post(f"{API}/auth/login", json={"email": email, "password": password})


def hdr(t):
    return {"Authorization": f"Bearer {t}"}


def register(prefix="test_it3"):
    email = f"{prefix}_{uuid.uuid4().hex[:6]}@example.com"
    t0 = time.time()
    r = requests.post(f"{API}/auth/register", json={
        "email": email, "password": "Learner123!", "first_name": "TEST", "country": "Kenya",
        "work_function": "Other", "ai_experience": "Beginner"}, timeout=30)
    return email, r, time.time() - t0


def cleanup(email):
    u = mdb.users.find_one({"email": email})
    if u:
        mdb.progress.delete_many({"user_id": str(u["_id"])})
        mdb.password_reset_tokens.delete_many({"user_id": str(u["_id"])})
        mdb.users.delete_one({"_id": u["_id"]})
    mdb.login_attempts.delete_many({"identifier": email})


@pytest.fixture(scope="module")
def admin_tok():
    mdb.login_attempts.delete_many({"identifier": ADMIN["email"]})
    r = login(**ADMIN)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture
def learner():
    email, r, _ = register()
    assert r.status_code == 200, r.text
    yield {"email": email, "token": r.json()["token"], "id": r.json()["user"]["id"]}
    cleanup(email)


# Registration + welcome email background
class TestRegisterWelcome:
    def test_register_fast_and_welcome_attempt_logged(self):
        email, r, dt = register("test_it3w")
        try:
            assert r.status_code == 200, r.text
            d = r.json()
            assert d["user"]["email"] == email and d["user"]["has_password"] is True
            assert isinstance(d["token"], str)
            assert dt < 10, f"register took {dt}s"
            time.sleep(4)
            log = subprocess.run("tail -n 300 /var/log/supervisor/backend.err.log", shell=True,
                                 capture_output=True, text=True).stdout
            assert "Welcome email failed" in log or "Email paused" in log or "Email send failed" in log
        finally:
            cleanup(email)

    def test_me_has_password(self, learner):
        r = requests.get(f"{API}/auth/me", headers=hdr(learner["token"]))
        assert r.status_code == 200 and r.json()["has_password"] is True


# Change password
class TestChangePassword:
    def test_wrong_current(self, learner):
        r = requests.post(f"{API}/auth/change-password", headers=hdr(learner["token"]),
                          json={"current_password": "nope12345", "new_password": "NewPass123!"})
        assert r.status_code == 400 and "incorrect" in r.json()["detail"].lower()

    def test_short_new(self, learner):
        r = requests.post(f"{API}/auth/change-password", headers=hdr(learner["token"]),
                          json={"current_password": "Learner123!", "new_password": "short"})
        assert r.status_code == 422

    def test_no_token(self):
        r = requests.post(f"{API}/auth/change-password", json={"current_password": "a", "new_password": "NewPass123!"})
        assert r.status_code == 401

    def test_change_success_and_token_invalidation(self, learner):
        old = login(learner["email"], "Learner123!").json()["token"]
        r = requests.post(f"{API}/auth/change-password", headers=hdr(learner["token"]),
                          json={"current_password": "Learner123!", "new_password": "NewPass123!"})
        assert r.status_code == 200, r.text
        new_tok = r.json()["token"]
        assert requests.get(f"{API}/auth/me", headers=hdr(new_tok)).status_code == 200
        assert requests.get(f"{API}/auth/me", headers=hdr(old)).status_code == 401
        assert requests.get(f"{API}/auth/me", headers=hdr(learner["token"])).status_code == 401
        assert login(learner["email"], "Learner123!").status_code == 401
        assert login(learner["email"], "NewPass123!").status_code == 200


# Google-only user
class TestGoogleOnly:
    def test_has_password_false_and_change_rejected(self):
        email = f"test_it3g_{uuid.uuid4().hex[:6]}@example.com"
        res = mdb.users.insert_one({"email": email, "password_hash": "", "first_name": "G", "country": "Kenya",
                                    "work_function": "Other", "ai_experience": "Beginner", "role": "learner",
                                    "auth_provider": "google", "created_at": datetime.now(timezone.utc).isoformat()})
        try:
            tok = jwt.encode({"sub": str(res.inserted_id), "type": "access", "tv": 0,
                              "exp": datetime.now(timezone.utc) + timedelta(hours=1)},
                             os.environ["JWT_SECRET"], algorithm="HS256")
            r = requests.get(f"{API}/auth/me", headers=hdr(tok))
            assert r.status_code == 200, r.text
            assert r.json()["has_password"] is False
            r = requests.post(f"{API}/auth/change-password", headers=hdr(tok),
                              json={"current_password": "", "new_password": "NewPass123!"})
            assert r.status_code == 400
            assert login(email, "").status_code in (401, 422)
        finally:
            cleanup(email)


# Admin reset link
class TestAdminResetLink:
    def test_no_token(self):
        assert requests.post(f"{API}/admin/reset-link", json={"email": "x@example.com"}).status_code == 401

    def test_learner_forbidden(self, learner):
        r = requests.post(f"{API}/admin/reset-link", headers=hdr(learner["token"]), json={"email": learner["email"]})
        assert r.status_code == 403

    def test_unknown_email(self, admin_tok):
        r = requests.post(f"{API}/admin/reset-link", headers=hdr(admin_tok), json={"email": "nobody_zz@example.com"})
        assert r.status_code == 404 and "No account found" in r.json()["detail"]

    def test_invalid_email(self, admin_tok):
        r = requests.post(f"{API}/admin/reset-link", headers=hdr(admin_tok), json={"email": "notanemail"})
        assert r.status_code == 422

    def test_link_flow(self, admin_tok, learner):
        r = requests.post(f"{API}/admin/reset-link", headers=hdr(admin_tok), json={"email": learner["email"].upper()})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["expires_in_minutes"] == 60
        u = urlparse(d["link"])
        assert u.scheme == "https" and u.path == "/reset-password"
        token = parse_qs(u.query)["token"][0]
        r = requests.post(f"{API}/auth/reset-password", json={"token": token, "password": "Reset123!x"})
        assert r.status_code == 200, r.text
        assert requests.get(f"{API}/auth/me", headers=hdr(learner["token"])).status_code == 401
        assert login(learner["email"], "Reset123!x").status_code == 200
        # single use
        r = requests.post(f"{API}/auth/reset-password", json={"token": token, "password": "Another123!"})
        assert r.status_code == 400
