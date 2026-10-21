import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { quizService, Quiz, Attempt, StageState } from '../../services/quizService';
import { useAccount } from '../../services/authService';
import { quizAudio } from '../../services/quizSounds';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  Pause,
  Zap,
  Lock,
  Tv,
  Volume2,
  VolumeX,
  Trophy,
  Sparkles
} from 'lucide-react';

const STORAGE_KEY = 'robothon-quiz-ui';

interface OptionDef {
  key: string;
  name: string;
  shapeName: string;
  color: string;
  activeBg: string;
  selectedBg: string;
  lockedBg: string;
  selectedBorder: string;
  glow: string;
  svg: React.ReactNode;
}

const KAHOOT_OPTIONS: Record<string, OptionDef> = {
  A: {
    key: 'A',
    name: 'Red Triangle',
    shapeName: 'Triangle',
    color: '#E21B3C',
    activeBg: 'bg-[#E21B3C] hover:bg-[#C01432] active:scale-[0.98]',
    selectedBg: 'bg-[#E21B3C] ring-8 ring-white shadow-[0_0_35px_rgba(226,27,60,0.8)] scale-[1.02]',
    lockedBg: 'bg-[#E21B3C]/50 opacity-60 cursor-not-allowed',
    selectedBorder: 'border-white',
    glow: 'shadow-[0_0_25px_rgba(226,27,60,0.5)]',
    svg: (
      <svg viewBox="0 0 24 24" className="w-12 h-12 sm:w-16 sm:h-16 fill-white drop-shadow-md">
        <polygon points="12 2, 22 21, 2 21" />
      </svg>
    )
  },
  B: {
    key: 'B',
    name: 'Blue Diamond',
    shapeName: 'Diamond',
    color: '#1368CE',
    activeBg: 'bg-[#1368CE] hover:bg-[#0E52A4] active:scale-[0.98]',
    selectedBg: 'bg-[#1368CE] ring-8 ring-white shadow-[0_0_35px_rgba(19,104,206,0.8)] scale-[1.02]',
    lockedBg: 'bg-[#1368CE]/50 opacity-60 cursor-not-allowed',
    selectedBorder: 'border-white',
    glow: 'shadow-[0_0_25px_rgba(19,104,206,0.5)]',
    svg: (
      <svg viewBox="0 0 24 24" className="w-12 h-12 sm:w-16 sm:h-16 fill-white drop-shadow-md">
        <polygon points="12 2, 22 12, 12 22, 2 12" />
      </svg>
    )
  },
  C: {
    key: 'C',
    name: 'Yellow Circle',
    shapeName: 'Circle',
    color: '#D89E00',
    activeBg: 'bg-[#D89E00] hover:bg-[#B38300] active:scale-[0.98]',
    selectedBg: 'bg-[#D89E00] ring-8 ring-white shadow-[0_0_35px_rgba(216,158,0,0.8)] scale-[1.02]',
    lockedBg: 'bg-[#D89E00]/50 opacity-60 cursor-not-allowed',
    selectedBorder: 'border-white',
    glow: 'shadow-[0_0_25px_rgba(216,158,0,0.5)]',
    svg: (
      <svg viewBox="0 0 24 24" className="w-12 h-12 sm:w-16 sm:h-16 fill-white drop-shadow-md">
        <circle cx="12" cy="12" r="10" />
      </svg>
    )
  },
  D: {
    key: 'D',
    name: 'Green Square',
    shapeName: 'Square',
    color: '#26890C',
    activeBg: 'bg-[#26890C] hover:bg-[#1D6A09] active:scale-[0.98]',
    selectedBg: 'bg-[#26890C] ring-8 ring-white shadow-[0_0_35px_rgba(38,137,12,0.8)] scale-[1.02]',
    lockedBg: 'bg-[#26890C]/50 opacity-60 cursor-not-allowed',
    selectedBorder: 'border-white',
    glow: 'shadow-[0_0_25px_rgba(38,137,12,0.5)]',
    svg: (
      <svg viewBox="0 0 24 24" className="w-12 h-12 sm:w-16 sm:h-16 fill-white drop-shadow-md">
        <rect x="3" y="3" width="18" height="18" rx="2" />
      </svg>
    )
  }
};

