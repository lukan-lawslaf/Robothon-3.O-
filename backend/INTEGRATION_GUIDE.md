# Frontend / backend contract

The React frontend uses same-origin `/api` requests. Vite forwards these to port 8787 during development; the backend serves the built frontend for deployment.

## Authentication

- `POST /api/auth/login`: email, password, portal (`participant` or `admin`). Returns token, optional Supabase refreshToken and account.
- `GET /api/auth/me`: verified profile and role.
- `POST /api/auth/refresh`: refreshToken. Returns fresh credentials and verified profile.
- `POST /api/auth/logout`: revokes the current session and releases active attempts.

Send `Authorization: Bearer <token>`. No x-role, x-team-id or x-user-id value is trusted. Supabase profiles are provisioned by organizers; user metadata cannot grant access.

## Competition

- `GET /api/platform`: public team totals, the signed-in team's checkpoints and its own review tickets; admins receive the full review queue.
- `GET /api/leaderboard`: public aggregate scores and qualification status.
- `POST /api/checkpoints/review-request`: checkpointId; team identity comes from the session.
- `POST /api/admin/checkpoints/assign`: ticketId.
- `POST /api/admin/checkpoints/verify`: ticketId and approved boolean.
- `POST /api/admin/minigames/award`: teamId, gameName, points (integer 1–50).

Approvals award once, unlock the next checkpoint only for that team, and retain reviewer identity. Rejections reopen the checkpoint. Claims prevent two admins from resolving another admin's assigned ticket.

## Quiz

Public catalog: `GET /api/quizzes/active`.

Participant endpoints under `/api/quizzes/:id`: details, `POST join`, `POST resume`, `POST answer` (questionId, selectedOption), `POST submit`, `GET my-attempt`. Questions show their prompt and options but omit correctOption. Attempts and deadlines are server-authoritative.

`POST resume` explicitly transfers the authenticated participant's existing active team attempt to their current session after closing/reopening a tab or signing in elsewhere. It preserves answers and the original deadline, works while LIVE or PAUSED, and immediately rejects writes from the old session. It cannot create another attempt or reopen a submitted/expired test. Team/session identity is taken only from verified authentication. Automatic joins never take over another session. `ATTEMPT_SESSION_CHANGED` invalidates participant views after the database commit.

All `/api/admin/quizzes` and `/api/admin/questions` routes require SUPER_ADMIN, including reads. The existing question bank, configuration, stage, live-monitor, session invalidation and lifecycle API remains available. The frontend exposes create/import/publish/start/pause/resume/end/finalize and attempt monitoring.

Clients poll live state every 2–3 seconds. SSE emits invalidations only; private attempt payloads are never broadcast publicly. Qualification remains pending until finalization.

## Supabase

See [SUPABASE_SETUP.md](SUPABASE_SETUP.md). Every request loads a fresh private competition snapshot; mutations commit with a PostgreSQL revision check and retry conflicts before responding. Restarting the API does not erase Supabase state. Accounts and teams live in Supabase Auth/profiles/teams.

The server-only secret key must never enter a frontend build. `supabase/migrations/202610190001_platform.sql` is the active database migration; `server/schema.sql` is an older standalone relational sketch and is not the Supabase setup script.
