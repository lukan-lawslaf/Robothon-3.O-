/**
 * ============================================================================
 * ROBOTHON QUIZ MODULE — SUPER ADMIN STAGE PRESENTER PAGE
 * ============================================================================
 * 
 * INTEGRATION ARCHITECTURE & SYSTEM OVERVIEW:
 * ----------------------------------------------------------------------------
 * This component provides the authoritative big-screen / projector display for
 * the competition arena. It is specifically designed to eliminate contestant
 * cheating via AI/OCR tools by keeping the question text PROMPT exclusively
 * on this main arena screen, while contestants only see Option buttons (A, B, C, D)
 * on their personal team terminals.
 * 
 * COMPETITION FLOW PATTERN:
 * 1. STANDBY: Organizer configures quiz & selects "Launch Stage Presentation".
 * 2. PRE-QUIZ COUNTDOWN: High-impact full-screen countdown (e.g. 10s... 1s).
 * 3. 1ST QUESTION: Question 1 prompt, options A-D, and per-question countdown appear.
 * 4. INTERIM LEADERBOARD: When timer reaches 0, live standings table displays for
 *    a configurable intermission (e.g. 7s) with note that final results are later.
 * 5. 2ND QUESTION TO NTH QUESTION: Cycle repeats for all N questions.
 * 6. FINAL RESULTS REVEAL: When all questions finish, prompt host to finalize cutoffs.
 * 
 * REAL-TIME TELEMETRY:
 * - Emits and listens to `STAGE_UPDATE` events over SSE.
 * - Synchronizes active question index and remaining seconds to all team terminals.
 * ============================================================================
 */

import { icon, badge, esc, account } from '../shared.js';

