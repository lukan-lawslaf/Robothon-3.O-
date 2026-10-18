import React, { useState, useEffect } from 'react';
import { MockTeam, MockCheckpoint, MockQuiz } from '../../mockData';
import { getStoredTeams, getStoredCheckpoints } from '../../services/stateStore';
import { applyForCheckpointReview } from '../../services/backendService';
import { fetchQuiz, submitQuizAnswers } from '../../services/quizService';
import { Bot3DViewer, SubsystemKey, SUBSYSTEMS_DATA } from '../../components/bot/Bot3DViewer';
import {
  Trophy,
  Settings,
  Check,
  Play,
  Lock,
  Clock,
  Send,
  Award,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

const thumbnailMap: Record<string, string> = {
  'cp-1': '/thumbnails/cp1_motor.png',
  '1': '/thumbnails/cp1_motor.png',
  'cp-2': '/thumbnails/cp2_l298n.png',
  '2': '/thumbnails/cp2_l298n.png',
  'cp-3': '/thumbnails/cp3_esp32.png',
  '3': '/thumbnails/cp3_esp32.png',
  'cp-4': '/thumbnails/cp4_code.png',
  '4': '/thumbnails/cp4_code.png',
  'cp-5': '/thumbnails/cp5_battery.png',
  '5': '/thumbnails/cp5_battery.png',
  'cp-6': '/thumbnails/cp6_ble.png',
  '6': '/thumbnails/cp6_ble.png',
  'cp-7': '/thumbnails/cp7_chassis.png',
  '7': '/thumbnails/cp7_chassis.png',
};

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
  const [activeSubsystem, setActiveSubsystem] = useState<SubsystemKey>('wires');
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
    <div className="w-full min-h-[calc(100vh-65px)] bg-[#f6f1e8] text-stone-900 flex flex-col justify-between p-4 sm:p-6 lg:p-8 font-sans">
      {/* 1. Current Stage & Team Header Bar (Exact Match: User Image 2 & 4) */}
      <div className="max-w-7xl mx-auto w-full mb-6">
        <div className="w-full rounded-2xl bg-[#fdfcf9] border border-[#ebe4d6] shadow-xs px-5 py-3.5 flex flex-wrap items-center justify-between gap-4">
          {/* Left: Team Number Badge + Name + Round + Stage */}
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-[#1c120c] border-2 border-[#b46b2b] text-white flex items-center justify-center font-mono font-bold text-base shadow-xs shrink-0">
              01
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-base sm:text-lg font-bold text-stone-900 tracking-tight">
                  {team?.teamName || 'AquaPulse Robotics'}
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#dcfce7] border border-[#bbf7d0] text-[#047857] text-[11px] font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#059669]"></span>
                  Round 2 Active
                </span>
              </div>
              <p className="text-xs font-mono text-stone-500 mt-0.5">
                TABLE 01 <span className="text-stone-300 mx-1">•</span> Current Stage:{' '}
                <span className="font-bold text-[#ea580c]">{activeCheckpoint?.code || 'CP 01'}</span>
              </p>
            </div>
          </div>

          {/* Right: Point breakdown + Total Points Trophy Card */}
          <div className="flex items-center gap-3">
            {/* 3-column Point Breakdown Pill */}
            <div className="hidden sm:flex items-center gap-4 px-4 py-2 rounded-xl bg-[#fbf9f5] border border-[#e8dfcf]">
              <div className="text-center px-1">
                <div className="text-[10px] text-stone-500 font-medium tracking-wide">CP:</div>
                <div className="text-sm font-bold text-stone-900">{team?.checkpointPoints || 125}</div>
              </div>
              <div className="h-6 w-px bg-stone-300/80" />
              <div className="text-center px-1">
                <div className="text-[10px] text-stone-500 font-medium tracking-wide">Quiz:</div>
                <div className="text-sm font-bold text-stone-900">{team?.quizPoints || 90}</div>
              </div>
              <div className="h-6 w-px bg-stone-300/80" />
              <div className="text-center px-1">
                <div className="text-[10px] text-stone-500 font-medium tracking-wide">Mini:</div>
                <div className="text-sm font-bold text-stone-900">{team?.miniGamePoints || 30}</div>
              </div>
            </div>

            {/* Dark Total Points Box */}
            <div className="px-4 py-2 rounded-xl bg-[#1a120c] border border-[#332216] flex items-center gap-3 shadow-xs">
              <Trophy className="w-5 h-5 text-[#ea580c] shrink-0" />
              <div className="flex flex-col">
                <span className="text-[9px] uppercase tracking-wider text-stone-400 font-medium leading-none">
                  Total
                </span>
                <span className="text-base font-black text-[#ea580c] leading-tight">
                  {team?.totalPoints || 245} pts
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Two-Column Interactive Workspace */}
      <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start my-auto">
        {/* Left Column (lg:col-span-6): 3D Autonomous Bot Stage */}
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
              className="w-full aspect-square max-w-[460px] rounded-3xl p-8 flex flex-col items-center justify-center text-center relative shadow-2xl border-2 border-[#ea580c] bg-[#141210]"
              style={{
                boxShadow: '0 20px 50px rgba(20,18,16,0.35), 0 0 30px rgba(234,88,12,0.2)',
              }}
            >
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#ea580c] font-bold">
                Active Time Trial
              </span>
              <h3 className="text-lg font-bold text-white mt-1 px-4">{activeQuiz.title}</h3>

              {/* Countdown Display */}
              <div className="my-5 font-mono font-bold text-4xl text-[#ea580c]">
                {Math.floor(quizSecondsLeft / 60)}:
                {String(quizSecondsLeft % 60).padStart(2, '0')}
              </div>

              <div className="px-4 py-1.5 rounded-full bg-white/10 border border-[#ea580c]/30 text-xs font-mono text-stone-200">
                Question {currentQuestionIdx + 1} of {activeQuiz.questions.length}
              </div>

              <div className="mt-4 flex items-center gap-1.5">
                {activeQuiz.questions.map((_, idx) => (
                  <div
                    key={idx}
                    className={`h-1.5 rounded-full transition-all ${
                      idx === currentQuestionIdx
                        ? 'bg-[#ea580c] w-6'
                        : quizAnswers[activeQuiz.questions[idx].id] !== undefined
                        ? 'bg-[#f97316] w-3'
                        : 'bg-white/20 w-3'
                    }`}
                  />
                ))}
              </div>
            </div>
          ) : (
            /* Quiz Selection Slate */
            <div className="w-full aspect-square max-w-[460px] rounded-3xl p-8 flex flex-col items-center justify-center text-center bg-[#fdfcf9] border border-[#e8dfcf] shadow-md">
              <Award className="w-12 h-12 text-[#ea580c] mb-3" />
              <h3 className="text-xl font-bold text-stone-900">Quizzes & Assessment</h3>
              <p className="text-xs text-stone-600 mt-1 max-w-sm font-mono">
                Round 1 Elimination Quiz qualifies Top 50 teams. Round 3 Component Quiz awards extra
                hardware components.
              </p>
              <div className="mt-6 flex flex-col gap-3 w-full max-w-xs">
                <button
                  type="button"
                  onClick={() => handleStartQuiz('quiz-1')}
                  className="w-full py-2.5 rounded-xl bg-[#1c120c] text-white hover:bg-[#2d1f15] font-medium text-xs flex items-center justify-center gap-2 border border-[#b46b2b]/40 shadow-sm transition-all"
                >
                  <Play className="w-3.5 h-3.5 text-[#ea580c]" />
                  Launch Quiz 1 (Elimination)
                </button>
                <button
                  type="button"
                  onClick={() => handleStartQuiz('quiz-2')}
                  className="w-full py-2.5 rounded-xl bg-white hover:bg-[#fffbf5] text-stone-900 font-medium text-xs flex items-center justify-center gap-2 border border-[#ea580c]/60 shadow-sm transition-all"
                >
                  <Play className="w-3.5 h-3.5 text-[#ea580c]" />
                  Launch Quiz 2 (Components)
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column (lg:col-span-6): Boat-Building Milestones Timeline & Cards (Exact Match: User Image 1 & 4) */}
        <div className="lg:col-span-6 w-full flex flex-col justify-center">
          {activeTab === 'checkpoints' ? (
            <div className="rounded-3xl bg-[#fdfcf9] border border-[#e8dfcf] p-6 shadow-xs">
              {/* Header: Gear Icon + Title + Progress Counter */}
              <div className="flex items-start justify-between pb-3 border-b border-[#eee7db]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#fff4eb] border border-[#fed7aa] flex items-center justify-center text-[#ea580c] shrink-0">
                    <Settings className="w-5 h-5 text-[#ea580c]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-stone-900 tracking-tight">
                      Boat-Building Milestones
                    </h2>
                    <p className="text-xs text-stone-500 mt-0.5">
                      Complete each checkpoint to build your autonomous boat prototype.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end shrink-0 ml-2">
                  <span className="text-xs font-bold text-stone-800">
                    <span className="text-[#ea580c]">{approvedCount}</span> / {checkpoints.length} Cleared
                  </span>
                  {/* Progress Bar */}
                  <div className="w-24 sm:w-28 h-1.5 bg-[#ede8dc] rounded-full overflow-hidden mt-1.5">
                    <div
                      className="h-full bg-[#ea580c] transition-all duration-300 rounded-full"
                      style={{
                        width: `${(approvedCount / (checkpoints.length || 7)) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Connected Timeline Checklist */}
              <div className="relative mt-5 pl-8 pr-1 space-y-3.5 max-h-[62vh] overflow-y-auto">
                {/* Continuous Vertical Timeline Line */}
                <div className="absolute left-[11px] top-6 bottom-6 w-0.5 bg-[#ddd5c8] pointer-events-none" />

                {checkpoints.map((cp, idx) => {
                  const isSelected = activeCpIndex === idx;
                  const isApproved = cp.status === 'approved';
                  const isPending = cp.status === 'pending_review';
                  const isAvailable = cp.status === 'available';
                  const isLocked = cp.status === 'locked';
                  const thumbnailSrc =
                    thumbnailMap[cp.id] || thumbnailMap[String(cp.stepNumber)] || '/thumbnails/cp1_motor.png';

                  return (
                    <div key={cp.id} className="relative flex items-start group">
                      {/* Left Timeline Node Indicator */}
                      <div className="absolute -left-8 top-5 shrink-0">
                        {isApproved ? (
                          <div className="w-6 h-6 rounded-full bg-[#059669] text-white flex items-center justify-center shadow-xs z-10">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        ) : isAvailable || isSelected ? (
                          <div className="w-6 h-6 rounded-full bg-white border-2 border-[#ea580c] flex items-center justify-center shadow-xs z-10">
                            <div className="w-2.5 h-2.5 rounded-full bg-[#ea580c]" />
                          </div>
                        ) : isPending ? (
                          <div className="w-6 h-6 rounded-full bg-white border-2 border-[#f59e0b] flex items-center justify-center shadow-xs z-10">
                            <div className="w-2.5 h-2.5 rounded-full bg-[#f59e0b] animate-ping" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-[#ccc4b5] border-2 border-stone-300 flex items-center justify-center z-10 mt-0.5 ml-0.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-stone-500" />
                          </div>
                        )}
                      </div>

                      {/* Checkpoint Card */}
                      <div
                        onClick={() => handleSelectCheckpoint(idx, cp)}
                        className={`w-full rounded-2xl p-4 transition-all duration-200 cursor-pointer ${
                          isAvailable || isSelected
                            ? 'bg-[#fffbf5] border-2 border-[#ea580c]/80 shadow-sm ring-2 ring-[#ea580c]/10'
                            : isApproved
                            ? 'bg-white/95 border border-[#eee7db] shadow-xs hover:border-[#ea580c]/40'
                            : isPending
                            ? 'bg-[#fffdfa] border-2 border-[#f59e0b]/80 shadow-xs'
                            : 'bg-[#f8f6f0]/80 border border-[#eae3d5] opacity-80 hover:opacity-95'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          {/* Title, Code & Points Row */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-bold shrink-0 ${
                                  isLocked ? 'bg-[#38332e] text-stone-300' : 'bg-[#1c120c] text-white'
                                }`}
                              >
                                {cp.code}
                              </span>
                              <h3 className="text-sm font-bold text-stone-900 truncate">{cp.title}</h3>
                            </div>

                            <div className="flex items-center gap-1.5 text-xs mt-1">
                              <span
                                className={`font-bold ${
                                  isLocked ? 'text-stone-500' : 'text-[#ea580c]'
                                }`}
                              >
                                +{cp.points} pts
                              </span>
                              <span className="text-stone-300">•</span>
                              <span className="text-[10px] uppercase tracking-wider font-semibold text-stone-400">
                                {SUBSYSTEMS_DATA[cp.subsystem as SubsystemKey]?.category || 'HARDWARE'}
                              </span>
                            </div>
                          </div>

                          {/* Right Status / Action Badge */}
                          <div className="shrink-0 flex items-center gap-2">
                            {isApproved && (
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-[#dcfce7] text-[#047857]">
                                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                                Cleared
                              </span>
                            )}

                            {isAvailable && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleApplyReview(cp.id);
                                }}
                                disabled={submittingReview}
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#ea580c] hover:bg-[#c2410c] text-white shadow-xs transition-colors"
                              >
                                <Play className="w-3 h-3 fill-white text-white" />
                                {submittingReview ? 'Requesting...' : 'Active Step'}
                              </button>
                            )}

                            {isPending && (
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-[#fef3c7] text-[#b45309] border border-[#fde68a]">
                                <Clock className="w-3 h-3 animate-spin" />
                                In Review
                              </span>
                            )}

                            {isLocked && (
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-[#e8e4db] text-stone-500">
                                <Lock className="w-3 h-3 text-stone-500" />
                                Locked
                              </span>
                            )}

                            {/* Component Thumbnail on far right */}
                            <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-xl border border-stone-200/90 overflow-hidden shrink-0 bg-[#f7f5ef] p-0.5 ml-1 shadow-xs flex items-center justify-center">
                              <img
                                src={thumbnailSrc}
                                alt={cp.title}
                                className="w-full h-full object-cover rounded-lg"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = '/thumbnails/cp1_motor.png';
                                }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Description Text */}
                        <p className="text-xs text-stone-500 mt-2 leading-relaxed">
                          {cp.description}
                        </p>

                        {/* Expanded Drawer Action for Available Milestone */}
                        {isSelected && isAvailable && (
                          <div className="mt-3 pt-2.5 border-t border-[#fed7aa]/50 flex items-center justify-between">
                            <span className="text-[11px] font-mono text-[#ea580c]">
                              Ready for Physical Inspection?
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleApplyReview(cp.id);
                              }}
                              disabled={submittingReview}
                              className="px-3.5 py-1.5 rounded-lg bg-[#ea580c] hover:bg-[#c2410c] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                            >
                              <Send className="w-3 h-3" />
                              Apply for Hardware Review
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Quiz Active Questions Slate */
            activeQuiz && (
              <div className="p-6 rounded-3xl bg-[#fdfcf9] border border-[#e8dfcf] shadow-md space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-[#eee7db]">
                  <h2 className="text-base font-bold text-stone-900">{activeQuiz.title}</h2>
                  <span className="text-xs font-mono font-bold text-[#ea580c]">
                    {Math.floor(quizSecondsLeft / 60)}:
                    {String(quizSecondsLeft % 60).padStart(2, '0')}
                  </span>
                </div>

                {/* Question */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-stone-900">
                    {activeQuiz.questions[currentQuestionIdx]?.question}
                  </h4>
                  <div className="space-y-2">
                    {activeQuiz.questions[currentQuestionIdx]?.options.map((opt, optIdx) => {
                      const qId = activeQuiz.questions[currentQuestionIdx].id;
                      const isChosen = quizAnswers[qId] === optIdx;
                      return (
                        <button
                          key={optIdx}
                          type="button"
                          onClick={() => handleSelectOption(qId, optIdx)}
                          className={`w-full text-left p-3.5 rounded-xl border text-xs sm:text-sm font-medium transition-all flex items-center justify-between ${
                            isChosen
                              ? 'border-[#ea580c] bg-[#ea580c]/10 text-[#ea580c] font-bold shadow-xs'
                              : 'border-stone-200 bg-white hover:bg-stone-50 text-stone-800'
                          }`}
                        >
                          <span>{opt}</span>
                          <span
                            className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] ${
                              isChosen ? 'border-[#ea580c] bg-[#ea580c] text-white' : 'border-stone-300'
                            }`}
                          >
                            {isChosen ? '✓' : ''}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Question navigation footer */}
                <div className="flex items-center justify-between pt-4 border-t border-stone-200">
                  <button
                    type="button"
                    disabled={currentQuestionIdx === 0}
                    onClick={() => setCurrentQuestionIdx((p) => Math.max(0, p - 1))}
                    className="px-4 py-2 rounded-xl border border-stone-300 text-xs font-mono text-stone-700 disabled:opacity-30"
                  >
                    Previous
                  </button>

                  {currentQuestionIdx < activeQuiz.questions.length - 1 ? (
                    <button
                      type="button"
                      onClick={() => setCurrentQuestionIdx((p) => p + 1)}
                      className="px-5 py-2 rounded-xl bg-[#1c120c] text-white text-xs font-mono font-bold hover:bg-[#2d1f15] transition-all"
                    >
                      Next Question
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={quizSubmitting}
                      onClick={handleQuizFinalSubmit}
                      className="px-6 py-2 rounded-xl bg-[#ea580c] text-white text-xs font-bold hover:bg-[#c2410c] shadow-md transition-all"
                    >
                      {quizSubmitting ? 'Grading...' : 'Submit Answers'}
                    </button>
                  )}
                </div>
              </div>
            )
          )}
        </div>
      </div>

      {/* 3. Bottom Hardware Bench Telemetry Bar */}
      <div className="max-w-7xl mx-auto w-full mt-6 pt-3 border-t border-stone-300/80 flex flex-wrap items-center justify-between gap-4 text-[11px] font-mono text-stone-600">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-bold text-stone-900">ROBOTHON 3.0 // AUTONOMOUS BOAT BENCH</span>
          <span>•</span>
          <span>Table 01 Active</span>
        </div>

        <div className="flex items-center gap-4">
          <span>
            Subsystem: <strong className="text-[#ea580c] uppercase">{activeSubsystem}</strong>
          </span>
          <span>•</span>
          <span>
            Overall Rank: <strong className="text-stone-900">#{team?.rank || 1}</strong>
          </span>
          <span>•</span>
          <span className="text-emerald-700 font-bold">Top 50 Qualified</span>
        </div>
      </div>
    </div>
  );
};
