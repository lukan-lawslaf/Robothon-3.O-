import React, { useState, useEffect } from 'react';
import { MockTeam } from '../../mockData';
import { getLiveLeaderboard } from '../../services/backendService';
import { Trophy, Award, Crown, CheckCircle2, XCircle, Search, Filter } from 'lucide-react';

export const LiveLeaderboardPage: React.FC = () => {
  const [teams, setTeams] = useState<MockTeam[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterQualifiedOnly, setFilterQualifiedOnly] = useState(false);

  const loadData = async () => {
    const data = await getLiveLeaderboard();
    setTeams(data);
  };

  useEffect(() => {
    loadData();

    // Listen to local store updates
    const handleStoreUpdate = () => {
      loadData();
    };
    window.addEventListener('robothon_store_updated', handleStoreUpdate);
    return () => window.removeEventListener('robothon_store_updated', handleStoreUpdate);
  }, []);

  const filteredTeams = teams.filter((t) => {
    const matchesSearch = t.teamName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesQualified = filterQualifiedOnly ? t.isQualified : true;
    return matchesSearch && matchesQualified;
  });

  const top3 = teams.slice(0, 3);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              LIVE SCORING
            </span>
            <span className="text-xs text-slate-400">
              Top 50 Advance to Round 2
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
            Robothon 3.O Leaderboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Real-time score tracking: Total = Checkpoints (High) + Quizzes + Mini-Games.
          </p>
        </div>

        {/* Score Equation Badge */}
        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300">
          <span className="text-cyan-400 font-bold">Total Score</span> = CP + Quizzes + Mini-Games
        </div>
      </div>

      {/* Top 3 Podium Cards */}
      {top3.length >= 3 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 2nd Place */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-700/80 text-center relative flex flex-col items-center justify-between order-2 md:order-1">
            <div className="w-10 h-10 rounded-full bg-slate-800 border-2 border-slate-400 text-slate-200 font-bold flex items-center justify-center mb-2">
              2
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400">Runner Up</span>
              <h3 className="text-base font-bold text-white mt-0.5">{top3[1].teamName}</h3>
              <p className="text-xs text-cyan-400 mt-1">{top3[1].currentCheckpoint}</p>
            </div>
            <div className="mt-3 px-3 py-1 rounded-full bg-slate-800 text-white font-mono font-bold text-sm">
              {top3[1].totalPoints} pts
            </div>
          </div>

          {/* 1st Place */}
          <div className="p-6 rounded-2xl bg-slate-900 border-2 border-amber-400 text-center relative flex flex-col items-center justify-between order-1 md:order-2 shadow-lg shadow-amber-500/10">
            <div className="absolute -top-3">
              <span className="px-3 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-bold uppercase flex items-center gap-1 shadow">
                <Crown className="w-3 h-3" /> 1st Place Leader
              </span>
            </div>
            <div className="w-12 h-12 rounded-full bg-amber-400/20 border-2 border-amber-400 text-amber-300 font-extrabold flex items-center justify-center mt-2 mb-2">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">{top3[0].teamName}</h3>
              <p className="text-xs text-cyan-400 mt-1">{top3[0].currentCheckpoint}</p>
            </div>
            <div className="mt-3 px-4 py-1.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 font-mono font-extrabold text-base">
              {top3[0].totalPoints} pts
            </div>
          </div>

          {/* 3rd Place */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-amber-700/60 text-center relative flex flex-col items-center justify-between order-3">
            <div className="w-10 h-10 rounded-full bg-slate-800 border-2 border-amber-600 text-amber-400 font-bold flex items-center justify-center mb-2">
              3
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-amber-500">3rd Position</span>
              <h3 className="text-base font-bold text-white mt-0.5">{top3[2].teamName}</h3>
              <p className="text-xs text-cyan-400 mt-1">{top3[2].currentCheckpoint}</p>
            </div>
            <div className="mt-3 px-3 py-1 rounded-full bg-slate-800 text-white font-mono font-bold text-sm">
              {top3[2].totalPoints} pts
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-slate-900 border border-slate-800">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search team name..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-300 self-end sm:self-auto">
          <input
            type="checkbox"
            checked={filterQualifiedOnly}
            onChange={(e) => setFilterQualifiedOnly(e.target.checked)}
            className="rounded bg-slate-950 border-slate-700 text-blue-600 focus:ring-0"
          />
          <span>Show Top 50 Qualified Only</span>
        </label>
      </div>

      {/* Leaderboard Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-950 text-[11px] uppercase tracking-wider text-slate-400 font-semibold border-b border-slate-800">
            <tr>
              <th className="py-3 px-4 text-center">Rank</th>
              <th className="py-3 px-4">Team Name</th>
              <th className="py-3 px-4">Current Boat Checkpoint</th>
              <th className="py-3 px-4 text-center">Quiz Points</th>
              <th className="py-3 px-4 text-center">Mini-Games</th>
              <th className="py-3 px-4 text-center">Checkpoint Pts</th>
              <th className="py-3 px-4 text-right">Total Score</th>
              <th className="py-3 px-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 text-xs">
            {filteredTeams.map((team) => (
              <tr key={team.id} className="hover:bg-slate-800/50 transition-colors">
                <td className="py-3 px-4 text-center font-mono font-bold text-slate-200">
                  #{team.rank}
                </td>
                <td className="py-3 px-4 font-semibold text-white">
                  {team.teamName}
                </td>
                <td className="py-3 px-4 text-slate-300">
                  {team.currentCheckpoint}
                </td>
                <td className="py-3 px-4 text-center font-mono text-slate-300">
                  {team.quizPoints}
                </td>
                <td className="py-3 px-4 text-center font-mono text-emerald-400">
                  +{team.miniGamePoints}
                </td>
                <td className="py-3 px-4 text-center font-mono font-semibold text-cyan-400">
                  {team.checkpointPoints}
                </td>
                <td className="py-3 px-4 text-right">
                  <span className="font-mono font-bold text-white px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                    {team.totalPoints}
                  </span>
                </td>
                <td className="py-3 px-4 text-center">
                  {team.isQualified ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      <CheckCircle2 className="w-3 h-3" />
                      Qualified - Top 50
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/10 text-red-400 border border-red-500/30">
                      <XCircle className="w-3 h-3" />
                      Eliminated
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
