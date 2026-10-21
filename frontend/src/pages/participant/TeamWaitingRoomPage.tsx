import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { quizService, Quiz } from '../../services/quizService';
import { useAccount } from '../../services/authService';
import {
  Radio,
  Clock,
  Award,
  ShieldAlert,
  ArrowRight,
  Zap,
  Users,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  FileText
} from 'lucide-react';

export const TeamWaitingRoomPage: React.FC = () => {
  const account = useAccount();
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const requestedQuizId = searchParams.get('quiz') || '';

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedQuizId, setSelectedQuizId] = useState<string>(requestedQuizId);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showLaunchModal, setShowLaunchModal] = useState(false);
  const [autoLaunchCounter, setAutoLaunchCounter] = useState(5);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');

  const autoLaunchTimerRef = useRef<number | null>(null);

  // Fetch active quizzes
  const fetchQuizzes = async () => {
    try {
      const res = await quizService.list();
      setQuizzes(res.quizzes);
      if (res.quizzes.length > 0) {
        const targetId = selectedQuizId || requestedQuizId || res.quizzes[0].id;
        const current = res.quizzes.find(q => q.id === targetId) || res.quizzes[0];
        setSelectedQuizId(current.id);
        setQuiz(current);
      }
      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'Failed to connect to quiz server.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuizzes();

    // Subscribe to authoritative SSE events
    const unsubscribe = quizService.subscribe((event) => {
      if (event?.type === 'CONNECTED') {
        setConnectionStatus('connected');
      }
      if (event?.type === 'QUIZ_STARTED' || (event?.type === 'STAGE_UPDATE' && ['COUNTDOWN', 'QUESTION'].includes(event?.payload?.stageState?.stage))) {
        const startedId = event.payload?.quizId || event.payload?.quiz?.id || selectedQuizId || 'quiz-1';
        navigate('/team/quiz/live?quiz=' + encodeURIComponent(startedId), { replace: true });
        return;
      }
      if (['QUIZ_PAUSED', 'QUIZ_RESUMED', 'QUIZ_RESET', 'QUIZ_ENDED', 'STAGE_UPDATE'].includes(event?.type || '')) {
        fetchQuizzes();
      }
    });

    return () => {
      unsubscribe();
      if (autoLaunchTimerRef.current) clearInterval(autoLaunchTimerRef.current);
    };
  }, [selectedQuizId]);

  // 5-second countdown timer when launch modal appears
  useEffect(() => {
    if (showLaunchModal) {
      if (autoLaunchTimerRef.current) clearInterval(autoLaunchTimerRef.current);
      autoLaunchTimerRef.current = window.setInterval(() => {
        setAutoLaunchCounter((prev) => {
          if (prev <= 1) {
            if (autoLaunchTimerRef.current) clearInterval(autoLaunchTimerRef.current);
            navigate(`/team/quiz/live?quiz=${encodeURIComponent(selectedQuizId || 'quiz-1')}`);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  }, [showLaunchModal, selectedQuizId, navigate]);

  const handleSelectQuiz = (qId: string) => {
    setSelectedQuizId(qId);
    const target = quizzes.find(q => q.id === qId);
    if (target) setQuiz(target);
  };

  const isLeader = account?.role === 'TEAM_LEADER' || account?.role === 'SUPER_ADMIN';
  const durationMins = quiz?.durationSeconds ? Math.round(quiz.durationSeconds / 60) : 30;
  const isLive = quiz?.status === 'LIVE';

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-8 text-[#251306]">
      
      {/* Urgent Arena Broadcast Modal */}
      {showLaunchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#251306] text-[#FEF3E2] rounded-3xl p-6 sm:p-8 max-w-lg w-full border-2 border-[#F4AE52] shadow-2xl flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-[#F4AE52]/20 border border-[#F4AE52] flex items-center justify-center text-[#F4AE52] animate-pulse">
              <Zap className="w-8 h-8" />
            </div>
            <div>
              <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-[#F4AE52]">
                URGENT ARENA BROADCAST
              </span>
              <h2 className="text-2xl font-bold tracking-tight mt-1 text-white">
                THE QUIZ IS NOW LIVE!
              </h2>
              <p className="text-xs text-stone-300 font-mono mt-2 leading-relaxed">
                The competition administrator has initiated the live countdown timer. All teams are prompted to open the live quiz terminal immediately.
              </p>
            </div>

            <div className="bg-white/10 px-4 py-2 rounded-xl font-mono text-sm font-bold text-[#F4AE52] flex items-center gap-2">
              <Clock className="w-4 h-4 animate-spin" />
              <span>Entering terminal in {autoLaunchCounter}s…</span>
            </div>

            <button
              type="button"
              onClick={() => navigate(`/team/quiz/live?quiz=${encodeURIComponent(selectedQuizId || 'quiz-1')}`)}
              className="w-full py-3.5 px-6 rounded-2xl font-mono text-sm font-bold uppercase tracking-wider bg-gradient-to-r from-[#D4621A] to-[#F4AE52] text-[#251306] hover:brightness-110 shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <span>Enter Live Answering Terminal Now</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#F4AE52]/30">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#D4621A] font-bold">
              Competition Terminal
            </span>
            <span className="text-xs text-stone-400">•</span>
            <span className="text-xs font-mono font-semibold text-stone-600">
              {account?.teamName || 'Your Team'}
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[#251306] mt-1">
            Competition Waiting Room
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 font-mono mt-1">
            Stand by for official arena broadcasts. When the Super Admin initiates the round, your answering terminal will synchronize automatically.
          </p>
        </div>

        {/* Real-time Connection Indicator */}
        <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-2xl border border-orange-200 shadow-sm self-start sm:self-auto">
          <span className={`w-2.5 h-2.5 rounded-full ${connectionStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
          <span className="text-xs font-mono font-semibold text-stone-700">
            {connectionStatus === 'connected' ? 'Arena Live Sync Active' : 'Connecting SSE…'}
          </span>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-4 rounded-2xl bg-red-50 text-red-800 border border-red-200 text-xs font-mono">
          {error}
        </div>
      )}

      {/* Role Notice for Team Members */}
      {!isLeader && (
        <div className="mt-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 leading-relaxed font-mono">
            <strong className="block text-sm font-sans mb-1 font-bold">Observer Mode (Team Member)</strong>
            Only your registered <strong>Team Leader</strong> may submit responses on behalf of the team. You may monitor round parameters, countdowns, and live rankings here and on the leaderboard.
          </div>
        </div>
      )}

      {/* Active Round Switcher */}
      <div className="mt-6 bg-white rounded-2xl p-4 sm:p-5 border border-orange-200 shadow-sm">
        <label className="block text-xs font-mono uppercase font-bold text-stone-500 mb-2">
          Select Competition Round:
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {quizzes.length === 0 && !loading && (
            <p className="text-xs text-stone-500 font-mono p-3">No active quizzes published yet.</p>
          )}
          {quizzes.map((q) => {
            const isSelected = q.id === selectedQuizId;
            return (
              <button
                key={q.id}
                type="button"
                onClick={() => handleSelectQuiz(q.id)}
                className={`p-4 rounded-xl border text-left transition-all flex items-center justify-between gap-3 cursor-pointer ${
                  isSelected
                    ? 'border-[#D4621A] bg-orange-50/70 shadow-sm ring-1 ring-[#D4621A]'
                    : 'border-stone-200 bg-white hover:bg-stone-50'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[#251306]">{q.name}</span>
                  </div>
                  <span className="text-[11px] font-mono text-stone-500 mt-1 block">
                    Status: <strong className="uppercase text-[#D4621A]">{q.status}</strong> · {Math.round(q.durationSeconds / 60)} mins
                  </span>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase ${
                  q.status === 'LIVE'
                    ? 'bg-emerald-100 text-emerald-800 animate-pulse'
                    : q.status === 'PAUSED'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-stone-100 text-stone-700'
                }`}>
                  {q.status}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Round Overview & Rules Card */}
      {quiz && (
        <div className="mt-6 bg-white rounded-3xl p-6 sm:p-8 border border-orange-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-100">
            <div>
              <span className="text-xs font-mono uppercase font-bold text-[#D4621A]">Round Overview</span>
              <h2 className="text-2xl font-bold text-[#251306]">{quiz.name}</h2>
            </div>

            {isLive ? (
              <Link
                to={`/team/quiz/live?quiz=${encodeURIComponent(quiz.id)}`}
                className="px-6 py-3 rounded-2xl bg-[#D4621A] text-white font-mono text-sm font-bold uppercase flex items-center gap-2 hover:bg-[#b85214] shadow-md transition-all self-start sm:self-auto"
              >
                <span>Enter Live Terminal</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <div className="px-4 py-2 rounded-xl bg-orange-50 border border-orange-200 font-mono text-xs text-[#251306] flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#D4621A]" />
                <span>Status: Waiting for Super Admin Start</span>
              </div>
            )}
          </div>

          {/* Key Rule Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono text-xs">
            <div className="p-4 rounded-2xl bg-[#FEF3E2] border border-[#F4AE52]/40">
              <span className="text-stone-500 uppercase text-[10px] font-bold block mb-1">Time Limit</span>
              <span className="text-xl font-bold text-[#251306]">{durationMins} Mins</span>
              <span className="text-[10px] text-stone-500 block mt-1">Authoritative deadline</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#FEF3E2] border border-[#F4AE52]/40">
              <span className="text-stone-500 uppercase text-[10px] font-bold block mb-1">Scoring per MCQ</span>
              <span className="text-xl font-bold text-emerald-700">+{quiz.pointsPerCorrect ?? 4} pts</span>
              <span className="text-[10px] text-stone-500 block mt-1">Full marks per correct</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#FEF3E2] border border-[#F4AE52]/40">
              <span className="text-stone-500 uppercase text-[10px] font-bold block mb-1">Incorrect Answer</span>
              <span className="text-xl font-bold text-stone-700">0 pts</span>
              <span className="text-[10px] text-stone-500 block mt-1">Zero penalty (no negative marking)</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#FEF3E2] border border-[#F4AE52]/40">
              <span className="text-stone-500 uppercase text-[10px] font-bold block mb-1">Advancement Cutoff</span>
              <span className="text-xl font-bold text-[#D4621A]">Top {quiz.qualificationCount ?? 40}</span>
              <span className="text-[10px] text-stone-500 block mt-1">Qualify for Boat Trials</span>
            </div>
          </div>

          {/* Anti-Cheat Briefing Box */}
          <div className="p-5 rounded-2xl bg-[#251306] text-[#FEF3E2] flex items-start gap-4">
            <Sparkles className="w-6 h-6 text-[#F4AE52] shrink-0 mt-0.5" />
            <div className="text-xs font-mono space-y-1.5 leading-relaxed">
              <strong className="block text-sm font-sans font-bold text-white">
                Arena Anti-Cheat Answering Format
              </strong>
              <p className="text-stone-300">
                • Question technical prompts and diagrams are displayed <strong>exclusively on the main arena projector screen</strong>.
              </p>
              <p className="text-stone-300">
                • Your team answering terminal displays large tactile buttons for <strong>A, B, C, D</strong> only.
              </p>
              <p className="text-stone-300">
                • <strong>One active workstation per team:</strong> Opening a second laptop for the same team will result in a session conflict (409).
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
