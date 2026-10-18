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
  Cpu,
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
    <nav className="sticky top-0 z-50 bg-[#FEF3E2]/95 backdrop-blur-md border-b border-[#F4AE52]/30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Platform Name */}
          <Link to="/leaderboard" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-[#251306] flex items-center justify-center text-[#FEF3E2] shadow-md border border-[#F4AE52]/40 group-hover:scale-105 transition-transform">
              <Cpu className="w-5 h-5 text-[#F4AE52]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-[#251306] tracking-tight text-base sm:text-lg">
                  ROBOTHON
                </span>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-[#D4621A] text-[#FEF3E2]">
                  3.O
                </span>
              </div>
              <p className="text-[10px] font-mono text-[#251306]/60 hidden sm:block">
                Hardware Engineering & Live Scoring
              </p>
            </div>
          </Link>

          {/* Navigation Pill Links (Espresso & Cream Styling) */}
          <div className="hidden md:flex items-center gap-1.5 bg-[#251306] p-1 rounded-full border border-[#F4AE52]/40 shadow-inner">
            <Link
              to="/team-dashboard"
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                isCurrent('/team-dashboard')
                  ? 'bg-[#D4621A] text-[#FEF3E2] shadow-md font-semibold'
                  : 'text-[#FEF3E2]/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-[#F4AE52]" />
              Participant Portal
            </Link>

            <Link
              to="/leaderboard"
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                isCurrent('/leaderboard')
                  ? 'bg-[#D4621A] text-[#FEF3E2] shadow-md font-semibold'
                  : 'text-[#FEF3E2]/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <Trophy className="w-3.5 h-3.5 text-[#F4AE52]" />
              Leaderboard
            </Link>

            <Link
              to="/admin-dashboard"
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                isCurrent('/admin-dashboard')
                  ? 'bg-[#D4621A] text-[#FEF3E2] shadow-md font-semibold'
                  : 'text-[#FEF3E2]/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#F4AE52]" />
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
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/80 border border-[#F4AE52]/50 text-xs font-medium text-[#251306] hover:bg-white transition-colors shadow-sm"
              >
                <span className="text-[10px] uppercase font-mono font-bold text-[#251306]/50">Role:</span>
                <span className="font-semibold capitalize text-[#D4621A]">
                  {currentRole === 'participant' ? 'Participant' : currentRole === 'admin' ? 'Tech Admin' : 'Public'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-[#251306]/50" />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl bg-[#251306] border border-[#F4AE52]/40 shadow-2xl py-1.5 z-50 text-[#FEF3E2]">
                  <div className="px-3.5 py-1.5 border-b border-white/10 text-[10px] uppercase font-mono font-bold text-[#F4AE52]">
                    Quick Dev Role Switcher
                  </div>

                  <button
                    onClick={() => handleRoleSelect('participant')}
                    className="w-full text-left px-3.5 py-2 text-xs hover:bg-white/10 flex items-center justify-between transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-[#F4AE52]" />
                      Participant (AquaPulse)
                    </span>
                    {currentRole === 'participant' && <span className="text-[#D4621A] font-bold">✓</span>}
                  </button>

                  <button
                    onClick={() => handleRoleSelect('public')}
                    className="w-full text-left px-3.5 py-2 text-xs hover:bg-white/10 flex items-center justify-between transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Trophy className="w-3.5 h-3.5 text-[#F4AE52]" />
                      Public Leaderboard
                    </span>
                    {currentRole === 'public' && <span className="text-[#D4621A] font-bold">✓</span>}
                  </button>

                  <button
                    onClick={() => handleRoleSelect('admin')}
                    className="w-full text-left px-3.5 py-2 text-xs hover:bg-white/10 flex items-center justify-between transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#F4AE52]" />
                      Tech Team Admin
                    </span>
                    {currentRole === 'admin' && <span className="text-[#D4621A] font-bold">✓</span>}
                  </button>
                </div>
              )}
            </div>

            {/* Reset Data Helper */}
            <button
              onClick={handleReset}
              title="Reset state to initial mock data"
              className="p-2 rounded-xl text-[#251306]/70 hover:text-[#D4621A] hover:bg-white/60 border border-transparent hover:border-[#F4AE52]/40 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Login / Switch Button */}
            <Link
              to="/login"
              title="Go to Dual Login"
              className="p-2 rounded-xl text-[#251306]/70 hover:text-[#D4621A] hover:bg-white/60 border border-transparent hover:border-[#F4AE52]/40 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};
