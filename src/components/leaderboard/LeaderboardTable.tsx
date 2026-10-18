import React from 'react';
import { LeaderboardEntry } from '../../types/leaderboard';
import { Trophy, ShieldCheck, ShieldAlert, Award } from 'lucide-react';

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  currentTeamId?: string;
}

export const LeaderboardTable: React.FC<LeaderboardTableProps> = ({
  entries,
  currentTeamId,
}) => {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60 shadow-2xl">
      <table className="w-full text-left text-sm text-slate-300">
        <thead className="bg-slate-950/80 text-[11px] uppercase tracking-wider text-slate-400 font-semibold border-b border-slate-800">
          <tr>
            <th className="py-3.5 px-4 text-center">Rank</th>
            <th className="py-3.5 px-4">Team & College</th>
            <th className="py-3.5 px-4">Status</th>
            <th className="py-3.5 px-4">Checkpoints</th>
            <th className="py-3.5 px-4 text-center">Quiz 1</th>
            <th className="py-3.5 px-4 text-center">Hardware CP</th>
            <th className="py-3.5 px-4 text-center">Quiz 2</th>
            <th className="py-3.5 px-4 text-center">Mini-Games</th>
            <th className="py-3.5 px-4 text-right">Total Score</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/80 font-normal">
          {entries.map((entry) => {
            const isTop3 = entry.rank <= 3;
            const isCurrent = entry.teamId === currentTeamId;

            return (
              <tr
                key={entry.teamId}
                className={`transition-colors ${
                  isCurrent
                    ? 'bg-blue-600/15 border-l-4 border-l-cyan-400'
                    : 'hover:bg-slate-800/40'
                }`}
              >
                {/* Rank column */}
                <td className="py-3.5 px-4 text-center">
                  <div className="inline-flex items-center justify-center font-mono font-bold text-sm">
                    {entry.rank === 1 && (
                      <span className="w-7 h-7 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 flex items-center justify-center">
                        <Trophy className="w-3.5 h-3.5" />
                      </span>
                    )}
                    {entry.rank === 2 && (
                      <span className="w-7 h-7 rounded-full bg-slate-400/20 text-slate-200 border border-slate-400/40 flex items-center justify-center">
                        2
                      </span>
                    )}
                    {entry.rank === 3 && (
                      <span className="w-7 h-7 rounded-full bg-amber-700/20 text-amber-500 border border-amber-700/40 flex items-center justify-center">
                        3
                      </span>
                    )}
                    {!isTop3 && <span className="text-slate-400">#{entry.rank}</span>}
                  </div>
                </td>

                {/* Team & College */}
                <td className="py-3.5 px-4">
                  <div className="font-bold text-white flex items-center gap-2">
                    <span>{entry.teamName}</span>
                    {isCurrent && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 uppercase">
                        You
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400">{entry.college || 'Participant'}</div>
                </td>

                {/* Qualification Status */}
                <td className="py-3.5 px-4">
                  {entry.qualifiedRound1 ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Qualified
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      Eliminated
                    </span>
                  )}
                </td>

                {/* Checkpoint Progress */}
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-cyan-400 h-full rounded-full"
                        style={{
                          width: `${(entry.checkpointsCompleted / entry.totalCheckpoints) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs font-mono text-slate-300">
                      {entry.checkpointsCompleted}/{entry.totalCheckpoints}
                    </span>
                  </div>
                </td>

                {/* Breakdown columns */}
                <td className="py-3.5 px-4 text-center font-mono text-xs text-slate-300">
                  {entry.breakdown.quiz1Score}
                </td>
                <td className="py-3.5 px-4 text-center font-mono text-xs font-semibold text-cyan-400">
                  {entry.breakdown.checkpointScore}
                </td>
                <td className="py-3.5 px-4 text-center font-mono text-xs text-slate-300">
                  {entry.breakdown.quiz2Score}
                </td>
                <td className="py-3.5 px-4 text-center font-mono text-xs text-emerald-400">
                  +{entry.breakdown.miniGameScore}
                </td>

                {/* Total Score */}
                <td className="py-3.5 px-4 text-right">
                  <span className="font-mono font-extrabold text-base text-white px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/80">
                    {entry.totalScore}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
