import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApp } from '../server/index.js';
import { QuizStore } from '../server/quiz-store.js';
import { AuthService, hashPassword } from '../server/auth-service.js';

const accounts = [
  { id: 'super', email: 'super@test.local', password: 'super-pass', name: 'Super Admin', role: 'SUPER_ADMIN' },
  { id: 'marshal', email: 'marshal@test.local', password: 'marshal-pass', name: 'Marshal', role: 'ADMIN' },
  { id: 'marshal2', email: 'marshal2@test.local', password: 'marshal-pass', name: 'Marshal 2', role: 'ADMIN' },
  { id: 'leader', email: 'leader@test.local', password: 'leader-pass', role: 'TEAM_LEADER', teamId: 'alpha', teamName: 'Alpha' },
  { id: 'other', email: 'other@test.local', password: 'other-pass', role: 'TEAM_LEADER', teamId: 'beta', teamName: 'Beta' },
  { id: 'member', email: 'member@test.local', password: 'member-pass', role: 'TEAM_MEMBER', teamId: 'alpha', teamName: 'Alpha' },
];

async function setup(t) {
  const app = createApp({ store: new QuizStore(), accounts });
  app.server.listen(0, '127.0.0.1');
  await once(app.server, 'listening');
  t.after(() => new Promise(resolve => { app.server.closeAllConnections(); app.server.close(resolve); }));
  const base = `http://127.0.0.1:${app.server.address().port}`;
  const request = async (url, { token, method = 'GET', body, headers = {} } = {}) => {
    const response = await fetch(base + url, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers }, ...(body ? { body: JSON.stringify(body) } : {}) });
    return { status: response.status, body: await response.json() };
  };
  const login = async id => {
    const account = accounts.find(a => a.id === id);
    const result = await request('/api/auth/login', { method: 'POST', body: { email: account.email, password: account.password } });
    assert.equal(result.status, 200);
    return result.body;
  };
  return { ...app, request, login };
}

test('credentials and portal are checked; client identity headers cannot authenticate', async t => {
  const { request } = await setup(t);
  assert.equal((await request('/api/auth/login', { method: 'POST', body: { email: accounts[0].email, password: 'wrong' } })).status, 401);
  assert.equal((await request('/api/auth/login', { method: 'POST', body: { email: accounts[0].email, password: accounts[0].password, portal: 'participant' } })).status, 403);
  assert.equal((await request('/api/admin/quizzes/elimination-2026/start', { method: 'POST', headers: { 'x-role': 'SUPER_ADMIN', 'x-authenticated': 'true' } })).status, 401);
  assert.equal((await request('/api/auth/me')).status, 401);
  assert.equal((await request('/api/demo/accounts')).status, 404);
});

test('checkpoint admins cannot read or mutate quiz administration, even with forged super-admin headers', async t => {
  const { login, request, service } = await setup(t);
  const { token } = await login('marshal');
  for (const action of ['start', 'pause', 'resume', 'end', 'ready', 'finalize', 'redo', 'republish', 'import', 'stage']) {
    assert.equal((await request(`/api/admin/quizzes/elimination-2026/${action}`, { token, method: 'POST', body: {}, headers: { 'x-role': 'SUPER_ADMIN' } })).status, 403, action);
  }
  for (const path of ['/api/admin/quizzes', '/api/admin/quizzes/elimination-2026/live', '/api/admin/quizzes/elimination-2026/questions', '/api/admin/quizzes/elimination-2026/export']) {
    assert.equal((await request(path, { token })).status, 403, path);
  }
  assert.throws(() => service.start({ authenticated: true, role: 'ADMIN' }, 'elimination-2026'), e => e.status === 403);
});

