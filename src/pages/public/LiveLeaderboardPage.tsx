import React, { useState, useEffect } from 'react';
import { LeaderboardEntry, LeaderboardFilters } from '../../types/leaderboard';
import { getLeaderboard, subscribeToLeaderboard } from '../../services/leaderboardService';
import { Top3Podium } from '../../components/leaderboard/Top3Podium';
import { LeaderboardTable } from '../../components/leaderboard/LeaderboardTable';
import { ScoreFilters } from '../../components/leaderboard/ScoreFilters';
import { MOCK_CURRENT_TEAM } from '../../mockData/teams.mock';
import { Trophy, Radio, Info } from 'lucide-react';

export const LiveLeaderboardPage: React.FC = () => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [filters, setFilters] = useState<LeaderboardFilters>({
    searchQuery: '',
    onlyQualified: false,
  });
  const [lastHeartbeat, setLastHeartbeat] = useState<string>('Just now');

  useEffect(() => {
    // Initial fetch
    const loadInitial = async () => {
      const data = await getLeaderboard(filters);
      setEntries(data);
    };
    loadInitial();

    // Subscribe to simulated live updates
    const unsubscribe = subscribeToLeaderboard((updated) => {
      setLastHeartbeat(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setEntries(updated);
    });

    return () => unsubscribe();
  }, [filters]);

  const top3 = entries.slice(0, 3);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              LIVE LEADERBOARD
            </span>
            <span className="text-xs text-slate-400">
              Updated: {lastHeartbeat}
            </span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white mt-1">
            Robothon 2026 Live Standings
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time score tracking across Hardware Milestones, Elimination & Component Quizzes, and Design Mini-Games.
          </p>
        </div>

        {/* Scoring Formula Card */}
        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center gap-3">
          <Info className="w-5 h-5 text-cyan-400 shrink-0" />
          <div className="text-xs">
            <span className="font-semibold text-slate-300">Scoring Engine: </span>
            <span className="font-mono text-cyan-300">
              Checkpoints (High) + Quizzes + Mini-Games
            </span>
          </div>
        </div>
      </div>

      {/* Top 3 Podium */}
      {top3.length > 0 && <Top3Podium top3={top3} />}

      {/* Filters Bar */}
      <ScoreFilters filters={filters} onChange={setFilters} />

      {/* Full Leaderboard Table */}
      <LeaderboardTable
        entries={entries}
        currentTeamId={MOCK_CURRENT_TEAM.id}
      />
    </div>
  );
};
