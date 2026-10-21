import { shell, card, badge, icon, esc } from '../shared.js';

export function ResultsPage(state) {
  const quiz = state.quiz || {};
  const rows = state.leaderboard || [];
  const cutoff = quiz.qualificationCount || 50;
  const isFinalized = quiz.status === 'FINALIZED';

  const content = `
    <div class="flex flex-col gap-space-lg w-full max-w-7xl mx-auto">
      
      <!-- Results Audit Header Banner -->
      <section class="p-space-lg bg-surface-container rounded-xl shadow-xl border border-outline-variant/30 flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
        <div class="flex flex-col gap-space-xs">
          <div class="flex items-center gap-space-sm flex-wrap">
            <span class="font-label-badge text-label-badge uppercase px-2 py-0.5 rounded bg-surface-container-high text-primary font-bold">
              STAGE ADJUDICATION // AUDIT
            </span>
            ${badge(quiz.status || 'RESULTS', isFinalized ? 'tertiary' : 'amber')}
            <span class="font-label-code text-label-code text-outline uppercase">
              TIE_BREAKER: ${esc(quiz.tieBreaker || 'TIME_TAKEN')}
            </span>
          </div>

          <h1 class="font-headline-lg text-headline-lg font-bold text-on-surface tracking-tight">
            Results & Qualification Finalizer
          </h1>
          <p class="font-body-sm text-body-sm text-on-surface-variant max-w-2xl">
            Review deterministic participant rankings, evaluate cutoff thresholds, and finalize official advancement records before committing to the global Robothon tally.
          </p>
        </div>

        <div>
          ${!isFinalized ? `
            <button type="button" id="btn-open-finalize-modal"
                    class="px-space-lg py-2.5 rounded bg-tertiary-container hover:brightness-110 text-on-tertiary-container font-headline-sm text-body-md font-bold uppercase tracking-wider flex items-center gap-2 shadow-[0_0_14px_rgba(91,233,173,0.3)]">
              ${icon('verified', 'text-[20px]')}
              <span>Finalize Qualification</span>
            </button>
          ` : `
            <span class="inline-flex items-center gap-2 font-label-badge text-label-badge px-space-md py-2 rounded bg-tertiary/20 text-tertiary-fixed font-bold border border-tertiary/40">
              ${icon('lock', 'text-[16px]')} QUALIFICATION PERMANENTLY FINALIZED
            </span>
          `}
        </div>
      </section>

      <!-- Qualification Cutoff Readout Metrics -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-space-md">
        <div class="bg-surface-container-low p-space-md rounded-lg border border-outline-variant/30 flex flex-col gap-1">
          <span class="font-label-badge text-label-badge text-outline uppercase font-bold">TOTAL PARTICIPANTS</span>
          <span class="font-label-metric text-label-metric text-on-surface font-bold">${rows.length}</span>
          <span class="font-body-sm text-body-sm text-outline">Authoritative evaluated attempts</span>
        </div>

        <div class="bg-surface-container-low p-space-md rounded-lg border border-tertiary/30 flex flex-col gap-1">
          <span class="font-label-badge text-label-badge text-tertiary uppercase font-bold">QUALIFYING SLOTS</span>
          <span class="font-label-metric text-label-metric text-tertiary font-bold">Top ${cutoff}</span>
          <span class="font-body-sm text-body-sm text-outline">Advance to Stage 2 Boat Trials</span>
        </div>

        <div class="bg-surface-container-low p-space-md rounded-lg border border-error/30 flex flex-col gap-1">
          <span class="font-label-badge text-label-badge text-error uppercase font-bold">ELIMINATION CUTOFF</span>
          <span class="font-label-metric text-label-metric text-error font-bold">Rank ${cutoff + 1}+</span>
          <span class="font-body-sm text-body-sm text-outline">Eliminated from championship track</span>
        </div>

        <div class="bg-surface-container-low p-space-md rounded-lg border border-outline-variant/30 flex flex-col gap-1">
          <span class="font-label-badge text-label-badge text-outline uppercase font-bold">ADJUDICATION STATUS</span>
          <span class="font-label-metric text-label-metric text-primary font-bold">
            ${isFinalized ? 'COMMITTED' : 'PENDING AUDIT'}
          </span>
          <span class="font-body-sm text-body-sm text-outline">Authoritative server state</span>
        </div>
      </div>

      <!-- Ranked Adjudication Table -->
      <section class="flex flex-col bg-surface-container rounded-xl shadow-md overflow-hidden border border-outline-variant/30">
        <div class="p-space-md bg-surface-container-high flex items-center justify-between border-b border-outline-variant/30">
          <span class="font-label-badge text-label-badge uppercase tracking-wider text-outline font-bold">
            PRE-FINALIZATION AUDIT TABLE (${rows.length} ENTRIES)
          </span>
          <span class="font-label-code text-body-sm text-primary">DETERMINISTIC RANK ENGINE</span>
        </div>

        <div class="w-full overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-surface-container text-outline font-label-badge text-label-badge uppercase border-b border-outline-variant/20">
                <th class="py-3 px-4 w-16 text-center">Rank</th>
                <th class="py-3 px-4">Team Designation</th>
                <th class="py-3 px-4 text-right">Points / Score</th>
                <th class="py-3 px-4 text-right">Time Taken</th>
                <th class="py-3 px-4 text-center">Status</th>
                <th class="py-3 px-4 text-center">Audit Qualification State</th>
                <th class="py-3 px-4 text-center">Adjudication Actions</th>
              </tr>
            </thead>
            <tbody class="font-body-md text-body-md text-on-surface divide-y divide-outline-variant/15">
              ${rows.map((row, idx) => {
                const isDebarred = Boolean(row.debarred);
                const isQualifying = !isDebarred && idx < cutoff;
                const statusBadge = isDebarred
                  ? '<span class="font-label-badge text-label-badge px-space-xs py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold uppercase">DEBARRED</span>'
                  : (isFinalized
                      ? (row.qualificationStatus === 'QUALIFIED'
                          ? '<span class="font-label-badge text-label-badge px-space-xs py-0.5 rounded bg-tertiary-fixed text-on-tertiary-fixed font-bold">QUALIFIED</span>'
                          : '<span class="font-label-badge text-label-badge px-space-xs py-0.5 rounded bg-error/20 text-error font-bold">ELIMINATED</span>')
                      : (isQualifying
                          ? '<span class="font-label-badge text-label-badge px-space-xs py-0.5 rounded bg-tertiary/20 text-tertiary-fixed font-bold">PROJECTED QUALIFIED</span>'
                          : '<span class="font-label-badge text-label-badge px-space-xs py-0.5 rounded bg-error/15 text-error font-bold">PROJECTED ELIMINATED</span>'));

                const timeStr = row.timeTaken !== undefined && row.timeTaken !== null
                  ? `${Math.floor(row.timeTaken / 60)}m ${String(row.timeTaken % 60).padStart(2, '0')}s`
                  : '—';

                return `
                  <tr class="transition-colors ${
                    isDebarred ? 'bg-rose-500/[0.04]' : 'bg-surface-container-low hover:bg-surface-container'
                  } ${idx === cutoff - 1 && !isDebarred ? 'border-b-2 border-b-primary-container' : ''}">
                    <td class="py-3 px-4 text-center font-label-code text-label-code font-bold ${isDebarred ? 'text-rose-400' : 'text-primary'}">
                      ${isDebarred ? '—' : (row.rank ? String(row.rank).padStart(2, '0') : idx + 1)}
                    </td>

                    <td class="py-3 px-4">
                      <div class="flex items-center gap-space-xs flex-wrap">
                        <span class="font-headline-sm text-body-md font-bold text-on-surface">
                          ${esc(row.teamName || row.teamId)}
                        </span>
                        <span class="font-label-code text-body-sm text-outline">
                          #${esc(row.teamId)}
                        </span>
                        ${isDebarred ? `
                          <span class="px-2 py-0.5 rounded text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/40 uppercase font-bold">
                            DEBARRED
                          </span>
                        ` : ''}
                      </div>
                      ${row.debarReason ? `
                        <span class="text-[11px] font-mono text-rose-400 block mt-0.5">Infraction: ${esc(row.debarReason)}</span>
                      ` : ''}
                    </td>

                    <td class="py-3 px-4 text-right font-label-code font-bold">
                      <div class="flex flex-col items-end">
                        <span class="text-label-metric ${isDebarred ? 'line-through text-neutral-500' : 'text-on-surface'}">
                          ${row.score ?? '—'}
                        </span>
                        ${row.manualAdjustment ? `
                          <span class="text-[10px] text-amber-400 font-mono">
                            Override: ${row.manualAdjustment > 0 ? '+' : ''}${row.manualAdjustment}
                          </span>
                        ` : ''}
                      </div>
                    </td>

                    <td class="py-3 px-4 text-right font-label-code text-body-sm text-on-surface-variant">
                      ${timeStr}
                    </td>

                    <td class="py-3 px-4 text-center">
                      <span class="font-label-badge text-label-badge uppercase text-outline">
                        ${esc(row.status || 'EVALUATED')}
                      </span>
                    </td>

                    <td class="py-3 px-4 text-center">
                      ${statusBadge}
                    </td>

                    <td class="py-3 px-4 text-center">
                      <div class="flex items-center justify-center gap-2">
                        <button type="button"
                                data-edit-score="${esc(row.teamId)}"
                                data-team-name="${esc(row.teamName || row.teamId)}"
                                data-current-score="${row.score ?? 0}"
                                class="px-2.5 py-1 rounded bg-surface-container-highest hover:bg-surface-variant text-primary font-mono text-xs font-bold flex items-center gap-1 border border-primary-container/30 transition-all">
                          ${icon('edit', 'text-[14px]')}
                          <span>Edit Points</span>
                        </button>

                        ${isDebarred ? `
                          <button type="button"
                                  data-debar-team="${esc(row.teamId)}"
                                  data-team-name="${esc(row.teamName || row.teamId)}"
                                  data-debar-action="reinstate"
                                  class="px-2.5 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-mono text-xs font-bold flex items-center gap-1 border border-emerald-500/30 transition-all">
                            ${icon('check_circle', 'text-[14px]')}
                            <span>Reinstate</span>
                          </button>
                        ` : `
                          <button type="button"
                                  data-debar-team="${esc(row.teamId)}"
                                  data-team-name="${esc(row.teamName || row.teamId)}"
                                  data-debar-action="debar"
                                  class="px-2.5 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-mono text-xs font-bold flex items-center gap-1 border border-rose-500/30 transition-all">
                            ${icon('gavel', 'text-[14px]')}
                            <span>Debar</span>
                          </button>
                        `}
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}

              ${rows.length === 0 ? `
                <tr>
                  <td colspan="7" class="py-12 text-center text-outline font-label-code">
                    No evaluated submissions to review. End the quiz first to compute scores.
                  </td>
                </tr>
              ` : ''}
            </tbody>
          </table>
        </div>
      </section>

      <!-- Downstream Global Robothon Scoring Integration Payload -->
      <section class="p-space-lg bg-surface-container-low rounded-xl border border-outline-variant/30 shadow-md flex flex-col gap-space-md">
        <div class="flex items-center justify-between pb-space-xs border-b border-outline-variant/20">
          <div class="flex items-center gap-space-sm">
            ${icon('integration_instructions', 'text-primary-container text-[20px]')}
            <span class="font-label-badge text-label-badge uppercase tracking-wider text-primary font-bold">
              GLOBAL ROBOTHON INTEGRATION INTERFACE
            </span>
          </div>
          <span class="font-label-code text-body-sm text-outline">CONSUMED BY HOST SCORE ENGINE</span>
        </div>

        <p class="font-body-md text-body-md text-on-surface-variant">
          The quiz module exposes clean, modular scores without polluting other systems. The main Robothon platform consumes this interface to compute:
          <code class="text-primary font-label-code px-1 bg-surface-container-lowest rounded">Total Score = Quiz Points + Boat Checkpoint Points + Mini-game Points</code>.
        </p>

        <div class="bg-surface-container-lowest p-space-md rounded-lg border border-outline-variant/20 font-label-code text-body-sm text-tertiary-fixed overflow-x-auto">
          <pre>${esc(JSON.stringify(rows.slice(0, 3).map(r => ({
            teamId: r.teamId,
            quizId: r.quizId,
            quizScore: r.quizScore ?? r.score,
            qualificationStatus: r.qualificationStatus,
            debarred: r.debarred,
            rank: r.rank,
            timeTaken: r.timeTaken
          })), null, 2))}</pre>
        </div>
      </section>

      <!-- Manual Points Adjustment Modal -->
      <div id="edit-score-modal" class="fixed inset-0 bg-surface-container-lowest/80 backdrop-blur-md z-50 flex items-center justify-center p-space-md hidden transition-all duration-200">
        <div class="bg-surface-container max-w-md w-full rounded-xl p-space-lg shadow-2xl flex flex-col gap-4 border border-primary-container/40">
          <div class="flex items-center gap-3 pb-3 border-b border-outline-variant/30">
            <div class="w-10 h-10 rounded-lg bg-primary-container/20 flex items-center justify-center text-primary-container shrink-0">
              ${icon('edit_note', 'text-[24px]')}
            </div>
            <div class="flex flex-col">
              <span class="font-mono text-[10px] text-primary uppercase font-bold tracking-wider">ORGANIZER ADJUDICATION</span>
              <h3 id="edit-score-team-title" class="font-mono text-base text-on-surface font-bold">Adjust Team Score</h3>
            </div>
          </div>
          
          <input type="hidden" id="edit-score-team-id" value="">
          
          <div class="flex flex-col gap-1.5">
            <label for="edit-score-input" class="font-mono text-xs text-on-surface-variant font-bold uppercase">
              Assigned Points (Score)
            </label>
            <input type="number" id="edit-score-input"
                   class="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant/40 rounded text-on-surface font-mono text-sm focus:border-primary-container outline-none" value="0">
          </div>

          <div class="flex flex-col gap-1.5">
            <label for="edit-score-reason" class="font-mono text-xs text-on-surface-variant font-bold uppercase">
              Adjustment Reason / Audit Note
            </label>
            <input type="text" id="edit-score-reason"
                   class="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant/40 rounded text-on-surface font-mono text-xs focus:border-primary-container outline-none">
          </div>

          <div class="flex items-center justify-end gap-3 pt-3 border-t border-outline-variant/20">
            <button type="button" id="btn-cancel-edit-score"
                    class="px-4 py-2 rounded bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-mono text-xs font-bold uppercase">
              Cancel
            </button>
            <button type="button" id="btn-save-score"
                    class="px-5 py-2 rounded bg-primary-container hover:brightness-110 text-on-primary-container font-mono text-xs font-bold uppercase shadow-md flex items-center gap-1.5">
              ${icon('check', 'text-[16px]')}
              <span>Save Points</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Debar / Reinstate Adjudication Modal -->
      <div id="debar-modal" class="fixed inset-0 bg-surface-container-lowest/80 backdrop-blur-md z-50 flex items-center justify-center p-space-md hidden transition-all duration-200">
        <div class="bg-surface-container max-w-md w-full rounded-xl p-space-lg shadow-2xl flex flex-col gap-4 border border-rose-500/40">
          <div class="flex items-center gap-3 pb-3 border-b border-outline-variant/30">
            <div class="w-10 h-10 rounded-lg bg-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
              ${icon('gavel', 'text-[24px]')}
            </div>
            <div class="flex flex-col">
              <span class="font-mono text-[10px] text-rose-400 uppercase font-bold tracking-wider">COMPETITION ADJUDICATION</span>
              <h3 id="debar-team-title" class="font-mono text-base text-on-surface font-bold">Debar / Disqualify Team</h3>
            </div>
          </div>
          
          <input type="hidden" id="debar-team-id" value="">
          <input type="hidden" id="debar-team-action" value="debar">

          <p id="debar-modal-desc" class="font-mono text-xs text-on-surface-variant leading-relaxed">
            Debarring this team will strip their qualification eligibility, mark their status as DEBARRED, and prevent them from taking a qualifying cutoff slot.
          </p>

          <div class="flex flex-col gap-1.5" id="debar-reason-container">
            <label for="debar-reason-input" class="font-mono text-xs text-on-surface-variant font-bold uppercase">
              Infraction Reason / Disqualification Note
            </label>
            <input type="text" id="debar-reason-input"
                   class="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant/40 rounded text-on-surface font-mono text-xs focus:border-rose-400 outline-none">
          </div>

          <div class="flex items-center justify-end gap-3 pt-3 border-t border-outline-variant/20">
            <button type="button" id="btn-cancel-debar"
                    class="px-4 py-2 rounded bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-mono text-xs font-bold uppercase">
              Cancel
            </button>
            <button type="button" id="btn-confirm-debar"
                    class="px-5 py-2 rounded bg-rose-500 hover:bg-rose-600 text-white font-mono text-xs font-bold uppercase shadow-md flex items-center gap-1.5">
              ${icon('gavel', 'text-[16px]')}
              <span id="debar-confirm-btn-label">Confirm Debarment</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Danger Finalization Modal -->
      <div id="finalize-modal" class="fixed inset-0 bg-surface-container-lowest/80 backdrop-blur-md z-50 flex items-center justify-center p-space-md hidden transition-all duration-200">
        <div class="bg-surface-container max-w-lg w-full rounded-lg p-space-lg shadow-2xl flex flex-col gap-space-md border border-tertiary/50">
          <div class="flex items-center gap-space-sm pb-space-sm border-b border-outline-variant/30">
            <div class="w-10 h-10 rounded bg-tertiary-container/30 flex items-center justify-center text-tertiary-fixed shrink-0">
              ${icon('verified', 'text-[24px]')}
            </div>
            <div class="flex flex-col">
              <span class="font-label-badge text-label-badge text-tertiary-fixed uppercase font-bold tracking-wider">OFFICIAL ADJUDICATION</span>
              <h3 class="font-headline-sm text-headline-sm text-on-surface font-bold">Permanently Finalize Qualification?</h3>
            </div>
          </div>

          <p class="font-body-md text-body-md text-on-surface-variant">
            This action will persist <b>QUALIFIED</b> on the top ${cutoff} teams and <b>ELIMINATED</b> on all other teams. Once committed, qualification status cannot be reverted without manual database intervention.
          </p>

          <div class="flex items-center justify-end gap-space-sm pt-space-xs border-t border-outline-variant/20">
            <button type="button" id="btn-cancel-finalize"
                    class="bg-surface-container-high hover:bg-surface-variant text-on-surface px-space-md py-space-sm rounded font-label-badge text-label-badge uppercase">
              Cancel / Return to Audit
            </button>
            <button type="button" data-action="finalize"
                    class="bg-tertiary-container hover:brightness-110 text-on-tertiary-container px-space-lg py-space-sm rounded font-label-badge text-label-badge uppercase font-bold shadow-md">
              Confirm & Finalize
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  return shell(content, 'admin/quizzes/results', state);
}
