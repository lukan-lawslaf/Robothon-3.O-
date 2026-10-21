# Robothon backend

Shared authentication, quizzes, MCQ answers, checkpoints, review tickets, bonus points and leaderboard for the React frontend.

**Start with [SUPABASE_SETUP.md](SUPABASE_SETUP.md)** to create your Supabase project, apply the migration, configure backend environment variables and provision accounts. Supabase is the default backend; there is no automatic fallback to demo data.

## Roles

| Role | Permissions |
|---|---|
| TEAM_LEADER | Answer/submit a team quiz and request checkpoint reviews |
| TEAM_MEMBER | View the team and request checkpoint reviews; quizzes honor teamLeaderOnly |
| ADMIN | Assign, approve/reject checkpoint reviews and award mini-game bonuses |
| SUPER_ADMIN | All checkpoint admin permissions plus quiz creation, imports, lifecycle controls, monitoring and qualification |

Quiz administration is enforced server-side. Client role headers are ignored.

## Commands

Use Node.js 22+ and run `npm install`.

- `npm run api` — load `.env` and run the backend on port 8787.
- `npm test` — API, quiz and local PostgreSQL/RLS tests.
- `npm run supabase:provision -- accounts.local.json` — create event accounts in the configured project.
- `npm run provision -- input.local.json data/accounts.local.json` — optional hashed account file for explicit local development.

Start frontend separately with `npm run dev` on port 3000, or build it and let this backend serve `frontend/dist`. The old backend UI is under `/legacy`; both interfaces use the same API.

The runtime refuses production local mode. Development-only JSON storage requires `DATA_BACKEND=local`.

See [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md) for the application contract and [quiz-upload-template.json](quiz-upload-template.json) for question bank imports.
