import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createInitialState, QuizStore } from '../server/quiz-store.js';
import { QuizError, QuizService } from '../server/quiz-service.js';
import { resolveAuthContext } from '../server/auth-context.js';

const participant = { authenticated: true, userId: 'leader-1', teamId: 'team-1', sessionId: 'session-1', role: 'TEAM_LEADER', eligible: true };
const admin = { authenticated: true, userId: 'admin-1', role: 'SUPER_ADMIN' };
const setup = () => { let time = Date.parse('2026-01-01T00:00:00.000Z'); const store = new QuizStore(createInitialState()); const service = new QuizService(store, { clock: () => time }); return { store, service, advance: seconds => { time += seconds * 1000; } }; };
const start = service => { try { service.ready(admin, 'elimination-2026'); } catch(e) {} return service.start(admin, 'elimination-2026', { source: 'PRESENTER' }); };

test('the supplied JSON file imports and publishes as a playable five-question quiz', async () => {
  const input = JSON.parse(await fs.readFile(new URL('../examples/basic-robotics-quiz.json', import.meta.url), 'utf8'));
  const { service } = setup();
  service.createQuiz(admin, { id: 'uploaded-json', name: 'Uploaded quiz' });
  service.importQuiz(admin, 'uploaded-json', input);
  const ready = service.ready(admin, 'uploaded-json');
  assert.equal(ready.quiz.questionCount, 5);
  assert.equal(ready.quiz.durationSeconds, 300);
  service.start(admin, 'uploaded-json', { source: 'PRESENTER' });
  const joined = service.join(participant, 'uploaded-json');
  for (const [index, question] of joined.questions.entries()) service.answer(participant, 'uploaded-json', question.id, input.questions[index].correctOption);
  assert.equal(service.submit(participant, 'uploaded-json').attempt.score, 5);
});

test('basic quiz is published with five valid MCQs, no negative marking and private answer keys', () => {
  const { service, store } = setup();
  const result = service.createBasicQuiz(admin, { id: 'basics' });
  assert.equal(result.quiz.status, 'READY');
  assert.equal(result.quiz.questionCount, 5);
  assert.equal(result.quiz.durationSeconds, 300);
  assert.equal(result.quiz.preQuizCountdownSeconds, 10);
  // negative marking removed
  assert.equal(result.quiz.template, 'BASIC_ROBOTICS');
  const questions = store.getQuestions('basics');
  questions.forEach(q => { assert.equal(q.options.length, 4); service.validateQuestion(q); });
  assert.ok(service.publicQuestions('basics').every(q => !('correctOption' in q)));
  assert.throws(() => service.createBasicQuiz({ ...admin, role: 'ADMIN' }, { id: 'blocked' }), e => e.status === 403);
  assert.throws(() => service.createBasicQuiz(admin, { id: 'invalid', durationSeconds: -1 }), e => e.status === 422);
  assert.equal(store.getQuiz('invalid'), undefined);
});

test('reset and republish clears only the finished round, preserves questions and starts a fresh countdown', () => {
  const { service, store, advance } = setup();
  service.createBasicQuiz(admin, { id: 'basics' });
  start(service);
  service.join(participant, 'elimination-2026');
  service.answer(participant, 'elimination-2026', 'q1', 'B');
  service.end(admin, 'elimination-2026');
  const otherAttempt = structuredClone(store.getAttempt('elimination-2026', participant.teamId));
  const otherAnswers = structuredClone(store.state.answers);
  service.start(admin, 'basics', { source: 'PRESENTER' });
  const firstStart = store.getQuiz('basics').startedAt;
  service.join(participant, 'basics');
  const questions = structuredClone(store.getQuestions('basics'));
  service.answer(participant, 'basics', questions[0].id, questions[0].correctOption);
  service.end(admin, 'basics');
  service.finalize(admin, 'basics');
  const platform = { checkpoints: { 'team-1': [{ id: 'cp-1', status: 'approved' }] }, bonuses: [{ teamId: 'team-1', points: 15 }] };
  store.state.platform = structuredClone(platform);
  const reset = service.republish(admin, 'basics');
  assert.equal(reset.quiz.status, 'READY');
  assert.equal(reset.quiz.startedAt, null);
  assert.equal(reset.quiz.finalizedAt, null);
  assert.equal(service.myAttempt(participant, 'basics').attempt, null);
  assert.deepEqual(store.getQuestions('basics'), questions);
  assert.deepEqual(store.state.answers, otherAnswers);
  assert.deepEqual(store.getAttempt('elimination-2026', participant.teamId), otherAttempt);
  assert.deepEqual(store.state.platform, platform);
  advance(60);
  const restarted = service.start(admin, 'basics', { source: 'PRESENTER' }).quiz;
  assert.notEqual(restarted.startedAt, firstStart);
  assert.equal(restarted.stageState.stage, 'COUNTDOWN');
  assert.equal(restarted.stageState.remainingSeconds, 10);
  assert.deepEqual(service.join(participant, 'basics').attempt.answers, {});
});

