import React, { useState, useEffect } from 'react';
import { MockTeam } from '../../mockData';
import { getLiveLeaderboard } from '../../services/backendService';
import { Trophy, Crown, CheckCircle2, XCircle, Search, Flame } from 'lucide-react';

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
    const handleStoreUpdate = () => loadData();
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
              Top 50 Cutoff Active
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#251306] tracking-tight mt-1.5">
            Robothon 3.0 Live Leaderboard
          </h1>
          <p className="text-xs text-[#251306]/70 mt-0.5 font-mono">
            Total Score = Checkpoint Points (Hardware) + Quiz Scores + Mini-Game Bonuses.
          </p>
        </div>

        {/* Formula Badge */}
        <div className="px-4 py-2 rounded-2xl bg-white/80 border border-[#F4AE52]/50 text-xs font-mono font-bold text-[#D4621A] shadow-sm">
          Total = CP + Quizzes + MiniGames
        </div>
      </div>

      {/* Top 3 Podium Cards */}
      {top3.length >= 3 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end pt-2">
          {/* 2nd Place */}
          <div className="p-5 rounded-2xl bg-white/80 backdrop-blur-md border border-[#F4AE52]/40 text-center flex flex-col items-center justify-between order-2 md:order-1 shadow-md">
            <div className="w-10 h-10 rounded-full bg-[#251306] border border-[#F4AE52]/40 text-[#FEF3E2] font-mono text-xs font-bold flex items-center justify-center mb-2 shadow">
              02
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase text-[#251306]/60 font-semibold">Runner Up</span>
              <h3 className="text-base font-bold text-[#251306] mt-0.5">{top3[1].teamName}</h3>
              <p className="text-xs text-[#D4621A] font-mono mt-1">{top3[1].currentCheckpoint}</p>
            </div>
            <div className="mt-3 px-4 py-1 rounded-full bg-[#FEF3E2] border border-[#F4AE52]/50 text-[#251306] font-mono font-bold text-sm">
              {top3[1].totalPoints} pts
            </div>
          </div>

          {/* 1st Place (Event Leader) */}
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
              <h3 className="text-lg font-bold text-[#251306]">{top3[0].teamName}</h3>
              <p className="text-xs text-[#D4621A] font-mono font-medium mt-1">{top3[0].currentCheckpoint}</p>
            </div>
            <div className="mt-3 px-5 py-1.5 rounded-full bg-[#D4621A] text-[#FEF3E2] font-mono font-bold text-base shadow">
              {top3[0].totalPoints} pts
            </div>
          </div>

          {/* 3rd Place */}
          <div className="p-5 rounded-2xl bg-white/80 backdrop-blur-md border border-[#F4AE52]/40 text-center flex flex-col items-center justify-between order-3 shadow-md">
            <div className="w-10 h-10 rounded-full bg-[#251306] border border-[#F4AE52]/40 text-[#FEF3E2] font-mono text-xs font-bold flex items-center justify-center mb-2 shadow">
              03
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase text-[#251306]/60 font-semibold">3rd Place</span>
              <h3 className="text-base font-bold text-[#251306] mt-0.5">{top3[2].teamName}</h3>
              <p className="text-xs text-[#D4621A] font-mono mt-1">{top3[2].currentCheckpoint}</p>
            </div>
            <div className="mt-3 px-4 py-1 rounded-full bg-[#FEF3E2] border border-[#F4AE52]/50 text-[#251306] font-mono font-bold text-sm">
              {top3[2].totalPoints} pts
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
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search competing team..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#FEF3E2]/80 border border-[#F4AE52]/50 text-xs text-[#251306] placeholder-[#251306]/40 focus:outline-none focus:border-[#D4621A]"
          />
        </div>

        <label className="flex items-center gap-2 cursor-pointer text-xs font-mono text-[#251306] font-medium self-end sm:self-auto">
          <input
            type="checkbox"
            checked={filterQualifiedOnly}
            onChange={(e) => setFilterQualifiedOnly(e.target.checked)}
            className="rounded bg-white border-[#F4AE52] text-[#D4621A] focus:ring-0"
          />
          <span>Show Top 50 Qualified Only</span>
        </label>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-[#F4AE52]/40 bg-white/85 shadow-md">
        <table className="w-full text-left text-sm text-[#251306]">
          <thead className="bg-[#251306] text-[10px] uppercase font-mono tracking-wider text-[#F4AE52] border-b border-[#F4AE52]/30">
            <tr>
              <th className="py-3 px-4 text-center">Rank</th>
              <th className="py-3 px-4">Team Name</th>
              <th className="py-3 px-4">Current Boat Checkpoint</th>
              <th className="py-3 px-4 text-center">Quiz Pts</th>
              <th className="py-3 px-4 text-center">Mini-Games</th>
              <th className="py-3 px-4 text-center">Checkpoint Pts</th>
              <th className="py-3 px-4 text-right">Total Score</th>
              <th className="py-3 px-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F4AE52]/20 text-xs font-mono">
            {filteredTeams.map((team) => (
              <tr key={team.id} className="hover:bg-[#FEF3E2]/60 transition-colors">
                <td className="py-3 px-4 text-center font-bold text-[#251306]">
                  #{team.rank}
                </td>
                <td className="py-3 px-4 font-sans font-bold text-[#251306]">
                  {team.teamName}
                </td>
                <td className="py-3 px-4 text-[#251306]/80 font-sans">
                  {team.currentCheckpoint}
                </td>
                <td className="py-3 px-4 text-center text-[#251306]/70">
                  {team.quizPoints}
                </td>
                <td className="py-3 px-4 text-center text-[#D4621A] font-bold">
                  +{team.miniGamePoints}
                </td>
                <td className="py-3 px-4 text-center text-[#251306]">
                  {team.checkpointPoints}
                </td>
                <td className="py-3 px-4 text-right">
                  <span className="font-bold text-[#FEF3E2] px-2.5 py-1 rounded-md bg-[#251306] border border-[#F4AE52]/30 shadow-xs">
                    {team.totalPoints}
                  </span>
                </td>
                <td className="py-3 px-4 text-center">
                  {team.isQualified ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-800 border border-emerald-500/30">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Top 50 Qualified
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500/15 text-red-800 border border-red-500/30">
                      <XCircle className="w-3 h-3 text-red-600" />
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
