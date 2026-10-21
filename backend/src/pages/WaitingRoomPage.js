import { shell, card, badge, icon, account, esc } from './shared.js';

export function WaitingRoomPage(state) {
  const quiz = state.quiz || {};
  const user = account() || { teamName: 'Team Apex Mechanics', teamId: 'team-apex', name: 'Arjun Mehta', role: 'TEAM_LEADER' };
  const isLive = quiz.status === 'LIVE';
  const isReady = ['READY', 'LIVE', 'PAUSED', 'RESULTS', 'FINALIZED'].includes(quiz.status);

  const durationMins = quiz.durationSeconds ? Math.round(quiz.durationSeconds / 60) : 30;
  const cutoff = quiz.qualificationCount || 40;
  const correctPts = quiz.pointsPerCorrect ?? 4;

  const content = `
    <div class="flex flex-col gap-6 w-full max-w-4xl mx-auto">
      
      <!-- Interactive Modal: Prompt to Open Live Quiz Terminal -->
      <div id="quiz-launch-prompt-modal" class="${state.showLaunchPrompt ? 'flex' : 'hidden'} fixed inset-0 z-50 items-center justify-center p-4 bg-scrim/80 backdrop-blur-md">
        <div class="bg-surface-container-high rounded-2xl p-6 border-2 border-primary-container max-w-lg w-full flex flex-col items-center text-center gap-4 shadow-[0_0_40px_rgba(0,229,255,0.4)]">
          <div class="w-16 h-16 rounded-full bg-primary-container/20 border-2 border-primary-container flex items-center justify-center text-primary-container animate-pulse">
            ${icon('sensors', 'text-[36px]')}
          </div>
          <div class="flex flex-col gap-1">
            <span class="text-xs font-mono font-bold uppercase text-primary-container tracking-widest">URGENT ARENA BROADCAST</span>
            <h2 class="text-xl font-headline-lg font-bold text-on-surface tracking-wide">THE QUIZ IS NOW LIVE!</h2>
            <p class="text-xs text-on-surface-variant font-mono leading-relaxed">
              The competition administrator has initiated the live countdown timer. All teams are prompted to open the live quiz terminal immediately.
            </p>
          </div>
          <div id="auto-launch-counter" class="text-xs font-mono text-tertiary font-bold">
            Entering terminal automatically...
          </div>
          <a href="#team/quiz/live" id="btn-enter-terminal-now"
             class="w-full py-3.5 px-6 rounded-xl font-mono text-sm font-bold uppercase tracking-wider bg-primary-container text-on-primary-container hover:brightness-110 shadow-[0_0_20px_rgba(0,229,255,0.5)] transition-all flex items-center justify-center gap-2">
            <span>Enter Live Quiz Terminal Now</span>
            ${icon('arrow_forward', 'text-[20px]')}
          </a>
        </div>
      </div>

      <!-- Round Selector in Waiting Room -->
      <div class="flex items-center justify-between bg-surface-container rounded-xl p-3 border border-outline-variant/30 flex-wrap gap-2">
        <div class="flex items-center gap-2">
          <span class="text-xs font-mono text-outline uppercase font-bold px-1">Active Round:</span>
          <div class="flex items-center gap-1.5 bg-surface-container-lowest p-1 rounded border border-outline-variant/20">
            <button type="button" data-switch-quiz="quiz-1"
                    class="px-3.5 py-1.5 rounded font-mono text-xs font-bold transition-all flex items-center gap-2 ${
                      quiz.id === 'quiz-1'
                        ? 'bg-primary-container text-on-primary-container shadow-sm'
                        : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                    }">
              <span>Quiz 1: Elimination</span>
              <span class="text-[10px] px-1 py-0.2 rounded font-normal ${
                state.quizzes?.find(q => q.id === 'quiz-1')?.status === 'READY' ? 'bg-tertiary/20 text-tertiary font-bold' :
                state.quizzes?.find(q => q.id === 'quiz-1')?.status === 'LIVE' ? 'bg-emerald-500/20 text-emerald-300 font-bold' :
                'bg-outline/10 text-outline'
              }">${state.quizzes?.find(q => q.id === 'quiz-1')?.status || 'DRAFT'}</span>
            </button>

            <button type="button" data-switch-quiz="quiz-2"
                    class="px-3.5 py-1.5 rounded font-mono text-xs font-bold transition-all flex items-center gap-2 ${
                      quiz.id === 'quiz-2'
                        ? 'bg-primary-container text-on-primary-container shadow-sm'
                        : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                    }">
              <span>Quiz 2: Component Bonus</span>
              <span class="text-[10px] px-1 py-0.2 rounded font-normal ${
                state.quizzes?.find(q => q.id === 'quiz-2')?.status === 'READY' ? 'bg-tertiary/20 text-tertiary font-bold' :
                state.quizzes?.find(q => q.id === 'quiz-2')?.status === 'LIVE' ? 'bg-emerald-500/20 text-emerald-300 font-bold' :
                'bg-outline/10 text-outline'
              }">${state.quizzes?.find(q => q.id === 'quiz-2')?.status || 'DRAFT'}</span>
            </button>
          </div>
        </div>

        <div class="flex items-center gap-2 font-mono text-xs text-outline">
          ${icon('sync', 'text-[14px] text-primary animate-spin')}
          <span>Live Telemetry Active</span>
        </div>
      </div>

      <!-- Real-time Host Ping Alerts -->
      ${isLive ? `
        <div id="live-quiz-alert-card" class="p-4 bg-emerald-500/15 border-2 border-emerald-400/60 rounded-xl flex items-center justify-between gap-4 shadow-[0_0_25px_rgba(16,185,129,0.25)] animate-pulse">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              ${icon('sensors', 'text-[24px]')}
            </div>
            <div class="flex flex-col">
              <span class="text-xs font-mono font-bold uppercase text-emerald-400 tracking-wider">HOST BROADCAST PING: ROUND IS LIVE</span>
              <span class="text-xs text-on-surface font-mono">The live countdown timer is active. Open the terminal to record your team's answers.</span>
            </div>
          </div>
          <a href="#team/quiz/live" class="px-5 py-2.5 rounded-lg bg-emerald-400 text-surface font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:brightness-110 shadow-md shrink-0">
            <span>Enter Terminal</span>
            ${icon('arrow_forward', 'text-[16px]')}
          </a>
        </div>
      ` : (isReady ? `
        <div id="ready-quiz-alert-card" class="p-3.5 bg-tertiary/15 border border-tertiary/40 rounded-xl flex items-center justify-between gap-3 shadow-[0_0_15px_rgba(0,255,178,0.2)]">
          <div class="flex items-center gap-2.5">
            <span class="w-3 h-3 rounded-full bg-tertiary animate-ping"></span>
            <span class="text-xs font-mono font-bold text-tertiary uppercase">HOST BROADCAST PING:</span>
            <span class="text-xs text-on-surface font-mono">Quiz marked READY. Official parameters and rules unlocked below.</span>
          </div>
          <span class="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-tertiary/20 text-tertiary uppercase">Awaiting Start Signal</span>
        </div>
      ` : '')}

      <!-- Status Card -->
      <div class="bg-surface-container rounded-xl p-6 border border-outline-variant/30 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded bg-surface-container-high flex items-center justify-center text-primary-container shrink-0 border border-outline-variant/30">
            ${icon(isLive ? 'sensors' : (isReady ? 'verified' : 'hourglass_top'), 'text-[28px]')}
          </div>
          <div class="flex flex-col gap-1">
            <div class="flex items-center gap-2">
              <span class="font-mono text-sm font-bold text-on-surface uppercase tracking-wider">
                ${esc(quiz.name || 'Robothon Competition Quiz')}
              </span>
              ${badge(quiz.status || 'DRAFT')}
            </div>
            <h1 class="text-base font-semibold text-on-surface">
              ${isLive ? 'Round is Live! The competition is active.' : (
                isReady ? 'Quiz is READY! Awaiting Super Admin start broadcast.' : 'Waiting for Organizer to configure and mark quiz READY.'
              )}
            </h1>
          </div>
        </div>

        <div>
          ${isLive ? `
            <a href="#team/quiz/live" class="px-5 py-2.5 rounded bg-primary-container text-on-primary-container font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:brightness-110 shadow-[0_0_12px_rgba(0,229,255,0.4)]">
              <span>Enter Live Quiz Terminal</span>
              ${icon('arrow_forward', 'text-[18px]')}
            </a>
          ` : (
            isReady ? `
              <div class="flex items-center gap-2 font-mono text-xs text-tertiary bg-surface-container-lowest px-3 py-2 rounded border border-tertiary/30">
                <span class="w-2 h-2 rounded-full bg-tertiary animate-pulse"></span>
                <span>Standing by for Launch Broadcast</span>
              </div>
            ` : `
              <div class="flex items-center gap-2 font-mono text-xs text-outline bg-surface-container-lowest px-3 py-2 rounded border border-outline-variant/20">
                <span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                <span>Awaiting Ready State</span>
              </div>
            `
          )}
        </div>
      </div>

      <!-- Team Registration Verification Card -->
      <div class="bg-surface-container rounded-xl p-5 border border-outline-variant/30 flex flex-col gap-3">
        <span class="font-mono text-xs uppercase font-bold text-outline">Verified Team Credentials</span>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs bg-surface-container-lowest p-3.5 rounded border border-outline-variant/20">
          <div>
            <span class="text-outline block">Team Name:</span>
            <span class="text-on-surface font-bold text-sm">${esc(user.teamName || 'Team Apex Mechanics')}</span>
          </div>
          <div>
            <span class="text-outline block">Leader / Member:</span>
            <span class="text-primary font-bold text-sm">${esc(user.name || 'Contestant')}</span>
          </div>
          <div>
            <span class="text-outline block">Role Authority:</span>
            <span class="text-tertiary font-bold text-sm">${esc(user.role || 'TEAM_LEADER')}</span>
          </div>
        </div>
      </div>

      <!-- Quiz Instructions & Rules: ONLY DISPLAYED WHEN MARKED READY -->
      ${isReady ? `
        <div class="bg-surface-container rounded-xl p-5 border border-outline-variant/30 flex flex-col gap-4 shadow-md">
          <div class="flex items-center justify-between pb-2 border-b border-outline-variant/20">
            <span class="font-mono text-xs uppercase font-bold text-on-surface">Quiz Instructions &amp; Rules</span>
            <span class="text-xs font-mono font-bold text-tertiary px-2 py-0.5 rounded bg-tertiary/10 border border-tertiary/20">STATUS: READY</span>
          </div>
          
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
            <div class="bg-surface-container-lowest p-3 rounded border border-outline-variant/20 flex flex-col gap-1">
              <span class="text-outline">Duration</span>
              <span class="text-primary font-bold text-sm">${durationMins} Minutes</span>
            </div>
            <div class="bg-surface-container-lowest p-3 rounded border border-outline-variant/20 flex flex-col gap-1">
              <span class="text-outline">Correct Answer</span>
              <span class="text-tertiary font-bold text-sm">+${correctPts} Points</span>
            </div>
            <div class="bg-surface-container-lowest p-3 rounded border border-outline-variant/20 flex flex-col gap-1">
              <span class="text-outline">Incorrect Answer</span>
              <span class="text-error font-bold text-sm">-0 Points</span>
            </div>
            <div class="bg-surface-container-lowest p-3 rounded border border-outline-variant/20 flex flex-col gap-1">
              <span class="text-outline">Advancement Cutoff</span>
              <span class="text-secondary font-bold text-sm">Top ${cutoff} Teams</span>
            </div>
          </div>

          <ul class="text-xs text-on-surface-variant flex flex-col gap-2 font-mono list-disc pl-5 leading-relaxed pt-2 border-t border-outline-variant/20">
            <li>Only the registered <b>Team Leader</b> can record and submit answers on behalf of the team.</li>
            <li>The countdown timer is calculated server-authoritatively from the host broadcast start timestamp.</li>
            <li>Answers are autosaved continuously to the competition database.</li>
            <li>When time expires, all active attempts are automatically evaluated and submitted.</li>
            <li>The official Leaderboard will be released to Team Leaders after the host finalizes round results.</li>
          </ul>
        </div>
      ` : `
        <!-- Locked Rules Notice when Quiz is in DRAFT -->
        <div class="bg-surface-container rounded-xl p-6 border border-outline-variant/30 flex flex-col items-center justify-center text-center gap-3">
          <div class="w-10 h-10 rounded-full bg-surface-container-lowest border border-outline-variant/30 flex items-center justify-center text-outline">
            ${icon('lock_clock', 'text-[22px]')}
          </div>
          <div class="flex flex-col gap-1">
            <h3 class="font-mono text-sm font-bold uppercase text-on-surface">Quiz Instructions &amp; Rules Locked</h3>
            <p class="text-xs text-on-surface-variant font-mono max-w-md leading-relaxed">
              This quiz round is currently in preparation by administrators. Instructions, duration (${durationMins} mins), and scoring rules (+${correctPts} pts / -0 pts) will be displayed once the quiz is marked READY by organizers.
            </p>
          </div>
          <div class="flex items-center gap-2 font-mono text-[11px] text-outline bg-surface-container-lowest px-3 py-1.5 rounded border border-outline-variant/20">
            <span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            <span>Awaiting Admin to Mark Quiz READY</span>
          </div>
        </div>
      `}

    </div>
  `;

  return shell(content, 'team/quiz', state);
}