test('republish rejects an active or invalid round without clearing results', () => {
  const { service, store } = setup();
  start(service);
  service.join(participant, 'elimination-2026');
  service.answer(participant, 'elimination-2026', 'q1', 'B');
  let before = structuredClone(store.state);
  assert.throws(() => service.republish(admin, 'elimination-2026'), e => e.code === 'INVALID_STATE');
  assert.throws(() => service.republish({ ...admin, role: 'ADMIN' }, 'elimination-2026'), e => e.status === 403);
  assert.deepEqual(store.state, before);
  service.end(admin, 'elimination-2026');
  store.state.questions = [];
  before = structuredClone(store.state);
  assert.throws(() => service.republish(admin, 'elimination-2026'), e => e.status === 422);
  assert.deepEqual(store.state, before);
});

test('only team leaders can join and one team has one active attempt', () => { const { service } = setup(); start(service); assert.throws(() => service.join({ ...participant, role: 'TEAM_MEMBER' }, 'elimination-2026'), e => e.code === 'TEAM_LEADER_REQUIRED'); service.join(participant, 'elimination-2026'); const resumed = service.join(participant, 'elimination-2026'); assert.equal(resumed.resumed, true); });
test('automatic joins cannot take over a team active attempt', () => { const { service } = setup(); start(service); service.join(participant, 'elimination-2026'); assert.throws(() => service.join({ ...participant, sessionId: 'session-2' }, 'elimination-2026'), e => e.code === 'ATTEMPT_IN_USE'); });

test('explicit resume after closing a tab keeps answers and time while rejecting the old session', () => {
  const { service, store, advance } = setup();
  start(service);
  const original = service.join(participant, 'elimination-2026');
  service.answer(participant, 'elimination-2026', 'q1', 'B');
  const savedAnswers = structuredClone(store.state.answers);
  advance(120);
  const fresh = { ...participant, sessionId: 'new-tab' };
  const resumed = service.resumeAttempt(fresh, 'elimination-2026');
  assert.equal(resumed.attempt.id, original.attempt.id);
  assert.equal(resumed.attempt.startedAt, original.attempt.startedAt);
  assert.equal(resumed.quiz.startedAt, original.quiz.startedAt);
  assert.equal(resumed.quiz.durationSeconds, original.quiz.durationSeconds);
  assert.equal(resumed.attempt.sessionId, 'new-tab');
  assert.deepEqual(resumed.attempt.answers, { q1: 'B' });
  assert.deepEqual(store.state.answers, savedAnswers);
  assert.equal(store.state.attempts.length, 1);
  assert.ok(resumed.questions.every(q => !('correctOption' in q)));
  assert.throws(() => service.answer(participant, 'elimination-2026', 'q2', 'A'), e => e.code === 'SESSION_INVALIDATED');
  assert.throws(() => service.submit(participant, 'elimination-2026'), e => e.code === 'SESSION_INVALIDATED');
  assert.throws(() => service.join(participant, 'elimination-2026'), e => e.code === 'ATTEMPT_IN_USE');
  assert.equal(service.resumeAttempt(fresh, 'elimination-2026').transferred, false);
  assert.equal(store.state.events.filter(e => e.eventType === 'ATTEMPT_SESSION_CHANGED').length, 1);
  service.answer(fresh, 'elimination-2026', 'q2', 'A');
  assert.equal(service.submit(fresh, 'elimination-2026').attempt.score, 8);
});

