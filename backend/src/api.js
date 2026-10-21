// Shared API adapter for the legacy preview. Identity and permissions come from
// a server-verified token; browser role/team headers never grant access.
const API_BASE = (typeof window !== 'undefined' && window.QUIZ_API_BASE) || '';
const account = () => {
  try { return JSON.parse(localStorage.getItem('robothon-demo-account') || 'null'); }
  catch { return null; }
};
let refreshing;
async function request(path, options = {}, retry = true) {
  const current = account();
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'content-type': 'application/json', ...(current?.token ? { authorization: `Bearer ${current.token}` } : {}), ...options.headers },
  });
  if (response.status === 401 && retry && current?.refreshToken && !path.startsWith('/api/auth/') && path !== '/api/demo/login') {
    refreshing ??= fetch(`${API_BASE}/api/auth/refresh`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken: current.refreshToken }),
    }).then(async result => {
      const payload = await result.json();
      if (!result.ok) throw new Error(payload.message || 'Please sign in again.');
      localStorage.setItem('robothon-demo-account', JSON.stringify({ ...payload.account, token: payload.token, refreshToken: payload.refreshToken }));
    }).finally(() => { refreshing = null; });
    await refreshing;
    return request(path, options, false);
  }
  const payload = await response.json();
  if (!response.ok) {
    const error = new Error(payload.message || payload.error || `API request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return payload;
}
export const quizApi = {
  logout: () => request('/api/auth/logout', { method: 'POST' }),
  // --------------------------------------------------------------------------
  // AUTHENTICATION & DEMO UTILITIES
  // --------------------------------------------------------------------------
  /** Fetches available preset competition test accounts (disabled in production NODE_ENV) */
  demoAccounts: () => request('/api/demo/accounts'),

  /** Authenticates a contestant or admin against demo credentials */
  demoLogin: (email, password, portal) => request('/api/demo/login', {
    method: 'POST',
    body: JSON.stringify({ email, password, portal })
  }),

  // --------------------------------------------------------------------------
  // PARTICIPANT QUIZ OPERATIONS
  // --------------------------------------------------------------------------
  /** Returns list of all publicly visible quizzes (status: READY, LIVE, PAUSED, RESULTS) */
  active: () => request('/api/quizzes/active'),

  /**
   * Joins the quiz terminal. Validates Team Leader status and competition eligibility.
   * Resumes active attempt or creates a new one. Returns sanitized questions without answer keys.
   */
  join: quizId => request(`/api/quizzes/${quizId}/join`, { method: 'POST' }),

  /**
   * Idempotently saves an option selection for a question.
   * Server validates deadline and records answer to database.
   */
  answer: (quizId, questionId, selectedOption) => request(`/api/quizzes/${quizId}/answer`, {
    method: 'POST',
    body: JSON.stringify({ questionId, selectedOption })
  }),

  /**
   * Formally submits the team's attempt for authoritative grading and scoring.
   * Returns attempt with score, timeTakenSeconds, and answers map.
   */
  submit: quizId => request(`/api/quizzes/${quizId}/submit`, { method: 'POST' }),

  /**
   * Fetches the team's own attempt and submitted answers for audit & receipt display.
   */
  myAttempt: quizId => request(`/api/quizzes/${quizId}/my-attempt`),

  /**
   * Returns the official leaderboard standings according to quiz visibility modes.
   */
  leaderboard: quizId => request(`/api/quizzes/${quizId}/leaderboard`),

  // --------------------------------------------------------------------------
  // SUPER ADMIN OPERATIONS (Requires a verified SUPER_ADMIN account)
  // --------------------------------------------------------------------------
  /** Lifecycle transition controls: 'start' | 'pause' | 'resume' | 'end' | 'redo' */
  admin: (quizId, action) => request(`/api/admin/quizzes/${quizId}/${action}`, {
    method: 'POST',
  }),

  /** Updates quiz parameters (name, duration, scoring, cutoffs) */
  updateConfig: (quizId, config) => request(`/api/admin/quizzes/${quizId}`, {
    method: 'PATCH',
    body: JSON.stringify(config)
  }),

  /** Live telemetry stream of active attempts, answered counts, and live scores */
  adminLive: quizId => request(`/api/admin/quizzes/${quizId}/live`, {
  }),

  /** Full catalog of configured quizzes */
  adminQuizzes: () => request('/api/admin/quizzes', {
  }),

  /** Provisions a new quiz round in DRAFT state */
  createQuiz: quiz => request('/api/admin/quizzes', {
    method: 'POST',
    body: JSON.stringify(quiz)
  }),

  /** Promotes a quiz from DRAFT to READY state (verifies question bank is not empty) */
  ready: quizId => request(`/api/admin/quizzes/${quizId}/ready`, {
    method: 'POST',
  }),

  /** Fetches question bank including correctOption for administrative authoring */
  adminQuestions: quizId => request(`/api/admin/quizzes/${quizId}/questions`, {
  }),

  /** Adds a new single-choice question to the quiz question bank */
  createQuestion: (quizId, question) => request(`/api/admin/quizzes/${quizId}/questions`, {
    method: 'POST',
    body: JSON.stringify(question)
  }),

  /** Updates an existing question's prompt, options, or correct answer */
  updateQuestion: (questionId, question) => request(`/api/admin/questions/${questionId}`, {
    method: 'PATCH',
    body: JSON.stringify(question)
  }),

  /** Permanently deletes a question from the quiz */
  deleteQuestion: questionId => request(`/api/admin/questions/${questionId}`, {
    method: 'DELETE',
  }),

  /** Revokes a stuck or conflicting session so a team can reconnect */
  invalidateSession: (quizId, teamId) => request(`/api/admin/quizzes/${quizId}/sessions/${teamId}/invalidate`, {
    method: 'POST',
  }),

  /** Imports questions in bulk from JSON array */
  importQuiz: (quizId, payload) => request(`/api/admin/quizzes/${quizId}/import`, {
    method: 'POST',
    body: JSON.stringify(payload)
  }),

  /** Exports complete quiz question bank to downloadable JSON */
  exportQuiz: quizId => request(`/api/admin/quizzes/${quizId}/export`, {
  }),

  /** Resets attempts and scores for a redo while keeping question bank intact */
  redo: quizId => request(`/api/admin/quizzes/${quizId}/redo`, {
    method: 'POST',
  }),

  /** Retrieves live stage presenter telemetry and active question progress */
  getStage: quizId => request(`/api/quizzes/${quizId}/stage`),

  /** Authoritatively updates stage presenter state and broadcasts to contestants */
  updateStage: (quizId, stageData) => request(`/api/admin/quizzes/${quizId}/stage`, {
    method: 'POST',
    body: JSON.stringify(stageData)
  }),

  /** Manually adjusts / overrides a team's score in adjudication */
  adjustScore: (quizId, teamId, scoreData) => request(`/api/admin/quizzes/${quizId}/attempts/${teamId}/score`, {
    method: 'POST',
    body: JSON.stringify(scoreData)
  }),

  /** Debars / disqualifies or reinstates a team attempt */
  debarTeam: (quizId, teamId, debarData) => request(`/api/admin/quizzes/${quizId}/attempts/${teamId}/debar`, {
    method: 'POST',
    body: JSON.stringify(debarData)
  })
};

/**
 * ============================================================================
 * REAL-TIME EVENT STREAM (SSE)
 * ============================================================================
 * Connects to `/api/events` and dispatches live competition events.
 *
 * EVENT SUBSCRIPTION TYPES:
 * - 'CONNECTED': Initial connection handshake confirmed.
 * - 'QUIZ_STARTED': Organizer started quiz; triggers participant auto-entry.
 * - 'QUIZ_PAUSED': Quiz paused; disables answers while the deadline continues.
 * - 'QUIZ_RESUMED': Quiz resumed; re-enables inputs.
 * - 'QUIZ_ENDED': Quiz closed; evaluates active attempts and routes to Completed.
 * - 'QUIZ_READY': Host marked quiz ready; alerts waiting room participants.
 * - 'QUIZ_RESET': Admin executed Redo; clears contestant attempts and routes to waiting room.
 * - 'QUIZ_CONFIGURATION_UPDATED': Live parameter adjustment notification.
 * - 'QUIZ_QUESTIONS_UPDATED': Question bank edited live.
 * - 'LEADERBOARD_UPDATED': Real-time rank changes broadcasted.
 * - 'STAGE_UPDATE': Live stage question/leaderboard transition broadcast.
 * - 'FORCE_SUBMIT': Timeout or administrative force-close on active attempt.
 * - 'SESSION_INVALIDATED': Session token revoked due to conflicting login.
 * - 'QUALIFICATION_FINALIZED': Official advancement cutoffs sealed.
 * - 'CONNECTION_LOST': Network disconnect detected.
 *
 * @param {Function} onEvent Callback function: `(eventType, eventData) => void`
 * @returns {Function} Unsubscribe / teardown cleanup function
 */
export const quizEvents = onEvent => {
  const source = new EventSource(`${API_BASE}/api/events`);
  source.onopen = () => onEvent('CONNECTED');
  [
    'QUIZ_STARTED',
    'QUIZ_PAUSED',
    'QUIZ_RESUMED',
    'QUIZ_ENDED',
    'QUIZ_READY',
    'QUIZ_RESET',
    'QUIZ_CONFIGURATION_UPDATED',
    'QUIZ_QUESTIONS_UPDATED',
    'LEADERBOARD_UPDATED',
    'STAGE_UPDATE',
    'FORCE_SUBMIT',
    'SESSION_INVALIDATED',
    'QUALIFICATION_FINALIZED'
  ].forEach(type => {
    source.addEventListener(type, event => {
      try {
        onEvent(type, JSON.parse(event.data));
      } catch {
        onEvent(type, event.data);
      }
    });
  });
  source.onerror = () => onEvent('CONNECTION_LOST');
  return () => source.close();
};
