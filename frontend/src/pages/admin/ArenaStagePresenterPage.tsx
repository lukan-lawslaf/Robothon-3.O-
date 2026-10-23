import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { quizService, Quiz, AdminQuestion, StageState, TemporaryLeaderboardRow } from '../../services/quizService';
import { useAccount } from '../../services/authService';
import { quizAudio } from '../../services/quizSounds';
import {
  Trophy,
  Maximize2,
  Minimize2,
  Play,
  SkipForward,
  Clock,
  CheckCircle2,
  Volume2,
  VolumeX,
  Users,
  Eye,
  Sparkles,
  Award,
  Sun,
  Moon
} from 'lucide-react';

interface OptionDef {
  key: string;
  shape: string;
  color: string;
  bgClass: string;
  hoverClass: string;
  glowClass: string;
  borderClass: string;
  svg: React.ReactNode;
}

const KAHOOT_OPTIONS: Record<string, OptionDef> = {
  A: {
    key: 'A',
    shape: 'Triangle',
    color: '#E21B3C',
    bgClass: 'bg-[#E21B3C]',
    hoverClass: 'hover:bg-[#C01432]',
    glowClass: 'ring-4 ring-[#E21B3C]/50 shadow-[0_0_30px_rgba(226,27,60,0.4)]',
    borderClass: 'border-[#B0132E]',
    svg: (
      <svg viewBox="0 0 24 24" className="w-8 h-8 fill-white drop-shadow">
        <polygon points="12 2, 22 21, 2 21" />
      </svg>
    )
  },
  B: {
    key: 'B',
    shape: 'Diamond',
    color: '#1368CE',
    bgClass: 'bg-[#1368CE]',
    hoverClass: 'hover:bg-[#0E52A4]',
    glowClass: 'ring-4 ring-[#1368CE]/50 shadow-[0_0_30px_rgba(19,104,206,0.4)]',
    borderClass: 'border-[#0E52A4]',
    svg: (
      <svg viewBox="0 0 24 24" className="w-8 h-8 fill-white drop-shadow">
        <polygon points="12 2, 22 12, 12 22, 2 12" />
      </svg>
    )
  },
  C: {
    key: 'C',
    shape: 'Circle',
    color: '#D89E00',
    bgClass: 'bg-[#D89E00]',
    hoverClass: 'hover:bg-[#AA7C00]',
    glowClass: 'ring-4 ring-[#D89E00]/50 shadow-[0_0_30px_rgba(216,158,0,0.4)]',
    borderClass: 'border-[#AA7C00]',
    svg: (
      <svg viewBox="0 0 24 24" className="w-8 h-8 fill-white drop-shadow">
        <circle cx="12" cy="12" r="10" />
      </svg>
    )
  },
  D: {
    key: 'D',
    shape: 'Square',
    color: '#26890C',
    bgClass: 'bg-[#26890C]',
    hoverClass: 'hover:bg-[#1C6609]',
    glowClass: 'ring-4 ring-[#26890C]/50 shadow-[0_0_30px_rgba(38,137,12,0.4)]',
    borderClass: 'border-[#1C6609]',
    svg: (
      <svg viewBox="0 0 24 24" className="w-8 h-8 fill-white drop-shadow">
        <rect x="3" y="3" width="18" height="18" rx="2" />
      </svg>
    )
  }
};