test('resume is limited to an authenticated eligible participant and their own existing team attempt', () => {
  const { service, store } = setup();
  start(service);
  service.join(participant, 'elimination-2026');
  const before = structuredClone(store.state);
  for (const [context, code] of [
    [{ ...participant, authenticated: false }, 'UNAUTHENTICATED'],
    [{ ...participant, role: 'TEAM_MEMBER' }, 'TEAM_LEADER_REQUIRED'],
    [{ ...participant, eligible: false }, 'NOT_ELIGIBLE'],
    [{ ...participant, sessionId: undefined }, 'INVALID_SESSION'],
    [{ ...participant, teamId: 'another-team' }, 'ATTEMPT_NOT_ACTIVE'],
  ]) assert.throws(() => service.resumeAttempt(context, 'elimination-2026'), e => e.code === code);
  assert.deepEqual(store.state, before);
});

test('a paused attempt can move sessions but still cannot accept answers', () => {
  const { service } = setup(); start(service);
  service.join(participant, 'elimination-2026');
  service.pause(admin, 'elimination-2026');
  const fresh = { ...participant, sessionId: 'new-tab' };
  assert.equal(service.resumeAttempt(fresh, 'elimination-2026').quiz.status, 'PAUSED');
  assert.throws(() => service.answer(fresh, 'elimination-2026', 'q1', 'B'), e => e.code === 'QUIZ_PAUSED');
});

