# Connect Robothon to Supabase

Use this guide to configure a new Supabase project or manage accounts in an existing one. Backend keys belong in the ignored `.env` file. Database imports do not require a Git push.

## 1. Create your project and apply the migration

Create a Supabase project, open its SQL Editor, and run the complete contents of:

`supabase/migrations/202610190001_platform.sql`

Run this migration once on a new project. It creates:
- Supabase Auth-linked `profiles` with server-controlled roles and team membership.
- `teams`, private competition storage, and revoked-session records.
- Reporting views for quizzes, questions, answers, attempts, checkpoint reviews, team checkpoints, bonuses and audit events.
- Row Level Security and restricted database functions.

Disable public sign-ups in Supabase Auth because event accounts are provisioned by organizers. No signup form is exposed by Robothon, and users without a provisioned profile cannot access the platform.

## 2. Configure the backend

Use Node.js 22 or newer. In the backend directory:

```powershell
npm install
Copy-Item .env.example .env
```

Fill in `backend/.env` using your project's Connect/API Keys settings:

```dotenv
DATA_BACKEND=supabase
PORT=8787
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
SUPABASE_SECRET_KEY=YOUR_SECRET_KEY
```

The legacy `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` names are also accepted.

Keep the secret/service-role key only in the backend environment. Do not put it in frontend files, a `VITE_*` variable, screenshots or Git. The `.env` file is ignored. Hosted deployments should set these variables in their server environment.

## 3. Provision accounts

Copy `supabase/accounts.example.json` to `accounts.local.json` in the backend folder. Replace every example email, name and password. Use a unique password of at least 12 characters for each account.

Use one or two accounts with `SUPER_ADMIN`, as many checkpoint accounts with `ADMIN` as needed, and participant accounts with `TEAM_LEADER` / `TEAM_MEMBER`. All accounts in a team must use the same `teamId` and `teamName`; each team has one leader.

```powershell
npm run supabase:provision -- accounts.local.json
```

This creates confirmed Supabase Auth users and inserts their profiles and teams. Passwords are handled by Supabase Auth, not stored in application tables. The example file is never seeded automatically. The input file contains passwords and is Git-ignored; remove it or keep it in secure storage after provisioning, and share credentials privately.

The command creates new users; it does not overwrite existing ones. If a batch partly succeeds, remove the successfully created accounts from the input before retrying.

To add a second super admin later, provision another account with that role. For an existing account, an authorized project operator can change `profiles.role` in Supabase's Table Editor. Roles are read from the database on authenticated requests; browser metadata and submitted role headers cannot grant privileges.

### Import team leaders from the registration CSV

For the Team Grid registration export, use the first participant block on each row: first `Full Name`, first `College Email`, and first `Enrollment Number`. The first email becomes the leader login and the enrollment number becomes its initial password, as requested for this event. Enrollment numbers remain strings, preserving any leading zeroes. This import creates one `TEAM_LEADER` per team; other member columns do not create accounts.

```powershell
# Validate the file and check for existing-account conflicts without writing:
npm run supabase:import-teams -- "C:\path\registration.csv" --check
# Create the teams, Auth users and profiles:
npm run supabase:import-teams -- "C:\path\registration.csv" --apply
```

Repeated member-column headers are handled by position. Invalid rows and conflicting duplicates stop the import before writes. Exact duplicate registrations are reported and imported once. Completed imports can be rerun without resetting passwords or duplicating teams; partial imports resume only accounts marked by this importer. Existing unrelated accounts and admin roles are never overwritten.

These registration passwords follow the configured Supabase password policy (minimum six characters in the importer), rather than the separate manual account file's 12-character requirement. Passwords are sent to Supabase Auth and are not copied to profiles, teams or reports. The ignored `data/registration-import.local.json` report contains account IDs and import results, with no passwords. Inspect teams/profiles in Table Editor and logins in Authentication → Users. No additional SQL table or manual SQL insert is needed once the platform migration is installed.