test('basic quiz creation and reset/republish work through authenticated HTTP endpoints', async t => {
  const { login, request } = await setup(t);
  const superUser = await login('super'), marshal = await login('marshal'), leader = await login('leader');
  const path = '/api/admin/quiz-templates/basic-robotics';
  const body = { id: 'basic-round', name: 'Basic round' };
  for (const token of [marshal.token, leader.token]) {
    assert.equal((await request(path, { token, method: 'POST', body })).status, 403);
  }
  const created = await request(path, { token: superUser.token, method: 'POST', body });
  assert.equal(created.status, 201);
  assert.equal(created.body.quiz.status, 'READY');
  assert.equal(created.body.quiz.questionCount, 5);
  const adminPath = '/api/admin/quizzes/basic-round/';
  await request(adminPath + 'start', { token: superUser.token, method: 'POST' });
  const joined = await request('/api/quizzes/basic-round/join', { token: leader.token, method: 'POST' });
  assert.equal(joined.body.questions.length, 5);
  assert.equal(JSON.stringify(joined.body.questions).includes('correctOption'), false);
  await request('/api/quizzes/basic-round/answer', { token: leader.token, method: 'POST', body: { questionId: joined.body.questions[0].id, selectedOption: 'A' } });
  await request(adminPath + 'end', { token: superUser.token, method: 'POST' });
  const republished = await request(adminPath + 'republish', { token: superUser.token, method: 'POST' });
  assert.equal(republished.status, 200);
  assert.equal(republished.body.quiz.status, 'READY');
  assert.equal((await request('/api/quizzes/basic-round/my-attempt', { token: leader.token })).body.attempt, null);
  const live = await request(adminPath + 'live', { token: superUser.token });
  assert.deepEqual(live.body.attempts, []);
  assert.equal((await request('/api/leaderboard')).body.teams.find(t => t.id === 'alpha').quizPoints, 0);
  await request(adminPath + 'start', { token: superUser.token, method: 'POST' });
  const again = await request('/api/quizzes/basic-round/join', { token: leader.token, method: 'POST' });
  assert.equal(again.status, 200);
  assert.deepEqual(again.body.attempt.answers, {});
});

test('super admin starts test, participant sees MCQs, resumes saved answers and submits once', async t => {
  const { login, request } = await setup(t);
  const superUser = await login('super');
  const participant = await login('leader');
  const token = participant.token;
  assert.equal((await request('/api/quizzes/elimination-2026/join', { token, method: 'POST' })).status, 409);
  assert.deepEqual((await request('/api/quizzes/elimination-2026', { token })).body.questions, []);
  await request('/api/admin/quizzes/elimination-2026/ready', { token: superUser.token, method: 'POST' });
  assert.equal((await request('/api/admin/quizzes/elimination-2026/start', { token: superUser.token, method: 'POST' })).status, 200);
  const joined = await request('/api/quizzes/elimination-2026/join', { token, method: 'POST' });
  assert.equal(joined.status, 200);
  assert.match(joined.body.questions[0].questionText, /control strategy/);
  assert.equal(JSON.stringify(joined.body.questions).includes('correctOption'), false);
  assert.ok(joined.body.quiz.serverTime);
  assert.equal((await request('/api/quizzes/elimination-2026/answer', { token, method: 'POST', body: { questionId: 'q1', selectedOption: 'B' } })).status, 200);
  const resumed = await request('/api/quizzes/elimination-2026/my-attempt', { token });
  assert.equal(resumed.body.attempt.answers.q1, 'B');
  const submitted = await request('/api/quizzes/elimination-2026/submit', { token, method: 'POST' });
  assert.equal(submitted.body.attempt.score, 4);
  assert.equal(submitted.body.attempt.status, 'EVALUATED');
  assert.equal((await request('/api/quizzes/elimination-2026/submit', { token, method: 'POST' })).body.attempt.score, 4);
  assert.equal((await request('/api/leaderboard')).body.teams.find(t => t.id === 'alpha').quizPoints, 4);
  await request('/api/admin/quizzes/elimination-2026/end', { token: superUser.token, method: 'POST' });
  await request('/api/admin/quizzes/elimination-2026/finalize', { token: superUser.token, method: 'POST' });
  assert.equal((await request('/api/leaderboard')).body.teams.find(t => t.id === 'alpha').qualificationStatus, 'QUALIFIED');
});

