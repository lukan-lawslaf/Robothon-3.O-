export const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

export const icon = (name, className = '') => `<span class="material-symbols-outlined ${className}">${name}</span>`;

export const account = () => {
  try {
    return JSON.parse(localStorage.getItem('robothon-demo-account') || 'null');
  } catch {
    return null;
  }
};

export const badge = (text, tone = 'cyan') => {
  const t = String(text).toUpperCase();
  if (t === 'LIVE' || tone === 'live') {
    return `<span class="inline-flex items-center gap-1.5 font-mono text-xs px-2.5 py-0.5 rounded bg-primary-container/20 text-primary-container border border-primary-container/40 uppercase font-bold">
      <span class="w-2 h-2 rounded-full bg-primary-container animate-pulse"></span>
      ${esc(text)}
    </span>`;
  }
  if (t === 'QUALIFIED' || t === 'FINALIZED' || tone === 'green' || tone === 'tertiary') {
    return `<span class="inline-flex items-center gap-1 font-mono text-xs px-2.5 py-0.5 rounded bg-tertiary/20 text-tertiary-fixed border border-tertiary/40 uppercase font-bold">
      ${icon('check_circle', 'text-[14px]')} ${esc(text)}
    </span>`;
  }
  if (t === 'DEBARRED') {
    return `<span class="inline-flex items-center gap-1 font-mono text-xs px-2.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 uppercase font-bold">
      ${icon('gavel', 'text-[14px]')} ${esc(text)}
    </span>`;
  }
  if (t === 'ELIMINATED' || tone === 'red' || tone === 'error') {
    return `<span class="inline-flex items-center gap-1 font-mono text-xs px-2.5 py-0.5 rounded bg-error/20 text-error border border-error/40 uppercase font-bold">
      ${icon('cancel', 'text-[14px]')} ${esc(text)}
    </span>`;
  }
  if (t === 'PAUSED' || tone === 'amber' || tone === 'warning') {
    return `<span class="inline-flex items-center gap-1 font-mono text-xs px-2.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase font-bold">
      ${icon('pause_circle', 'text-[14px]')} ${esc(text)}
    </span>`;
  }
  if (t === 'READY' || tone === 'secondary') {
    return `<span class="inline-flex items-center gap-1 font-mono text-xs px-2.5 py-0.5 rounded bg-secondary-container/30 text-secondary border border-secondary/40 uppercase font-bold">
      ${esc(text)}
    </span>`;
  }
  if (t === 'DRAFT') {
    return `<span class="inline-flex items-center gap-1 font-mono text-xs px-2.5 py-0.5 rounded bg-surface-container-highest text-outline uppercase font-bold">
      ${esc(text)}
    </span>`;
  }
  return `<span class="inline-flex items-center gap-1 font-mono text-xs px-2.5 py-0.5 rounded bg-surface-container-high text-primary uppercase font-bold">
    ${esc(text)}
  </span>`;
};

export const card = (content, className = '') => `
  <section class="bg-surface-container rounded-lg p-5 shadow-lg border border-outline-variant/30 ${className}">
    ${content}
  </section>
`;

