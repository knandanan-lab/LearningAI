# Iteration 7 helper: seed / cleanup UI test learners  (python helpers_iter7_seed.py seed|complete-last|cleanup)
import sys
import requests
from pymongo import MongoClient

BASE = [l.split("=", 1)[1].strip() for l in open("/app/frontend/.env") if l.startswith("REACT_APP_BACKEND_URL")][0]
env = dict(l.strip().split("=", 1) for l in open("/app/backend/.env") if "=" in l)
db = MongoClient(env["MONGO_URL"].strip('"'))[env["DB_NAME"].strip('"')]
EMAIL, PW = "test_ui7@example.com", "Learner123!x"

cmd = sys.argv[1]
if cmd == "seed":
    db.signup_log.delete_many({}); db.login_attempts.delete_many({})
    r = requests.post(f"{BASE}/api/auth/register", json={"first_name": "UI7", "email": EMAIL, "password": PW,
                      "country": "Kenya", "work_function": "Other", "ai_experience": "Beginner"})
    print(r.status_code, r.text[:120])
    db.signup_log.delete_many({})
elif cmd == "complete-last":
    tok = requests.post(f"{BASE}/api/auth/login", json={"email": EMAIL, "password": PW}).json()["token"]
    last = sorted(db.lessons.find({}, {"id": 1, "order": 1}), key=lambda x: x["order"])[-1]["id"]
    r = requests.post(f"{BASE}/api/progress/{last}", json={"reflection": "Yes"}, headers={"Authorization": f"Bearer {tok}"})
    print("completed", last, r.status_code)
elif cmd == "cleanup":
    for u in db.users.find({"email": {"$regex": r"^test_ui7.*@example\.com$"}}):
        uid = str(u["_id"])
        for c in ("feedback", "progress", "favourites", "email_verify_tokens"):
            db[c].delete_many({"user_id": uid})
    print(db.users.delete_many({"email": {"$regex": r"^test_ui7.*@example\.com$"}}).deleted_count)
    db.signup_log.delete_many({}); db.login_attempts.delete_many({})
