import React, { useState, useEffect } from 'react';
import { MockTeam, MockCheckpoint, MockQuiz } from '../../mockData';
import { getStoredTeams, getStoredCheckpoints } from '../../services/stateStore';
import { applyForCheckpointReview } from '../../services/backendService';
import { fetchQuiz, submitQuizAnswers } from '../../services/quizService';
import { Bot3DViewer, SubsystemKey, SUBSYSTEMS_DATA } from '../../components/bot/Bot3DViewer';
import {
  CheckCircle2,
  Clock,
  Lock,
  Send,
  Play,
  Award,
  ChevronRight,
  AlertCircle,
  HelpCircle,
  CheckSquare,
} from 'lucide-react';

interface ParticipantDashboardProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  onSelectSubsystem?: (subsystem: SubsystemKey) => void;
}

// Map checkpoint steps to 3D bot subsystems for 3D synchronization
const CHECKPOINT_SUBSYSTEM_MAP: Record<number, SubsystemKey> = {
  1: 'chassis',
  2: 'motors',
  3: 'l298n',
  4: 'wires',
  5: 'battery',
  6: 'esp32',
  7: 'chassis',
  8: 'wheels',
};

export const ParticipantDashboard: React.FC<ParticipantDashboardProps> = ({
  activeTab = 'checkpoints',
  onTabChange,
  onSelectSubsystem,
}) => {
  const [team, setTeam] = useState<MockTeam | null>(null);
  const [checkpoints, setCheckpoints] = useState<MockCheckpoint[]>([]);
  const [activeSubsystem, setActiveSubsystem] = useState<SubsystemKey>('chassis');
  const [activeCpIndex, setActiveCpIndex] = useState<number>(2); // Step 3 active by default

  // Quiz state
  const [activeQuiz, setActiveQuiz] = useState<MockQuiz | null>(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState<number>(0);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [quizSecondsLeft, setQuizSecondsLeft] = useState<number>(0);
  const [quizSubmitting, setQuizSubmitting] = useState<boolean>(false);
  const [quizResultNotice, setQuizResultNotice] = useState<string | null>(null);
  const [submittingReview, setSubmittingReview] = useState<boolean>(false);

  const loadData = () => {
    const teams = getStoredTeams();
    setTeam(teams[0]); // AquaPulse Robotics
    const cps = getStoredCheckpoints();
    setCheckpoints(cps);
  };

  useEffect(() => {
    loadData();
    window.addEventListener('robothon_store_updated', loadData);
    return () => window.removeEventListener('robothon_store_updated', loadData);
  }, []);

  // Timer for active quiz
  useEffect(() => {
    if (!activeQuiz || quizSecondsLeft <= 0) return;
    const timer = setInterval(() => {
      setQuizSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleQuizFinalSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [activeQuiz, quizSecondsLeft]);

  const handleSelectCheckpoint = (idx: number, cp: MockCheckpoint) => {
    setActiveCpIndex(idx);
    const sub = CHECKPOINT_SUBSYSTEM_MAP[cp.stepNumber] || 'chassis';
    setActiveSubsystem(sub);
    if (onSelectSubsystem) onSelectSubsystem(sub);
  };

  const handleApplyReview = async (cpId: string) => {
    if (!team) return;
    try {
      setSubmittingReview(true);
      await applyForCheckpointReview(team.id, cpId);
      loadData();
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleStartQuiz = async (quizId: string) => {
    const q = await fetchQuiz(quizId);
    setActiveQuiz(q);
    setCurrentQuestionIdx(0);
    setQuizAnswers({});
    setQuizSecondsLeft(q.timeLimit);
    setQuizResultNotice(null);
  };

  const handleQuizFinalSubmit = async () => {
    if (!activeQuiz || !team) return;
    try {
      setQuizSubmitting(true);
      const res = await submitQuizAnswers(team.id, activeQuiz.id, quizAnswers);
      setQuizResultNotice(
        `Quiz submitted! You scored ${res.score} / ${res.totalPoints} points. ${
          res.isQualified ? 'You are qualified for Round 2!' : ''
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
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 flex-1 flex flex-col justify-between">
      {/* Quiz Submission Notice if present */}
      {quizResultNotice && (
        <div className="mb-4 p-3.5 rounded-2xl bg-[#D4621A]/20 border border-[#D4621A]/40 text-[#FEF3E2] text-xs font-mono flex items-center justify-between">
          <span>{quizResultNotice}</span>
          <button
            onClick={() => setQuizResultNotice(null)}
            className="text-[#F4AE52] hover:underline ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Two-Column Stage: Left 3D Viewport + Right Stacked Pill Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center min-h-[68vh]">
        {/* Left Stage (Col 1-6): Circular Framed 3D Bot / Quiz Telemetry */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center relative">
          {activeTab === 'checkpoints' || !activeQuiz ? (
            <div className="w-full flex flex-col items-center">
              <Bot3DViewer
                activeSubsystem={activeSubsystem}
                onSelectSubsystem={(k) => {
                  setActiveSubsystem(k);
                  if (onSelectSubsystem) onSelectSubsystem(k);
                }}
              />

              {/* Subsystem Technical Detail Badge */}
              <div className="mt-3 text-center max-w-sm">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#F4AE52]">
                  {SUBSYSTEMS_DATA[activeSubsystem]?.category} Spec:
                </span>
                <p className="text-xs text-[#FEF3E2]/80 font-mono mt-0.5 truncate">
                  {SUBSYSTEMS_DATA[activeSubsystem]?.specs}
                </p>
              </div>
            </div>
          ) : (
            /* Quiz Active Viewport on Left: Timer & Questions Progress */
            <div
              className="w-full aspect-square max-w-[440px] rounded-full p-8 flex flex-col items-center justify-center text-center relative shadow-2xl"
              style={{
                border: '3px solid #F4AE52',
                backgroundColor: '#2A1A0E',
                boxShadow: '0 0 35px rgba(244,174,82,0.2)',
              }}
            >
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#F4AE52]">
                Active Time Trial
              </span>
              <h3 className="text-xl font-normal text-white mt-1">
                {activeQuiz.title}
              </h3>

              {/* Huge Countdown Display */}
              <div className="my-5 font-mono font-bold text-4xl text-[#F4AE52]">
                {Math.floor(quizSecondsLeft / 60)}:
                {String(quizSecondsLeft % 60).padStart(2, '0')}
              </div>

              <div className="px-4 py-1.5 rounded-full bg-[rgba(254,243,226,0.1)] border border-[#F4AE52]/30 text-xs font-mono text-[#FEF3E2]">
                Question {currentQuestionIdx + 1} of {activeQuiz.questions.length}
              </div>

              <div className="mt-4 flex items-center gap-1">
                {activeQuiz.questions.map((_, idx) => (
                  <div
                    key={idx}
                    className={`w-3 h-1.5 rounded-full transition-all ${
                      idx === currentQuestionIdx
                        ? 'bg-[#D4621A] w-6'
                        : quizAnswers[activeQuiz.questions[idx].id] !== undefined
                        ? 'bg-[#F4AE52]'
                        : 'bg-white/20'
                    }`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column (Col 7-12): Stacked Horizontal Pill Cards (image_da50de.png Contract) */}
        <div className="lg:col-span-6 w-full flex flex-col justify-center space-y-3.5">
          {activeTab === 'checkpoints' ? (
            <>
              <div className="flex items-center justify-between pb-1 px-1">
                <div>
                  <h2 className="text-xl font-normal text-white tracking-tight">
                    Boat-Building Milestones
                  </h2>
                  <p className="text-xs text-[#8C7360] font-mono">
                    Select a card to isolate 3D components & view specs
                  </p>
                </div>
                <span className="text-xs font-mono text-[#F4AE52] px-3 py-1 rounded-full bg-[rgba(244,174,82,0.12)] border border-[#F4AE52]/30">
                  {checkpoints.filter((c) => c.status === 'approved').length} / {checkpoints.length} Cleared
                </span>
              </div>

              {/* Stack of Horizontal Rounded Pill Cards */}
              <div className="space-y-3 max-h-[62vh] overflow-y-auto pr-1">
                {checkpoints.map((cp, idx) => {
                  const isSelected = activeCpIndex === idx;
                  const isApproved = cp.status === 'approved';
                  const isPending = cp.status === 'pending_review';
                  const isAvailable = cp.status === 'available';
                  const isLocked = cp.status === 'locked';

                  return (
                    <div
                      key={cp.id}
                      onClick={() => handleSelectCheckpoint(idx, cp)}
                      className={`cursor-pointer transition-all duration-300 rounded-2xl px-5 py-4 border ${
                        isSelected
                          ? 'border-[#F4AE52] bg-[rgba(42,26,14,0.95)] shadow-xl shadow-[#D4621A]/10 scale-[1.01]'
                          : isApproved
                          ? 'border-emerald-500/30 bg-[rgba(42,26,14,0.7)] hover:border-emerald-500/60'
                          : isPending
                          ? 'border-[#F4AE52]/50 bg-[rgba(42,26,14,0.85)]'
                          : isAvailable
                          ? 'border-[rgba(254,243,226,0.2)] bg-[rgba(42,26,14,0.75)] hover:border-[#F4AE52]/50'
                          : 'border-white/5 bg-[rgba(42,26,14,0.4)] opacity-50'
                      }`}
                      style={{ letterSpacing: '-0.02em' }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="w-7 h-7 rounded-full bg-[#3D2414] border border-[#F4AE52]/30 text-[#F4AE52] font-mono text-xs flex items-center justify-center shrink-0">
                            0{cp.stepNumber}
                          </span>
                          <div>
                            <h3 className="text-sm font-normal text-white">{cp.title}</h3>
                            <span className="text-[10px] font-mono text-[#F4AE52]">
                              +{cp.points} Points // {SUBSYSTEMS_DATA[CHECKPOINT_SUBSYSTEM_MAP[cp.stepNumber]]?.category}
                            </span>
                          </div>
                        </div>

                        {/* Status Pills */}
                        <div>
                          {isApproved && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                              <CheckCircle2 className="w-3 h-3" /> Approved
                            </span>
                          )}
                          {isPending && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-[#F4AE52]/20 text-[#F4AE52] border border-[#F4AE52]/40">
                              <Clock className="w-3 h-3 animate-pulse" /> In Review
                            </span>
                          )}
                          {isAvailable && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-[#D4621A]/20 text-[#D4621A] border border-[#D4621A]/40">
                              Active Milestone
                            </span>
                          )}
                          {isLocked && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-white/5 text-white/40">
                              <Lock className="w-3 h-3" /> Locked
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Expanded Section on Active / Selected Card */}
                      {isSelected && (
                        <div className="mt-3 pt-3 border-t border-white/10 text-xs text-[#FEF3E2]/80 space-y-3">
                          <p className="leading-relaxed">{cp.description}</p>

                          {/* Action Button: Apply for Review (in #D4621A Orange, per DESIGN.md) */}
                          {isAvailable && (
                            <div className="flex justify-end pt-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleApplyReview(cp.id);
                                }}
                                disabled={submittingReview}
                                className="px-5 py-2.5 rounded-xl bg-[#D4621A] hover:bg-[#F4AE52] text-[#FEF3E2] hover:text-[#2A1A0E] text-xs font-normal tracking-tight flex items-center gap-2 shadow-lg transition-all disabled:opacity-50"
                              >
                                <Send className="w-3.5 h-3.5" />
                                <span>{submittingReview ? 'Dispatching...' : 'Apply for Review'}</span>
                              </button>
                            </div>
                          )}

                          {isPending && (
                            <p className="text-[11px] font-mono text-[#F4AE52] italic">
                              * Ticket sent to Tech Admin. Please keep boat hardware accessible at Table 1.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            /* Quizzes Tab Content */
            <div className="space-y-4">
              {activeQuiz ? (
                /* MCQ Option Bars matching the 4 stacked horizontal pill bars from image_da50de.png! */
                <div className="space-y-3">
                  <div className="mb-2">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-[#F4AE52]">
                      Question {currentQuestionIdx + 1}
                    </span>
                    <h3 className="text-base font-normal text-white mt-1 leading-snug">
                      {activeQuiz.questions[currentQuestionIdx].question}
                    </h3>
                  </div>

                  {activeQuiz.questions[currentQuestionIdx].options.map((opt, optIdx) => {
                    const isSelected =
                      quizAnswers[activeQuiz.questions[currentQuestionIdx].id] === optIdx;

                    return (
                      <div
                        key={optIdx}
                        onClick={() =>
                          setQuizAnswers((prev) => ({
                            ...prev,
                            [activeQuiz.questions[currentQuestionIdx].id]: optIdx,
                          }))
                        }
                        className={`cursor-pointer p-4 rounded-2xl border transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-[#D4621A] border-[#F4AE52] text-[#FEF3E2] shadow-lg'
                            : 'bg-[rgba(42,26,14,0.8)] border-[rgba(254,243,226,0.14)] text-[#FEF3E2]/80 hover:border-[#F4AE52]/50 hover:bg-[rgba(42,26,14,0.95)]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-6 h-6 rounded-full flex items-center justify-center font-mono text-xs ${
                              isSelected ? 'bg-white text-[#2A1A0E] font-bold' : 'bg-[#3D2414] text-[#F4AE52]'
                            }`}
                          >
                            {String.fromCharCode(65 + optIdx)}
                          </span>
                          <span className="text-xs sm:text-sm">{opt}</span>
                        </div>
                        {isSelected && <span className="font-bold text-sm">✓</span>}
                      </div>
                    );
                  })}

                  {/* Navigation in Quiz */}
                  <div className="flex items-center justify-between pt-4">
                    <button
                      type="button"
                      disabled={currentQuestionIdx === 0}
                      onClick={() => setCurrentQuestionIdx((p) => Math.max(0, p - 1))}
                      className="px-4 py-2 rounded-xl text-xs font-mono text-white/60 hover:text-white disabled:opacity-30"
                    >
                      ← Previous
                    </button>

                    {currentQuestionIdx < activeQuiz.questions.length - 1 ? (
                      <button
                        type="button"
                        onClick={() => setCurrentQuestionIdx((p) => p + 1)}
                        className="px-5 py-2.5 rounded-xl bg-[#F4AE52] text-[#2A1A0E] text-xs font-normal tracking-tight flex items-center gap-1.5 shadow-md"
                      >
                        <span>Next Question</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleQuizFinalSubmit}
                        disabled={quizSubmitting}
                        className="px-6 py-2.5 rounded-xl bg-[#D4621A] text-white text-xs font-normal tracking-tight flex items-center gap-2 shadow-lg disabled:opacity-50"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{quizSubmitting ? 'Submitting...' : 'Submit Final Answers'}</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                /* Launch Cards for Quiz 1 & 2 */
                <div className="space-y-4">
                  <div className="p-6 rounded-2xl border border-[rgba(254,243,226,0.16)] bg-[rgba(42,26,14,0.85)] shadow-xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-[#D4621A]/20 text-[#D4621A] border border-[#D4621A]/40">
                        Round 1 Elimination
                      </span>
                      <span className="text-xs font-mono text-[#F4AE52]">100 Points</span>
                    </div>
                    <h3 className="text-lg font-normal text-white">Quiz 1: Marine Electronics & Hydrodynamics</h3>
                    <p className="text-xs text-[#FEF3E2]/75 mt-1 leading-relaxed">
                      Timed technical qualifier. Only the Top 50 teams advance to the hardware checkpoints round.
                    </p>
                    <button
                      onClick={() => handleStartQuiz('quiz-1')}
                      className="mt-4 w-full py-3 rounded-xl bg-[#D4621A] hover:bg-[#F4AE52] text-[#FEF3E2] hover:text-[#2A1A0E] text-xs font-normal tracking-tight flex items-center justify-center gap-2 transition-all shadow-md"
                    >
                      <Play className="w-4 h-4" />
                      <span>Start Round 1 Quiz (10 Mins)</span>
                    </button>
                  </div>

                  <div className="p-6 rounded-2xl border border-[rgba(254,243,226,0.16)] bg-[rgba(42,26,14,0.85)] shadow-xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-[#F4AE52]/20 text-[#F4AE52] border border-[#F4AE52]/40">
                        Round 3 Component Sprint
                      </span>
                      <span className="text-xs font-mono text-[#F4AE52]">50 Points</span>
                    </div>
                    <h3 className="text-lg font-normal text-white">Quiz 2: Component Allocation</h3>
                    <p className="text-xs text-[#FEF3E2]/75 mt-1 leading-relaxed">
                      Mid-event technical sprint to earn bonus high-discharge LiPos and telemetry hardware modules.
                    </p>
                    <button
                      onClick={() => handleStartQuiz('quiz-2')}
                      className="mt-4 w-full py-3 rounded-xl bg-[#F4AE52] hover:bg-[#D4621A] text-[#2A1A0E] hover:text-[#FEF3E2] text-xs font-normal tracking-tight flex items-center justify-center gap-2 transition-all shadow-md"
                    >
                      <Play className="w-4 h-4" />
                      <span>Start Component Quiz (5 Mins)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