export function StagePresenterPage(state) {
  const quizzes = state.quizzes || [];
  const currentQuizId = state.selectedQuizId || state.quiz?.id || 'quiz-1';
  const quiz = quizzes.find(q => q.id === currentQuizId) || state.quiz || (quizzes.length > 0 ? quizzes[0] : {});
  const questions = state.questions || state.questionBank || [];
  const stageState = state.stageState || quiz.stageState || { stage: 'STANDBY', questionIndex: 0 };
  const currentStage = stageState.stage || 'STANDBY';
  const qIdx = Number.isInteger(stageState.questionIndex) ? stageState.questionIndex : 0;
  const currentQ = questions[qIdx] || null;
  const totalQuestions = questions.length || 1;
  const isLastQuestion = qIdx >= totalQuestions - 1;
  const attempts = (state.liveAttempts && state.liveAttempts.length > 0)
    ? state.liveAttempts
    : (state.leaderboard || []);

  // Ranked attempts for interim leaderboard
  const rankedAttempts = [...attempts].sort((a, b) => {
    if (a.debarred && !b.debarred) return 1;
    if (!a.debarred && b.debarred) return -1;
    const scoreDiff = (b.score ?? b.quizScore ?? -Infinity) - (a.score ?? a.quizScore ?? -Infinity);
    if (scoreDiff !== 0) return scoreDiff;
    return (a.timeTakenSeconds ?? a.timeTaken ?? Infinity) - (b.timeTakenSeconds ?? b.timeTaken ?? Infinity);
  });

  // Stage timer formatting
  const stageRemaining = Number.isInteger(state.stageRemaining) ? state.stageRemaining : (stageState.remainingSeconds || 0);

  return `
    <div id="stage-presenter-root" class="min-h-screen bg-[#07090e] text-[#f0f4fc] flex flex-col justify-between selection:bg-cyan-500 selection:text-black">
      
      <!-- Top Stage HUD Bar -->
      <header class="px-6 py-3.5 bg-[#0e121a]/90 backdrop-blur border-b border-cyan-500/20 flex items-center justify-between gap-4 z-40">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            ${icon('slideshow', 'text-[20px]')}
          </div>
          <div class="flex flex-col">
            <div class="flex items-center gap-2">
              <span class="font-mono text-xs uppercase font-bold text-cyan-400 tracking-wider">ROBOTHON ARENA STAGE</span>
              <span class="text-neutral-600">•</span>
              <span class="font-mono text-xs text-neutral-300 font-semibold">${esc(quiz.name || 'Round')}</span>
            </div>
            <span class="text-[10px] font-mono text-neutral-400">BIG SCREEN BROADCAST // ANTI-CHEAT OPTION MAPPING ENABLED</span>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <!-- Active Stage Pill -->
          <div class="px-3 py-1 rounded bg-[#151b27] border border-cyan-500/30 font-mono text-xs flex items-center gap-2">
            <span class="w-2 h-2 rounded-full ${currentStage === 'STANDBY' ? 'bg-neutral-400' : 'bg-cyan-400 animate-pulse'}"></span>
            <span class="text-cyan-300 font-bold uppercase tracking-wider">STAGE: ${esc(currentStage)}</span>
          </div>

          <!-- Fullscreen Toggle Button -->
          <button type="button" id="stage-btn-fullscreen"
                  class="px-3 py-1.5 rounded bg-[#151b27] hover:bg-[#1e2738] border border-neutral-700 text-neutral-200 font-mono text-xs flex items-center gap-1.5 transition-all">
            ${icon('fullscreen', 'text-[16px]')}
            <span>Fullscreen</span>
          </button>

          <!-- Return to Admin Hub -->
          <a href="#admin/quizzes/live"
             class="px-3 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-mono text-xs flex items-center gap-1.5 transition-all">
            ${icon('arrow_back', 'text-[16px]')}
            <span>Mission Control</span>
          </a>
        </div>
      </header>

      <!-- Main Central Presentation Arena -->
      <main class="flex-1 flex flex-col justify-center items-center p-6 md:p-12 w-full max-w-6xl mx-auto">
        
        <!-- ============================================================== -->
        <!-- PHASE 1: STANDBY / READY TO LAUNCH                             -->
        <!-- ============================================================== -->
        ${currentStage === 'STANDBY' ? `
          <div class="w-full max-w-2xl bg-[#0f1420] border border-cyan-500/30 rounded-2xl p-8 md:p-10 shadow-[0_0_50px_rgba(0,229,255,0.12)] text-center flex flex-col items-center gap-6">
            <div class="w-20 h-20 rounded-2xl bg-cyan-500/10 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-[0_0_25px_rgba(0,229,255,0.25)]">
              ${icon('smart_display', 'text-[44px]')}
            </div>

            <div class="flex flex-col gap-2">
              <span class="font-mono text-xs px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 uppercase font-bold tracking-widest inline-block mx-auto">
                ARENA STAGE DISPLAY SYSTEM
              </span>
              <h1 class="font-mono text-3xl md:text-4xl font-extrabold text-white tracking-tight mt-1">
                ${esc(quiz.name || 'Robothon Quiz Round')}
              </h1>
              <p class="text-sm text-neutral-400 font-mono max-w-lg mx-auto leading-relaxed mt-1">
                Question prompts and per-question timers will appear sequentially on this projector display.
                Contestants will only see Option buttons (A, B, C, D) on their devices.
              </p>
            </div>

            <div class="grid grid-cols-3 gap-3 w-full font-mono text-xs text-left">
              <div class="bg-[#151c2c] p-3.5 rounded-xl border border-neutral-800 flex flex-col gap-1">
                <span class="text-neutral-500 uppercase font-semibold">Total Questions</span>
                <span class="text-lg font-bold text-white">${totalQuestions}</span>
              </div>
              <div class="bg-[#151c2c] p-3.5 rounded-xl border border-neutral-800 flex flex-col gap-1">
                <span class="text-neutral-500 uppercase font-semibold">Pre-Quiz Timer</span>
                <span class="text-lg font-bold text-cyan-400">${quiz.preQuizCountdownSeconds ?? 10}s</span>
              </div>
              <div class="bg-[#151c2c] p-3.5 rounded-xl border border-neutral-800 flex flex-col gap-1">
                <span class="text-neutral-500 uppercase font-semibold">Intermission</span>
                <span class="text-lg font-bold text-emerald-400">${quiz.intermissionSeconds ?? 7}s</span>
              </div>
            </div>

            <div class="pt-2 flex flex-col sm:flex-row items-center gap-3 w-full justify-center">
              <button type="button" id="stage-btn-launch"
                      class="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-mono text-sm font-extrabold uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-[0_0_30px_rgba(0,229,255,0.4)] transition-all">
                ${icon('play_arrow', 'text-[22px]')}
                <span>Launch Stage Presentation</span>
              </button>
            </div>
          </div>
        ` : ''}

        <!-- ============================================================== -->
        <!-- PHASE 2: PRE-QUIZ COUNTDOWN                                    -->
        <!-- ============================================================== -->
        ${currentStage === 'COUNTDOWN' ? `
          <div class="flex flex-col items-center justify-center text-center gap-8 py-10 animate-fade-in">
            <span class="font-mono text-sm uppercase px-4 py-1.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/40 font-bold tracking-widest shadow-[0_0_15px_rgba(0,229,255,0.25)]">
              COMPETITION ROUND INITIALIZING
            </span>

            <!-- Massive Animated Countdown Number -->
            <div class="relative flex items-center justify-center">
              <div class="w-64 h-64 md:w-80 md:h-80 rounded-full border-4 border-cyan-500/30 flex items-center justify-center bg-radial from-cyan-950/40 to-transparent shadow-[0_0_70px_rgba(0,229,255,0.25)] animate-pulse">
                <span id="stage-countdown-num" class="font-mono text-8xl md:text-9xl font-black text-cyan-300 tracking-tighter">
                  ${stageRemaining > 0 ? stageRemaining : 'GO!'}
                </span>
              </div>
            </div>

            <div class="flex flex-col gap-2 max-w-md">
              <h2 class="font-mono text-2xl font-bold text-white tracking-wide">
                Teams, Eyes on This Screen!
              </h2>
              <p class="font-mono text-xs text-neutral-400 leading-relaxed">
                Question 1 prompt is loading. Team terminals are in option-selection standby mode.
              </p>
            </div>
          </div>
        ` : ''}

        <!-- ============================================================== -->
        <!-- PHASE 3: QUESTION PRESENTATION                                 -->
        <!-- ============================================================== -->
        ${currentStage === 'QUESTION' ? `
          <div class="w-full flex flex-col gap-6 animate-fade-in">
            
            <!-- Question Header HUD -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0f1420] p-5 rounded-2xl border border-cyan-500/30 shadow-lg">
              <div class="flex items-center gap-3">
                <span class="font-mono text-sm px-3 py-1 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold uppercase tracking-wider">
                  QUESTION ${qIdx + 1} OF ${totalQuestions}
                </span>
                <span class="font-mono text-xs text-neutral-400 uppercase tracking-wider">
                  ${esc(currentQ?.category || 'General Robotics')}
                </span>
              </div>

              <!-- Question Timer Countdown Readout -->
              <div class="flex items-center gap-3 bg-[#07090e] px-5 py-2.5 rounded-xl border border-cyan-500/40 shadow-[0_0_20px_rgba(0,229,255,0.15)]">
                ${icon('timer', 'text-cyan-400 text-[26px]')}
                <div class="flex flex-col">
                  <span class="font-mono text-[10px] uppercase text-neutral-400 font-bold">Time Allotted</span>
                  <span id="stage-q-timer-display" class="font-mono text-3xl font-extrabold ${stageRemaining <= 5 ? 'text-rose-400 animate-pulse' : 'text-cyan-300'}">
                    ${stageRemaining}s
                  </span>
                </div>
              </div>
            </div>

            <!-- Big Screen Question Prompt -->
            <div class="bg-[#0f1420] p-8 md:p-10 rounded-2xl border border-cyan-500/30 shadow-[0_0_40px_rgba(0,229,255,0.08)]">
              <p class="font-mono text-2xl md:text-3xl text-white font-bold leading-relaxed tracking-tight">
                ${esc(currentQ?.questionText || 'Question prompt text is loading...')}
              </p>
            </div>

            <!-- Options Grid (A, B, C, D) -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              ${(currentQ?.options || []).map(opt => `
                <div class="bg-[#0f1420] hover:bg-[#141b2b] p-5 rounded-xl border border-neutral-800 transition-all flex items-start gap-4 shadow-md">
                  <div class="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/40 flex items-center justify-center font-mono text-lg font-black text-cyan-400 shrink-0">
                    ${esc(opt.optionKey)}
                  </div>
                  <span class="font-mono text-base md:text-lg text-neutral-200 leading-snug pt-1.5 flex-1">
                    ${esc(opt.optionText)}
                  </span>
                </div>
              `).join('')}
            </div>

            <!-- Anti-Cheat Status Notice -->
            <div class="text-center font-mono text-xs text-neutral-500 pt-2 flex items-center justify-center gap-2">
              ${icon('lock', 'text-[16px] text-cyan-500')}
              <span>Contestants: Answers must be submitted via team leader terminals before timer reaches 0.</span>
            </div>
          </div>
        ` : ''}

        <!-- ============================================================== -->
        <!-- PHASE 4: INTERIM LEADERBOARD (BETWEEN QUESTIONS)               -->
        <!-- ============================================================== -->
        ${currentStage === 'LEADERBOARD' ? `
          <div class="w-full flex flex-col gap-6 animate-fade-in max-w-4xl">
            
            <div class="bg-[#0f1420] p-6 rounded-2xl border border-emerald-500/30 shadow-[0_0_35px_rgba(16,185,129,0.12)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div class="flex flex-col gap-1">
                <div class="flex items-center gap-2">
                  <span class="font-mono text-xs px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold uppercase tracking-wider">
                    QUESTION ${qIdx + 1} CONCLUDED
                  </span>
                  <span class="font-mono text-xs text-neutral-400">• PROVISIONAL STANDINGS</span>
                </div>
                <h2 class="font-mono text-2xl font-extrabold text-white">
                  Live Interim Leaderboard
                </h2>
                <p class="font-mono text-xs text-neutral-400">
                  Based on validated submissions so far. Official final awards will be revealed at round conclusion.
                </p>
              </div>

              <!-- Next Question Countdown Readout -->
              <div class="bg-[#07090e] px-5 py-3 rounded-xl border border-emerald-500/40 flex items-center gap-3 shrink-0">
                ${icon('hourglass_top', 'text-emerald-400 text-[24px]')}
                <div class="flex flex-col">
                  <span class="font-mono text-[10px] uppercase text-neutral-400 font-bold">
                    ${isLastQuestion ? 'Final Results In' : `Question ${qIdx + 2} In`}
                  </span>
                  <span id="stage-intermission-timer" class="font-mono text-2xl font-black text-emerald-300">
                    ${stageRemaining}s
                  </span>
                </div>
              </div>
            </div>

            <!-- Interim Standings Table -->
            <div class="bg-[#0f1420] rounded-2xl border border-neutral-800 overflow-hidden shadow-xl">
              <div class="grid grid-cols-12 px-6 py-3 bg-[#151c2c] border-b border-neutral-800 font-mono text-xs uppercase text-neutral-400 font-bold tracking-wider">
                <span class="col-span-2">Rank</span>
                <span class="col-span-5">Team Node</span>
                <span class="col-span-3 text-center">Cumulative Points</span>
                <span class="col-span-2 text-right">Time</span>
              </div>

              <div class="divide-y divide-neutral-800/60 font-mono text-sm max-h-[380px] overflow-y-auto">
                ${rankedAttempts.length > 0 ? rankedAttempts.map((att, idx) => {
                  const isDebarred = Boolean(att.debarred);
                  const displayScore = att.score ?? att.quizScore ?? 0;
                  return `
                  <div class="grid grid-cols-12 px-6 py-3.5 items-center hover:bg-[#141b2b] transition-colors ${
                    isDebarred ? 'bg-rose-500/[0.04] opacity-80' : (idx < 3 ? 'bg-cyan-500/[0.03]' : '')
                  }">
                    <div class="col-span-2 flex items-center gap-2">
                      <span class="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                        isDebarred ? 'bg-neutral-800 text-rose-400 border border-rose-500/30' :
                        idx === 0 ? 'bg-amber-400 text-black shadow-[0_0_10px_rgba(251,191,36,0.5)]' :
                        idx === 1 ? 'bg-slate-300 text-black' :
                        idx === 2 ? 'bg-amber-700 text-white' :
                        'bg-neutral-800 text-neutral-400'
                      }">
                        ${isDebarred ? '✕' : (idx + 1)}
                      </span>
                    </div>

                    <div class="col-span-5 flex items-center gap-2 truncate">
                      <span class="font-bold text-white truncate">${esc(att.teamName || att.teamId)}</span>
                      ${!isDebarred && idx === 0 ? '<span class="text-xs text-amber-400 font-bold shrink-0">★ LEADER</span>' : ''}
                      ${isDebarred ? '<span class="px-2 py-0.5 rounded text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/40 uppercase font-bold shrink-0">DEBARRED</span>' : ''}
                    </div>

                    <div class="col-span-3 text-center">
                      ${isDebarred ? `
                        <span class="font-mono text-xs text-rose-400 font-semibold line-through">${displayScore} pts</span>
                      ` : `
                        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 font-extrabold text-sm shadow-[0_0_12px_rgba(16,185,129,0.2)]">
                          <span>${displayScore}</span>
                          <span class="text-[10px] text-emerald-400 uppercase font-bold">pts</span>
                        </span>
                      `}
                    </div>

                    <div class="col-span-2 text-right text-xs text-neutral-400">
                      ${att.timeTakenSeconds ?? att.timeTaken ?? 0}s
                    </div>
                  </div>
                `}).join('') : `
                  <div class="p-8 text-center text-neutral-500 font-mono text-xs">
                    Recording live attempts... Standings will refresh dynamically.
                  </div>
                `}
              </div>
            </div>

            <!-- Skip / Advance Immediately Control -->
            <div class="flex items-center justify-end gap-3 pt-2">
              <button type="button" id="stage-btn-advance-now"
                      class="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all">
                <span>${isLastQuestion ? 'Proceed to Final Results' : `Advance to Question ${qIdx + 2} Now`}</span>
                ${icon('skip_next', 'text-[18px]')}
              </button>
            </div>
          </div>
        ` : ''}

        <!-- ============================================================== -->
        <!-- PHASE 5: QUIZ CONCLUDED / FINAL REVEAL                         -->
        <!-- ============================================================== -->
        ${currentStage === 'COMPLETED' ? `
          <div class="w-full max-w-2xl bg-[#0f1420] border border-cyan-500/40 rounded-2xl p-8 md:p-10 shadow-[0_0_50px_rgba(0,229,255,0.15)] text-center flex flex-col items-center gap-6 animate-fade-in">
            <div class="w-20 h-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
              ${icon('workspace_premium', 'text-[44px]')}
            </div>

            <div class="flex flex-col gap-2">
              <span class="font-mono text-xs px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/40 uppercase font-bold tracking-widest inline-block mx-auto">
                ALL QUESTIONS CONCLUDED
              </span>
              <h1 class="font-mono text-3xl md:text-4xl font-extrabold text-white tracking-tight mt-1">
                Round Submissions Sealed
              </h1>
              <p class="text-sm text-neutral-400 font-mono max-w-lg mx-auto leading-relaxed mt-1">
                Every question cycle has completed. All contestant attempts have been evaluated.
                Proceed to the Results &amp; Finalize dashboard to audit scores and seal advancing teams.
              </p>
            </div>

            <div class="pt-2 flex flex-col sm:flex-row items-center gap-3 w-full justify-center">
              <a href="#admin/quizzes/results"
                 class="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-mono text-sm font-extrabold uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-[0_0_30px_rgba(0,229,255,0.4)] transition-all">
                ${icon('fact_check', 'text-[20px]')}
                <span>Reveal &amp; Finalize Official Results</span>
              </a>

              <button type="button" data-control="redo"
                      class="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all">
                ${icon('restart_alt', 'text-[18px]')}
                <span>Reset for Redo</span>
              </button>
            </div>
          </div>
        ` : ''}

      </main>

      <!-- Bottom Discreet Stage Toolbar (For Host Controls) -->
      <footer class="px-6 py-3 bg-[#0a0d14]/90 border-t border-neutral-800/80 flex items-center justify-between gap-4 z-40 text-xs font-mono">
        <div class="flex items-center gap-3 text-neutral-500">
          <span class="flex items-center gap-1.5">
            ${icon('keyboard', 'text-[16px]')}
            <span>Hotkeys: Space (Skip/Next), F (Fullscreen)</span>
          </span>
        </div>

        <div class="flex items-center gap-2">
          ${currentStage === 'QUESTION' ? `
            <button type="button" id="stage-btn-skip-q"
                    class="px-3.5 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-mono text-xs flex items-center gap-1.5 transition-all">
              ${icon('fast_forward', 'text-[16px] text-cyan-400')}
              <span>Skip Timer -> Show Standings</span>
            </button>
          ` : ''}

          ${['COUNTDOWN', 'QUESTION', 'LEADERBOARD'].includes(currentStage) ? `
            <button type="button" id="stage-btn-toggle-pause"
                    class="px-3.5 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-amber-300 font-mono text-xs flex items-center gap-1.5 transition-all">
              ${icon(state.isStagePaused ? 'play_arrow' : 'pause', 'text-[16px]')}
              <span>${state.isStagePaused ? 'Resume Stage' : 'Pause Stage'}</span>
            </button>
          ` : ''}
        </div>
      </footer>

    </div>
  `;
}
