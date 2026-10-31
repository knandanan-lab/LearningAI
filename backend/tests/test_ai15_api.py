# Regression tests for AI in 15 backend: auth, lessons, progress, favourites, admin RBAC, google, AI
import os
import uuid
import pytest
import requests
from dotenv import load_dotenv

load_dotenv("/app/frontend/.env")

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"
ADMIN = {"email": "knandanan@gmail.com", "password": "z-lQI9UdjCj48kvM"}


def _reg_payload(**kw):
    p = {"email": f"test_{uuid.uuid4().hex[:8]}@example.com", "password": "Learner123!",
         "first_name": "TEST_Amina", "country": "Kenya", "work_function": "Administration",
         "ai_experience": "Beginner"}
    p.update(kw)
    return p


@pytest.fixture(scope="module")
def learner():
    p = _reg_payload()
    r = requests.post(f"{API}/auth/register", json=p)
    assert r.status_code == 200, r.text
    d = r.json()
    # iteration 4: email-registered learners start unverified; verify directly so AI tests can run
    from pymongo import MongoClient
    from bson import ObjectId
    load_dotenv("/app/backend/.env")
    MongoClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]].users.update_one(
        {"_id": ObjectId(d["user"]["id"])}, {"$set": {"email_verified": True}})
    return {"payload": p, "token": d["token"], "user": d["user"],
            "h": {"Authorization": f"Bearer {d['token']}"}}


@pytest.fixture(scope="module")
def admin_h():
    r = requests.post(f"{API}/auth/login", json=ADMIN)
    if r.status_code != 200:
        pytest.skip(f"admin login failed {r.status_code} {r.text}")
    assert r.json()["user"]["role"] == "admin"
    return {"Authorization": f"Bearer {r.json()['token']}"}


# Auth
class TestAuth:
    def test_register_returns_learner(self, learner):
        u = learner["user"]
        assert u["role"] == "learner" and u["first_name"] == "TEST_Amina" and u["country"] == "Kenya"
        assert "password_hash" not in u

    def test_register_duplicate(self, learner):
        r = requests.post(f"{API}/auth/register", json=learner["payload"])
        assert r.status_code == 400

    def test_register_short_password(self):
        r = requests.post(f"{API}/auth/register", json=_reg_payload(password="short"))
        assert r.status_code == 422

    def test_register_bad_experience(self):
        r = requests.post(f"{API}/auth/register", json=_reg_payload(ai_experience="Expert"))
        assert r.status_code == 422

    def test_login_ok_and_me(self, learner):
        r = requests.post(f"{API}/auth/login", json={"email": learner["payload"]["email"].upper(), "password": "Learner123!"})
        assert r.status_code == 200
        me = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {r.json()['token']}"})
        assert me.status_code == 200 and me.json()["email"] == learner["payload"]["email"]

    def test_login_wrong_password(self, learner):
        r = requests.post(f"{API}/auth/login", json={"email": learner["payload"]["email"], "password": "wrongpass1"})
        assert r.status_code == 401
        assert r.json()["detail"] == "Incorrect email or password"

    def test_me_no_token(self):
        assert requests.get(f"{API}/auth/me").status_code == 401

    def test_me_bad_token(self):
        assert requests.get(f"{API}/auth/me", headers={"Authorization": "Bearer abc"}).status_code == 401

    def test_brute_force_lockout(self):
        p = _reg_payload()
        requests.post(f"{API}/auth/register", json=p)
        codes = [requests.post(f"{API}/auth/login", json={"email": p["email"], "password": "badbadbad"}).status_code for _ in range(6)]
        assert codes[:5] == [401] * 5
        assert codes[5] == 429
        # even correct password locked
        r = requests.post(f"{API}/auth/login", json={"email": p["email"], "password": p["password"]})
        assert r.status_code == 429

    def test_google_invalid_session(self):
        r = requests.post(f"{API}/auth/google", json={"session_id": "invalid-session-xyz"})
        assert r.status_code == 401


# Profile
class TestProfile:
    def test_update_profile(self, learner):
        body = {"first_name": "TEST_Baraka", "country": "Uganda", "work_function": "Finance",
                "ai_experience": "Some experience"}
        r = requests.put(f"{API}/profile", json=body, headers=learner["h"])
        assert r.status_code == 200 and r.json()["first_name"] == "TEST_Baraka"
        me = requests.get(f"{API}/auth/me", headers=learner["h"]).json()
        assert me["country"] == "Uganda" and me["ai_experience"] == "Some experience"


# Content
class TestContent:
    def test_categories(self):
        r = requests.get(f"{API}/categories")
        assert r.status_code == 200 and len(r.json()) == 6

    def test_lessons_list(self, learner):
        r = requests.get(f"{API}/lessons", headers=learner["h"])
        assert r.status_code == 200
        ls = r.json()
        assert len(ls) == 14
        assert [l["order"] for l in ls] == sorted(l["order"] for l in ls)
        assert ls[0]["id"] == "lesson-01"
        for k in ["outcome", "learn", "example", "exercise", "prompt", "review", "question"]:
            assert k in ls[0]
        assert "_id" not in ls[0]

    def test_lesson_404(self, learner):
        assert requests.get(f"{API}/lessons/nope", headers=learner["h"]).status_code == 404

    def test_lessons_need_auth(self):
        assert requests.get(f"{API}/lessons").status_code == 401


