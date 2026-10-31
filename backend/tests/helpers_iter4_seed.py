# Helper: create an unverified learner + a verify token for UI testing (prints JSON)
import os, uuid, json, hashlib, secrets, requests
from datetime import datetime, timezone, timedelta
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv("/app/frontend/.env"); load_dotenv("/app/backend/.env")
API = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") + "/api"
mdb = MongoClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]
mdb.signup_log.delete_many({})
email = f"test_it4ui_{uuid.uuid4().hex[:6]}@example.com"
r = requests.post(f"{API}/auth/register", json={"email": email, "password": "Learner123!", "first_name": "Uitest",
                  "country": "Kenya", "work_function": "Other", "ai_experience": "Beginner"}).json()
tok = secrets.token_urlsafe(32); now = datetime.now(timezone.utc)
mdb.email_verify_tokens.insert_one({"token_hash": hashlib.sha256(tok.encode()).hexdigest(), "user_id": r["user"]["id"],
                                    "created_at": now, "expires_at": now + timedelta(hours=24)})
mdb.signup_log.delete_many({})
print(json.dumps({"email": email, "token": r["token"], "verify": tok}))