## 4. Start both apps

Terminal 1, in `backend`:

```powershell
npm run api
```

Terminal 2, in `frontend`:

```powershell
npm install
npm run dev
```

Open [the frontend](http://localhost:3000/login). Vite forwards `/api` to port 8787. Both admin types use **Admin / Super Admin**; the account determines access.

For a single-server preview, run `npm run build` in frontend, then `npm run api` in backend. The backend serves the built app at [port 8787](http://localhost:8787/login). Deploy the Node backend alongside the compiled frontend under the same origin.

No Supabase variables are needed in the frontend. All quiz/checkpoint mutations go through the authenticated backend. The legacy backend interface is available at `/legacy`, using the same APIs and database.

## 5. Test the event flow

1. Sign in as a checkpoint admin: the review queue and bonuses are available, but quiz controls are absent.
2. Sign in as a super admin in a separate tab: publish/start a quiz using Quiz controls.
3. Sign in as a team leader in another tab: open Quizzes, join, select MCQ answers, refresh and reopen Quizzes to recover the attempt, then submit.
4. Request a checkpoint review from the participant dashboard; approve it from the checkpoint admin tab.
5. Confirm that only that team's points and next checkpoint change.
6. End the quiz and finalize qualification from the super admin account.

The initial three-question elimination quiz is seeded only when competition storage is empty. To add a round, create a draft, import a JSON question bank using `quiz-upload-template.json`, then publish it. Supabase users and demo users are separate; local demo passwords do not work in Supabase mode.

## Persistence and permissions

`competition_state` is a private PostgreSQL JSONB snapshot used by the existing quiz engine. Its revision is checked in a database transaction before each update. Requests use separate snapshots, retry concurrent-write conflicts, and wait for the commit before reporting success. Read-only reporting views make individual entities inspectable in Supabase's SQL Editor. This design preserves the existing engine; it is not a normalized per-answer write model, so load-test expected event traffic before deployment.

Profiles and teams are relational tables. Users may read their own profile/team through RLS but cannot write roles, scores, answer keys or checkpoints directly. The server secret is the only database writer; backend authorization controls which application actions are permitted. Public leaderboards contain display names and scores, not credentials or answer keys.

Supabase sessions refresh automatically in the frontend. Session IDs remain stable during refresh, so attempts can resume. Sign-out revokes API access immediately and releases active attempts for a new login. After closing a tab without signing out, log in again and click **Resume team attempt**. The server transfers the same attempt to the current session, keeping saved answers and the original deadline; the old session can no longer answer or submit. The super admin can also release a session through the attempt monitor. No extra SQL migration is required for session transfers.

Quiz deadlines remain server-authoritative. Pausing disables answers while the deadline continues to run, matching the existing backend behavior. Qualification stays pending until the super admin finalizes results.

## Local preview without a Supabase project

Explicitly set `DATA_BACKEND=local` in `.env` (development only). The backend uses the existing development accounts and a local JSON state file. This mode is rejected when `NODE_ENV=production`. Supabase configuration/database failures never silently switch to local data.

Demo accounts:
| Role | Email | Password |
|---|---|---|
| Super admin | admin@robothon.local | Admin123! |
| Checkpoint admin | checkpoint1@robothon.local | Checkpoint123! |
| Checkpoint admin | checkpoint2@robothon.local | Checkpoint123! |
| Team leader | leader@apex.local | Apex123! |
| Team member | member@apex.local | Apex123! |

## Verification

`npm test` runs quiz, HTTP authorization and checkpoint tests plus PostgreSQL migration/RLS/concurrency tests in a local PGlite runtime. These tests do not need project keys. `npm run build` in frontend type-checks and bundles the UI.

A live Supabase connection must still be checked after the project, migration, keys and accounts are configured.

References: [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys), [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security), [user management](https://supabase.com/docs/guides/auth/managing-user-data).
