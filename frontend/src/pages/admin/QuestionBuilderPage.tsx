import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { quizService, Quiz, AdminQuestion } from '../../services/quizService';
import {
  FileText,
  Plus,
  Trash2,
  Save,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Lock,
  Sparkles
} from 'lucide-react';

export const QuestionBuilderPage: React.FC = () => {
  const searchParams = new URLSearchParams(useLocation().search);
  const requestedQuizId = searchParams.get('quiz') || 'quiz-1';

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedQuizId, setSelectedQuizId] = useState(requestedQuizId);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<AdminQuestion[]>([]);
  const [activeQId, setActiveQId] = useState<string | null>(null);

  // Editor states
  const [questionText, setQuestionText] = useState('');
  const [category, setCategory] = useState('Robotics & Controls');
  const [points, setPoints] = useState(4);
  const [options, setOptions] = useState([
    { optionKey: 'A', optionText: '' },
    { optionKey: 'B', optionText: '' },
    { optionKey: 'C', optionText: '' },
    { optionKey: 'D', optionText: '' }
  ]);
  const [correctOption, setCorrectOption] = useState('A');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');

  const loadData = async (qId: string) => {
    try {
      const catalog = await quizService.list(true);
      setQuizzes(catalog.quizzes);
      const target = catalog.quizzes.find(q => q.id === qId) || catalog.quizzes[0];
      if (!target) return;

      setSelectedQuizId(target.id);
      setQuiz(target);

      const qRes = await quizService.adminQuestions(target.id);
      setQuestions(qRes.questions);

      if (qRes.questions.length > 0) {
        selectQuestion(qRes.questions[0]);
      } else {
        clearEditor();
      }
      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'Failed to load question bank.');
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(selectedQuizId);
  }, [selectedQuizId]);

  const selectQuestion = (q: AdminQuestion) => {
    setActiveQId(q.id);
    setQuestionText(q.questionText);
    setCategory(q.category || 'Robotics');
    setPoints(q.points || 4);
    setOptions(q.options || [
      { optionKey: 'A', optionText: '' },
      { optionKey: 'B', optionText: '' },
      { optionKey: 'C', optionText: '' },
      { optionKey: 'D', optionText: '' }
    ]);
    setCorrectOption(q.correctOption || 'A');
  };

  const clearEditor = () => {
    setActiveQId(null);
    setQuestionText('');
    setCategory('Robotics');
    setPoints(4);
    setOptions([
      { optionKey: 'A', optionText: '' },
      { optionKey: 'B', optionText: '' },
      { optionKey: 'C', optionText: '' },
      { optionKey: 'D', optionText: '' }
    ]);
    setCorrectOption('A');
  };

  const handleSaveQuestion = async () => {
    if (!questionText.trim()) {
      setError('Question prompt cannot be empty.');
      return;
    }
    try {
      setError('');
      if (activeQId) {
        await quizService.updateQuestion(activeQId, {
          questionText,
          category,
          points,
          options,
          correctOption
        });
        setNotice('Question updated successfully.');
      } else {
        await quizService.createQuestion(selectedQuizId, {
          questionText,
          category,
          points,
          options,
          correctOption
        });
        setNotice('New question created in bank.');
      }
      setTimeout(() => setNotice(''), 3000);
      loadData(selectedQuizId);
    } catch (err: any) {
      setError(err.message || 'Failed to save question.');
    }
  };

  const handleDeleteQuestion = async (qId: string) => {
    if (!window.confirm('Delete this question permanently?')) return;
    try {
      await quizService.deleteQuestion(qId);
      setNotice('Question deleted.');
      setTimeout(() => setNotice(''), 2000);
      loadData(selectedQuizId);
    } catch (err: any) {
      setError(err.message || 'Deletion failed.');
    }
  };

  const handleMarkReady = async () => {
    try {
      await quizService.control(selectedQuizId, 'ready');
      setNotice('Quiz marked as READY for contestants!');
      loadData(selectedQuizId);
    } catch (err: any) {
      setError(err.message || 'Cannot mark ready.');
    }
  };

  const handleExportJson = async () => {
    try {
      const data = await quizService.export(selectedQuizId);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedQuizId}-questions.json`;
      a.click();
    } catch (err: any) {
      setError(err.message || 'Export failed.');
    }
  };

  const handleImportJson = async () => {
    try {
      setError('');
      const parsed = JSON.parse(importJsonText);
      await quizService.import(selectedQuizId, parsed);
      setNotice('Quiz package successfully imported.');
      setShowImportModal(false);
      setImportJsonText('');
      loadData(selectedQuizId);
    } catch (err: any) {
      setError(err.message || 'Invalid JSON format according to QUIZ_FORMAT_SPEC.md.');
    }
  };

  const isLiveOrEnded = ['LIVE', 'PAUSED', 'RESULTS', 'FINALIZED'].includes(quiz?.status || '');

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 text-[#251306]">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#F4AE52]/30">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/quizzes"
            className="p-2 rounded-xl bg-white border border-orange-200 hover:bg-orange-50 text-stone-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-stone-600">
                {quiz?.name} ({quiz?.status})
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#251306] mt-0.5">
              Question Bank
            </h1>
          </div>
        </div>

        {/* Global Bank Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {quiz?.status === 'DRAFT' && (
            <button
              type="button"
              onClick={handleMarkReady}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-xs font-bold uppercase flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Mark Ready for Contestants</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowImportModal(true)}
            disabled={isLiveOrEnded}
            className="px-3.5 py-2 rounded-xl bg-white border border-orange-200 hover:bg-orange-50 text-[#251306] font-mono text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-40 cursor-pointer"
          >
            <Upload className="w-4 h-4 text-[#D4621A]" />
            <span>Import JSON</span>
          </button>

          <button
            type="button"
            onClick={handleExportJson}
            className="px-3.5 py-2 rounded-xl bg-white border border-orange-200 hover:bg-orange-50 text-[#251306] font-mono text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-stone-600" />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-4 rounded-2xl bg-red-50 text-red-800 border border-red-200 text-xs font-mono">
          {error}
        </div>
      )}

      {notice && (
        <div className="mt-4 p-4 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-mono flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{notice}</span>
        </div>
      )}

      {isLiveOrEnded && (
        <div className="mt-4 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs font-mono text-amber-900 flex items-center gap-2">
          <Lock className="w-4 h-4 text-amber-700 shrink-0" />
          <span>This quiz is currently active or concluded. Question editing is authoritatively locked.</span>
        </div>
      )}

      {/* Main Split Grid */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Column: Questions List */}
        <div className="bg-white rounded-3xl p-5 border border-orange-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <span className="font-mono text-xs uppercase font-bold text-stone-500">
              Question Bank ({questions.length})
            </span>
            <button
              type="button"
              disabled={isLiveOrEnded}
              onClick={clearEditor}
              className="px-2.5 py-1 rounded-lg bg-orange-100 hover:bg-orange-200 text-[#D4621A] font-mono text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-40"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {questions.map((q, idx) => {
              const isActive = q.id === activeQId;
              return (
                <div
                  key={q.id}
                  onClick={() => selectQuestion(q)}
                  className={`p-3.5 rounded-2xl border transition-all flex items-start justify-between gap-2 cursor-pointer ${
                    isActive
                      ? 'border-[#D4621A] bg-orange-50/70 shadow-sm ring-1 ring-[#D4621A]'
                      : 'border-stone-200 bg-white hover:bg-stone-50'
                  }`}
                >
                  <div className="truncate flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] font-bold text-[#D4621A]">
                        Q{idx + 1}
                      </span>
                      <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-stone-100 text-stone-600">
                        {q.category || 'General'}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-[#251306] mt-1 truncate">
                      {q.questionText}
                    </p>
                  </div>

                  {!isLiveOrEnded && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteQuestion(q.id);
                      }}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Question Authoring Editor */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 sm:p-8 border border-orange-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <h3 className="font-bold text-lg text-[#251306]">
              {activeQId ? 'Edit Challenge Prompt' : 'New Challenge Question'}
            </h3>
            <span className="text-xs font-mono text-stone-500">
              {activeQId ? `ID: ${activeQId}` : 'Draft'}
            </span>
          </div>

          <fieldset disabled={isLiveOrEnded} className="space-y-4">
            {/* Prompt */}
            <div>
              <label htmlFor="prompt-input" className="block text-xs font-mono uppercase font-bold text-stone-600 mb-1">
                Question Technical Prompt
              </label>
              <textarea
                id="prompt-input"
                rows={3}
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                className="w-full p-3.5 rounded-2xl bg-stone-50 border border-stone-200 text-sm text-[#251306] focus:bg-white focus:outline-none focus:border-[#D4621A] focus:ring-1 focus:ring-[#D4621A] transition-all font-sans"
              />
            </div>

            {/* Category & Points */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="category-input" className="block text-xs font-mono uppercase font-bold text-stone-600 mb-1">
                  Category Tag
                </label>
                <input
                  type="text"
                  id="category-input"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs font-mono text-[#251306] focus:bg-white focus:outline-none focus:border-[#D4621A]"
                />
              </div>

              <div>
                <label htmlFor="points-input" className="block text-xs font-mono uppercase font-bold text-stone-600 mb-1">
                  Marks / Points Value
                </label>
                <input
                  type="number"
                  id="points-input"
                  value={points}
                  onChange={(e) => setPoints(Number(e.target.value))}
                  className="w-full p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs font-mono text-[#251306] focus:bg-white focus:outline-none focus:border-[#D4621A]"
                />
              </div>
            </div>

            {/* Options A, B, C, D */}
            <div className="space-y-3 pt-2">
              <label className="block text-xs font-mono uppercase font-bold text-stone-600">
                Response Choices & Correct Answer Key
              </label>

              {options.map((opt, i) => {
                const isCorrect = correctOption === opt.optionKey;
                return (
                  <div key={opt.optionKey} className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setCorrectOption(opt.optionKey)}
                      className={`w-10 h-10 rounded-xl font-mono font-bold flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                        isCorrect
                          ? 'bg-[#D4621A] text-white shadow-md'
                          : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                      }`}
                    >
                      {opt.optionKey}
                    </button>

                    <input
                      type="text"
                      aria-label={`Option ${opt.optionKey} Text`}
                      value={opt.optionText}
                      onChange={(e) => {
                        const next = [...options];
                        next[i].optionText = e.target.value;
                        setOptions(next);
                      }}
                      className={`flex-1 p-3 rounded-xl border text-xs font-mono transition-all ${
                        isCorrect
                          ? 'bg-orange-50/50 border-[#D4621A]'
                          : 'bg-stone-50 border-stone-200 focus:bg-white focus:border-[#D4621A]'
                      }`}
                    />

                    <span className="text-[11px] font-mono text-stone-400 w-16 text-right">
                      {isCorrect ? 'Correct' : ''}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Save Button */}
            <div className="pt-4 flex items-center justify-end gap-3 border-t border-stone-100">
              <button
                type="button"
                onClick={handleSaveQuestion}
                className="px-6 py-3 rounded-2xl bg-[#D4621A] hover:bg-[#b85214] text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-md transition-all cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Save Question to Bank</span>
              </button>
            </div>
          </fieldset>
        </div>

      </div>

      {/* JSON Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-xl w-full border border-orange-200 shadow-2xl space-y-4">
            <h3 className="text-xl font-bold text-[#251306]">Import Quiz Package (JSON)</h3>
            <p className="text-xs font-mono text-stone-600">
              Paste a valid Quiz Package or Questions Array matching <code>QUIZ_FORMAT_SPEC.md</code>.
            </p>

            <textarea
              rows={10}
              aria-label="JSON Package Payload"
              value={importJsonText}
              onChange={(e) => setImportJsonText(e.target.value)}
              className="w-full p-3 font-mono text-xs rounded-xl bg-stone-50 border border-stone-300 focus:outline-none focus:border-[#D4621A]"
            />

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 rounded-xl border border-stone-300 font-mono text-xs font-bold text-stone-700 hover:bg-stone-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleImportJson}
                className="px-5 py-2 rounded-xl bg-[#D4621A] text-white font-mono text-xs font-bold uppercase hover:bg-[#b85214] cursor-pointer"
              >
                Validate & Import
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
