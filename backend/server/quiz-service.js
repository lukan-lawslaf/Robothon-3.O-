/**
 * ============================================================================
 * ROBOTHON QUIZ MODULE — CORE BUSINESS LOGIC & STATE MACHINE ENGINE
 * ============================================================================
 *
 * SYSTEM ARCHITECTURE & INTEGRATION SPECIFICATION:
 * ----------------------------------------------------------------------------
 * This service implements the authoritative competition state machine.
 * It is completely decoupled from any specific database driver or HTTP transport.
 *
 * 1. DATABASE ENTITY MAPPINGS:
 *    - `quizzes`: Stores lifecycle state, configuration parameters, timing, and cutoffs.
 *    - `questions`: Stores prompt text, order index, question points, and category.
 *    - `question_options`: Keyed options ('A', 'B', 'C', 'D') with `is_correct`.
 *    - `quiz_attempts`: Tracks team attempt lifecycle, start/submission timestamps, score, and rank.
 *    - `quiz_answers`: Idempotent record of team option selection per question.
 *    - `quiz_events`: Append-only audit trail published to SSE stream.
 *
 * 2. LIFECYCLE STATE TRANSITIONS:
 *    - DRAFT -> READY (via `ready()`: Requires >= 1 question).
 *    - READY -> LIVE (via `start()`: Records authoritative `startedAt`).
 *    - LIVE <-> PAUSED (via `pause()` / `resume()`: Locks answers while paused).
 *    - LIVE/PAUSED -> RESULTS (via `end()`: Closes active attempts, runs grading).
 *    - RESULTS -> FINALIZED (via `finalize()`: Demarcates advancement cutoff).
 *    - ANY -> READY/DRAFT (via `redo()`: Resets attempts/scores, retains question bank).
 *
 * 3. ZERO-BUG SAFETY INVARIANTS:
 *    - Authoritative Deadline: `startedAt + durationSeconds` is enforced on the server.
 *      Late joins receive the remaining round duration, not a fresh timer.
 *    - Idempotent Answers: Submitting multiple answer requests for the same question
 *      safely overwrites the selected option without creating duplicate answer rows.
 *    - One Active Session Per Team: Automatic joins cannot replace a session. An
 *      authenticated participant can explicitly resume their team's existing attempt
 *      in a new session; the previous session immediately loses write access.
 *    - Public Sanitize: `publicQuestions()` strips `correctOption` from participant payloads.
 * ============================================================================
 */

import { basicRoboticsQuestions } from './basic-quiz.js';

export class QuizError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const activeAttempt = a => ['ACTIVE'].includes(a.status);
const nowIso = clock => new Date(clock()).toISOString();

/**
 * Server-authoritative speed-priority bonus for correct answers:
 * - 1st–5th fastest correct teams: +3 bonus
 * - 6th–15th fastest correct teams: +2 bonus
 * - 16th–30th fastest correct teams: +1 bonus
 * - 31st onward: +0 bonus
 */
export function getSpeedBonus(rank) {
  if (rank >= 1 && rank <= 5) return 3;
  if (rank >= 6 && rank <= 15) return 2;
  if (rank >= 16 && rank <= 30) return 1;
  return 0;
}

export class QuizService {
  constructor(store, { clock = Date.now, publish = () => {} } = {}) {
    this.store = store;
    this.clock = clock;
    this.publish = publish;
  }

  /**
   * Authoritatively ranks all correct answers for a specific question based on server timestamp
   * and sequence, then awards customizable base points + whole-number speed bonus.
   */
  recalculateQuestionPoints(quizId, questionId) {
    const quiz = this.quizOrThrow(quizId);
    const question = this.store.getQuestions(quizId).find(q => q.id === questionId);
    if (!question) return;
    const basePoints = Number.isFinite(question.points) ? question.points : (quiz.pointsPerCorrect ?? 5);

    const qAnswers = this.store.state.answers.filter(a => a.questionId === questionId);

    // Wrong answers receive 0 points, no negative marking, no speed rank
    qAnswers.filter(a => a.selectedOption !== question.correctOption).forEach(a => {
      a.isCorrect = false;
      a.speedRank = null;
      a.speedBonus = 0;
      a.basePoints = 0;
      a.pointsAwarded = 0;
    });

    // Correct answers ranked strictly by server-authoritative timestamp & order
    const correctAnswers = qAnswers.filter(a => a.selectedOption === question.correctOption);
    correctAnswers.sort((a, b) => {
      const timeA = Date.parse(a.answeredAt || 0);
      const timeB = Date.parse(b.answeredAt || 0);
      if (timeA !== timeB) return timeA - timeB;
      return (a.serverSeq || 0) - (b.serverSeq || 0);
    });

    correctAnswers.forEach((a, index) => {
      const rank = index + 1;
      const speedBonus = getSpeedBonus(rank);
      a.isCorrect = true;
      a.speedRank = rank;
      a.speedBonus = speedBonus;
      a.basePoints = basePoints;
      a.pointsAwarded = basePoints + speedBonus;
    });
  }

  /**
   * Recalculates total cumulative score for an attempt summing pointsAwarded + adjustments.
   */
  recalculateAttemptScore(quizId, attempt) {
    const teamAnswers = this.store.state.answers.filter(a => a.attemptId === attempt.id);
    const totalPoints = teamAnswers.reduce((sum, a) => sum + (a.pointsAwarded || 0), 0);
    attempt.score = totalPoints + (attempt.manualScoreAdjustment ?? 0);
  }

  /**
   * Recalculates all questions and attempt scores across an entire quiz.
   */
  recalculateQuizScores(quizId) {
    const questions = this.store.getQuestions(quizId);
    questions.forEach(q => {
      this.recalculateQuestionPoints(quizId, q.id);
    });
    const attempts = this.store.state.attempts.filter(a => a.quizId === quizId);
    attempts.forEach(att => {
      this.recalculateAttemptScore(quizId, att);
    });
  }

