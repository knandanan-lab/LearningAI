# Iteration 2: forgot/reset/change password, lesson reorder, admin reflection stats
import os
import uuid
import hashlib
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


def login(email, password):
    return requests.post(f"{API}/auth/login", json={"email": email, "password": password})


def hdr(tok):
    return {"Authorization": f"Bearer {tok}"}


def insert_token(user_id, token, expires_delta=timedelta(hours=1), used=False):
    mdb.password_reset_tokens.insert_one({
        "token_hash": hashlib.sha256(token.encode()).hexdigest(), "user_id": user_id,
        "expires_at": datetime.now(timezone.utc) + expires_delta, "used": used})


@pytest.fixture(scope="module")
def learner():
    email = f"test_it2_{uuid.uuid4().hex[:6]}@example.com"
    r = requests.post(f"{API}/auth/register", json={
        "email": email, "password": "Learner123!", "first_name": "TEST", "country": "Kenya",
        "work_function": "Other", "ai_experience": "Beginner"})
    assert r.status_code == 200, r.text
    d = r.json()
    yield {"email": email, "id": d["user"]["id"], "token": d["token"]}
    mdb.users.delete_one({"_id": ObjectId(d["user"]["id"])})
    mdb.progress.delete_many({"user_id": d["user"]["id"]})
    mdb.password_reset_tokens.delete_many({"user_id": d["user"]["id"]})


@pytest.fixture(scope="module")
def admin_tok():
    r = login(**ADMIN)
    assert r.status_code == 200, r.text
    return r.json()["token"]


# Forgot password
class TestForgot:
    def test_existing_email_generic(self, learner):
        r = requests.post(f"{API}/auth/forgot-password", json={"email": learner["email"]}, timeout=60)
        assert r.status_code == 200
        assert "If an account exists" in r.json()["message"]
        assert mdb.password_reset_tokens.count_documents({"user_id": learner["id"]}) >= 1

    def test_nonexisting_email_generic(self):
        r = requests.post(f"{API}/auth/forgot-password", json={"email": "nobody_zz_xx@example.com"}, timeout=60)
        assert r.status_code == 200
        assert "If an account exists" in r.json()["message"]

    def test_invalid_email_422(self):
        r = requests.post(f"{API}/auth/forgot-password", json={"email": "notanemail"})
        assert r.status_code == 422


# Reset password
class TestReset:
    def test_invalid_token(self):
        r = requests.post(f"{API}/auth/reset-password", json={"token": "bogus_" + uuid.uuid4().hex, "password": "Whatever123!"})
        assert r.status_code == 400
        assert "invalid or has expired" in r.json()["detail"]

    def test_expired_token(self, learner):
        tok = "exp_" + uuid.uuid4().hex
        insert_token(learner["id"], tok, timedelta(minutes=-5))
        r = requests.post(f"{API}/auth/reset-password", json={"token": tok, "password": "Whatever123!"})
        assert r.status_code == 400

    def test_short_password_422(self, learner):
        tok = "short_" + uuid.uuid4().hex
        insert_token(learner["id"], tok)
        r = requests.post(f"{API}/auth/reset-password", json={"token": tok, "password": "short"})
        assert r.status_code == 422

    def test_valid_reset_flow(self, learner):
        tok = "valid_" + uuid.uuid4().hex
        insert_token(learner["id"], tok)
        r = requests.post(f"{API}/auth/reset-password", json={"token": tok, "password": "NewPass456!"})
        assert r.status_code == 200, r.text
        assert "reset" in r.json()["message"].lower()
        assert login(learner["email"], "NewPass456!").status_code == 200
        assert login(learner["email"], "Learner123!").status_code == 401
        # reuse
        r2 = requests.post(f"{API}/auth/reset-password", json={"token": tok, "password": "Another789!"})
        assert r2.status_code == 400
        # other tokens invalidated too
        assert mdb.password_reset_tokens.count_documents({"user_id": learner["id"], "used": False}) == 0
        assert mdb.users.find_one({"_id": ObjectId(learner["id"])})["password_hash"].startswith("$2b$")


# Change password
class TestChange:
    def test_unauth(self):
        r = requests.post(f"{API}/auth/change-password", json={"current_password": "x", "new_password": "Abcdefgh1"})
        assert r.status_code == 401

    def test_wrong_current(self, learner):
        r = requests.post(f"{API}/auth/change-password", headers=hdr(learner["token"]),
                          json={"current_password": "WrongOne!", "new_password": "Abcdefgh1"})
        assert r.status_code == 400
        assert "incorrect" in r.json()["detail"]

    def test_change_and_login(self, learner):
        r = requests.post(f"{API}/auth/change-password", headers=hdr(learner["token"]),
                          json={"current_password": "NewPass456!", "new_password": "Changed999!"})
        assert r.status_code == 200, r.text
        assert login(learner["email"], "Changed999!").status_code == 200
        assert login(learner["email"], "NewPass456!").status_code == 401


