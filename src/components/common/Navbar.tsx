import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { resetStoreToDefaults } from '../../services/stateStore';
import {
  Trophy,
  Users,
  ShieldCheck,
  ChevronDown,
  RotateCcw,
  LogOut,
  Anchor,
} from 'lucide-react';

interface NavbarProps {
  currentRole: 'participant' | 'admin' | 'public';
  setCurrentRole: (role: 'participant' | 'admin' | 'public') => void;
  teamName?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRole,
  setCurrentRole,
  teamName = 'AquaPulse Robotics',
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleRoleSelect = (role: 'participant' | 'admin' | 'public') => {
    setCurrentRole(role);
    setDropdownOpen(false);
    if (role === 'participant') {
      navigate('/team-dashboard');
    } else if (role === 'admin') {
      navigate('/admin-dashboard');
    } else {
      navigate('/leaderboard');
    }
  };

  const handleReset = () => {
    if (window.confirm('Reset all demo data (teams, checkpoints, tickets) to default?')) {
      resetStoreToDefaults();
      window.location.reload();
    }
  };

  const isCurrent = (path: string) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 bg-slate-900 border-b border-slate-800 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Platform Name */}
          <Link to="/leaderboard" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Anchor className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-white tracking-tight text-base sm:text-lg">
                  ROBOTHON
                </span>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  3.O
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden sm:block">
                Event Management & Live Scoring
              </p>
            </div>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-1">
            <Link
              to="/leaderboard"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isCurrent('/leaderboard')
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Trophy className="w-4 h-4 text-amber-400" />
              Live Leaderboard
            </Link>

            <Link
              to="/team-dashboard"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isCurrent('/team-dashboard')
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Users className="w-4 h-4 text-cyan-400" />
              Participant Portal
            </Link>

            <Link
              to="/admin-dashboard"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isCurrent('/admin-dashboard')
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              Admin Portal
            </Link>
          </div>

          {/* Right Action Bar: Dev Role Switcher & Reset */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Dev Role Switcher Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-medium text-slate-200 hover:bg-slate-700 transition-colors shadow-sm"
              >
                <span className="text-[10px] uppercase font-bold text-slate-400">Role:</span>
                <span className="font-semibold text-white capitalize">
                  {currentRole === 'participant' ? 'Participant' : currentRole === 'admin' ? 'Tech Admin' : 'Public'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl bg-slate-800 border border-slate-700 shadow-2xl py-1.5 z-50">
                  <div className="px-3 py-1.5 border-b border-slate-700/80 text-[10px] uppercase font-bold text-slate-400">
                    Quick Dev Role Switcher
                  </div>

                  <button
                    onClick={() => handleRoleSelect('public')}
                    className="w-full text-left px-3.5 py-2 text-xs text-slate-200 hover:bg-slate-700 flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2">
                      <Trophy className="w-3.5 h-3.5 text-amber-400" />
                      Public Leaderboard
                    </span>
                    {currentRole === 'public' && <span className="text-blue-400 font-bold">✓</span>}
                  </button>

                  <button
                    onClick={() => handleRoleSelect('participant')}
                    className="w-full text-left px-3.5 py-2 text-xs text-slate-200 hover:bg-slate-700 flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-cyan-400" />
                      Participant (AquaPulse)
                    </span>
                    {currentRole === 'participant' && <span className="text-blue-400 font-bold">✓</span>}
                  </button>

                  <button
                    onClick={() => handleRoleSelect('admin')}
                    className="w-full text-left px-3.5 py-2 text-xs text-slate-200 hover:bg-slate-700 flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2">
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                      Tech Team Admin
                    </span>
                    {currentRole === 'admin' && <span className="text-blue-400 font-bold">✓</span>}
                  </button>
                </div>
              )}
            </div>

            {/* Reset Data Helper */}
            <button
              onClick={handleReset}
              title="Reset state to initial mock data"
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Login / Switch Button */}
            <Link
              to="/login"
              title="Go to Dual Login"
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};
