# Iteration 7: pilot feedback API, admin feedback, icons/manifest
import os
import uuid
import pytest
import requests
from pymongo import MongoClient

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
ADMIN = {"email": "knandanan@gmail.com", "password": "z-lQI9UdjCj48kvM"}


def _env(key):
    for line in open("/app/backend/.env"):
        if line.startswith(key + "="):
            return line.split("=", 1)[1].strip().strip('"')


db = MongoClient(_env("MONGO_URL"))[_env("DB_NAME")]


@pytest.fixture(scope="module")
def learner():
    db.signup_log.delete_many({})
    db.login_attempts.delete_many({})
    email = f"test_fb_{uuid.uuid4().hex[:8]}@example.com"
    r = requests.post(f"{BASE_URL}/api/auth/register", json={
        "first_name": "TESTFB", "email": email, "password": "Learner123!x",
        "country": "Kenya", "work_function": "Other", "ai_experience": "Beginner",
        "consent": True, "privacy_consent": True})
    assert r.status_code in (200, 201), r.text
    tok = r.json()["token"]
    uid = r.json()["user"]["id"]
    yield {"h": {"Authorization": f"Bearer {tok}"}, "id": uid, "email": email}
    db.feedback.delete_many({"user_id": uid})
    db.progress.delete_many({"user_id": uid})
    db.users.delete_many({"email": email})
    db.signup_log.delete_many({})


@pytest.fixture(scope="module")
def admin_h():
    db.login_attempts.delete_many({})
    r = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN)
    assert r.status_code == 200
    return {"Authorization": f"Bearer {r.json()['token']}"}


class TestIcons:
    @pytest.mark.parametrize("p", ["/favicon.ico", "/favicon-32.png", "/apple-touch-icon.png",
                                   "/icon-192.png", "/icon-512.png", "/manifest.json"])
    def test_asset(self, p):
        r = requests.get(BASE_URL + p)
        assert r.status_code == 200
        assert "text/html" not in r.headers.get("content-type", "")

    def test_manifest(self):
        m = requests.get(BASE_URL + "/manifest.json").json()
        assert "Learning AI Africa" in m["name"] and m["short_name"] == "Learning AI Africa"
        assert m["theme_color"] == "#0f4c3a"

    def test_index_head(self):
        h = requests.get(BASE_URL + "/").text
        for s in ["favicon.ico", "favicon-32.png", "apple-touch-icon.png", "manifest.json", "#0f4c3a"]:
            assert s in h


class TestFeedback:
    def test_requires_auth(self):
        assert requests.get(f"{BASE_URL}/api/feedback").status_code in (401, 403)
        assert requests.put(f"{BASE_URL}/api/feedback", json={"rating": 3}).status_code in (401, 403)

    def test_initial_null(self, learner):
        r = requests.get(f"{BASE_URL}/api/feedback", headers=learner["h"])
        assert r.status_code == 200 and r.json() is None

    @pytest.mark.parametrize("body", [{"rating": 0}, {"rating": 5}, {"rating": 3, "comment": "x" * 1001}, {}])
    def test_validation(self, learner, body):
        assert requests.put(f"{BASE_URL}/api/feedback", json=body, headers=learner["h"]).status_code == 422

    def test_save_update_one_per_user(self, learner):
        r = requests.put(f"{BASE_URL}/api/feedback", json={"rating": 3, "comment": "TEST_ first"}, headers=learner["h"])
        assert r.status_code == 200
        g = requests.get(f"{BASE_URL}/api/feedback", headers=learner["h"]).json()
        assert g == {"rating": 3, "comment": "TEST_ first"}
        r = requests.put(f"{BASE_URL}/api/feedback", json={"rating": 4, "comment": "  TEST_ second  " + "y" * 900},
                         headers=learner["h"])
        assert r.status_code == 200
        g = requests.get(f"{BASE_URL}/api/feedback", headers=learner["h"]).json()
        assert g["rating"] == 4 and g["comment"].startswith("TEST_ second")
        assert db.feedback.count_documents({"user_id": learner["id"]}) == 1

    def test_admin_only(self, learner):
        assert requests.get(f"{BASE_URL}/api/admin/feedback", headers=learner["h"]).status_code == 403
        assert requests.get(f"{BASE_URL}/api/admin/feedback").status_code in (401, 403)

    def test_admin_view(self, learner, admin_h):
        requests.put(f"{BASE_URL}/api/feedback", json={"rating": 2, "comment": "TEST_ admin view"}, headers=learner["h"])
        r = requests.get(f"{BASE_URL}/api/admin/feedback", headers=admin_h)
        assert r.status_code == 200
        d = r.json()
        assert d["responses"] >= 1
        assert set(d["counts"]) == {"Very useful", "Useful", "Somewhat useful", "Not very useful"}
        assert d["counts"]["Somewhat useful"] >= 1
        c = [x for x in d["comments"] if x["comment"] == "TEST_ admin view"]
        assert c and c[0]["rating"] == "Somewhat useful" and len(c[0]["date"]) == 10
        assert set(c[0]) == {"rating", "comment", "date"}
        s = str(d)
        assert learner["email"] not in s and "TESTFB" not in s and "user_id" not in s
