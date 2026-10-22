import React, { useState } from 'react';
import { MiniGame, AwardMiniGamePayload } from '../../types/minigame';
import { Team } from '../../types/auth';
import { Button } from '../common/Button';
import { Award, Gamepad2, Send } from 'lucide-react';
import { getTeamLeaderName } from '../../mockData';

interface BonusPointsFormProps {
  miniGames: MiniGame[];
  teams: Team[];
  onAwardBonus: (payload: AwardMiniGamePayload) => Promise<void>;
  isSubmitting?: boolean;
}

export const BonusPointsForm: React.FC<BonusPointsFormProps> = ({
  miniGames,
  teams,
  onAwardBonus,
  isSubmitting = false,
}) => {
  const [selectedGameId, setSelectedGameId] = useState(miniGames[0]?.id || '');
  const [selectedTeamId, setSelectedTeamId] = useState(teams[0]?.id || '');
  const [points, setPoints] = useState<number>(10);
  const [notes, setNotes] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const selectedGame = miniGames.find((g) => g.id === selectedGameId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGameId || !selectedTeamId) return;

    await onAwardBonus({
      gameId: selectedGameId,
      teamId: selectedTeamId,
      points,
      adminId: 'admin-01',
      adminName: 'Admin (Ishan)',
      notes,
    });

    setSuccessMessage(`Successfully awarded +${points} pts to ${teams.find(t => t.id === selectedTeamId)?.teamName}!`);
    setTimeout(() => setSuccessMessage(null), 4000);
    setNotes('');
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-5">
      <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
        <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
          <Gamepad2 className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-base font-bold text-white">Award Mini-Game Bonus Points</h3>
          <p className="text-xs text-slate-400">Design team side activities (Ping Pong, steady wire challenge, etc.)</p>
        </div>
      </div>

      {successMessage && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold animate-fadeIn">
          {successMessage}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Game selection */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            Select Mini-Game:
          </label>
          <select
            value={selectedGameId}
            onChange={(e) => {
              setSelectedGameId(e.target.value);
              const g = miniGames.find((item) => item.id === e.target.value);
              if (g) setPoints(Math.min(points, g.maxBonusPoints));
            }}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
          >
            {miniGames.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name} (Max: {g.maxBonusPoints} pts)
              </option>
            ))}
          </select>
        </div>

        {/* Team selection */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Recipient Team:
            </label>
            {(() => {
              const sel = teams.find(t => t.id === selectedTeamId);
              const lName = getTeamLeaderName(sel);
              return lName ? (
                <span className="text-[11px] font-mono font-bold text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded-md border border-cyan-500/40 flex items-center gap-1 shadow-2xs">
                  👑 Leader: <span className="underline">{lName}</span>
                </span>
              ) : null;
            })()}
          </div>
          <select
            value={selectedTeamId}
            onChange={(e) => setSelectedTeamId(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
          >
            {teams.map((t) => {
              const lName = getTeamLeaderName(t);
              return (
                <option key={t.id} value={t.id}>
                  {t.teamName} {lName ? `[👑 Leader: ${lName}]` : ''} {t.tableNumber ? `(Table ${t.tableNumber})` : ''}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Points input slider */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Bonus Points
          </label>
          <span className="text-xs font-mono font-bold text-cyan-400 flex items-center gap-1">
            <Award className="w-3.5 h-3.5" />
            +{points} pts
          </span>
        </div>
        <input
          type="range"
          min={1}
          max={selectedGame?.maxBonusPoints || 25}
          value={points}
          onChange={(e) => setPoints(Number(e.target.value))}
          className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
        />
      </div>

      {/* Notes */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
          Match / Game Notes:
        </label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
        />
      </div>

      {/* Submit Button */}
      <div className="flex justify-end pt-2">
        <Button type="submit" variant="primary" size="md" isLoading={isSubmitting}>
          <Send className="w-4 h-4" />
          Award Bonus Points
        </Button>
      </div>
    </form>
  );
};
