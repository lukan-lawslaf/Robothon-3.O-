import React, { useState, useEffect } from 'react';
import { MockTeam, MockCheckpoint, MockQuiz } from '../../mockData';
import { getStoredTeams, getStoredCheckpoints } from '../../services/stateStore';
import { applyForCheckpointReview } from '../../services/backendService';
import { fetchQuiz, submitQuizAnswers } from '../../services/quizService';
import { Bot3DViewer, SubsystemKey, SUBSYSTEMS_DATA } from '../../components/bot/Bot3DViewer';
import SpringCheck from '../../components/common/SpringCheck';
import SwipeRow from '../../components/common/SwipeRow';
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
  Sparkles,
  Cpu,
  Layers,
  ChevronLeft,
} from 'lucide-react';

interface ParticipantDashboardProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  onSelectSubsystem?: (subsystem: SubsystemKey) => void;
}

export const ParticipantDashboard: React.FC<ParticipantDashboardProps> = ({
  activeTab = 'checkpoints',
  onTabChange,
  onSelectSubsystem,
}) => {
  const [team, setTeam] = useState<MockTeam | null>(null);
  const [checkpoints, setCheckpoints] = useState<MockCheckpoint[]>([]);
  const [activeSubsystem, setActiveSubsystem] = useState<SubsystemKey>('motors');
  const [activeCpIndex, setActiveCpIndex] = useState<number>(2); // CP 03 active by default

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
    if (teams && teams.length > 0) {
      setTeam(teams[0]); // AquaPulse Robotics
    }
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
    const sub = (cp.subsystem as SubsystemKey) || 'chassis';
    setActiveSubsystem(sub);
    if (onSelectSubsystem) onSelectSubsystem(sub);
  };

  const handle3DSubsystemSelect = (sub: SubsystemKey) => {
    setActiveSubsystem(sub);
    const matchedIdx = checkpoints.findIndex((c) => c.subsystem === sub);
    if (matchedIdx !== -1) {
      setActiveCpIndex(matchedIdx);
    }
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

  // Quiz Handling
  const handleStartQuiz = async (quizId: string) => {
    const q = await fetchQuiz(quizId);
    if (q) {
      setActiveQuiz(q);
      setCurrentQuestionIdx(0);
      setQuizAnswers({});
      setQuizSecondsLeft(q.timeLimit);
      setQuizResultNotice(null);
    }
  };

  const handleSelectOption = (questionId: string, optIdx: number) => {
    setQuizAnswers((prev) => ({ ...prev, [questionId]: optIdx }));
  };

  const handleQuizFinalSubmit = async () => {
    if (!activeQuiz || !team) return;
    setQuizSubmitting(true);
    try {
      const res = await submitQuizAnswers(team.id, activeQuiz.id, quizAnswers);
      setQuizResultNotice(
        `Quiz submitted! Score: ${res.score}/${activeQuiz.totalPoints}. Qualification Status: ${
          res.isQualified ? 'TOP 50 QUALIFIED' : 'ELIMINATED'
        }`
      );
      setActiveQuiz(null);
      loadData();
    } finally {
      setQuizSubmitting(false);
    }
  };

  const activeCheckpoint = checkpoints[activeCpIndex] || checkpoints[0];
  const approvedCount = checkpoints.filter((c) => c.status === 'approved').length;

  return (
    <div className="w-full min-h-[calc(100vh-65px)] bg-[#FEF3E2] text-[#251306] flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Top Participant Status Header */}
      <div className="max-w-7xl mx-auto w-full mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-white/70 backdrop-blur-md border border-[#F4AE52]/40 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#251306] text-[#FEF3E2] flex items-center justify-center font-mono font-bold text-sm border border-[#F4AE52]/50 shadow-md">
              01
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-[#251306] tracking-tight">
                  {team?.teamName || 'AquaPulse Robotics'}
                </h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 border border-emerald-500/30 font-semibold">
                  Round 2 Active
                </span>
              </div>
              <p className="text-xs font-mono text-[#251306]/70">
                TABLE 01 • Current Stage: <span className="font-semibold text-[#D4621A]">{activeCheckpoint?.code || 'CP 03'}</span>
              </p>
            </div>
          </div>

          {/* Points Breakdown Pill */}
          <div className="flex items-center gap-2 font-mono text-xs">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#FEF3E2] border border-[#F4AE52]/40 text-[#251306]/80 text-[11px]">
              <span>CP: <strong className="text-[#251306]">{team?.checkpointPoints || 0}</strong></span>
              <span>+</span>
              <span>Quiz: <strong className="text-[#251306]">{team?.quizPoints || 0}</strong></span>
              <span>+</span>
              <span>Mini: <strong className="text-[#251306]">{team?.miniGamePoints || 0}</strong></span>
            </div>
            <div className="px-3.5 py-1.5 rounded-xl bg-[#251306] text-[#FEF3E2] flex items-center gap-1.5 shadow-sm border border-[#F4AE52]/40">
              <span className="text-[10px] uppercase text-[#F4AE52]">Total:</span>
              <span className="text-sm font-bold text-[#FEF3E2]">{team?.totalPoints || 0} pts</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Two-Column Interactive Workspace */}
      <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start my-auto">
        {/* Left Column (lg:col-span-6): 3D Observation Aperture & Controls */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center">
          {activeTab === 'checkpoints' ? (
            <div className="w-full flex flex-col items-center">
              <Bot3DViewer
                activeSubsystem={activeSubsystem}
                onSelectSubsystem={handle3DSubsystemSelect}
                highlightedMilestone={activeCheckpoint?.stepNumber}
              />
            </div>
          ) : activeQuiz ? (
            /* Quiz Active Viewport */
            <div
              className="w-full aspect-square max-w-[460px] rounded-full p-8 flex flex-col items-center justify-center text-center relative shadow-2xl border-2 border-[#F4AE52]"
              style={{
                backgroundColor: '#251306',
                boxShadow: '0 20px 50px rgba(37,19,6,0.35), 0 0 30px rgba(244,174,82,0.2)',
              }}
            >
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#F4AE52]">
                Active Time Trial
              </span>
              <h3 className="text-lg font-normal text-white mt-1 px-4">
                {activeQuiz.title}
              </h3>

              {/* Countdown Display */}
              <div className="my-5 font-mono font-bold text-4xl text-[#F4AE52]">
                {Math.floor(quizSecondsLeft / 60)}:
                {String(quizSecondsLeft % 60).padStart(2, '0')}
              </div>

              <div className="px-4 py-1.5 rounded-full bg-white/10 border border-[#F4AE52]/30 text-xs font-mono text-[#FEF3E2]">
                Question {currentQuestionIdx + 1} of {activeQuiz.questions.length}
              </div>

              <div className="mt-4 flex items-center gap-1.5">
                {activeQuiz.questions.map((_, idx) => (
                  <div
                    key={idx}
                    className={`h-1.5 rounded-full transition-all ${
                      idx === currentQuestionIdx
                        ? 'bg-[#D4621A] w-6'
                        : quizAnswers[activeQuiz.questions[idx].id] !== undefined
                        ? 'bg-[#F4AE52] w-3'
                        : 'bg-white/20 w-3'
                    }`}
                  />
                ))}
              </div>
            </div>
          ) : (
            /* Quiz Selection Slate */
            <div className="w-full aspect-square max-w-[460px] rounded-3xl p-8 flex flex-col items-center justify-center text-center bg-white/70 border border-[#F4AE52]/40 shadow-md">
              <Award className="w-12 h-12 text-[#D4621A] mb-3" />
              <h3 className="text-xl font-bold text-[#251306]">Quizzes & Assessment</h3>
              <p className="text-xs text-[#251306]/70 mt-1 max-w-sm font-mono">
                Round 1 Elimination Quiz qualifies Top 50 teams. Round 3 Component Quiz awards extra hardware components.
              </p>
              <div className="mt-6 flex flex-col gap-3 w-full max-w-xs">
                <button
                  type="button"
                  onClick={() => handleStartQuiz('quiz-1')}
                  className="w-full py-2.5 rounded-xl bg-[#251306] text-[#FEF3E2] hover:bg-[#3D2414] font-medium text-xs flex items-center justify-center gap-2 border border-[#F4AE52]/40 shadow-sm transition-all"
                >
                  <Play className="w-3.5 h-3.5 text-[#F4AE52]" />
                  Launch Quiz 1 (Elimination)
                </button>
                <button
                  type="button"
                  onClick={() => handleStartQuiz('quiz-2')}
                  className="w-full py-2.5 rounded-xl bg-white hover:bg-[#FEF3E2] text-[#251306] font-medium text-xs flex items-center justify-center gap-2 border border-[#F4AE52]/60 shadow-sm transition-all"
                >
                  <Play className="w-3.5 h-3.5 text-[#D4621A]" />
                  Launch Quiz 2 (Components)
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column (lg:col-span-6): 7 Checkpoints Side Menu using SwipeRow & SpringCheck */}
        <div className="lg:col-span-6 w-full flex flex-col justify-center space-y-4">
          {activeTab === 'checkpoints' ? (
            <>
              {/* Header */}
              <div className="flex items-center justify-between pb-1 px-1">
                <div>
                  <h2 className="text-xl font-bold text-[#251306] tracking-tight">
                    Boat-Building Milestones
                  </h2>
                  <p className="text-xs text-[#251306]/70 font-mono">
                    Swipe left for review actions • Click card to isolate 3D components
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-[#251306] px-3.5 py-1.5 rounded-full bg-white/80 border border-[#F4AE52]/50 shadow-sm">
                  <span className="text-[#D4621A]">{approvedCount}</span> / 7 Cleared
                </span>
              </div>

              {/* Checkpoints Interactive Stack */}
              <div className="space-y-3 max-h-[62vh] overflow-y-auto pr-1">
                {checkpoints.map((cp, idx) => {
                  const isSelected = activeCpIndex === idx;
                  const isApproved = cp.status === 'approved';
                  const isPending = cp.status === 'pending_review';
                  const isAvailable = cp.status === 'available';
                  const isLocked = cp.status === 'locked';

                  // Swipe actions for SwipeRow
                  const rowActions = isAvailable
                    ? [
                        {
                          id: 'apply-review',
                          label: 'Review',
                          icon: <Send className="w-4 h-4 text-white" />,
                          onSelect: () => handleApplyReview(cp.id),
                        },
                      ]
                    : isApproved
                    ? [
                        {
                          id: 'approved-done',
                          label: 'Cleared',
                          icon: <CheckCircle2 className="w-4 h-4 text-white" />,
                          color: '#10b981',
                        },
                      ]
                    : isPending
                    ? [
                        {
                          id: 'pending-action',
                          label: 'In Review',
                          icon: <Clock className="w-4 h-4 text-white" />,
                          color: '#F4AE52',
                        },
                      ]
                    : [
                        {
                          id: 'locked-action',
                          label: 'Locked',
                          icon: <Lock className="w-4 h-4 text-white" />,
                          color: '#64748b',
                        },
                      ];

                  return (
                    <div
                      key={cp.id}
                      onClick={() => handleSelectCheckpoint(idx, cp)}
                      className="cursor-pointer transition-transform duration-200"
                    >
                      {/* React Bits <SwipeRow /> Container */}
                      <SwipeRow
                        actions={rowActions}
                        direction="left"
                        actionWidth={88}
                        height={64}
                        radius={16}
                        fullSwipe={false}
                        actionColor="#D4621A"
                        drawerColor="#1a0f06"
                        rowColor="#251306"
                        textColor="#f5f5f5"
                        style={{ marginBottom: 8 }}
                        className={`transition-all duration-200 shadow-md border ${
                          isSelected
                            ? 'border-[#F4AE52] ring-2 ring-[#F4AE52]/40 shadow-lg scale-[1.01]'
                            : isApproved
                            ? 'border-emerald-500/40 hover:border-emerald-500/70'
                            : isPending
                            ? 'border-[#F4AE52]/60 hover:border-[#F4AE52]'
                            : isAvailable
                            ? 'border-[#D4621A]/70 hover:border-[#D4621A]'
                            : 'border-white/10 opacity-70'
                        }`}
                      >
                        <div className="w-full h-full flex items-center justify-between gap-3">
                          {/* Left: SpringCheck + Code + Title */}
                          <div className="flex items-center gap-3 min-w-0">
                            {/* React Bits <SpringCheck /> component */}
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="shrink-0 flex items-center"
                            >
                              <SpringCheck
                                label=""
                                checked={isApproved}
                                disabled={true}
                                color="#ffffff"
                                fillColor="#10b981"
                                checkColor="#0b0b0f"
                                boxSize={22}
                                boxRadius={7}
                                bounce={0.25}
                              />
                            </div>

                            {/* Checkpoint Code Pill */}
                            <span className="w-12 py-1 rounded-md bg-[#382314] text-[#F4AE52] font-mono text-[11px] font-bold text-center shrink-0 border border-[#F4AE52]/30">
                              {cp.code}
                            </span>

                            {/* Title & Points Category */}
                            <div className="truncate">
                              <h3 className="text-xs sm:text-sm font-semibold text-white truncate">
                                {cp.title}
                              </h3>
                              <span className="text-[10px] font-mono text-[#F4AE52] flex items-center gap-1.5">
                                <strong className="text-[#F4AE52]">+{cp.points} pts</strong>
                                <span className="text-white/40">•</span>
                                <span className="uppercase text-[#FEF3E2]/70">{SUBSYSTEMS_DATA[cp.subsystem as SubsystemKey]?.category || 'Hardware'}</span>
                              </span>
                            </div>
                          </div>

                          {/* Right: Status Pill */}
                          <div className="shrink-0">
                            {isApproved && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                Cleared
                              </span>
                            )}
                            {isPending && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-[#F4AE52]/20 text-[#F4AE52] border border-[#F4AE52]/50">
                                <Clock className="w-3 h-3 text-[#F4AE52] animate-spin" />
                                In Review
                              </span>
                            )}
                            {isAvailable && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-[#D4621A] text-white shadow-sm">
                                Active Step
                              </span>
                            )}
                            {isLocked && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono text-white/40 bg-white/5 border border-white/10">
                                <Lock className="w-3 h-3" />
                                Locked
                              </span>
                            )}
                          </div>
                        </div>
                      </SwipeRow>

                      {/* Expanded Detail Drawer when Selected */}
                      {isSelected && (
                        <div className="mt-1 mb-3 p-4 rounded-xl bg-[#251306] border border-[#F4AE52]/40 shadow-lg text-xs text-[#FEF3E2] space-y-3 animate-fadeIn">
                          <p className="leading-relaxed font-sans text-[#FEF3E2]/90">
                            {cp.description}
                          </p>

                          <div className="flex items-center justify-between pt-2 border-t border-white/10">
                            <span className="text-[10px] font-mono text-[#F4AE52]">
                              Subsystem: <strong className="text-white uppercase">{cp.subsystem}</strong>
                            </span>

                            {/* Direct Action Button in Vibrant Terracotta #D4621A */}
                            {isAvailable && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleApplyReview(cp.id);
                                }}
                                disabled={submittingReview}
                                className="px-5 py-2 rounded-xl bg-[#D4621A] hover:bg-[#b84e0e] text-[#FEF3E2] text-xs font-semibold flex items-center gap-2 shadow-md transition-all disabled:opacity-50 hover:scale-[1.02] active:scale-95"
                              >
                                <Send className="w-3.5 h-3.5" />
                                <span>{submittingReview ? 'Dispatching Ticket...' : 'Apply for Physical Review'}</span>
                              </button>
                            )}

                            {isPending && (
                              <span className="text-[11px] font-mono text-[#F4AE52] font-semibold flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 animate-spin" />
                                Review ticket active on Admin queue
                              </span>
                            )}

                            {isApproved && (
                              <span className="text-[11px] font-mono text-emerald-400 font-semibold flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                Milestone verified & +{cp.points} pts added
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          ) : activeQuiz ? (
            /* Quiz Active Questions Card */
            <div className="p-6 rounded-2xl bg-white/80 backdrop-blur-md border border-[#F4AE52]/40 shadow-sm space-y-5">
              <div>
                <span className="text-[10px] font-mono uppercase text-[#D4621A] font-bold">
                  Question {currentQuestionIdx + 1} of {activeQuiz.questions.length}
                </span>
                <h3 className="text-base sm:text-lg font-bold text-[#251306] mt-1">
                  {activeQuiz.questions[currentQuestionIdx].question}
                </h3>
              </div>

              <div className="space-y-2.5">
                {activeQuiz.questions[currentQuestionIdx].options.map((opt, optIdx) => {
                  const qId = activeQuiz.questions[currentQuestionIdx].id;
                  const isChosen = quizAnswers[qId] === optIdx;
                  return (
                    <button
                      key={optIdx}
                      type="button"
                      onClick={() => handleSelectOption(qId, optIdx)}
                      className={`w-full text-left p-3.5 rounded-xl border text-xs sm:text-sm font-medium transition-all flex items-center justify-between ${
                        isChosen
                          ? 'border-[#D4621A] bg-[#D4621A]/10 text-[#D4621A] font-bold shadow-sm'
                          : 'border-[#F4AE52]/40 bg-white/70 hover:bg-white text-[#251306]'
                      }`}
                    >
                      <span>{opt}</span>
                      <span
                        className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] ${
                          isChosen ? 'border-[#D4621A] bg-[#D4621A] text-white' : 'border-[#251306]/30'
                        }`}
                      >
                        {isChosen ? '✓' : ''}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-[#F4AE52]/30">
                <button
                  type="button"
                  disabled={currentQuestionIdx === 0}
                  onClick={() => setCurrentQuestionIdx((p) => Math.max(0, p - 1))}
                  className="px-4 py-2 rounded-xl border border-[#F4AE52]/50 text-xs font-mono text-[#251306] disabled:opacity-30"
                >
                  Previous
                </button>

                {currentQuestionIdx < activeQuiz.questions.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentQuestionIdx((p) => p + 1)}
                    className="px-5 py-2 rounded-xl bg-[#251306] text-[#FEF3E2] text-xs font-mono font-bold hover:bg-[#3D2414] transition-all"
                  >
                    Next Question
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={quizSubmitting}
                    onClick={handleQuizFinalSubmit}
                    className="px-6 py-2 rounded-xl bg-[#D4621A] text-[#FEF3E2] text-xs font-bold hover:bg-[#b84e0e] shadow-md transition-all"
                  >
                    {quizSubmitting ? 'Grading...' : 'Submit Answers'}
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* Quiz Completed Banner or Instructions */
            <div className="p-6 rounded-2xl bg-white/70 border border-[#F4AE52]/40 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-[#251306]">Quiz Engine Rules</h3>
              <ul className="text-xs font-mono text-[#251306]/80 space-y-2 list-disc list-inside">
                <li>Round 1: 10-minute timed quiz. Only Top 50 teams qualify for Round 2.</li>
                <li>Round 3: Component allocation challenge for supplemental hardware.</li>
                <li>Answers are auto-evaluated and broadcast live to the Leaderboard.</li>
              </ul>
              {quizResultNotice && (
                <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-900 text-xs font-mono">
                  {quizResultNotice}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Telemetry Bar */}
      <div className="max-w-7xl mx-auto w-full mt-6 pt-3 border-t border-[#F4AE52]/30 flex flex-wrap items-center justify-between gap-4 text-[11px] font-mono text-[#251306]/70">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-bold text-[#251306]">ROBOTHON 3.0 // HARDWARE BENCH</span>
          <span>•</span>
          <span>Table 01 Active</span>
        </div>

        <div className="flex items-center gap-4">
          <span>
            Active Subsystem: <strong className="text-[#D4621A] uppercase">{activeSubsystem}</strong>
          </span>
          <span>•</span>
          <span>
            Overall Rank: <strong className="text-[#251306]">#{team?.rank || 1}</strong>
          </span>
          <span>•</span>
          <span className="text-emerald-700 font-bold">Top 50 Qualified</span>
        </div>
      </div>
    </div>
  );
};
