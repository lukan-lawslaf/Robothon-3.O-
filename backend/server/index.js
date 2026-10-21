import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JsonQuizStore } from './quiz-store.js';
import { QuizError, QuizService } from './quiz-service.js';
import { AuthService } from './auth-service.js';
import { PlatformService } from './platform-service.js';
import { supabaseClients, SupabaseAuthService } from './supabase.js';
import { SupabaseQuizStore } from './supabase-store.js';
import { extractTeamsFromCsv } from './registration-parser.js';

const serverBootId = 'boot_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
const backendRoot = fileURLToPath(new URL('../', import.meta.url));
const frontendRoot = fileURLToPath(new URL('../../frontend/dist/', import.meta.url));
const body = async req => {
  if (req.parsedBody) return req.parsedBody;
  req.parsedBody = readBody(req);
  return req.parsedBody;
};
const readBody = async req => {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 1_000_000) throw new QuizError(413, 'BODY_TOO_LARGE', 'Request body is too large.');
  }
  try { return raw ? JSON.parse(raw) : {}; }
  catch { throw new QuizError(400, 'INVALID_JSON', 'Request body must be valid JSON.'); }
};

export function createApp({ store: rootStore, accounts = rootStore.accounts || [], auth: authAdapter }) {
  // Sessions are process-local. After a restart, allow saved attempts to bind to a new login.
  if (!authAdapter) rootStore.state.attempts.filter(a => a.status === 'ACTIVE').forEach(a => { a.sessionInvalidated = true; });
  let initialAccounts = [...accounts];
  if (!authAdapter && Array.isArray(rootStore.state?.registrationRoster)) {
    const existingIds = new Set(initialAccounts.map(a => a.id));
    for (const item of rootStore.state.registrationRoster) {
      if (item.leader?.email && item.leader?.enrollment && item.leader.enrollment !== 'N/A') {
        const leaderId = 'leader-' + item.teamId;
        if (!existingIds.has(leaderId)) {
          initialAccounts.push({
            id: leaderId,
            email: item.leader.email.trim().toLowerCase(),
            password: item.leader.enrollment.trim(),
            name: item.leader.name?.trim() || item.teamName,
            role: 'TEAM_LEADER',
            teamId: item.teamId,
            teamName: item.teamName,
            eligible: true
          });
          existingIds.add(leaderId);
        }
      }
    }
  }
  const auth = authAdapter || new AuthService(initialAccounts);
  const platform = new PlatformService(rootStore, accounts);
  const streams = new Set();
  const publish = (type, payload) => {
    // Send invalidations only; private attempts remain behind authenticated endpoints.
    const quizId = payload?.quizId || payload?.quiz?.id;
    streams.forEach(stream => {
      if (!stream.quizId || stream.quizId === quizId) stream.res.write('event: ' + type + '\ndata: ' + JSON.stringify(payload?.stageState ? { quizId, stageState: payload.stageState } : { quizId }) + '\n\n');
    });
  };
  const service = new QuizService(rootStore, { publish });
  const handleRequest = async (req, res, retries = 0) => {
    const events = [];
    const queueEvent = (type, payload) => events.push({ type, payload });
    let store = rootStore;
    let service = new QuizService(store, { publish: queueEvent });
    let platform = new PlatformService(store, accounts);
    const needsState = req.url.startsWith('/api/') && (!req.url.startsWith('/api/auth/') || req.url.startsWith('/api/auth/logout')) && !req.url.startsWith('/api/demo/') && !req.url.startsWith('/api/events');
    const json = async (status, value) => {
      if (needsState) await (store.commit ? store.commit() : store.save());
      // A participant reacting to an event must be able to read the committed state.
      // Failed database writes/retries discard their queued events.
      events.forEach(({ type, payload }) => publish(type, payload));
      res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
      res.end(JSON.stringify(value));
    };
    try {
      if (needsState && rootStore.fork) {
        store = await rootStore.fork();
        platform = new PlatformService(store, store.accounts);
        service = new QuizService(store, { publish: queueEvent });
      }
      const url = new URL(req.url, 'http://localhost');
      const parts = url.pathname.split('/').filter(Boolean).map(decodeURIComponent);
      const method = req.method;
      if (url.pathname === '/api/demo/accounts') return await json(404, { error: 'NOT_FOUND', message: 'Route was not found.' });
      const publicPath = ['/api/auth/login', '/api/auth/refresh', '/api/auth/verify-pin', '/api/auth/pin-status', '/api/demo/login', '/api/events', '/api/leaderboard', '/api/quizzes/active'].includes(url.pathname)
        || (method === 'GET' && /^\/api\/quizzes\/[^/]+\/(leaderboard|results|stage)$/.test(url.pathname));
      const identity = parts[0] === 'api' && !publicPath ? await auth.resolve(req) : null;
      const context = () => identity;
      if (url.pathname === '/health') return await json(200, { ok: true });
      if (method === 'POST' && ['/api/auth/login', '/api/demo/login'].includes(url.pathname)) return await json(200, await auth.login(await body(req)));
      if (method === 'POST' && url.pathname === '/api/auth/refresh') {
        if (!auth.refresh) throw new QuizError(401, 'SESSION_EXPIRED', 'Please sign in again.');
        return await json(200, await auth.refresh(await body(req)));
      }
      if (method === 'GET' && url.pathname === '/api/auth/pin-status') {
        return await json(200, { ok: true, bootId: serverBootId, configured: true });
      }
      if (method === 'POST' && url.pathname === '/api/auth/verify-pin') {
        const input = await body(req);
        const entered = String(input?.pin || '').trim();
        const validPin = (process.env.OC_PIN || '849261').trim();
        // Static PIN 849261 is permanently valid and invariant across restarts
        if (entered === '849261' || (validPin && entered === validPin)) {
          return await json(200, { success: true, bootId: serverBootId });
        }
        return await json(403, { success: false, error: 'INVALID_PIN', message: 'Invalid OC Clearance PIN. Access Denied.' });
      }
      if (method === 'GET' && url.pathname === '/api/auth/me') return await json(200, { account: context() });
      if (method === 'POST' && url.pathname === '/api/auth/logout') {
        const current = context();
        store.state.attempts.filter(a => a.sessionId === current.sessionId && a.status === 'ACTIVE').forEach(a => { a.sessionInvalidated = true; });
        // Commit attempt release before revoking the token so conflict retries remain authenticated.
        await (store.commit ? store.commit() : store.save());
        return await json(200, await auth.logout(req));
      }
      if (url.pathname === '/api/events') {
        res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' });
        res.write(': connected\n\n');
        const stream = { res, quizId: url.searchParams.get('quizId') };
        streams.add(stream);
        req.on('close', () => streams.delete(stream));
        return;
      }
      if (method === 'GET' && url.pathname === '/api/leaderboard') return await json(200, { teams: platform.teams() });
      if (method === 'GET' && url.pathname === '/api/platform') return await json(200, platform.snapshot(context()));
      if (method === 'POST' && url.pathname === '/api/checkpoints/review-request') return await json(201, platform.request(context(), (await body(req)).checkpointId));
      if (method === 'POST' && url.pathname === '/api/admin/checkpoints/assign') return await json(200, platform.assign(context(), (await body(req)).ticketId));
      if (method === 'POST' && url.pathname === '/api/admin/checkpoints/verify') {
        const input = await body(req);
        return await json(200, platform.verify(context(), input.ticketId, input.approved));
      }
      if (method === 'POST' && url.pathname === '/api/admin/minigames/award') return await json(200, platform.bonus(context(), await body(req)));
      if (method === 'POST' && url.pathname === '/api/admin/minigames/deduct') return await json(200, platform.deductPoints(context(), await body(req)));
      if (method === 'POST' && url.pathname === '/api/admin/marks/remove') return await json(200, platform.removeMark(context(), await body(req)));
      if (method === 'GET' && url.pathname === '/api/quizzes/active') return await json(200, { quizzes: store.state.quizzes.filter(q => q.status !== 'DRAFT').map(q => service.publicQuiz(q)) });
      if (parts[0] === 'api' && parts[1] === 'quizzes') {
        const id = parts[2], action = parts[3];
        const quiz = service.quizOrThrow(id);
        if (method === 'GET' && !action) {
          context();
          return await json(200, { quiz: service.publicQuiz(quiz), questions: ['LIVE', 'PAUSED', 'RESULTS', 'FINALIZED'].includes(quiz.status) ? service.publicQuestions(id) : [] });
        }
        if (method === 'GET' && ['leaderboard', 'results'].includes(action)) return await json(200, service.leaderboard(id));
        if (method === 'GET' && action === 'stage') return await json(200, service.getStage(id));
        if (method === 'GET' && action === 'my-attempt') return await json(200, service.myAttempt(context(), id));
        if (method === 'POST' && action === 'join') return await json(200, service.join(context(), id));
        if (method === 'POST' && action === 'resume') return await json(200, service.resumeAttempt(context(), id));
        if (method === 'POST' && action === 'submit') return await json(200, service.submit(context(), id));
        if (method === 'POST' && action === 'answer') { const input = await body(req); return await json(200, service.answer(context(), id, input.questionId, input.selectedOption)); }
      }
      if (parts[0] === 'api' && parts[1] === 'admin') {
        const admin = context();
        service.adminOrThrow(admin);
                if (parts[2] === 'registrations') {
          // Remove single team from database and roster
          if (parts[3] === 'teams' && parts[4] && method === 'DELETE') {
            const teamId = decodeURIComponent(parts[4]);
            const prevCount = (store.state.registrationRoster || []).length;
            store.state.registrationRoster = (store.state.registrationRoster || []).filter(t => t.teamId !== teamId);
            
            if (store.state.platform?.teams) {
              store.state.platform.teams = store.state.platform.teams.filter(t => t.id !== teamId);
            }
            if (store.state.platform?.checkpoints) {
              delete store.state.platform.checkpoints[teamId];
            }
            if (store.state.platform?.tickets) {
              store.state.platform.tickets = store.state.platform.tickets.filter(t => t.teamId !== teamId);
            }
            if (store.state.platform?.bonuses) {
              store.state.platform.bonuses = store.state.platform.bonuses.filter(b => b.teamId !== teamId);
            }
            if (auth.accounts) {
              auth.accounts = auth.accounts.filter(a => a.teamId !== teamId);
            }

            // Remove from Supabase DB tables if active
            if (auth.admin) {
              try {
                await auth.admin.from('profiles').delete().eq('team_id', teamId);
                await auth.admin.from('teams').delete().eq('id', teamId);
              } catch (err) {
                console.warn('Supabase DB delete notice:', err.message);
              }
            }

            await (store.commit ? store.commit() : store.save());
            return await json(200, {
              success: true,
              removedTeamId: teamId,
              count: (store.state.registrationRoster || []).length,
              roster: store.state.registrationRoster
            });
          }
          if (method === 'GET') {
            return await json(200, {
              roster: store.state.registrationRoster || [],
              source: store.state.registrationSource || null,
              updatedAt: store.state.registrationUpdatedAt || null,
            });
          }
          if (method === 'DELETE') {
            store.state.registrationRoster = [];
            store.state.registrationSource = null;
            store.state.registrationUpdatedAt = new Date().toISOString();
            if (store.state.platform) {
              store.state.platform.teams = [];
              store.state.platform.checkpoints = {};
              store.state.platform.tickets = [];
              store.state.platform.bonuses = [];
            }
            if (store.accounts) {
              store.accounts = store.accounts.filter(a => a.role === 'ADMIN' || a.role === 'SUPER_ADMIN');
            }
            if (auth.accounts) {
              auth.accounts = auth.accounts.filter(a => a.role === 'ADMIN' || a.role === 'SUPER_ADMIN');
            }
            // Permanently clear Supabase database tables to prevent resurrection
            if (auth.admin) {
              try {
                const { data: teamProfiles } = await auth.admin.from('profiles').select('id').in('role', ['TEAM_LEADER', 'TEAM_MEMBER']);
                if (teamProfiles && teamProfiles.length) {
                  for (const p of teamProfiles) {
                    try { await auth.admin.auth.admin.deleteUser(p.id); } catch (e) {}
                  }
                  await auth.admin.from('profiles').delete().in('role', ['TEAM_LEADER', 'TEAM_MEMBER']);
                }
                await auth.admin.from('teams').delete().neq('id', '');
              } catch (dbErr) {
                console.warn('Supabase DB clean error on clear roster:', dbErr.message);
              }
            }
            await (store.commit ? store.commit() : store.save());
            return await json(200, {
              success: true,
              message: 'All previous teams and member registrations have been completely removed.',
              count: 0,
              roster: []
            });
          }
          if (method === 'POST') {
            const input = await body(req);
            let roster = input.roster;
            if (!roster && input.csvText) {
              roster = extractTeamsFromCsv(input.csvText);
            }
            // Complete clean replacement: wipe previous roster
            store.state.registrationRoster = roster || [];
            store.state.registrationSource = input.source || 'Uploaded CSV';
            store.state.registrationUpdatedAt = new Date().toISOString();

            if (input.syncTeams && Array.isArray(roster)) {
              store.state.platform ??= { teams: [], checkpoints: {}, tickets: [], bonuses: [] };
              // Completely replace platform teams with ONLY the newly uploaded teams
              store.state.platform.teams = roster.map(item => ({
                id: item.teamId,
                teamName: item.teamName
              }));

              // Re-initialize checkpoints and tickets exclusively for new teams to maintain a clean slate
              const validTeamIds = new Set(roster.map(r => r.teamId));
              const newCheckpoints = {};
              for (const item of roster) {
                newCheckpoints[item.teamId] = [
                  { id: 'cp-1', code: 'CP 01', stepNumber: 1, title: 'Motor Mounting & Connection', subsystem: 'motors', description: 'Mount the motors securely and verify all connections.', points: 100, status: 'available' },
                  { id: 'cp-2', code: 'CP 02', stepNumber: 2, title: 'L298N Motor Driver Setup', subsystem: 'l298n', description: 'Connect the motor driver, power supply and motor outputs.', points: 100, status: 'locked' },
                  { id: 'cp-3', code: 'CP 03', stepNumber: 3, title: 'ESP32 Logic Wiring', subsystem: 'wires', description: 'Wire the ESP32, sensors and motor driver.', points: 100, status: 'locked' },
                  { id: 'cp-4', code: 'CP 04', stepNumber: 4, title: 'Firmware & Code Push', subsystem: 'esp32', description: 'Upload firmware and verify basic control functions.', points: 100, status: 'locked' },
                  { id: 'cp-5', code: 'CP 05', stepNumber: 5, title: '3S Battery Power Integration', subsystem: 'battery', description: 'Check battery connections and power distribution.', points: 100, status: 'locked' },
                  { id: 'cp-6', code: 'CP 06', stepNumber: 6, title: 'Wi-Fi / BLE Pairing', subsystem: 'esp32', description: 'Pair the controller and verify wireless commands.', points: 100, status: 'locked' },
                  { id: 'cp-7', code: 'CP 07', stepNumber: 7, title: 'Polarity Check & Maiden Run', subsystem: 'chassis', description: 'Verify polarity and complete a controlled test run.', points: 200, status: 'locked' },
                ];
              }
              store.state.platform.checkpoints = newCheckpoints;
              store.state.platform.tickets = (store.state.platform.tickets || []).filter(t => validTeamIds.has(t.teamId));
              store.state.platform.bonuses = (store.state.platform.bonuses || []).filter(b => validTeamIds.has(b.teamId));

              // Sync to Supabase DB tables
              if (auth.admin) {
                try {
                  await auth.admin.from('profiles').delete().in('role', ['TEAM_LEADER', 'TEAM_MEMBER']);
                  await auth.admin.from('teams').delete().neq('id', '');
                  if (roster.length > 0) {
                    const teamRows = roster.map(r => ({ id: r.teamId, team_name: r.teamName }));
                    await auth.admin.from('teams').upsert(teamRows, { onConflict: 'id' });

                    const userListRes = await auth.admin.auth.admin.listUsers();
                    const existingUsers = userListRes?.data?.users || [];

                    for (const item of roster) {
                      if (item.leader && item.leader.email && item.leader.enrollment && item.leader.enrollment !== 'N/A') {
                        const email = item.leader.email.trim().toLowerCase();
                        const password = item.leader.enrollment.trim();
                        const name = item.leader.name?.trim() || item.teamName;
                        let user = existingUsers.find(u => u.email?.toLowerCase() === email);
                        if (!user) {
                          const { data: newUser } = await auth.admin.auth.admin.createUser({
                            email,
                            password,
                            email_confirm: true,
                            app_metadata: { robothon_import: 'robothon-team-grid-v1', robothon_team_id: item.teamId }
                          });
                          user = newUser?.user;
                        } else {
                          await auth.admin.auth.admin.updateUserById(user.id, { password });
                        }
                        if (user) {
                          await auth.admin.from('profiles').upsert({
                            id: user.id,
                            name,
                            role: 'TEAM_LEADER',
                            team_id: item.teamId,
                            eligible: true
                          }, { onConflict: 'id' });
                        }
                      }
                    }
                  }
                } catch (dbErr) {
                  console.warn('Supabase DB sync notice:', dbErr.message);
                }
              }

              if (store.accounts) {
                store.accounts = (store.accounts || []).filter(a => a.role === 'ADMIN' || a.role === 'SUPER_ADMIN')
                  .concat(roster.map(r => ({ teamId: r.teamId, teamName: r.teamName })));
              }
              if (auth.accounts && Array.isArray(roster)) {
                const adminAccs = auth.accounts.filter(a => a.role === 'ADMIN' || a.role === 'SUPER_ADMIN');
                const leaderAccs = [];
                for (const item of roster) {
                  if (item.leader && item.leader.email && item.leader.enrollment && item.leader.enrollment !== 'N/A') {
                    leaderAccs.push({
                      id: 'leader-' + item.teamId,
                      email: item.leader.email.trim().toLowerCase(),
                      password: item.leader.enrollment.trim(),
                      name: item.leader.name?.trim() || item.teamName,
                      role: 'TEAM_LEADER',
                      teamId: item.teamId,
                      teamName: item.teamName,
                      eligible: true
                    });
                  }
                }
                auth.accounts = [...adminAccs, ...leaderAccs];
              }
            }

            await (store.commit ? store.commit() : store.save());
            return await json(200, {
              success: true,
              cleanReplaced: true,
              count: (store.state.registrationRoster || []).length,
              roster: store.state.registrationRoster
            });
          }
        }
        if (parts[2] === 'quiz-templates' && parts[3] === 'basic-robotics' && method === 'POST') return await json(201, service.createBasicQuiz(admin, await body(req)));
        if (parts[2] === 'questions') {
          if (method === 'PATCH') return await json(200, service.updateQuestion(admin, parts[3], await body(req)));
          if (method === 'DELETE') return await json(200, service.deleteQuestion(admin, parts[3]));
        }
        if (parts[2] === 'quizzes') {
          const id = parts[3], action = parts[4];
          if (!id && method === 'GET') return await json(200, service.listQuizzes(admin));
          if (!id && method === 'POST') return await json(201, service.createQuiz(admin, await body(req)));
          if (!action && method === 'PATCH') return await json(200, service.updateConfig(admin, id, await body(req)));
          if (method === 'POST' && ['ready', 'start', 'pause', 'resume', 'end', 'finalize', 'redo', 'republish'].includes(action)) return await json(200, service[action](admin, id, await body(req)));
          if (action === 'live' && method === 'GET') return await json(200, { quiz: service.publicQuiz(service.quizOrThrow(id)), leaderboard: service.leaderboard(id), attempts: store.state.attempts.filter(a => a.quizId === id).map(a => service.publicAttempt(a)) });
          if (action === 'questions' && method === 'GET') return await json(200, service.adminQuestions(admin, id));
          if (action === 'questions' && method === 'POST') return await json(201, service.createQuestion(admin, id, await body(req)));
          if (action === 'import' && method === 'POST') return await json(200, service.importQuiz(admin, id, await body(req)));
          if (action === 'export' && method === 'GET') return await json(200, service.exportQuiz(admin, id));
          if (action === 'stage' && method === 'POST') return await json(200, service.updateStage(admin, id, await body(req)));
          if (action === 'sessions' && parts[6] === 'invalidate' && method === 'POST') return await json(200, service.invalidateSession(admin, id, parts[5]));
          if (action === 'attempts' && method === 'POST') {
            if (parts[6] === 'score') return await json(200, service.adjustScore(admin, id, parts[5], await body(req)));
            if (parts[6] === 'debar') return await json(200, service.debarTeam(admin, id, parts[5], await body(req)));
            if (parts[6] === 'qualify') return await json(200, service.qualifyTeam(admin, id, parts[5], await body(req)));
          }
        }
      }
      if (parts[0] !== 'api' && ['GET', 'HEAD'].includes(method)) {
        const legacy = url.pathname === '/legacy' || url.pathname.startsWith('/src/');
        const root = legacy ? backendRoot : frontendRoot;
        const relative = url.pathname === '/legacy' ? 'index.html' : url.pathname.slice(1);
        let filePath = path.resolve(root, relative || 'index.html');
        const within = path.relative(root, filePath);
        if (within.startsWith('..') || path.isAbsolute(within) || within.split(/[\\/]/).some(p => p.startsWith('.'))) throw new QuizError(404, 'NOT_FOUND', 'File was not found.');
        let content;
        try { content = await fs.readFile(filePath); }
        catch (error) {
          if (!legacy && !path.extname(relative) && ['ENOENT', 'EISDIR'].includes(error.code)) {
            filePath = path.join(root, 'index.html');
            try { content = await fs.readFile(filePath); } catch { throw new QuizError(404, 'FRONTEND_NOT_BUILT', 'Run the frontend dev server on port 3000, or build the frontend first.'); }
          } else throw new QuizError(404, 'NOT_FOUND', 'File was not found.');
        }
        const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.mp4': 'video/mp4', '.glb': 'model/gltf-binary' };
        res.writeHead(200, { 'content-type': types[path.extname(filePath)] || 'application/octet-stream', 'x-content-type-options': 'nosniff' });
        res.end(method === 'HEAD' ? undefined : content);
        return;
      }
      return await json(404, { error: 'NOT_FOUND', message: 'Route was not found.' });
    } catch (error) {
      if (error.code === 'CONCURRENT_UPDATE' && retries < 4 && !res.headersSent) return handleRequest(req, res, retries + 1);
      if (res.headersSent) return res.end();
      res.writeHead(error.status || 500, { 'content-type': 'application/json', 'cache-control': 'no-store' });
      res.end(JSON.stringify({ error: error.code || 'INTERNAL_ERROR', message: error.status ? error.message : 'Unable to complete the request.' }));
    }
  };
  const server = http.createServer((req, res) => { void handleRequest(req, res); });
  server.on('close', () => streams.forEach(s => s.res.end()));
  return { server, service, auth, platform };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let app;
  if (process.env.DATA_BACKEND === 'supabase') {
    const clients = supabaseClients();
    const store = await new SupabaseQuizStore(clients.admin).load();
    app = createApp({ store, auth: new SupabaseAuthService(clients) });
  } else {
    // Local mode: self-hosted database directly on server (data/quiz-state.json and data/demo-accounts.json)
    const accounts = JSON.parse(await fs.readFile(process.env.ACCOUNTS_FILE || path.join(backendRoot, 'data/demo-accounts.json'), 'utf8'));
    const store = await new JsonQuizStore(process.env.STATE_FILE || path.join(backendRoot, 'data/quiz-state.json')).load();
    app = createApp({ store, accounts });
  }
  const { server } = app;
  const port = Number(process.env.PORT || 8787);
  server.listen(port, () => console.log('Robothon platform listening on http://localhost:' + port));
}
