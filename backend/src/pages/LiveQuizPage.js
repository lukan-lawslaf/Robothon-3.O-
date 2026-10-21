import { shell, card, badge, icon, account, esc } from './shared.js';

export function LiveQuizPage(state) {
  const liveRound = (state.quizzes || []).find(q => ['LIVE', 'PAUSED'].includes(q.status));
  const quiz = (liveRound && !['LIVE', 'PAUSED'].includes(state.quiz?.status)) ? liveRound : (state.quiz || {});
  const user = account() || { teamName: 'Team Apex Mechanics', teamId: 'team-apex' };
  const questions = state.questions || [];
  const currentIdx = state.current || 0;
  const currentQ = questions[currentIdx] || null;
  const answers = { ...(state.answers || {}), ...(state.attempt?.answers || {}) };
  const reviews = state.reviews || {};
  const isLive = ['LIVE', 'PAUSED'].includes(quiz.status);
  const isPaused = quiz.status === 'PAUSED';

  // If no quiz is live, display nothing in quiz terminal (standby state)
  if (!isLive) {
    return shell(`
      <div class="max-w-2xl mx-auto my-12 bg-surface-container rounded-xl p-8 text-center border border-outline-variant/30 flex flex-col items-center gap-4 shadow-xl">
        <div class="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center text-outline border border-outline-variant/30">
          ${icon('terminal', 'text-[32px]')}
        </div>
        <div class="flex flex-col gap-1 items-center">
          <span class="font-mono text-xs px-2.5 py-0.5 rounded bg-surface-container-highest text-outline uppercase font-bold">
            TERMINAL STANDBY
          </span>
          <h1 class="font-mono text-xl font-bold text-on-surface mt-2">
            No Live Quiz In Progress
          </h1>
          <p class="text-xs text-on-surface-variant font-mono max-w-md mt-1 leading-relaxed">
            The competition terminal is idle because there is no round currently broadcasting live.
            Please wait in the Waiting Room until the competition organizer initiates the round.
          </p>
        </div>

        <div class="bg-surface-container-lowest p-3.5 rounded border border-outline-variant/20 font-mono text-xs flex items-center justify-between gap-4 w-full max-w-sm mt-1">
          <span class="text-outline">Round Status:</span>
          <div class="flex items-center gap-2">
            <span class="text-on-surface font-bold">${esc(quiz.name || 'No Round Selected')}</span>
            ${badge(quiz.status || 'DRAFT')}
          </div>
        </div>

        <div class="pt-2 flex items-center gap-3">
          <a href="#team/quiz" class="px-5 py-2.5 rounded bg-primary-container text-on-primary-container font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:brightness-110 shadow-[0_0_15px_rgba(0,229,255,0.3)] transition-all">
            <span>Go to Waiting Room</span>
            ${icon('arrow_forward', 'text-[18px]')}
          </a>
        </div>
      </div>
    `, 'team/quiz/live', state);
  }

  if (!currentQ && questions.length === 0) {
    return shell(`
      <div class="max-w-2xl mx-auto my-12 bg-surface-container rounded-xl p-8 text-center border border-outline-variant/30 flex flex-col items-center gap-4">
        <div class="w-14 h-14 rounded-full bg-surface-container-high flex items-center justify-center text-primary-container">
          ${icon('hourglass_empty', 'text-[32px]')}
        </div>
        <h2 class="font-mono text-lg font-bold text-on-surface">Connecting to Live Arena...</h2>
        <p class="text-xs text-on-surface-variant font-mono">
          Synchronizing question bank and active countdown telemetry with arena server.
        </p>
        <a href="#team/quiz" class="px-4 py-2 rounded bg-primary-container text-on-primary-container font-mono text-xs font-bold uppercase">
          Back to Waiting Room
        </a>
      </div>
    `, 'team/quiz/live', state);
  }

  // Stage synchronization: determine active question and stage phase
  const stageState = state.stageState || quiz.stageState || { stage: 'QUESTION', questionIndex: 0 };
  const stagePhase = stageState.stage || 'QUESTION';
  const stageQIdx = Number.isInteger(stageState.questionIndex) ? stageState.questionIndex : currentIdx;
  const activeQ = questions[stageQIdx] || currentQ;
  const stageRemaining = Number.isInteger(state.stageRemaining) ? state.stageRemaining : (stageState.remainingSeconds || state.remaining || 0);

  // If stage is in COUNTDOWN phase, show dramatic pre-quiz sync screen
  if (stagePhase === 'COUNTDOWN') {
    return shell(`
      <div class="max-w-xl mx-auto my-12 bg-surface-container rounded-2xl p-8 text-center border border-primary-container/40 flex flex-col items-center gap-6 shadow-[0_0_40px_rgba(0,229,255,0.15)]">
        <div class="w-16 h-16 rounded-2xl bg-primary-container/15 border border-primary-container/40 flex items-center justify-center text-primary-container shadow-[0_0_20px_rgba(0,229,255,0.25)]">
          ${icon('sensors', 'text-[36px]')}
        </div>

        <div class="flex flex-col gap-2">
          <span class="font-mono text-xs px-3 py-1 rounded-full bg-primary-container/20 text-primary-container border border-primary-container/40 font-bold uppercase tracking-wider inline-block mx-auto">
            ARENA ROUND INITIALIZING
          </span>
          <h1 class="font-mono text-2xl font-bold text-on-surface">
            Get Ready for Question 1
          </h1>
          <p class="text-xs text-on-surface-variant font-mono max-w-sm mx-auto leading-relaxed">
            Question prompts are projected on the main arena display.
            Your terminal will activate options A, B, C, D as soon as the timer starts.
          </p>
        </div>

        <div class="w-32 h-32 rounded-full border-4 border-primary-container/30 flex items-center justify-center bg-primary-container/10 shadow-[0_0_30px_rgba(0,229,255,0.2)]">
          <span class="font-mono text-5xl font-black text-primary-container animate-pulse">
            ${stageRemaining > 0 ? stageRemaining : 'GO!'}
          </span>
        </div>

        <div class="font-mono text-xs text-outline flex items-center gap-2">
          ${icon('visibility', 'text-[16px] text-primary-container')}
          <span>Keep your eyes on the main arena projector</span>
        </div>
      </div>
    `, 'team/quiz/live', state);
  }

  // If stage is in INTERIM LEADERBOARD phase between questions, lock inputs and show status
  if (stagePhase === 'LEADERBOARD') {
    const teamScore = state.attempt?.score ?? 0;
    return shell(`
      <div class="max-w-xl mx-auto my-12 bg-surface-container rounded-2xl p-8 text-center border border-tertiary/40 flex flex-col items-center gap-6 shadow-[0_0_40px_rgba(168,255,210,0.15)]">
        <div class="w-16 h-16 rounded-2xl bg-tertiary/15 border border-tertiary/40 flex items-center justify-center text-tertiary-fixed shadow-[0_0_20px_rgba(168,255,210,0.25)]">
          ${icon('leaderboard', 'text-[36px]')}
        </div>

        <div class="flex flex-col gap-2">
          <span class="font-mono text-xs px-3 py-1 rounded-full bg-tertiary/20 text-tertiary-fixed border border-tertiary/40 font-bold uppercase tracking-wider inline-block mx-auto">
            QUESTION ${stageQIdx + 1} CONCLUDED
          </span>
          <h1 class="font-mono text-2xl font-bold text-on-surface">
            Standings Displayed on Screen
          </h1>
          <p class="text-xs text-on-surface-variant font-mono max-w-sm mx-auto leading-relaxed">
            Responses for Question ${stageQIdx + 1} are locked. Interim leaderboard is now showing on the arena display.
          </p>
        </div>

        <div class="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/30 font-mono text-xs flex items-center justify-between w-full max-w-xs">
          <span class="text-outline">Your Current Score:</span>
          <span class="text-base font-bold text-tertiary-fixed">${teamScore} pts</span>
        </div>

        <div class="flex flex-col items-center gap-1 font-mono">
          <span class="text-[10px] text-outline uppercase font-bold">Next Question Begins In</span>
          <span class="text-3xl font-black text-tertiary-fixed animate-pulse">
            ${stageRemaining}s
          </span>
        </div>
      </div>
    `, 'team/quiz/live', state);
  }

  // Determine lock state: locked if paused or timer expired
  const isQuestionLocked = isPaused || stagePhase !== 'QUESTION' || stageRemaining <= 0;
  const selectedOption = activeQ ? answers[activeQ.id] : null;
  const totalQuestions = questions.length || 1;

  // Kahoot-style color palettes for response options A, B, C, D
  const optionTheme = {
    A: {
      base: 'bg-rose-500/10 border-rose-500/30 hover:border-rose-400 hover:bg-rose-500/20 text-on-surface',
      selected: 'bg-rose-500/30 border-rose-400 text-white shadow-[0_0_25px_rgba(244,63,94,0.35)] ring-2 ring-rose-400 font-bold',
      badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      badgeSelected: 'bg-rose-500 text-white border-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.5)]'
    },
    B: {
      base: 'bg-cyan-500/10 border-cyan-500/30 hover:border-cyan-400 hover:bg-cyan-500/20 text-on-surface',
      selected: 'bg-cyan-500/30 border-cyan-400 text-white shadow-[0_0_25px_rgba(0,229,255,0.35)] ring-2 ring-cyan-400 font-bold',
      badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
      badgeSelected: 'bg-cyan-500 text-black border-cyan-400 shadow-[0_0_10px_rgba(0,229,255,0.5)]'
    },
    C: {
      base: 'bg-amber-500/10 border-amber-500/30 hover:border-amber-400 hover:bg-amber-500/20 text-on-surface',
      selected: 'bg-amber-500/30 border-amber-400 text-white shadow-[0_0_25px_rgba(245,158,11,0.35)] ring-2 ring-amber-400 font-bold',
      badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      badgeSelected: 'bg-amber-500 text-black border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.5)]'
    },
    D: {
      base: 'bg-emerald-500/10 border-emerald-500/30 hover:border-emerald-400 hover:bg-emerald-500/20 text-on-surface',
      selected: 'bg-emerald-500/30 border-emerald-400 text-white shadow-[0_0_25px_rgba(16,185,129,0.35)] ring-2 ring-emerald-400 font-bold',
      badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      badgeSelected: 'bg-emerald-500 text-black border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.5)]'
    }
  };

  const content = `
    <div class="flex flex-col gap-5 w-full max-w-4xl mx-auto">
      
      <!-- Top Status HUD (No manual submit button; fully synchronized) -->
      <section class="w-full bg-surface-container p-4 rounded-xl border border-outline-variant/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
        <div class="flex flex-col gap-0.5">
          <div class="flex items-center gap-2">
            <span class="font-mono text-xs font-bold uppercase text-primary">${esc(quiz.name || 'Robothon Quiz Round')}</span>
            <span class="text-outline">•</span>
            <span class="font-mono text-xs text-outline">${esc(user?.teamName || 'Team')}</span>
          </div>
          <span class="text-xs text-on-surface-variant font-mono">
            Question ${stageQIdx + 1} of ${totalQuestions}
          </span>
        </div>

        <!-- Master Countdown Timer & Live Sync Badge -->
        <div class="flex items-center gap-3">
          <div class="flex items-center gap-2.5 bg-surface-container-lowest px-4 py-2 rounded border border-outline-variant/30 shadow-inner">
            ${icon('timer', 'text-primary-container text-[22px]')}
            <div class="flex flex-col text-left">
              <span class="font-mono text-[10px] uppercase text-outline font-bold">Per-Question Timer</span>
              <span id="countdown-readout" class="font-mono text-xl font-black ${stageRemaining <= 5 ? 'text-error animate-pulse' : 'text-primary-container'}">
                ${stageRemaining > 0 ? `${stageRemaining}s` : '0s'}
              </span>
            </div>
          </div>

          <div class="px-3 py-2 rounded bg-surface-container-lowest border border-outline-variant/20 font-mono text-xs flex items-center gap-1.5 text-tertiary">
            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span class="font-bold uppercase tracking-wider text-[11px]">Arena Live</span>
          </div>
        </div>
      </section>

      ${isPaused ? `
        <div class="p-3 bg-amber-500/20 text-amber-200 border border-amber-500/40 rounded font-mono text-xs flex items-center gap-2">
          ${icon('pause_circle', 'text-[18px]')}
          <span>The competition host has paused the round. Answering is temporarily locked.</span>
        </div>
      ` : ''}

      <!-- Main Answering Card: Options Only (Anti-Cheat Kahoot Mode) -->
      <div class="w-full flex flex-col gap-4">
        
        <div class="bg-surface-container rounded-2xl p-6 sm:p-8 border border-outline-variant/30 shadow-xl flex flex-col gap-6">
          
          <!-- Question Header & Points -->
          <div class="flex items-center justify-between pb-3 border-b border-outline-variant/20">
            <div class="flex items-center gap-2">
              <span class="font-mono text-xs px-3 py-1 rounded bg-surface-container-high text-primary font-bold uppercase tracking-wider">
                Question ${stageQIdx + 1}
              </span>
              <span class="font-mono text-xs text-outline uppercase">${esc(activeQ?.category || 'Robotics')}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="font-mono text-xs text-tertiary font-bold">+${activeQ?.points || 4} pts</span>
            </div>
          </div>

          <!-- ANTI-CHEAT BANNER: Prompt text is exclusively on arena screen -->
          <div class="p-6 bg-surface-container-high/60 border border-primary-container/30 rounded-2xl text-center flex flex-col items-center gap-3 shadow-md">
            <div class="w-14 h-14 rounded-2xl bg-primary-container/15 border border-primary-container/30 flex items-center justify-center text-primary-container shadow-[0_0_20px_rgba(0,229,255,0.2)]">
              ${icon('tv', 'text-[32px]')}
            </div>
            <div class="flex flex-col gap-1">
              <h2 class="font-mono text-base font-bold text-on-surface">Question ${stageQIdx + 1} Prompt is on the Arena Screen</h2>
              <p class="font-mono text-xs text-on-surface-variant max-w-md">Look up at the main display to read the question prompt. Choose your team's response card below before the timer reaches 0s.</p>
            </div>
          </div>

          <!-- KAHOOT-STYLE TACTILE OPTIONS (A, B, C, D) -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            ${(activeQ?.options || []).map(opt => {
              const isChosen = selectedOption === opt.optionKey;
              const theme = optionTheme[opt.optionKey] || optionTheme.A;
              return `
                <button type="button" data-option="${esc(opt.optionKey)}" ${isQuestionLocked ? 'disabled' : ''}
                        class="w-full text-left p-5 rounded-2xl border transition-all flex items-center gap-4 ${
                          isQuestionLocked ? 'opacity-50 cursor-not-allowed ' : 'cursor-pointer active:scale-[0.98] '
                        }${isChosen ? theme.selected : theme.base}">
                  <span class="w-12 h-12 rounded-xl flex items-center justify-center font-mono text-lg font-black border shrink-0 transition-transform ${
                    isChosen ? theme.badgeSelected : theme.badge
                  }">
                    ${esc(opt.optionKey)}
                  </span>
                  <div class="flex flex-col flex-1 truncate">
                    <span class="font-mono text-[11px] uppercase text-outline font-bold">Option ${esc(opt.optionKey)}</span>
                    <span class="text-sm font-body-md font-medium leading-snug truncate">${esc(opt.optionText)}</span>
                  </div>
                  ${isChosen ? icon('check_circle', 'text-[24px] text-white shrink-0 animate-bounce') : ''}
                </button>
              `;
            }).join('')}
          </div>

          <!-- Option Action Controls & Autosave Telemetry -->
          <div class="flex items-center justify-between pt-4 border-t border-outline-variant/20 flex-wrap gap-2">
            <div class="flex items-center gap-2">
              ${selectedOption && !isQuestionLocked ? `
                <button type="button" id="clear-choice-btn" class="px-3 py-1.5 rounded font-mono text-xs text-error hover:underline">
                  Clear Selection
                </button>
              ` : `
                <span class="font-mono text-xs text-outline">
                  ${isQuestionLocked ? 'Response locked for this question' : 'Tap an option above to record response'}
                </span>
              `}
            </div>

            <!-- Dynamic Autosave Indicator -->
            <div id="autosave-indicator" class="flex items-center gap-1.5 font-mono text-xs text-tertiary">
              ${icon('cloud_done', 'text-[16px]')}
              <span>${selectedOption ? `Option ${selectedOption} Recorded Authoritatively` : 'Waiting for Answer'}</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  `;

  return shell(content, 'team/quiz/live', state);
}
