# ROBOTHON 3.0 frontend

React/Vite participant and administrator portal connected to the backend and Supabase.

## Run

Use Node.js 22+:

```powershell
npm install
npm run dev
```

Open [http://localhost:3000/login](http://localhost:3000/login). Start the sibling backend on port 8787; Vite forwards `/api` requests. Configure Supabase using [the backend setup guide](../backend/SUPABASE_SETUP.md). The frontend needs no Supabase keys.

For production preview, `npm run build` creates `dist`; the backend serves this app from port 8787. `npm run build` also runs TypeScript checks.

Use port **3000** for development or **8787** for the built app; both use the connected backend. Port 8788 was an isolated test preview and should not be used for the Supabase competition. Restart the backend after changing its server files.

## Login and permissions

The login retains two tabs: **Participant Team** and **Admin / Super Admin**. Use email and password. The server assigns the role from the provisioned account:

- Participants view their own team's checkpoints and quizzes.
- Checkpoint admins assign/review checkpoints and award bonuses.
- Super admins also create/import/publish quizzes, start/pause/resume/end tests and finalize qualification.

There is no role switcher. Routes are guarded, and the backend independently enforces permissions. Sessions and tokens are scoped to a browser tab; refresh restores the verified account.

The admin portals use the orange theme with review counts, team/checkpoint search, review status filters and bonus controls. The animated bot is reserved for the participant dashboard.

Super admins can choose **Basic robotics** to publish five ready-made MCQs immediately, or **Custom question bank** to upload JSON. [Download the example quiz](../backend/examples/basic-robotics-quiz.json) for five basic questions, five minutes, one point each and a ten-second opening countdown. Use **View questions** to inspect the bank and answer keys.

After ending or finalizing a round, **Reset & republish** clears that round's attempts, answers, scores and qualification and returns it to READY. Questions and settings are kept, as are checkpoint/bonus points and other rounds. Start it again to launch a fresh participant countdown. This uses the existing Supabase schema; no additional SQL is needed.

## Pages

| Route | Access |
|---|---|
| /login | Participant or staff login |
| /team-dashboard | Participant checkpoints and MCQ quiz waiting room/test/results |
| /admin-dashboard | Checkpoint administration; quiz controls only for super admins |
| /leaderboard | Public scores and finalized/pending qualification |

Checkpoint approvals and quiz results are shared across devices through the backend. Starting a test automatically takes signed-in participants from any page to the live round, shows an orange 10-to-0 countdown (or the round's configured countdown), and opens eligible team leaders' attempts. Quiz lifecycle events arrive through SSE, with 2-second polling as a fallback. Refreshing or joining late uses the remaining server time rather than restarting the countdown. MCQ answers save individually; attempts survive page reloads. Timer and scoring come from the server.

The participant dashboard also shows the upcoming quiz and a waiting-room link before it starts. A custom draft needs questions and **Publish quiz** before it appears to participants; **Start test** then launches it. A finished round displays results until a super admin resets and republishes it or publishes a new quiz.

Each team can answer from one signed-in session at a time. After closing the test tab or signing in in another browser, click **Resume team attempt** to continue with saved answers and the original time limit. This explicitly transfers the attempt to the current session and stops the old session from answering/submitting; it never resets the test or reopens submitted attempts. Automatic page refreshes do not transfer control between sessions. Super admins can also release sessions from **View attempts**. API requests time out after 15 seconds so a stalled connection cannot leave **Opening…** disabled indefinitely. Close or sign out of participant verification tabs before handing the portal back to an organizer.

Run `npm test` for countdown, round selection, and reload timing regressions. Tests and local preview data do not change the connected Supabase competition.

The old mock services/components are retained only as unused design scaffolding. Routed pages use `services/api.ts`, `authService.ts`, `backendService.ts`, `quizService.ts` and the server-backed snapshot in `stateStore.ts`; no browser-local scoring is authoritative.

The existing 3D models and login video remain under `public`.
