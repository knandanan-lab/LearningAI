# AI in 15 — PRD

## Original problem statement
Mobile-friendly MVP “AI in 15” for Future Options Consulting Ltd: helps working professionals in Africa learn practical AI skills in ~15 min/day. British English. Core journey: account → choose task/lesson → learn → copy/adapt prompt → quick check → record completion/progress. 14-lesson pathway “AI at Work: Foundations”, task browser, prompt library with favourites, responsible-AI guidance, privacy notice, secure admin (edit lessons/MCQs/categories/order, aggregate stats). Out of scope: payments, reminders, certificates, social, video, translation, gamification. Do not publish without instruction.

## User choices
- Admin login: knandanan@gmail.com (password in backend/.env ADMIN_PASSWORD, seeded only if missing)
- Country: dropdown, East African countries first, rest of Africa, then Other
- Later additions: in-app AI “Try it” + “Feedback on my prompt” (GPT 6 Luna, Claude Sonnet 5.5, plus Gemini 3 Flash) via Emergent LLM key; Google sign-in alongside email login; PayPal declined (no payments)

## Architecture
- FastAPI + MongoDB (users, lessons, progress, favourites, login_attempts, ai_usage); JWT Bearer (7 days) stored in localStorage
- Lessons seeded from backend/lessons_seed.py only if the lessons collection is empty; admin edits are stored in MongoDB
- React (CRA) pages: Welcome, Login, Register, CompleteProfile, Dashboard, Pathway, Tasks, Lesson, Prompts, Profile, Privacy, Responsible AI, Admin, AdminLessonEdit
- AI: POST /api/ai/run (SSE streaming), 30 requests per user per day (AI_DAILY_LIMIT); prompts not stored

## Implemented (June 2026)
- All core journey features, 14 full lessons, admin editor + stats, Google sign-in, AI try/feedback
- Tested: iteration_1 — all frontend flows pass; brute-force lockout fixed afterwards (now locks by email after 5 failures)

## Backlog
- P1: Admin order re-sequencing / duplicate order validation; in-app password change & reset for admin/learners
- P2: Admin view of reflection answers (aggregate); export of stats
