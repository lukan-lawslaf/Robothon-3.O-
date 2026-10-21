/** @typedef {import('./quizService').Quiz} Quiz */

/** @param {Quiz} quiz */
export function quizRunKey(quiz) {
  return `${quiz.id}:${quiz.startedAt || ''}`;
}

/** @param {Quiz} quiz @param {number} serverNow */
export function quizLaunchTiming(quiz, serverNow) {
  const started = Date.parse(quiz.startedAt || '');
  if (!Number.isFinite(started) || !['LIVE', 'PAUSED'].includes(quiz.status)) {
    return { secondsRemaining: 0, countdown: null };
  }
  const secondsRemaining = Math.max(0, Math.ceil((started + quiz.durationSeconds * 1000 - serverNow) / 1000));
  const duration = quiz.preQuizCountdownSeconds ?? 10;
  const countdownEnd = started + duration * 1000;
  // Give zero a full second so background-tab timer throttling cannot skip it.
  const countdown = quiz.status === 'LIVE' && secondsRemaining > 0 && duration > 0 && serverNow < countdownEnd + 1000
    ? Math.max(0, Math.ceil((countdownEnd - serverNow) / 1000)) : null;
  return { secondsRemaining, countdown };
}

/** @param {Quiz} quiz */
export function isRunningQuiz(quiz) {
  return quizLaunchTiming(quiz, Date.parse(quiz.serverTime)).secondsRemaining > 0;
}

/** @param {Quiz[]} quizzes @param {string} selectedId @returns {Quiz | undefined} */
export function preferredParticipantQuiz(quizzes, selectedId = '') {
  const published = quizzes.filter(q => q.status !== 'DRAFT');
  const running = published.filter(isRunningQuiz).sort((a, b) => Date.parse(b.startedAt || '') - Date.parse(a.startedAt || ''));
  return running.find(q => q.status === 'LIVE') || running[0]
    || published.find(q => q.id === selectedId)
    || published.find(q => q.status === 'READY') || published[0];
}