  emit(type, payload = {}) {
    const quizId = payload.quizId || payload.quiz?.id;
    if (quizId) {
      this.store.state.events.push({
        quizId,
        teamId: payload.teamId || null,
        attemptId: payload.attemptId || null,
        eventType: type,
        timestamp: nowIso(this.clock),
        metadata: payload
      });
    }
    this.store.save();
    this.publish(type, payload);
  }
  quizOrThrow(id) { const quiz = this.store.getQuiz(id); if (!quiz) throw new QuizError(404, 'QUIZ_NOT_FOUND', 'Quiz was not found.'); return quiz; }
  listQuizzes(context) { this.adminOrThrow(context); return { quizzes: this.store.state.quizzes.map(quiz => this.publicQuiz(quiz)) }; }
  createBasicQuiz(context, input = {}) {
    this.adminOrThrow(context);
    this.createQuiz(context, {
      id: input.id, name: input.name?.trim() || 'Basic robotics quiz',
      durationSeconds: input.durationSeconds ?? 300,
      pointsPerCorrect: 1, preQuizCountdownSeconds: 10,
    });
    this.importQuiz(context, input.id, { questions: basicRoboticsQuestions });
    this.quizOrThrow(input.id).template = 'BASIC_ROBOTICS';
    return this.ready(context, input.id);
  }
  createQuiz(context, input) { this.adminOrThrow(context); if (!input?.id || !input?.name) throw new QuizError(422, 'INVALID_CONFIGURATION', 'Quiz id and name are required.'); if (this.store.getQuiz(input.id)) throw new QuizError(409, 'QUIZ_EXISTS', 'A quiz with this id already exists.'); const quiz = { id: input.id, name: input.name, type: input.type || 'ELIMINATION', status: 'DRAFT', durationSeconds: input.durationSeconds ?? 900, qualificationCount: input.qualificationCount ?? 50, pointsPerCorrect: input.pointsPerCorrect ?? 1, allowNavigation: input.allowNavigation ?? true, showLiveScores: input.showLiveScores ?? true, leaderboardMode: input.leaderboardMode || 'LIVE_RANK', autoSubmitOnTimeout: input.autoSubmitOnTimeout ?? true, oneAttemptPerTeam: input.oneAttemptPerTeam ?? true, teamLeaderOnly: input.teamLeaderOnly ?? true, tieBreaker: input.tieBreaker || 'TIME_TAKEN', preQuizCountdownSeconds: input.preQuizCountdownSeconds ?? 10, intermissionSeconds: input.intermissionSeconds ?? 7, stageState: { stage: 'STANDBY', questionIndex: 0 }, createdAt: nowIso(this.clock), startedAt: null, endedAt: null, finalizedAt: null }; this.validateConfig(quiz); this.store.state.quizzes.push(quiz); this.store.save(); return { quiz: this.publicQuiz(quiz) }; }
  validateConfig(quiz, { requireQuestions = false } = {}) { if (requireQuestions && this.store.getQuestions(quiz.id).length === 0) throw new QuizError(422, 'INVALID_CONFIGURATION', 'At least one question is required before the quiz can be made READY or LIVE.'); if (!Number.isInteger(quiz.durationSeconds) || quiz.durationSeconds <= 0) throw new QuizError(422, 'INVALID_CONFIGURATION', 'Duration must be a positive integer.'); if (!Number.isInteger(quiz.qualificationCount) || quiz.qualificationCount < 1) throw new QuizError(422, 'INVALID_CONFIGURATION', 'Qualification count must be at least 1.');  if (quiz.preQuizCountdownSeconds !== undefined && (!Number.isInteger(quiz.preQuizCountdownSeconds) || quiz.preQuizCountdownSeconds < 0)) throw new QuizError(422, 'INVALID_CONFIGURATION', 'Pre-quiz countdown must be a non-negative integer.'); if (quiz.intermissionSeconds !== undefined && (!Number.isInteger(quiz.intermissionSeconds) || quiz.intermissionSeconds < 0)) throw new QuizError(422, 'INVALID_CONFIGURATION', 'Intermission timer must be a non-negative integer.'); if (!['LIVE_SCORE', 'LIVE_RANK', 'HIDDEN'].includes(quiz.leaderboardMode)) throw new QuizError(422, 'INVALID_CONFIGURATION', 'Leaderboard mode is invalid.'); if (!['TIME_TAKEN', 'SUBMISSION_TIME', 'SCORE_THEN_TIME'].includes(quiz.tieBreaker)) throw new QuizError(422, 'INVALID_CONFIGURATION', 'Tie-breaker mode is invalid.'); return true; }
  participantOrThrow(context, quiz) { if (!context?.authenticated) throw new QuizError(401, 'UNAUTHENTICATED', 'Authentication is required.'); if (!context.teamId) throw new QuizError(403, 'TEAM_REQUIRED', 'A registered team is required.'); if (quiz.teamLeaderOnly && context.role !== 'TEAM_LEADER') throw new QuizError(403, 'TEAM_LEADER_REQUIRED', 'Only the registered team leader can participate.'); if (context.eligible === false) throw new QuizError(403, 'NOT_ELIGIBLE', 'This team is not eligible for the quiz.'); }
  sessionOrThrow(context, attempt) { if (attempt.sessionInvalidated || (attempt.sessionId && attempt.sessionId !== context.sessionId)) throw new QuizError(409, 'SESSION_INVALIDATED', 'This quiz session is no longer active.'); }
  adminOrThrow(context) { if (!context?.authenticated) throw new QuizError(401, 'UNAUTHENTICATED', 'Authentication is required.'); if (context.role !== 'SUPER_ADMIN') throw new QuizError(403, 'ADMIN_REQUIRED', 'Super administrator access is required.'); }
  deadline(quiz) { return Date.parse(quiz.startedAt) + quiz.durationSeconds * 1000; }
  ensureNotExpired(quiz) { if (['ENDED', 'RESULTS', 'FINALIZED'].includes(quiz.status)) throw new QuizError(409, 'QUIZ_ENDED', 'The quiz is no longer accepting responses.'); if (quiz.startedAt && this.clock() >= this.deadline(quiz)) throw new QuizError(409, 'QUIZ_DEADLINE_REACHED', 'The quiz deadline has passed.'); }
  publicQuiz(quiz) { return { ...quiz, questionCount: this.store.getQuestions(quiz.id).length, serverTime: nowIso(this.clock) }; }
  publicAttempt(attempt) { if (!attempt) return null; const answersMap = {}; this.store.state.answers.filter(a => a.attemptId === attempt.id).forEach(a => { answersMap[a.questionId] = a.selectedOption; }); return { ...attempt, answers: answersMap, answeredCount: Object.keys(answersMap).length }; }
  myAttempt(context, quizId) { const quiz = this.quizOrThrow(quizId); this.participantOrThrow(context, quiz); const attempt = this.store.getAttempt(quizId, context.teamId); if (attempt && attempt.status === 'ACTIVE' && quiz.startedAt && this.clock() >= this.deadline(quiz)) { this.evaluate(quiz, attempt); this.emit('FORCE_SUBMIT', { quizId, teamId: attempt.teamId, attemptId: attempt.id }); } return { attempt: this.publicAttempt(attempt) }; }
  publicQuestions(quizId) { return this.store.getQuestions(quizId).map(q => ({ id: q.id, quizId: q.quizId, questionText: q.questionText, questionType: q.questionType, points: q.points, orderIndex: q.orderIndex, timeLimitSeconds: q.timeLimitSeconds ?? 30, options: q.options })); }
  adminQuestions(context, quizId) { this.adminOrThrow(context); this.quizOrThrow(quizId); return { questions: this.store.getQuestions(quizId) }; }
  validateQuestion(input) { if (!input?.questionText?.trim()) throw new QuizError(422, 'INVALID_QUESTION', 'Question text is required.'); if (!Array.isArray(input.options) || input.options.length < 2) throw new QuizError(422, 'INVALID_QUESTION', 'At least two options are required.'); const keys = input.options.map(option => option.optionKey); if (new Set(keys).size !== keys.length || keys.some(key => !key)) throw new QuizError(422, 'INVALID_QUESTION', 'Option keys must be unique and non-empty.'); if (!keys.includes(input.correctOption)) throw new QuizError(422, 'INVALID_QUESTION', 'Correct option must match an option key.'); }
  createQuestion(context, quizId, input) { this.adminOrThrow(context); const quiz = this.quizOrThrow(quizId); if (!['DRAFT', 'READY'].includes(quiz.status) && !input?.forceLiveEdit) throw new QuizError(409, 'INVALID_STATE', 'Questions can only change while DRAFT or READY.'); this.validateQuestion(input); const questions = this.store.getQuestions(quizId); const question = { id: input.id || `q-${Date.now()}-${questions.length + 1}`, quizId, questionText: input.questionText.trim(), questionType: input.questionType || 'SINGLE_CHOICE', points: Number.isFinite(input.points) ? input.points : quiz.pointsPerCorrect, orderIndex: input.orderIndex || questions.length + 1, timeLimitSeconds: Number.isInteger(input.timeLimitSeconds) && input.timeLimitSeconds > 0 ? input.timeLimitSeconds : 30, options: input.options.map(option => ({ id: option.id || `${input.id || 'q'}-${option.optionKey.toLowerCase()}`, optionKey: option.optionKey, optionText: option.optionText })), correctOption: input.correctOption, category: input.category || 'General' }; this.store.state.questions.push(question); this.store.save(); this.emit('QUIZ_QUESTIONS_UPDATED', { quizId }); return { question }; }
  updateQuestion(context, questionId, input) { this.adminOrThrow(context); const question = this.store.state.questions.find(item => item.id === questionId); if (!question) throw new QuizError(404, 'QUESTION_NOT_FOUND', 'Question was not found.'); const quiz = this.quizOrThrow(question.quizId); if (!['DRAFT', 'READY'].includes(quiz.status) && !input?.forceLiveEdit) throw new QuizError(409, 'INVALID_STATE', 'Questions can only change while DRAFT or READY.'); const updated = { ...question, ...input, id: question.id, quizId: question.quizId, timeLimitSeconds: Number.isInteger(input.timeLimitSeconds) && input.timeLimitSeconds > 0 ? input.timeLimitSeconds : (question.timeLimitSeconds || 30) }; this.validateQuestion(updated); Object.assign(question, updated); this.recalculateQuizScores(question.quizId); this.store.save(); this.emit('QUIZ_QUESTIONS_UPDATED', { quizId: question.quizId }); this.emit('LEADERBOARD_UPDATED', { quizId: question.quizId }); return { question }; }
  deleteQuestion(context, questionId, options = {}) { this.adminOrThrow(context); const index = this.store.state.questions.findIndex(item => item.id === questionId); if (index < 0) throw new QuizError(404, 'QUESTION_NOT_FOUND', 'Question was not found.'); const quiz = this.quizOrThrow(this.store.state.questions[index].quizId); if (!['DRAFT', 'READY'].includes(quiz.status) && !options?.forceLiveEdit) throw new QuizError(409, 'INVALID_STATE', 'Questions can only change while DRAFT or READY.'); const quizId = quiz.id; this.store.state.questions.splice(index, 1); this.recalculateQuizScores(quizId); this.store.save(); this.emit('QUIZ_QUESTIONS_UPDATED', { quizId }); this.emit('LEADERBOARD_UPDATED', { quizId }); return { deleted: true, questionId }; }
  exportQuiz(context, quizId) { this.adminOrThrow(context); const quiz = this.quizOrThrow(quizId); const questions = this.store.getQuestions(quizId); return { id: quiz.id, name: quiz.name, durationSeconds: quiz.durationSeconds, qualificationCount: quiz.qualificationCount, pointsPerCorrect: quiz.pointsPerCorrect, preQuizCountdownSeconds: quiz.preQuizCountdownSeconds ?? 10, intermissionSeconds: quiz.intermissionSeconds ?? 7, questions: questions.map(q => ({ questionText: q.questionText, points: q.points, category: q.category || 'General', timeLimitSeconds: q.timeLimitSeconds || 30, options: q.options.map(o => ({ optionKey: o.optionKey, optionText: o.optionText })), correctOption: q.correctOption })) }; }
  importQuiz(context, quizId, payload) { this.adminOrThrow(context); const quiz = this.quizOrThrow(quizId); const rawList = Array.isArray(payload) ? payload : (payload?.questions || []); if (!Array.isArray(rawList) || rawList.length === 0) throw new QuizError(422, 'INVALID_IMPORT', 'Import payload must include an array of questions.'); rawList.forEach(q => this.validateQuestion(q)); if (payload.mode !== 'append') { this.store.state.questions = this.store.state.questions.filter(q => q.quizId !== quizId); } const existing = this.store.getQuestions(quizId); rawList.forEach((q, idx) => { const question = { id: `q-${quizId}-${Date.now()}-${idx + 1}`, quizId, questionText: q.questionText.trim(), questionType: 'SINGLE_CHOICE', points: Number.isFinite(q.points) ? q.points : quiz.pointsPerCorrect, orderIndex: existing.length + idx + 1, timeLimitSeconds: Number.isInteger(q.timeLimitSeconds) && q.timeLimitSeconds > 0 ? q.timeLimitSeconds : 30, options: q.options.map(o => ({ id: `opt-${o.optionKey.toLowerCase()}-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`, optionKey: o.optionKey, optionText: o.optionText })), correctOption: q.correctOption, category: q.category || 'General' }; this.store.state.questions.push(question); }); if (typeof payload.name === 'string') quiz.name = payload.name; if (Number.isInteger(payload.durationSeconds) && payload.durationSeconds > 0) quiz.durationSeconds = payload.durationSeconds; if (Number.isInteger(payload.qualificationCount) && payload.qualificationCount > 0) quiz.qualificationCount = payload.qualificationCount; if (Number.isFinite(payload.pointsPerCorrect)) quiz.pointsPerCorrect = payload.pointsPerCorrect;   if (Number.isInteger(payload.preQuizCountdownSeconds) && payload.preQuizCountdownSeconds >= 0) quiz.preQuizCountdownSeconds = payload.preQuizCountdownSeconds; if (Number.isInteger(payload.intermissionSeconds) && payload.intermissionSeconds >= 0) quiz.intermissionSeconds = payload.intermissionSeconds; this.store.save(); this.emit('QUIZ_QUESTIONS_UPDATED', { quizId }); return { success: true, count: rawList.length, quiz: this.publicQuiz(quiz) }; }
  join(context, quizId) { const quiz = this.quizOrThrow(quizId); this.participantOrThrow(context, quiz); if (quiz.status !== 'LIVE') throw new QuizError(409, 'QUIZ_NOT_LIVE', 'The quiz is not accepting attempts.'); this.ensureNotExpired(quiz); const existing = this.store.getAttempt(quizId, context.teamId); if (existing) { if (existing.status === 'ACTIVE') { if (existing.sessionInvalidated) { existing.sessionId = context.sessionId; existing.sessionInvalidated = false; } else if (existing.sessionId && existing.sessionId !== context.sessionId) throw new QuizError(409, 'ATTEMPT_IN_USE', 'This team already has an active attempt on another session.'); else if (!existing.sessionId) existing.sessionId = context.sessionId; return { attempt: this.publicAttempt(existing), quiz: this.publicQuiz(quiz), questions: this.publicQuestions(quizId), resumed: true }; } throw new QuizError(409, 'ATTEMPT_ALREADY_EXISTS', 'This team already has a completed attempt.'); } const attempt = { id: `attempt-${context.teamId}-${quizId}`, quizId, teamId: context.teamId, teamName: context.teamName || context.teamId, userId: context.userId, sessionId: context.sessionId, sessionInvalidated: false, status: 'ACTIVE', startedAt: quiz.startedAt, submittedAt: null, score: null, timeTakenSeconds: null }; this.store.state.attempts.push(attempt); this.store.state.events.push({ quizId, teamId: context.teamId, attemptId: attempt.id, eventType: 'ATTEMPT_STARTED', timestamp: nowIso(this.clock), metadata: {} }); this.store.save(); return { attempt: this.publicAttempt(attempt), quiz: this.publicQuiz(quiz), questions: this.publicQuestions(quizId), resumed: false }; }
  resumeAttempt(context, quizId) {
    const quiz = this.quizOrThrow(quizId);
    this.participantOrThrow(context, quiz);
    if (!context.sessionId) throw new QuizError(401, 'INVALID_SESSION', 'Please sign in again.');
    this.ensureNotExpired(quiz);
    if (!['LIVE', 'PAUSED'].includes(quiz.status)) throw new QuizError(409, 'QUIZ_NOT_LIVE', 'This quiz cannot be resumed yet.');
    // Identity comes from authentication, never a team or session supplied in the body.
    const attempt = this.store.getAttempt(quizId, context.teamId);
    if (!attempt || attempt.status !== 'ACTIVE') throw new QuizError(409, 'ATTEMPT_NOT_ACTIVE', 'There is no active attempt to resume. Submitted attempts cannot be reopened.');
    const transferred = attempt.sessionId !== context.sessionId || !!attempt.sessionInvalidated;
    if (transferred) {
      attempt.sessionId = context.sessionId;
      attempt.sessionInvalidated = false;
      this.emit('ATTEMPT_SESSION_CHANGED', { quizId, teamId: attempt.teamId, attemptId: attempt.id });
    }
    // Keep the original attempt, answers, start time and server deadline intact.
    return { attempt: this.publicAttempt(attempt), quiz: this.publicQuiz(quiz), questions: this.publicQuestions(quizId), resumed: true, transferred };
  }
  answer(context, quizId, questionId, selectedOption) {
    const quiz = this.quizOrThrow(quizId);
    this.participantOrThrow(context, quiz);
    const attempt = this.store.getAttempt(quizId, context.teamId);
    if (!attempt || attempt.status !== 'ACTIVE') throw new QuizError(409, 'ATTEMPT_NOT_ACTIVE', 'There is no active attempt for this team.');
    this.sessionOrThrow(context, attempt);
    if (quiz.status === 'PAUSED') throw new QuizError(409, 'QUIZ_PAUSED', 'Answers cannot be changed while the quiz is paused.');
    try {
      this.ensureNotExpired(quiz);
    } catch (error) {
      if (error.code === 'QUIZ_DEADLINE_REACHED') {
        this.evaluate(quiz, attempt);
        this.emit('FORCE_SUBMIT', { quizId, teamId: attempt.teamId, attemptId: attempt.id });
        throw new QuizError(409, 'ATTEMPT_EXPIRED', 'Your attempt was automatically submitted when time expired.');
      }
      throw error;
    }
    const question = this.store.getQuestions(quizId).find(q => q.id === questionId);
    if (!question) throw new QuizError(404, 'QUESTION_NOT_FOUND', 'Question was not found.');
    if (!question.options.some(o => o.optionKey === selectedOption)) throw new QuizError(422, 'INVALID_OPTION', 'Selected option is not valid.');

    const answeredAt = nowIso(this.clock);
    this.store.state.answerSeq = (this.store.state.answerSeq || 0) + 1;
    const serverSeq = this.store.state.answerSeq;

    const existing = this.store.state.answers.find(a => a.attemptId === attempt.id && a.questionId === questionId);
    const answer = existing || { id: `answer-${attempt.id}-${questionId}`, attemptId: attempt.id, quizId, questionId };
    const isCorrect = question.correctOption === selectedOption;

    Object.assign(answer, { quizId, selectedOption, answeredAt, serverSeq, isCorrect });
    if (!existing) this.store.state.answers.push(answer);

    // Authoritatively re-rank question speed bonuses across all answering teams
    this.recalculateQuestionPoints(quizId, questionId);

    // Update cumulative scores for all teams that answered this question
    const affectedAttemptIds = new Set(this.store.state.answers.filter(a => a.questionId === questionId).map(a => a.attemptId));
    this.store.state.attempts.filter(att => affectedAttemptIds.has(att.id)).forEach(att => {
      this.recalculateAttemptScore(quizId, att);
    });

    attempt.timeTakenSeconds = Math.max(0, Math.floor((Date.parse(answeredAt) - Date.parse(attempt.startedAt)) / 1000));
    this.store.save();
    this.emit('LEADERBOARD_UPDATED', { quizId });
    return {
      answer: {
        questionId,
        selectedOption,
        status: 'SAVED',
        pointsAwarded: answer.pointsAwarded,
        speedBonus: answer.speedBonus,
        speedRank: answer.speedRank
      },
      currentScore: attempt.score
    };
  }
  submit(context, quizId) { const quiz = this.quizOrThrow(quizId); this.participantOrThrow(context, quiz); const attempt = this.store.getAttempt(quizId, context.teamId); if (!attempt) throw new QuizError(404, 'ATTEMPT_NOT_FOUND', 'There is no attempt for this team.'); this.sessionOrThrow(context, attempt); if (attempt.status === 'SUBMITTED' || attempt.status === 'EVALUATED') return { attempt: this.publicAttempt(attempt) }; try { this.ensureNotExpired(quiz); } catch (error) { if (error.code === 'QUIZ_DEADLINE_REACHED') { const result = this.evaluate(quiz, attempt); this.emit('FORCE_SUBMIT', { quizId, teamId: attempt.teamId, attemptId: attempt.id }); return { ...result, timedOut: true }; } throw error; } return this.evaluate(quiz, attempt); }
  evaluate(quiz, attempt) {
    if (attempt.status === 'ACTIVE') {
      attempt.status = 'SUBMITTED';
      this.emit('ATTEMPT_SUBMITTED', { quizId: quiz.id, teamId: attempt.teamId, attemptId: attempt.id });
    }
    this.recalculateQuizScores(quiz.id);
    attempt.status = 'EVALUATED';
    attempt.submittedAt = nowIso(this.clock);
    attempt.timeTakenSeconds = Math.max(0, Math.floor((Date.parse(attempt.submittedAt) - Date.parse(attempt.startedAt)) / 1000));
    this.store.save();
    this.emit('LEADERBOARD_UPDATED', { quizId: quiz.id });
    return { attempt: this.publicAttempt(attempt) };
  }
  updateConfig(context, quizId, patch) {
    this.adminOrThrow(context);
    const quiz = this.quizOrThrow(quizId);
    if (!['DRAFT', 'READY'].includes(quiz.status) && !patch?.forceLiveEdit) throw new QuizError(409, 'INVALID_STATE', 'Quiz configuration can only change while DRAFT or READY.');
    const fields = ['name', 'durationSeconds', 'qualificationCount', 'pointsPerCorrect', 'allowNavigation', 'showLiveScores', 'leaderboardMode', 'autoSubmitOnTimeout', 'oneAttemptPerTeam', 'teamLeaderOnly', 'tieBreaker', 'preQuizCountdownSeconds', 'perQuestionSeconds', 'intermissionSeconds'];
    const metaKeys = new Set(['forceLiveEdit']);
    Object.keys(patch || {}).filter(key => !fields.includes(key) && !metaKeys.has(key)).forEach(key => { throw new QuizError(422, 'INVALID_CONFIGURATION_FIELD', `Unsupported configuration field: ${key}.`); });
    fields.forEach(key => { if (patch[key] !== undefined) quiz[key] = patch[key]; });
    if (patch.pointsPerCorrect !== undefined) {
      quiz.pointsPerCorrect = Number(patch.pointsPerCorrect);
      const questions = this.store.getQuestions(quizId);
      questions.forEach(q => {
        q.points = Number(patch.pointsPerCorrect);
      });
      this.recalculateQuizScores(quizId);
      this.emit('LEADERBOARD_UPDATED', { quizId });
    }
    this.validateConfig(quiz);
    this.store.save();
    this.emit('QUIZ_CONFIGURATION_UPDATED', { quiz: this.publicQuiz(quiz) });
    return { quiz: this.publicQuiz(quiz) };
  }
  ready(context, quizId) {
    this.adminOrThrow(context);
    const quiz = this.quizOrThrow(quizId);
    if (quiz.status !== 'DRAFT') throw new QuizError(409, 'INVALID_STATE', 'Only DRAFT quizzes can be marked READY.');
    this.validateConfig(quiz, { requireQuestions: true });
    const questions = this.store.getQuestions(quiz.id);
    const errors = [];
    if (!questions || questions.length === 0) {
      errors.push('Quiz must contain at least one question.');
    } else {
      questions.forEach((q, idx) => {
        if (!q.questionText || !q.questionText.trim()) errors.push(`Question #${idx + 1} is missing question text.`);
        if (!Array.isArray(q.options) || q.options.length < 2) errors.push(`Question #${idx + 1} must have at least 2 options.`);
        else {
          const keys = q.options.map(o => o.optionKey);
          if (!q.correctOption || !keys.includes(q.correctOption)) errors.push(`Question #${idx + 1} has an invalid or missing correct answer.`);
        }
        if (!Number.isFinite(q.points) || q.points <= 0) errors.push(`Question #${idx + 1} must have positive points.`);
      });
    }
    if (errors.length > 0) {
      throw new QuizError(422, 'VALIDATION_FAILED', errors.join('; '));
    }
    quiz.status = 'READY';
    this.store.save();
    this.emit('QUIZ_READY', { quiz: this.publicQuiz(quiz) });
    return { quiz: this.publicQuiz(quiz) };
  }
  start(context, quizId, payload = {}) {
    this.adminOrThrow(context);
    const quiz = this.quizOrThrow(quizId);
    if (quiz.status !== 'READY') throw new QuizError(409, 'INVALID_STATE', 'Only READY quizzes can be started.');
    if (payload?.source !== 'PRESENTER') {
      throw new QuizError(403, 'PRESENTER_ONLY', 'Quizzes can only be started from the Presenter View.');
    }
    this.validateConfig(quiz, { requireQuestions: true });
    const questions = this.store.getQuestions(quizId);
    quiz.status = 'LIVE';
    quiz.startedAt = nowIso(this.clock);
    quiz.endedAt = null;
    const countdownSec = quiz.preQuizCountdownSeconds ?? 10;
    const now = Date.now();
    quiz.stageState = {
      stage: 'COUNTDOWN',
      questionIndex: 0,
      questionId: questions[0]?.id || null,
      remainingSeconds: countdownSec,
      endsAt: new Date(now + countdownSec * 1000).toISOString(),
      startedAt: new Date(now).toISOString(),
      totalQuestions: questions.length,
      updatedAt: nowIso(this.clock)
    };
    this.store.save();
    this.emit('QUIZ_STARTED', { quiz: this.publicQuiz(quiz) });
    this.emit('STAGE_UPDATE', { quizId, stageState: quiz.stageState });
    return { quiz: this.publicQuiz(quiz) };
  }
  pause(context, quizId) { return this.transitionAdmin(context, quizId, 'PAUSED', ['LIVE'], 'QUIZ_PAUSED'); }
  resume(context, quizId) { return this.transitionAdmin(context, quizId, 'LIVE', ['PAUSED'], 'QUIZ_RESUMED'); }
  end(context, quizId) { this.adminOrThrow(context); const quiz = this.quizOrThrow(quizId); if (!['LIVE', 'PAUSED'].includes(quiz.status)) throw new QuizError(409, 'INVALID_STATE', 'Only LIVE or PAUSED quizzes can end.'); return this.endQuizInternal(quiz); }
  endQuizInternal(quiz) { quiz.status = 'RESULTS'; quiz.endedAt = nowIso(this.clock); quiz.stageState = { stage: 'COMPLETED', questionIndex: 0, remainingSeconds: 0, updatedAt: nowIso(this.clock) }; this.store.state.attempts.filter(a => a.quizId === quiz.id && a.status === 'ACTIVE').forEach(a => { this.evaluate(quiz, a); this.emit('FORCE_SUBMIT', { quizId: quiz.id, teamId: a.teamId, attemptId: a.id }); }); if (quiz.id === 'quiz-1' || quiz.type === 'ELIMINATION') {
      this.eliminateUnattemptedTeams(quiz.id);
    }
    this.store.save(); this.emit('QUIZ_ENDED', { quiz: this.publicQuiz(quiz) }); this.emit('STAGE_UPDATE', { quizId: quiz.id, stageState: quiz.stageState }); return { quiz: this.publicQuiz(quiz) }; }
  transitionAdmin(context, quizId, status, allowed, eventType) { this.adminOrThrow(context); const quiz = this.quizOrThrow(quizId); if (!allowed.includes(quiz.status)) throw new QuizError(409, 'INVALID_STATE', `Quiz cannot transition from ${quiz.status} to ${status}.`); quiz.status = status; this.store.save(); this.emit(eventType, { quiz: this.publicQuiz(quiz) }); return { quiz: this.publicQuiz(quiz) }; }
  leaderboard(quizId) {
    const quiz = this.quizOrThrow(quizId);
    if (quiz.leaderboardMode === 'HIDDEN' || (!quiz.showLiveScores && ['LIVE', 'PAUSED'].includes(quiz.status))) return { quizId, mode: 'HIDDEN', rows: [] };
    const allAttempts = [...this.store.state.attempts.filter(a => a.quizId === quizId)];
    if ((quizId === 'quiz-1' || quiz.type === 'ELIMINATION') && ['RESULTS', 'ENDED', 'FINALIZED'].includes(quiz.status)) {
      const platformTeams = Array.isArray(this.store.state.platform?.teams) ? this.store.state.platform.teams : Object.values(this.store.state.platform?.teams || {});
      const attemptedIds = new Set(allAttempts.map(a => a.teamId));
      const teamLogins = this.store.state.teamLogins || {};
      for (const t of platformTeams) {
        if (!t.id || t.id === 'demo-participant-team' || t.name === 'Demo Team' || t.teamName === 'Demo Team') continue;
        if (!attemptedIds.has(t.id)) {
          const hasLoggedIn = Boolean(teamLogins[t.id] || t.hasLoggedIn || t.lastLoginAt);
          allAttempts.push({
            id: `att-unattempted-${quizId}-${t.id}`,
            quizId,
            teamId: t.id,
            teamName: t.teamName || t.name || t.id,
            score: 0,
            timeTakenSeconds: 0,
            status: 'NOT_ATTEMPTED',
            debarred: false,
            qualificationStatus: 'ELIMINATED',
            manualQualification: 'ELIMINATED',
            manualQualificationReason: !hasLoggedIn ? 'Eliminated: Account never logged in' : 'Eliminated: Quiz 1 never attempted'
          });
        }
      }
    }
    const sorted = [...allAttempts].sort((a, b) => {
      if (a.debarred && !b.debarred) return 1;
      if (!a.debarred && b.debarred) return -1;
      const scoreDiff = (b.score ?? 0) - (a.score ?? 0);
      if (scoreDiff !== 0) return scoreDiff;
      if (quiz.tieBreaker === 'SUBMISSION_TIME') return Date.parse(a.submittedAt || a.startedAt || 0) - Date.parse(b.submittedAt || b.startedAt || 0);
      return (a.timeTakenSeconds ?? 0) - (b.timeTakenSeconds ?? 0);
    });
    let rankCounter = 1;
    const rows = sorted.map((a) => {
      let qualStatus = 'PENDING';
      let rank = null;
      if (a.debarred) {
        qualStatus = 'DEBARRED';
      } else {
        rank = quiz.leaderboardMode === 'LIVE_RANK' ? rankCounter++ : null;
        if (quiz.status === 'FINALIZED') {
          qualStatus = a.qualificationStatus || ((rank !== null && rank <= quiz.qualificationCount) ? 'QUALIFIED' : 'ELIMINATED');
        } else {
          if (a.manualQualification === 'QUALIFIED' || a.qualificationStatus === 'QUALIFIED') {
            qualStatus = 'QUALIFIED';
          } else if (a.manualQualification === 'ELIMINATED' || a.qualificationStatus === 'ELIMINATED') {
            qualStatus = 'ELIMINATED';
          } else {
            qualStatus = (rank !== null && rank <= quiz.qualificationCount) ? 'PROJECTED QUALIFIED' : 'PROJECTED ELIMINATED';
          }
        }
      }
      return {
        rank,
        teamId: a.teamId,
        teamName: a.teamName || a.teamId,
        quizId,
        score: a.score ?? 0,
        quizScore: a.score ?? 0,
        status: a.status,
        debarred: Boolean(a.debarred),
        debarReason: a.debarReason || null,
        manualAdjustment: a.manualScoreAdjustment ?? 0,
        manualQualification: a.manualQualification || null,
        manualQualificationReason: a.manualQualificationReason || null,
        qualificationStatus: a.qualificationStatus || qualStatus,
        timeTaken: a.timeTakenSeconds ?? 0
      };
    });
    return {
      quizId,
      mode: quiz.leaderboardMode,
      rows,
      leaderboard: rows,
      qualificationCutoff: quiz.qualificationCount,
      quizName: quiz.name,
      quizStatus: quiz.status,
      tieBreaker: quiz.tieBreaker,
      pointsPerCorrect: quiz.pointsPerCorrect
    };
  }
  adjustScore(context, quizId, teamId, patch = {}) {
    this.adminOrThrow(context);
    const quiz = this.quizOrThrow(quizId);
    if (quiz.status === 'FINALIZED') throw new QuizError(409, 'QUIZ_FINALIZED', 'Score adjustments are locked after quiz finalization.');
    let attempt = this.store.getAttempt(quizId, teamId);
    if (!attempt) {
      const platformTeams = this.store.state.platform?.teams || [];
      const teamList = Array.isArray(platformTeams) ? platformTeams : Object.values(platformTeams || {});
      const matched = teamList.find(t => t.id === teamId || t.teamId === teamId);
      attempt = {
        id: `att-${quizId}-${teamId}`,
        quizId,
        teamId,
        teamName: matched?.name || matched?.teamName || teamId,
        status: 'NOT_ATTEMPTED',
        score: 0,
        timeTakenSeconds: 0,
        startedAt: null,
        submittedAt: null
      };
      this.store.state.attempts.push(attempt);
    }
    const currentScore = Number.isFinite(attempt.score) ? attempt.score : 0;
    let nextScore;
    let delta;
    if (patch.adjustment !== undefined) {
      delta = Number(patch.adjustment);
      if (!Number.isFinite(delta)) throw new QuizError(422, 'INVALID_SCORE', 'Adjustment must be a valid number.');
      nextScore = currentScore + delta;
    } else if (patch.score !== undefined) {
      nextScore = Number(patch.score);
      if (!Number.isFinite(nextScore)) throw new QuizError(422, 'INVALID_SCORE', 'Score must be a valid number.');
      delta = nextScore - currentScore;
    } else {
      throw new QuizError(422, 'INVALID_SCORE', 'Either score or adjustment must be provided.');
    }
    const reason = (patch.reason || '').trim() || 'Manual organizer adjustment';
    const adjustmentRecord = {
      id: `adj-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
      originalScore: currentScore,
      adjustment: delta,
      resultingScore: nextScore,
      reason,
      administrator: context.userId || context.username || 'admin',
      timestamp: nowIso(this.clock)
    };
    attempt.scoreAdjustments = attempt.scoreAdjustments || [];
    attempt.scoreAdjustments.push(adjustmentRecord);
    attempt.score = nextScore;
    attempt.manualScoreAdjustment = (attempt.manualScoreAdjustment ?? 0) + delta;
    attempt.adjustmentReason = reason;
    attempt.adjustedAt = adjustmentRecord.timestamp;
    this.store.save();
    this.emit('ATTEMPT_UPDATED', { quizId, teamId, score: attempt.score });
    this.emit('LEADERBOARD_UPDATED', { quizId });
    return { success: true, attempt: this.publicAttempt(attempt), leaderboard: this.leaderboard(quizId) };
  }
  debarTeam(context, quizId, teamId, patch = {}) {
    this.adminOrThrow(context);
    const quiz = this.quizOrThrow(quizId);
    // Allow debarment updates even after finalization for live event integrity
    let attempt = this.store.getAttempt(quizId, teamId);
    if (!attempt) {
      const platformTeams = this.store.state.platform?.teams || [];
      const matched = platformTeams.find(t => t.id === teamId || t.teamId === teamId);
      attempt = {
        id: `att-${quizId}-${teamId}`,
        quizId,
        teamId,
        teamName: matched?.teamName || matched?.name || teamId,
        status: 'DEBARRED',
        score: 0,
        debarred: true,
        debarReason: (patch.reason || '').trim() || 'Debarred for competition rules infraction.',
        qualificationStatus: 'DEBARRED',
        startedAt: nowIso(this.clock)
      };
      this.store.state.attempts.push(attempt);
    } else {
      const debar = patch.debarred !== undefined ? Boolean(patch.debarred) : !attempt.debarred;
      attempt.debarred = debar;
      if (debar) {
        attempt.qualificationStatus = 'DEBARRED';
        attempt.debarReason = (patch.reason || '').trim() || 'Debarred for competition rules infraction.';
      } else {
        attempt.qualificationStatus = 'PENDING';
        attempt.debarReason = null;
      }
    }
    this.store.save();
    this.emit('ATTEMPT_UPDATED', { quizId, teamId, debarred: attempt.debarred, qualificationStatus: attempt.qualificationStatus });
    this.emit('LEADERBOARD_UPDATED', { quizId });
    return { success: true, attempt: this.publicAttempt(attempt), leaderboard: this.leaderboard(quizId) };
  }
  qualifyTeam(context, quizId, teamId, patch = {}) {
    this.adminOrThrow(context);
    const quiz = this.quizOrThrow(quizId);
    if (quiz.status === 'FINALIZED') throw new QuizError(409, 'QUIZ_FINALIZED', 'Qualification cannot be changed after quiz finalization.');
    const attempt = this.store.getAttempt(quizId, teamId);
    if (!attempt) throw new QuizError(404, 'ATTEMPT_NOT_FOUND', 'Attempt was not found for this team.');
    if (attempt.debarred) throw new QuizError(400, 'TEAM_DEBARRED', 'Debarred team cannot be qualified without reinstating first.');
    const status = patch.status === 'AUTO' ? 'AUTO' : (patch.status === 'ELIMINATED' ? 'ELIMINATED' : 'QUALIFIED');
    if (status === 'AUTO') {
      delete attempt.manualQualification;
      delete attempt.manualQualificationReason;
      delete attempt.qualificationStatus;
    } else {
      attempt.manualQualification = status;
      attempt.qualificationStatus = status;
      attempt.manualQualificationReason = (patch.reason || '').trim() || (status === 'QUALIFIED' ? 'Promoted to qualified by Admin prior to finalization' : 'Marked eliminated by Admin prior to finalization');
    }
    this.store.save();
    this.emit('ATTEMPT_UPDATED', { quizId, teamId, manualQualification: attempt.manualQualification, qualificationStatus: attempt.qualificationStatus });
    this.emit('LEADERBOARD_UPDATED', { quizId });
    return { success: true, attempt: this.publicAttempt(attempt), leaderboard: this.leaderboard(quizId) };
  }
  invalidateSession(context, quizId, teamId) { this.adminOrThrow(context); this.quizOrThrow(quizId); const attempt = this.store.getAttempt(quizId, teamId); if (!attempt || attempt.status !== 'ACTIVE') throw new QuizError(404, 'ATTEMPT_NOT_ACTIVE', 'There is no active attempt for this team.'); attempt.sessionId = null; attempt.sessionInvalidated = true; this.store.save(); this.emit('SESSION_INVALIDATED', { quizId, teamId, attemptId: attempt.id }); return { invalidated: true, attemptId: attempt.id }; }

  eliminateUnattemptedTeams(quizId = 'quiz-1') {
    const platformTeams = Array.isArray(this.store.state.platform?.teams)
      ? this.store.state.platform.teams
      : Object.values(this.store.state.platform?.teams || {});
    const roster = this.store.state.registrationRoster || [];
    const accounts = this.store.accounts || [];
    const allTeamIds = new Set([
      ...platformTeams.map(t => t.id || t.teamId),
      ...roster.map(r => r.teamId),
      ...accounts.map(a => a.teamId)
    ].filter(Boolean));

    const attemptedTeamIds = new Set(
      this.store.state.attempts
        .filter(a => (a.quizId === quizId || (quizId === 'quiz-1' && a.quizId === 'elimination-2026')) && a.status !== 'NOT_ATTEMPTED')
        .map(a => a.teamId)
    );
    const teamLogins = this.store.state.teamLogins || {};

    for (const tId of allTeamIds) {
      if (tId === 'demo-participant-team') continue;
      const hasAttempted = attemptedTeamIds.has(tId);
      const pTeam = platformTeams.find(t => t.id === tId || t.teamId === tId);
      const hasLoggedIn = Boolean(teamLogins[tId] || pTeam?.hasLoggedIn || pTeam?.lastLoginAt);

      if (!hasAttempted || !hasLoggedIn) {
        let attempt = this.store.getAttempt(quizId, tId);
        if (!attempt) {
          const teamObj = pTeam || roster.find(r => r.teamId === tId);
          attempt = {
            id: `att-${quizId}-${tId}`,
            quizId,
            teamId: tId,
            teamName: teamObj?.name || teamObj?.teamName || tId,
            status: 'NOT_ATTEMPTED',
            score: 0,
            timeTakenSeconds: 0,
            startedAt: null,
            submittedAt: null
          };
          this.store.state.attempts.push(attempt);
        }
        attempt.qualificationStatus = 'ELIMINATED';
        attempt.manualQualification = 'ELIMINATED';
        attempt.manualQualificationReason = !hasLoggedIn
          ? 'Eliminated: Account never logged in'
          : 'Eliminated: Never attempted Quiz 1';

        if (pTeam) {
          pTeam.qualificationStatus = 'ELIMINATED';
          pTeam.isEliminated = true;
          pTeam.eliminated = true;
          pTeam.eliminationReason = attempt.manualQualificationReason;
        }
      }
    }
  }

  finalize(context, quizId) {
    this.adminOrThrow(context);
    const quiz = this.quizOrThrow(quizId);
    if (quiz.status === 'FINALIZED') throw new QuizError(409, 'INVALID_STATE', 'Quiz has already been finalized.');
    if (!['RESULTS', 'ENDED'].includes(quiz.status)) throw new QuizError(409, 'INVALID_STATE', 'Quiz cannot be finalized until it has ended.');
    const rows = this.leaderboard(quizId).rows;
    let qualCount = 0;
    const cutoff = quiz.qualificationCount || 40;
    rows.forEach(row => {
      const attempt = this.store.getAttempt(quizId, row.teamId);
      if (!attempt) return;
      if (attempt.debarred) {
        attempt.qualificationStatus = 'DEBARRED';
      } else if (attempt.manualQualification === 'QUALIFIED' || attempt.qualificationStatus === 'QUALIFIED') {
        attempt.qualificationStatus = 'QUALIFIED';
        qualCount++;
      } else if (attempt.manualQualification === 'ELIMINATED') {
        attempt.qualificationStatus = 'ELIMINATED';
      } else {
        if (qualCount < cutoff) {
          attempt.qualificationStatus = 'QUALIFIED';
          qualCount++;
        } else {
          attempt.qualificationStatus = 'ELIMINATED';
        }
      }
    });
    quiz.status = 'FINALIZED';
    quiz.finalizedAt = nowIso(this.clock);
    this.store.save();
    this.emit('QUALIFICATION_FINALIZED', { quiz: this.publicQuiz(quiz) });
    if (quiz.id === 'quiz-1' || quiz.type === 'ELIMINATION') {
      this.eliminateUnattemptedTeams(quizId);
    }
    this.emit('LEADERBOARD_UPDATED', { quizId });
    return { quiz: this.publicQuiz(quiz), leaderboard: this.leaderboard(quizId) };
  }
  redo(context, quizId) {
    this.adminOrThrow(context);
    const quiz = this.quizOrThrow(quizId);
    quiz.status = 'DRAFT';
    quiz.startedAt = null;
    quiz.endedAt = null;
    quiz.finalizedAt = null;
    quiz.stageState = { stage: 'STANDBY', questionIndex: 0, updatedAt: nowIso(this.clock) };
    const attemptIdsToRemove = new Set(this.store.state.attempts.filter(a => a.quizId === quizId).map(a => a.id));
    this.store.state.attempts = this.store.state.attempts.filter(a => a.quizId !== quizId);
    this.store.state.answers = this.store.state.answers.filter(a => !attemptIdsToRemove.has(a.attemptId) && a.quizId !== quizId);
    if (quizId === 'quiz-1' || quiz.type === 'ELIMINATION') {
      const platformTeams = this.store.state.platform?.teams || [];
      const teamList = Array.isArray(platformTeams) ? platformTeams : Object.values(platformTeams || {});
      teamList.forEach(t => {
        delete t.isEliminated;
        delete t.eliminated;
        delete t.eliminationReason;
        delete t.qualificationStatus;
      });
    }
    if (this.store.state.attempts.length === 0) {
      this.store.state.answerSeq = 0;
    }
    this.store.save();
    this.emit('QUIZ_RESET', { quiz: this.publicQuiz(quiz) });
    this.emit('STAGE_UPDATE', { quizId, stageState: quiz.stageState });
    this.emit('LEADERBOARD_UPDATED', { quizId });
    return { quiz: this.publicQuiz(quiz) };
  }
  republish(context, quizId) {
    this.adminOrThrow(context);
    const quiz = this.quizOrThrow(quizId);
    if (!['RESULTS', 'FINALIZED'].includes(quiz.status)) throw new QuizError(409, 'INVALID_STATE', 'End the test before resetting and republishing it.');
    // Validate before clearing results. The HTTP boundary commits reset + publish together.
    this.validateConfig(quiz, { requireQuestions: true });
    this.redo(context, quizId);
    return this.ready(context, quizId);
  }
  getStage(quizId) { const quiz = this.quizOrThrow(quizId); return { quizId, stageState: quiz.stageState || { stage: 'STANDBY', questionIndex: 0 } }; }
  updateStage(context, quizId, patch = {}) {
    this.adminOrThrow(context);
    const quiz = this.quizOrThrow(quizId);
    const questions = this.store.getQuestions(quizId);
    const qIdx = Number.isInteger(patch.questionIndex) ? patch.questionIndex : (quiz.stageState?.questionIndex || 0);
    const remainingSeconds = Number.isInteger(patch.remainingSeconds) ? patch.remainingSeconds : (quiz.stageState?.remainingSeconds ?? 0);
    const now = Date.now();
    const endsAt = patch.endsAt || (remainingSeconds > 0 ? new Date(now + remainingSeconds * 1000).toISOString() : null);
    const stageState = {
      stage: patch.stage || quiz.stageState?.stage || 'STANDBY',
      questionIndex: qIdx,
      questionId: questions[qIdx]?.id || patch.questionId || null,
      remainingSeconds,
      endsAt,
      startedAt: patch.startedAt || new Date(now).toISOString(),
      totalQuestions: questions.length,
      updatedAt: nowIso(this.clock)
    };
    quiz.stageState = stageState;
    this.store.save();
    this.emit('STAGE_UPDATE', { quizId, stageState });
    return { success: true, stageState };
  }
}