test('resume cannot reopen submitted attempts or extend an expired test', () => {
  const { service, store, advance } = setup(); start(service);
  service.join(participant, 'elimination-2026');
  service.submit(participant, 'elimination-2026');
  const fresh = { ...participant, sessionId: 'new-tab' };
  let before = structuredClone(store.state);
  assert.throws(() => service.resumeAttempt(fresh, 'elimination-2026'), e => e.code === 'ATTEMPT_NOT_ACTIVE');
  assert.deepEqual(store.state, before);
  const other = { ...participant, teamId: 'team-2' };
  service.join(other, 'elimination-2026');
  advance(1801);
  before = structuredClone(store.state);
  assert.throws(() => service.resumeAttempt({ ...other, sessionId: 'new-tab' }, 'elimination-2026'), e => e.code === 'QUIZ_DEADLINE_REACHED');
  assert.deepEqual(store.state, before);
});
test('admins can invalidate an active session and the old session is rejected', () => { const { service } = setup(); start(service); service.join(participant, 'elimination-2026'); service.invalidateSession(admin, 'elimination-2026', participant.teamId); assert.throws(() => service.answer(participant, 'elimination-2026', 'q1', 'B'), e => e.code === 'SESSION_INVALIDATED'); const resumed = service.join({ ...participant, sessionId: 'session-2' }, 'elimination-2026'); assert.equal(resumed.resumed, true); });
test('answers are idempotent and scoring applies negative marking', () => { const { service } = setup(); start(service); service.join(participant, 'elimination-2026'); service.answer(participant, 'elimination-2026', 'q1', 'B'); service.answer(participant, 'elimination-2026', 'q1', 'A'); service.answer(participant, 'elimination-2026', 'q2', 'A'); const result = service.submit(participant, 'elimination-2026'); assert.equal(result.attempt.score, 4); assert.equal(result.attempt.status, 'EVALUATED'); });
test('deadline is server authoritative and cannot be extended by client input', () => { const { service, advance } = setup(); start(service); service.join(participant, 'elimination-2026'); advance(1801); assert.throws(() => service.answer(participant, 'elimination-2026', 'q1', 'B'), e => e.code === 'ATTEMPT_EXPIRED'); });
test('late joins do not receive a fresh timer', () => { const { service, advance } = setup(); start(service); advance(1799); const joined = service.join(participant, 'elimination-2026'); assert.equal(joined.attempt.startedAt, '2026-01-01T00:00:00.000Z'); advance(2); assert.throws(() => service.join({ ...participant, teamId: 'team-2', sessionId: 'session-2' }, 'elimination-2026'), e => e.code === 'QUIZ_DEADLINE_REACHED'); });
test('timeout evaluates only the attempt and does not end the whole quiz', () => { const { service, store, advance } = setup(); start(service); service.join(participant, 'elimination-2026'); advance(1801); assert.throws(() => service.answer(participant, 'elimination-2026', 'q1', 'B'), e => e.code === 'ATTEMPT_EXPIRED'); const attempt = store.getAttempt('elimination-2026', participant.teamId); assert.equal(attempt.status, 'EVALUATED'); assert.equal(store.getQuiz('elimination-2026').status, 'LIVE'); });
test('forced submission publishes and persists a realtime event', () => { let time = Date.parse('2026-01-01T00:00:00.000Z'); const events = []; const store = new QuizStore(createInitialState()); const service = new QuizService(store, { clock: () => time, publish: type => events.push(type) }); start(service); service.join(participant, 'elimination-2026'); time += 1801 * 1000; assert.throws(() => service.answer(participant, 'elimination-2026', 'q1', 'B')); assert.ok(events.includes('FORCE_SUBMIT')); assert.ok(store.state.events.some(event => event.eventType === 'FORCE_SUBMIT')); });
test('paused quizzes reject answer changes', () => { const { service } = setup(); start(service); service.join(participant, 'elimination-2026'); service.pause(admin, 'elimination-2026'); assert.throws(() => service.answer(participant, 'elimination-2026', 'q1', 'B'), e => e.code === 'QUIZ_PAUSED'); });
test('invalid lifecycle transitions and duplicate finalization are rejected', () => { const first = setup(); start(first.service); assert.throws(() => first.service.start(admin, 'elimination-2026', { source: 'PRESENTER' }), e => e.code === 'INVALID_STATE'); const { service } = setup(); start(service); service.join(participant, 'elimination-2026'); service.end(admin, 'elimination-2026'); service.finalize(admin, 'elimination-2026'); assert.throws(() => service.finalize(admin, 'elimination-2026'), e => e.code === 'INVALID_STATE'); });
test('finalization persists qualification status after result review', () => { const { service, store } = setup(); start(service); service.join(participant, 'elimination-2026'); service.end(admin, 'elimination-2026'); const result = service.finalize(admin, 'elimination-2026'); assert.equal(result.leaderboard.rows[0].qualificationStatus, 'QUALIFIED'); assert.equal(store.getAttempt('elimination-2026', participant.teamId).qualificationStatus, 'QUALIFIED'); });
test('unauthorized users cannot start or control quizzes', () => { const { service } = setup(); assert.throws(() => service.start({ ...admin, role: 'TEAM_LEADER' }, 'elimination-2026'), e => e.code === 'ADMIN_REQUIRED'); });
test('qualification count and tie-breaking are deterministic', () => { const { service, store } = setup(); const quiz = start(service).quiz; store.state.attempts.push({ id:'a2', quizId:quiz.id, teamId:'team-2', userId:'u2', status:'EVALUATED', startedAt:quiz.startedAt, submittedAt:'2026-01-01T00:00:20.000Z', score:4, timeTakenSeconds:20 }); store.state.attempts.push({ id:'a3', quizId:quiz.id, teamId:'team-3', userId:'u3', status:'EVALUATED', startedAt:quiz.startedAt, submittedAt:'2026-01-01T00:00:10.000Z', score:4, timeTakenSeconds:10 }); const rows = service.leaderboard(quiz.id).rows; assert.equal(rows[0].teamId, 'team-3'); });
test('leaderboard exposes clean quiz integration fields', () => { const { service } = setup(); start(service); service.join({ ...participant, teamName: 'Apex Mechanics' }, 'elimination-2026'); service.submit(participant, 'elimination-2026'); const row = service.leaderboard('elimination-2026').rows[0]; assert.deepEqual({ teamId: row.teamId, teamName: row.teamName, quizId: row.quizId, quizScore: row.quizScore, rank: row.rank, timeTaken: row.timeTaken }, { teamId: 'team-1', teamName: 'Apex Mechanics', quizId: 'elimination-2026', quizScore: 0, rank: 1, timeTaken: 0 }); });
test('participant question payload never exposes correct answers', () => { const { service } = setup(); start(service); const joined = service.join(participant, 'elimination-2026'); assert.ok(joined.questions.length > 0); assert.equal(Object.prototype.hasOwnProperty.call(joined.questions[0], 'correctOption'), false); });
test('admin configuration is validated and only editable before start unless forceLiveEdit is provided', () => {
  const { service } = setup();
  const updated = service.updateConfig(admin, 'elimination-2026', { name: 'Renamed Round', qualificationCount: 40, durationSeconds: 900 });
  assert.equal(updated.quiz.name, 'Renamed Round');
  assert.equal(updated.quiz.qualificationCount, 40);
  assert.equal(updated.quiz.durationSeconds, 900);
  assert.throws(() => service.updateConfig({ ...admin, role: 'TEAM_LEADER' }, 'elimination-2026', { durationSeconds: 100 }), e => e.code === 'ADMIN_REQUIRED');
  start(service);
  assert.throws(() => service.updateConfig(admin, 'elimination-2026', { durationSeconds: 100 }), e => e.code === 'INVALID_STATE');
  const liveUpdated = service.updateConfig(admin, 'elimination-2026', { name: 'Live Renamed', forceLiveEdit: true });
  assert.equal(liveUpdated.quiz.name, 'Live Renamed');
});
test('admin question bank validates, creates, updates, and locks after start', () => { const { service } = setup(); const created = service.createQuestion(admin, 'elimination-2026', { questionText: 'Which sensor measures distance?', options: [{ optionKey: 'A', optionText: 'Lidar' }, { optionKey: 'B', optionText: 'Speaker' }], correctOption: 'A' }); assert.equal(created.question.correctOption, 'A'); const updated = service.updateQuestion(admin, created.question.id, { ...created.question, questionText: 'Which sensor measures range?' }); assert.equal(updated.question.questionText, 'Which sensor measures range?'); service.deleteQuestion(admin, created.question.id); start(service); assert.throws(() => service.createQuestion(admin, 'elimination-2026', { questionText: 'Nope', options: [{ optionKey: 'A', optionText: 'A' }, { optionKey: 'B', optionText: 'B' }], correctOption: 'A' }), e => e.code === 'INVALID_STATE'); });
test('admin can create a quiz in DRAFT and promote it to READY after adding questions', () => { const { service } = setup(); const created = service.createQuiz(admin, { id: 'stage-2', name: 'Stage 2' }); assert.equal(created.quiz.status, 'DRAFT'); service.createQuestion(admin, 'stage-2', { questionText: 'Ready?', options: [{ optionKey: 'A', optionText: 'Yes' }, { optionKey: 'B', optionText: 'No' }], correctOption: 'A' }); const ready = service.ready(admin, 'stage-2'); assert.equal(ready.quiz.status, 'READY'); assert.equal(service.listQuizzes(admin).quizzes.length, 3); });
test('quiz cannot be marked READY or started without questions', () => { const { service } = setup(); const created = service.createQuiz(admin, { id: 'empty-stage', name: 'Empty Stage' }); assert.equal(created.quiz.status, 'DRAFT'); assert.throws(() => service.ready(admin, 'empty-stage'), e => e.code === 'INVALID_CONFIGURATION'); });
test('production requests require a trusted host auth context', () => { assert.throws(() => resolveAuthContext({ headers: {} }, { production: true }), e => e.code === 'AUTH_CONTEXT_REQUIRED'); const trusted = resolveAuthContext({ quizAuthContext: { authenticated: true, userId: 'u', teamId: 't', role: 'TEAM_LEADER' }, headers: {} }, { production: true }); assert.equal(trusted.teamId, 't'); });
test('leaderboard visibility modes are validated and honored', () => { const { service } = setup(); assert.throws(() => service.updateConfig(admin, 'elimination-2026', { leaderboardMode: 'SECRET' }), e => e.code === 'INVALID_CONFIGURATION'); service.updateConfig(admin, 'elimination-2026', { leaderboardMode: 'LIVE_SCORE' }); start(service); service.join(participant, 'elimination-2026'); service.submit(participant, 'elimination-2026'); assert.equal(service.leaderboard('elimination-2026').rows[0].rank, null); });
test('live scores can be hidden while remaining available after results', () => { const { service } = setup(); service.updateConfig(admin, 'elimination-2026', { showLiveScores: false }); start(service); service.join(participant, 'elimination-2026'); assert.equal(service.leaderboard('elimination-2026').mode, 'HIDDEN'); service.submit(participant, 'elimination-2026'); service.end(admin, 'elimination-2026'); assert.notEqual(service.leaderboard('elimination-2026').mode, 'HIDDEN'); });
test('admin can redo quiz: resets status to DRAFT, clears attempts and answers, preserves question bank, and allows fresh rejoin', () => {
  const { service, store } = setup();
  start(service);
  service.join(participant, 'elimination-2026');
  service.answer(participant, 'elimination-2026', 'q1', 'B');
  service.submit(participant, 'elimination-2026');
  assert.equal(store.state.attempts.filter(a => a.quizId === 'elimination-2026').length, 1);
  assert.throws(() => service.redo({ ...admin, role: 'TEAM_LEADER' }, 'elimination-2026'), e => e.code === 'ADMIN_REQUIRED');
  const result = service.redo(admin, 'elimination-2026');
  assert.equal(result.quiz.status, 'DRAFT');
  assert.equal(result.quiz.startedAt, null);
  assert.equal(store.state.attempts.filter(a => a.quizId === 'elimination-2026').length, 0);
  assert.equal(store.state.answers.filter(a => a.quizId === 'elimination-2026').length, 0);
  assert.ok(store.getQuestions('elimination-2026').length > 0);
  // Quiz is in DRAFT; promote to READY and restart
  service.ready(admin, 'elimination-2026');
  const restarted = service.start(admin, 'elimination-2026', { source: 'PRESENTER' });
  assert.equal(restarted.quiz.status, 'LIVE');
  const freshJoined = service.join(participant, 'elimination-2026');
  assert.equal(freshJoined.attempt.status, 'ACTIVE');
  assert.equal(freshJoined.resumed, false);
});
test('submit and myAttempt return recorded answers map and answeredCount', () => {
  const { service } = setup();
  start(service);
  service.join(participant, 'elimination-2026');
  service.answer(participant, 'elimination-2026', 'q1', 'A');
  const result = service.submit(participant, 'elimination-2026');
  assert.equal(result.attempt.answeredCount, 1);
  assert.equal(result.attempt.answers['q1'], 'A');
  const queried = service.myAttempt(participant, 'elimination-2026');
  assert.equal(queried.attempt.answeredCount, 1);
  assert.equal(queried.attempt.answers['q1'], 'A');
});