# Lesson reorder
class TestReorder:
    def _lessons(self, tok):
        return requests.get(f"{API}/lessons", headers=hdr(tok)).json()

    def test_move_and_restore(self, admin_tok):
        orig = self._lessons(admin_tok)
        orig_ids = [l["id"] for l in orig]
        assert [l["order"] for l in orig] == list(range(1, len(orig) + 1))
        target = orig_ids[4]
        lesson = requests.get(f"{API}/lessons/{target}", headers=hdr(admin_tok)).json()
        body = {k: lesson[k] for k in ["title", "category", "task_label", "order", "outcome", "learn", "example",
                                       "exercise", "prompt_title", "prompt", "review", "question"]}
        body["order"] = 2
        r = requests.put(f"{API}/admin/lessons/{target}", headers=hdr(admin_tok), json=body)
        assert r.status_code == 200, r.text
        assert r.json()["order"] == 2
        now = self._lessons(admin_tok)
        assert [l["order"] for l in now] == list(range(1, len(orig) + 1))
        expected = orig_ids[:1] + [target] + orig_ids[1:4] + orig_ids[5:]
        assert [l["id"] for l in now] == expected
        body["order"] = 5
        r = requests.put(f"{API}/admin/lessons/{target}", headers=hdr(admin_tok), json=body)
        assert r.status_code == 200
        assert [l["id"] for l in self._lessons(admin_tok)] == orig_ids

    def test_out_of_range_clamped(self, admin_tok):
        orig_ids = [l["id"] for l in self._lessons(admin_tok)]
        last = orig_ids[-1]
        lesson = requests.get(f"{API}/lessons/{last}", headers=hdr(admin_tok)).json()
        body = {k: lesson[k] for k in ["title", "category", "task_label", "order", "outcome", "learn", "example",
                                       "exercise", "prompt_title", "prompt", "review", "question"]}
        body["order"] = 99
        r = requests.put(f"{API}/admin/lessons/{last}", headers=hdr(admin_tok), json=body)
        assert r.status_code == 200
        assert r.json()["order"] == len(orig_ids)
        assert [l["id"] for l in self._lessons(admin_tok)] == orig_ids

    def test_learner_forbidden(self, learner):
        r = requests.put(f"{API}/admin/lessons/x", headers=hdr(learner["token"]), json={})
        assert r.status_code in (403, 422)


# Admin stats reflections
class TestStats:
    def test_reflection_increment(self, admin_tok, learner):
        s1 = requests.get(f"{API}/admin/stats", headers=hdr(admin_tok)).json()
        lid = s1["by_lesson"][0]["id"]
        before = s1["by_lesson"][0]["reflections"]
        assert set(before.keys()) == {"Yes", "Maybe", "Not yet"}
        r = requests.post(f"{API}/progress/{lid}", headers=hdr(learner["token"]), json={"quiz_answer": 0, "reflection": "Yes"})
        assert r.status_code == 200
        s2 = requests.get(f"{API}/admin/stats", headers=hdr(admin_tok)).json()
        after = next(b for b in s2["by_lesson"] if b["id"] == lid)["reflections"]
        assert after["Yes"] == before["Yes"] + 1
        assert after["Maybe"] == before["Maybe"]

    def test_stats_learner_forbidden(self, learner):
        assert requests.get(f"{API}/admin/stats", headers=hdr(learner["token"])).status_code == 403


# Forgot-password rate limit (pre-seed 3 recent tokens so no real email is sent)
class TestRateLimit:
    def test_fourth_request_creates_no_token(self, learner):
        mdb.password_reset_tokens.delete_many({"user_id": learner["id"]})
        now = datetime.now(timezone.utc)
        for i in range(3):
            mdb.password_reset_tokens.insert_one({
                "token_hash": uuid.uuid4().hex, "user_id": learner["id"], "created_at": now,
                "expires_at": now + timedelta(hours=1), "used": False})
        r = requests.post(f"{API}/auth/forgot-password", json={"email": learner["email"]}, timeout=60)
        assert r.status_code == 200
        assert "If an account exists" in r.json()["message"]
        assert mdb.password_reset_tokens.count_documents({"user_id": learner["id"]}) == 3

    def test_old_tokens_do_not_count(self, learner):
        mdb.password_reset_tokens.update_many({"user_id": learner["id"]},
                                              {"$set": {"created_at": datetime.now(timezone.utc) - timedelta(hours=2)}})
        r = requests.post(f"{API}/auth/forgot-password", json={"email": learner["email"].upper()}, timeout=60)
        assert r.status_code == 200
        assert mdb.password_reset_tokens.count_documents({"user_id": learner["id"]}) == 4


# Admin change own password and restore
class TestAdminChange:
    def test_admin_change_and_restore(self, admin_tok):
        tmp = "TempAdmin_" + uuid.uuid4().hex[:6]
        try:
            r = requests.post(f"{API}/auth/change-password", headers=hdr(admin_tok),
                              json={"current_password": ADMIN["password"], "new_password": tmp})
            assert r.status_code == 200, r.text
            assert login(ADMIN["email"], tmp).status_code == 200
        finally:
            r2 = requests.post(f"{API}/auth/change-password", headers=hdr(admin_tok),
                               json={"current_password": tmp, "new_password": ADMIN["password"]})
            mdb.login_attempts.delete_many({"identifier": ADMIN["email"]})
        assert r2.status_code == 200
        assert login(ADMIN["email"], ADMIN["password"]).status_code == 200
