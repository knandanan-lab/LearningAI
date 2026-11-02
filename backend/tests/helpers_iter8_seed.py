# Iteration 8 helper: seed / complete / cleanup UI test learners  (python helpers_iter8_seed.py seed|complete-last|complete-all|cleanup)
import sys
import requests
from pymongo import MongoClient

BASE = [l.split("=", 1)[1].strip() for l in open("/app/frontend/.env") if l.startswith("REACT_APP_BACKEND_URL")][0]
env = dict(l.strip().split("=", 1) for l in open("/app/backend/.env") if "=" in l)
db = MongoClient(env["MONGO_URL"].strip('"'))[env["DB_NAME"].strip('"')]
EMAIL, PW = "test_ui8@example.com", "Learner123!x"


def token():
    return requests.post(f"{BASE}/api/auth/login", json={"email": EMAIL, "password": PW}).json()["token"]


cmd = sys.argv[1]
if cmd == "seed":
    db.signup_log.delete_many({}); db.login_attempts.delete_many({})
    r = requests.post(f"{BASE}/api/auth/register", json={"first_name": "UI8", "email": EMAIL, "password": PW,
                      "country": "Kenya", "work_function": "Other", "ai_experience": "Beginner"})
    print(r.status_code, r.text[:120])
    db.signup_log.delete_many({})
elif cmd in ("complete-last", "complete-all"):
    tok = token()
    lessons = [l["id"] for l in sorted(db.lessons.find({}, {"id": 1, "order": 1}), key=lambda x: x["order"])]
    for lid in (lessons[-1:] if cmd == "complete-last" else lessons):
        r = requests.post(f"{BASE}/api/progress/{lid}", json={"reflection": "Yes"}, headers={"Authorization": f"Bearer {tok}"})
        print("completed", lid, r.status_code)
elif cmd == "cleanup":
    for u in db.users.find({"email": {"$regex": r"^test_ui8.*@example\.com$"}}):
        uid = str(u["_id"])
        for c in ("feedback", "progress", "favourites", "email_verify_tokens"):
            db[c].delete_many({"user_id": uid})
    print(db.users.delete_many({"email": {"$regex": r"^test_ui8.*@example\.com$"}}).deleted_count)
    db.signup_log.delete_many({}); db.login_attempts.delete_many({})
