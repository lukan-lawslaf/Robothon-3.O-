import { shell, card, badge, icon, esc } from '../shared.js';

export function LiveMonitorPage(state) {
  const quizzes = state.quizzes || [];
  const currentQuizId = state.selectedQuizId || state.quiz?.id || 'quiz-1';
  const quiz = quizzes.find(q => q.id === currentQuizId) || state.quiz || (quizzes.length > 0 ? quizzes[0] : {});
  const attempts = state.liveAttempts || [];
  const isLive = quiz.status === 'LIVE';
  const isPaused = quiz.status === 'PAUSED';

  // Sort attempts deterministically by score descending, then time ascending
  const sortedAttempts = [...attempts].sort((a, b) => {
    const scoreDiff = (b.score ?? -Infinity) - (a.score ?? -Infinity);
    if (scoreDiff !== 0) return scoreDiff;
    return (a.timeTakenSeconds ?? Infinity) - (b.timeTakenSeconds ?? Infinity);
  });

  const totalTeams = sortedAttempts.length;
  const activeTeams = sortedAttempts.filter(a => a.status === 'ACTIVE').length;
  const submittedTeams = sortedAttempts.filter(a => ['SUBMITTED', 'EVALUATED'].includes(a.status)).length;

  const content = `
    <div class="flex flex-col gap-5 w-full max-w-7xl mx-auto">
      
      <!-- Top Quiz Switcher & Live Master Controls -->
      <section class="p-4 bg-surface-container rounded-xl shadow-lg border border-outline-variant/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        <!-- Left: Quiz Selection Tabs (Quiz 1 vs Quiz 2) -->
        <div class="flex flex-col gap-2">
          <span class="text-xs font-mono font-bold uppercase tracking-wider text-outline">
            Active Telemetry Stream
          </span>
          <div class="flex items-center gap-2 flex-wrap">
            <button type="button" data-switch-quiz="quiz-1"
                    class="px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition-all flex items-center gap-2 border ${
                      quiz.id === 'quiz-1'
                        ? 'bg-primary-container text-on-primary-container border-primary-container shadow-[0_0_10px_rgba(0,229,255,0.3)]'
                        : 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest border-outline-variant/40'
                    }">
              <span>Quiz 1: Elimination Round</span>
              ${badge(state.quizzes?.find(q => q.id === 'quiz-1')?.status || 'DRAFT')}
            </button>

            <button type="button" data-switch-quiz="quiz-2"
                    class="px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition-all flex items-center gap-2 border ${
                      quiz.id === 'quiz-2'
                        ? 'bg-primary-container text-on-primary-container border-primary-container shadow-[0_0_10px_rgba(0,229,255,0.3)]'
                        : 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest border-outline-variant/40'
                    }">
              <span>Quiz 2: Component Bonus Quiz</span>
              ${badge(state.quizzes?.find(q => q.id === 'quiz-2')?.status || 'DRAFT')}
            </button>
          </div>
        </div>

        <!-- Master Countdown & Live Control Buttons -->
        <div class="flex items-center gap-3 flex-wrap" id="admin-live-controls">
          <a href="#admin/quizzes/stage"
             class="px-3.5 py-2 bg-primary-container text-on-primary-container rounded font-mono text-xs uppercase font-bold flex items-center gap-1.5 hover:brightness-110 shadow-[0_0_12px_rgba(0,229,255,0.3)] transition-all">
            ${icon('slideshow', 'text-[16px]')}
            <span>Show Live Stage (Big Screen)</span>
          </a>

          <div class="flex items-center gap-2.5 px-3.5 py-1.5 bg-surface-container-lowest rounded border border-outline-variant/30 font-mono">
            <span class="text-[10px] uppercase text-outline font-bold">Timer:</span>
            <span id="countdownDisplay" class="text-lg font-bold text-primary-container">
              ${String(Math.floor((state.remaining || 0) / 60)).padStart(2, '0')}:${String((state.remaining || 0) % 60).padStart(2, '0')}
            </span>
          </div>

          ${['DRAFT', 'READY'].includes(quiz.status) ? `
            <button type="button" data-control="start"
                    class="px-4 py-2 bg-tertiary/20 hover:bg-tertiary/30 text-tertiary-fixed border border-tertiary/40 rounded font-mono text-xs uppercase font-bold flex items-center gap-1.5 shadow-[0_0_10px_rgba(168,255,210,0.3)] transition-all">
              ${icon('play_arrow', 'text-[16px]')}
              <span>Start Quiz</span>
            </button>
          ` : ''}

          ${isLive ? `
            <button type="button" data-control="pause"
                    class="px-3.5 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded font-mono text-xs uppercase font-bold flex items-center gap-1.5 transition-all">
              ${icon('pause', 'text-[16px]')}
              <span>Pause Quiz</span>
            </button>
            <button type="button" data-control="end"
                    class="px-3.5 py-2 bg-error/20 hover:bg-error/30 text-error border border-error/40 rounded font-mono text-xs uppercase font-bold flex items-center gap-1.5 transition-all">
              ${icon('stop', 'text-[16px]')}
              <span>End Quiz</span>
            </button>
          ` : ''}

          ${isPaused ? `
            <button type="button" data-control="resume"
                    class="px-3.5 py-2 bg-primary-container text-on-primary-container rounded font-mono text-xs uppercase font-bold flex items-center gap-1.5 hover:brightness-110 transition-all">
              ${icon('play_arrow', 'text-[16px]')}
              <span>Resume Quiz</span>
            </button>
            <button type="button" data-control="end"
                    class="px-3.5 py-2 bg-error/20 hover:bg-error/30 text-error border border-error/40 rounded font-mono text-xs uppercase font-bold flex items-center gap-1.5 transition-all">
              ${icon('stop', 'text-[16px]')}
              <span>End Quiz</span>
            </button>
          ` : ''}

          ${['READY', 'LIVE', 'PAUSED', 'ENDED', 'RESULTS', 'FINALIZED'].includes(quiz.status) ? `
            <button type="button" data-control="redo"
                    class="px-3.5 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded font-mono text-xs uppercase font-bold flex items-center gap-1.5 transition-all"
                    title="Reset quiz attempts and restart round">
              ${icon('restart_alt', 'text-[16px]')}
              <span>Redo Quiz</span>
            </button>
          ` : ''}
        </div>
      </section>

      <!-- Metrics KPI Strip -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
        <div class="bg-surface-container p-3 rounded border border-outline-variant/30 flex flex-col gap-0.5">
          <span class="text-outline uppercase">Active Participants</span>
          <span class="text-base font-bold text-primary">${activeTeams} teams</span>
        </div>
        <div class="bg-surface-container p-3 rounded border border-outline-variant/30 flex flex-col gap-0.5">
          <span class="text-outline uppercase">Submitted / Finished</span>
          <span class="text-base font-bold text-tertiary">${submittedTeams} teams</span>
        </div>
        <div class="bg-surface-container p-3 rounded border border-outline-variant/30 flex flex-col gap-0.5">
          <span class="text-outline uppercase">Advancement Slots</span>
          <span class="text-base font-bold text-secondary">Top ${quiz.qualificationCount || 40} Qualify</span>
        </div>
        <div class="bg-surface-container p-3 rounded border border-outline-variant/30 flex flex-col gap-0.5">
          <span class="text-outline uppercase">Live Sync Rate</span>
          <span class="text-base font-bold text-tertiary flex items-center gap-1">
            <span class="w-2 h-2 rounded-full bg-tertiary animate-pulse"></span>
            <span>Real-time SSE</span>
          </span>
        </div>
      </div>

      <!-- Realtime Animated Adjudication Leaderboard -->
      <section class="flex flex-col bg-surface-container rounded-xl shadow-md border border-outline-variant/30 overflow-hidden">
        <div class="p-4 bg-surface-container-high flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-outline-variant/30">
          <div class="relative flex-1 max-w-md">
            <span class="absolute left-3 top-2 text-outline text-[18px]">
              ${icon('search', 'text-[18px]')}
            </span>
            <label class="sr-only" for="live-monitor-search">Search Teams</label>
            <input type="text" id="live-monitor-search"
                   class="w-full pl-9 pr-4 py-1.5 bg-surface-container-lowest text-on-surface font-mono text-xs rounded outline-none border border-outline-variant/30 focus:border-primary-container" />
          </div>

          <div class="flex items-center gap-2">
            <button type="button" id="btn-simulate-movement"
                    class="px-3 py-1.5 rounded font-mono text-xs font-bold uppercase bg-surface-container-lowest hover:bg-surface-container text-primary border border-primary-container/40 flex items-center gap-1 transition-all">
              ${icon('swap_vert', 'text-[16px]')}
              <span>Simulate Movement</span>
            </button>
            <span class="font-mono text-xs text-outline uppercase font-bold">Dynamic Live Adjudication</span>
          </div>
        </div>

        <div class="w-full overflow-x-auto">
          <table class="w-full text-left border-collapse" id="live-attempts-table">
            <thead>
              <tr class="bg-surface-container text-outline font-mono text-xs uppercase border-b border-outline-variant/20">
                <th class="py-3 px-4 w-16 text-center">Rank</th>
                <th class="py-3 px-4 w-20 text-center">Trend</th>
                <th class="py-3 px-4">Team Identifier</th>
                <th class="py-3 px-4 text-center">Status</th>
                <th class="py-3 px-4 text-right">Score</th>
                <th class="py-3 px-4 text-right">Time Taken</th>
                <th class="py-3 px-4 text-center">Session Security</th>
              </tr>
            </thead>
            <tbody class="font-mono text-xs divide-y divide-outline-variant/15 text-on-surface transition-all duration-500" id="live-attempts-body">
              ${sortedAttempts.map((att, idx) => {
                const currentRank = idx + 1;
                const prevRank = state.prevRanks?.[att.teamId] || currentRank;
                const rankDiff = prevRank - currentRank; // positive means moved up

                const isEvaluated = ['SUBMITTED', 'EVALUATED'].includes(att.status);
                const timeStr = att.timeTakenSeconds !== undefined && att.timeTakenSeconds !== null 
                  ? `${Math.floor(att.timeTakenSeconds / 60)}m ${String(att.timeTakenSeconds % 60).padStart(2, '0')}s` 
                  : (att.status === 'ACTIVE' ? 'In Progress' : '—');

                return `
                  <tr data-team-row="${esc(att.teamId)}"
                      class="transition-all duration-500 hover:bg-surface-container-high ${
                        rankDiff > 0 ? 'bg-tertiary/10' : rankDiff < 0 ? 'bg-error/10' : ''
                      }">
                    <td class="py-3 px-4 text-center font-bold">
                      <span class="inline-block px-2 py-0.5 rounded ${currentRank <= 3 ? 'bg-primary-container/20 text-primary' : 'text-outline'}">
                        #${currentRank}
                      </span>
                    </td>
                    <td class="py-3 px-4 text-center">
                      ${rankDiff > 0 ? `
                        <span class="text-tertiary-fixed font-bold flex items-center justify-center gap-0.5 animate-bounce">
                          ▲ +${rankDiff}
                        </span>
                      ` : rankDiff < 0 ? `
                        <span class="text-error font-bold flex items-center justify-center gap-0.5">
                          ▼ ${rankDiff}
                        </span>
                      ` : `
                        <span class="text-outline text-xs">—</span>
                      `}
                    </td>
                    <td class="py-3 px-4">
                      <div class="flex items-center gap-2">
                        <span class="font-bold text-on-surface">${esc(att.teamName || att.teamId)}</span>
                        <span class="text-outline text-[10px]">${esc(att.teamId)}</span>
                      </div>
                    </td>
                    <td class="py-3 px-4 text-center">
                      ${badge(att.status, isEvaluated ? 'green' : 'amber')}
                    </td>
                    <td class="py-3 px-4 text-right font-bold text-tertiary">
                      ${att.score !== null && att.score !== undefined ? `${att.score} pts` : '—'}
                    </td>
                    <td class="py-3 px-4 text-right text-outline">
                      ${timeStr}
                    </td>
                    <td class="py-3 px-4 text-center">
                      ${att.status === 'ACTIVE' ? `
                        <button type="button" data-invalidate-team="${esc(att.teamId)}"
                                class="px-2.5 py-1 rounded bg-error/10 text-error hover:bg-error/20 border border-error/30 text-[11px] font-bold">
                          Revoke Session
                        </button>
                      ` : `
                        <span class="text-outline text-[11px]">Sealed</span>
                      `}
                    </td>
                  </tr>
                `;
              }).join('')}

              ${sortedAttempts.length === 0 ? `
                <tr>
                  <td colspan="7" class="py-8 text-center text-outline font-mono text-xs">
                    No active contestant sessions currently running for ${esc(quiz.name)}.
                  </td>
                </tr>
              ` : ''}
            </tbody>
          </table>
        </div>
      </section>

    </div>
  `;

  return shell(content, 'admin/quizzes/live', state);
}