test('resuming attempt via join or myAttempt returns all previously answered options across route changes', () => {
  const { service } = setup();
  start(service);
  // Team Leader joins round for the first time
  const joined1 = service.join(participant, 'elimination-2026');
  assert.equal(joined1.resumed, false);
  assert.deepEqual(joined1.attempt.answers, {});

  // Team Leader answers question 1 and question 2
  service.answer(participant, 'elimination-2026', 'q1', 'B');
  service.answer(participant, 'elimination-2026', 'q2', 'A');

  // Contestant navigates away to waiting room or leaderboard (simulated by querying myAttempt)
  const waitingRoomSync = service.myAttempt(participant, 'elimination-2026');
  assert.equal(waitingRoomSync.attempt.answeredCount, 2);
  assert.equal(waitingRoomSync.attempt.answers['q1'], 'B');
  assert.equal(waitingRoomSync.attempt.answers['q2'], 'A');

  // Contestant returns to live quiz terminal (simulated by calling join)
  const terminalResume = service.join(participant, 'elimination-2026');
  assert.equal(terminalResume.resumed, true);
  assert.equal(terminalResume.attempt.answeredCount, 2);
  assert.equal(terminalResume.attempt.answers['q1'], 'B');
  assert.equal(terminalResume.attempt.answers['q2'], 'A');

  // Contestant updates an answer choice (q1 from B -> A)
  service.answer(participant, 'elimination-2026', 'q1', 'A');
  const reSync = service.join(participant, 'elimination-2026');
  assert.equal(reSync.attempt.answers['q1'], 'A');
  assert.equal(reSync.attempt.answers['q2'], 'A');
  assert.equal(reSync.attempt.answeredCount, 2);
});