# Progress
class TestProgress:
    def test_complete_and_recomplete(self, learner):
        r = requests.post(f"{API}/progress/lesson-01", json={"quiz_answer": 0, "reflection": "Yes"}, headers=learner["h"])
        assert r.status_code == 200 and "quiz_correct" in r.json()
        r2 = requests.post(f"{API}/progress/lesson-01", json={"quiz_answer": 1, "reflection": "Maybe"}, headers=learner["h"])
        assert r2.status_code == 200
        prog = requests.get(f"{API}/progress", headers=learner["h"]).json()
        rec = [p for p in prog if p["lesson_id"] == "lesson-01"]
        assert len(rec) == 1 and rec[0]["reflection"] == "Maybe" and rec[0]["quiz_answer"] == 1

    def test_complete_without_answers(self, learner):
        r = requests.post(f"{API}/progress/lesson-02", json={"quiz_answer": None, "reflection": None}, headers=learner["h"])
        assert r.status_code == 200

    def test_complete_invalid_reflection(self, learner):
        r = requests.post(f"{API}/progress/lesson-03", json={"reflection": "Nope"}, headers=learner["h"])
        assert r.status_code == 422

    def test_complete_unknown_lesson(self, learner):
        assert requests.post(f"{API}/progress/zzz", json={}, headers=learner["h"]).status_code == 404


# Favourites
class TestFavourites:
    def test_add_list_remove(self, learner):
        assert requests.post(f"{API}/favourites/lesson-03", headers=learner["h"]).status_code == 200
        assert requests.post(f"{API}/favourites/lesson-03", headers=learner["h"]).status_code == 200  # idempotent
        favs = requests.get(f"{API}/favourites", headers=learner["h"]).json()
        assert favs.count("lesson-03") == 1
        assert requests.delete(f"{API}/favourites/lesson-03", headers=learner["h"]).status_code == 200
        assert "lesson-03" not in requests.get(f"{API}/favourites", headers=learner["h"]).json()

    def test_add_unknown(self, learner):
        assert requests.post(f"{API}/favourites/nope", headers=learner["h"]).status_code == 404


# Admin RBAC
class TestAdmin:
    def test_stats_rbac(self, learner, admin_h):
        assert requests.get(f"{API}/admin/stats").status_code == 401
        assert requests.get(f"{API}/admin/stats", headers=learner["h"]).status_code == 403
        r = requests.get(f"{API}/admin/stats", headers=admin_h)
        assert r.status_code == 200
        d = r.json()
        assert d["registered_users"] >= 1 and len(d["by_lesson"]) == 14

    def test_put_rbac(self, learner, admin_h):
        lesson = requests.get(f"{API}/lessons/lesson-14", headers=admin_h).json()
        body = {k: v for k, v in lesson.items() if k != "id"}
        assert requests.put(f"{API}/admin/lessons/lesson-14", json=body).status_code == 401
        assert requests.put(f"{API}/admin/lessons/lesson-14", json=body, headers=learner["h"]).status_code == 403

    def test_admin_edit_and_restore(self, admin_h, learner):
        orig = requests.get(f"{API}/lessons/lesson-14", headers=admin_h).json()
        body = {k: v for k, v in orig.items() if k != "id"}
        body["title"] = "TEST_Edited title"
        try:
            r = requests.put(f"{API}/admin/lessons/lesson-14", json=body, headers=admin_h)
            assert r.status_code == 200 and r.json()["title"] == "TEST_Edited title"
            seen = requests.get(f"{API}/lessons/lesson-14", headers=learner["h"]).json()
            assert seen["title"] == "TEST_Edited title"
            bad = dict(body, category="nope")
            assert requests.put(f"{API}/admin/lessons/lesson-14", json=bad, headers=admin_h).status_code == 400
            badq = dict(body, question=dict(body["question"], correct_index=9))
            assert requests.put(f"{API}/admin/lessons/lesson-14", json=badq, headers=admin_h).status_code == 400
            assert requests.put(f"{API}/admin/lessons/nope", json=body, headers=admin_h).status_code == 404
        finally:
            restore = {k: v for k, v in orig.items() if k != "id"}
            rr = requests.put(f"{API}/admin/lessons/lesson-14", json=restore, headers=admin_h)
            assert rr.status_code == 200 and rr.json()["title"] == orig["title"]


# AI (single call only, to save credit)
class TestAI:
    def test_ai_requires_auth(self):
        assert requests.post(f"{API}/ai/run", json={"prompt": "hello world", "model": "gpt"}).status_code == 401

    def test_ai_validation(self, learner):
        r = requests.post(f"{API}/ai/run", json={"prompt": "hi", "model": "gpt"}, headers=learner["h"])
        assert r.status_code == 422
        r = requests.post(f"{API}/ai/run", json={"prompt": "hello world", "model": "llama"}, headers=learner["h"])
        assert r.status_code == 422

    def test_ai_stream_gemini(self, learner):
        r = requests.post(f"{API}/ai/run", json={"prompt": "Say hello in one short sentence.", "model": "gemini", "mode": "try"},
                          headers=learner["h"], stream=True, timeout=90)
        assert r.status_code == 200
        body = r.text
        assert "[DONE]" in body
        # AI credit may be exhausted: accept either streamed text or graceful error event
        assert '"t"' in body or "The AI service is unavailable" in body, body[:500]
        print("AI body:", body[:200])
