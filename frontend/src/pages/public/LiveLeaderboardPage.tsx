import React, { useState, useEffect } from 'react';
import { MockTeam } from '../../mockData';
import { getLiveLeaderboard } from '../../services/backendService';
import { quizService, Quiz, TemporaryLeaderboardRow } from '../../services/quizService';
import { Trophy, Crown, CheckCircle2, XCircle, Search, Flame, Award, Radio } from 'lucide-react';

export const LiveLeaderboardPage: React.FC = () => {
  const [activeBoard, setActiveBoard] = useState<string>('global');
  const [globalTeams, setGlobalTeams] = useState<MockTeam[]>([]);
  const [roundRows, setRoundRows] = useState<TemporaryLeaderboardRow[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [cutoff, setCutoff] = useState<number>(40);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterQualifiedOnly, setFilterQualifiedOnly] = useState(false);
  const [loadingRound, setLoadingRound] = useState(false);

  // Load permanent global leaderboard
  const loadGlobalData = async () => {
    try {
      const data = await getLiveLeaderboard();
      setGlobalTeams(data);
    } catch {
      // fallback
    }
  };

  // Load quiz round leaderboard
  const loadRoundData = async (quizId: string) => {
    setLoadingRound(true);
    try {
      const [qList, res] = await Promise.all([
        quizService.list(true).catch(() => ({ quizzes: [] })),
        quizService.leaderboard(quizId).catch(() => ({ leaderboard: [], rows: [], qualificationCutoff: 40 } as any))
      ]);
      setQuizzes(qList.quizzes);
      const targetQuiz = qList.quizzes.find(q => q.id === quizId);
      const effectiveCutoff = targetQuiz?.qualificationCount || (res as any).qualificationCutoff || 40;
      setCutoff(effectiveCutoff);
      const rows = (res as any).leaderboard || (res as any).rows || [];
      setRoundRows(rows);
    } catch {
      setRoundRows([]);
    } finally {
      setLoadingRound(false);
    }
  };

  useEffect(() => {
    loadGlobalData();
    const handleStoreUpdate = () => loadGlobalData();
    window.addEventListener('robothon_store_updated', handleStoreUpdate);

    const unsubscribe = quizService.subscribe(() => {
      loadGlobalData();
      if (activeBoard !== 'global') {
        loadRoundData(activeBoard);
      }
    });

    return () => {
      window.removeEventListener('robothon_store_updated', handleStoreUpdate);
      unsubscribe();
    };
  }, [activeBoard]);

  useEffect(() => {
    if (activeBoard === 'global') {
      loadGlobalData();
    } else {
      loadRoundData(activeBoard);
    }
  }, [activeBoard]);

  const filteredGlobal = globalTeams.filter((t) => {
    const matchesSearch = t.teamName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesQualified = filterQualifiedOnly ? t.isQualified : true;
    return matchesSearch && matchesQualified;
  });

  const filteredRound = roundRows.filter((r) => {
    return (r.teamName || r.teamId).toLowerCase().includes(searchQuery.toLowerCase());
  });

  const top3Global = globalTeams.slice(0, 3);
  const activeQuiz = quizzes.find(q => q.id === activeBoard);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 text-[#251306]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#F4AE52]/30">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-[#D4621A] text-[#FEF3E2] shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
              LIVE TELEMETRY
            </span>
            <span className="text-xs text-[#251306]/70 font-mono font-medium">
              Dual-Leaderboard Architecture
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#251306] tracking-tight mt-1.5">
            Robothon 3.0 Leaderboard
          </h1>
          <p className="text-xs text-[#251306]/70 mt-0.5 font-mono">
            {activeBoard === 'global'
              ? 'Permanent Global Tally: Checkpoints (Hardware) + Finalized Quizzes + Mini-Games.'
              : `Temporary Round Standings for ${activeQuiz?.name || 'Round'}. Points commit to Global Board upon finalization.`}
          </p>
        </div>

        {/* Dynamic Tab Switcher */}
        <div className="flex items-center p-1 rounded-2xl bg-white border border-[#F4AE52]/40 shadow-sm font-mono text-xs overflow-x-auto">
          <button
            type="button"
            onClick={() => { setActiveBoard('global'); setSearchQuery(''); }}
            className={`px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeBoard === 'global'
                ? 'bg-[#251306] text-[#FEF3E2] shadow'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Global Robothon
          </button>
          {quizzes.filter(q => q.status !== 'DRAFT').map(q => (
            <button
              key={q.id}
              type="button"
              onClick={() => { setActiveBoard(q.id); setSearchQuery(''); }}
              className={`px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeBoard === q.id
                  ? 'bg-[#D4621A] text-white shadow'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              {q.name}
            </button>
          ))}
        </div>
      </div>

      {/* GLOBAL BOARD VIEW */}
      {activeBoard === 'global' && (
        <>
          {/* Top 3 Podium Cards */}
          {top3Global.length >= 3 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end pt-2">
              {/* 2nd Place */}
              <div className="p-5 rounded-2xl bg-white/80 backdrop-blur-md border border-[#F4AE52]/40 text-center flex flex-col items-center justify-between order-2 md:order-1 shadow-md">
                <div className="w-10 h-10 rounded-full bg-[#251306] border border-[#F4AE52]/40 text-[#FEF3E2] font-mono text-xs font-bold flex items-center justify-center mb-2 shadow">
                  02
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase text-[#251306]/60 font-semibold">Runner Up</span>
                  <h3 className="text-base font-bold text-[#251306] mt-0.5">{top3Global[1].teamName}</h3>
                  <p className="text-xs text-[#D4621A] font-mono mt-1">{top3Global[1].currentCheckpoint}</p>
                </div>
                <div className="mt-3 px-4 py-1 rounded-full bg-[#FEF3E2] border border-[#F4AE52]/50 text-[#251306] font-mono font-bold text-sm">
                  {top3Global[1].totalPoints} pts
                </div>
              </div>

              {/* 1st Place */}
              <div
                className="p-6 rounded-3xl bg-white backdrop-blur-md text-center flex flex-col items-center justify-between order-1 md:order-2 shadow-xl relative border-2 border-[#D4621A]"
                style={{
                  boxShadow: '0 10px 30px rgba(212,98,26,0.15)',
                }}
              >
                <div className="absolute -top-3.5">
                  <span className="px-3.5 py-1 rounded-full bg-[#D4621A] text-[#FEF3E2] text-[10px] font-mono uppercase tracking-wider font-bold flex items-center gap-1 shadow-md">
                    <Crown className="w-3.5 h-3.5" /> Event Leader
                  </span>
                </div>
                <div className="w-12 h-12 rounded-full bg-[#251306] text-[#F4AE52] flex items-center justify-center mt-3 mb-2 shadow-lg border border-[#F4AE52]/50">
                  <Trophy className="w-6 h-6 text-[#F4AE52]" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#251306]">{top3Global[0].teamName}</h3>
                  <p className="text-xs text-[#D4621A] font-mono font-medium mt-1">{top3Global[0].currentCheckpoint}</p>
                </div>
                <div className="mt-3 px-5 py-1.5 rounded-full bg-[#D4621A] text-[#FEF3E2] font-mono font-bold text-base shadow">
                  {top3Global[0].totalPoints} pts
                </div>
              </div>

              {/* 3rd Place */}
              <div className="p-5 rounded-2xl bg-white/80 backdrop-blur-md border border-[#F4AE52]/40 text-center flex flex-col items-center justify-between order-3 shadow-md">
                <div className="w-10 h-10 rounded-full bg-[#251306] border border-[#F4AE52]/40 text-[#FEF3E2] font-mono text-xs font-bold flex items-center justify-center mb-2 shadow">
                  03
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase text-[#251306]/60 font-semibold">3rd Place</span>
                  <h3 className="text-base font-bold text-[#251306] mt-0.5">{top3Global[2].teamName}</h3>
                  <p className="text-xs text-[#D4621A] font-mono mt-1">{top3Global[2].currentCheckpoint}</p>
                </div>
                <div className="mt-3 px-4 py-1 rounded-full bg-[#FEF3E2] border border-[#F4AE52]/50 text-[#251306] font-mono font-bold text-sm">
                  {top3Global[2].totalPoints} pts
                </div>
              </div>
            </div>
          )}

          {/* Filter and Search Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-3.5 rounded-2xl bg-white/80 backdrop-blur-md border border-[#F4AE52]/40 shadow-sm">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-[#251306]/40 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                aria-label="Search competing team"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#FEF3E2]/80 border border-[#F4AE52]/50 text-xs text-[#251306] focus:outline-none focus:border-[#D4621A]"
              />
            </div>

            <div className="flex items-center gap-4 flex-wrap">
              {/* Qualification Status Legend */}
              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-100/80 text-emerald-800 font-bold border border-emerald-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                  Qualified
                </span>
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-100/80 text-red-800 font-bold border border-red-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span>
                  Eliminated
                </span>
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-mono text-[#251306] font-medium self-end sm:self-auto">
                <input
                  type="checkbox"
                  checked={filterQualifiedOnly}
                  onChange={(e) => setFilterQualifiedOnly(e.target.checked)}
                  className="rounded accent-[#D4621A]"
                />
                <span>Show Qualified Teams Only</span>
              </label>
            </div>
          </div>

          {/* Global Leaderboard Table */}
          <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-[#F4AE52]/40 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#FEF3E2] border-b border-[#F4AE52]/30 text-stone-600 font-mono text-[10px] uppercase">
                    <th className="py-3 px-4 w-16 text-center">Rank</th>
                    <th className="py-3 px-4">Team</th>
                    <th className="py-3 px-4">Current Checkpoint</th>
                    <th className="py-3 px-4 text-center">Checkpoint Pts</th>
                    <th className="py-3 px-4 text-center">Quiz Finalized Pts</th>
                    <th className="py-3 px-4 text-center">Bonus Pts</th>
                    <th className="py-3 px-4 text-right">Total Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-mono text-[#251306]">
                  {filteredGlobal.map((team, idx) => {
                    const isQual = team.isQualified || team.qualificationStatus === 'QUALIFIED';
                    const isElim = team.isEliminated || team.qualificationStatus === 'ELIMINATED';
                    return (
                      <tr
                        key={team.id}
                        className={`transition-colors ${
                          isQual
                            ? 'bg-emerald-50/80 hover:bg-emerald-100/70 border-l-4 border-l-emerald-500'
                            : isElim
                            ? 'bg-red-50/80 hover:bg-red-100/70 border-l-4 border-l-red-500'
                            : 'hover:bg-orange-50/40 border-l-4 border-l-transparent'
                        }`}
                      >
                        <td className="py-3 px-4 text-center font-bold">
                          <span className={`inline-block px-2 py-0.5 rounded ${
                            idx < 3 ? 'bg-[#D4621A] text-white' : 'text-stone-600'
                          }`}>
                            #{idx + 1}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold font-sans text-sm text-[#251306]">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span>{team.teamName}</span>
                            {isQual && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                Qualified
                              </span>
                            )}
                            {isElim && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-300">
                                Eliminated
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-stone-600">
                          {team.currentCheckpoint}
                        </td>
                        <td className="py-3 px-4 text-center text-stone-700">
                          {team.checkpointPoints} pts
                        </td>
                        <td className="py-3 px-4 text-center text-[#D4621A] font-bold">
                          {team.quizPoints ?? (team as any).quizScore ?? 0} pts
                        </td>
                        <td className="py-3 px-4 text-center text-stone-700">
                          +{team.miniGamePoints ?? (team as any).bonusPoints ?? 0} pts
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-base text-[#D4621A]">
                          {team.totalPoints} pts
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* TEMPORARY ROUND LEADERBOARD VIEW (Quiz 1 / Quiz 2) */}
      {activeBoard !== 'global' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-orange-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-mono uppercase font-bold text-[#D4621A]">
                Temporary Round Standings
              </span>
              <h2 className="text-xl font-bold text-[#251306]">
                {activeQuiz?.name || 'Quiz Standings'}
              </h2>
            </div>
            <div className="text-xs font-mono text-stone-500">
              Cutoff: <strong className="text-[#D4621A]">Top {cutoff} Qualify</strong> · Round Status: <strong className="uppercase">{activeQuiz?.status || 'Active'}</strong>
            </div>
          </div>

          {/* Search bar */}
          <div className="p-3.5 rounded-2xl bg-white/80 border border-[#F4AE52]/40 shadow-sm flex items-center gap-3">
            <Search className="w-4 h-4 text-stone-400" />
            <input
              type="text"
              aria-label="Search competing team in round"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-xs font-mono text-[#251306] focus:outline-none"
            />
          </div>

          {/* Round Table with Cutoff Line */}
          <div className="bg-white rounded-3xl border border-orange-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse font-mono text-xs">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4 w-16 text-center">Rank</th>
                    <th className="py-3 px-4">Team</th>
                    <th className="py-3 px-4 text-right">Round Score</th>
                    <th className="py-3 px-4 text-right">Time Taken</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-[#251306]">
                  {filteredRound.map((row, idx) => {
                    const isCutoffLine = idx === cutoff - 1;
                    const isQualifying = idx < cutoff && !row.debarred;

                    return (
                      <React.Fragment key={row.teamId}>
                        <tr className={`hover:bg-orange-50/40 transition-colors ${
                          row.debarred ? 'bg-red-50/50' : isQualifying ? 'bg-emerald-50/20' : ''
                        }`}>
                          <td className="py-3.5 px-4 text-center font-bold">
                            <span className={`inline-block px-2.5 py-0.5 rounded-xl ${
                              idx < 3 ? 'bg-[#D4621A] text-white' : 'text-stone-600'
                            }`}>
                              #{idx + 1}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 font-bold font-sans text-sm text-[#251306]">
                            {row.teamName || row.teamId}
                          </td>

                          <td className="py-3.5 px-4 text-right font-bold text-[#D4621A]">
                            {row.score} pts
                          </td>

                          <td className="py-3.5 px-4 text-right text-stone-500">
                            {Math.floor(row.timeTaken / 60)}m {String(row.timeTaken % 60).padStart(2, '0')}s
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            {row.debarred ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-red-100 text-red-800">
                                Debarred
                              </span>
                            ) : (
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                isQualifying ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-600'
                              }`}>
                                {isQualifying ? 'Projected Qualified' : 'Projected Eliminated'}
                              </span>
                            )}
                          </td>
                        </tr>

                        {isCutoffLine && (
                          <tr className="bg-[#D4621A] text-white font-mono text-[11px] font-bold">
                            <td colSpan={5} className="py-2 px-4 text-center tracking-wider">
                              ▲ TOP {cutoff} ADVANCE — CUTOFF LINE ▼
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}

                  {filteredRound.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-stone-400 font-mono text-xs">
                        {loadingRound ? 'Loading round standings…' : 'No submissions recorded yet for this round.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
