# Iteration 6: real email delivery (Resend test inbox) for register / forgot-password / resend-verification
import os, time, hashlib, secrets, json
from datetime import datetime, timezone, timedelta
import pytest, requests
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv("/app/frontend/.env"); load_dotenv("/app/backend/.env")
API = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") + "/api"
mdb = MongoClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]
EMAIL = "delivered@resend.dev"
LOG = "/var/log/supervisor/backend.err.log"
FAIL_MARKERS = ("Welcome email failed", "Email send failed", "Password reset email failed",
                "Verification email failed", "Email paused")
STATE = {}


def _log_size():
    return os.path.getsize(LOG)


def _new_log(offset, wait=8):
    time.sleep(wait)
    with open(LOG, "rb") as f:
        f.seek(offset)
        return f.read().decode(errors="replace")


@pytest.fixture(scope="module", autouse=True)
def setup_cleanup():
    u = mdb.users.find_one({"email": EMAIL})
    if u:
        mdb.email_verify_tokens.delete_many({"user_id": str(u["_id"])})
        mdb.password_reset_tokens.delete_many({"user_id": str(u["_id"])})
        mdb.users.delete_one({"_id": u["_id"]})
    mdb.signup_log.delete_many({})
    yield


def test_register_sends_welcome():
    off = _log_size()
    r = requests.post(f"{API}/auth/register", json={"email": EMAIL, "password": "Learner123!", "first_name": "Resendtest",
                      "country": "Kenya", "work_function": "Other", "ai_experience": "Beginner"})
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["user"]["email"] == EMAIL and d["user"]["email_verified"] is False
    STATE["token"], STATE["uid"] = d["token"], d["user"]["id"]
    log = _new_log(off)
    print(log[-1500:])
    assert not any(m in log for m in FAIL_MARKERS), log
    assert mdb.email_verify_tokens.count_documents({"user_id": STATE["uid"]}) == 1


def test_forgot_password_sends():
    off = _log_size()
    r = requests.post(f"{API}/auth/forgot-password", json={"email": EMAIL})
    assert r.status_code == 200
    assert r.json()["message"] == "If an account exists for this email, a reset link has been sent."
    log = _new_log(off)
    print(log[-1500:])
    assert not any(m in log for m in FAIL_MARKERS), log
    assert mdb.password_reset_tokens.count_documents({"user_id": STATE["uid"]}) == 1


def test_resend_verification_sends():
    off = _log_size()
    r = requests.post(f"{API}/auth/resend-verification", headers={"Authorization": f"Bearer {STATE['token']}"})
    assert r.status_code == 200, r.text
    assert "sent a new confirmation email" in r.json()["message"]
    log = _new_log(off)
    print(log[-1500:])
    assert not any(m in log for m in FAIL_MARKERS), log
    assert mdb.email_verify_tokens.count_documents({"user_id": STATE["uid"]}) == 2


def test_seed_verify_token_for_ui():
    tok = secrets.token_urlsafe(32); now = datetime.now(timezone.utc)
    mdb.email_verify_tokens.insert_one({"token_hash": hashlib.sha256(tok.encode()).hexdigest(), "user_id": STATE["uid"],
                                        "created_at": now, "expires_at": now + timedelta(hours=24)})
    with open("/tmp/iter6_state.json", "w") as f:
        json.dump({"token": STATE["token"], "verify": tok, "uid": STATE["uid"]}, f)