test('checkpoint requests belong to the signed-in team; approvals award once and unlock only that team', async t => {
  const { login, request } = await setup(t);
  const leader = await login('leader'), other = await login('other'), admin = await login('marshal'), admin2 = await login('marshal2');
  const call = (url, token, body) => request(url, { token, method: 'POST', body });
  const ticket = (await call('/api/checkpoints/review-request', leader.token, { checkpointId: 'cp-1', teamId: 'beta' })).body.ticket;
  assert.equal(ticket.teamId, 'alpha');
  assert.equal((await call('/api/checkpoints/review-request', leader.token, { checkpointId: 'cp-1' })).status, 409);
  assert.equal((await call('/api/checkpoints/review-request', leader.token, { checkpointId: 'cp-2' })).status, 409);
  assert.equal((await call('/api/admin/checkpoints/verify', leader.token, { ticketId: ticket.ticketId, approved: true })).status, 403);
  assert.equal((await request('/api/platform', { token: other.token })).body.tickets.length, 0);
  await call('/api/admin/checkpoints/assign', admin.token, { ticketId: ticket.ticketId });
  assert.equal((await call('/api/admin/checkpoints/verify', admin2.token, { ticketId: ticket.ticketId, approved: true })).status, 409);
  const reviewed = await call('/api/admin/checkpoints/verify', admin.token, { ticketId: ticket.ticketId, approved: true, adminId: 'forged' });
  assert.equal(reviewed.body.awardedPoints, 100);
  assert.equal(reviewed.body.ticket.assignedAdminId, 'marshal');
  assert.equal((await call('/api/admin/checkpoints/verify', admin.token, { ticketId: ticket.ticketId, approved: true })).status, 409);
  const alpha = (await request('/api/platform', { token: leader.token })).body;
  const beta = (await request('/api/platform', { token: other.token })).body;
  assert.equal(alpha.checkpoints[1].status, 'available');
  assert.equal(beta.checkpoints[0].status, 'available');
  assert.equal(beta.checkpoints[1].status, 'locked');
  assert.equal(alpha.teams.find(t => t.id === 'alpha').checkpointPoints, 100);
  assert.equal(alpha.teams.find(t => t.id === 'beta').checkpointPoints, 0);
});

test('rejected checkpoints can be resubmitted; bonus values and staff access are validated', async t => {
  const { login, request } = await setup(t);
  const leader = await login('leader'), admin = await login('marshal');
  const ticket = (await request('/api/checkpoints/review-request', { token: leader.token, method: 'POST', body: { checkpointId: 'cp-1' } })).body.ticket;
  await request('/api/admin/checkpoints/verify', { token: admin.token, method: 'POST', body: { ticketId: ticket.ticketId, approved: false } });
  assert.equal((await request('/api/checkpoints/review-request', { token: leader.token, method: 'POST', body: { checkpointId: 'cp-1' } })).status, 201);
  const bonus = { teamId: 'alpha', gameName: 'Test', points: 15 };
  assert.equal((await request('/api/admin/minigames/award', { token: leader.token, method: 'POST', body: bonus })).status, 403);
  assert.equal((await request('/api/admin/minigames/award', { token: admin.token, method: 'POST', body: { ...bonus, points: -5 } })).status, 422);
  assert.equal((await request('/api/admin/minigames/award', { token: admin.token, method: 'POST', body: bonus })).body.newTotal, 15);
});

test('logout revokes tokens and permits the same participant to resume after signing in again', async t => {
  const { login, request } = await setup(t);
  const superUser = await login('super'), leader = await login('leader'), member = await login('member');
  await request('/api/admin/quizzes/elimination-2026/ready', { token: superUser.token, method: 'POST' });
  await request('/api/admin/quizzes/elimination-2026/start', { token: superUser.token, method: 'POST' });
  assert.equal((await request('/api/quizzes/elimination-2026/join', { token: member.token, method: 'POST' })).status, 403);
  await request('/api/quizzes/elimination-2026/join', { token: leader.token, method: 'POST' });
  await request('/api/auth/logout', { token: leader.token, method: 'POST' });
  assert.equal((await request('/api/auth/me', { token: leader.token })).status, 401);
  const again = await login('leader');
  assert.equal((await request('/api/quizzes/elimination-2026/join', { token: again.token, method: 'POST' })).status, 200);
});

