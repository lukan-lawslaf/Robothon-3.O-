import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { SupabaseQuizStore } from '../server/supabase-store.js';
import { SupabaseAuthService } from '../server/supabase.js';
import { createInitialState } from '../server/quiz-store.js';
import { once } from 'node:events';
import { createApp } from '../server/index.js';
import { QuizService } from '../server/quiz-service.js';

let db;
const leaderId = '11111111-1111-4111-8111-111111111111';
const adminId = '22222222-2222-4222-8222-222222222222';
before(async () => {
  db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to authenticated;
    insert into auth.users values ('${leaderId}'), ('${adminId}');`);
  await db.exec(await fs.readFile(new URL('../supabase/migrations/202610190001_platform.sql', import.meta.url), 'utf8'));
  await db.exec(`insert into public.teams(id, team_name) values ('alpha', 'Alpha');
    insert into public.profiles(id,name,role,team_id) values ('${leaderId}','Leader','TEAM_LEADER','alpha'), ('${adminId}','Marshal','ADMIN',null);`);
});
after(async () => { await db.close(); });

test('reset and republish persist together in Supabase with the retained question bank', async t => {
  await db.exec('set role service_role');
  t.after(() => db.exec('reset role'));
  const store = await new SupabaseQuizStore(client).load();
  const service = new QuizService(store);
  const superUser = { authenticated: true, role: 'SUPER_ADMIN' };
  const leader = { authenticated: true, role: 'TEAM_LEADER', teamId: 'alpha', sessionId: 'session', userId: leaderId };
  service.createBasicQuiz(superUser, { id: 'db-basic' });
  service.start(superUser, 'db-basic');
  const joined = service.join(leader, 'db-basic');
  service.answer(leader, 'db-basic', joined.questions[0].id, 'A');
  service.end(superUser, 'db-basic');
  await store.commit();
  const beforeRevision = Number(store.revision);
  service.republish(superUser, 'db-basic');
  const beforeCommit = await store.fork();
  assert.equal(beforeCommit.getQuiz('db-basic').status, 'RESULTS');
  assert.equal(beforeCommit.getAttempt('db-basic', 'alpha').score, 1);
  await store.commit();
  const afterCommit = await store.fork();
  assert.equal(Number(afterCommit.revision), beforeRevision + 1);
  assert.equal(afterCommit.getQuiz('db-basic').status, 'READY');
  assert.equal(afterCommit.getAttempt('db-basic', 'alpha'), undefined);
  assert.equal(afterCommit.getQuestions('db-basic').length, 5);
  // Leave the fixture clean for the remaining persistence tests.
  store.state = createInitialState();
  await store.commit();
});

test('Supabase migration denies browser access to answer keys, full state, writes and commit RPC', async () => {
  await db.exec('set role anon');
  for (const sql of ['select * from public.competition_state', 'select * from public.quiz_questions', 'select * from public.quiz_answers', "select public.initialize_competition('{}')", "select public.commit_competition(0, '{}')"]) {
    await assert.rejects(db.query(sql), e => e.code === '42501');
  }
  await db.exec('reset role');
});

test('RLS exposes only the current user profile and prevents self-promotion', async () => {
  await db.exec(`set role authenticated; set request.jwt.claim.sub = '${leaderId}'`);
  const profiles = await db.query('select * from public.profiles');
  assert.equal(profiles.rows.length, 1);
  assert.equal(profiles.rows[0].role, 'TEAM_LEADER');
  assert.equal((await db.query('select * from public.teams')).rows[0].id, 'alpha');
  await assert.rejects(db.query("update public.profiles set role='SUPER_ADMIN'"), e => e.code === '42501');
  await assert.rejects(db.query("insert into public.profiles(id,name,role) values ('33333333-3333-4333-8333-333333333333','Fake','SUPER_ADMIN')"), e => e.code === '42501');
  await assert.rejects(db.query('select * from public.competition_state'), e => e.code === '42501');
  await db.exec('reset role');
});

// Small PostgREST transport adapter: the migration and RPC execute in real local PostgreSQL.
const client = {
  rpc: async (name, input) => {
    try {
      const result = name === 'initialize_competition'
        ? await db.query('select public.initialize_competition($1::jsonb) as value', [JSON.stringify(input.initial_state)])
        : await db.query('select public.commit_competition($1::bigint, $2::jsonb) as value', [input.expected_revision, JSON.stringify(input.next_state)]);
      return { data: result.rows[0].value, error: null };
    } catch (error) { return { data: null, error }; }
  },
  from: table => ({
    select: () => table === 'teams'
      ? db.query('select id,team_name from public.teams').then(r => ({ data: r.rows, error: null }))
      : { eq: () => ({ single: async () => { const r = await db.query("select state,revision from public.competition_state where id='main'"); return { data: r.rows[0], error: null }; } }) },
  }),
};

test('Supabase adapter persists state across instances and rejects stale writes without losing data', async () => {
  await db.exec('set role service_role');
  const first = await new SupabaseQuizStore(client).load();
  const second = await first.fork();
  first.state.quizzes[0].name = 'Saved in PostgreSQL';
  await first.commit();
  second.state.quizzes[0].name = 'Stale update';
  await assert.rejects(second.commit(), e => e.code === 'CONCURRENT_UPDATE');
  const fresh = await second.fork();
  assert.equal(fresh.state.quizzes[0].name, 'Saved in PostgreSQL');
  assert.deepEqual(fresh.accounts, [{ teamId: 'alpha', teamName: 'Alpha' }]);
  fresh.state.platform = { teams: [], checkpoints: {}, tickets: [{ ticketId: 'review-1', teamId: 'alpha', status: 'approved' }], bonuses: [] };
  await fresh.commit();
  assert.equal((await new SupabaseQuizStore(client).load()).state.platform.tickets[0].status, 'approved');
  assert.equal((await db.query('select * from public.checkpoint_reviews')).rows[0].team_id, 'alpha');
  await db.exec('reset role');
});

test('database validates snapshot structure and provisioning role/team constraints', async () => {
  await db.exec('set role service_role');
  const invalid = await client.rpc('commit_competition', { expected_revision: 2, next_state: {} });
  assert.equal(invalid.error.code, '22023');
  const state = createInitialState();
  assert.equal((await client.rpc('initialize_competition', { initial_state: state })).error, null);
  assert.equal((await db.query("select state->'quizzes'->0->>'name' as name from public.competition_state")).rows[0].name, 'Saved in PostgreSQL');
  await assert.rejects(db.query(`update public.profiles set role='ADMIN' where id='${leaderId}'`), e => e.code === '23514');
  await db.exec('reset role');
});

test('Supabase auth uses database roles, verifies tokens, preserves session identity on refresh and revokes logout', async () => {
  const sessionId = '44444444-4444-4444-8444-444444444444';
  const token = 'header.' + Buffer.from(JSON.stringify({ session_id: sessionId, role: 'SUPER_ADMIN' })).toString('base64url') + '.signature';
  let role = 'ADMIN', revoked = false, verified = false;
  const user = { id: adminId, email: 'marshal@test.local', user_metadata: { role: 'SUPER_ADMIN' } };
  const admin = {
    auth: { getUser: async supplied => { verified = supplied === token; return { data: { user }, error: null }; }, admin: { signOut: async () => ({ error: null }) } },
    from: table => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: table === 'profiles' ? { name: 'Marshal', role, disabled: false, eligible: true } : revoked ? { session_id: sessionId } : null, error: null }) }) }), upsert: async () => { revoked = true; return { error: null }; } }),
  };
  const issue = async () => ({ data: { user, session: { access_token: token, refresh_token: 'refresh-token' } }, error: null });
  const auth = new SupabaseAuthService({ admin, authClient: () => ({ auth: { signInWithPassword: issue, refreshSession: issue } }) });
  const login = await auth.login({ email: user.email, password: 'password', portal: 'admin' });
  assert.equal(login.account.role, 'ADMIN');
  assert.equal(login.refreshToken, 'refresh-token');
  const req = { headers: { authorization: `Bearer ${token}`, 'x-role': 'SUPER_ADMIN' } };
  assert.equal((await auth.resolve(req)).role, 'ADMIN');
  assert.equal(verified, true);
  role = 'SUPER_ADMIN';
  assert.equal((await auth.resolve(req)).role, 'SUPER_ADMIN');
  assert.equal((await auth.refresh({ refreshToken: 'refresh-token' })).account.sessionId, login.account.sessionId);
  await auth.logout(req);
  await assert.rejects(auth.resolve(req), e => e.code === 'SESSION_REVOKED');
  await assert.rejects(auth.refresh({ refreshToken: 'refresh-token' }), e => e.code === 'SESSION_REVOKED');
});

test('concurrent API instances retry conflicting database writes and preserve both checkpoint requests', async t => {
  await db.exec('set role service_role');
  t.after(() => db.exec('reset role'));
  await db.query("insert into public.teams(id,team_name) values ('beta','Beta')");
  const reset = await new SupabaseQuizStore(client).load();
  reset.state = createInitialState();
  await reset.commit();
  let conflicts = 0, arrivals = 0, release;
  const ready = new Promise(resolve => { release = resolve; });
  const concurrentClient = { ...client, rpc: async (name, input) => {
    const result = await client.rpc(name, input);
    if (result.error?.code === '40001') conflicts++;
    return result;
  } };
  const servers = [];
  t.after(() => Promise.all(servers.map(server => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }))));
  const urls = [];
  for (let i = 0; i < 2; i++) {
    const store = await new SupabaseQuizStore(concurrentClient).load();
    const fork = store.fork.bind(store);
    store.fork = async () => {
      const snapshot = await fork();
      // Force both HTTP requests to read the same revision before either writes.
      if (arrivals < 2) { arrivals++; if (arrivals === 2) release(); await ready; }
      return snapshot;
    };
    const auth = { resolve: async req => {
      const teamId = req.headers.authorization.slice('Bearer '.length);
      assert.ok(['alpha', 'beta'].includes(teamId));
      return { authenticated: true, role: 'TEAM_LEADER', userId: teamId, teamId, teamName: teamId };
    } };
    const { server } = createApp({ store, auth });
    servers.push(server);
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    urls.push(`http://127.0.0.1:${server.address().port}`);
  }
  const responses = await Promise.all(urls.map((url, i) => fetch(url + '/api/checkpoints/review-request', {
    method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + ['alpha', 'beta'][i] },
    body: JSON.stringify({ checkpointId: 'cp-1' }),
  })));
  assert.deepEqual(responses.map(response => response.status), [201, 201]);
  assert.ok(conflicts >= 1);
  const persisted = await new SupabaseQuizStore(client).load();
  assert.equal(persisted.state.platform.tickets.length, 2);
  for (const team of ['alpha', 'beta']) {
    assert.equal(persisted.state.platform.checkpoints[team][0].status, 'pending_review');
    assert.equal(persisted.state.platform.tickets.filter(ticket => ticket.teamId === team).length, 1);
  }
});

