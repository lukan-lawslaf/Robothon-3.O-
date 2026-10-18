import React, { useState, useEffect } from 'react';
import { MockTeam } from '../../mockData';
import { getLiveLeaderboard } from '../../services/backendService';
import { Trophy, Crown, CheckCircle2, XCircle, Search } from 'lucide-react';

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
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-[#D4621A]/20 text-[#D4621A] border border-[#D4621A]/40">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D4621A] animate-ping" />
              LIVE TELEMETRY
            </span>
            <span className="text-xs text-[#8C7360] font-mono">
              Top 50 Cutoff Active
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-normal text-white tracking-tight mt-1">
            Robothon 3.0 Live Leaderboard
          </h1>
          <p className="text-xs text-[#FEF3E2]/70 mt-0.5">
            Total Score = Checkpoint Points (Hardware) + Quiz Scores + Mini-Game Bonuses.
          </p>
        </div>

        {/* Formula Badge */}
        <div className="px-4 py-2 rounded-2xl bg-[rgba(42,26,14,0.8)] border border-[rgba(254,243,226,0.16)] text-xs font-mono text-[#F4AE52]">
          Total = CP + Quizzes + MiniGames
        </div>
      </div>

      {/* Top 3 Podium Cards (DESIGN.md Contract in #F4AE52 & #D4621A) */}
      {top3.length >= 3 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end pt-2">
          {/* 2nd Place */}
          <div className="p-5 rounded-2xl bg-[rgba(42,26,14,0.85)] border border-white/15 text-center flex flex-col items-center justify-between order-2 md:order-1 shadow-lg">
            <div className="w-10 h-10 rounded-full bg-[#1F1208] border border-white/30 text-white font-mono text-xs flex items-center justify-center mb-2">
              02
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase text-[#8C7360]">Runner Up</span>
              <h3 className="text-base font-normal text-white mt-0.5">{top3[1].teamName}</h3>
              <p className="text-xs text-[#F4AE52] font-mono mt-1">{top3[1].currentCheckpoint}</p>
            </div>
            <div className="mt-3 px-3.5 py-1 rounded-full bg-[#1F1208] border border-white/10 text-white font-mono text-sm">
              {top3[1].totalPoints} pts
            </div>
          </div>

          {/* 1st Place (Event Leader) */}
          <div
            className="p-6 rounded-3xl bg-[rgba(42,26,14,0.95)] text-center flex flex-col items-center justify-between order-1 md:order-2 shadow-2xl relative"
            style={{
              border: '2px solid #F4AE52',
              boxShadow: '0 0 35px rgba(244,174,82,0.22)',
            }}
          >
            <div className="absolute -top-3">
              <span className="px-3 py-0.5 rounded-full bg-[#F4AE52] text-[#2A1A0E] text-[10px] font-mono uppercase tracking-wider font-semibold flex items-center gap-1 shadow">
                <Crown className="w-3 h-3" /> Event Leader
              </span>
            </div>
            <div className="w-12 h-12 rounded-full bg-[#D4621A] text-white flex items-center justify-center mt-3 mb-2 shadow-lg">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-normal text-white">{top3[0].teamName}</h3>
              <p className="text-xs text-[#F4AE52] font-mono mt-1">{top3[0].currentCheckpoint}</p>
            </div>
            <div className="mt-3 px-5 py-1.5 rounded-full bg-[#D4621A] text-[#FEF3E2] font-mono font-bold text-base shadow">
              {top3[0].totalPoints} pts
            </div>
          </div>

          {/* 3rd Place */}
          <div className="p-5 rounded-2xl bg-[rgba(42,26,14,0.85)] border border-[#D4621A]/30 text-center flex flex-col items-center justify-between order-3 shadow-lg">
            <div className="w-10 h-10 rounded-full bg-[#1F1208] border border-[#D4621A]/40 text-[#D4621A] font-mono text-xs flex items-center justify-center mb-2">
              03
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase text-[#8C7360]">3rd Place</span>
              <h3 className="text-base font-normal text-white mt-0.5">{top3[2].teamName}</h3>
              <p className="text-xs text-[#F4AE52] font-mono mt-1">{top3[2].currentCheckpoint}</p>
            </div>
            <div className="mt-3 px-3.5 py-1 rounded-full bg-[#1F1208] border border-white/10 text-white font-mono text-sm">
              {top3[2].totalPoints} pts
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-3.5 rounded-2xl bg-[rgba(42,26,14,0.85)] border border-[rgba(254,243,226,0.16)]">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search team..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#1F1208] border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#F4AE52]"
          />
        </div>

        <label className="flex items-center gap-2 cursor-pointer text-xs font-mono text-[#FEF3E2]/80 self-end sm:self-auto">
          <input
            type="checkbox"
            checked={filterQualifiedOnly}
            onChange={(e) => setFilterQualifiedOnly(e.target.checked)}
            className="rounded bg-[#1F1208] border-white/20 text-[#D4621A] focus:ring-0"
          />
          <span>Show Top 50 Qualified Only</span>
        </label>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-[rgba(254,243,226,0.16)] bg-[rgba(42,26,14,0.85)] shadow-xl">
        <table className="w-full text-left text-sm text-white/80">
          <thead className="bg-[#1F1208] text-[10px] uppercase font-mono tracking-wider text-[#8C7360] border-b border-white/10">
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
          <tbody className="divide-y divide-white/5 text-xs">
            {filteredTeams.map((team) => (
              <tr key={team.id} className="hover:bg-white/5 transition-colors">
                <td className="py-3 px-4 text-center font-mono text-white">
                  #{team.rank}
                </td>
                <td className="py-3 px-4 font-normal text-white">
                  {team.teamName}
                </td>
                <td className="py-3 px-4 text-white/70">
                  {team.currentCheckpoint}
                </td>
                <td className="py-3 px-4 text-center font-mono text-white/70">
                  {team.quizPoints}
                </td>
                <td className="py-3 px-4 text-center font-mono text-[#F4AE52]">
                  +{team.miniGamePoints}
                </td>
                <td className="py-3 px-4 text-center font-mono text-[#F4AE52]">
                  {team.checkpointPoints}
                </td>
                <td className="py-3 px-4 text-right">
                  <span className="font-mono font-bold text-white px-2 py-0.5 rounded bg-[#1F1208] border border-white/15">
                    {team.totalPoints}
                  </span>
                </td>
                <td className="py-3 px-4 text-center">
                  {team.isQualified ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      <CheckCircle2 className="w-3 h-3" />
                      Top 50 Qualified
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-red-500/10 text-red-400 border border-red-500/30">
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
