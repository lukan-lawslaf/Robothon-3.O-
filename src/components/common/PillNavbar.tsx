import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Trophy, FileText, Flag, Shield, RotateCcw } from 'lucide-react';
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
  activeTab = 'checkpoints',
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
    <header className="w-full px-4 sm:px-6 pt-3 pb-2 z-40">
      <div
        className="max-w-7xl mx-auto rounded-2xl flex items-center justify-between px-4 sm:px-6 py-2 shadow-xl transition-all"
        style={{
          backgroundColor: '#130e0a',
          border: '1px solid #2e2318',
        }}
      >
        {/* Left: Club Emblem + Divider + ROBOTHON 3.0 */}
        <Link to="/team-dashboard" className="flex items-center gap-2 group shrink-0">
          <img
            src="/robotics_club_logo.svg"
            alt="Robotics Club"
            className="h-7 w-auto object-contain group-hover:scale-105 transition-transform"
          />
          <div className="h-4 w-px bg-stone-700/80 mx-1 hidden sm:block" />
          <div className="flex items-center">
            <span className="font-bold tracking-wider text-white text-sm">ROBOTHON</span>
            <span className="font-bold text-[#ea580c] text-sm ml-1">3.0</span>
          </div>
          <div className="h-4 w-px bg-stone-700/80 mx-2 hidden md:block" />
        </Link>

        {/* Center: Segmented Navigation Pills */}
        <nav className="flex items-center gap-1 sm:gap-2">
          {/* Checkpoints Tab */}
          <button
            onClick={() => {
              if (location.pathname !== '/team-dashboard') navigate('/team-dashboard');
              if (onTabChange) onTabChange('checkpoints');
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm transition-all flex items-center gap-1.5 ${
              isCurrent('/team-dashboard') && (!activeTab || activeTab === 'checkpoints')
                ? 'bg-[#fef4e8] border border-[#c27838] text-[#261e19] font-medium shadow-xs'
                : 'text-[#e7dfd5]/80 hover:text-white hover:bg-white/5 font-normal'
            }`}
          >
            <Flag
              className={`w-3.5 h-3.5 ${
                isCurrent('/team-dashboard') && (!activeTab || activeTab === 'checkpoints')
                  ? 'text-[#ea580c]'
                  : 'text-[#d97706]'
              }`}
            />
            <span>Checkpoints</span>
          </button>

          {/* Quizzes Tab */}
          <button
            onClick={() => {
              if (location.pathname !== '/team-dashboard') navigate('/team-dashboard');
              if (onTabChange) onTabChange('quizzes');
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm transition-all flex items-center gap-1.5 ${
              isCurrent('/team-dashboard') && activeTab === 'quizzes'
                ? 'bg-[#fef4e8] border border-[#c27838] text-[#261e19] font-medium shadow-xs'
                : 'text-[#e7dfd5]/80 hover:text-white hover:bg-white/5 font-normal'
            }`}
          >
            <FileText
              className={`w-3.5 h-3.5 ${
                isCurrent('/team-dashboard') && activeTab === 'quizzes'
                  ? 'text-[#ea580c]'
                  : 'text-[#d97706]'
              }`}
            />
            <span>Quizzes</span>
          </button>

          {/* Leaderboard Tab */}
          <button
            onClick={() => navigate('/leaderboard')}
            className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm transition-all flex items-center gap-1.5 ${
              isCurrent('/leaderboard')
                ? 'bg-[#fef4e8] border border-[#c27838] text-[#261e19] font-medium shadow-xs'
                : 'text-[#e7dfd5]/80 hover:text-white hover:bg-white/5 font-normal'
            }`}
          >
            <Trophy
              className={`w-3.5 h-3.5 ${
                isCurrent('/leaderboard') ? 'text-[#ea580c]' : 'text-[#d97706]'
              }`}
            />
            <span>Leaderboard</span>
          </button>

          {/* Admin Queue Tab (if admin role or quick access) */}
          {currentRole === 'admin' && (
            <button
              onClick={() => navigate('/admin-dashboard')}
              className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm transition-all flex items-center gap-1.5 ${
                isCurrent('/admin-dashboard')
                  ? 'bg-[#ea580c] text-white font-medium shadow-xs'
                  : 'text-[#d97706] hover:bg-[#ea580c]/20 font-normal'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Admin Queue</span>
            </button>
          )}
        </nav>

        {/* Right: Circular Profile / Role Switcher Avatar */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-8 h-8 rounded-full bg-[#20150e] border border-[#784e27] hover:border-[#ea580c] text-[#d97706] flex items-center justify-center font-mono text-xs font-bold transition-all shadow-xs"
            title="Profile & Role Switcher"
          >
            {currentRole === 'admin' ? 'A' : 'P'}
          </button>

          {menuOpen && (
            <div
              className="absolute right-0 mt-2 w-52 rounded-2xl shadow-2xl p-2 z-50 text-xs border"
              style={{
                backgroundColor: '#1c140e',
                borderColor: 'rgba(234, 88, 12, 0.25)',
              }}
            >
              <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-stone-400 border-b border-white/10">
                Switch Role / View
              </div>

              <button
                onClick={() => handleRoleSelect('participant')}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between ${
                  currentRole === 'participant'
                    ? 'bg-[#ea580c] text-white font-semibold'
                    : 'text-stone-300 hover:bg-white/5'
                }`}
              >
                <span>Participant View</span>
                {currentRole === 'participant' && <span>✓</span>}
              </button>

              <button
                onClick={() => handleRoleSelect('admin')}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between ${
                  currentRole === 'admin'
                    ? 'bg-[#ea580c] text-white font-semibold'
                    : 'text-stone-300 hover:bg-white/5'
                }`}
              >
                <span>Tech Team Admin</span>
                {currentRole === 'admin' && <span>✓</span>}
              </button>

              <button
                onClick={() => handleRoleSelect('public')}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between ${
                  currentRole === 'public'
                    ? 'bg-[#ea580c] text-white font-semibold'
                    : 'text-stone-300 hover:bg-white/5'
                }`}
              >
                <span>Public Leaderboard</span>
                {currentRole === 'public' && <span>✓</span>}
              </button>

              <div className="pt-1.5 mt-1 border-t border-white/10">
                <button
                  onClick={() => {
                    if (window.confirm('Reset all demo data to default?')) {
                      resetStoreToDefaults();
                      window.location.reload();
                    }
                  }}
                  className="w-full text-left px-3 py-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-white/5 flex items-center gap-1.5"
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
