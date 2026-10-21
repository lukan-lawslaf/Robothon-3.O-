import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  quizService,
  Quiz,
  Question,
  AdminQuestion,
  TemporaryLeaderboardRow,
  Attempt
} from '../../services/quizService';
import { useAccount, isAdmin } from '../../services/authService';
import {
  FileText,
  Sliders,
  Tv,
  Activity,
  Award,
  Play,
  RotateCcw,
  CheckCircle2,
  Clock,
  ArrowRight,
  AlertTriangle,
  Lock,
  Pause,
  Edit2,
  UserX,
  PlusCircle,
  HelpCircle,
  Radio,
  Layers,
  Sparkles,
  ExternalLink,
  Shield,
  Zap,
  CheckSquare
} from 'lucide-react';

export const AdminQuizzesPage: React.FC = () => {
  const account = useAccount();
  const navigate = useNavigate();

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [actionBusy, setActionBusy] = useState<string | null>(null);

  // Advanced Settings Modal State
  const [settingsQuiz, setSettingsQuiz] = useState<Quiz | null>(null);
  const [settingsMinutes, setSettingsMinutes] = useState<number>(30);
  const [settingsPerQuestion, setSettingsPerQuestion] = useState<number>(45);
  const [settingsPreQuizCountdown, setSettingsPreQuizCountdown] = useState<number>(10);
  const [settingsCutoff, setSettingsCutoff] = useState<number>(40);
  const [settingsQuestionCount, setSettingsQuestionCount] = useState<number>(0);
  const [settingsSaving, setSettingsSaving] = useState(false);

  // Redo Quiz Modal State
  const [redoQuizTarget, setRedoQuizTarget] = useState<Quiz | null>(null);
  const [redoConfirmed, setRedoConfirmed] = useState(false);

  // Finalize Confirmation Modal State
  const [finalizeQuizTarget, setFinalizeQuizTarget] = useState<Quiz | null>(null);

  // Validation Failure Modal State
  const [validationErrors, setValidationErrors] = useState<{ quizName: string; errors: string[] } | null>(null);

  // Adjudication Modal State
  const [adjQuiz, setAdjQuiz] = useState<Quiz | null>(null);
  const [adjLeaderboard, setAdjLeaderboard] = useState<TemporaryLeaderboardRow[]>([]);
  const [adjSelectedTeam, setAdjSelectedTeam] = useState<TemporaryLeaderboardRow | null>(null);
  const [adjScoreDelta, setAdjScoreDelta] = useState<number>(4);
  const [adjReason, setAdjReason] = useState<string>('');
  const [debarReason, setDebarReason] = useState<string>('');

  const fetchQuizzes = async () => {
    try {
      const res = await quizService.list(true);
      // Ensure exact ordering: quiz-1 (Elimination Round), then quiz-2 (Bonus Round)
      const sorted = (res.quizzes || []).sort((a, b) => {
        if (a.id === 'quiz-1') return -1;
        if (b.id === 'quiz-1') return 1;
        return a.id.localeCompare(b.id);
      });
      setQuizzes(sorted);
      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch quizzes from server.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuizzes();
    const unsubscribe = quizService.subscribe((event) => {
      fetchQuizzes();
      if (event?.type === 'QUIZ_STARTED') {
        setNotice('Quiz broadcast started! Stage timer and participant sessions are live.');
      } else if (event?.type === 'QUIZ_RESET') {
        setNotice('Quiz was reset to DRAFT. All previous attempts, answers, and scores have been wiped.');
      } else if (event?.type === 'QUALIFICATION_FINALIZED') {
        setNotice('Results finalized and permanently committed to the Global Leaderboard!');
      }
    });
    return () => unsubscribe();
  }, []);

  // 1. Mark Ready Handler with authoritative client+server validation
  const handleMarkReady = async (quiz: Quiz) => {
    setActionBusy(quiz.id);
    setError('');
    setNotice('');
    try {
      // Fetch current questions to validate
      const qRes = await quizService.adminQuestions(quiz.id);
      const questions = qRes.questions || [];
      const clientErrors: string[] = [];

      if (questions.length === 0) {
        clientErrors.push('Quiz contains 0 questions. Add at least 1 question in Question Builder.');
      } else {
        questions.forEach((q, idx) => {
          if (!q.questionText || !q.questionText.trim()) {
            clientErrors.push(`Question #${idx + 1} has empty question text.`);
          }
          if (!Array.isArray(q.options) || q.options.length < 2) {
            clientErrors.push(`Question #${idx + 1} requires at least 2 multiple choice options.`);
          } else {
            const keys = q.options.map(o => o.optionKey);
            if (!q.correctOption || !keys.includes(q.correctOption)) {
              clientErrors.push(`Question #${idx + 1} does not have a valid correct answer assigned.`);
            }
          }
          if (!q.points || q.points <= 0) {
            clientErrors.push(`Question #${idx + 1} must award positive points.`);
          }
        });
      }

      if (!quiz.durationSeconds || quiz.durationSeconds <= 0) {
        clientErrors.push('Total quiz duration must be greater than zero.');
      }

      if (quiz.id === 'quiz-1' && (!quiz.qualificationCount || quiz.qualificationCount < 1)) {
        clientErrors.push('Top-X qualification count must be at least 1.');
      }

      if (clientErrors.length > 0) {
        setValidationErrors({
          quizName: quiz.name,
          errors: clientErrors
        });
        setActionBusy(null);
        return;
      }

      // Authoritative backend call
      await quizService.control(quiz.id, 'ready');
      setNotice(`"${quiz.name}" validated and marked READY! You can now start the round.`);
      fetchQuizzes();
    } catch (err: any) {
      setError(err.message || 'Validation failed. Please verify question bank and settings.');
    } finally {
      setActionBusy(null);
    }
  };

  // 2. Start Quiz Handler
  const handleStartQuiz = (quiz: Quiz) => {
    // Quizzes can only be started from the Arena Stage Presenter View
    window.location.href = `/admin/quizzes/stage?quiz=${quiz.id}`;
  };

  // 3. Pause / Resume Handlers
  const handlePause = async (quiz: Quiz) => {
    setActionBusy(quiz.id);
    try {
      await quizService.control(quiz.id, 'pause');
      setNotice(`"${quiz.name}" has been PAUSED.`);
      fetchQuizzes();
    } catch (err: any) {
      setError(err.message || 'Failed to pause quiz.');
    } finally {
      setActionBusy(null);
    }
  };

  const handleResume = async (quiz: Quiz) => {
    setActionBusy(quiz.id);
    try {
      await quizService.control(quiz.id, 'resume');
      setNotice(`"${quiz.name}" has RESUMED.`);
      fetchQuizzes();
    } catch (err: any) {
      setError(err.message || 'Failed to resume quiz.');
    } finally {
      setActionBusy(null);
    }
  };

  // 4. End Quiz Handler
  const handleEndQuiz = async (quiz: Quiz) => {
    if (!window.confirm(`Are you sure you want to end "${quiz.name}"? Active contestant attempts will be automatically evaluated.`)) {
      return;
    }
    setActionBusy(quiz.id);
    try {
      await quizService.control(quiz.id, 'end');
      setNotice(`"${quiz.name}" has ended. Review interim results and apply adjustments before finalization.`);
      fetchQuizzes();
    } catch (err: any) {
      setError(err.message || 'Failed to end quiz.');
    } finally {
      setActionBusy(null);
    }
  };

  // 5. Redo Quiz Handler
  const handleConfirmRedo = async () => {
    if (!redoQuizTarget) return;
    setActionBusy(redoQuizTarget.id);
    try {
      await quizService.control(redoQuizTarget.id, 'redo');
      setNotice(`"${redoQuizTarget.name}" has been completely reset! Status returned to DRAFT.`);
      setRedoQuizTarget(null);
      setRedoConfirmed(false);
      fetchQuizzes();
    } catch (err: any) {
      setError(err.message || 'Failed to reset quiz.');
    } finally {
      setActionBusy(null);
    }
  };

  // 6. Finalize Quiz Handler
  const handleConfirmFinalize = async () => {
    if (!finalizeQuizTarget) return;
    setActionBusy(finalizeQuizTarget.id);
    try {
      await quizService.control(finalizeQuizTarget.id, 'finalize');
      setNotice(`"${finalizeQuizTarget.name}" is FINALIZED! Official scores have been permanently committed to the Global Leaderboard.`);
      setFinalizeQuizTarget(null);
      fetchQuizzes();
    } catch (err: any) {
      setError(err.message || 'Failed to finalize quiz.');
    } finally {
      setActionBusy(null);
    }
  };

  // 7. Open Advanced Settings
  const handleOpenSettings = async (quiz: Quiz) => {
    setSettingsQuiz(quiz);
    setSettingsMinutes(Math.round((quiz.durationSeconds || 1800) / 60));
    setSettingsPerQuestion(quiz.perQuestionSeconds || 45);
    setSettingsPreQuizCountdown(quiz.preQuizCountdownSeconds || 10);
    setSettingsCutoff(quiz.qualificationCount ?? 40);
    try {
      const qRes = await quizService.adminQuestions(quiz.id);
      setSettingsQuestionCount(qRes.questions?.length || 0);
    } catch {
      setSettingsQuestionCount(quiz.questionCount || 0);
    }
  };

  // 8. Save Advanced Settings
  const handleSaveSettings = async () => {
    if (!settingsQuiz) return;
    if (settingsMinutes <= 0 || (settingsQuiz.id === 'quiz-1' && settingsCutoff <= 0)) {
      setError('Please provide valid positive numbers for all configuration fields.');
      return;
    }
    setSettingsSaving(true);
    try {
      await quizService.updateConfig(settingsQuiz.id, {
        durationSeconds: settingsMinutes * 60,
        perQuestionSeconds: settingsPerQuestion,
        preQuizCountdownSeconds: settingsPreQuizCountdown,
        qualificationCount: settingsQuiz.id === 'quiz-1' ? settingsCutoff : settingsQuiz.qualificationCount,
        forceLiveEdit: true
      });
      setNotice(`Advanced settings updated for "${settingsQuiz.name}".`);
      setSettingsQuiz(null);
      fetchQuizzes();
    } catch (err: any) {
      setError(err.message || 'Failed to update settings.');
    } finally {
      setSettingsSaving(false);
    }
  };

  // 9. Quick Adjudication / Results Drawer
  const handleOpenAdjudication = async (quiz: Quiz) => {
    setAdjQuiz(quiz);
    setActionBusy(quiz.id);
    try {
      const res = await quizService.live(quiz.id);
      const rows = res.leaderboard?.leaderboard || [];
      setAdjLeaderboard(rows);
    } catch (err: any) {
      setError(err.message || 'Failed to load adjudication results.');
    } finally {
      setActionBusy(null);
    }
  };

  const handleApplyScoreAdjustment = async () => {
    if (!adjQuiz || !adjSelectedTeam) return;
    if (!adjReason.trim()) {
      setError('A mandatory reason is required for score audit compliance.');
      return;
    }
    setActionBusy('adjust');
    try {
      await quizService.adjustScore(adjQuiz.id, adjSelectedTeam.teamId, {
        score: adjSelectedTeam.score + adjScoreDelta,
        reason: adjReason.trim()
      });
      setNotice(`Score adjusted for team ${adjSelectedTeam.teamName} (+${adjScoreDelta} pts).`);
      setAdjSelectedTeam(null);
      setAdjReason('');
      // Refresh results
      handleOpenAdjudication(adjQuiz);
      fetchQuizzes();
    } catch (err: any) {
      setError(err.message || 'Failed to adjust score.');
    } finally {
      setActionBusy(null);
    }
  };

  const handleMoveToQualified = async (team: TemporaryLeaderboardRow, targetStatus: 'QUALIFIED' | 'AUTO' = 'QUALIFIED') => {
    if (!adjQuiz) return;
    try {
      setActionBusy('qualify');
      setError('');
      await quizService.qualifyTeam(adjQuiz.id, team.teamId, {
        status: targetStatus,
        reason: targetStatus === 'QUALIFIED' ? 'Promoted to qualified by Admin prior to finalization' : 'Reset manual qualification override'
      });
      handleOpenAdjudication(adjQuiz);
    } catch (err: any) {
      setError(err.message || 'Failed to update qualification status.');
    } finally {
      setActionBusy(null);
    }
  };

  const handleToggleDebarment = async (team: TemporaryLeaderboardRow) => {
    if (!adjQuiz) return;
    const isDebarred = team.debarred;
    const confirmMsg = isDebarred
      ? `Reinstate team "${team.teamName}" back into active competition?`
      : `DEBAR team "${team.teamName}"? Debarred teams cannot qualify and will not consume a Top-X qualification slot.`;
    if (!window.confirm(confirmMsg)) return;

    setActionBusy('debar');
    try {
      await quizService.debarTeam(adjQuiz.id, team.teamId, {
        debar: !isDebarred,
        reason: debarReason.trim() || (isDebarred ? 'Organizer reinstated team.' : 'Debarred for competition rules infraction.')
      });
      setNotice(`Team "${team.teamName}" status updated.`);
      handleOpenAdjudication(adjQuiz);
      fetchQuizzes();
    } catch (err: any) {
      setError(err.message || 'Failed to toggle debarment.');
    } finally {
      setActionBusy(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1.5 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            DRAFT (NOT READY)
          </span>
        );
      case 'READY':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-blue-100 text-blue-800 border border-blue-300 flex items-center gap-1.5 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
            READY TO START
          </span>
        );
      case 'LIVE':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-600 text-white flex items-center gap-1.5 shadow-md">
            <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
            LIVE IN ARENA
          </span>
        );
      case 'PAUSED':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-orange-100 text-orange-800 border border-orange-300 flex items-center gap-1.5 shadow-xs">
            <Pause className="w-3 h-3 text-orange-600" />
            PAUSED
          </span>
        );
      case 'RESULTS':
      case 'ENDED':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-purple-100 text-purple-900 border border-purple-300 flex items-center gap-1.5 shadow-xs">
            <Award className="w-3 h-3 text-purple-700" />
            RESULTS REVIEW
          </span>
        );
      case 'FINALIZED':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-stone-900 text-emerald-400 border border-emerald-500/40 flex items-center gap-1.5 shadow-xs">
            <Lock className="w-3 h-3 text-emerald-400" />
            FINALIZED & COMMITTED
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-stone-100 text-stone-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 text-[#251306]">
      {/* Top Breadcrumb & Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-[#F4AE52]/30">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#251306]">
            Quiz Management
          </h1>
          <p className="text-xs text-stone-600 font-mono mt-1">
            Configure round timings, question banks, and presenter controls.
          </p>
        </div>

        {/* Global Quick Action Links */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to="/leaderboard"
            target="_blank"
            rel="noreferrer"
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-stone-50 text-stone-800 border border-stone-300 font-mono text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all"
          >
            <ExternalLink className="w-3.5 h-3.5 text-stone-500" />
            <span>Public Leaderboard</span>
          </Link>
          <Link
            to="/admin-dashboard"
            className="px-3.5 py-2 rounded-xl bg-[#251306] hover:bg-[#3a1d08] text-white font-mono text-xs font-bold flex items-center gap-1.5 shadow transition-all"
          >
            <ArrowRight className="w-3.5 h-3.5 text-orange-400 rotate-180" />
            <span>Main Admin Dashboard</span>
          </Link>
        </div>
      </div>

      {/* Realtime Alert Banners */}
      {error && (
        <div className="mt-4 p-4 rounded-2xl bg-red-50 text-red-800 border border-red-300 text-xs font-mono flex items-start justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError('')}
            className="text-red-500 hover:text-red-700 font-bold text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {notice && (
        <div className="mt-4 p-4 rounded-2xl bg-emerald-50 text-emerald-900 border border-emerald-300 text-xs font-mono flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{notice}</span>
          </div>
          <button
            onClick={() => setNotice('')}
            className="text-emerald-700 hover:text-emerald-900 font-bold text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Quizzes Loading */}
      {loading && (
        <div className="mt-12 text-center py-16 rounded-3xl bg-white border border-[#F4AE52]/30 shadow-xs">
          <div className="w-8 h-8 border-3 border-[#D4621A] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-mono text-stone-500 mt-3">Connecting to authoritative quiz store...</p>
        </div>
      )}

      {/* TWO Authoritative Quiz Cards Grid */}
      {!loading && (
        <div className="mt-8 space-y-8">
          {quizzes.map((quiz, index) => {
            const isElimination = quiz.id === 'quiz-1' || quiz.type === 'ELIMINATION';
            const isLive = quiz.status === 'LIVE';
            const isPaused = quiz.status === 'PAUSED';
            const isReady = quiz.status === 'READY';
            const isDraft = quiz.status === 'DRAFT';
            const isEnded = quiz.status === 'RESULTS' || (quiz.status as string) === 'ENDED';
            const isFinalized = quiz.status === 'FINALIZED';

            return (
              <div
                key={quiz.id}
                className={`rounded-3xl border transition-all overflow-hidden shadow-md ${
                  isLive
                    ? 'border-emerald-500 bg-white ring-2 ring-emerald-500/20'
                    : isFinalized
                    ? 'border-stone-800 bg-white'
                    : 'border-[#F4AE52]/40 bg-white'
                }`}
              >
                {/* Quiz Card Header */}
                <div className="p-6 sm:p-7 border-b border-[#F4AE52]/20 bg-gradient-to-r from-stone-50/80 via-white to-orange-50/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5">
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-extrabold uppercase tracking-wider bg-[#251306] text-[#FEF3E2]">
                        Round {index + 1}
                      </span>
                      <span className="text-xs font-mono font-semibold text-[#D4621A]">
                        {isElimination ? 'Main Elimination & Qualification' : 'Bonus Component Round'}
                      </span>
                      <span className="text-xs text-stone-300">•</span>
                      <span className="text-[11px] font-mono text-stone-500">ID: {quiz.id}</span>
                    </div>

                    <h2 className="text-2xl font-black tracking-tight text-[#251306]">
                      {quiz.name}
                    </h2>
                    <p className="text-xs text-stone-600 font-mono">
                      {isElimination
                        ? 'Contestant qualification round. Top teams advance to Boat Trials according to the authoritative cut-off ranking.'
                        : 'Bonus round awarding supplementary component points to the Robothon overall leaderboard.'}
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    {getStatusBadge(quiz.status)}
                  </div>
                </div>

                {/* Configuration Metrics Matrix */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 p-5 sm:p-6 bg-stone-50/60 border-b border-stone-200/60 text-xs font-mono">
                  <div className="p-3.5 rounded-2xl bg-white border border-stone-200 shadow-xs">
                    <span className="text-stone-400 uppercase text-[10px] font-bold block mb-1">
                      Question Bank
                    </span>
                    <span className="text-lg font-bold text-[#251306]">
                      {quiz.questionCount ?? 0} Questions
                    </span>
                    <span className="text-[10px] text-stone-500 block mt-0.5">MCQ Format</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white border border-stone-200 shadow-xs">
                    <span className="text-stone-400 uppercase text-[10px] font-bold block mb-1">
                      Total Duration
                    </span>
                    <span className="text-lg font-bold text-[#251306]">
                      {Math.round((quiz.durationSeconds || 1800) / 60)} Mins
                    </span>
                    <span className="text-[10px] text-stone-500 block mt-0.5">
                      {quiz.durationSeconds}s Server Timer
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white border border-stone-200 shadow-xs">
                    <span className="text-stone-400 uppercase text-[10px] font-bold block mb-1">
                      Per Question Time
                    </span>
                    <span className="text-lg font-bold text-[#251306]">
                      {quiz.stageState?.remainingSeconds || 45}s
                    </span>
                    <span className="text-[10px] text-stone-500 block mt-0.5">Authoritative stage tick</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white border border-stone-200 shadow-xs">
                    <span className="text-stone-400 uppercase text-[10px] font-bold block mb-1">
                      Scoring Rules
                    </span>
                    <span className="text-lg font-bold text-emerald-700">
                      +{quiz.pointsPerCorrect ?? 4} pts
                    </span>
                    <span className="text-[10px] text-stone-500 block mt-0.5">0 pts for incorrect (No Negatives)</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white border border-stone-200 shadow-xs col-span-2 sm:col-span-1">
                    <span className="text-stone-400 uppercase text-[10px] font-bold block mb-1">
                      {isElimination ? 'Qualification Cutoff' : 'Leaderboard Impact'}
                    </span>
                    <span className="text-lg font-bold text-[#D4621A]">
                      {isElimination ? `Top ${quiz.qualificationCount ?? 40}` : 'Bonus Points'}
                    </span>
                    <span className="text-[10px] text-stone-500 block mt-0.5">
                      {isElimination ? 'Dynamic cutoff threshold' : 'Contributes to total'}
                    </span>
                  </div>
                </div>

                {/* Operations & Action Controls */}
                <div className="p-6 sm:p-7 flex flex-wrap items-center justify-between gap-4">
                  {/* Primary Workflow Actions (State-Driven) */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    {/* DRAFT STATE */}
                    {isDraft && (
                      <>
                        <button
                          type="button"
                          disabled={actionBusy === quiz.id}
                          onClick={() => handleMarkReady(quiz)}
                          className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-50"
                        >
                          <CheckSquare className="w-4 h-4" />
                          <span>Mark Ready</span>
                        </button>
                        <Link
                          to={`/admin/quizzes/builder?quiz=${quiz.id}`}
                          className="px-4 py-2.5 rounded-xl bg-white hover:bg-stone-50 text-stone-800 border border-stone-300 font-mono text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all"
                        >
                          <FileText className="w-4 h-4 text-stone-500" />
                          <span>Manage Questions</span>
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleOpenSettings(quiz)}
                          className="px-4 py-2.5 rounded-xl bg-white hover:bg-stone-50 text-stone-800 border border-stone-300 font-mono text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                        >
                          <Sliders className="w-4 h-4 text-stone-500" />
                          <span>Advanced Settings</span>
                        </button>
                      </>
                    )}

                    {/* READY STATE */}
                    {isReady && (
                      <>
                        <Link
                          to={`/admin/quizzes/stage?quiz=${quiz.id}`}
                          className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
                        >
                          <Tv className="w-4 h-4 text-white" />
                          <span>Launch Presenter to Start &rarr;</span>
                        </Link>
                        <Link
                          to={`/admin/quizzes/builder?quiz=${quiz.id}`}
                          className="px-4 py-2.5 rounded-xl bg-white hover:bg-stone-50 text-stone-800 border border-stone-300 font-mono text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all"
                        >
                          <FileText className="w-4 h-4 text-stone-500" />
                          <span>Edit Questions</span>
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleOpenSettings(quiz)}
                          className="px-4 py-2.5 rounded-xl bg-white hover:bg-stone-50 text-stone-800 border border-stone-300 font-mono text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                        >
                          <Sliders className="w-4 h-4 text-stone-500" />
                          <span>Advanced Settings</span>
                        </button>
                      </>
                    )}

                    {/* LIVE STATE */}
                    {isLive && (
                      <>
                        <button
                          type="button"
                          disabled={actionBusy === quiz.id}
                          onClick={() => handlePause(quiz)}
                          className="px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-mono text-xs font-bold uppercase flex items-center gap-1.5 shadow transition-all cursor-pointer"
                        >
                          <Pause className="w-4 h-4" />
                          <span>Pause Quiz</span>
                        </button>
                        <button
                          type="button"
                          disabled={actionBusy === quiz.id}
                          onClick={() => handleEndQuiz(quiz)}
                          className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-mono text-xs font-bold uppercase flex items-center gap-1.5 shadow transition-all cursor-pointer"
                        >
                          <Award className="w-4 h-4" />
                          <span>End Quiz</span>
                        </button>
                        <Link
                          to={`/admin/quizzes/stage?quiz=${quiz.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-4 py-2.5 rounded-xl bg-[#251306] hover:bg-[#3a1d08] text-white font-mono text-xs font-bold flex items-center gap-1.5 shadow transition-all"
                        >
                          <Tv className="w-4 h-4 text-amber-400" />
                          <span>Stage Presenter</span>
                        </Link>
                        <Link
                          to={`/admin/quizzes/live?quiz=${quiz.id}`}
                          className="px-4 py-2.5 rounded-xl bg-white hover:bg-stone-50 text-stone-800 border border-stone-300 font-mono text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all"
                        >
                          <Activity className="w-4 h-4 text-emerald-600" />
                          <span>Live Telemetry</span>
                        </Link>
                      </>
                    )}

                    {/* PAUSED STATE */}
                    {isPaused && (
                      <>
                        <button
                          type="button"
                          disabled={actionBusy === quiz.id}
                          onClick={() => handleResume(quiz)}
                          className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-xs font-bold uppercase flex items-center gap-1.5 shadow transition-all cursor-pointer"
                        >
                          <Play className="w-4 h-4 fill-white" />
                          <span>Resume Quiz</span>
                        </button>
                        <button
                          type="button"
                          disabled={actionBusy === quiz.id}
                          onClick={() => handleEndQuiz(quiz)}
                          className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-mono text-xs font-bold uppercase flex items-center gap-1.5 shadow transition-all cursor-pointer"
                        >
                          <Award className="w-4 h-4" />
                          <span>End Quiz</span>
                        </button>
                        <Link
                          to={`/admin/quizzes/stage?quiz=${quiz.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-4 py-2.5 rounded-xl bg-[#251306] text-white font-mono text-xs font-bold flex items-center gap-1.5 shadow"
                        >
                          <Tv className="w-4 h-4 text-amber-400" />
                          <span>Stage Presenter</span>
                        </Link>
                      </>
                    )}

                    {/* RESULTS / ENDED STATE */}
                    {isEnded && (
                      <>
                        <Link
                          to={`/admin/quizzes/results?quiz=${quiz.id}`}
                          className="px-4 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-mono text-xs font-bold uppercase flex items-center gap-1.5 shadow transition-all"
                        >
                          <Award className="w-4 h-4" />
                          <span>Results & Adjudication</span>
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleOpenAdjudication(quiz)}
                          className="px-4 py-2.5 rounded-xl bg-white hover:bg-stone-50 text-stone-800 border border-stone-300 font-mono text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4 text-purple-600" />
                          <span>Adjust Points / Debar</span>
                        </button>
                        <button
                          type="button"
                          disabled={actionBusy === quiz.id}
                          onClick={() => setFinalizeQuizTarget(quiz)}
                          className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
                        >
                          <Lock className="w-4 h-4" />
                          <span>Finalize Results</span>
                        </button>
                        <Link
                          to={`/admin/quizzes/stage?quiz=${quiz.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-mono text-xs font-bold flex items-center gap-1.5 transition-all"
                        >
                          <Tv className="w-4 h-4 text-stone-600" />
                          <span>Stage Presenter</span>
                        </Link>
                      </>
                    )}

                    {/* FINALIZED STATE */}
                    {isFinalized && (
                      <>
                        <Link
                          to={`/admin/quizzes/results?quiz=${quiz.id}`}
                          className="px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-black text-white font-mono text-xs font-bold flex items-center gap-1.5 shadow transition-all"
                        >
                          <Award className="w-4 h-4 text-emerald-400" />
                          <span>View Final Audited Results</span>
                        </Link>
                        <Link
                          to="/leaderboard"
                          target="_blank"
                          rel="noreferrer"
                          className="px-4 py-2.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-300 font-mono text-xs font-bold flex items-center gap-1.5 shadow-xs"
                        >
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Committed on Global Leaderboard</span>
                        </Link>
                      </>
                    )}
                  </div>

                  {/* Redo Quiz Action (Available at all states, protected by confirmation) */}
                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        setRedoQuizTarget(quiz);
                        setRedoConfirmed(false);
                      }}
                      className="px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-mono text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Redo Quiz</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: ADVANCED SETTINGS */}
      {settingsQuiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-stone-200 space-y-6 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-stone-200">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#D4621A] font-bold">
                  Round Settings & Formula
                </span>
                <h3 className="text-xl font-bold text-[#251306]">
                  Advanced Settings: {settingsQuiz.name}
                </h3>
              </div>
              <button
                onClick={() => setSettingsQuiz(null)}
                className="text-stone-400 hover:text-stone-700 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 font-mono text-xs">
              {/* Total Quiz Time */}
              <div>
                <label className="block text-stone-700 font-bold mb-1">
                  Total Quiz Duration (Minutes)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="180"
                    value={settingsMinutes}
                    onChange={(e) => setSettingsMinutes(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-[#D4621A] text-sm font-sans"
                  />
                  <span className="text-stone-500 text-xs shrink-0">= {settingsMinutes * 60} seconds</span>
                </div>
                <p className="text-[11px] text-stone-500 mt-1">Authoritative maximum deadline for this round.</p>
              </div>

              {/* Per-Question Countdown */}
              <div>
                <label className="block text-stone-700 font-bold mb-1">
                  Per-Question Countdown (Seconds)
                </label>
                <input
                  type="number"
                  min="10"
                  max="300"
                  value={settingsPerQuestion}
                  onChange={(e) => setSettingsPerQuestion(Math.max(5, parseInt(e.target.value) || 30))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-[#D4621A] text-sm font-sans"
                />
                <p className="text-[11px] text-stone-500 mt-1">Answering window per question on presenter and leader screens.</p>
              </div>

              {/* Pre-Quiz Countdown Timer */}
              <div>
                <label className="block text-stone-700 font-bold mb-1">
                  Pre-Quiz Countdown Timer (Seconds)
                </label>
                <input
                  type="number"
                  min="3"
                  max="60"
                  value={settingsPreQuizCountdown}
                  onChange={(e) => setSettingsPreQuizCountdown(Math.max(3, parseInt(e.target.value) || 10))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-[#D4621A] text-sm font-sans"
                />
                <p className="text-[11px] text-stone-500 mt-1">Get-ready countdown timer before Question 1 begins.</p>
              </div>

              {/* Timing Calculation Relationship Callout */}
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-amber-900 block flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-[#D4621A]" />
                  Authoritative Timing Calculation
                </span>
                <p className="text-stone-800 text-[11px]">
                  <strong>Question Bank:</strong> {settingsQuestionCount} questions × {settingsPerQuestion}s ={' '}
                  <span className="text-[#D4621A] font-bold">
                    {settingsQuestionCount * settingsPerQuestion} seconds
                  </span>{' '}
                  ({((settingsQuestionCount * settingsPerQuestion) / 60).toFixed(1)} mins)
                </p>
                <p className="text-stone-600 text-[10px]">
                  Configured total quiz duration: <strong>{settingsMinutes} mins</strong> ({settingsMinutes * 60}s).
                  The server timer ensures contestants have sufficient total time to complete all stages.
                </p>
              </div>



              {/* Top-X Cutoff (Quiz 1 Only) */}
              {settingsQuiz.id === 'quiz-1' && (
                <div>
                  <label className="block text-stone-700 font-bold mb-1">
                    Top-X Qualification Cutoff
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={settingsCutoff}
                    onChange={(e) => setSettingsCutoff(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-[#D4621A] text-sm font-sans"
                  />
                  <p className="text-[11px] text-stone-500 mt-1">
                    Top {settingsCutoff} non-debarred teams qualify for advancement. Debarred teams do not consume a slot.
                  </p>
                </div>
              )}

              {/* Negative Marking Rule Notice */}
              <div className="p-3.5 rounded-xl bg-stone-100 border border-stone-200 text-[11px] text-stone-600 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  <strong>Negative Marking Disabled:</strong> Robothon rules strictly award 0 points for incorrect answers.
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200">
              <button
                type="button"
                onClick={() => setSettingsQuiz(null)}
                className="px-4 py-2.5 rounded-xl border border-stone-300 text-stone-700 font-mono text-xs font-bold hover:bg-stone-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={settingsSaving}
                onClick={handleSaveSettings}
                className="px-5 py-2.5 rounded-xl bg-[#D4621A] hover:bg-[#b85214] text-white font-mono text-xs font-bold uppercase shadow cursor-pointer disabled:opacity-50"
              >
                {settingsSaving ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: REDO QUIZ CONFIRMATION */}
      {redoQuizTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-red-200 space-y-6 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-2xl bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-red-500 font-bold">
                  Administrative Reset Warning
                </span>
                <h3 className="text-xl font-bold text-[#251306]">
                  Redo {redoQuizTarget.name}?
                </h3>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs font-mono text-red-950 space-y-2">
              <p className="font-bold">
                This will genuinely reset all live competition data for this round:
              </p>
              <ul className="list-disc list-inside space-y-1 text-red-900 text-[11px]">
                <li>All contestant attempts and submitted answers will be deleted.</li>
                <li>All live quiz scores will be reset to 0.</li>
                <li>Qualification statuses and debarments from this run will be cleared.</li>
                <li>Server timers and timestamps will be reset.</li>
                <li>
                  The quiz will return to <strong>DRAFT / NOT READY</strong> state.
                </li>
                <li>
                  You must explicitly press <strong>MARK READY</strong> again before it can be started.
                </li>
              </ul>
              <p className="text-[10px] text-red-700 pt-1">
                Note: Teams, user accounts, and hardware checkpoints remain completely safe.
              </p>
            </div>

            <label className="flex items-start gap-2.5 cursor-pointer font-mono text-xs text-stone-700">
              <input
                type="checkbox"
                checked={redoConfirmed}
                onChange={(e) => setRedoConfirmed(e.target.checked)}
                className="mt-0.5 rounded text-red-600 focus:ring-red-500"
              />
              <span>
                I understand this will destroy all live run data and return {redoQuizTarget.name} to DRAFT.
              </span>
            </label>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200">
              <button
                type="button"
                onClick={() => {
                  setRedoQuizTarget(null);
                  setRedoConfirmed(false);
                }}
                className="px-4 py-2.5 rounded-xl border border-stone-300 text-stone-700 font-mono text-xs font-bold hover:bg-stone-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!redoConfirmed || actionBusy === redoQuizTarget.id}
                onClick={handleConfirmRedo}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-mono text-xs font-bold uppercase tracking-wider shadow cursor-pointer disabled:opacity-40"
              >
                {actionBusy === redoQuizTarget.id ? 'Resetting...' : 'Confirm Redo & Reset to DRAFT'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: FINALIZE CONFIRMATION */}
      {finalizeQuizTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-stone-200 space-y-6 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center gap-3 text-emerald-600">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-600 font-bold">
                  Permanent Leaderboard Commit
                </span>
                <h3 className="text-xl font-bold text-[#251306]">
                  Finalize {finalizeQuizTarget.name}?
                </h3>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 text-xs font-mono text-stone-800 space-y-2">
              <p className="font-semibold text-stone-900">
                Finalizing will execute the following irreversible operations:
              </p>
              <ul className="list-disc list-inside space-y-1 text-stone-700 text-[11px]">
                <li>Calculate official final standings and apply audited point adjustments.</li>
                <li>Exclude all debarred teams from consuming qualification slots.</li>
                <li>
                  Designate Top {finalizeQuizTarget.qualificationCount || 40} teams as <strong>QUALIFIED</strong>.
                </li>
                <li>
                  Permanently commit quiz points to the <strong>Global Robothon Leaderboard</strong>.
                </li>
                <li>Lock ordinary point adjustments and debarments.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200">
              <button
                type="button"
                onClick={() => setFinalizeQuizTarget(null)}
                className="px-4 py-2.5 rounded-xl border border-stone-300 text-stone-700 font-mono text-xs font-bold hover:bg-stone-50 cursor-pointer"
              >
                Review Results First
              </button>
              <button
                type="button"
                disabled={actionBusy === finalizeQuizTarget.id}
                onClick={handleConfirmFinalize}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-xs font-bold uppercase tracking-wider shadow cursor-pointer disabled:opacity-50"
              >
                {actionBusy === finalizeQuizTarget.id ? 'Finalizing...' : 'Commit & Finalize'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: MARK READY VALIDATION ERRORS BANNER */}
      {validationErrors && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-amber-300 space-y-5 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center gap-3 text-amber-700">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-amber-600 font-bold">
                  Validation Requirements Missing
                </span>
                <h3 className="text-xl font-bold text-[#251306]">
                  Cannot Mark "{validationErrors.quizName}" Ready
                </h3>
              </div>
            </div>

            <p className="text-xs font-mono text-stone-600">
              Before a round can transition to READY, the following validation rules must be satisfied:
            </p>

            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 max-h-60 overflow-y-auto space-y-1.5 text-xs font-mono text-amber-950">
              {validationErrors.errors.map((err, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-amber-600 font-bold">•</span>
                  <span>{err}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-200">
              <button
                type="button"
                onClick={() => setValidationErrors(null)}
                className="px-5 py-2.5 rounded-xl bg-[#D4621A] hover:bg-[#b85214] text-white font-mono text-xs font-bold uppercase tracking-wider shadow cursor-pointer"
              >
                Understood, I will fix them
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: RESULTS AUDIT & ADJUDICATION QUICK DRAWER */}
      {adjQuiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl border border-stone-200 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-stone-200">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-purple-700 font-bold">
                  Adjudication Console
                </span>
                <h3 className="text-2xl font-bold text-[#251306]">
                  Results Review & Adjustments: {adjQuiz.name}
                </h3>
                <p className="text-xs text-stone-500 font-mono mt-0.5">
                  Adjust points with compliance audit reasons or debar teams prior to finalization.
                </p>
              </div>
              <button
                onClick={() => {
                  setAdjQuiz(null);
                  setAdjSelectedTeam(null);
                }}
                className="text-stone-400 hover:text-stone-700 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Selected Team Score Adjustment Form */}
            {adjSelectedTeam && (
              <div className="p-5 rounded-2xl bg-purple-50 border border-purple-200 space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-purple-950">
                    Adjust Score for: {adjSelectedTeam.teamName} (Current: {adjSelectedTeam.score} pts)
                  </span>
                  <button
                    onClick={() => setAdjSelectedTeam(null)}
                    className="text-stone-400 hover:text-stone-700 text-xs font-bold"
                  >
                    Cancel
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-stone-700 font-bold mb-1">
                      Point Delta (Positive or Negative)
                    </label>
                    <input
                      type="number"
                      value={adjScoreDelta}
                      onChange={(e) => setAdjScoreDelta(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-purple-200 focus:outline-none"
                    />
                    <span className="text-[10px] text-stone-500 mt-1 block">
                      Resulting score will be: {adjSelectedTeam.score + adjScoreDelta} pts
                    </span>
                  </div>

                  <div>
                    <label className="block text-stone-700 font-bold mb-1">
                      Mandatory Audit Reason
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Organizer correction, hardware rule penalty"
                      value={adjReason}
                      onChange={(e) => setAdjReason(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-purple-200 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleApplyScoreAdjustment}
                    className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs uppercase"
                  >
                    Commit Adjustment Audit Record
                  </button>
                </div>
              </div>
            )}

            {/* Standings Table */}
            <div className="overflow-x-auto rounded-2xl border border-stone-200">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-stone-50 text-stone-600 uppercase text-[10px] font-bold border-b border-stone-200">
                  <tr>
                    <th className="py-3 px-4">Rank</th>
                    <th className="py-3 px-4">Team</th>
                    <th className="py-3 px-4">Score</th>
                    <th className="py-3 px-4">Answers</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Adjudication Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {adjLeaderboard.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-stone-400">
                        No team attempts recorded yet for this round.
                      </td>
                    </tr>
                  ) : (
                    adjLeaderboard.map((row, idx) => {
                      const cutoff = adjQuiz.qualificationCount || 40;
                      const isCutoffLine = adjQuiz.id === 'quiz-1' && idx + 1 === cutoff;

                      return (
                        <React.Fragment key={row.teamId}>
                          <tr
                            className={`hover:bg-stone-50/80 transition-colors ${
                              row.debarred
                                ? 'bg-red-50/50 text-red-900'
                                : row.qualificationStatus === 'QUALIFIED'
                                ? 'bg-emerald-50/30'
                                : ''
                            }`}
                          >
                            <td className="py-3 px-4 font-bold">#{row.rank}</td>
                            <td className="py-3 px-4 font-semibold text-stone-900">
                              {row.teamName}
                              {row.debarred && (
                                <span className="ml-2 px-2 py-0.5 rounded text-[9px] font-bold bg-red-600 text-white">
                                  DEBARRED
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 font-bold text-[#D4621A]">{row.score} pts</td>
                            <td className="py-3 px-4 text-stone-500">{row.answeredCount ?? '—'}</td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  row.qualificationStatus === 'QUALIFIED'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : row.qualificationStatus === 'ELIMINATED'
                                    ? 'bg-stone-200 text-stone-700'
                                    : row.debarred
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {row.qualificationStatus || 'PENDING'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right space-x-2">
                              {adjQuiz.status !== 'FINALIZED' ? (
                                <>
                                  {!row.debarred && (
                                    <button
                                      type="button"
                                      disabled={actionBusy === 'qualify'}
                                      onClick={() => handleMoveToQualified(row, row.qualificationStatus === 'QUALIFIED' ? 'AUTO' : 'QUALIFIED')}
                                      className={`px-2.5 py-1 rounded-lg font-bold text-[10px] cursor-pointer border ${
                                        row.qualificationStatus === 'QUALIFIED'
                                          ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                                          : 'bg-emerald-600 text-white hover:bg-emerald-700 border-emerald-600'
                                      }`}
                                      title={row.qualificationStatus === 'QUALIFIED' ? 'Reset back to automatic cutoff' : 'Move eliminated team to qualified'}
                                    >
                                      {row.qualificationStatus === 'QUALIFIED' ? 'Revert Auto' : 'Move to Qualified'}
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setAdjSelectedTeam(row);
                                      setAdjScoreDelta(4);
                                    }}
                                    className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-[10px] cursor-pointer"
                                  >
                                    Adjust Points
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleDebarment(row)}
                                    className={`px-2.5 py-1 rounded-lg font-bold text-[10px] cursor-pointer ${
                                      row.debarred
                                        ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800'
                                        : 'bg-red-100 hover:bg-red-200 text-red-800'
                                    }`}
                                  >
                                    {row.debarred ? 'Reinstate' : 'Debar'}
                                  </button>
                                </>
                              ) : (
                                <span className="text-[10px] text-stone-400 font-mono">Locked</span>
                              )}
                            </td>
                          </tr>

                          {/* Cutoff Marker Row for Quiz 1 */}
                          {isCutoffLine && (
                            <tr className="bg-amber-100/60 font-bold text-[10px] text-amber-900">
                              <td colSpan={6} className="py-1.5 px-4 text-center tracking-widest uppercase">
                                ——— ADVANCEMENT CUTOFF: TOP {cutoff} QUALIFY FOR BOAT TRIALS ———
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-stone-200">
              <Link
                to={`/admin/quizzes/results?quiz=${adjQuiz.id}`}
                className="text-xs font-mono font-bold text-[#D4621A] hover:underline flex items-center gap-1"
              >
                <span>Open Full-Screen Adjudication Page</span>
                <span>&rarr;</span>
              </Link>
              <button
                type="button"
                onClick={() => setAdjQuiz(null)}
                className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-mono text-xs font-bold cursor-pointer"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default AdminQuizzesPage;
