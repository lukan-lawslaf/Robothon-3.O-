import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { quizService, Quiz, Attempt } from '../../services/quizService';
import { useAccount } from '../../services/authService';
import {
  CheckCircle2,
  Trophy,
  Clock,
  ArrowRight,
  FileText,
  Award,
  Sparkles,
  ShieldCheck
} from 'lucide-react';

export const QuizCompletedPage: React.FC = () => {
  const account = useAccount();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const quizId = searchParams.get('quiz') || 'quiz-1';

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAttemptData = async () => {
      try {
        const [qRes, aRes] = await Promise.all([
          quizService.details(quizId).catch(() => ({ quiz: null })),
          quizService.attempt(quizId).catch(() => ({ attempt: null }))
        ]);
        if (qRes.quiz) setQuiz(qRes.quiz);
        if (aRes.attempt) setAttempt(aRes.attempt);
      } finally {
        setLoading(false);
      }
    };
    loadAttemptData();
  }, [quizId]);

  const answeredCount = attempt?.answeredCount ?? Object.keys(attempt?.answers || {}).length;
  const timeTaken = attempt?.timeTakenSeconds ?? 0;
  const timeStr = `${Math.floor(timeTaken / 60)}m ${String(timeTaken % 60).padStart(2, '0')}s`;
  const submittedTime = attempt?.submittedAt ? new Date(attempt.submittedAt).toLocaleTimeString() : 'Recorded';

  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-12 text-[#251306]">
      <div className="bg-white rounded-3xl p-8 sm:p-12 border border-orange-200 shadow-sm text-center flex flex-col items-center gap-6">
        
        <div className="w-20 h-20 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-md">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <div>
          <span className="text-[11px] font-mono uppercase tracking-widest text-[#D4621A] font-bold">
            OFFICIAL ADJUDICATION RECEIPT
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#251306] mt-1">
            Test Submission Verified
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 font-mono mt-2 max-w-md mx-auto">
            Your team's responses for <strong>{quiz?.name || 'Competition Quiz'}</strong> have been securely recorded and evaluated by the server engine.
          </p>
        </div>

        {/* Receipt Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full font-mono text-xs">
          <div className="p-4 rounded-2xl bg-[#FEF3E2] border border-[#F4AE52]/40 text-center">
            <span className="text-stone-500 uppercase text-[10px] font-bold block mb-1">Score</span>
            <span className="text-2xl font-bold text-[#D4621A]">{attempt?.score ?? 'Pending'} pts</span>
          </div>

          <div className="p-4 rounded-2xl bg-[#FEF3E2] border border-[#F4AE52]/40 text-center">
            <span className="text-stone-500 uppercase text-[10px] font-bold block mb-1">Answered</span>
            <span className="text-2xl font-bold text-stone-800">{answeredCount}</span>
          </div>

          <div className="p-4 rounded-2xl bg-[#FEF3E2] border border-[#F4AE52]/40 text-center">
            <span className="text-stone-500 uppercase text-[10px] font-bold block mb-1">Time Elapsed</span>
            <span className="text-2xl font-bold text-stone-800">{timeStr}</span>
          </div>

          <div className="p-4 rounded-2xl bg-[#FEF3E2] border border-[#F4AE52]/40 text-center">
            <span className="text-stone-500 uppercase text-[10px] font-bold block mb-1">Receipt Stamp</span>
            <span className="text-xs font-bold text-stone-700 block mt-2">{submittedTime}</span>
          </div>
        </div>

        {/* Security / Isolation Guarantee Callout */}
        <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 text-stone-600 text-xs font-mono flex items-center gap-3 text-left w-full">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>
            Official scores remain provisional until the Super Admin finalizes round adjudication. Finalized quiz marks will commit to the permanent Global Leaderboard.
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto pt-2">
          <Link
            to="/leaderboard"
            className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-[#251306] text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-[#3d200b] shadow-md transition-all"
          >
            <Trophy className="w-4 h-4 text-[#F4AE52]" />
            <span>View Live Leaderboard</span>
          </Link>

          <Link
            to="/team-dashboard"
            className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-orange-100 hover:bg-orange-200 text-[#D4621A] font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
          >
            <span>Return to Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

      </div>
    </div>
  );
};