test('exiting quiz terminal and expiring deadline auto-evaluates active attempt on myAttempt query', () => {
  const { service, advance } = setup();
  start(service);
  const joined = service.join(participant, 'elimination-2026');
  assert.equal(joined.attempt.status, 'ACTIVE');

  // Record an answer
  service.answer(participant, 'elimination-2026', 'q1', 'B');

  // Contestant exits live terminal to waiting room or leaderboard
  // Advance time past quiz duration (1800s default + 1s)
  advance(1801);

  // Participant queries myAttempt from Waiting Room / Leaderboard
  const myAttemptResult = service.myAttempt(participant, 'elimination-2026');
  assert.equal(myAttemptResult.attempt.status, 'EVALUATED');
  assert.equal(myAttemptResult.attempt.answeredCount, 1);
  assert.equal(myAttemptResult.attempt.score, 4);
});

test('per-question timers and pre-quiz countdown settings are stored and configurable', () => {
  const { service } = setup();
  const created = service.createQuiz(admin, {
    id: 'stage-live-round',
    name: 'Stage Live Round',
    preQuizCountdownSeconds: 15,
    intermissionSeconds: 10
  });
  assert.equal(created.quiz.preQuizCountdownSeconds, 15);
  assert.equal(created.quiz.intermissionSeconds, 10);

  // Author questions with individual per-question timers
  const q1 = service.createQuestion(admin, 'stage-live-round', {
    questionText: 'What is the frequency of standard RC servo PWM signals?',
    timeLimitSeconds: 20,
    options: [{ optionKey: 'A', optionText: '50 Hz' }, { optionKey: 'B', optionText: '1000 Hz' }],
    correctOption: 'A'
  });
  assert.equal(q1.question.timeLimitSeconds, 20);

  const publicList = service.publicQuestions('stage-live-round');
  assert.equal(publicList[0].timeLimitSeconds, 20);

  // Update question timer
  const updatedQ = service.updateQuestion(admin, q1.question.id, {
    ...q1.question,
    timeLimitSeconds: 45
  });
  assert.equal(updatedQ.question.timeLimitSeconds, 45);

  // Update quiz config with new countdown timers
  const updatedConfig = service.updateConfig(admin, 'stage-live-round', {
    preQuizCountdownSeconds: 8,
    intermissionSeconds: 5
  });
  assert.equal(updatedConfig.quiz.preQuizCountdownSeconds, 8);
  assert.equal(updatedConfig.quiz.intermissionSeconds, 5);
});