test('quiz start events are published only after a successful durable commit, including conflict retries', async t => {
  await db.exec('set role service_role');
  t.after(() => db.exec('reset role'));
  const reset = await new SupabaseQuizStore(client).load();
  reset.state = createInitialState();
  await reset.commit();
  let commits = 0, persisted = false;
  const delayedClient = { ...client, rpc: async (name, input) => {
    if (name !== 'commit_competition') return client.rpc(name, input);
    commits++;
    // Deliberately let the event stream run before completing each write.
    await new Promise(resolve => setTimeout(resolve, 75));
    if (commits === 1) return { data: null, error: { code: '40001' } };
    const result = await client.rpc(name, input);
    persisted = !result.error;
    return result;
  } };
  const store = await new SupabaseQuizStore(delayedClient).load();
  const { server } = createApp({ store, auth: { resolve: async () => ({ authenticated: true, role: 'SUPER_ADMIN', userId: 'super' }) } });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const abort = new AbortController();
  t.after(() => { abort.abort(); return new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }); });
  const url = `http://127.0.0.1:${server.address().port}`;
  const stream = await fetch(url + '/api/events', { signal: abort.signal });
  const reader = stream.body.getReader();
  const events = [];
  const reading = (async () => {
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) return;
        const text = new TextDecoder().decode(value);
        if (text.includes('event: QUIZ_STARTED')) events.push({ text, persisted });
        if (text.includes('event: STAGE_UPDATE')) return;
      }
    } catch (error) { if (!abort.signal.aborted) throw error; }
  })();
  await fetch(url + '/api/admin/quizzes/elimination-2026/ready', { method: 'POST' });
  const started = await fetch(url + '/api/admin/quizzes/elimination-2026/start', { method: 'POST' });
  assert.equal(started.status, 200);
  await reading;
  assert.ok(commits >= 2);
  assert.equal(events.length, 1);
  assert.equal(events[0].persisted, true);
  assert.match(events[0].text, /"quizId":"elimination-2026"/);
  assert.equal((await new SupabaseQuizStore(client).load()).state.quizzes[0].status, 'LIVE');
});

