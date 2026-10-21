import { shell, card, badge, icon, esc } from '../shared.js';

export function QuizConfigurationPage(state) {
  const quiz = state.quiz || {};
  const isLocked = ['LIVE', 'PAUSED', 'ENDED', 'RESULTS', 'FINALIZED'].includes(quiz.status);
  const durationMins = Math.round((quiz.durationSeconds || 1800) / 60);

  const content = `
    <div class="flex flex-col gap-space-lg w-full max-w-7xl mx-auto">
      
      <!-- Top Command Title Bar & Synchronizer -->
      <section class="p-space-lg bg-surface-container-low rounded-xl border border-outline-variant/30 flex flex-col lg:flex-row lg:items-center justify-between gap-space-md shadow-md">
        <div class="flex flex-col gap-space-xs">
          <div class="flex items-center gap-space-sm flex-wrap">
            <span class="font-label-badge text-label-badge uppercase tracking-wider px-2 py-0.5 rounded bg-surface-container-high text-primary-fixed-dim font-bold">
              ARENA_PAR_03
            </span>
            <span class="font-label-badge text-label-badge uppercase tracking-wider px-2 py-0.5 rounded bg-secondary-container/30 text-secondary font-bold">
              REV_3.2
            </span>
            <span class="font-label-badge text-label-badge uppercase tracking-wider px-2 py-0.5 rounded bg-surface-variant text-on-surface-variant">
              STAGE_ID: ${esc(quiz.id || 'elimination-2026')}
            </span>
            ${badge(quiz.status || 'READY', quiz.status === 'LIVE' ? 'live' : 'cyan')}
          </div>
          <h1 class="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">
            Quiz Configuration — ${esc(quiz.name || 'Stage 1: Elimination Round')}
          </h1>
          <p class="font-body-sm text-body-sm text-on-surface-variant">
            Deterministic scoring thresholds, telemetry constraints, terminal lockdown policies, and real-time evaluation protocols.
          </p>
        </div>

        <!-- Action Bar -->
        <div class="flex items-center gap-space-sm self-start lg:self-auto">
          <button type="button" id="btnResetDefaults" ${isLocked ? 'disabled' : ''}
                  class="px-space-md py-2 rounded bg-surface-container hover:bg-surface-container-high text-on-surface font-body-sm text-body-sm flex items-center gap-space-xs transition-colors border border-outline-variant/30 ${
                    isLocked ? 'opacity-40 cursor-not-allowed' : ''
                  }">
            ${icon('restart_alt', 'text-[18px] text-outline')}
            <span>Reset Defaults</span>
          </button>

          <button type="submit" form="config-matrix-form" ${isLocked ? 'disabled' : ''}
                  class="px-space-md py-2 rounded bg-primary-container hover:bg-primary-fixed-dim text-on-primary-container font-headline-sm text-body-md font-bold uppercase tracking-wider flex items-center gap-space-xs shadow-md transition-all ${
                    isLocked ? 'opacity-40 cursor-not-allowed' : 'hover:shadow-[0_0_12px_rgba(0,229,255,0.4)]'
                  }">
            ${icon('rocket_launch', 'text-[18px]')}
            <span>Save & Deploy Configuration</span>
          </button>
        </div>
      </section>

      ${isLocked ? `
        <div class="px-space-lg py-2.5 bg-amber-950/60 border border-amber-500/50 rounded-lg flex items-center justify-between text-amber-200 font-body-sm">
          <div class="flex items-center gap-2">
            ${icon('lock', 'text-[18px] text-amber-400')}
            <span>Configuration is locked because the round is <b>${esc(quiz.status)}</b>. Parameters can only be modified while in READY or DRAFT state.</span>
          </div>
        </div>
      ` : ''}

      <!-- Telemetry HUD Quick Readout Cards -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-px bg-surface-container-highest rounded-lg overflow-hidden border border-outline-variant/30">
        <div class="p-space-md bg-surface-container flex flex-col gap-1">
          <span class="font-label-badge text-label-badge uppercase text-outline font-bold">SESSION TIMEOUT</span>
          <div class="flex items-baseline gap-1">
            <span class="font-label-metric text-label-metric text-on-surface font-bold" id="hudDuration">${durationMins}</span>
            <span class="font-label-badge text-label-badge text-on-surface-variant uppercase">MINUTES</span>
          </div>
          <span class="font-body-sm text-body-sm text-outline">Hard lockout synchronized</span>
        </div>

        <div class="p-space-md bg-surface-container flex flex-col gap-1">
          <span class="font-label-badge text-label-badge uppercase text-outline font-bold">NET SCORE POTENTIAL</span>
          <div class="flex items-baseline gap-1">
            <span class="font-label-metric text-label-metric text-tertiary font-bold">+${(quiz.pointsPerCorrect || 4) * 30}</span>
            <span class="font-label-badge text-label-badge text-on-surface-variant uppercase">/ -${(quiz.negativePoints || 1) * 30} PTS</span>
          </div>
          <span class="font-body-sm text-body-sm text-outline">30 Questions @ +${quiz.pointsPerCorrect || 4} / -${quiz.negativePoints || 0}</span>
        </div>

        <div class="p-space-md bg-surface-container flex flex-col gap-1">
          <span class="font-label-badge text-label-badge uppercase text-outline font-bold">QUALIFICATION SLOTS</span>
          <div class="flex items-baseline gap-1">
            <span class="font-label-metric text-label-metric text-secondary-fixed font-bold" id="hudQuota">
              ${quiz.qualificationCount || 50}
            </span>
            <span class="font-label-badge text-label-badge text-on-surface-variant uppercase">TEAMS ADVANCE</span>
          </div>
          <span class="font-body-sm text-body-sm text-outline">Threshold cutoff: Stage 2</span>
        </div>

        <div class="p-space-md bg-surface-container flex flex-col gap-1">
          <span class="font-label-badge text-label-badge uppercase text-outline font-bold">WORKSTATION BOUND</span>
          <div class="flex items-baseline gap-1">
            <span class="font-label-metric text-label-metric text-primary-container font-bold">ENFORCED</span>
          </div>
          <span class="font-body-sm text-body-sm text-outline">Single Active Session</span>
        </div>
      </div>

      <!-- Primary Form Matrix -->
      <form id="config-matrix-form" class="grid grid-cols-1 lg:grid-cols-2 gap-space-lg">
        
        <!-- MODULE 01: TIMING & LIFECYCLE -->
        <div class="flex flex-col bg-surface-container-low rounded-lg shadow-sm overflow-hidden border border-outline-variant/30">
          <div class="px-space-md py-space-sm bg-surface-container-high flex items-center justify-between border-b border-outline-variant/30">
            <div class="flex items-center gap-space-sm">
              ${icon('timer', 'text-[18px] text-primary-container')}
              <span class="font-label-code text-label-code font-bold uppercase tracking-wider text-on-surface">
                01 // TIMING & LIFECYCLE
              </span>
            </div>
            <span class="font-label-badge text-label-badge text-outline">MOD_TMR_V2</span>
          </div>

          <div class="p-space-md flex flex-col gap-space-md">
            <!-- Duration Input -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-space-sm items-center bg-surface-container p-space-sm rounded">
              <div class="sm:col-span-2">
                <label class="font-body-md text-body-md font-semibold text-on-surface block" for="inputDuration">
                  Quiz Duration (Minutes)
                </label>
                <p class="font-body-sm text-body-sm text-on-surface-variant">Master contest countdown allocation. Triggers global synchronized halt.</p>
              </div>
              <div class="flex items-center gap-space-xs sm:justify-end">
                <input id="inputDuration" name="durationMinutes" type="number" min="1" max="180" value="${durationMins}" ${isLocked ? 'disabled' : ''}
                       class="w-24 input-field text-right" />
                <span class="font-label-badge text-label-badge text-outline uppercase font-bold">MIN</span>
              </div>
            </div>

            <!-- Auto-Submit Toggle -->
            <div class="flex items-center justify-between p-space-sm bg-surface-container rounded gap-space-md">
              <div class="flex flex-col">
                <span class="font-body-md text-body-md font-semibold text-on-surface">Auto-Submit on Timeout</span>
                <span class="font-body-sm text-body-sm text-on-surface-variant">System forcibly synchronizes and evaluates active attempt upon timer expiry.</span>
              </div>
              <label class="relative inline-flex items-center cursor-pointer flex-shrink-0">
                <input type="checkbox" name="autoSubmitOnTimeout" class="sr-only peer" ${quiz.autoSubmitOnTimeout !== false ? 'checked' : ''} ${isLocked ? 'disabled' : ''}>
                <div class="w-11 h-6 bg-surface-container-highest rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-primary-container after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-on-surface after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
              </label>
            </div>

            <!-- Question Navigation Lock Toggle -->
            <div class="flex items-center justify-between p-space-sm bg-surface-container rounded gap-space-md">
              <div class="flex flex-col">
                <span class="font-body-md text-body-md font-semibold text-on-surface">Allow Question Navigation</span>
                <span class="font-body-sm text-body-sm text-on-surface-variant">Contestants can freely jump between questions 1-30 via the matrix overview.</span>
              </div>
              <label class="relative inline-flex items-center cursor-pointer flex-shrink-0">
                <input type="checkbox" name="allowNavigation" class="sr-only peer" ${quiz.allowNavigation !== false ? 'checked' : ''} ${isLocked ? 'disabled' : ''}>
                <div class="w-11 h-6 bg-surface-container-highest rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-primary-container after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-on-surface after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
              </label>
            </div>
          </div>
        </div>

        <!-- MODULE 02: SCORING & PENALTIES -->
        <div class="flex flex-col bg-surface-container-low rounded-lg shadow-sm overflow-hidden border border-outline-variant/30">
          <div class="px-space-md py-space-sm bg-surface-container-high flex items-center justify-between border-b border-outline-variant/30">
            <div class="flex items-center gap-space-sm">
              ${icon('calculate', 'text-[18px] text-secondary')}
              <span class="font-label-code text-label-code font-bold uppercase tracking-wider text-on-surface">
                02 // SCORING & PENALTIES
              </span>
            </div>
            <span class="font-label-badge text-label-badge text-outline">MOD_METRICS</span>
          </div>

          <div class="p-space-md flex flex-col gap-space-md">
            <!-- Points per correct -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-space-sm items-center bg-surface-container p-space-sm rounded">
              <div class="sm:col-span-2">
                <label class="font-body-md text-body-md font-semibold text-on-surface block" for="pointsCorrect">
                  Points Per Correct Answer
                </label>
                <p class="font-body-sm text-body-sm text-on-surface-variant">Points awarded for each verified correct response.</p>
              </div>
              <div class="flex items-center gap-space-xs sm:justify-end">
                <input id="pointsCorrect" name="pointsPerCorrect" type="number" min="1" value="${quiz.pointsPerCorrect ?? 4}" ${isLocked ? 'disabled' : ''}
                       class="w-24 input-field text-right" />
                <span class="font-label-badge text-label-badge text-tertiary-fixed font-bold uppercase">PTS</span>
              </div>
            </div>

            <!-- Negative Marking Penalty -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-space-sm items-center bg-surface-container p-space-sm rounded">
              <div class="sm:col-span-2">
                <label class="font-body-md text-body-md font-semibold text-on-surface block" for="negativePoints">
                  Negative Marking Penalty
                </label>
                <p class="font-body-sm text-body-sm text-on-surface-variant">Deduction applied for incorrect response selections.</p>
              </div>
              <div class="flex items-center gap-space-xs sm:justify-end">
                <input id="negativePoints" name="negativePoints" type="number" min="0" value="${quiz.negativePoints ?? 1}" ${isLocked ? 'disabled' : ''}
                       class="w-24 input-field text-right" />
                <span class="font-label-badge text-label-badge text-error font-bold uppercase">DEDUCT</span>
              </div>
            </div>

            <!-- Leaderboard Mode -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-space-sm items-center bg-surface-container p-space-sm rounded">
              <div class="sm:col-span-2">
                <label class="font-body-md text-body-md font-semibold text-on-surface block" for="leaderboardMode">
                  Leaderboard Visibility Mode
                </label>
                <p class="font-body-sm text-body-sm text-on-surface-variant">Control real-time stage broadcast information density.</p>
              </div>
              <div class="sm:justify-end flex">
                <select id="leaderboardMode" name="leaderboardMode" ${isLocked ? 'disabled' : ''}
                        class="select-field">
                  <option value="LIVE_RANK" ${quiz.leaderboardMode === 'LIVE_RANK' ? 'selected' : ''}>LIVE_RANK</option>
                  <option value="LIVE_SCORE" ${quiz.leaderboardMode === 'LIVE_SCORE' ? 'selected' : ''}>LIVE_SCORE</option>
                  <option value="HIDDEN" ${quiz.leaderboardMode === 'HIDDEN' ? 'selected' : ''}>HIDDEN</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <!-- MODULE 03: TEAM PARTICIPATION & QUALIFICATION -->
        <div class="lg:col-span-2 flex flex-col bg-surface-container-low rounded-lg shadow-sm overflow-hidden border border-outline-variant/30">
          <div class="px-space-md py-space-sm bg-surface-container-high flex items-center justify-between border-b border-outline-variant/30">
            <div class="flex items-center gap-space-sm">
              ${icon('military_tech', 'text-[18px] text-tertiary')}
              <span class="font-label-code text-label-code font-bold uppercase tracking-wider text-on-surface">
                03 // PARTICIPATION & QUALIFICATION CUTOFF
              </span>
            </div>
            <span class="font-label-badge text-label-badge text-outline">MOD_BRACKET</span>
          </div>

          <div class="p-space-md grid grid-cols-1 md:grid-cols-2 gap-space-md">
            <!-- Qualification Count -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-space-sm items-center bg-surface-container p-space-sm rounded">
              <div class="sm:col-span-2">
                <label class="font-body-md text-body-md font-semibold text-on-surface block" for="qualCount">
                  Qualification Slots (Cutoff)
                </label>
                <p class="font-body-sm text-body-sm text-on-surface-variant">Top N teams advancing to Stage 2 upon results finalization.</p>
              </div>
              <div class="flex items-center gap-space-xs sm:justify-end">
                <input id="qualCount" name="qualificationCount" type="number" min="1" value="${quiz.qualificationCount || 50}" ${isLocked ? 'disabled' : ''}
                       class="w-24 input-field text-right" />
                <span class="font-label-badge text-label-badge text-primary uppercase font-bold">SLOTS</span>
              </div>
            </div>

            <!-- Tie Breaker -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-space-sm items-center bg-surface-container p-space-sm rounded">
              <div class="sm:col-span-2">
                <label class="font-body-md text-body-md font-semibold text-on-surface block" for="tieBreaker">
                  Tie-Breaker Metric
                </label>
                <p class="font-body-sm text-body-sm text-on-surface-variant">Resolution formula when teams have identical net scores.</p>
              </div>
              <div class="sm:justify-end flex">
                <select id="tieBreaker" name="tieBreaker" ${isLocked ? 'disabled' : ''}
                        class="select-field">
                  <option value="TIME_TAKEN" ${quiz.tieBreaker === 'TIME_TAKEN' ? 'selected' : ''}>TIME_TAKEN (Fastest First)</option>
                  <option value="SUBMISSION_TIME" ${quiz.tieBreaker === 'SUBMISSION_TIME' ? 'selected' : ''}>SUBMISSION_TIME (Earliest Timestamp)</option>
                  <option value="SCORE_THEN_TIME" ${quiz.tieBreaker === 'SCORE_THEN_TIME' ? 'selected' : ''}>SCORE_THEN_TIME</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  `;

  return shell(content, 'admin/quizzes/config', state);
}
