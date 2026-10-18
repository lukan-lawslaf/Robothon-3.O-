import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Anchor, Trophy, CheckSquare, HelpCircle, Shield, LogOut } from 'lucide-react';
import { UserRole } from '../../types/auth';

interface NavbarProps {
  currentRole?: UserRole;
  teamName?: string;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRole = 'participant',
  teamName = 'AquaPulse Robotics',
  onLogout,
}) => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-40 w-full bg-[#070d1e]/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-cyan-500 to-emerald-400 p-0.5 shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/40 transition-shadow">
              <div className="w-full h-full bg-[#070d1e] rounded-[10px] flex items-center justify-center">
                <Anchor className="w-5 h-5 text-cyan-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold tracking-tight text-white text-lg">ROBOTHON</span>
                <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  3.O
                </span>
              </div>
              <p className="text-[10px] font-medium tracking-wide text-slate-400 uppercase">
                Boat Building & Scoring
              </p>
            </div>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-1">
            {currentRole === 'participant' ? (
              <>
                <Link
                  to="/participant"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/participant')
                      ? 'bg-blue-600/20 text-cyan-400 border border-blue-500/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  Dashboard
                </Link>
                <Link
                  to="/participant/checkpoints"
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/participant/checkpoints')
                      ? 'bg-blue-600/20 text-cyan-400 border border-blue-500/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <CheckSquare className="w-4 h-4" />
                  Checkpoints
                </Link>
                <Link
                  to="/participant/quiz"
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/participant/quiz')
                      ? 'bg-blue-600/20 text-cyan-400 border border-blue-500/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <HelpCircle className="w-4 h-4" />
                  Quizzes
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/admin"
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/admin')
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  Admin Overview
                </Link>
                <Link
                  to="/admin/tickets"
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/admin/tickets')
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  Review Queue
                </Link>
                <Link
                  to="/admin/minigames"
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/admin/minigames')
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  Mini-Game Points
                </Link>
              </>
            )}

            {/* Public Live Leaderboard */}
            <Link
              to="/leaderboard"
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                isActive('/leaderboard')
                  ? 'bg-gradient-to-r from-amber-500/20 to-yellow-500/10 text-amber-300 border border-amber-500/40'
                  : 'text-amber-400/90 hover:text-amber-300 hover:bg-amber-500/10'
              }`}
            >
              <Trophy className="w-4 h-4 text-amber-400" />
              Live Leaderboard
            </Link>
          </div>

          {/* User profile / Logout */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-white">{teamName}</p>
              <p className="text-[10px] text-cyan-400 capitalize">{currentRole} Mode</p>
            </div>

            {onLogout && (
              <button
                onClick={onLogout}
                title="Logout"
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
