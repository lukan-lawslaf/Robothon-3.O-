import React, { useState, useEffect } from 'react';
import { MockTeam, MockCheckpoint } from '../../mockData';
import { getStoredTeams, getStoredCheckpoints } from '../../services/stateStore';
import { applyForCheckpointReview } from '../../services/backendService';
import { useAccount } from '../../services/authService';
import { Bot3DViewer, SubsystemKey } from '../../components/bot/Bot3DViewer';
import { TeamScoredItemsList } from '../../components/participant/TeamScoredItemsList';
import { TeamInventoryCard } from '../../components/participant/TeamInventoryCard';
import { LiveQuizPanel } from '../../components/participant/LiveQuizPanel';
import { ParticipantQuizStatus } from '../../components/participant/ParticipantQuizStatus';
import { Quiz } from '../../services/quizService';
import { useLocation } from 'react-router-dom';
import { Trophy, Settings, Check, Lock, Clock, Send, Users, UserCheck, AlertOctagon } from 'lucide-react';

interface Props {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  onSelectSubsystem?: (sub: SubsystemKey) => void;
  launchedQuiz?: Quiz | null;
  participantQuizzes?: Quiz[] | null;
}

export const ParticipantDashboard: React.FC<Props> = ({
  activeTab = 'checkpoints',
  onSelectSubsystem,
  launchedQuiz,
  participantQuizzes = null,
}) => {
  const account = useAccount();
  const requestedQuizId = new URLSearchParams(useLocation().search).get('quiz') || '';
  const [team, setTeam] = useState<MockTeam | null>(null);
  const [checkpoints, setCheckpoints] = useState<MockCheckpoint[]>([]);
  const [activeSubsystem, setActiveSubsystem] = useState<SubsystemKey>('motors');
  const [activeIndex, setActiveIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = () => {
      setTeam(getStoredTeams().find((t) => t.id === account?.teamId) || null);
      setCheckpoints(getStoredCheckpoints());
    };
    load();
    window.addEventListener('robothon_store_updated', load);
    return () => window.removeEventListener('robothon_store_updated', load);
  }, [account?.teamId]);

  const select = (sub: SubsystemKey, index?: number) => {
    setActiveSubsystem(sub);
    onSelectSubsystem?.(sub);
    const match = index ?? checkpoints.findIndex((c) => c.subsystem === sub);
    if (match >= 0) setActiveIndex(match);
  };

  const request = async (id: string) => {
    setBusy(true);
    setError('');
    try {
      await applyForCheckpointReview(account?.teamId || '', id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (activeTab === 'quizzes') {
    return (
      <LiveQuizPanel
        key={`${account?.userId}:${requestedQuizId}:${launchedQuiz?.startedAt || ''}`}
        initialQuiz={
          participantQuizzes?.find((q) => q.id === requestedQuizId) ||
          (launchedQuiz?.id === requestedQuizId ? launchedQuiz : null)
        }
        requestedQuizId={requestedQuizId}
      />
    );
  }

  const approved = checkpoints.filter((c) => c.status === 'approved').length;
  const isEliminated = team?.qualificationStatus === 'ELIMINATED' || Boolean(team?.isEliminated);
  const leaderName = team?.leader?.name || (account?.role === 'TEAM_LEADER' ? account?.name : '') || '';
  const otherMembers = (team?.members && team.members.length > 0)
    ? team.members
    : (team?.allMembers || []).filter(m => m.name !== leaderName && m.role !== 'LEADER');

  return (
    <div className="w-full flex-1 bg-[#f6f1e8] text-stone-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Eliminated Alert Banner */}
        {isEliminated && (
          <div className="rounded-2xl bg-gradient-to-r from-red-950 via-rose-950 to-red-900 border-2 border-red-500/80 p-5 text-white shadow-md flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in duration-300">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-red-800/60 border border-red-400/40 flex items-center justify-center shrink-0">
                <AlertOctagon className="w-7 h-7 text-red-300" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black bg-red-600 text-white uppercase tracking-wider">
                    Eliminated
                  </span>
                  <h2 className="text-base sm:text-lg font-bold text-red-100">
                    Elimination Round Result
                  </h2>
                </div>
                <p className="text-xs text-red-200/90 mt-1 max-w-xl">
                  Your team has been eliminated in the elimination round. Thank you for competing in Robothon 2026!
                </p>
              </div>
            </div>
            <div className="shrink-0 self-stretch sm:self-auto flex sm:flex-col justify-between sm:justify-center items-center sm:items-end border-t sm:border-t-0 sm:border-l border-red-700/50 pt-3 sm:pt-0 sm:pl-5">
              <span className="text-[10px] font-mono uppercase text-red-300">Competition Status</span>
              <span className="text-sm font-black font-mono text-red-200">ELIMINATED</span>
            </div>
          </div>
        )}

        {/* Participant Team Header */}
        <div className="rounded-2xl bg-[#fdfcf9] border border-[#ebe4d6] px-5 py-4 flex flex-wrap justify-between items-center gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xs text-orange-700 font-mono uppercase font-semibold">Participant team</p>
              {isEliminated ? (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-black uppercase bg-red-600 text-white tracking-wider">
                  Eliminated
                </span>
              ) : team?.qualificationStatus === 'QUALIFIED' ? (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-black uppercase bg-emerald-600 text-white tracking-wider">
                  Qualified
                </span>
              ) : null}
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-[#251306] flex items-center gap-2">
              {team?.teamName || account?.teamName}
            </h1>

            {/* Leader & Teammates List */}
            <div className="flex items-center gap-2 flex-wrap pt-0.5 text-xs">
              {leaderName && (
                <div className="flex items-center gap-1.5 bg-orange-50/90 border border-orange-200/80 rounded-lg px-2.5 py-1">
                  <UserCheck className="w-3.5 h-3.5 text-[#D4621A]" />
                  <span className="font-mono text-[11px] text-[#251306]">
                    <strong className="font-semibold text-orange-900">Leader:</strong> {leaderName}
                  </span>
                </div>
              )}

              {otherMembers.length > 0 && (
                <div className="flex items-center gap-1.5 bg-stone-100/90 border border-stone-200 rounded-lg px-2.5 py-1">
                  <Users className="w-3.5 h-3.5 text-stone-600" />
                  <span className="font-mono text-[11px] text-stone-800">
                    <strong className="font-semibold text-stone-900">Members:</strong> {otherMembers.map(m => m.name || m).join(', ')}
                  </span>
                </div>
              )}
            </div>

            <p className="text-xs text-stone-500 font-mono mt-0.5">
              {team?.currentCheckpoint || 'Loading checkpoints…'}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex gap-4 text-center text-xs">
              {[
                ['CP', team?.checkpointPoints],
                ['Quiz', team?.quizPoints],
                ['Mini', team?.miniGamePoints],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-stone-500 font-mono">{label}</p>
                  <strong className="text-base text-stone-800 font-mono">{value ?? 0}</strong>
                </div>
              ))}
            </div>
            <div className="rounded-xl bg-[#1a120c] text-orange-500 px-4 py-3 flex items-center gap-3 shadow-xs">
              <Trophy size={22} />
              <strong className="text-lg font-mono">{team?.totalPoints ?? 0} pts</strong>
            </div>
          </div>
        </div>

        {error && <p role="alert" className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-800">{error}</p>}
        <ParticipantQuizStatus quizzes={participantQuizzes} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-6">
            <Bot3DViewer
              activeSubsystem={activeSubsystem}
              onSelectSubsystem={(sub) => select(sub)}
              highlightedMilestone={checkpoints[activeIndex]?.stepNumber}
            />
          </div>
          <div className="lg:col-span-6 rounded-3xl bg-[#fdfcf9] border border-[#e8dfcf] p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3 border-b border-stone-200 pb-4">
              <div className="flex items-center gap-3">
                <Settings className="text-orange-600" />
                <div>
                  <h2 className="text-lg font-bold">Boat-Building Milestones</h2>
                  <p className="text-xs text-stone-500">Complete each checkpoint and request a physical inspection.</p>
                </div>
              </div>
              <span className="text-sm font-bold whitespace-nowrap">{approved} / {checkpoints.length} cleared</span>
            </div>

            <div className="h-1.5 bg-stone-200 rounded-full my-4 overflow-hidden">
              <div
                className="h-full bg-orange-600 transition-all"
                style={{ width: (approved / (checkpoints.length || 1)) * 100 + '%' }}
              />
            </div>

            <div className="space-y-3 max-h-[64vh] overflow-y-auto pr-1">
              {checkpoints.map((cp, i) => (
                <article
                  key={cp.id}
                  className={`rounded-2xl border p-4 ${
                    activeIndex === i ? 'border-orange-500 bg-orange-50/50' : 'border-stone-200 bg-white'
                  }`}
                >
                  <button className="w-full text-left flex items-center gap-3" onClick={() => select(cp.subsystem, i)}>
                    <span className="rounded-lg bg-[#251306] text-white text-xs font-mono p-2">{cp.code}</span>
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm">{cp.title}</h3>
                      <p className="text-xs text-stone-500 mt-1">+{cp.points} points</p>
                    </div>
                    {cp.status === 'approved' ? (
                      <Check className="text-emerald-600" size={20} />
                    ) : cp.status === 'locked' ? (
                      <Lock size={17} className="text-stone-400" />
                    ) : cp.status === 'pending_review' ? (
                      <Clock size={18} className="text-amber-600" />
                    ) : null}
                  </button>
                  {activeIndex === i && <p className="text-xs text-stone-600 mt-3">{cp.description}</p>}
                  <div className="mt-3">
                    {cp.status === 'available' ? (
                      <button
                        disabled={busy}
                        onClick={() => request(cp.id)}
                        className="bg-orange-700 text-white rounded-xl px-4 py-2 text-xs font-semibold flex items-center gap-2 disabled:opacity-50"
                      >
                        <Send size={14} />
                        {busy ? 'Sending…' : 'Apply for review'}
                      </button>
                    ) : (
                      <p className={`text-xs font-medium ${cp.status === 'approved' ? 'text-emerald-700' : 'text-stone-500'}`}>
                        {cp.status === 'approved'
                          ? 'Approved'
                          : cp.status === 'pending_review'
                          ? 'Waiting for checkpoint admin review'
                          : 'Complete the previous checkpoint to unlock'}
                      </p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
        <TeamInventoryCard teamId={account?.teamId} teamName={team?.teamName || account?.teamName} />
        <TeamScoredItemsList team={team} checkpoints={checkpoints} quizzes={participantQuizzes} />
      </div>
    </div>
  );
};
