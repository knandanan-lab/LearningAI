# Auth testing notes
- Email/password: POST /api/auth/login or /api/auth/register returns {token, user}. Frontend stores token in localStorage key `ai15_token` and sends `Authorization: Bearer <token>`.
- Admin: see /app/memory/test_credentials.md.
- Google (Emergent managed): button redirects to auth.emergentagent.com; on return `#session_id=...` is exchanged via POST /api/auth/google which returns the same {token, user}. Real Google flow cannot be automated; verify the button redirect and that /api/auth/google with a bad session_id returns 401.
- New Google users without country/work function/experience are redirected to /complete-profile.