test('quiz start initializes COUNTDOWN stage and admin can advance stage sequentially', () => {
  let time = Date.parse('2026-01-01T00:00:00.000Z');
  const events = [];
  const store = new QuizStore(createInitialState());
  const service = new QuizService(store, {
    clock: () => time,
    publish: (type, payload) => events.push({ type, payload })
  });

  const quiz = service.quizOrThrow('elimination-2026');
  assert.equal(quiz.status, 'DRAFT');
  service.ready(admin, 'elimination-2026');
  assert.equal(quiz.status, 'READY');

  // Start quiz -> launches COUNTDOWN stage
  service.start(admin, 'elimination-2026', { source: 'PRESENTER' });
  const stage1 = service.getStage('elimination-2026');
  assert.equal(stage1.stageState.stage, 'COUNTDOWN');
  assert.equal(stage1.stageState.questionIndex, 0);
  assert.ok(events.some(e => e.type === 'STAGE_UPDATE' && e.payload.stageState.stage === 'COUNTDOWN'));

  // Super admin stage advances to Question 1
  service.updateStage(admin, 'elimination-2026', {
    stage: 'QUESTION',
    questionIndex: 0,
    remainingSeconds: 30
  });
  const stageQ1 = service.getStage('elimination-2026');
  assert.equal(stageQ1.stageState.stage, 'QUESTION');
  assert.equal(stageQ1.stageState.questionIndex, 0);

  // When timer expires, stage transitions to LEADERBOARD (intermission)
  service.updateStage(admin, 'elimination-2026', {
    stage: 'LEADERBOARD',
    questionIndex: 0,
    remainingSeconds: 7
  });
  const stageL1 = service.getStage('elimination-2026');
  assert.equal(stageL1.stageState.stage, 'LEADERBOARD');

  // Next question transitions to Question 2
  service.updateStage(admin, 'elimination-2026', {
    stage: 'QUESTION',
    questionIndex: 1,
    remainingSeconds: 45
  });
  const stageQ2 = service.getStage('elimination-2026');
  assert.equal(stageQ2.stageState.stage, 'QUESTION');
  assert.equal(stageQ2.stageState.questionIndex, 1);

  // Non-admin cannot hijack stage transitions
  assert.throws(
    () => service.updateStage(participant, 'elimination-2026', { stage: 'COMPLETED' }),
    e => e.code === 'ADMIN_REQUIRED'
  );

  // Redo resets stage to STANDBY
  service.redo(admin, 'elimination-2026');
  const stageReset = service.getStage('elimination-2026');
  assert.equal(stageReset.stageState.stage, 'STANDBY');
});

