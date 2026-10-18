import React, { useState, useEffect } from 'react';
import { QuizDetails, QuizRoundId, QuizSubmissionResult } from '../../types/quiz';
import { getQuizDetails, submitQuiz } from '../../services/quizService';
import { QuizEngine } from '../../components/participant/QuizEngine';
import { Button } from '../../components/common/Button';
import { MOCK_CURRENT_TEAM } from '../../mockData/teams.mock';
import { HelpCircle, Clock, Award, ShieldCheck, Play, CheckCircle2 } from 'lucide-react';

export const QuizPage: React.FC = () => {
  const [selectedQuizId, setSelectedQuizId] = useState<QuizRoundId>('round-1-elimination');
  const [quizDetails, setQuizDetails] = useState<QuizDetails | null>(null);
  const [isTakingQuiz, setIsTakingQuiz] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<QuizSubmissionResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchQuiz = async () => {
      const data = await getQuizDetails(selectedQuizId);
      setQuizDetails(data);
      setSubmissionResult(null);
    };
    fetchQuiz();
  }, [selectedQuizId]);

  const handleSubmitQuiz = async (answers: Record<string, string>, timeTakenSeconds: number) => {
    try {
      setIsSubmitting(true);
      const res = await submitQuiz({
        quizId: selectedQuizId,
        teamId: MOCK_CURRENT_TEAM.id,
        answers,
        timeTakenSeconds,
      });
      setSubmissionResult(res);
      setIsTakingQuiz(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isTakingQuiz && quizDetails) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <QuizEngine
          quiz={quizDetails}
          onSubmit={handleSubmitQuiz}
          isSubmitting={isSubmitting}
        />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      {/* Header */}
      <div>
        <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400">
          Knowledge & Component Challenges
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
          Event Quizzes
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Complete timed technical quizzes to qualify for the event and unlock hardware advantages.
        </p>
      </div>

      {/* Quiz Selector Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Round 1 Card */}
        <div
          onClick={() => setSelectedQuizId('round-1-elimination')}
          className={`cursor-pointer p-6 rounded-2xl border transition-all ${
            selectedQuizId === 'round-1-elimination'
              ? 'bg-blue-950/40 border-cyan-400 shadow-lg shadow-cyan-500/10'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              Round 1
            </span>
            <span className="text-xs font-mono text-cyan-400 font-semibold">100 Points</span>
          </div>
          <h3 className="text-lg font-bold text-white">Elimination Quiz</h3>
          <p className="text-xs text-slate-300 mt-2 leading-relaxed">
            Covers hydrodynamics, electronics, motor drivers, and waterproofing. Top 50 teams qualify for boat assembly.
          </p>
          <div className="flex items-center gap-4 mt-4 text-xs font-mono text-slate-400">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-cyan-400" /> 15 Mins
            </span>
            <span>• 10 Questions</span>
          </div>
        </div>

        {/* Round 3 Card */}
        <div
          onClick={() => setSelectedQuizId('round-3-component')}
          className={`cursor-pointer p-6 rounded-2xl border transition-all ${
            selectedQuizId === 'round-3-component'
              ? 'bg-blue-950/40 border-cyan-400 shadow-lg shadow-cyan-500/10'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30">
              Round 3
            </span>
            <span className="text-xs font-mono text-cyan-400 font-semibold">50 Points</span>
          </div>
          <h3 className="text-lg font-bold text-white">Component Allocation Quiz</h3>
          <p className="text-xs text-slate-300 mt-2 leading-relaxed">
            Mid-event sprint to win priority hardware upgrades (high-discharge LiPos, telemetry sets, cooling jackets).
          </p>
          <div className="flex items-center gap-4 mt-4 text-xs font-mono text-slate-400">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-cyan-400" /> 10 Mins
            </span>
            <span>• 5 Questions</span>
          </div>
        </div>
      </div>

      {/* Quiz Detail Card / Submission Summary */}
      {submissionResult ? (
        <div className="p-8 rounded-3xl bg-slate-900 border border-emerald-500/40 shadow-2xl text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-2xl font-bold text-white">Quiz Submitted Successfully!</h3>
          <p className="text-sm text-slate-300 max-w-md mx-auto">
            Your answers have been graded. Your score has been submitted to the live event leaderboard.
          </p>

          <div className="inline-flex items-center gap-6 px-6 py-3 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-center">
            <div>
              <p className="text-[10px] uppercase text-slate-400">Your Score</p>
              <p className="text-xl font-extrabold text-cyan-400">
                {submissionResult.score} / {submissionResult.maxScore}
              </p>
            </div>
            <div className="h-8 w-px bg-slate-800" />
            <div>
              <p className="text-[10px] uppercase text-slate-400">Qualification</p>
              <p className="text-base font-extrabold text-emerald-400">
                {submissionResult.isQualified ? 'QUALIFIED' : 'PENDING'}
              </p>
            </div>
          </div>

          <div className="pt-4">
            <Button variant="secondary" size="md" onClick={() => setSubmissionResult(null)}>
              Return to Quizzes
            </Button>
          </div>
        </div>
      ) : quizDetails ? (
        <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <h3 className="text-xl font-bold text-white">{quizDetails.title}</h3>
            <p className="text-xs text-slate-300">{quizDetails.description}</p>
            <div className="flex items-center gap-4 text-xs font-mono text-slate-400 pt-2">
              <span>Time Limit: {quizDetails.durationMinutes} Minutes</span>
              <span>•</span>
              <span>Total Points: {quizDetails.totalPoints}</span>
            </div>
          </div>

          <Button
            size="lg"
            variant="primary"
            onClick={() => setIsTakingQuiz(true)}
            disabled={!quizDetails.isActive}
          >
            <Play className="w-4 h-4" />
            {quizDetails.isActive ? 'Start Timed Quiz' : 'Quiz Currently Locked'}
          </Button>
        </div>
      ) : null}
    </div>
  );
};