export function shell(content, currentRoute, state) {
  const user = account();
  const isAdmin = user && ['ADMIN', 'SUPER_ADMIN'].includes(user.role);
  const quiz = state.quiz || {};
  const isConnected = state.connection === 'CONNECTED';

  const navItem = (href, label, glyph, activeRoute) => {
    const active = currentRoute === activeRoute;
    return `
      <a href="#${href}" 
         class="flex items-center justify-between gap-2.5 px-3 py-2 rounded text-sm transition-colors ${
           active
             ? 'bg-primary-container text-on-primary-container font-bold shadow-[0_0_12px_rgba(0,229,255,0.3)]'
             : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface font-medium'
         }">
        <div class="flex items-center gap-2.5">
          ${icon(glyph, active ? 'text-on-primary-container text-[20px]' : 'text-outline text-[20px]')}
          <span>${label}</span>
        </div>
      </a>
    `;
  };

  return `
    <div class="min-h-screen bg-surface flex flex-col text-on-surface">
      <!-- Fixed Left Sidebar -->
      <aside class="fixed left-0 top-0 h-full w-64 bg-surface-container-low z-50 flex flex-col justify-between py-4 border-r border-outline-variant/30 hidden lg:flex">
        <div class="flex flex-col gap-4">
          <!-- Header -->
          <div class="px-4 flex items-center justify-between">
            <div class="flex items-center gap-2 text-primary-container">
              ${icon('precision_manufacturing', 'text-[24px]')}
              <span class="font-mono text-base font-bold tracking-wider text-on-surface">ROBOTHON</span>
            </div>
            <span class="font-mono text-[11px] px-1.5 py-0.5 rounded bg-surface-container-high text-primary font-bold">QUIZ</span>
          </div>

          <!-- Navigation Links -->
          <nav class="flex flex-col gap-1 px-2">
            ${isAdmin ? `
              <div class="px-2 pt-1 pb-1">
                <span class="font-mono text-[11px] uppercase tracking-wider text-outline font-bold">Organizer Controls</span>
              </div>
              ${navItem('admin/quizzes/builder', 'Detailed Quiz Builder', 'build_circle', 'admin/quizzes/builder')}
              ${navItem('admin/quizzes/live', 'Live Mission Control', 'sensors', 'admin/quizzes/live')}
              ${navItem('admin/quizzes/stage', 'Show Live Questions (Stage)', 'slideshow', 'admin/quizzes/stage')}
              ${navItem('admin/quizzes/results', 'Results & Finalize', 'fact_check', 'admin/quizzes/results')}
              ${navItem('leaderboard', 'Leaderboard Standings', 'leaderboard', 'leaderboard')}
            ` : `
              <div class="px-2 pt-1 pb-1">
                <span class="font-mono text-[11px] uppercase tracking-wider text-outline font-bold">Contestant Terminal</span>
              </div>
              ${navItem('team/quiz', 'Quiz Waiting Room', 'hourglass_top', 'team/quiz')}
              ${['LIVE', 'PAUSED'].includes(quiz.status) ? navItem('team/quiz/live', 'Live Quiz Terminal', 'terminal', 'team/quiz/live') : ''}
              ${user?.role === 'TEAM_LEADER' && quiz.status === 'FINALIZED' ? navItem('leaderboard', 'Leaderboard', 'leaderboard', 'leaderboard') : ''}
            `}
          </nav>
        </div>

        <!-- User Profile Card -->
        <div class="px-3 flex flex-col gap-2">
          <div class="bg-surface-container p-3 rounded border border-outline-variant/30 flex flex-col gap-1">
            <div class="flex items-center justify-between">
              <span class="font-mono text-[10px] uppercase text-outline font-bold">AUTHENTICATED AS</span>
              <span class="font-mono text-[10px] px-1.5 rounded bg-surface-container-highest ${
                isAdmin ? 'text-secondary font-bold' : 'text-primary font-bold'
              }">
                ${esc(user?.role || 'GUEST')}
              </span>
            </div>
            <span class="font-mono text-xs text-on-surface font-bold truncate">
              ${esc(user?.name || 'Contestant')}
            </span>
            <span class="text-xs text-on-surface-variant truncate">
              ${esc(user?.teamName || user?.email || 'Standalone Node')}
            </span>
            <div class="pt-2 border-t border-outline-variant/20 mt-1 flex justify-between items-center">
              <a href="#login" id="nav-btn-logout" class="text-xs text-primary hover:underline flex items-center gap-1 font-mono font-medium">
                ${icon('logout', 'text-[14px]')} Sign out / Switch
              </a>
            </div>
          </div>
        </div>
      </aside>

      <!-- Main Shell Body -->
      <div class="lg:pl-64 flex flex-col flex-1">
        <!-- Top App Bar -->
        <header class="fixed top-0 left-0 lg:left-64 right-0 h-14 bg-surface-container/95 backdrop-blur z-40 border-b border-outline-variant/30 flex items-center justify-between px-4 sm:px-6">
          <div class="flex items-center gap-3">
            <div class="flex items-center gap-2">
              ${icon('precision_manufacturing', 'text-primary-container text-[22px]')}
              <span class="font-mono text-sm font-bold tracking-wider text-primary">ROBOTHON ARENA</span>
            </div>
            <span class="text-outline-variant">/</span>
            <span class="text-xs font-mono font-semibold text-on-surface uppercase truncate max-w-[200px] sm:max-w-none">
              ${esc(quiz.name || 'QUIZ COMPETITION')}
            </span>
          </div>

          <div class="flex items-center gap-3">
            <!-- Server Connection Indicator -->
            <div class="flex items-center gap-1.5 bg-surface-container-lowest px-2.5 py-1 rounded border border-outline-variant/30 font-mono text-xs">
              <span class="w-2 h-2 rounded-full ${isConnected ? 'bg-tertiary animate-pulse' : 'bg-error'}"></span>
              <span class="${isConnected ? 'text-tertiary font-bold' : 'text-error font-bold'}">
                ${isConnected ? 'SERVER LIVE' : 'CONNECTING'}
              </span>
            </div>

            <!-- Quiz Status Badge -->
            <div class="flex items-center">
              ${badge(quiz.status || 'DRAFT')}
            </div>
          </div>
        </header>

        <!-- Main Content Area -->
        <main class="flex-1 mt-14 p-4 sm:p-6 max-w-7xl w-full mx-auto">
          ${content}
        </main>
      </div>
    </div>
  `;
}