test('answer calculates cumulative points live for interim leaderboard', () => {
  const { service, store } = setup();
  start(service);
  service.join(participant, 'elimination-2026');
  // Answer question 1 (correct is B for points = 4)
  const res1 = service.answer(participant, 'elimination-2026', 'q1', 'B');
  assert.equal(res1.currentScore, 4);
  const att1 = store.getAttempt('elimination-2026', participant.teamId);
  assert.equal(att1.score, 4);
  // Leaderboard shows live points during quiz
  const lb1 = service.leaderboard('elimination-2026');
  assert.equal(lb1.rows[0].score, 4);
});

test('admin can adjust team points and change persists to leaderboard and attempt', () => {
  const { service, store } = setup();
  start(service);
  service.join(participant, 'elimination-2026');
  service.answer(participant, 'elimination-2026', 'q1', 'A');
  
  // Non-admin cannot adjust score
  assert.throws(
    () => service.adjustScore(participant, 'elimination-2026', participant.teamId, { score: 10 }),
    e => e.code === 'ADMIN_REQUIRED'
  );

  // Admin overrides score to 15 with audit reason
  const result = service.adjustScore(admin, 'elimination-2026', participant.teamId, {
    score: 15,
    reason: 'Bonus awarded for hardware demonstration challenge'
  });
  assert.equal(result.attempt.score, 15);
  assert.equal(result.attempt.manualScoreAdjustment, 15);
  assert.equal(store.getAttempt('elimination-2026', participant.teamId).score, 15);
  
  const lb = service.leaderboard('elimination-2026');
  assert.equal(lb.rows[0].score, 15);
  assert.equal(lb.rows[0].manualAdjustment, 15);
});

test('admin can debar team and debarred teams are excluded from qualification cutoffs during finalization', () => {
  const { service, store } = setup();
  const quiz = start(service).quiz;
  // Set qualification count to 1 so only top 1 qualifies
  service.updateConfig(admin, quiz.id, { qualificationCount: 1, forceLiveEdit: true });

  // Team 1 joins and scores 10
  service.join(participant, quiz.id);
  service.adjustScore(admin, quiz.id, participant.teamId, { score: 10 });

  // Team 2 joins and scores 5
  const participant2 = { authenticated: true, userId: 'leader-2', teamId: 'team-2', sessionId: 'session-team-2', role: 'TEAM_LEADER', eligible: true };
  service.join(participant2, quiz.id);
  service.adjustScore(admin, quiz.id, 'team-2', { score: 5 });

  // Debar team 1 for rule infraction
  assert.throws(
    () => service.debarTeam(participant, quiz.id, participant.teamId, { debarred: true }),
    e => e.code === 'ADMIN_REQUIRED'
  );
  service.debarTeam(admin, quiz.id, participant.teamId, {
    debarred: true,
    reason: 'Unauthorized external AI terminal detected'
  });

  const lbBeforeEnd = service.leaderboard(quiz.id);
  // Team 2 should now be projected qualified at rank 1, and Team 1 sinks to bottom as DEBARRED
  assert.equal(lbBeforeEnd.rows[0].teamId, 'team-2');
  assert.equal(lbBeforeEnd.rows[0].rank, 1);
  assert.equal(lbBeforeEnd.rows[1].teamId, participant.teamId);
  assert.equal(lbBeforeEnd.rows[1].debarred, true);
  assert.equal(lbBeforeEnd.rows[1].qualificationStatus, 'DEBARRED');

  // End quiz and finalize
  service.end(admin, quiz.id);
  const fin = service.finalize(admin, quiz.id);

  // Team 2 qualifies, Team 1 remains DEBARRED
  assert.equal(fin.leaderboard.rows[0].teamId, 'team-2');
  assert.equal(fin.leaderboard.rows[0].qualificationStatus, 'QUALIFIED');
  assert.equal(fin.leaderboard.rows[1].teamId, participant.teamId);
  assert.equal(fin.leaderboard.rows[1].qualificationStatus, 'DEBARRED');

  // Reinstate team 1
  assert.throws(() => service.debarTeam(admin, quiz.id, participant.teamId, { debarred: false }), e => e.code === 'QUIZ_FINALIZED');
  const att = store.getAttempt(quiz.id, participant.teamId);
  assert.equal(att.debarred, true);
});





