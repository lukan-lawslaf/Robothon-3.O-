import { shell, card, badge, icon, account, esc } from './shared.js';

export function CompletedPage(state) {
  const user = account() || { teamName: 'Team Apex Mechanics', teamId: 'team-apex' };
  const quiz = state.quiz || {};
  const attempt = state.attempt || {};

  const totalQuestions = state.questions?.length || quiz.totalQuestions || 30;
  const answers = attempt.answers || state.answers || {};
  const answeredCount = attempt.answeredCount !== undefined && attempt.answeredCount !== null
    ? attempt.answeredCount
    : Object.keys(answers).filter(k => answers[k] !== undefined && answers[k] !== null && answers[k] !== '').length;
  const leftBlank = Math.max(0, totalQuestions - answeredCount);

  // Time elapsed formatted
  const timeTaken = attempt.timeTakenSeconds ?? 0;
  const timeElapsedStr = `${String(Math.floor(timeTaken / 60)).padStart(2, '0')}:${String(timeTaken % 60).padStart(2, '0')}`;
  const totalTimeStr = `${String(Math.floor((quiz.durationSeconds || 1800) / 60)).padStart(2, '0')}:00`;

  const submittedDate = attempt.submittedAt ? new Date(attempt.submittedAt) : new Date();
  const timeStr = submittedDate.toISOString().slice(11, 19) + ' UTC';
  const refId = `#RBN-SUB-${(user.teamId || 'TEAM').toUpperCase()}-${submittedDate.getTime().toString().slice(-4)}`;

  const otherQuizzes = (state.quizzes || []).filter(q => q.id !== (quiz.id || attempt.quizId));
  const nextLiveRound = otherQuizzes.find(q => q.status === 'LIVE');
  const nextReadyRound = otherQuizzes.find(q => q.status === 'READY');
  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(user?.role);
  const isLeader = isAdmin || user?.role === 'TEAM_LEADER';
  const isFinalized = quiz.status === 'FINALIZED';

  const content = `
    <div class="w-full max-w-4xl mx-auto px-space-sm sm:px-space-md py-space-md lg:py-space-xl">

      ${nextLiveRound ? `
        <!-- Next Round LIVE Notification Banner -->
        <div class="p-4 bg-emerald-500/15 border-2 border-emerald-400/60 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-space-lg shadow-[0_0_25px_rgba(16,185,129,0.25)] animate-pulse">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              ${icon('sensors', 'text-[24px]')}
            </div>
            <div class="flex flex-col">
              <span class="text-xs font-mono font-bold uppercase text-emerald-400 tracking-wider">NEXT COMPETITION ROUND IS LIVE: ${esc(nextLiveRound.name)}</span>
              <span class="text-xs text-on-surface font-mono">The live countdown for the next round is running. Proceed to the live terminal now.</span>
            </div>
          </div>
          <button type="button" data-switch-quiz="${nextLiveRound.id}" data-goto="team/quiz/live"
                  class="px-5 py-2.5 rounded-lg bg-emerald-400 text-surface font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:brightness-110 shadow-md shrink-0">
            <span>Enter Next Round Terminal</span>
            ${icon('arrow_forward', 'text-[16px]')}
          </button>
        </div>
      ` : (nextReadyRound ? `
        <!-- Next Round READY Notification Banner -->
        <div class="p-4 bg-tertiary/15 border border-tertiary/40 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-space-lg shadow-[0_0_15px_rgba(0,255,178,0.2)]">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-tertiary/20 flex items-center justify-center text-tertiary shrink-0">
              ${icon('schedule', 'text-[24px]')}
            </div>
            <div class="flex flex-col">
              <span class="text-xs font-mono font-bold uppercase text-tertiary tracking-wider">UPCOMING ROUND READY: ${esc(nextReadyRound.name)}</span>
              <span class="text-xs text-on-surface font-mono">Marked ready by organizers. Enter waiting room to view round rules and await launch.</span>
            </div>
          </div>
          <button type="button" data-switch-quiz="${nextReadyRound.id}" data-goto="team/quiz"
                  class="px-5 py-2.5 rounded-lg bg-tertiary text-surface font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:brightness-110 shadow-md shrink-0">
            <span>Go to Waiting Room</span>
            ${icon('arrow_forward', 'text-[16px]')}
          </button>
        </div>
      ` : '')}
      
      <!-- Top Success Status Banner -->
      <div class="bg-surface-container-low rounded-xl p-space-lg sm:p-space-xl shadow-xl mb-space-lg border border-outline-variant/30">
        <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-space-md">
          <div class="flex items-start gap-space-md">
            <div class="w-12 h-12 rounded-lg bg-surface-container-high flex items-center justify-center shrink-0 border border-tertiary/30">
              ${icon('check_circle', 'text-tertiary text-[28px]')}
            </div>
            <div class="flex flex-col gap-space-xs">
              <div class="flex flex-wrap items-center gap-space-sm">
                <h1 class="font-headline-lg text-headline-lg text-on-surface font-bold">Quiz Submitted Successfully</h1>
                <span class="font-label-badge text-label-badge uppercase px-space-sm py-0.5 rounded bg-surface-container-highest text-tertiary-fixed font-bold border border-tertiary/40">
                  SUBMISSION LOCKED
                </span>
              </div>
              <p class="font-body-md text-body-md text-on-surface-variant">
                The telemetry session has ended and all recorded responses have been synchronized with the arena adjudication server.
              </p>
            </div>
          </div>
        </div>

        <div class="mt-space-lg pt-space-md grid grid-cols-1 sm:grid-cols-2 gap-space-sm bg-surface-container-lowest p-space-md rounded-lg border border-outline-variant/20">
          <div class="flex flex-col">
            <span class="font-label-badge text-label-badge uppercase text-outline">Submission Timestamp</span>
            <span class="font-label-code text-label-code text-on-surface font-semibold">Recorded at ${timeStr}</span>
          </div>
          <div class="flex flex-col">
            <span class="font-label-badge text-label-badge uppercase text-outline">Session Reference ID</span>
            <span class="font-label-code text-label-code text-primary font-bold">${refId}</span>
          </div>
        </div>
      </div>

      <!-- Session Telemetry Log Card -->
      <div class="bg-surface-container-low rounded-xl p-space-lg sm:p-space-xl shadow-xl mb-space-lg border border-outline-variant/30">
        <div class="flex items-center justify-between pb-space-sm mb-space-md bg-surface-container-high px-space-md py-space-sm rounded-lg border border-outline-variant/30">
          <span class="font-label-badge text-label-badge uppercase tracking-wider text-outline font-bold">Session Telemetry Log</span>
          <span class="font-label-code text-label-code text-tertiary font-bold flex items-center gap-1">
            ${icon('verified', 'text-[16px]')} INTEGRITY_VERIFIED_100%
          </span>
        </div>

        <div class="flex flex-col divide-y divide-outline-variant/20">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between py-space-sm px-space-sm rounded hover:bg-surface-container">
            <span class="font-body-md text-body-md text-on-surface-variant">Team Name</span>
            <span class="font-headline-sm text-headline-sm text-on-surface font-semibold">
              ${esc(user?.teamName || 'Team Apex Mechanics')} (#${esc(user?.teamId || 'RBN-042')})
            </span>
          </div>

          <div class="flex flex-col sm:flex-row sm:items-center justify-between py-space-sm px-space-sm rounded hover:bg-surface-container">
            <span class="font-body-md text-body-md text-on-surface-variant">Quiz Round</span>
            <span class="font-label-code text-label-code text-primary font-bold">
              ${esc(quiz.name || 'Elimination Round 1 (Robotics Telemetry)')}
            </span>
          </div>

          <div class="flex flex-col sm:flex-row sm:items-center justify-between py-space-sm px-space-sm rounded hover:bg-surface-container">
            <span class="font-body-md text-body-md text-on-surface-variant">Total Questions</span>
            <span class="font-label-metric text-label-metric text-on-surface font-bold">${totalQuestions}</span>
          </div>

          <div class="flex flex-col sm:flex-row sm:items-center justify-between py-space-sm px-space-sm rounded hover:bg-surface-container">
            <span class="font-body-md text-body-md text-on-surface-variant">Questions Answered</span>
            <span class="font-label-metric text-label-metric text-tertiary font-bold">${answeredCount}</span>
          </div>

          <div class="flex flex-col sm:flex-row sm:items-center justify-between py-space-sm px-space-sm rounded hover:bg-surface-container">
            <span class="font-body-md text-body-md text-on-surface-variant">Questions Left Blank</span>
            <span class="font-label-metric text-label-metric text-on-surface-variant font-bold">${leftBlank}</span>
          </div>

          <div class="flex flex-col sm:flex-row sm:items-center justify-between py-space-sm px-space-sm rounded hover:bg-surface-container">
            <span class="font-body-md text-body-md text-on-surface-variant">Time Elapsed</span>
            <div class="flex items-baseline gap-space-xs">
              <span class="font-label-metric text-label-metric text-on-surface font-bold">${timeElapsedStr}</span>
              <span class="font-label-code text-label-code text-outline">/ ${totalTimeStr}</span>
            </div>
          </div>

          <div class="flex flex-col sm:flex-row sm:items-center justify-between py-space-sm px-space-sm rounded bg-surface-container-lowest">
            <span class="font-body-md text-body-md text-on-surface-variant">Scoring Adjudication</span>
            <div class="flex items-center gap-2">
              ${attempt.score !== null && attempt.score !== undefined ? `
                <span class="font-label-metric text-label-metric text-primary font-bold">${attempt.score} PTS</span>
              ` : ''}
              <span class="font-label-badge text-label-badge uppercase px-space-sm py-1 rounded bg-secondary-container/30 text-secondary font-bold">
                ${attempt.score !== null && attempt.score !== undefined ? 'EVALUATED' : 'PENDING ORGANIZER AUDIT'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Evaluation Status Card -->
      <div class="bg-surface-container-high rounded-xl p-space-md sm:p-space-lg mb-space-lg flex items-start gap-space-md border border-outline-variant/30">
        ${icon('info', 'text-primary text-[26px] shrink-0 mt-0.5')}
        <div class="flex flex-col gap-space-xs">
          <span class="font-headline-sm text-headline-sm text-on-surface font-bold">Evaluation Status</span>
          <p class="font-body-md text-body-md text-on-surface-variant">
            Official scores and qualification standings are calculated after the completion of all team sessions. The official leaderboard will be released to Team Leaders once round results are finalized by the administration.
          </p>
        </div>
      </div>

      <!-- Action Buttons Strip -->
      <div class="flex flex-col sm:flex-row items-center justify-end gap-space-md flex-wrap">
        <a href="#team/quiz"
           class="w-full sm:w-auto px-space-md py-space-sm rounded bg-surface-container-high text-on-surface hover:bg-surface-container-highest transition-colors flex items-center justify-center gap-space-sm border border-outline-variant/30 font-semibold shadow-sm">
          ${icon('meeting_room', 'text-[20px] text-tertiary')}
          <span class="font-body-md">Waiting Room</span>
        </a>

        <button type="button" id="downloadReceiptBtn"
                class="w-full sm:w-auto px-space-lg py-space-sm rounded bg-surface-container-high text-on-surface hover:bg-surface-container-highest transition-colors flex items-center justify-center gap-space-sm border border-outline-variant/30 font-semibold shadow-sm">
          ${icon('receipt_long', 'text-[20px] text-primary')}
          <span class="font-body-md">Download Submission Receipt</span>
        </button>

        ${isLeader && isFinalized ? `
          <a href="#leaderboard" 
             class="w-full sm:w-auto px-space-lg py-space-sm rounded bg-primary-container text-on-primary-container hover:brightness-110 transition-all flex items-center justify-center gap-space-sm font-bold shadow-[0_0_12px_rgba(0,229,255,0.4)]">
            ${icon('leaderboard', 'text-[20px]')}
            <span class="font-body-md">View Official Leaderboard</span>
          </a>
        ` : `
          <div class="w-full sm:w-auto px-space-md py-space-sm rounded bg-surface-container-high text-outline flex items-center justify-center gap-2 font-mono text-xs border border-outline-variant/30">
            ${icon('lock', 'text-[16px] text-amber-400')}
            <span>Leaderboard Released to Leaders Upon Finalization</span>
          </div>
        `}
      </div>
    </div>
  `;

  return shell(content, 'team/quiz/completed', state);
}
