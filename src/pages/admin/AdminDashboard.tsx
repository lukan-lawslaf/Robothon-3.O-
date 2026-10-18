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
import {
  Clock,
  CheckCircle2,
  XCircle,
  UserCheck,
  Gamepad2,
  HelpCircle,
  Play,
  Pause,
  Award,
  Send,
  ShieldCheck,
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [tickets, setTickets] = useState<MockReviewTicket[]>([]);
  const [teams, setTeams] = useState<MockTeam[]>([]);
  const [quizzes, setQuizzes] = useState<Record<string, MockQuiz>>({});

  // Mini-Game form states
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [gameName, setGameName] = useState<string>('Ping Pong Showdown');
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
      setBonusNotice(`Awarded +${bonusPoints} pts to ${res.team.teamName}! New Total: ${res.newTotal} pts`);
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="pb-6 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            Tech Team Admin
          </span>
          <span className="text-xs text-slate-400">Hardware & Event Management</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
          Tech Team Admin Portal
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Verify physical boat milestones, award design team mini-game bonus points, and manage quiz access.
        </p>
      </div>

      {/* Section A: Checkpoint Review Queue */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-400" />
              Section A: Checkpoint Review Queue
            </h2>
            <p className="text-xs text-slate-400">
              Teams who clicked "Apply for Review" appear here. Inspect their hardware at their designated table.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            {pendingTickets.length} Pending Requests
          </span>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900 shadow-xl">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950 text-[11px] uppercase tracking-wider text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Ticket</th>
                <th className="py-3 px-4">Team Name</th>
                <th className="py-3 px-4">Milestone</th>
                <th className="py-3 px-4">Requested At</th>
                <th className="py-3 px-4">Assigned Admin</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-xs">
              {tickets.map((tkt) => {
                const isPending = tkt.status === 'pending';
                const isInReview = tkt.status === 'in_review';
                const isResolved = tkt.status === 'approved' || tkt.status === 'rejected';

                return (
                  <tr key={tkt.ticketId} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-cyan-400">
                      {tkt.ticketId}
                    </td>
                    <td className="py-3 px-4 font-semibold text-white">
                      {tkt.teamName}
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {tkt.checkpointTitle}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400">
                      {tkt.requestedAt}
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {tkt.assignedAdmin || <span className="text-slate-500 italic">Unassigned</span>}
                    </td>
                    <td className="py-3 px-4">
                      {tkt.status === 'approved' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3" /> Approved (+{tkt.points} pts)
                        </span>
                      )}
                      {tkt.status === 'rejected' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/10 text-red-400 border border-red-500/30">
                          <XCircle className="w-3 h-3" /> Rejected
                        </span>
                      )}
                      {tkt.status === 'in_review' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                          <Clock className="w-3 h-3 animate-pulse" /> In Review
                        </span>
                      )}
                      {tkt.status === 'pending' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">
                          Pending
                        </span>
                      )}
                    </td>

                    {/* Action buttons */}
                    <td className="py-3 px-4 text-right space-x-2">
                      {!isResolved && (
                        <>
                          {isPending && (
                            <button
                              onClick={() => handleAssignToMe(tkt.ticketId)}
                              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700"
                            >
                              Assign to Me
                            </button>
                          )}
                          <button
                            onClick={() => handleVerify(tkt.ticketId, true)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm"
                          >
                            Approve (+{tkt.points})
                          </button>
                          <button
                            onClick={() => handleVerify(tkt.ticketId, false)}
                            className="px-2.5 py-1 rounded-lg bg-red-600/80 hover:bg-red-600 text-white text-xs font-medium"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {isResolved && (
                        <span className="text-slate-500 font-mono text-[11px]">
                          Complete
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Grid: Section B & Section C */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Section B: Mini-Game Points Quick Entry */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Gamepad2 className="w-5 h-5 text-cyan-400" />
              Section B: Mini-Game Points Quick Entry
            </h2>
            <p className="text-xs text-slate-400">
              Award manual bonus points to teams for side games (Ping Pong, accuracy toss, buzzer wire).
            </p>
          </div>

          {bonusNotice && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-medium">
              {bonusNotice}
            </div>
          )}

          <form onSubmit={handleAwardBonus} className="space-y-4">
            <div>
              <label className="block text-xs font-medium uppercase text-slate-400 mb-1">
                Select Team
              </label>
              <select
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
              >
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.teamName} (Total: {t.totalPoints} pts)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium uppercase text-slate-400 mb-1">
                Mini-Game Name
              </label>
              <input
                type="text"
                value={gameName}
                onChange={(e) => setGameName(e.target.value)}
                placeholder="e.g., Ping Pong, Steady Hand Wire"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium uppercase text-slate-400 mb-1">
                Points to Award (Max ~25 pts)
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={bonusPoints}
                onChange={(e) => setBonusPoints(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={isAwarding}
              className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50"
            >
              <Award className="w-4 h-4" />
              {isAwarding ? 'Awarding...' : 'Add Bonus Points'}
            </button>
          </form>
        </div>

        {/* Section C: Quiz Controls */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-blue-400" />
              Section C: Quiz Controls
            </h2>
            <p className="text-xs text-slate-400">
              Lock or activate quizzes during the event. Closed quizzes prevent new submissions.
            </p>
          </div>

          <div className="space-y-4">
            {Object.values(quizzes).map((quiz) => (
              <div
                key={quiz.id}
                className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white">{quiz.title}</h3>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        quiz.isActive
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {quiz.isActive ? 'Active' : 'Closed'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {quiz.questions.length} Questions • {quiz.totalPoints} Total Points
                  </p>
                </div>

                <button
                  onClick={() => handleToggleQuiz(quiz.id, quiz.isActive)}
                  className={`py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    quiz.isActive
                      ? 'bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700'
                      : 'bg-blue-600 hover:bg-blue-500 text-white'
                  }`}
                >
                  {quiz.isActive ? (
                    <>
                      <Pause className="w-3.5 h-3.5" /> Close Quiz
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" /> Activate Quiz
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
