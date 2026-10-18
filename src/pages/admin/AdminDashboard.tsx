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
      setBonusNotice(`+${bonusPoints} pts awarded to ${res.team.teamName}! Total: ${res.newTotal} pts`);
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
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 flex-1 flex flex-col justify-between">
      {/* Header Overview */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#F4AE52]">
            Tech Team Operations Center
          </span>
          <h1 className="text-2xl font-normal text-white tracking-tight mt-0.5">
            Admin Hardware & Review Portal
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded-full text-xs font-mono bg-[#D4621A]/20 border border-[#D4621A]/40 text-[#FEF3E2]">
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
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#F4AE52]">
              Physical Inspection Stage // Active: {activeSubsystem}
            </span>
          </div>
        </div>

        {/* Right Column (Col 6-12): Review Queue & Mini Games & Quiz Control */}
        <div className="lg:col-span-7 space-y-6">
          {/* Section A: Checkpoint Review Queue */}
          <div className="p-5 rounded-2xl bg-[rgba(42,26,14,0.85)] border border-[rgba(254,243,226,0.16)] shadow-xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="text-sm font-normal text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#F4AE52]" />
                <span>Section A: Checkpoint Review Queue</span>
              </h3>
              <span className="text-[10px] font-mono text-[#8C7360]">
                Physical Table Verification
              </span>
            </div>

            <div className="space-y-2.5 max-h-[30vh] overflow-y-auto pr-1">
              {tickets.map((tkt) => {
                const isPending = tkt.status === 'pending';
                const isInReview = tkt.status === 'in_review';
                const isResolved = tkt.status === 'approved' || tkt.status === 'rejected';

                return (
                  <div
                    key={tkt.ticketId}
                    className="p-3.5 rounded-xl border border-white/10 bg-[rgba(42,26,14,0.6)] flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[#F4AE52]">{tkt.ticketId}</span>
                        <span className="text-white font-medium">{tkt.teamName}</span>
                      </div>
                      <p className="text-[11px] text-[#FEF3E2]/70 mt-0.5">
                        {tkt.checkpointTitle} • Requested {tkt.requestedAt}
                      </p>
                      <p className="text-[10px] text-[#8C7360] font-mono">
                        Assigned: {tkt.assignedAdmin || 'Unassigned'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {!isResolved ? (
                        <>
                          {isPending && (
                            <button
                              onClick={() => handleAssignToMe(tkt.ticketId)}
                              className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[#FEF3E2] text-[11px]"
                            >
                              Assign
                            </button>
                          )}
                          <button
                            onClick={() => handleVerify(tkt.ticketId, true)}
                            className="px-3 py-1 rounded-lg bg-[#D4621A] hover:bg-[#F4AE52] text-[#FEF3E2] hover:text-[#2A1A0E] font-normal text-[11px] transition-colors"
                          >
                            Approve (+{tkt.points})
                          </button>
                          <button
                            onClick={() => handleVerify(tkt.ticketId, false)}
                            className="px-2.5 py-1 rounded-lg border border-red-500/40 text-red-300 hover:bg-red-500/20 text-[11px]"
                          >
                            Reject
                          </button>
                        </>
                      ) : (
                        <span className="font-mono text-[11px] text-[#F4AE52]">
                          {tkt.status === 'approved' ? `Approved (+${tkt.points})` : 'Rejected'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section B: Mini-Game Points Quick Entry */}
          <div className="p-5 rounded-2xl bg-[rgba(42,26,14,0.85)] border border-[rgba(254,243,226,0.16)] shadow-xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="text-sm font-normal text-white flex items-center gap-2">
                <Gamepad2 className="w-4 h-4 text-[#F4AE52]" />
                <span>Section B: Mini-Game Points Quick Entry</span>
              </h3>
            </div>

            {bonusNotice && (
              <div className="p-2.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs">
                {bonusNotice}
              </div>
            )}

            <form onSubmit={handleAwardBonus} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] uppercase font-mono text-[#8C7360] mb-1">
                  Recipient Team
                </label>
                <select
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl bg-[#1F1208] border border-white/15 text-xs text-white focus:outline-none focus:border-[#F4AE52]"
                >
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.teamName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-mono text-[#8C7360] mb-1">
                  Game Activity
                </label>
                <input
                  type="text"
                  value={gameName}
                  onChange={(e) => setGameName(e.target.value)}
                  placeholder="e.g. Ping Pong"
                  className="w-full px-2.5 py-2 rounded-xl bg-[#1F1208] border border-white/15 text-xs text-white focus:outline-none focus:border-[#F4AE52]"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-mono text-[#8C7360] mb-1">
                  Bonus Points
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={bonusPoints}
                    onChange={(e) => setBonusPoints(Number(e.target.value))}
                    className="w-20 px-2.5 py-2 rounded-xl bg-[#1F1208] border border-white/15 text-xs text-white focus:outline-none focus:border-[#F4AE52]"
                  />
                  <button
                    type="submit"
                    disabled={isAwarding}
                    className="flex-1 py-2 rounded-xl bg-[#D4621A] hover:bg-[#F4AE52] text-[#FEF3E2] hover:text-[#2A1A0E] text-xs font-normal transition-colors"
                  >
                    Award
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Section C: Quiz Controls */}
          <div className="p-5 rounded-2xl bg-[rgba(42,26,14,0.85)] border border-[rgba(254,243,226,0.16)] shadow-xl space-y-3">
            <h3 className="text-sm font-normal text-white flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-[#F4AE52]" />
              <span>Section C: Quiz Controls</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.values(quizzes).map((quiz) => (
                <div
                  key={quiz.id}
                  className="p-3 rounded-xl border border-white/10 bg-[#1F1208] flex items-center justify-between text-xs"
                >
                  <div>
                    <h4 className="text-white font-medium">{quiz.title}</h4>
                    <span className="text-[10px] font-mono text-[#F4AE52]">
                      {quiz.isActive ? 'Status: Active' : 'Status: Closed'}
                    </span>
                  </div>
                  <button
                    onClick={() => handleToggleQuiz(quiz.id, quiz.isActive)}
                    className={`px-3 py-1 rounded-lg text-xs font-mono transition-colors ${
                      quiz.isActive
                        ? 'border border-[#F4AE52]/40 text-[#F4AE52] hover:bg-[#F4AE52]/10'
                        : 'bg-[#D4621A] text-white hover:bg-[#F4AE52] hover:text-[#2A1A0E]'
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
