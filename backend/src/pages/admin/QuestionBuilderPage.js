import { shell, card, badge, icon, esc } from '../shared.js';

export function QuestionBuilderPage(state) {
  const quizzes = state.quizzes || [];
  // Ensure selected quiz is respected
  const currentQuizId = state.selectedQuizId || state.quiz?.id || 'quiz-1';
  const quiz = quizzes.find(q => q.id === currentQuizId) || state.quiz || (quizzes.length > 0 ? quizzes[0] : { id: 'quiz-1', name: 'Quiz 1: Round 1 Elimination', status: 'DRAFT', durationSeconds: 1800 });
  const questions = state.questionBank || [];
  const activeQId = state.builderActiveQ;
  const activeQ = questions.find(q => q.id === activeQId) || null;
  const durationMins = Math.round((quiz.durationSeconds || 1800) / 60);

  const content = `
    <div class="flex flex-col gap-5 w-full">
      
      <!-- Two Quizzes Switcher & Live Operation Controls -->
      <div class="bg-surface-container rounded-xl p-4 border border-outline-variant/30 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg">
        
        <!-- Left: Quiz Selection Tabs (Quiz 1 vs Quiz 2) -->
        <div class="flex flex-col gap-2">
          <span class="text-xs font-mono font-bold uppercase tracking-wider text-outline">
            Active Competition Quiz Bank
          </span>
          <div class="flex items-center gap-2.5 flex-wrap">
            <button type="button" data-switch-quiz="quiz-1"
                    class="px-4 py-2 rounded-lg text-xs font-mono font-bold uppercase transition-all flex items-center gap-2 border ${
                      quiz.id === 'quiz-1'
                        ? 'bg-primary-container text-on-primary-container border-primary-container shadow-[0_0_12px_rgba(0,229,255,0.35)]'
                        : 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest border-outline-variant/40'
                    }">
              ${icon('quiz', 'text-[16px]')}
              <span>Quiz 1: Elimination Round</span>
              ${badge(state.quizzes?.find(q => q.id === 'quiz-1')?.status || 'DRAFT')}
            </button>

            <button type="button" data-switch-quiz="quiz-2"
                    class="px-4 py-2 rounded-lg text-xs font-mono font-bold uppercase transition-all flex items-center gap-2 border ${
                      quiz.id === 'quiz-2'
                        ? 'bg-primary-container text-on-primary-container border-primary-container shadow-[0_0_12px_rgba(0,229,255,0.35)]'
                        : 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest border-outline-variant/40'
                    }">
              ${icon('bolt', 'text-[16px]')}
              <span>Quiz 2: Component Bonus Quiz</span>
              ${badge(state.quizzes?.find(q => q.id === 'quiz-2')?.status || 'DRAFT')}
            </button>
          </div>
        </div>

        <!-- Right: Super Admin Dynamic Live Controls -->
        <div class="flex items-center gap-2 flex-wrap" id="admin-quiz-controls">
          <a href="#admin/quizzes/stage"
             class="px-3.5 py-2 rounded text-xs font-mono font-bold uppercase bg-primary-container text-on-primary-container flex items-center gap-1.5 shadow-[0_0_12px_rgba(0,229,255,0.3)] hover:brightness-110 transition-all">
            ${icon('slideshow', 'text-[16px]')}
            <span>Show Live Stage</span>
          </a>

          ${quiz.status === 'DRAFT' ? `
            <button type="button" data-ready="${esc(quiz.id)}"
                    class="px-3.5 py-2 rounded text-xs font-mono font-bold uppercase bg-surface-container-highest hover:bg-surface-container-high text-secondary border border-secondary/40 flex items-center gap-1.5 transition-all">
              ${icon('check_circle', 'text-[16px]')}
              <span>Mark Ready</span>
            </button>
          ` : ''}

          ${['DRAFT', 'READY'].includes(quiz.status) ? `
            <button type="button" data-control="start"
                    class="px-4 py-2 rounded text-xs font-mono font-bold uppercase bg-tertiary/20 hover:bg-tertiary/30 text-tertiary-fixed border border-tertiary/50 flex items-center gap-1.5 shadow-[0_0_12px_rgba(168,255,210,0.3)] transition-all">
              ${icon('play_arrow', 'text-[18px] text-tertiary-fixed')}
              <span>Start Quiz Live</span>
            </button>
          ` : ''}

          ${quiz.status === 'LIVE' ? `
            <button type="button" data-control="pause"
                    class="px-3.5 py-2 rounded text-xs font-mono font-bold uppercase bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 flex items-center gap-1.5 transition-all">
              ${icon('pause', 'text-[16px]')}
              <span>Pause Quiz</span>
            </button>
            <button type="button" data-control="end"
                    class="px-3.5 py-2 rounded text-xs font-mono font-bold uppercase bg-error/20 hover:bg-error/30 text-error border border-error/40 flex items-center gap-1.5 transition-all">
              ${icon('stop', 'text-[16px]')}
              <span>End Quiz</span>
            </button>
          ` : ''}

          ${quiz.status === 'PAUSED' ? `
            <button type="button" data-control="resume"
                    class="px-3.5 py-2 rounded text-xs font-mono font-bold uppercase bg-primary-container text-on-primary-container flex items-center gap-1.5 transition-all">
              ${icon('play_arrow', 'text-[16px]')}
              <span>Resume Quiz</span>
            </button>
            <button type="button" data-control="end"
                    class="px-3.5 py-2 rounded text-xs font-mono font-bold uppercase bg-error/20 hover:bg-error/30 text-error border border-error/40 flex items-center gap-1.5 transition-all">
              ${icon('stop', 'text-[16px]')}
              <span>End Quiz</span>
            </button>
          ` : ''}

          ${['RESULTS', 'FINALIZED'].includes(quiz.status) ? `
            <a href="#admin/quizzes/results" class="px-3.5 py-2 rounded text-xs font-mono font-bold uppercase bg-primary-container text-on-primary-container flex items-center gap-1.5">
              ${icon('fact_check', 'text-[16px]')}
              <span>Audit &amp; Finalize</span>
            </a>
          ` : ''}

          ${['READY', 'LIVE', 'PAUSED', 'ENDED', 'RESULTS', 'FINALIZED'].includes(quiz.status) ? `
            <button type="button" data-control="redo"
                    class="px-3.5 py-2 rounded text-xs font-mono font-bold uppercase bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 flex items-center gap-1.5 transition-all"
                    title="Reset quiz attempts and restart round">
              ${icon('restart_alt', 'text-[16px]')}
              <span>Redo Quiz</span>
            </button>
          ` : ''}
        </div>
      </div>

      <!-- Quick Summary Parameter Readout -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
        <div class="bg-surface-container p-3 rounded border border-outline-variant/30 flex flex-col gap-0.5">
          <span class="text-outline uppercase">Questions Loaded</span>
          <span class="text-base font-bold text-on-surface">${questions.length} questions</span>
        </div>
        <div class="bg-surface-container p-3 rounded border border-outline-variant/30 flex flex-col gap-0.5">
          <span class="text-outline uppercase">Timer Duration</span>
          <span class="text-base font-bold text-primary">${durationMins} minutes</span>
        </div>
        <div class="bg-surface-container p-3 rounded border border-outline-variant/30 flex flex-col gap-0.5">
          <span class="text-outline uppercase">Points Per Correct</span>
          <span class="text-base font-bold text-tertiary">+${quiz.pointsPerCorrect || 4} pts (No Negative Marking)</span>
        </div>
        <div class="bg-surface-container p-3 rounded border border-outline-variant/30 flex flex-col gap-0.5">
          <span class="text-outline uppercase">Cutoff Target</span>
          <span class="text-base font-bold text-secondary">Top ${quiz.qualificationCount || 40} Teams</span>
        </div>
      </div>

      <!-- Main Workstation: Questions Authoring (Primary View) -->
      <div class="flex flex-col lg:flex-row gap-5 items-start">
        
        <!-- Left: Question Sequence Bank (35%) -->
        <div class="w-full lg:w-[35%] bg-surface-container rounded-lg p-4 border border-outline-variant/30 flex flex-col gap-3">
          <div class="flex items-center justify-between pb-2 border-b border-outline-variant/20">
            <span class="font-mono text-xs uppercase font-bold text-outline">
              ${quiz.id === 'quiz-2' ? 'Quiz 2 Question Bank (Component Bonus)' : 'Quiz 1 Question Bank (Elimination Round)'} (${questions.length})
            </span>
            <button type="button" id="btn-show-add-q" class="text-xs font-mono text-primary font-bold hover:underline flex items-center gap-1">
              ${icon('add', 'text-[14px]')} + New Question
            </button>
          </div>

          <div class="flex flex-col gap-2 max-h-[580px] overflow-y-auto pr-1">
            ${questions.map((q, idx) => {
              const isSelected = activeQ && activeQ.id === q.id;
              return `
                <div class="p-3 rounded border transition-all flex flex-col gap-1.5 ${
                  isSelected
                    ? 'bg-surface-container-high border-primary-container shadow-sm'
                    : 'bg-surface-container-lowest border-outline-variant/20 hover:border-outline-variant/50'
                }">
                  <div class="flex items-center justify-between">
                    <span class="font-mono text-xs font-bold ${isSelected ? 'text-primary' : 'text-on-surface'}">Q${idx + 1}</span>
                    <span class="font-mono text-xs text-primary font-bold">Correct: Option ${esc(q.correctOption)}</span>
                  </div>

                  <p class="text-xs text-on-surface-variant line-clamp-2 leading-relaxed">
                    ${esc(q.questionText)}
                  </p>

                  <div class="flex items-center justify-end gap-2 pt-1 border-t border-outline-variant/20 mt-0.5">
                    <button type="button" data-select-q="${esc(q.id)}" class="text-xs font-mono text-primary hover:underline font-bold">
                      Edit Question
                    </button>
                    <span class="text-outline">•</span>
                    <button type="button" data-delete-q="${esc(q.id)}" class="text-xs font-mono text-error hover:underline font-bold">
                      Delete
                    </button>
                  </div>
                </div>
              `;
            }).join('')}

            ${questions.length === 0 ? `
              <div class="p-6 text-center text-outline font-mono text-xs border border-dashed border-outline-variant/30 rounded">
                No questions yet in ${esc(quiz.name)}. Author a question on the right or upload JSON via Optional Tools below.
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Right: Question Editor Canvas (65%) -->
        <div class="w-full lg:w-[65%] bg-surface-container rounded-lg p-5 border border-outline-variant/30 flex flex-col gap-4 shadow-md">
          <div class="flex items-center justify-between pb-2 border-b border-outline-variant/20">
            <span class="font-mono text-xs uppercase font-bold text-primary">
              ${activeQ ? `Editing Question Q-${esc(activeQ.id)}` : 'Author New Question'}
            </span>
            ${activeQ ? `
              <button type="button" id="btn-cancel-edit" class="text-xs font-mono text-outline hover:text-on-surface">
                Clear &amp; New
              </button>
            ` : ''}
          </div>

          <form id="question-editor-form" class="flex flex-col gap-4">
            <input type="hidden" name="questionId" value="${esc(activeQ?.id || '')}" />

            <!-- Question Prompt Text -->
            <div class="flex flex-col gap-1.5">
              <label class="block text-xs font-mono font-bold uppercase text-on-surface">
                Question Text / Prompt
              </label>
              <textarea name="questionText" rows="3" required
                        class="w-full bg-surface-container-lowest text-on-surface font-body-md text-sm p-3 rounded outline-none border border-outline-variant/40 focus:border-primary-container focus:ring-1 focus:ring-primary-container leading-relaxed">${esc(activeQ?.questionText || '')}</textarea>
            </div>

            <!-- Per-Question Timer (Seconds) -->
            <div class="flex flex-col gap-1.5">
              <label class="block text-xs font-mono font-bold uppercase text-on-surface flex items-center gap-1.5">
                ${icon('timer', 'text-[15px] text-primary')}
                <span>Per-Question Timer (Seconds)</span>
              </label>
              <input name="timeLimitSeconds" type="number" min="5" max="300" required value="${activeQ?.timeLimitSeconds ?? 30}"
                     class="w-full bg-surface-container-lowest text-on-surface font-mono text-sm px-3 py-2 rounded outline-none border border-outline-variant/40 focus:border-primary-container" />
              <span class="text-[11px] text-outline font-mono">Time allotted on stage screen for this question before interim standings appear.</span>
            </div>

            <!-- Options A, B, C, D (No topic tag, no question points) -->
            <div class="flex flex-col gap-2.5 pt-1">
              <label class="block text-xs font-mono font-bold uppercase text-outline">
                Answer Choices (Select radio button for the correct option)
              </label>

              ${['A', 'B', 'C', 'D'].map(key => {
                const optObj = activeQ?.options?.find(o => o.optionKey === key);
                const optText = optObj ? optObj.optionText : '';
                const isCorrect = activeQ ? activeQ.correctOption === key : key === 'A';
                return `
                  <div class="flex items-center gap-3 bg-surface-container-lowest p-2.5 rounded border border-outline-variant/20 hover:border-outline-variant/40">
                    <label class="flex items-center gap-1.5 cursor-pointer font-mono text-xs font-bold ${isCorrect ? 'text-tertiary' : 'text-outline'}">
                      <input type="radio" name="correctOption" value="${key}" ${isCorrect ? 'checked' : ''}
                             class="accent-primary-container w-4 h-4" />
                      <span>Option ${key}</span>
                    </label>

                    <input name="option_${key}" type="text" required value="${esc(optText)}"
                           class="flex-1 bg-surface-container text-on-surface font-body-md text-sm px-3 py-1.5 rounded outline-none border border-outline-variant/30 focus:border-primary-container" />
                  </div>
                `;
              }).join('')}
            </div>

            <div class="flex items-center justify-between pt-3 border-t border-outline-variant/20">
              <span class="text-xs font-mono text-outline">Live authoring: saves instantly to this quiz bank.</span>
              <button type="submit" class="px-5 py-2.5 rounded font-mono text-xs font-bold uppercase bg-primary-container text-on-primary-container hover:brightness-110 shadow-[0_0_12px_rgba(0,229,255,0.3)] transition-all">
                ${activeQ ? 'Update Question' : 'Save Question to Quiz'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- OPTIONAL TOOLS ACCORDION: JSON Import / Export & Live Settings -->
      <div class="flex flex-col gap-3 pt-2">
        <div class="flex items-center gap-2">
          <button type="button" id="btn-toggle-json-tools"
                  class="px-3.5 py-2 rounded text-xs font-mono font-bold uppercase bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 text-on-surface flex items-center gap-1.5 transition-all">
            ${icon('upload_file', 'text-[16px] text-primary')}
            <span>Import / Export JSON (Optional Utility)</span>
          </button>

          <button type="button" id="btn-toggle-settings-tools"
                  class="px-3.5 py-2 rounded text-xs font-mono font-bold uppercase bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 text-on-surface flex items-center gap-1.5 transition-all">
            ${icon('tune', 'text-[16px] text-secondary')}
            <span>Edit Quiz Parameters (Duration &amp; Cutoff)</span>
          </button>
        </div>

        <!-- Optional JSON Panel -->
        <div id="optional-json-panel" class="hidden bg-surface-container rounded-xl p-5 border border-outline-variant/30 flex flex-col gap-4 shadow-md">
          <div class="flex items-center justify-between pb-2 border-b border-outline-variant/20">
            <div>
              <h3 class="font-mono text-xs font-bold uppercase text-on-surface">Import / Export Questions via JSON</h3>
              <p class="text-xs text-on-surface-variant font-mono">Optional tool: Upload a JSON file or paste questions adhering to the format.</p>
            </div>
            <div class="flex items-center gap-2">
              <button type="button" id="btn-download-template" class="px-3 py-1.5 rounded text-xs font-mono bg-surface-container-high text-primary hover:bg-surface-container-highest border border-outline-variant/30 font-bold flex items-center gap-1">
                ${icon('download', 'text-[14px]')} Download Template (.json)
              </button>
              <button type="button" id="btn-export-quiz-json" class="px-3 py-1.5 rounded text-xs font-mono bg-surface-container-high text-tertiary hover:bg-surface-container-highest border border-outline-variant/30 font-bold flex items-center gap-1">
                ${icon('file_download', 'text-[14px]')} Export ${esc(quiz.name)} (.json)
              </button>
            </div>
          </div>

          <form id="json-import-form" class="flex flex-col gap-4">
            <div class="flex flex-col gap-1.5">
              <label class="block text-xs font-mono font-bold uppercase text-on-surface">
                Choose Local JSON File
              </label>
              <input type="file" id="json-file-input" accept=".json,application/json"
                     class="text-xs font-mono file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs file:font-mono file:font-bold file:bg-surface-container-highest file:text-primary hover:file:bg-primary-container hover:file:text-on-primary-container text-on-surface-variant" />
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="block text-xs font-mono font-bold uppercase text-on-surface">
                Or Paste JSON Content
              </label>
              <textarea id="json-paste-input" rows="6"
                        class="w-full bg-surface-container-lowest text-on-surface font-mono text-xs p-3 rounded outline-none border border-outline-variant/40 focus:border-primary-container"></textarea>
            </div>

            <div class="flex items-center gap-4 text-xs font-mono">
              <label class="flex items-center gap-1.5 cursor-pointer">
                <input type="radio" name="importMode" value="replace" checked class="accent-primary-container" />
                <span>Replace questions in ${esc(quiz.name)}</span>
              </label>
              <label class="flex items-center gap-1.5 cursor-pointer">
                <input type="radio" name="importMode" value="append" class="accent-primary-container" />
                <span>Append questions to ${esc(quiz.name)}</span>
              </label>
            </div>

            <div id="json-import-status" class="min-h-4 text-xs font-mono font-semibold"></div>

            <div class="flex justify-end">
              <button type="submit" class="px-5 py-2.5 rounded font-mono text-xs font-bold uppercase bg-primary-container text-on-primary-container hover:brightness-110 shadow-[0_0_12px_rgba(0,229,255,0.3)]">
                Import to ${esc(quiz.name)}
              </button>
            </div>
          </form>
        </div>

        <!-- Optional Parameters Panel -->
        <div id="optional-settings-panel" class="hidden bg-surface-container rounded-xl p-5 border border-outline-variant/30 flex flex-col gap-4 shadow-md">
          <div class="pb-2 border-b border-outline-variant/20">
            <h3 class="font-mono text-xs font-bold uppercase text-on-surface">Live Quiz Parameters for ${esc(quiz.name)}</h3>
            <p class="text-xs text-on-surface-variant font-mono">Edit duration, points per question, and qualification cutoff count.</p>
          </div>

          <form id="quiz-live-settings-form" class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div class="flex flex-col gap-1.5">
              <label class="block text-xs font-mono font-bold uppercase text-on-surface">
                Quiz Display Name
              </label>
              <input name="name" type="text" required value="${esc(quiz.name)}"
                     class="w-full bg-surface-container-lowest text-on-surface font-mono text-sm px-3 py-2 rounded outline-none border border-outline-variant/40 focus:border-primary-container" />
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="block text-xs font-mono font-bold uppercase text-on-surface">
                Duration in Minutes
              </label>
              <input name="durationMinutes" type="number" min="1" max="180" required value="${durationMins}"
                     class="w-full bg-surface-container-lowest text-on-surface font-mono text-sm px-3 py-2 rounded outline-none border border-outline-variant/40 focus:border-primary-container" />
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="block text-xs font-mono font-bold uppercase text-on-surface">
                Points per Correct Answer (+)
              </label>
              <input name="pointsPerCorrect" type="number" min="1" required value="${quiz.pointsPerCorrect || 4}"
                     class="w-full bg-surface-container-lowest text-on-surface font-mono text-sm px-3 py-2 rounded outline-none border border-outline-variant/40 focus:border-primary-container" />
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="block text-xs font-mono font-bold uppercase text-on-surface">
                Qualifying Teams Cutoff Count
              </label>
              <input name="qualificationCount" type="number" min="1" required value="${quiz.qualificationCount || 40}"
                     class="w-full bg-surface-container-lowest text-on-surface font-mono text-sm px-3 py-2 rounded outline-none border border-outline-variant/40 focus:border-primary-container" />
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="block text-xs font-mono font-bold uppercase text-on-surface">
                Pre-Quiz Countdown (Seconds)
              </label>
              <input name="preQuizCountdownSeconds" type="number" min="3" max="60" required value="${quiz.preQuizCountdownSeconds ?? 10}"
                     class="w-full bg-surface-container-lowest text-on-surface font-mono text-sm px-3 py-2 rounded outline-none border border-outline-variant/40 focus:border-primary-container" />
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="block text-xs font-mono font-bold uppercase text-on-surface">
                Intermission / Standings (Seconds)
              </label>
              <input name="intermissionSeconds" type="number" min="3" max="60" required value="${quiz.intermissionSeconds ?? 7}"
                     class="w-full bg-surface-container-lowest text-on-surface font-mono text-sm px-3 py-2 rounded outline-none border border-outline-variant/40 focus:border-primary-container" />
            </div>

            <div class="sm:col-span-3 flex justify-end pt-2 border-t border-outline-variant/20">
              <button type="submit" class="px-5 py-2.5 rounded font-mono text-xs font-bold uppercase bg-primary-container text-on-primary-container hover:brightness-110 shadow-[0_0_12px_rgba(0,229,255,0.3)]">
                Save Parameters Live
              </button>
            </div>
          </form>
        </div>
      </div>

    </div>
  `;

  return shell(content, 'admin/quizzes/builder', state);
}