export const LiveAnsweringTerminalPage: React.FC = () => {
  const account = useAccount();
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const requestedQuizId = searchParams.get('quiz') || 'quiz-1';

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [stageState, setStageState] = useState<StageState>({
    stage: 'STANDBY',
    questionIndex: 0,
    remainingSeconds: 0
  });
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [localTimer, setLocalTimer] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  const timerRef = useRef<number | null>(null);
  const answersRef = useRef<Record<string, string>>({});
  const prevStageRef = useRef<string>('STANDBY');
  const prevQuestionRef = useRef<number>(-1);

  // Load initial cache from localStorage
  useEffect(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed[requestedQuizId]) {
          setAnswers(parsed[requestedQuizId]);
          answersRef.current = parsed[requestedQuizId];
        }
      }
    } catch {
      // Ignore parse error
    }
  }, [requestedQuizId]);

  // Sync quiz and attempt details
  const syncQuizAndAttempt = async () => {
    try {
      const qRes = await quizService.details(requestedQuizId);
      setQuiz(qRes.quiz);
      if (qRes.quiz.stageState) {
        setStageState(qRes.quiz.stageState);
        setLocalTimer(computeRemaining(qRes.quiz.stageState));
      }

      try {
        const joinRes = await quizService.join(requestedQuizId);
        setAttempt(joinRes.attempt);
        const merged = { ...answersRef.current, ...(joinRes.attempt.answers || {}) };
        setAnswers(merged);
        answersRef.current = merged;
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ [requestedQuizId]: merged }));
      } catch (joinErr: any) {
        if (joinErr.status === 409) {
          const attRes = await quizService.attempt(requestedQuizId);
          if (attRes.attempt) {
            setAttempt(attRes.attempt);
            const merged = { ...answersRef.current, ...(attRes.attempt.answers || {}) };
            setAnswers(merged);
            answersRef.current = merged;
          }
        } else {
          setError(joinErr.message || 'Error connecting attempt session.');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Cannot synchronize with arena.');
    }
  };

  useEffect(() => {
    syncQuizAndAttempt();

    const unsubscribe = quizService.subscribe((event) => {
      if (event?.type === 'STAGE_UPDATE' && event.payload?.stageState) {
        const nextStage = event.payload.stageState;
        setStageState(nextStage);
        setLocalTimer(computeRemaining(nextStage));
      }
      if (['QUIZ_PAUSED', 'QUIZ_RESUMED', 'QUIZ_STARTED'].includes(event?.type || '')) {
        syncQuizAndAttempt();
      }
      if (event?.type === 'FORCE_SUBMIT' || event?.type === 'QUIZ_ENDED') {
        navigate(`/team/quiz/completed?quiz=${encodeURIComponent(requestedQuizId)}`);
      }
      if (event?.type === 'SESSION_INVALIDATED') {
        setError('Your terminal session was invalidated or opened in another tab.');
      }
    });

    return () => {
      unsubscribe();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [requestedQuizId, navigate]);

  // Sound triggers on stage and question transitions
  useEffect(() => {
    if (stageState.stage === 'QUESTION' && prevStageRef.current !== 'QUESTION') {
      quizAudio.playQuestionIntro();
    }
    if (stageState.stage === 'QUESTION' && stageState.questionIndex !== prevQuestionRef.current) {
      quizAudio.playQuestionIntro();
    }
    prevStageRef.current = stageState.stage;
    prevQuestionRef.current = stageState.questionIndex;
  }, [stageState.stage, stageState.questionIndex]);

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

  // Periodic visual countdown timer synced to server endsAt
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    if (quiz?.status === 'LIVE' && (stageState.stage === 'QUESTION' || stageState.stage === 'COUNTDOWN')) {
      const initial = computeRemaining(stageState);
      setLocalTimer(initial);

      let lastReportedSec = initial;
      timerRef.current = window.setInterval(() => {
        const remaining = computeRemaining(stageStateRef.current);
        setLocalTimer(remaining);

        if (remaining !== lastReportedSec) {
          lastReportedSec = remaining;
          if (stageStateRef.current.stage === 'QUESTION') {
            if (remaining <= 5 && remaining > 0) {
              quizAudio.playUrgentTick();
            } else if (remaining > 5) {
              quizAudio.playClockTick();
            }
          }
        }

        if (remaining <= 0) {
          if (timerRef.current) clearInterval(timerRef.current);
          if (stageStateRef.current.stage === 'QUESTION') {
            quizAudio.playTimesUp();
          }
        }
      }, 250);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [stageState.stage, stageState.questionIndex, stageState.endsAt, quiz?.status, computeRemaining]);

  // Fallback poll every 2s in case SSE has latency or disconnects
  useEffect(() => {
    if (quiz?.status !== 'LIVE') return;
    const pollId = window.setInterval(async () => {
      try {
        const stageRes = await quizService.getStage(requestedQuizId);
        if (stageRes?.stageState) {
          const s = stageRes.stageState;
          if (s.stage !== stageStateRef.current.stage || s.questionIndex !== stageStateRef.current.questionIndex || s.endsAt !== stageStateRef.current.endsAt) {
            setStageState(s);
            stageStateRef.current = s;
            setLocalTimer(computeRemaining(s));
          }
        }
      } catch {
        // ignore
      }
    }, 2000);
    return () => clearInterval(pollId);
  }, [quiz?.status, requestedQuizId, computeRemaining]);

  const currentQId = stageState.questionId || `q-${(stageState.questionIndex ?? 0) + 1}`;

  useEffect(() => {
    if (currentQId) {
      setSelectedOption(answers[currentQId] || null);
    }
  }, [currentQId, answers]);

  const toggleSound = () => {
    const next = !isMuted;
    setIsMuted(next);
    quizAudio.setMuted(next);
  };

  // Option selection handler with audio pop
  const handleSelectOption = async (optionKey: string) => {
    if (isQuestionLocked) return;

    quizAudio.playOptionSelect();
    setSelectedOption(optionKey);

    const updated = { ...answers, [currentQId]: optionKey };
    setAnswers(updated);
    answersRef.current = updated;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ [requestedQuizId]: updated }));
    } catch (e) {
      console.warn('Storage write error:', e);
    }

    try {
      await quizService.answer(requestedQuizId, currentQId, optionKey);
      setNotice(`Option ${optionKey} locked in!`);
      setTimeout(() => setNotice(''), 2000);
    } catch (err: any) {
      setError(err.message || 'Answer recorded locally.');
    }
  };

  const isPaused = quiz?.status === 'PAUSED';
  const isQuestionLocked = isPaused || stageState.stage !== 'QUESTION' || localTimer <= 0;
  const currentQuestionNumber = (stageState.questionIndex ?? 0) + 1;
  const totalQuestions = stageState.totalQuestions || 15;

  return (
    <div className="min-h-screen bg-[#110D0A] text-white flex flex-col justify-between p-4 sm:p-6 select-none">
      
      {/* Top HUD Bar */}
      <header className="w-full max-w-5xl mx-auto flex items-center justify-between gap-4 bg-[#1E1712] border border-[#3E2F23] px-5 py-3.5 rounded-2xl shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#E21B3C] flex items-center justify-center font-black text-white text-base shadow">
            K!
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-orange-400 font-bold">
                {quiz?.name || 'Robothon Live Quiz'}
              </span>
              <span className="text-xs text-stone-500">•</span>
              <span className="text-xs font-mono font-bold text-stone-200">
                {account?.teamName || 'Your Team'}
              </span>
            </div>
            <div className="flex items-center gap-2.5 mt-0.5">
              <span className="text-base sm:text-lg font-black tracking-tight text-white">
                Question {currentQuestionNumber} of {totalQuestions}
              </span>
            </div>
          </div>
        </div>

        {/* Timer, Sound Toggle & Stage Pill */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleSound}
            aria-label="Toggle sound effects"
            className="p-2.5 rounded-xl bg-[#2A2019] hover:bg-[#382B22] border border-[#48372B] text-stone-300 hover:text-white transition-all cursor-pointer"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-stone-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#2A2019] border border-[#48372B] font-mono">
            <Clock className="w-4 h-4 text-orange-400" />
            <div className="flex flex-col text-right">
              <span className="text-[9px] uppercase tracking-wider text-stone-400">Time</span>
              <span className={`text-lg font-black leading-none ${localTimer <= 5 && stageState.stage === 'QUESTION' ? 'text-red-400 animate-pulse' : 'text-amber-400'}`}>
                {localTimer}s
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Answering / Status Arena */}
      <main className="w-full max-w-5xl mx-auto flex-1 flex flex-col justify-center my-4">
        
        {error && (
          <div className="mb-4 p-3.5 rounded-2xl bg-red-950/70 border border-red-700/60 text-red-200 text-xs font-mono flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {notice && (
          <div className="mb-4 p-3 rounded-2xl bg-emerald-950/70 border border-emerald-600/60 text-emerald-200 text-xs font-mono flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="font-bold">{notice}</span>
          </div>
        )}

        {/* Paused Alert */}
        {isPaused && (
          <div className="mb-4 p-4 rounded-2xl bg-amber-950/80 border-2 border-amber-500 text-amber-200 flex items-center gap-3 font-mono text-xs">
            <Pause className="w-6 h-6 text-amber-400 shrink-0" />
            <div>
              <strong className="text-white">ROUND PAUSED BY SUPER ADMIN:</strong> Answering is temporarily locked. The deadline will resume when the presenter unpauses.
            </div>
          </div>
        )}

        {/* STAGE: STANDBY */}
        {stageState.stage === 'STANDBY' && (
          <div className="bg-[#1E1712] border-2 border-[#3E2F23] rounded-3xl p-8 sm:p-12 text-center shadow-2xl flex flex-col items-center gap-5">
            <div className="w-20 h-20 rounded-3xl bg-[#E21B3C]/20 border border-[#E21B3C]/40 flex items-center justify-center text-[#E21B3C] animate-pulse">
              <Tv className="w-10 h-10" />
            </div>
            <div>
              <span className="text-xs font-mono uppercase tracking-widest text-orange-400 font-bold">
                ARENA STAGE CONNECTED
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white mt-2">
                Waiting for Quiz to Begin
              </h2>
              <p className="text-xs sm:text-sm text-stone-400 max-w-md mx-auto mt-2 leading-relaxed font-sans">
                The Super Admin will launch the round on the arena projector. All question prompts are displayed on the main arena screen!
              </p>
            </div>
            <div className="px-5 py-2.5 rounded-full bg-[#2A2019] border border-[#48372B] text-xs font-mono text-stone-300 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Leader terminal synced • Stand by</span>
            </div>
          </div>
        )}

        {/* STAGE: COUNTDOWN */}
        {stageState.stage === 'COUNTDOWN' && (
          <div className="bg-[#1E1712] border-2 border-amber-500/50 rounded-3xl p-8 sm:p-12 text-center shadow-2xl flex flex-col items-center gap-6">
            <div className="w-20 h-20 rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-amber-400 animate-pulse">
              <Zap className="w-10 h-10" />
            </div>
            <div>
              <span className="text-xs font-mono uppercase tracking-widest text-amber-400 font-bold">
                GET READY!
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-white mt-2">
                Question {currentQuestionNumber}
              </h2>
              <p className="text-xs sm:text-sm text-stone-300 max-w-md mx-auto mt-2 leading-relaxed">
                Look up at the arena projector to read the technical prompt! Option buttons will illuminate immediately when the timer starts.
              </p>
            </div>
            <div className="w-28 h-28 rounded-full border-4 border-amber-400 bg-amber-500/10 flex items-center justify-center shadow-[0_0_40px_rgba(245,158,11,0.3)]">
              <span className="text-5xl font-black text-amber-300 animate-pulse">
                {localTimer > 0 ? localTimer : 'GO!'}
              </span>
            </div>
          </div>
        )}

        {/* STAGE: LEADERBOARD / INTERMISSION */}
        {stageState.stage === 'LEADERBOARD' && (
          <div className="bg-[#1E1712] border-2 border-orange-500/40 rounded-3xl p-8 sm:p-10 text-center shadow-2xl flex flex-col items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400">
              <Trophy className="w-8 h-8" />
            </div>
            <div>
              <span className="text-xs font-mono uppercase tracking-widest text-orange-400 font-bold">
                QUESTION {currentQuestionNumber} ENDED
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white mt-2">
                Intermission Standings on Screen
              </h2>
              <p className="text-xs sm:text-sm text-stone-300 max-w-md mx-auto mt-2 leading-relaxed">
                Answering is locked for Question {currentQuestionNumber}. Look up at the big screen to see updated arena leaderboard!
              </p>
            </div>

            <p className="text-xs font-mono text-stone-400 animate-pulse">
              Next question starting in {localTimer}s...
            </p>
          </div>
        )}

        {/* STAGE: QUESTION (Pure Kahoot Tactile Option Buttons) */}
        {stageState.stage === 'QUESTION' && (
          <div className="flex flex-col gap-4 sm:gap-6">
            
            {/* Projector Callout Banner (NO question text!) */}
            <div className="py-3 px-5 rounded-2xl bg-[#1E1712] border border-[#3E2F23] flex items-center justify-between text-center sm:text-left gap-3 shadow-md">
              <div className="flex items-center gap-3 mx-auto sm:mx-0">
                <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400 shrink-0">
                  <Tv className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm sm:text-base text-white tracking-wide">
                    Look Up at the Arena Projector Screen!
                  </h3>
                  <p className="text-[11px] font-mono text-stone-400 hidden sm:block">
                    Read the question and match your choice below before the clock expires.
                  </p>
                </div>
              </div>

              {localTimer <= 0 ? (
                <div className="px-4 py-1.5 rounded-xl bg-red-950/80 border border-red-600 text-red-300 font-mono text-xs font-bold shrink-0">
                  Time's Up • Locked
                </div>
              ) : selectedOption ? (
                <div className="px-4 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-500 text-emerald-300 font-mono text-xs font-bold flex items-center gap-1.5 shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Option {selectedOption} Locked In</span>
                </div>
              ) : (
                <div className="px-4 py-1.5 rounded-xl bg-amber-950/80 border border-amber-600/70 text-amber-300 font-mono text-xs font-bold animate-pulse shrink-0">
                  Tap Option to Answer
                </div>
              )}
            </div>

            {/* 4 Large Tactile Kahoot Buttons: A (Red), B (Blue), C (Yellow), D (Green) */}
            <div className="grid grid-cols-2 gap-3 sm:gap-6 min-h-[50vh] sm:min-h-[55vh]">
              {(['A', 'B', 'C', 'D'] as const).map((key) => {
                const opt = KAHOOT_OPTIONS[key];
                const isSelected = selectedOption === key;

                let stateClass = opt.activeBg;
                if (isQuestionLocked) {
                  stateClass = isSelected ? opt.selectedBg : opt.lockedBg;
                } else if (isSelected) {
                  stateClass = opt.selectedBg;
                }

                return (
                  <button
                    key={key}
                    type="button"
                    disabled={isQuestionLocked}
                    onClick={() => handleSelectOption(key)}
                    aria-label={`Choose ${opt.name}`}
                    className={`w-full h-full rounded-2xl sm:rounded-3xl p-4 sm:p-8 flex flex-col items-center justify-center gap-3 sm:gap-4 transition-all duration-150 cursor-pointer text-white relative shadow-xl ${stateClass}`}
                  >
                    {/* Selected Checkmark Badge */}
                    {isSelected && (
                      <div className="absolute top-3 right-3 sm:top-5 sm:right-5 bg-white text-stone-900 rounded-full p-1 sm:p-1.5 shadow-lg animate-bounce">
                        <CheckCircle2 className="w-5 h-5 sm:w-7 sm:h-7 text-emerald-600" />
                      </div>
                    )}

                    {/* Kahoot Shape SVG */}
                    <div className="transition-transform duration-150 transform hover:scale-110">
                      {opt.svg}
                    </div>

                    {/* Key letter & Shape Name */}
                    <div className="text-center">
                      <span className="text-2xl sm:text-4xl font-black tracking-tight font-sans block drop-shadow-md">
                        {key}
                      </span>
                      <span className="text-[10px] sm:text-xs font-mono uppercase tracking-widest text-white/80 block font-bold">
                        {opt.shapeName}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

          </div>
        )}

      </main>

      {/* Bottom Footer Info */}
      <footer className="w-full max-w-5xl mx-auto flex items-center justify-between text-[11px] font-mono text-stone-400 pt-2 border-t border-[#2A2019]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>Synchronized with Arena Master</span>
        </div>
        <div className="text-right">
          <span>Strict Anti-Cheat Answering Matrix</span>
        </div>
      </footer>

    </div>
  );
};
