import React from 'react';
import { MockTeam } from '../../mockData';
import { SubsystemKey, SUBSYSTEMS_DATA } from '../bot/Bot3DViewer';
import { ShieldCheck, XCircle } from 'lucide-react';

interface BaselineFooterProps {
  team: MockTeam | null;
  activeSubsystem?: SubsystemKey | null;
  admin?: boolean;
}

export const BaselineFooter: React.FC<BaselineFooterProps> = ({ team, activeSubsystem, admin = false }) => {
  const subsystemInfo = activeSubsystem ? SUBSYSTEMS_DATA[activeSubsystem] : null;

  return (
    <footer
      className="w-full px-6 py-3 border-t flex flex-col md:flex-row items-center justify-between gap-3 text-xs z-30 transition-all"
      style={{
        backgroundColor: '#251306',
        borderColor: 'rgba(244, 174, 82, 0.3)',
        color: '#FEF3E2',
        fontFamily: '"Space Grotesk", sans-serif',
      }}
    >
      {/* Left: Hardware Telemetry and active subsystem summary */}
      <div className="flex items-center gap-3">
        <span className="font-mono text-[11px] text-[#F4AE52] uppercase tracking-wider font-semibold">
          ROBOTHON 3.0 — {admin ? 'Administration' : 'Telemetry'}
        </span>
        <span className="hidden sm:inline text-white/30">•</span>
        <p className="text-xs text-[#FEF3E2]/75 truncate max-w-md">
          {admin ? 'Team operations · Checkpoint reviews · Competition scoring' : subsystemInfo
            ? `${subsystemInfo.name}: ${subsystemInfo.desc}`
            : 'Interactive 3D Chassis & Avionics Active. Select a milestone or hotspot to inspect.'}
        </p>
      </div>

      {/* Right: Live Team Scoring Formula & Status */}
      {team && (
        <div className="flex items-center gap-4 text-xs font-mono shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[#8C7360] uppercase text-[10px]">Rank:</span>
            <span className="text-[#F4AE52] font-bold">#{team.rank}</span>
          </div>

          <div className="hidden sm:flex items-center gap-1">
            <span className="text-white/40">CP({team.checkpointPoints}) + Quiz({team.quizPoints}) + Mini({team.miniGamePoints}) =</span>
            <span className="px-2 py-0.5 rounded bg-[#D4621A] text-[#FEF3E2] font-bold">
              {team.totalPoints} pts
            </span>
          </div>

          <div>
            {team.isQualified ? (
              <span className="inline-flex items-center gap-1 text-[11px] text-[#F4AE52]">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Top 50 Qualified</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] text-red-400">
                <XCircle className="w-3.5 h-3.5" />
                <span>{team.qualificationStatus === 'PENDING' ? 'Qualification pending' : 'Eliminated'}</span>
              </span>
            )}
          </div>
        </div>
      )}
    </footer>
  );
};
