import React, { useState, useEffect } from 'react';
import { MockTeam, MockCheckpoint, MockQuiz } from '../../mockData';
import { getStoredTeams, getStoredCheckpoints } from '../../services/stateStore';
import { applyForCheckpointReview } from '../../services/backendService';
import { fetchQuiz, submitQuizAnswers } from '../../services/quizService';
import {
  Trophy,
  CheckCircle2,
  Clock,
  Lock,
  Play,
  Send,
  Zap,
  CheckSquare,
  HelpCircle,
  AlertCircle,
  XCircle,
} from 'lucide-react';

export const ParticipantDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'checkpoints' | 'quizzes'>('checkpoints');
  const [team, setTeam] = useState<MockTeam | null>(null);
  const [checkpoints, setCheckpoints] = useState<MockCheckpoint[]>([]);
  const [activeQuiz, setActiveQuiz] = useState<MockQuiz | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [quizSecondsLeft, setQuizSecondsLeft] = useState<number>(0);
  const [quizSubmitting, setQuizSubmitting] = useState(false);
  const [quizFeedback, setQuizFeedback] = useState<string | null>(null);
  const [submittingCpId, setSubmittingCpId] = useState<string | null>(null);

  const loadData = () => {
    const teams = getStoredTeams();
    const currentTeam = teams[0]; // AquaPulse Robotics
    setTeam(currentTeam);
    setCheckpoints(getStoredCheckpoints());
  };

  useEffect(() => {
    loadData();
    window.addEventListener('robothon_store_updated', loadData);
    return () => window.removeEventListener('robothon_store_updated', loadData);
  }, []);

  // Timer logic for active quiz
  useEffect(() => {
    if (!activeQuiz || quizSecondsLeft <= 0) return;
    const interval = setInterval(() => {
      setQuizSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleQuizSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [activeQuiz, quizSecondsLeft]);

  const handleApplyReview = async (checkpointId: string) => {
    if (!team) return;
    try {
      setSubmittingCpId(checkpointId);
      await applyForCheckpointReview(team.id, checkpointId);
      loadData();
    } finally {
      setSubmittingCpId(null);
    }
  };

  const handleStartQuiz = async (quizId: string) => {
    const q = await fetchQuiz(quizId);
    setActiveQuiz(q);
    setQuizAnswers({});
    setQuizSecondsLeft(q.timeLimit);
    setQuizFeedback(null);
  };

  const handleQuizSubmit = async () => {
    if (!activeQuiz || !team) return;
    try {
      setQuizSubmitting(true);
      const res = await submitQuizAnswers(team.id, activeQuiz.id, quizAnswers);
      setQuizFeedback(
        `Quiz completed! You scored ${res.score} / ${res.totalPoints} points. Status: ${
          res.isQualified ? 'Qualified for Round 2!' : 'Review submitted.'
        }`
      );
      loadData();
      setActiveQuiz(null);
    } finally {
      setQuizSubmitting(false);
    }
  };

  if (!team) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header Stats */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400">
                Participant Portal
              </span>
              <span className="text-xs text-slate-500">•</span>
              <span className="text-xs text-slate-400">Table 1</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
              {team.teamName}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Current Stage: <span className="text-slate-200 font-medium">{team.currentCheckpoint}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Live Rank */}
            <div className="px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-center">
              <p className="text-[10px] uppercase font-bold text-slate-400">Live Rank</p>
              <p className="text-xl font-mono font-bold text-amber-400">#{team.rank}</p>
            </div>

            {/* Total Score */}
            <div className="px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-center">
              <p className="text-[10px] uppercase font-bold text-slate-400">Total Score</p>
              <p className="text-xl font-mono font-bold text-cyan-400">{team.totalPoints} pts</p>
            </div>

            {/* Qualification Badge */}
            <div className="px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-center">
              <p className="text-[10px] uppercase font-bold text-slate-400">Status</p>
              {team.isQualified ? (
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 mt-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Qualified - Top 50</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs font-bold text-red-400 mt-1">
                  <XCircle className="w-4 h-4" />
                  <span>Eliminated</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Switcher: Boat Checkpoints vs Quizzes */}
      <div className="flex border-b border-slate-800 gap-4">
        <button
          onClick={() => {
            setActiveTab('checkpoints');
            setActiveQuiz(null);
          }}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'checkpoints'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <CheckSquare className="w-4 h-4" />
          Tab 1: Boat Checkpoints (8 Milestones)
        </button>

        <button
          onClick={() => setActiveTab('quizzes')}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'quizzes'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          Tab 2: Quizzes (Round 1 & Round 3)
        </button>
      </div>

      {/* Tab 1: Boat Checkpoints */}
      {activeTab === 'checkpoints' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400">
              Hardware verification is sequential. Once your build satisfies the milestone criteria, click{' '}
              <strong className="text-white">"Apply for Review"</strong> to summon a tech team admin to your table.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {checkpoints.map((cp) => {
              const isApproved = cp.status === 'approved';
              const isPending = cp.status === 'pending_review';
              const isAvailable = cp.status === 'available';
              const isLocked = cp.status === 'locked';

              return (
                <div
                  key={cp.id}
                  className={`p-5 rounded-2xl border transition-all ${
                    isApproved
                      ? 'bg-slate-900 border-emerald-500/40'
                      : isPending
                      ? 'bg-slate-900 border-amber-500/50'
                      : isAvailable
                      ? 'bg-slate-900 border-blue-500/50'
                      : 'bg-slate-950/60 border-slate-800 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono font-bold text-xs ${
                          isApproved
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : isPending
                            ? 'bg-amber-500/20 text-amber-400'
                            : isAvailable
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {cp.stepNumber}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">{cp.title}</h3>
                        <span className="text-[11px] font-mono font-semibold text-cyan-400">
                          {cp.points} Points
                        </span>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div>
                      {isApproved && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Approved
                        </span>
                      )}
                      {isPending && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                          <Clock className="w-3.5 h-3.5 animate-pulse" /> Pending Tech Review
                        </span>
                      )}
                      {isAvailable && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">
                          Active Milestone
                        </span>
                      )}
                      {isLocked && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
                          <Lock className="w-3 h-3" /> Locked
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="mt-3 text-xs text-slate-300 leading-relaxed">
                    {cp.description}
                  </p>

                  {/* Action button */}
                  {isAvailable && (
                    <div className="mt-4 pt-3 border-t border-slate-800 flex justify-end">
                      <button
                        onClick={() => handleApplyReview(cp.id)}
                        disabled={submittingCpId === cp.id}
                        className="py-1.5 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-blue-600/20 transition-all disabled:opacity-50"
                      >
                        <Send className="w-3.5 h-3.5" />
                        {submittingCpId === cp.id ? 'Submitting...' : 'Apply for Review'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 2: Quizzes */}
      {activeTab === 'quizzes' && (
        <div className="space-y-6">
          {quizFeedback && (
            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>{quizFeedback}</span>
            </div>
          )}

          {/* Active Quiz Runner */}
          {activeQuiz ? (
            <div className="p-6 sm:p-8 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800 flex-wrap gap-2">
                <div>
                  <span className="text-xs font-mono font-bold uppercase text-cyan-400">
                    Timed Challenge
                  </span>
                  <h2 className="text-xl font-bold text-white mt-0.5">{activeQuiz.title}</h2>
                </div>

                {/* Countdown Timer */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-sm text-cyan-400">
                  <Clock className="w-4 h-4" />
                  <span>
                    {Math.floor(quizSecondsLeft / 60)}:
                    {String(quizSecondsLeft % 60).padStart(2, '0')}
                  </span>
                </div>
              </div>

              {/* Questions List */}
              <div className="space-y-6">
                {activeQuiz.questions.map((q, qIndex) => (
                  <div key={q.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                    <p className="text-sm font-semibold text-white">
                      {qIndex + 1}. {q.question}
                    </p>

                    <div className="space-y-2">
                      {q.options.map((opt, optIndex) => {
                        const isSelected = quizAnswers[q.id] === optIndex;
                        return (
                          <label
                            key={optIndex}
                            className={`flex items-center gap-3 p-3 rounded-lg border text-xs cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-blue-600/20 border-blue-500 text-white'
                                : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                            }`}
                          >
                            <input
                              type="radio"
                              name={`question-${q.id}`}
                              checked={isSelected}
                              onChange={() =>
                                setQuizAnswers((prev) => ({
                                  ...prev,
                                  [q.id]: optIndex,
                                }))
                              }
                              className="text-blue-600 focus:ring-0"
                            />
                            <span>{opt}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Submit Button */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveQuiz(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleQuizSubmit}
                  disabled={quizSubmitting}
                  className="py-2.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-600/20 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  {quizSubmitting ? 'Grading Answers...' : 'Submit Quiz Answers'}
                </button>
              </div>
            </div>
          ) : (
            /* Launch Cards for Quiz 1 and Quiz 2 */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Quiz 1 Card */}
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-500/10 text-blue-400 border border-blue-500/30">
                    Elimination Round
                  </span>
                  <span className="text-xs font-mono font-bold text-cyan-400">100 Points</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Quiz 1: Technical Elimination</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Foundational test in marine robotics and hydrodynamics. Only Top 50 teams qualify for hardware checkpoints.
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
                  <span>⏱ 10 Mins</span>
                  <span>• 5 Questions</span>
                </div>
                <button
                  onClick={() => handleStartQuiz('quiz-1')}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all"
                >
                  <Play className="w-4 h-4" />
                  Launch Quiz 1
                </button>
              </div>

              {/* Quiz 2 Card */}
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/30">
                    Component Allocation
                  </span>
                  <span className="text-xs font-mono font-bold text-amber-400">50 Points</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Quiz 2: Component Sprint</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Mid-event technical challenge to unlock premium propulsion hardware, cooling, and telemetry parts.
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
                  <span>⏱ 5 Mins</span>
                  <span>• 3 Questions</span>
                </div>
                <button
                  onClick={() => handleStartQuiz('quiz-2')}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all"
                >
                  <Play className="w-4 h-4" />
                  Launch Quiz 2
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