test('resuming in a new session persists atomically and a stale old-session write cannot overwrite it', async t => {
  await db.exec('set role service_role');
  t.after(() => db.exec('reset role'));
  const store = await new SupabaseQuizStore(client).load();
  store.state = createInitialState();
  const service = new QuizService(store);
  const admin = { authenticated: true, role: 'SUPER_ADMIN' };
  const old = { authenticated: true, userId: leaderId, teamId: 'alpha', role: 'TEAM_LEADER', sessionId: 'closed-tab' };
  const fresh = { ...old, sessionId: 'fresh-tab' };
  service.ready(admin, 'elimination-2026');
  service.start(admin, 'elimination-2026');
  service.join(old, 'elimination-2026');
  service.answer(old, 'elimination-2026', 'q1', 'B');
  await store.commit();
  const stale = await store.fork();
  const staleService = new QuizService(stale);
  staleService.answer(old, 'elimination-2026', 'q2', 'A');
  service.resumeAttempt(fresh, 'elimination-2026');
  await store.commit();
  await assert.rejects(stale.commit(), e => e.code === 'CONCURRENT_UPDATE');
  const persisted = await store.fork();
  const current = new QuizService(persisted);
  const attempt = current.myAttempt(fresh, 'elimination-2026').attempt;
  assert.equal(attempt.sessionId, 'fresh-tab');
  assert.equal(attempt.startedAt, store.getQuiz('elimination-2026').startedAt);
  assert.deepEqual(attempt.answers, { q1: 'B' });
  assert.equal(persisted.state.attempts.length, 1);
  assert.throws(() => current.answer(old, 'elimination-2026', 'q2', 'A'), e => e.code === 'SESSION_INVALIDATED');
  current.answer(fresh, 'elimination-2026', 'q2', 'A');
  await persisted.commit();
  assert.deepEqual(new QuizService(await store.fork()).myAttempt(fresh, 'elimination-2026').attempt.answers, { q1: 'B', q2: 'A' });
});
