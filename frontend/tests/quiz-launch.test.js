import test from 'node:test';
import assert from 'node:assert/strict';
import { isRunningQuiz, preferredParticipantQuiz, quizLaunchTiming, quizRunKey } from '../src/services/quizLaunch.js';

const start = Date.parse('2026-10-19T12:00:00Z');
const quiz = (overrides = {}) => ({
  id: 'new-round', status: 'LIVE', startedAt: new Date(start).toISOString(),
  serverTime: new Date(start).toISOString(), durationSeconds: 1800, ...overrides,
});

test('the opening countdown displays every number from ten through zero before revealing questions', () => {
  for (let elapsed = 0; elapsed <= 10; elapsed++) {
    assert.equal(quizLaunchTiming(quiz(), start + elapsed * 1000).countdown, 10 - elapsed);
  }
  assert.equal(quizLaunchTiming(quiz(), start + 10800).countdown, 0);
  assert.equal(quizLaunchTiming(quiz(), start + 11000).countdown, null);
});

test('reloads and late joins use elapsed server time rather than restarting the countdown', () => {
  assert.equal(quizLaunchTiming(quiz(), start + 6500).countdown, 4);
  assert.deepEqual(quizLaunchTiming(quiz(), start + 60000), { secondsRemaining: 1740, countdown: null });
  assert.equal(quizLaunchTiming(quiz({ preQuizCountdownSeconds: 0 }), start).countdown, null);
});

test('pause, end and expiration cancel the countdown; resuming preserves the deadline', () => {
  for (const status of ['READY', 'DRAFT', 'PAUSED', 'RESULTS', 'FINALIZED']) {
    assert.equal(quizLaunchTiming(quiz({ status }), start).countdown, null, status);
  }
  assert.equal(quizLaunchTiming(quiz({ status: 'PAUSED' }), start + 20000).secondsRemaining, 1780);
  assert.equal(quizLaunchTiming(quiz(), start + 20000).countdown, null);
  assert.deepEqual(quizLaunchTiming(quiz({ durationSeconds: 5 }), start + 6000), { secondsRemaining: 0, countdown: null });
  assert.equal(isRunningQuiz(quiz({ serverTime: new Date(start + 1800000).toISOString() })), false);
});

test('the current live round takes priority over older results and the previously selected round', () => {
  const ended = quiz({ id: 'old', status: 'RESULTS' });
  const ready = quiz({ id: 'ready', status: 'READY', startedAt: null });
  const current = quiz();
  assert.equal(preferredParticipantQuiz([ended, ready, current], 'old'), current);
  assert.equal(preferredParticipantQuiz([ended, ready]), ready);
  assert.equal(preferredParticipantQuiz([quiz({ status: 'DRAFT' })]), undefined);
});

test('the newest live round wins and paused rounds remain accessible', () => {
  const older = quiz({ id: 'older', startedAt: new Date(start - 60000).toISOString() });
  const current = quiz();
  const paused = quiz({ id: 'paused', status: 'PAUSED' });
  assert.equal(preferredParticipantQuiz([older, current, paused]), current);
  assert.equal(preferredParticipantQuiz([paused]), paused);
});

test('restart creates a new launch identity while pause/resume keeps the same identity', () => {
  assert.equal(quizRunKey(quiz()), quizRunKey(quiz({ status: 'PAUSED' })));
  assert.notEqual(quizRunKey(quiz()), quizRunKey(quiz({ startedAt: new Date(start + 60000).toISOString() })));
});
