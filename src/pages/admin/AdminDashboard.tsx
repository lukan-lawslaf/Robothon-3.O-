import React, { useState, useEffect } from 'react';
import { MockReviewTicket, MockTeam, MockQuiz } from '../../mockData';
import {
  getStoredTickets,
  getStoredTeams,
  getStoredQuizzes,
} from '../../services/stateStore';
import {
  verifyCheckpoint,
  assignTicketToAdmin,
  addMiniGamePoints,
} from '../../services/backendService';
import { toggleQuizStatus } from '../../services/quizService';
import { Bot3DViewer, SubsystemKey } from '../../components/bot/Bot3DViewer';
import {
  Clock,
  CheckCircle2,
  XCircle,
  Gamepad2,
  HelpCircle,
  Play,
  Pause,
  Award,
  Shield,
  Layers,
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [tickets, setTickets] = useState<MockReviewTicket[]>([]);
  const [teams, setTeams] = useState<MockTeam[]>([]);
  const [quizzes, setQuizzes] = useState<Record<string, MockQuiz>>({});
  const [activeSubsystem, setActiveSubsystem] = useState<SubsystemKey>('l298n');

  // Mini-Game form states
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [gameName, setGameName] = useState<string>('Hydro Ping Pong');
  const [bonusPoints, setBonusPoints] = useState<number>(15);
  const [bonusNotice, setBonusNotice] = useState<string | null>(null);
  const [isAwarding, setIsAwarding] = useState<boolean>(false);

  const loadData = () => {
    const t = getStoredTickets();
    const tm = getStoredTeams();
    const qz = getStoredQuizzes();
    setTickets(t);
    setTeams(tm);
    setQuizzes(qz);
    if (!selectedTeamId && tm.length > 0) {
      setSelectedTeamId(tm[0].id);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('robothon_store_updated', loadData);
    return () => window.removeEventListener('robothon_store_updated', loadData);
  }, []);

  const handleAssignToMe = async (ticketId: string) => {
    await assignTicketToAdmin(ticketId, 'Tech Admin (You)');
    loadData();
  };

  const handleVerify = async (ticketId: string, approved: boolean) => {
    await verifyCheckpoint(ticketId, 'Tech Admin (You)', approved);
    loadData();
  };

  const handleAwardBonus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeamId || !gameName) return;
    try {
      setIsAwarding(true);
      const res = await addMiniGamePoints(selectedTeamId, gameName, Number(bonusPoints));
      setBonusNotice(`+${bonusPoints} pts awarded to ${res.team.teamName}! New Total: ${res.newTotal} pts`);
      setTimeout(() => setBonusNotice(null), 4000);
      loadData();
    } finally {
      setIsAwarding(false);
    }
  };

  const handleToggleQuiz = async (quizId: string, currentActive: boolean) => {
    await toggleQuizStatus(quizId, !currentActive);
    loadData();
  };

  const pendingTickets = tickets.filter(
    (t) => t.status === 'pending' || t.status === 'in_review'
  );

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 flex-1 flex flex-col justify-between text-[#251306]">
      {/* Header Overview */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#F4AE52]/30">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#D4621A] font-bold">
            Tech Team Operations Center
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#251306] tracking-tight mt-0.5">
            Admin Hardware & Review Portal
          </h1>
          <p className="text-xs font-mono text-[#251306]/70 mt-1">
            Physical table inspections, checkpoint verifications, and mini-game bonuses.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="px-3.5 py-1.5 rounded-full text-xs font-mono font-bold bg-[#D4621A] text-[#FEF3E2] shadow-sm">
            {pendingTickets.length} Pending Review Tickets
          </span>
        </div>
      </div>

      {/* Main Two-Column Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start my-6">
        {/* Left Stage (Col 1-5): Circular 3D Bot with Pulsing Inspection Target */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <Bot3DViewer
            activeSubsystem={activeSubsystem}
            onSelectSubsystem={(k) => setActiveSubsystem(k)}
          />
          <div className="mt-3 text-center">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#D4621A] font-bold">
              Physical Inspection Target // Active: {activeSubsystem}
            </span>
          </div>
        </div>

        {/* Right Column (Col 6-12): Review Queue & Mini Games & Quiz Control */}
        <div className="lg:col-span-7 space-y-6">
          {/* Section A: Checkpoint Review Queue */}
          <div className="p-5 rounded-2xl bg-white/80 backdrop-blur-md border border-[#F4AE52]/40 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#F4AE52]/20">
              <h3 className="text-sm font-bold text-[#251306] flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#D4621A]" />
                <span>Section A: Checkpoint Review Queue</span>
              </h3>
              <span className="text-[10px] font-mono text-[#251306]/60">
                Physical Table Verification
              </span>
            </div>

            <div className="space-y-2.5 max-h-[30vh] overflow-y-auto pr-1">
              {tickets.length === 0 ? (
                <p className="text-xs text-[#251306]/60 italic py-2 text-center">No active review requests.</p>
              ) : (
                tickets.map((tkt) => {
                  const isPending = tkt.status === 'pending';
                  const isInReview = tkt.status === 'in_review';
                  const isResolved = tkt.status === 'approved' || tkt.status === 'rejected';

                  return (
                    <div
                      key={tkt.ticketId}
                      className="p-3.5 rounded-xl border border-[#F4AE52]/30 bg-[#FEF3E2]/60 flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-[#D4621A]">{tkt.ticketId}</span>
                          <span className="text-[#251306] font-bold">{tkt.teamName}</span>
                        </div>
                        <p className="text-[11px] text-[#251306]/80 mt-0.5 font-medium">
                          {tkt.checkpointTitle} • Requested {tkt.requestedAt}
                        </p>
                        <p className="text-[10px] text-[#251306]/60 font-mono">
                          Assigned: {tkt.assignedAdmin || 'Unassigned'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {!isResolved ? (
                          <>
                            {isPending && (
                              <button
                                type="button"
                                onClick={() => handleAssignToMe(tkt.ticketId)}
                                className="px-2.5 py-1 rounded-lg bg-white border border-[#F4AE52]/50 hover:bg-[#FEF3E2] text-[#251306] text-[11px] font-mono"
                              >
                                Assign
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleVerify(tkt.ticketId, true)}
                              className="px-3 py-1 rounded-lg bg-[#D4621A] hover:bg-[#b84e0e] text-[#FEF3E2] font-semibold text-[11px] shadow-sm transition-colors"
                            >
                              Approve (+{tkt.points})
                            </button>
                            <button
                              type="button"
                              onClick={() => handleVerify(tkt.ticketId, false)}
                              className="px-2.5 py-1 rounded-lg border border-red-500/40 text-red-600 hover:bg-red-50 text-[11px] font-medium"
                            >
                              Reject
                            </button>
                          </>
                        ) : (
                          <span className={`font-mono text-[11px] font-bold ${tkt.status === 'approved' ? 'text-emerald-700' : 'text-red-600'}`}>
                            {tkt.status === 'approved' ? `Approved (+${tkt.points})` : 'Rejected'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Section B: Mini-Game Points Quick Entry */}
          <div className="p-5 rounded-2xl bg-white/80 backdrop-blur-md border border-[#F4AE52]/40 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#F4AE52]/20">
              <h3 className="text-sm font-bold text-[#251306] flex items-center gap-2">
                <Gamepad2 className="w-4 h-4 text-[#D4621A]" />
                <span>Section B: Mini-Game Points Quick Entry</span>
              </h3>
            </div>

            {bonusNotice && (
              <div className="p-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-900 text-xs font-mono font-medium">
                {bonusNotice}
              </div>
            )}

            <form onSubmit={handleAwardBonus} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] uppercase font-mono text-[#251306]/70 font-semibold mb-1">
                  Recipient Team
                </label>
                <select
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl bg-white border border-[#F4AE52]/60 text-xs text-[#251306] focus:outline-none focus:border-[#D4621A]"
                >
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.teamName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-mono text-[#251306]/70 font-semibold mb-1">
                  Game Activity
                </label>
                <input
                  type="text"
                  value={gameName}
                  onChange={(e) => setGameName(e.target.value)}
                  placeholder="e.g. Ping Pong"
                  className="w-full px-2.5 py-2 rounded-xl bg-white border border-[#F4AE52]/60 text-xs text-[#251306] focus:outline-none focus:border-[#D4621A]"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-mono text-[#251306]/70 font-semibold mb-1">
                  Bonus Points
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={bonusPoints}
                    onChange={(e) => setBonusPoints(Number(e.target.value))}
                    className="w-20 px-2.5 py-2 rounded-xl bg-white border border-[#F4AE52]/60 text-xs text-[#251306] focus:outline-none focus:border-[#D4621A]"
                  />
                  <button
                    type="submit"
                    disabled={isAwarding}
                    className="flex-1 py-2 rounded-xl bg-[#D4621A] hover:bg-[#b84e0e] text-[#FEF3E2] text-xs font-semibold shadow-sm transition-colors"
                  >
                    Award
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Section C: Quiz Controls */}
          <div className="p-5 rounded-2xl bg-white/80 backdrop-blur-md border border-[#F4AE52]/40 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-[#251306] flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-[#D4621A]" />
              <span>Section C: Quiz Master Controls</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.values(quizzes).map((quiz) => (
                <div
                  key={quiz.id}
                  className="p-3.5 rounded-xl border border-[#F4AE52]/30 bg-[#FEF3E2]/60 flex items-center justify-between text-xs"
                >
                  <div>
                    <h4 className="text-[#251306] font-bold">{quiz.title}</h4>
                    <span className="text-[10px] font-mono text-[#251306]/70 font-medium">
                      {quiz.isActive ? '● Status: Open & Timed' : '○ Status: Locked'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleQuiz(quiz.id, quiz.isActive)}
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-colors ${
                      quiz.isActive
                        ? 'border border-[#D4621A] text-[#D4621A] hover:bg-[#D4621A]/10'
                        : 'bg-[#251306] text-[#FEF3E2] hover:bg-[#3D2414]'
                    }`}
                  >
                    {quiz.isActive ? 'Lock' : 'Activate'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
