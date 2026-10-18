import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Trophy, HelpCircle, CheckSquare, Shield, RotateCcw, ChevronDown } from 'lucide-react';
import { resetStoreToDefaults } from '../../services/stateStore';

interface PillNavbarProps {
  currentRole: 'participant' | 'admin' | 'public';
  setCurrentRole: (role: 'participant' | 'admin' | 'public') => void;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export const PillNavbar: React.FC<PillNavbarProps> = ({
  currentRole,
  setCurrentRole,
  activeTab,
  onTabChange,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleRoleSelect = (role: 'participant' | 'admin' | 'public') => {
    setCurrentRole(role);
    setMenuOpen(false);
    if (role === 'participant') navigate('/team-dashboard');
    else if (role === 'admin') navigate('/admin-dashboard');
    else navigate('/leaderboard');
  };

  const isCurrent = (path: string) => location.pathname === path;

  return (
    <header className="w-full px-4 sm:px-6 pt-4 pb-2 z-40">
      <div
        className="max-w-7xl mx-auto rounded-full flex items-center justify-between px-4 sm:px-6 py-2.5 shadow-2xl backdrop-blur-md transition-all"
        style={{
          backgroundColor: 'rgba(42, 26, 14, 0.92)',
          border: '1.5px solid rgba(254, 243, 226, 0.16)',
        }}
      >
        {/* Left: Geometric Monogram Icon (N / Robothon) */}
        <Link to="/team-dashboard" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-full bg-[#D4621A] flex items-center justify-center text-[#FEF3E2] font-mono font-bold text-sm shadow-md transition-transform group-hover:scale-105">
            N
          </div>
          <div className="hidden sm:block">
            <span className="font-normal tracking-tight text-white text-sm">ROBOTHON</span>
            <span className="text-[10px] text-[#F4AE52] font-mono ml-1">3.0</span>
          </div>
        </Link>

        {/* Center: Pill Navigation Buttons */}
        <nav className="flex items-center gap-1 sm:gap-2">
          {/* Bot & Checkpoints */}
          <button
            onClick={() => {
              if (location.pathname !== '/team-dashboard') navigate('/team-dashboard');
              if (onTabChange) onTabChange('checkpoints');
            }}
            className={`px-3 sm:px-4 py-1.5 rounded-xl text-xs sm:text-sm font-normal transition-all flex items-center gap-1.5 ${
              isCurrent('/team-dashboard') && (!activeTab || activeTab === 'checkpoints')
                ? 'bg-[#FEF3E2] text-[#2A1A0E] shadow-sm font-medium'
                : 'text-[#FEF3E2]/70 hover:text-[#FEF3E2] hover:bg-white/5'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5 text-[#D4621A]" />
            <span>Checkpoints</span>
          </button>

          {/* Quizzes */}
          <button
            onClick={() => {
              if (location.pathname !== '/team-dashboard') navigate('/team-dashboard');
              if (onTabChange) onTabChange('quizzes');
            }}
            className={`px-3 sm:px-4 py-1.5 rounded-xl text-xs sm:text-sm font-normal transition-all flex items-center gap-1.5 ${
              isCurrent('/team-dashboard') && activeTab === 'quizzes'
                ? 'bg-[#FEF3E2] text-[#2A1A0E] shadow-sm font-medium'
                : 'text-[#FEF3E2]/70 hover:text-[#FEF3E2] hover:bg-white/5'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5 text-[#F4AE52]" />
            <span>Quizzes</span>
          </button>

          {/* Live Leaderboard */}
          <button
            onClick={() => navigate('/leaderboard')}
            className={`px-3 sm:px-4 py-1.5 rounded-xl text-xs sm:text-sm font-normal transition-all flex items-center gap-1.5 ${
              isCurrent('/leaderboard')
                ? 'bg-[#FEF3E2] text-[#2A1A0E] shadow-sm font-medium'
                : 'text-[#FEF3E2]/70 hover:text-[#FEF3E2] hover:bg-white/5'
            }`}
          >
            <Trophy className="w-3.5 h-3.5 text-[#F4AE52]" />
            <span>Leaderboard</span>
          </button>

          {/* Admin Queue Tab (if admin role or quick access) */}
          {currentRole === 'admin' && (
            <button
              onClick={() => navigate('/admin-dashboard')}
              className={`px-3 sm:px-4 py-1.5 rounded-xl text-xs sm:text-sm font-normal transition-all flex items-center gap-1.5 ${
                isCurrent('/admin-dashboard')
                  ? 'bg-[#D4621A] text-[#FEF3E2] shadow-sm'
                  : 'text-[#F4AE52] hover:bg-[#D4621A]/20'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Admin Queue</span>
            </button>
          )}
        </nav>

        {/* Right: Circular Profile / Role-Switcher Avatar */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-9 h-9 rounded-full bg-[#3D2414] border border-[#F4AE52]/40 text-[#F4AE52] flex items-center justify-center font-mono text-xs font-bold shadow-md hover:border-[#F4AE52] transition-colors"
            title="Profile & Role Switcher"
          >
            {currentRole === 'admin' ? 'A' : 'P'}
          </button>

          {menuOpen && (
            <div
              className="absolute right-0 mt-2 w-52 rounded-2xl shadow-2xl p-2 z-50 text-xs border"
              style={{
                backgroundColor: '#2A1A0E',
                borderColor: 'rgba(254, 243, 226, 0.16)',
              }}
            >
              <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-[#8C7360] border-b border-white/10">
                Current Role Switcher
              </div>

              <button
                onClick={() => handleRoleSelect('participant')}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between ${
                  currentRole === 'participant' ? 'bg-[#D4621A] text-[#FEF3E2]' : 'text-slate-300 hover:bg-white/5'
                }`}
              >
                <span>Participant View</span>
                {currentRole === 'participant' && <span>✓</span>}
              </button>

              <button
                onClick={() => handleRoleSelect('admin')}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between ${
                  currentRole === 'admin' ? 'bg-[#D4621A] text-[#FEF3E2]' : 'text-slate-300 hover:bg-white/5'
                }`}
              >
                <span>Tech Team Admin</span>
                {currentRole === 'admin' && <span>✓</span>}
              </button>

              <button
                onClick={() => handleRoleSelect('public')}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between ${
                  currentRole === 'public' ? 'bg-[#D4621A] text-[#FEF3E2]' : 'text-slate-300 hover:bg-white/5'
                }`}
              >
                <span>Public Leaderboard</span>
                {currentRole === 'public' && <span>✓</span>}
              </button>

              <div className="pt-1.5 mt-1 border-t border-white/10">
                <button
                  onClick={() => {
                    if (window.confirm('Reset all demo data?')) {
                      resetStoreToDefaults();
                      window.location.reload();
                    }
                  }}
                  className="w-full text-left px-3 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Demo State</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
