import React, { useState, useEffect } from 'react';
import { MiniGame, MiniGameScoreEntry, AwardMiniGamePayload } from '../../types/minigame';
import { Team } from '../../types/auth';
import { getMiniGames, awardMiniGameBonus, getRecentBonusAwards } from '../../services/minigameService';
import { MOCK_TEAMS } from '../../mockData/teams.mock';
import { BonusPointsForm } from '../../components/admin/BonusPointsForm';
import { Gamepad2, Award, History } from 'lucide-react';

export const MiniGamesPage: React.FC = () => {
  const [miniGames, setMiniGames] = useState<MiniGame[]>([]);
  const [recentAwards, setRecentAwards] = useState<MiniGameScoreEntry[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const [games, awards] = await Promise.all([
        getMiniGames(),
        getRecentBonusAwards(),
      ]);
      setMiniGames(games);
      setRecentAwards(awards);
    };
    fetchData();
  }, []);

  const handleAwardBonus = async (payload: AwardMiniGamePayload) => {
    try {
      setIsSubmitting(true);
      const newEntry = await awardMiniGameBonus(payload);
      setRecentAwards((prev) => [newEntry, ...prev]);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="pb-6 border-b border-slate-800">
        <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400">
          Design Team Side Activities
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
          Mini-Game Bonus Allocator
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Award low-weightage bonus points to teams for side games (Ping Pong, Steady Hand Wire, Target Toss).
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Award Form */}
        <div className="lg:col-span-5">
          <BonusPointsForm
            miniGames={miniGames}
            teams={MOCK_TEAMS}
            onAwardBonus={handleAwardBonus}
            isSubmitting={isSubmitting}
          />
        </div>

        {/* Recent Awards Log */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center gap-2 text-white font-bold text-base">
            <History className="w-5 h-5 text-cyan-400" />
            <h3>Recent Bonus Awards Log</h3>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/80 text-[11px] uppercase tracking-wider text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Time</th>
                  <th className="py-3 px-4">Team</th>
                  <th className="py-3 px-4">Game</th>
                  <th className="py-3 px-4 text-center">Bonus</th>
                  <th className="py-3 px-4">Awarded By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {recentAwards.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-mono text-xs text-slate-400">
                      {entry.recordedAt}
                    </td>
                    <td className="py-3 px-4 font-semibold text-white">
                      {entry.teamName}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-300">
                      {entry.gameName}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-cyan-400 text-xs">
                      +{entry.awardedPoints} pts
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-400">
                      {entry.recordedByAdminName}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