test('a fresh login resumes a closed-tab attempt without logout or admin release', async t => {
  const { login, request, service } = await setup(t);
  const admin = await login('super'), old = await login('leader'), fresh = await login('leader');
  const path = '/api/quizzes/elimination-2026';
  await request('/api/admin/quizzes/elimination-2026/ready', { token: admin.token, method: 'POST' });
  await request('/api/admin/quizzes/elimination-2026/start', { token: admin.token, method: 'POST' });
  const joined = await request(path + '/join', { token: old.token, method: 'POST' });
  await request(path + '/answer', { token: old.token, method: 'POST', body: { questionId: 'q1', selectedOption: 'B' } });
  assert.equal((await request(path + '/join', { token: fresh.token, method: 'POST' })).status, 409);
  assert.equal((await request(path + '/resume', { method: 'POST' })).status, 401);
  const member = await login('member'), other = await login('other');
  assert.equal((await request(path + '/resume', { token: member.token, method: 'POST' })).status, 403);
  assert.equal((await request(path + '/resume', { token: other.token, method: 'POST', body: { teamId: 'alpha', sessionId: old.account.sessionId } })).status, 409);
  const resumed = await request(path + '/resume', { token: fresh.token, method: 'POST', body: { teamId: 'beta', sessionId: 'forged-session' } });
  assert.equal(resumed.status, 200);
  assert.equal(resumed.body.attempt.id, joined.body.attempt.id);
  assert.equal(resumed.body.attempt.teamId, 'alpha');
  assert.equal(resumed.body.attempt.sessionId, fresh.account.sessionId);
  assert.equal(resumed.body.quiz.startedAt, joined.body.quiz.startedAt);
  assert.deepEqual(resumed.body.attempt.answers, { q1: 'B' });
  for (const action of ['answer', 'submit']) assert.equal((await request(path + '/' + action, { token: old.token, method: 'POST', body: { questionId: 'q2', selectedOption: 'A' } })).status, 409);
  await request('/api/auth/logout', { token: old.token, method: 'POST' });
  assert.equal((await request(path + '/answer', { token: fresh.token, method: 'POST', body: { questionId: 'q2', selectedOption: 'A' } })).status, 200);
  assert.equal(service.store.state.attempts.length, 1);
  assert.equal((await request(path + '/submit', { token: fresh.token, method: 'POST' })).status, 200);
  assert.equal((await request(path + '/resume', { token: fresh.token, method: 'POST' })).status, 409);
});

test('password hashes authenticate and expired sessions fail closed', () => {
  let time = 0;
  const auth = new AuthService([{ ...accounts[0], password: undefined, passwordHash: hashPassword('secret') }], { clock: () => time });
  assert.throws(() => auth.login({ email: accounts[0].email, password: 'wrong' }), e => e.status === 401);
  const { token } = auth.login({ email: accounts[0].email, password: 'secret', role: 'ADMIN' });
  const req = { headers: { authorization: `Bearer ${token}`, 'x-role': 'ADMIN' } };
  assert.equal(auth.resolve(req).role, 'SUPER_ADMIN');
  time = 12 * 60 * 60 * 1000 + 1;
  assert.throws(() => auth.resolve(req), e => e.status === 401);
});

test('account files, persisted state, server source and git metadata are not served', async t => {
  const { request } = await setup(t);
  for (const url of ['/data/demo-accounts.json', '/data/quiz-state.json', '/server/auth-service.js', '/.git/config']) {
    assert.equal((await request(url)).status, 404, url);
  }
});
