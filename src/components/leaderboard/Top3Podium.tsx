import React from 'react';
import { LeaderboardEntry } from '../../types/leaderboard';
import { Trophy, Award, Crown } from 'lucide-react';

interface Top3PodiumProps {
  top3: LeaderboardEntry[];
}

export const Top3Podium: React.FC<Top3PodiumProps> = ({ top3 }) => {
  const first = top3[0];
  const second = top3[1];
  const third = top3[2];

  if (!first) return null;

  return (
    <div className="flex flex-col md:flex-row items-end justify-center gap-4 my-8 px-4">
      {/* 2nd Place */}
      {second && (
        <div className="order-2 md:order-1 flex-1 max-w-xs w-full bg-slate-900/80 border border-slate-700/80 rounded-2xl p-5 text-center shadow-lg relative flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-slate-800 border-2 border-slate-400 flex items-center justify-center text-slate-300 font-extrabold text-lg mb-2 shadow-md">
            2
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Runner Up
          </span>
          <h4 className="text-base font-bold text-white mt-1 truncate max-w-[200px]" title={second.teamName}>
            {second.teamName}
          </h4>
          <p className="text-xs text-slate-400 truncate max-w-[180px]">{second.college}</p>

          <div className="mt-3 px-3 py-1 rounded-full bg-slate-800 text-slate-200 text-sm font-mono font-bold">
            {second.totalScore} pts
          </div>
        </div>
      )}

      {/* 1st Place (Champion) */}
      <div className="order-1 md:order-2 flex-1 max-w-sm w-full bg-gradient-to-b from-blue-900/40 via-slate-900 to-slate-950 border-2 border-cyan-400/80 rounded-3xl p-6 text-center shadow-2xl glow-cyan relative flex flex-col items-center -translate-y-2">
        <div className="absolute -top-5">
          <div className="p-2.5 rounded-full bg-amber-400/20 border border-amber-400 text-amber-300 shadow-lg shadow-amber-400/30">
            <Crown className="w-6 h-6" />
          </div>
        </div>
        <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-slate-950 font-black text-2xl mt-4 mb-2 shadow-lg shadow-cyan-500/40">
          <Trophy className="w-8 h-8 text-white" />
        </div>
        <span className="text-xs font-bold uppercase tracking-widest text-cyan-400">
          Event Leader
        </span>
        <h3 className="text-lg font-extrabold text-white mt-1 truncate max-w-[220px]" title={first.teamName}>
          {first.teamName}
        </h3>
        <p className="text-xs text-slate-300 truncate max-w-[200px]">{first.college}</p>

        <div className="mt-4 px-4 py-1.5 rounded-full bg-cyan-500/20 border border-cyan-400 text-cyan-300 text-base font-mono font-black">
          {first.totalScore} pts
        </div>
        <span className="text-[11px] text-slate-400 mt-1.5 font-mono">
          {first.checkpointsCompleted} / {first.totalCheckpoints} Checkpoints Cleared
        </span>
      </div>

      {/* 3rd Place */}
      {third && (
        <div className="order-3 flex-1 max-w-xs w-full bg-slate-900/80 border border-amber-700/50 rounded-2xl p-5 text-center shadow-lg relative flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-slate-800 border-2 border-amber-600 flex items-center justify-center text-amber-500 font-extrabold text-lg mb-2 shadow-md">
            3
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500">
            3rd Place
          </span>
          <h4 className="text-base font-bold text-white mt-1 truncate max-w-[200px]" title={third.teamName}>
            {third.teamName}
          </h4>
          <p className="text-xs text-slate-400 truncate max-w-[180px]">{third.college}</p>

          <div className="mt-3 px-3 py-1 rounded-full bg-slate-800 text-amber-300 text-sm font-mono font-bold">
            {third.totalScore} pts
          </div>
        </div>
      )}
    </div>
  );
};
