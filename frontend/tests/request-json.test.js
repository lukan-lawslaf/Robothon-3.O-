import test from 'node:test';
import assert from 'node:assert/strict';
import { requestJson, RequestTimeoutError } from '../src/services/requestJson.js';

const untilAborted = signal => new Promise((_, reject) => {
  if (signal.aborted) reject(signal.reason);
  else signal.addEventListener('abort', () => reject(signal.reason), { once: true });
});

test('a stalled join request times out instead of keeping the opening action pending', async t => {
  t.mock.method(globalThis, 'fetch', (_path, options) => untilAborted(options.signal));
  await assert.rejects(requestJson('/join', { method: 'POST' }, 20), RequestTimeoutError);
});

test('the deadline also covers a stalled response body', async t => {
  t.mock.method(globalThis, 'fetch', async (_path, options) => ({ json: () => untilAborted(options.signal) }));
  await assert.rejects(requestJson('/join', {}, 20), RequestTimeoutError);
});

test('session conflicts remain HTTP responses so the UI can display the server message', async t => {
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ error: 'ATTEMPT_IN_USE', message: 'This team already has an active attempt on another session.' }), { status: 409 }));
  const result = await requestJson('/join');
  assert.equal(result.response.status, 409);
  assert.equal(result.data.error, 'ATTEMPT_IN_USE');
});

test('a successful retry returns the saved attempt and does not inherit an old timeout', async t => {
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async (_path, options) => ++calls === 1 ? untilAborted(options.signal) : new Response(JSON.stringify({ attempt: { answers: { q1: 'A' } } })));
  await assert.rejects(requestJson('/join', {}, 20), RequestTimeoutError);
  assert.deepEqual((await requestJson('/join')).data.attempt.answers, { q1: 'A' });
});

test('caller cancellation also stops the request', async t => {
  t.mock.method(globalThis, 'fetch', (_path, options) => untilAborted(options.signal));
  const controller = new AbortController();
  const result = requestJson('/join', { signal: controller.signal });
  controller.abort();
  await assert.rejects(result, { name: 'AbortError' });
});
