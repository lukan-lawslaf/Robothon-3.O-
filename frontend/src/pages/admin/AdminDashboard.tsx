import React, { useState, useEffect } from 'react';
import { MockReviewTicket, MockTeam, getTeamLeaderName } from '../../mockData';
import {
  getStoredTickets,
  getStoredTeams,
  getStoredBonuses,
  refreshPlatform,
} from '../../services/stateStore';
import {
  verifyCheckpoint,
  assignTicketToAdmin,
  addMiniGamePoints,
  deductPoints,
  removeMark,
} from '../../services/backendService';
import { Link } from 'react-router-dom';
import { useAccount } from '../../services/authService';
import { Clock, Gamepad2, MinusCircle, Trash2, History, Boxes, Trophy, Zap, ArrowRight } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [tickets, setTickets] = useState<MockReviewTicket[]>([]);
  const [teams, setTeams] = useState<MockTeam[]>([]);
  const account = useAccount();
  const [error, setError] = useState('');
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewFilter, setReviewFilter] = useState('open');
  const [reviewSearch, setReviewSearch] = useState('');

  // Mini-Game form states (Award)
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [gameName, setGameName] = useState<string>('Hydro Ping Pong');
  const [bonusPoints, setBonusPoints] = useState<number>(15);
  const [bonusNotice, setBonusNotice] = useState<string | null>(null);
  const [isAwarding, setIsAwarding] = useState<boolean>(false);

  // Deduct / Lower points form states
  const [deductTeamId, setDeductTeamId] = useState<string>('');
  const [deductPointsValue, setDeductPointsValue] = useState<number>(5);
  const [deductReason, setDeductReason] = useState<string>('');
  const [deductNotice, setDeductNotice] = useState<string | null>(null);
  const [isDeducting, setIsDeducting] = useState<boolean>(false);

  // Team Activity Log & Mark Removal states
  const [logTeamId, setLogTeamId] = useState<string>('');
  const [removeNotice, setRemoveNotice] = useState<string | null>(null);
  const [isRemovingMark, setIsRemovingMark] = useState<boolean>(false);

  const loadData = () => {
    const t = getStoredTickets();
    const tm = getStoredTeams();
    setTickets(t);
    setTeams(tm);
    if (!selectedTeamId && tm.length > 0) {
      setSelectedTeamId(current => current || tm[0].id);
    }
    if (!deductTeamId && tm.length > 0) {
      setDeductTeamId(current => current || tm[0].id);
    }
    if (!logTeamId && tm.length > 0) {
      setLogTeamId(current => current || tm[0].id);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('robothon_store_updated', loadData);
    return () => window.removeEventListener('robothon_store_updated', loadData);
  }, []);

  const review = async (action: () => Promise<unknown>) => {
    setReviewBusy(true); setError('');
    try { await action(); loadData(); }
    catch (e) { setError((e as Error).message); }
    finally { setReviewBusy(false); }
  };
  const handleAssignToMe = (ticketId: string) => review(() => assignTicketToAdmin(ticketId, account?.name || ''));
  const handleVerify = (ticketId: string, approved: boolean) => review(() => verifyCheckpoint(ticketId, account?.userId || '', approved));

  const handleAwardBonus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeamId || !gameName) return;
    const targetTeam = teams.find(t => t.id === selectedTeamId);
    if (targetTeam && (targetTeam.isDisqualified || targetTeam.debarred || targetTeam.qualificationStatus === 'DEBARRED' || (targetTeam as any).status === 'DISQUALIFIED')) {
      setError('Cannot allocate bonus points to a disqualified team.');
      return;
    }
    try {
      setIsAwarding(true); setError('');
      const res = await addMiniGamePoints(selectedTeamId, gameName, Number(bonusPoints));
      setBonusNotice(`+${bonusPoints} pts awarded to ${res.team.teamName}! New Total: ${res.newTotal} pts`);
      setTimeout(() => setBonusNotice(null), 4000);
      await refreshPlatform();
      loadData();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsAwarding(false);
    }
  };

  const handleDeductPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deductTeamId || !deductPointsValue || deductPointsValue <= 0) return;
    try {
      setIsDeducting(true); setError('');
      const res = await deductPoints(deductTeamId, Number(deductPointsValue), deductReason);
      setDeductNotice(`-${deductPointsValue} pts deducted from ${res.team.teamName}! New Total: ${res.newTotal} pts`);
      setTimeout(() => setDeductNotice(null), 4000);
      setDeductReason('');
      await refreshPlatform();
      loadData();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsDeducting(false);
    }
  };

  const handleRemoveMark = async (markId: string, type: 'BONUS' | 'CHECKPOINT', description: string) => {
    if (!logTeamId) return;
    const confirmRemoval = window.confirm(`Remove "${description}" for this team? This will adjust their total score.`);
    if (!confirmRemoval) return;
    try {
      setIsRemovingMark(true); setError('');
      const res = await removeMark(logTeamId, markId, type);
      setRemoveNotice(`Removed mark! ${res.team.teamName} now has ${res.newTotal} pts.`);
      setTimeout(() => setRemoveNotice(null), 4000);
      await refreshPlatform();
      loadData();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsRemovingMark(false);
    }
  };

  const pendingTickets = tickets.filter(
    (t) => t.status === 'pending' || t.status === 'in_review'
  );
  const myTickets = pendingTickets.filter(t => t.assignedAdminId === account?.userId);
  const visibleTickets = tickets.filter(t => {
    const open = t.status === 'pending' || t.status === 'in_review';
    const matchesFilter = reviewFilter === 'all' || (reviewFilter === 'open' && open) || (reviewFilter === 'mine' && open && t.assignedAdminId === account?.userId) || (reviewFilter === 'resolved' && !open);
    return matchesFilter && (t.teamName + ' ' + t.checkpointTitle).toLowerCase().includes(reviewSearch.trim().toLowerCase());
  });

  // Derive activity log marks for selected team
  const allBonuses = getStoredBonuses();
  const selectedTeamBonuses = allBonuses.filter(b => b.teamId === logTeamId);
  const selectedTeamApprovedCheckpoints = tickets.filter(t => t.teamId === logTeamId && t.status === 'approved');

  interface ActivityMark {
    id: string;
    type: 'BONUS' | 'CHECKPOINT';
    title: string;
    points: number;
    time?: string;
    badge: string;
    badgeStyle: string;
  }

  const teamMarks: ActivityMark[] = [
    ...selectedTeamBonuses.map(b => ({
      id: b.id,
      type: 'BONUS' as const,
      title: b.gameName,
      points: b.points,
      time: b.awardedAt ? new Date(b.awardedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
      badge: b.points < 0 ? 'Deduction' : 'Bonus',
      badgeStyle: b.points < 0 ? 'bg-red-100 text-red-800 border-red-200' : 'bg-amber-100 text-amber-800 border-amber-200',
    })),
    ...selectedTeamApprovedCheckpoints.map(t => ({
      id: t.checkpointId,
      type: 'CHECKPOINT' as const,
      title: t.checkpointTitle,
      points: t.points,
      time: t.requestedAt ? new Date(t.requestedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
      badge: 'Checkpoint',
      badgeStyle: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    })),
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 flex-1 flex flex-col text-[#251306]">
      {/* Header Overview */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#F4AE52]/30">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#251306] tracking-tight">
            {account?.role === 'SUPER_ADMIN' ? 'Super Admin Portal' : 'Checkpoint Admin Portal'}
          </h1>
          <p className="text-xs font-mono text-stone-600 mt-1">
            Review checkpoint submissions and award team points.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="px-3.5 py-1.5 rounded-full text-xs font-mono font-bold bg-[#D4621A] text-[#FEF3E2] shadow-sm">
            {pendingTickets.length} Pending Reviews
          </span>
        </div>
      </div>

      {error && <p role="alert" className="bg-red-50 text-red-800 p-3 rounded-xl mt-4">{error}</p>}
      
      {/* Event Operations Hub: Inventory & Separate Quiz Leaderboards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <div className="p-5 rounded-2xl bg-white border border-orange-200 shadow-sm flex flex-col justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-[#ea580c] mb-1">
              <Boxes size={18} />
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider">Physical Hardware</span>
            </div>
            <h3 className="font-bold text-[#1c140e] text-base">Parts Inventory</h3>
            <p className="text-xs text-stone-600 font-mono mt-1">
              Import Excel catalogs, allocate motors/sensors to teams, and manage physical stock.
            </p>
          </div>
          <Link
            to="/admin/inventory"
            className="self-start px-4 py-2 rounded-xl bg-[#1c140e] hover:bg-black text-white font-mono text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
          >
            <span>Manage Inventory</span>
            <ArrowRight size={13} />
          </Link>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-emerald-200 shadow-sm flex flex-col justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-emerald-600 mb-1">
              <Trophy size={18} />
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider">Round 1</span>
            </div>
            <h3 className="font-bold text-[#1c140e] text-base">Quiz 1 Leaderboard</h3>
            <p className="text-xs text-stone-600 font-mono mt-1">
              Elimination round standings with Top-40 cutoff and qualified/eliminated indicators.
            </p>
          </div>
          <Link
            to="/admin/quizzes/leaderboard/quiz-1"
            className="self-start px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-mono text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
          >
            <span>Quiz 1 Board</span>
            <ArrowRight size={13} />
          </Link>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-amber-200 shadow-sm flex flex-col justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-amber-600 mb-1">
              <Zap size={18} />
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider">Round 2 Bonus</span>
            </div>
            <h3 className="font-bold text-[#1c140e] text-base">Quiz 2 Leaderboard</h3>
            <p className="text-xs text-stone-600 font-mono mt-1">
              Bonus round live scores and speed rankings.
            </p>
          </div>
          <Link
            to="/admin/quizzes/leaderboard/quiz-2"
            className="self-start px-4 py-2 rounded-xl bg-[#D4621A] hover:bg-[#b85214] text-white font-mono text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
          >
            <span>Quiz 2 Board</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
        {[['Registered teams', teams.length], ['Open reviews', pendingTickets.length], ['Assigned to me', myTickets.length], ['Approved reviews', tickets.filter(t => t.status === 'approved').length]].map(([label, value]) => <div key={label} className="rounded-2xl bg-white border border-orange-200 p-4"><p className="text-xs text-stone-600">{label}</p><p className="text-2xl font-bold text-[#D4621A] mt-1">{value}</p></div>)}
      </div>
      
      {account?.role === 'SUPER_ADMIN' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <div className="p-5 rounded-2xl bg-[#1c140e] text-white border border-orange-900/50 flex items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-white text-base">Team Registrations</h3>
              <p className="text-xs text-stone-400 font-mono mt-0.5">Upload CSV rosters & manage leader logins.</p>
            </div>
            <Link
              to="/admin/registrations"
              className="px-4 py-2 rounded-xl bg-[#D4621A] hover:bg-[#b85214] text-white font-mono text-xs font-bold shrink-0"
            >
              Manage &rarr;
            </Link>
          </div>
          <div className="p-5 rounded-2xl bg-[#1c140e] text-white border border-orange-900/50 flex items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-white text-base">Quiz Manager</h3>
              <p className="text-xs text-stone-400 font-mono mt-0.5">Configure live rounds and presentation views.</p>
            </div>
            <Link
              to="/admin/quizzes"
              className="px-4 py-2 rounded-xl bg-[#D4621A] hover:bg-[#b85214] text-white font-mono text-xs font-bold shrink-0"
            >
              Open &rarr;
            </Link>
          </div>
        </div>
      )}

      {/* Main Dual-Column Admin Interface */}
      <div className="mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* Section A: Live Review Tickets Queue (Span 2 cols) */}
          <section className="lg:col-span-2 p-5 rounded-2xl bg-white/80 backdrop-blur-md border border-[#F4AE52]/40 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#F4AE52]/20">
              <h2 className="text-base font-bold text-[#251306] flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#D4621A]" />
                <span>Verification Queue</span>
              </h2>
              <span className="text-xs font-mono font-medium text-[#251306]/70">
                {visibleTickets.length} reviews
              </span>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <label className="text-xs text-stone-600">Search reviews<input value={reviewSearch} onChange={e => setReviewSearch(e.target.value)} className="block w-full rounded-xl border border-orange-200 px-3 py-2 mt-1" /></label>
              <label className="text-xs text-stone-600">Review status<select value={reviewFilter} onChange={e => setReviewFilter(e.target.value)} className="block w-full rounded-xl border border-orange-200 bg-white px-3 py-2 mt-1"><option value="open">Open reviews</option><option value="mine">Assigned to me</option><option value="resolved">Reviewed</option><option value="all">All reviews</option></select></label>
            </div>
            <div className="space-y-2.5 max-h-[55vh] overflow-y-auto pr-1">
              {visibleTickets.length === 0 ? (
                <p className="text-sm text-[#251306]/60 py-5 text-center">No reviews match this view.</p>
              ) : (
                visibleTickets.map((tkt) => {
                  const isPending = tkt.status === 'pending';
                  const isResolved = tkt.status === 'approved' || tkt.status === 'rejected';
                  const assignedElsewhere = Boolean(tkt.assignedAdminId && tkt.assignedAdminId !== account?.userId);

                  return (
                    <div
                      key={tkt.ticketId}
                      className="p-3.5 rounded-xl border border-[#F4AE52]/30 bg-[#FEF3E2]/60 flex flex-wrap items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span title={tkt.ticketId} className="font-mono font-bold text-[#D4621A]">{tkt.ticketId.slice(0, 12)}</span>
                          <span className="text-[#251306] font-bold">{tkt.teamName}</span>
                        </div>
                        <p className="text-[11px] text-[#251306]/80 mt-0.5 font-medium">
                          {tkt.checkpointTitle} • Requested {new Date(tkt.requestedAt).toLocaleTimeString()}
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
                                disabled={reviewBusy || assignedElsewhere}
                                onClick={() => handleAssignToMe(tkt.ticketId)}
                                className="px-2.5 py-1 rounded-lg bg-white border border-[#F4AE52]/50 hover:bg-[#FEF3E2] text-[#251306] text-[11px] font-mono"
                              >
                                Assign
                              </button>
                            )}
                            <button
                              type="button"
                              disabled={reviewBusy || assignedElsewhere}
                              onClick={() => handleVerify(tkt.ticketId, true)}
                              className="px-3 py-1 rounded-lg bg-[#D4621A] hover:bg-[#b84e0e] text-[#FEF3E2] font-semibold text-[11px] shadow-sm transition-colors"
                            >
                              Approve (+{tkt.points})
                            </button>
                            <button
                              type="button"
                              disabled={reviewBusy || assignedElsewhere}
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
          </section>

          {/* Right Column: Mini-Game, Adjustments & Mark Removal */}
          <div className="space-y-6">

            {/* Section B: Mini-Game Points Quick Entry (Award bonus points) */}
            <div className="p-5 rounded-2xl bg-white/80 backdrop-blur-md border border-[#F4AE52]/40 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#F4AE52]/20">
                <h3 className="text-sm font-bold text-[#251306] flex items-center gap-2">
                  <Gamepad2 className="w-4 h-4 text-[#D4621A]" />
                  <span>Award bonus points</span>
                </h3>
              </div>

              {bonusNotice && (
                <div className="p-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-900 text-xs font-mono font-medium">
                  {bonusNotice}
                </div>
              )}

              <form onSubmit={handleAwardBonus} className="grid grid-cols-1 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="bonus-team" className="block text-[10px] uppercase font-mono text-[#251306]/70 font-semibold">
                      Recipient Team
                    </label>
                    {(() => {
                      const sel = teams.find(t => t.id === selectedTeamId);
                      const lName = getTeamLeaderName(sel);
                      return lName ? (
                        <span className="text-[10px] font-mono font-bold text-[#D4621A] bg-amber-100/80 px-2 py-0.5 rounded-md border border-amber-300/60 flex items-center gap-1 shadow-2xs">
                          👑 Leader: <span className="underline">{lName}</span>
                        </span>
                      ) : null;
                    })()}
                  </div>
                  <select
                    id="bonus-team"
                    value={selectedTeamId}
                    onChange={(e) => setSelectedTeamId(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl bg-white border border-[#F4AE52]/60 text-xs text-[#251306] focus:outline-none focus:border-[#D4621A]"
                  >
                    {teams.map((t) => {
                      const isDisq = Boolean(t.isDisqualified || t.debarred || t.qualificationStatus === 'DEBARRED' || (t as any).status === 'DISQUALIFIED');
                      const lName = getTeamLeaderName(t);
                      return (
                        <option key={t.id} value={t.id} disabled={isDisq}>
                          {t.teamName} {lName ? `[👑 Leader: ${lName}]` : ''} ({t.totalPoints} pts){isDisq ? ' ❌ [DISQUALIFIED]' : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label htmlFor="bonus-game" className="block text-[10px] uppercase font-mono text-[#251306]/70 font-semibold mb-1">
                    Game Activity
                  </label>
                  <input
                    id="bonus-game"
                    type="text"
                    value={gameName}
                    onChange={(e) => setGameName(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl bg-white border border-[#F4AE52]/60 text-xs text-[#251306] focus:outline-none focus:border-[#D4621A]"
                  />
                </div>

                <div>
                  <label htmlFor="bonus-points" className="block text-[10px] uppercase font-mono text-[#251306]/70 font-semibold mb-1">
                    Bonus Points
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="bonus-points"
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
                      className="flex-1 py-2 rounded-xl bg-[#D4621A] hover:bg-[#b84e0e] text-[#FEF3E2] text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
                    >
                      {isAwarding ? 'Awarding...' : 'Award'}
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* Section C: Deduct / Lower Points with Optional Reason */}
            <div className="p-5 rounded-2xl bg-white/80 backdrop-blur-md border border-red-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-red-100">
                <h3 className="text-sm font-bold text-[#251306] flex items-center gap-2">
                  <MinusCircle className="w-4 h-4 text-red-600" />
                  <span>Lower / Deduct points</span>
                </h3>
              </div>

              {deductNotice && (
                <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs font-mono font-medium">
                  {deductNotice}
                </div>
              )}

              <form onSubmit={handleDeductPoints} className="grid grid-cols-1 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="deduct-team" className="block text-[10px] uppercase font-mono text-[#251306]/70 font-semibold">
                      Target Team
                    </label>
                    {(() => {
                      const sel = teams.find(t => t.id === deductTeamId);
                      const lName = getTeamLeaderName(sel);
                      return lName ? (
                        <span className="text-[10px] font-mono font-bold text-red-700 bg-red-100/80 px-2 py-0.5 rounded-md border border-red-200 flex items-center gap-1 shadow-2xs">
                          👑 Leader: <span className="underline">{lName}</span>
                        </span>
                      ) : null;
                    })()}
                  </div>
                  <select
                    id="deduct-team"
                    value={deductTeamId}
                    onChange={(e) => setDeductTeamId(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl bg-white border border-stone-200 text-xs text-[#251306] focus:outline-none focus:border-red-500"
                  >
                    {teams.map((t) => {
                      const lName = getTeamLeaderName(t);
                      return (
                        <option key={t.id} value={t.id}>
                          {t.teamName} {lName ? `[👑 Leader: ${lName}]` : ''} ({t.totalPoints} pts)
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label htmlFor="deduct-reason" className="block text-[10px] uppercase font-mono text-[#251306]/70 font-semibold mb-1">
                    Reason (Optional)
                  </label>
                  <input
                    id="deduct-reason"
                    type="text"
                    placeholder="e.g. Penalty, rule violation, correction..."
                    value={deductReason}
                    onChange={(e) => setDeductReason(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl bg-white border border-stone-200 text-xs text-[#251306] focus:outline-none focus:border-red-500 placeholder:text-stone-400"
                  />
                </div>

                <div>
                  <label htmlFor="deduct-points" className="block text-[10px] uppercase font-mono text-[#251306]/70 font-semibold mb-1">
                    Points to Deduct
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="deduct-points"
                      type="number"
                      min={1}
                      max={100}
                      value={deductPointsValue}
                      onChange={(e) => setDeductPointsValue(Number(e.target.value))}
                      className="w-20 px-2.5 py-2 rounded-xl bg-white border border-stone-200 text-xs text-[#251306] focus:outline-none focus:border-red-500"
                    />
                    <button
                      type="submit"
                      disabled={isDeducting}
                      className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
                    >
                      {isDeducting ? 'Deducting...' : 'Deduct Points'}
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* Section D: Team Activity Log & Mark Removal */}
            <div className="p-5 rounded-2xl bg-white/80 backdrop-blur-md border border-[#F4AE52]/40 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#F4AE52]/20">
                <h3 className="text-sm font-bold text-[#251306] flex items-center gap-2">
                  <History className="w-4 h-4 text-[#D4621A]" />
                  <span>Remove mistaken marks</span>
                </h3>
              </div>

              <p className="text-[11px] text-stone-500">
                Select a team to view its logged marks and remove an accidental score or checkpoint.
              </p>

              {removeNotice && (
                <div className="p-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-900 text-xs font-mono font-medium">
                  {removeNotice}
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="log-team" className="block text-[10px] uppercase font-mono text-[#251306]/70 font-semibold">
                    Select Team
                  </label>
                  {(() => {
                    const sel = teams.find(t => t.id === logTeamId);
                    const lName = getTeamLeaderName(sel);
                    return lName ? (
                      <span className="text-[10px] font-mono font-bold text-[#D4621A] bg-amber-100/80 px-2 py-0.5 rounded-md border border-amber-300/60 flex items-center gap-1 shadow-2xs">
                        👑 Leader: <span className="underline">{lName}</span>
                      </span>
                    ) : null;
                  })()}
                </div>
                <select
                  id="log-team"
                  value={logTeamId}
                  onChange={(e) => setLogTeamId(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl bg-white border border-[#F4AE52]/60 text-xs text-[#251306] focus:outline-none focus:border-[#D4621A]"
                >
                  {teams.map((t) => {
                    const lName = getTeamLeaderName(t);
                    return (
                      <option key={t.id} value={t.id}>
                        {t.teamName} {lName ? `[👑 Leader: ${lName}]` : ''} ({t.totalPoints} pts)
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="space-y-2 pt-1 max-h-56 overflow-y-auto pr-1">
                {teamMarks.length === 0 ? (
                  <div className="py-4 text-center text-stone-400 font-mono text-xs rounded-xl bg-stone-50/70 border border-stone-200">
                    No logged marks for this team.
                  </div>
                ) : (
                  teamMarks.map((mark) => (
                    <div
                      key={`${mark.type}-${mark.id}`}
                      className="p-2.5 rounded-xl border border-stone-200 bg-white hover:border-red-300 transition-colors flex items-center justify-between gap-2 shadow-2xs"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-stone-800 truncate">
                            {mark.title}
                          </span>
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase border ${mark.badgeStyle}`}>
                            {mark.badge}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-mono text-stone-400 mt-0.5">
                          <span className={mark.points < 0 ? 'text-red-600 font-bold' : 'text-[#D4621A] font-bold'}>
                            {mark.points > 0 ? `+${mark.points}` : mark.points} pts
                          </span>
                          {mark.time && <span>• {mark.time}</span>}
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={isRemovingMark}
                        onClick={() => handleRemoveMark(mark.id, mark.type, mark.title)}
                        className="px-2 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-[11px] font-medium flex items-center gap-1 shrink-0 transition-colors disabled:opacity-50"
                        title="Remove mark"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Remove</span>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
};