export const ArenaStagePresenterPage: React.FC = () => {
  const account = useAccount();
  const searchParams = new URLSearchParams(useLocation().search);
  const requestedQuizId = searchParams.get('quiz') || 'quiz-1';

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedQuizId, setSelectedQuizId] = useState(requestedQuizId);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<AdminQuestion[]>([]);
  const [stageState, setStageState] = useState<StageState>({
    stage: 'STANDBY',
    questionIndex: 0,
    remainingSeconds: 0
  });
  const [interimLeaderboard, setInterimLeaderboard] = useState<TemporaryLeaderboardRow[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [localTimer, setLocalTimer] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState('');
  const [isLightMode, setIsLightMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('robothon_presenter_light_mode') === 'true';
    } catch {
      return false;
    }
  });

  const toggleLightMode = () => {
    setIsLightMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('robothon_presenter_light_mode', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const timerRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const totalQuestionTimeRef = useRef<number>(30);

  const loadQuizData = async (qId: string) => {
    try {
      const catalog = await quizService.list(true);
      setQuizzes(catalog.quizzes);
      const target = catalog.quizzes.find(q => q.id === qId) || catalog.quizzes[0];
      if (!target) return;

      setSelectedQuizId(target.id);
      setQuiz(target);

      const [questionsRes, stageRes, lbRes] = await Promise.all([
        quizService.adminQuestions(target.id).catch(() => ({ questions: [] })),
        quizService.getStage(target.id).catch(() => ({ stageState: { stage: 'STANDBY', questionIndex: 0, remainingSeconds: 0 } as StageState })),
        quizService.leaderboard(target.id).catch(() => ({ leaderboard: [] as TemporaryLeaderboardRow[] }))
      ]);

      setQuestions(questionsRes.questions);
      setStageState(stageRes.stageState as StageState);
      setInterimLeaderboard(lbRes.leaderboard || []);
      setLocalTimer(stageRes.stageState?.remainingSeconds || 0);
      setIsRevealed(false);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  useEffect(() => {
    void loadQuizData(selectedQuizId);

    const unsubscribe = quizService.subscribe(async (event) => {
      try {
        if (event?.type === 'QUIZ_CONFIGURATION_UPDATED' || event?.payload?.quiz) {
          void loadQuizData(selectedQuizId);
        }
        if (event?.payload?.stageState) {
          setStageState(event.payload.stageState);
        } else {
          const stageRes = await quizService.getStage(selectedQuizId);
          setStageState(stageRes.stageState as StageState);
        }
        const lbRes = await quizService.leaderboard(selectedQuizId).catch(() => ({ leaderboard: [] as TemporaryLeaderboardRow[] }));
        setInterimLeaderboard(lbRes.leaderboard || []);
      } catch (err) {
        console.warn('Sync error in stage presenter:', err);
      }
    });

    return () => unsubscribe();
  }, [selectedQuizId]);

  const computeRemaining = useCallback((state: StageState): number => {
    if (state.endsAt) {
      const diff = Math.ceil((new Date(state.endsAt).getTime() - Date.now()) / 1000);
      return Math.max(0, diff);
    }
    return state.remainingSeconds || 0;
  }, []);

  const stageStateRef = useRef(stageState);
  useEffect(() => {
    stageStateRef.current = stageState;
  }, [stageState]);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    if (stageState.stage === 'COUNTDOWN' || (stageState.stage === 'QUESTION' && !isRevealed) || stageState.stage === 'LEADERBOARD') {
      const initial = computeRemaining(stageState);
      setLocalTimer(initial);

      let lastReportedSec = initial;
      timerRef.current = window.setInterval(() => {
        const remaining = computeRemaining(stageStateRef.current);
        setLocalTimer(remaining);

        if (remaining !== lastReportedSec) {
          lastReportedSec = remaining;
          if (stageStateRef.current.stage === 'QUESTION' && !isRevealed) {
            if (remaining <= 5 && remaining > 0) {
              quizAudio.playUrgentTick();
            } else if (remaining > 5) {
              quizAudio.playClockTick();
            }
          }
        }

        if (remaining <= 0) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleTimerExpired();
        }
      }, 250);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [stageState.stage, stageState.questionIndex, stageState.endsAt, isRevealed, computeRemaining]);

  const handleTimerExpired = async () => {
    if (stageState.stage === 'COUNTDOWN') {
      quizAudio.playQuestionIntro();
      await advanceToQuestion(0);
    } else if (stageState.stage === 'QUESTION') {
      if (!isRevealed) {
        quizAudio.playTimesUp();
        setTimeout(() => quizAudio.playAnswerReveal(), 400);
        setIsRevealed(true);
      } else {
        await showInterimLeaderboard();
      }
    } else if (stageState.stage === 'LEADERBOARD') {
      const nextIdx = stageState.questionIndex + 1;
      if (nextIdx < questions.length) {
        quizAudio.playQuestionIntro();
        await advanceToQuestion(nextIdx);
      } else {
        quizAudio.playPodiumFanfare();
        await completeStage();
      }
    }
  };

  const startQuizStage = async () => {
    if (!quiz) return;
    try {
      if (quiz.status === 'READY') {
        // Enforce presenter-only start
        await quizService.control(quiz.id, 'start', { source: 'PRESENTER' });
      }
      const countdownSec = quiz.preQuizCountdownSeconds || 10;
      const now = Date.now();
      const endsAt = new Date(now + countdownSec * 1000).toISOString();
      setLocalTimer(countdownSec);
      setIsRevealed(false);
      const stagePayload: Partial<StageState> = {
        stage: 'COUNTDOWN',
        questionIndex: 0,
        remainingSeconds: countdownSec,
        endsAt,
        startedAt: new Date(now).toISOString()
      };
      await quizService.updateStage(quiz.id, stagePayload);
      setStageState(prev => ({ ...prev, ...stagePayload } as StageState));
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const advanceToQuestion = async (idx: number) => {
    if (!quiz || !questions[idx]) return;
    const q = questions[idx];
    const timeLimit = (quiz as any).perQuestionSeconds || (q as any).timeLimitSeconds || 30;
    const now = Date.now();
    const endsAt = new Date(now + timeLimit * 1000).toISOString();
    totalQuestionTimeRef.current = timeLimit;
    setLocalTimer(timeLimit);
    setIsRevealed(false);

    try {
      const stagePayload: Partial<StageState> = {
        stage: 'QUESTION',
        questionIndex: idx,
        questionId: q.id,
        remainingSeconds: timeLimit,
        endsAt,
        startedAt: new Date(now).toISOString(),
        totalQuestions: questions.length
      };
      await quizService.updateStage(quiz.id, stagePayload);
      setStageState(prev => ({ ...prev, ...stagePayload } as StageState));
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const showInterimLeaderboard = async () => {
    if (!quiz) return;
    const intermissionSec = quiz.intermissionSeconds || 7;
    const now = Date.now();
    const endsAt = new Date(now + intermissionSec * 1000).toISOString();
    setLocalTimer(intermissionSec);
    setIsRevealed(false);

    try {
      const lbRes = await quizService.leaderboard(quiz.id);
      setInterimLeaderboard(lbRes.leaderboard || []);
      const stagePayload: Partial<StageState> = {
        stage: 'LEADERBOARD',
        questionIndex: stageState.questionIndex,
        remainingSeconds: intermissionSec,
        endsAt,
        startedAt: new Date(now).toISOString()
      };
      await quizService.updateStage(quiz.id, stagePayload);
      setStageState(prev => ({ ...prev, ...stagePayload } as StageState));
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const completeStage = async () => {
    if (!quiz) return;
    try {
      await quizService.updateStage(quiz.id, {
        stage: 'COMPLETED',
        remainingSeconds: 0
      });
      setStageState(prev => ({ ...prev, stage: 'COMPLETED', remainingSeconds: 0 }));
      if (quiz.status === 'LIVE') {
        await quizService.control(quiz.id, 'end');
      }
    } catch (e) {
      setError((e as Error).message);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        handleTimerExpired();
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      } else if (e.key === 'm' || e.key === 'M') {
        const muted = quizAudio.toggleMute();
        setIsMuted(muted);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [stageState, questions, isRevealed]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => undefined);
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => undefined);
      setIsFullscreen(false);
    }
  };

  const currentQ = questions[stageState.questionIndex];
  const timerPercent = totalQuestionTimeRef.current > 0
    ? Math.max(0, Math.min(100, (localTimer / totalQuestionTimeRef.current) * 100))
    : 0;

  return (
    <div
      ref={containerRef}
      className={`relative min-h-screen flex flex-col justify-between p-4 sm:p-8 overflow-hidden select-none transition-colors duration-200 ${
        isLightMode ? 'bg-[#f7f5f0] text-stone-900' : 'bg-[#0e0a07] text-white'
      }`}
    >
      {!isLightMode && (
        <>
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#ea580c]/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        </>
      )}

      <header className={`relative z-10 flex flex-wrap items-center justify-between gap-4 border-b pb-4 ${
        isLightMode ? 'border-stone-200' : 'border-white/10'
      }`}>
        <div className="flex items-center gap-3">
          <Link
            to="/admin-dashboard"
            className={`p-2 rounded-xl transition-colors ${
              isLightMode
                ? 'bg-stone-200/80 hover:bg-stone-300 text-stone-800'
                : 'bg-white/10 hover:bg-white/20 text-white/80 hover:text-white'
            }`}
            title="Return to Admin Dashboard"
          >
            <Trophy className="w-5 h-5 text-[#ea580c]" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ea580c] animate-ping" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#ea580c]">
                Presenter View
              </span>
            </div>
            <h1 className={`text-xl sm:text-2xl font-bold tracking-tight mt-0.5 ${
              isLightMode ? 'text-stone-900' : 'text-white'
            }`}>
              {quiz?.name || 'Robothon 3.0 Stage'}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <button
            onClick={() => {
              const muted = quizAudio.toggleMute();
              setIsMuted(muted);
            }}
            className={`p-2.5 rounded-xl border transition-all flex items-center gap-1.5 text-xs font-mono cursor-pointer ${
              isLightMode
                ? 'bg-stone-200/80 border-stone-300 hover:bg-stone-300 text-stone-800'
                : 'bg-white/10 border-white/20 hover:bg-white/20 text-white'
            }`}
            title="Toggle Audio (M)"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-500" /> : <Volume2 className="w-4 h-4 text-emerald-600" />}
            <span className="hidden sm:inline">{isMuted ? 'Muted' : 'Sound ON'}</span>
          </button>

          <select
            value={selectedQuizId}
            onChange={(e) => loadQuizData(e.target.value)}
            className={`px-3 py-2 rounded-xl border text-xs font-mono focus:outline-none ${
              isLightMode
                ? 'bg-white border-stone-300 text-stone-900 shadow-xs'
                : 'bg-white/10 border-white/20 text-white'
            }`}
          >
            {quizzes.map((q) => (
              <option key={q.id} value={q.id} className={isLightMode ? 'bg-white text-stone-900' : 'bg-[#1c140e] text-white'}>
                {q.name} ({q.status})
              </option>
            ))}
          </select>

          <button
            onClick={() => handleTimerExpired()}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#ea580c] to-[#f59e0b] hover:brightness-110 text-white text-xs font-mono font-bold flex items-center gap-1.5 shadow-lg transition-transform active:scale-95 cursor-pointer"
          >
            <SkipForward className="w-4 h-4" />
            <span>{isRevealed ? 'Next: Standings (Space)' : stageState.stage === 'QUESTION' ? 'Reveal Answer (Space)' : 'Next (Space)'}</span>
          </button>

          {/* Projector Light Mode Toggle Button */}
          <button
            type="button"
            onClick={toggleLightMode}
            className={`p-2.5 rounded-xl border transition-colors cursor-pointer ${
              isLightMode
                ? 'bg-amber-100 border-amber-300 hover:bg-amber-200 text-stone-900 shadow-xs'
                : 'bg-white/10 border-white/20 hover:bg-white/20 text-white'
            }`}
            title={isLightMode ? 'Switch to Dark Mode' : 'Switch to Projector Light Mode'}
          >
            {isLightMode ? <Moon className="w-4 h-4 text-stone-800" /> : <Sun className="w-4 h-4 text-amber-300" />}
          </button>

          <button
            onClick={toggleFullscreen}
            className={`p-2.5 rounded-xl border transition-colors cursor-pointer ${
              isLightMode
                ? 'bg-stone-200/80 border-stone-300 hover:bg-stone-300 text-stone-800'
                : 'bg-white/10 border-white/20 hover:bg-white/20 text-white'
            }`}
            title="Toggle Fullscreen (F)"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      <main className="relative z-10 flex-1 flex flex-col justify-center items-center my-4 max-w-6xl w-full mx-auto">
        {error && (
          <div className="p-4 rounded-2xl bg-red-950/80 border border-red-500/50 text-red-200 text-sm mb-4">
            {error}
          </div>
        )}

        {/* PHASE 1: STANDBY */}
        {stageState.stage === 'STANDBY' && (
          <div className="text-center space-y-6 max-w-2xl animate-fadeIn">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-[#ea580c] to-[#f59e0b] text-white shadow-[0_0_50px_rgba(234,88,12,0.5)]">
              <Trophy className="w-12 h-12" />
            </div>
            <h2 className={`text-4xl sm:text-6xl font-extrabold tracking-tight ${isLightMode ? "text-stone-900" : "text-white"}`}>

              {quiz?.name || 'Round Standby'}
            </h2>
            <p className={`text-base sm:text-lg font-mono max-w-lg mx-auto ${isLightMode ? "text-stone-600 font-medium" : "text-white/70"}`}>

              {questions.length} questions loaded • {quiz?.perQuestionSeconds || 45}s per prompt
            </p>
            <div className="pt-4">
              <button
                onClick={startQuizStage}
                className="px-10 py-5 rounded-2xl bg-gradient-to-r from-[#ea580c] to-[#f59e0b] text-white font-mono font-black text-xl shadow-[0_10px_40px_rgba(234,88,12,0.4)] hover:brightness-110 active:scale-95 transition-all flex items-center gap-3 mx-auto cursor-pointer"
              >
                <Play className="w-7 h-7 fill-white" />
                <span>Launch Stage Countdown</span>
              </button>
            </div>
          </div>
        )}

        {/* PHASE 2: PRE-QUIZ COUNTDOWN */}
        {stageState.stage === 'COUNTDOWN' && (
          <div className="text-center space-y-5 animate-fadeIn">
            <div className="inline-block px-5 py-2 rounded-full bg-[#ea580c]/20 border border-[#ea580c]/50 text-lg font-mono text-[#ea580c] uppercase tracking-widest font-bold animate-pulse">
              Quiz Starting In
            </div>
            <div className={`text-9xl sm:text-[14rem] font-mono font-black tracking-tight leading-none ${isLightMode ? "text-stone-900 drop-shadow-[0_4px_20px_rgba(234,88,12,0.25)]" : "text-white drop-shadow-[0_0_60px_rgba(244,174,82,0.6)]"}`}>

              {localTimer}
            </div>
            <p className={`text-base font-mono ${isLightMode ? "text-stone-600 font-bold" : "text-stone-300"}`}>

              Team Leaders: Look at this arena display for the questions!
            </p>
          </div>
        )}

        {/* PHASE 3: QUESTION PRESENTATION (KAHOOT STYLE) */}
        {stageState.stage === 'QUESTION' && currentQ && (
          <div className="w-full space-y-6 animate-fadeIn">
            <div className={`flex items-center justify-between w-full border-b pb-3 ${isLightMode ? "border-stone-200" : "border-white/10"}`}>

              <div className="flex items-center gap-3">
                <span className={`px-4 py-2 rounded-2xl border font-mono text-sm font-bold shadow-md ${isLightMode ? "bg-white border-stone-300 text-stone-900" : "bg-white/10 border-white/20 text-white"}`}>

                  Question {stageState.questionIndex + 1} of {questions.length}
                </span>
                <span className={`text-xs font-mono ${isLightMode ? "text-stone-500 font-bold" : "text-white/60"}`}>

                  +{currentQ.points} points
                </span>
              </div>

              <div className={`flex items-center gap-3 px-5 py-2.5 rounded-2xl border shadow-xl ${isLightMode ? "bg-white border-[#ea580c]/50 shadow-md" : "bg-[#1c140e] border-[#ea580c]/60"}`}>

                <Clock className={"w-6 h-6 text-[#ea580c] " + (localTimer <= 5 ? 'animate-bounce text-red-400' : 'animate-spin')} style={{ animationDuration: '4s' }} />
                <span className={"text-4xl font-mono font-black " + (localTimer <= 5 ? 'text-red-400 animate-pulse' : 'text-[#ea580c]')}>
                  {localTimer}s
                </span>
              </div>
            </div>

            <div className={`w-full h-3 rounded-full overflow-hidden ${isLightMode ? "bg-stone-200" : "bg-white/10"}`}>

              <div
                className={"h-full transition-all duration-1000 " + (localTimer <= 5 ? 'bg-red-500' : 'bg-gradient-to-r from-[#ea580c] to-[#f59e0b]')}
                style={{ width: timerPercent + '%' }}
              />
            </div>

            <div className={`p-8 sm:p-12 rounded-3xl border-2 backdrop-blur-md shadow-2xl text-center min-h-[160px] flex items-center justify-center ${isLightMode ? "bg-white border-stone-300 shadow-stone-300/40" : "bg-[#1c140e]/95 border-white/15"}`}>

              <h2 className={`text-2xl sm:text-4xl font-bold leading-relaxed tracking-tight ${isLightMode ? "text-stone-900 font-extrabold" : "text-white"}`}>

                {currentQ.questionText}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {currentQ.options.map((opt) => {
                const kahoot = KAHOOT_OPTIONS[opt.optionKey] || KAHOOT_OPTIONS.A;
                const isCorrect = isRevealed && (opt.optionKey === currentQ.correctOption);
                const isWrong = isRevealed && (opt.optionKey !== currentQ.correctOption);

                return (
                  <div
                    key={opt.optionKey}
                    className={"p-6 sm:p-7 rounded-3xl border-2 transition-all flex items-center gap-5 " + (
                      isCorrect
                        ? 'bg-emerald-600/90 border-emerald-400 ring-4 ring-emerald-400/50 shadow-[0_0_40px_rgba(52,211,153,0.5)] scale-[1.02]'
                        : isWrong
                        ? 'opacity-30 border-white/10 bg-white/5'
                        : kahoot.bgClass + ' ' + kahoot.borderClass + ' hover:brightness-105 shadow-xl'
                    )}
                  >
                    <div className="w-14 h-14 rounded-2xl bg-black/25 flex items-center justify-center font-mono font-black text-2xl text-white shrink-0 shadow-inner">
                      {isCorrect ? <CheckCircle2 className="w-8 h-8 text-white" /> : kahoot.svg}
                    </div>

                    <div className="flex-1">
                      <div className="text-[11px] font-mono uppercase tracking-widest text-white/70 font-bold">
                        Option {opt.optionKey}
                      </div>
                      <div className="text-lg sm:text-xl font-bold text-white leading-snug">
                        {opt.optionText}
                      </div>
                    </div>

                    {isCorrect && (
                      <span className="px-3.5 py-1.5 rounded-full bg-white text-emerald-900 font-mono text-xs font-black uppercase tracking-wider shadow-lg animate-pulse">
                        Correct Answer
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {isRevealed && (
              <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-center animate-fadeIn">
                <span className="font-mono text-sm text-emerald-300 font-bold flex items-center justify-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Correct Answer Revealed! Press Next Question to view Leaderboard Standings.</span>
              </div>
            )}
          </div>
        )}

        {/* PHASE 4: INTERIM LEADERBOARD */}
        {stageState.stage === 'LEADERBOARD' && (
          <div className="w-full space-y-6 animate-fadeIn">
            <div className={`flex items-center justify-between border-b pb-4 ${isLightMode ? "border-stone-200" : "border-white/10"}`}>

              <div>
                <span className="text-xs font-mono uppercase text-[#ea580c] tracking-widest font-bold">
                  Intermission Standings
                </span>
                <h2 className={`text-2xl sm:text-4xl font-extrabold mt-1 ${isLightMode ? "text-stone-900" : "text-white"}`}>

                  Scores after Question {stageState.questionIndex + 1}
                </h2>
              </div>
              <div className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl border shadow-lg text-sm font-mono ${isLightMode ? "bg-white border-[#ea580c]/50" : "bg-[#1c140e] border-[#ea580c]/60"}`}>

                <span className={isLightMode ? "text-stone-500" : "text-stone-400"}>Next Question in:</span>
                <strong className="text-[#ea580c] text-xl font-black">{localTimer}s</strong>
              </div>
            </div>

            <div className={`overflow-x-auto rounded-3xl border shadow-2xl max-h-[55vh] overflow-y-auto ${isLightMode ? "border-stone-200 bg-white" : "border-white/15 bg-[#1c140e]/95"}`}>

              <table className={`w-full text-left text-sm ${isLightMode ? "text-stone-900" : "text-white"}`}>

                <thead className={`text-[11px] uppercase font-mono tracking-wider text-[#ea580c] border-b sticky top-0 backdrop-blur-md ${isLightMode ? "bg-stone-100 border-stone-200" : "bg-black/60 border-white/10"}`}>

                  <tr>
                    <th className="py-3.5 px-6 text-center">Rank</th>
                    <th className="py-3.5 px-6">Team Name</th>
                    <th className="py-3.5 px-6 text-center">Cumulative Points</th>
                  </tr>
                </thead>
                <tbody className={`divide-y text-sm font-mono ${isLightMode ? "divide-stone-200" : "divide-white/10"}`}>

                  {interimLeaderboard.slice(0, 10).map((row, i) => {
                    const isTop3 = i < 3;
                    const medals = ['1st', '2nd', '3rd'];
                    return (
                      <tr key={row.teamId} className={"transition-colors " + (isTop3 ? 'bg-white/5 font-bold' : 'hover:bg-white/5')}>
                        <td className="py-4 px-6 text-center">
                          <span className="text-lg">
                            {isTop3 ? medals[i] : '#' + (row.rank || i + 1)}
                          </span>
                        </td>
                        <td className={`py-4 px-6 font-sans text-base font-bold ${isLightMode ? "text-stone-900" : "text-white"}`}>
                          {row.teamName}
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span className="px-3.5 py-1.5 rounded-xl bg-[#ea580c]/20 border border-[#ea580c]/50 text-[#ea580c] font-bold text-base">
                            {row.score} pts
                          </span>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PHASE 5: COMPLETED - GRAND PODIUM */}
        {stageState.stage === 'COMPLETED' && (
          <div className="text-center space-y-8 max-w-3xl animate-fadeIn">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-amber-400 to-[#ea580c] text-white shadow-[0_0_60px_rgba(245,158,11,0.5)]">
              <Award className="w-14 h-14" />
            </div>
            <div>
              <h2 className="text-4xl sm:text-6xl font-black text-white">
                Round Concluded!
              </h2>
              <p className="text-base text-stone-300 font-mono mt-2">
                All questions completed. Here are the top teams on the podium:
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 sm:gap-6 items-end pt-4 pb-2">
              {/* 2nd Place */}
              <div className="flex flex-col items-center">
                <span className="text-3xl mb-2">🥈</span>
                <span className="text-xs font-mono font-bold text-stone-300 truncate max-w-[120px]">
                  {interimLeaderboard[1]?.teamName || 'Runner-Up'}
                </span>
                <span className="text-xs font-mono text-[#ea580c]">{interimLeaderboard[1]?.score ?? 0} pts</span>
                <div className="w-full h-32 rounded-t-2xl bg-gradient-to-t from-stone-800 to-stone-700 flex items-center justify-center font-mono font-black text-2xl text-stone-300 border-t-2 border-stone-400 shadow-xl mt-2">
                  2
                </div>
              </div>

              {/* 1st Place */}
              <div className="flex flex-col items-center">
                <span className="text-4xl mb-2 animate-bounce">👑</span>
                <span className="text-sm font-mono font-black text-amber-300 truncate max-w-[140px]">
                  {interimLeaderboard[0]?.teamName || 'Champion'}
                </span>
                <span className="text-sm font-mono text-[#ea580c] font-bold">{interimLeaderboard[0]?.score ?? 0} pts</span>
                <div className="w-full h-44 rounded-t-2xl bg-gradient-to-t from-amber-700 to-amber-500 flex items-center justify-center font-mono font-black text-4xl text-amber-100 border-t-4 border-amber-300 shadow-[0_0_40px_rgba(245,158,11,0.5)] mt-2">
                  1
                </div>
              </div>

              {/* 3rd Place */}
              <div className="flex flex-col items-center">
                <span className="text-3xl mb-2">🥉</span>
                <span className="text-xs font-mono font-bold text-amber-700 truncate max-w-[120px]">
                  {interimLeaderboard[2]?.teamName || '3rd Place'}
                </span>
                <span className="text-xs font-mono text-[#ea580c]">{interimLeaderboard[2]?.score ?? 0} pts</span>
                <div className="w-full h-24 rounded-t-2xl bg-gradient-to-t from-amber-950 to-amber-900 flex items-center justify-center font-mono font-black text-2xl text-amber-600 border-t-2 border-amber-700 shadow-xl mt-2">
                  3
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-center gap-4">
              <Link
                to="/admin-dashboard"
                className="px-6 py-3.5 rounded-2xl bg-[#ea580c] text-white font-mono font-bold text-sm shadow-xl hover:bg-[#d4621a] transition-all"
              >
                Open Admin Dashboard & Audit
              </Link>
              <Link
                to="/leaderboard"
                className="px-6 py-3.5 rounded-2xl bg-white/10 border border-white/20 text-white font-mono font-bold text-sm hover:bg-white/20 transition-all"
              >
                View Global Leaderboard
              </Link>
            </div>
          </div>
        )}
      </main>

      <footer className={`relative z-10 flex items-center justify-between text-xs font-mono pt-4 border-t ${isLightMode ? "border-stone-200 text-stone-500" : "border-white/10 text-white/40"}`}>

        <div>Robothon 3.0 Presenter</div>
        <div>Press Space to Advance/Reveal • Press M to Mute • Press F for Fullscreen</div>
      </footer>
    </div>
  );
};
