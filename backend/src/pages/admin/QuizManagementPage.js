import { shell, card, badge, icon, esc } from '../shared.js';

export function QuizManagementPage(state) {
  const currentQuizId = state.selectedQuizId || state.quiz?.id || 'quiz-1';
  const active = quizzes.find(q => q.id === currentQuizId) || state.quiz || (quizzes.length > 0 ? quizzes[0] : {});

  const content = `
    <div class="flex flex-col gap-6 w-full max-w-7xl mx-auto">
      
      <!-- Operations Command Banner -->
      <section class="p-5 bg-surface-container rounded-xl shadow-lg border border-outline-variant/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div class="flex flex-col gap-1">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="font-mono text-xs uppercase px-2 py-0.5 rounded bg-surface-container-high text-primary font-bold">
              SUPER_ADMIN
            </span>
            ${badge(active.status || 'DRAFT')}
          </div>
          <h1 class="font-mono text-xl font-bold text-on-surface">
            Two Competition Quizzes Overview
          </h1>
          <p class="text-xs text-on-surface-variant font-mono">
            Robothon Official Event: Round 1 (Elimination) &amp; Round 2 (Grand Finals)
          </p>
        </div>

        <!-- Super Admin Live Control Switches -->
        <div class="flex items-center flex-wrap gap-2">
          ${['DRAFT', 'READY'].includes(active.status) ? `
            <button type="button" data-control="start"
                    class="px-4 py-2 rounded bg-tertiary/20 text-tertiary-fixed border border-tertiary/40 font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 hover:bg-tertiary/30 shadow-[0_0_12px_rgba(168,255,210,0.3)]">
              ${icon('play_arrow', 'text-[18px]')}
              <span>Start Quiz Live</span>
            </button>
          ` : ''}

          ${active.status === 'LIVE' ? `
            <button type="button" data-control="pause"
                    class="px-3.5 py-2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 hover:bg-amber-500/30">
              ${icon('pause', 'text-[16px]')}
              <span>Pause Quiz</span>
            </button>
            <button type="button" data-control="end"
                    class="px-3.5 py-2 rounded bg-error/20 hover:bg-error/30 text-error border border-error/40 font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              ${icon('stop', 'text-[16px]')}
              <span>End Quiz</span>
            </button>
          ` : ''}

          ${active.status === 'PAUSED' ? `
            <button type="button" data-control="resume"
                    class="px-3.5 py-2 rounded bg-primary-container text-on-primary-container font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 hover:brightness-110">
              ${icon('play_arrow', 'text-[16px]')}
              <span>Resume Quiz</span>
            </button>
            <button type="button" data-control="end"
                    class="px-3.5 py-2 rounded bg-error/20 hover:bg-error/30 text-error border border-error/40 font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              ${icon('stop', 'text-[16px]')}
              <span>End Quiz</span>
            </button>
          ` : ''}

          ${['READY', 'LIVE', 'PAUSED', 'ENDED', 'RESULTS', 'FINALIZED'].includes(active.status) ? `
            <button type="button" data-control="redo"
                    class="px-3.5 py-2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 hover:bg-amber-500/30">
              ${icon('restart_alt', 'text-[16px]')}
              <span>Redo Quiz</span>
            </button>
          ` : ''}
        </div>
      </section>

      <!-- Main Layout: 2-Column Catalog & Quick Create -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        <!-- Quizzes Catalog (8 cols) -->
        <section class="lg:col-span-8 flex flex-col gap-4">
          <div class="flex items-center justify-between">
            <span class="font-mono text-xs uppercase tracking-wider text-outline font-bold">
              Configured Competition Quizzes (${quizzes.length})
            </span>
            <a href="#admin/quizzes/builder" class="font-mono text-xs text-primary font-bold hover:underline flex items-center gap-1">
              ${icon('build_circle', 'text-[16px]')} Open Detailed Quiz Builder
            </a>
          </div>

          <div class="flex flex-col gap-3">
            ${quizzes.map(q => {
              const isCurrent = q.id === active.id;
              const durationMins = Math.round((q.durationSeconds || 1800) / 60);
              return `
                <div class="p-4 bg-surface-container rounded-lg border transition-all flex flex-col gap-3 ${
                  isCurrent ? 'border-primary-container shadow-md' : 'border-outline-variant/30 hover:border-outline-variant/60'
                }">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <span class="font-mono text-sm font-bold text-on-surface">${esc(q.name)}</span>
                      <span class="font-mono text-[10px] px-1.5 py-0.5 rounded bg-surface-container-high text-outline uppercase">${esc(q.id)}</span>
                    </div>
                    ${badge(q.status)}
                  </div>

                  <div class="grid grid-cols-3 gap-2 font-mono text-xs bg-surface-container-lowest p-2.5 rounded border border-outline-variant/20">
                    <div>
                      <span class="text-outline block">Timer:</span>
                      <span class="text-primary font-bold">${durationMins} min (${q.durationSeconds || 1800}s)</span>
                    </div>
                    <div>
                      <span class="text-outline block">Scoring:</span>
                      <span class="text-tertiary font-bold">+${q.pointsPerCorrect || 4} pts (No Negative Penalty)</span>
                    </div>
                    <div>
                      <span class="text-outline block">Cutoff:</span>
                      <span class="text-secondary font-bold">Top ${q.qualificationCount || 40} Teams</span>
                    </div>
                  </div>

                  <div class="flex items-center justify-between pt-1 border-t border-outline-variant/20">
                    <button type="button" data-switch-quiz="${esc(q.id)}" class="font-mono text-xs text-primary hover:underline font-bold">
                      ${isCurrent ? 'Active Selection' : 'Select Quiz'}
                    </button>
                    <div class="flex items-center gap-3">
                      ${['READY', 'LIVE', 'PAUSED', 'ENDED', 'RESULTS', 'FINALIZED'].includes(q.status) ? `
                        <button type="button" data-redo-quiz="${esc(q.id)}" class="font-mono text-xs text-amber-300 hover:underline font-bold flex items-center gap-1">
                          ${icon('restart_alt', 'text-[14px]')} Redo Quiz
                        </button>
                      ` : ''}
                      <a href="#admin/quizzes/builder" class="font-mono text-xs text-on-surface hover:text-primary font-bold flex items-center gap-1">
                        ${icon('edit_note', 'text-[14px]')} Edit Questions
                      </a>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </section>

        <!-- Create New Quiz Card (4 cols) -->
        <section class="lg:col-span-4 bg-surface-container rounded-lg p-5 border border-outline-variant/30 shadow-lg flex flex-col gap-4">
          <div class="pb-2 border-b border-outline-variant/20">
            <h3 class="font-mono text-sm text-on-surface font-bold uppercase">
              Add Another Quiz Round
            </h3>
          </div>

          <form id="create-quiz-form" class="flex flex-col gap-4">
            <div class="flex flex-col gap-1.5">
              <label class="block text-xs font-mono font-bold uppercase text-on-surface" for="quiz-slug-input">
                Quiz Identifier (Unique Slug)
              </label>
              <input id="quiz-slug-input" name="id" required
                     class="w-full bg-surface-container-lowest text-on-surface font-mono text-sm px-3 py-2 rounded outline-none border border-outline-variant/40 focus:border-primary-container" />
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="block text-xs font-mono font-bold uppercase text-on-surface" for="quiz-title-input">
                Quiz Round Title
              </label>
              <input id="quiz-title-input" name="name" required
                     class="w-full bg-surface-container-lowest text-on-surface font-mono text-sm px-3 py-2 rounded outline-none border border-outline-variant/40 focus:border-primary-container" />
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div class="flex flex-col gap-1.5">
                <label class="block text-xs font-mono font-bold uppercase text-on-surface" for="quiz-duration-input">
                  Duration (Seconds)
                </label>
                <input id="quiz-duration-input" name="durationSeconds" type="number" value="1800" required
                       class="w-full bg-surface-container-lowest text-on-surface font-mono text-sm px-3 py-2 rounded outline-none border border-outline-variant/40 focus:border-primary-container" />
              </div>
              <div class="flex flex-col gap-1.5">
                <label class="block text-xs font-mono font-bold uppercase text-on-surface" for="quiz-cutoff-input">
                  Qualifying Cutoff
                </label>
                <input id="quiz-cutoff-input" name="qualificationCount" type="number" value="40" required
                       class="w-full bg-surface-container-lowest text-on-surface font-mono text-sm px-3 py-2 rounded outline-none border border-outline-variant/40 focus:border-primary-container" />
              </div>
            </div>

            <button type="submit"
                    class="w-full mt-2 py-2.5 rounded bg-primary-container text-on-primary-container font-mono text-xs font-bold uppercase tracking-wider hover:brightness-110 transition-all shadow-[0_0_12px_rgba(0,229,255,0.3)]">
              + Initialize Quiz Round
            </button>
          </form>
        </section>
      </div>
    </div>
  `;

  return shell(content, 'admin/quizzes/catalog', state);
}
