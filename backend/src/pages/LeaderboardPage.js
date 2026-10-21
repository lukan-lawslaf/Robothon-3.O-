import { shell, card, badge, icon, account, esc } from './shared.js';

export function LeaderboardPage(state) {
  const user = account() || { teamName: 'Team Apex Mechanics', teamId: 'team-apex' };
  const quiz = state.quiz || {};
  const rows = state.leaderboard || [];
  const cutoff = quiz.qualificationCount || 40;
  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(user?.role);
  const isTeamLeader = user?.role === 'TEAM_LEADER';
  const isFinalized = quiz.status === 'FINALIZED';

  // 1. Role Authorization: Leaderboard visible to Team Leaders and Admins only
  if (!isAdmin && !isTeamLeader) {
    const restrictedContent = `
      <div class="flex flex-col gap-6 w-full max-w-3xl mx-auto my-8">
        <div class="bg-surface-container rounded-xl p-8 border border-outline-variant/30 text-center flex flex-col items-center gap-4 shadow-xl">
          <div class="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center text-amber-400 border border-amber-500/30">
            ${icon('security', 'text-[32px]')}
          </div>
          <div class="flex flex-col gap-1 items-center">
            <span class="font-mono text-xs px-2.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold uppercase tracking-wider">
              TEAM LEADER AUTHORITY REQUIRED
            </span>
            <h1 class="font-mono text-xl font-bold text-on-surface mt-2">
              Leaderboard Restricted to Team Leaders
            </h1>
            <p class="text-xs text-on-surface-variant font-mono max-w-lg mt-1 leading-relaxed">
              Official competition standings and qualification adjudications are restricted to registered Team Leaders and competition administrators.
            </p>
          </div>
          <div class="pt-4 flex items-center gap-3">
            <a href="#team/quiz" class="px-4 py-2 rounded bg-primary-container text-on-primary-container font-mono text-xs font-bold uppercase tracking-wider">
              Back to Waiting Room
            </a>
          </div>
        </div>
      </div>
    `;
    return shell(restrictedContent, 'leaderboard', state);
  }

  // 2. Lifecycle Lock: Leaderboard unlocked ONLY after results are officially FINALIZED
  if (!isAdmin && !isFinalized) {
    const lockedContent = `
      <div class="flex flex-col gap-6 w-full max-w-3xl mx-auto my-8">
        <div class="bg-surface-container rounded-xl p-8 border border-outline-variant/30 text-center flex flex-col items-center gap-4 shadow-xl">
          <div class="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center text-amber-400 border border-amber-500/30">
            ${icon('lock', 'text-[32px]')}
          </div>

          <div class="flex flex-col gap-1 items-center">
            <span class="font-mono text-xs px-2.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold uppercase tracking-wider">
              LEADERBOARD LOCKED
            </span>
            <h1 class="font-mono text-xl font-bold text-on-surface mt-2">
              Standings Released Only After Finalized Results
            </h1>
            <p class="text-xs text-on-surface-variant font-mono max-w-lg mt-1 leading-relaxed">
              To preserve competition integrity, the official leaderboard is visible to Team Leaders only after the competition administrator officially audits and finalizes the round results.
            </p>
          </div>

          <div class="bg-surface-container-lowest p-4 rounded border border-outline-variant/20 font-mono text-xs flex flex-col sm:flex-row gap-4 items-center justify-between w-full max-w-md mt-2">
            <div>
              <span class="text-outline block">Competition Round:</span>
              <span class="text-primary font-bold text-sm">${esc(quiz.name || 'Stage 1: Elimination Round')}</span>
            </div>
            <div>
              <span class="text-outline block">Current Status:</span>
              ${badge(quiz.status || 'DRAFT')}
            </div>
          </div>

          <div class="pt-4 flex items-center gap-3">
            <a href="#team/quiz" class="px-4 py-2 rounded bg-surface-container-high text-on-surface font-mono text-xs font-bold uppercase hover:bg-surface-container-highest">
              Back to Waiting Room
            </a>
            ${isAdmin ? `
              <a href="#admin/quizzes/live" class="px-4 py-2 rounded bg-primary-container text-on-primary-container font-mono text-xs font-bold uppercase">
                Organizer Live Control
              </a>
            ` : ''}
          </div>
        </div>
      </div>
    `;
    return shell(lockedContent, 'leaderboard', state);
  }

  // Find current user's team row if ended
  const myRow = rows.find(r => r.teamId === user?.teamId) || null;
  const myRank = myRow ? myRow.rank : null;
  const myScore = myRow ? myRow.score : '—';
  const myStatus = myRow?.qualificationStatus || (myRank && myRank <= cutoff ? 'QUALIFIED' : 'PENDING');

  const content = `
    <div class="flex flex-col gap-5 w-full max-w-6xl mx-auto">
      
      <!-- Leaderboard Header Banner -->
      <div class="bg-surface-container rounded-xl p-5 border border-outline-variant/30 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md">
        <div class="flex flex-col gap-1">
          <div class="flex items-center gap-2">
            <h1 class="font-mono text-lg font-bold text-on-surface">
              Official Competition Leaderboard
            </h1>
            ${badge(quiz.status, 'green')}
          </div>
          <p class="text-xs text-on-surface-variant font-mono">
            ${esc(quiz.name || 'Round 1')} — Top ${cutoff} teams qualified for subsequent stage.
          </p>
        </div>

        <div class="flex items-center gap-2 font-mono text-xs">
          <button type="button" id="btn-toggle-fullscreen"
                  class="px-3 py-1.5 rounded bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-bold flex items-center gap-1 border border-outline-variant/30">
            ${icon('fullscreen', 'text-[14px]')} Fullscreen
          </button>
        </div>
      </div>

      ${myRow ? `
        <!-- Active Team Result Bar -->
        <div class="bg-surface-container-high rounded-xl p-4 border border-primary-container/40 flex items-center justify-between shadow-sm">
          <div class="flex items-center gap-3">
            <span class="w-8 h-8 rounded-full bg-primary-container text-on-primary-container font-mono font-bold flex items-center justify-center text-xs">
              #${myRank || '—'}
            </span>
            <div class="flex flex-col">
              <span class="font-mono text-xs font-bold text-on-surface">${esc(user.teamName || 'Your Team')}</span>
              <span class="font-mono text-[11px] text-outline">Score: <b class="text-tertiary">${myScore} pts</b></span>
            </div>
          </div>
          <div>
            ${badge(myStatus, myStatus === 'QUALIFIED' ? 'tertiary' : myStatus === 'ELIMINATED' ? 'error' : 'secondary')}
          </div>
        </div>
      ` : ''}

      <!-- Search & Filters -->
      <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div class="relative flex-1 max-w-md">
          <span class="absolute left-3 top-2.5 text-outline text-[18px]">
            ${icon('search', 'text-[18px]')}
          </span>
          <label class="sr-only" for="leaderboard-search">Search Team</label>
          <input type="text" id="leaderboard-search"
                 class="w-full bg-surface-container text-on-surface pl-9 pr-4 py-2 rounded text-xs font-mono border border-outline-variant/30 focus:border-primary-container outline-none" />
        </div>

        <div class="flex items-center gap-2 font-mono text-xs" id="filter-group">
          <button type="button" class="filter-btn px-3 py-1.5 rounded font-bold uppercase bg-primary-container text-on-primary-container" data-filter="all">All Teams (${rows.length})</button>
          <button type="button" class="filter-btn px-3 py-1.5 rounded font-bold uppercase bg-surface-container text-on-surface-variant hover:text-on-surface" data-filter="qualified">Top ${cutoff} Qualified</button>
        </div>
      </div>

      <!-- Leaderboard Standings Table -->
      <div class="w-full overflow-x-auto bg-surface-container rounded-xl border border-outline-variant/30 shadow-md">
        <table class="w-full text-left border-collapse" id="leaderboard-table">
          <thead>
            <tr class="bg-surface-container-high text-outline font-mono text-xs uppercase border-b border-outline-variant/30">
              <th class="py-3 px-4 w-16 text-center">Rank</th>
              <th class="py-3 px-4">Team Identifier</th>
              <th class="py-3 px-4 text-right">Time Taken</th>
              <th class="py-3 px-4 text-right">Score</th>
              <th class="py-3 px-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody class="font-mono text-xs divide-y divide-outline-variant/15 text-on-surface" id="table-body">
            ${rows.map((r, i) => {
              const isDebarred = Boolean(r.debarred);
              const isQualified = !isDebarred && (r.qualificationStatus === 'QUALIFIED' || (i < cutoff && r.qualificationStatus !== 'ELIMINATED'));
              const isMine = r.teamId === user?.teamId;
              const timeStr = r.timeTaken !== undefined && r.timeTaken !== null 
                ? `${Math.floor(r.timeTaken / 60)}m ${String(r.timeTaken % 60).padStart(2, '0')}s` 
                : '—';

              return `
                <tr data-team="${esc(r.teamName || r.teamId)}" data-qualified="${isQualified}"
                    class="transition-colors ${
                      isDebarred ? 'bg-rose-500/[0.04]' : (isMine ? 'bg-primary-container/10 font-bold' : 'hover:bg-surface-container-high')
                    }">
                  <td class="py-3 px-4 text-center">
                    <span class="inline-block px-2 py-0.5 rounded ${
                      isDebarred ? 'text-rose-400 font-bold' : (i < 3 ? 'bg-primary-container/20 text-primary font-bold' : 'text-outline')
                    }">
                      ${isDebarred ? '—' : (r.rank || (i + 1))}
                    </span>
                  </td>
                  <td class="py-3 px-4">
                    <div class="flex items-center gap-2">
                      <span class="font-bold text-on-surface">${esc(r.teamName || r.teamId)}</span>
                      <span class="text-outline text-[10px]">${esc(r.teamId)}</span>
                      ${isDebarred ? '<span class="px-1.5 py-0.2 rounded text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase font-bold">DEBARRED</span>' : ''}
                    </div>
                  </td>
                  <td class="py-3 px-4 text-right text-outline">${timeStr}</td>
                  <td class="py-3 px-4 text-right font-bold ${isDebarred ? 'text-neutral-500 line-through' : 'text-tertiary'}">${r.score ?? 0} pts</td>
                  <td class="py-3 px-4 text-center">
                    ${badge(r.qualificationStatus || (isQualified ? 'QUALIFIED' : 'ELIMINATED'))}
                  </td>
                </tr>
              `;
            }).join('')}

            ${rows.length === 0 ? `
              <tr>
                <td colspan="5" class="py-8 text-center text-outline font-mono text-xs">
                  No submissions recorded yet for this round.
                </td>
              </tr>
            ` : ''}
          </tbody>
        </table>
      </div>

    </div>
  `;

  return shell(content, 'leaderboard', state);
}
