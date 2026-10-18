import React from 'react';
import { ShieldCheck, ShieldAlert, Clock } from 'lucide-react';
import { QualificationStatus } from '../../types/quiz';

interface QualificationBannerProps {
  status: QualificationStatus;
  rank?: number;
  totalTeams?: number;
}

export const QualificationBanner: React.FC<QualificationBannerProps> = ({
  status,
  rank,
  totalTeams = 100,
}) => {
  if (status === 'qualified') {
    return (
      <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-cyan-950/60 border border-emerald-500/40 shadow-lg shadow-emerald-500/10 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white uppercase tracking-wide">
                Round 2 Qualified: Top 50 Finalist
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 uppercase">
                Active
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Congratulations! Your team cleared Round 1 Elimination. All Boat-Building Checkpoints are now unlocked.
            </p>
          </div>
        </div>

        {rank && (
          <div className="text-right px-3 py-1.5 rounded-xl bg-slate-950/50 border border-emerald-500/30">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Current Standing</span>
            <p className="text-base font-extrabold text-emerald-400 font-mono">
              #{rank} <span className="text-xs font-normal text-slate-400">/ {totalTeams}</span>
            </p>
          </div>
        )}
      </div>
    );
  }

  if (status === 'disqualified') {
    return (
      <div className="p-4 rounded-2xl bg-gradient-to-r from-red-950/60 via-slate-900 to-slate-950 border border-red-500/40 shadow-lg shadow-red-500/10 flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <div>
          <span className="text-sm font-bold text-red-400 uppercase tracking-wide">
            Eliminated in Round 1
          </span>
          <p className="text-xs text-slate-300 mt-0.5">
            Your team did not make the Top 50 cutoff for Round 2. Checkpoint review requests are locked. You can still view live leaderboard and event stats.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/60 via-slate-900 to-slate-950 border border-blue-500/30 flex items-center gap-3">
      <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
        <Clock className="w-6 h-6 animate-spin" />
      </div>
      <div>
        <span className="text-sm font-bold text-white uppercase tracking-wide">
          Round 1 Elimination Quiz In Progress
        </span>
        <p className="text-xs text-slate-300 mt-0.5">
          Submit your Round 1 Quiz to secure your spot among the Top 50 teams advancing to hardware checkpoints.
        </p>
      </div>
    </div>
  );
};
