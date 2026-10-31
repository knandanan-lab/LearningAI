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

## Iteration 2 (June 2026)
- Password reset by email link (1-hour, single-use, max 3 per hour) via Emergent Managed Email (Resend), sender name "AI in 15", reply-to dan@futureoptions.org. Gmail SMTP was tried, but this hosting blocks SMTP logins.
- Admin change-own-password screen (/admin/password); a reset or change signs out other sessions (token_version)
- Lesson position renumbers the other lessons automatically; admin table shows Yes / Maybe / Not yet reflection counts
- Sending email is BLOCKED until Universal Key credit is topped up (402 insufficient_credits)

## Iteration 3 (June 2026)
- Learners can change their password on My profile (Google-only users see a note); admin can create and copy a one-hour reset link (Admin page)
- Welcome email with a Day 1 link is sent in the background on registration and on first Google sign-in (blocked until Universal Key credit is added)
- Tested: iteration_3, 100%

## Iteration 4 (June 2026) - security follow-up
- Sign-up limits: 5 per IP per hour (real IP taken TRUSTED_PROXY_HOPS from the right of X-Forwarded-For), 60 per hour overall; in-app AI cap of 500 requests/day across all learners plus 30/user
- Email confirmation: email-registered learners must confirm (link in welcome email, 24h; resend up to 3/hour) before using in-app AI; Google users, admin and password-reset users count as confirmed
- Tested: iteration_4 + iteration_5

## Backlog
- P1: Update FRONTEND_URL to the live domain when publishing (reset links use it)
- P2: Admin view of reflection answers (aggregate); export of stats
