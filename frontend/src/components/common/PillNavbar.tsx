import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Trophy, FileText, Flag, Shield, LogOut, Radio, Users, Boxes, Zap } from 'lucide-react';
import { useAccount, isAdmin, logout } from '../../services/authService';

interface Props {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export const PillNavbar: React.FC<Props> = ({ activeTab, onTabChange }) => {
  const account = useAccount();
  const navigate = useNavigate();
  const location = useLocation();
  const [leaving, setLeaving] = useState(false);

  const tab = (value: string) => {
    if (onTabChange) onTabChange(value);
    else navigate('/team-dashboard?tab=' + value);
  };

  const buttonClass = (active: boolean) =>
    `px-3 py-2 rounded-xl text-xs sm:text-sm flex items-center gap-2 transition-colors cursor-pointer ${
      active ? 'bg-[#fef4e8] text-[#261e19] font-bold shadow-sm' : 'text-stone-200 hover:bg-white/10'
    }`;

  return (
    <header className="bg-[#1c140e] px-4 sm:px-6 py-3 text-white border-b border-white/10">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        <Link
          to={account ? (isAdmin(account) ? '/admin-dashboard' : '/team-dashboard') : '/login'}
          className="flex items-center gap-3"
        >
          <img src="/robotics_club_logo.svg" alt="Robotics Club" className="h-8 w-8 object-contain" />
          <strong className="tracking-tight text-white">
            ROBOTHON <span className="text-[#ea580c]">3.0</span>
          </strong>
        </Link>

        <nav className="flex flex-wrap items-center gap-2" aria-label="Main navigation">
          {account && !isAdmin(account) && (
            <>
              <button
                className={buttonClass(location.pathname === '/team-dashboard' && activeTab === 'checkpoints')}
                onClick={() => tab('checkpoints')}
              >
                <Flag size={16} />
                <span>Checkpoints</span>
              </button>

              <Link
                className={buttonClass(location.pathname.startsWith('/team/quiz'))}
                to="/team/quiz"
              >
                <Radio size={16} className="text-[#ea580c]" />
                <span>Quiz Arena</span>
              </Link>
            </>
          )}

          {isAdmin(account) && (
            <>
              <Link
                className={buttonClass(location.pathname === '/admin-dashboard')}
                to="/admin-dashboard"
              >
                <Shield size={16} />
                <span>{account?.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin'}</span>
              </Link>

                            {account?.role === 'SUPER_ADMIN' && (
                <Link
                  className={buttonClass(location.pathname === '/admin/registrations')}
                  to="/admin/registrations"
                >
                  <Users size={16} />
                  <span>Registrations</span>
                </Link>
              )}
              {account?.role === 'SUPER_ADMIN' && (
                <Link
                  className={buttonClass(location.pathname.startsWith('/admin/quizzes'))}
                  to="/admin/quizzes"
                >
                  <FileText size={16} />
                  <span>Quiz Ops</span>
                </Link>
              )}
              {isAdmin(account) && (
                <Link
                  className={buttonClass(location.pathname === '/admin/inventory')}
                  to="/admin/inventory"
                >
                  <Boxes size={16} />
                  <span>Inventory</span>
                </Link>
              )}
              {isAdmin(account) && (
                <Link
                  className={buttonClass(location.pathname.startsWith('/admin/quizzes/leaderboard'))}
                  to="/admin/quizzes/leaderboard/quiz-1"
                >
                  <Zap size={16} className="text-[#ea580c]" />
                  <span>Quiz Boards</span>
                </Link>
              )}
            </>
          )}

          <Link
            className={buttonClass(location.pathname === '/leaderboard')}
            to="/leaderboard"
          >
            <Trophy size={16} />
            <span>Leaderboard</span>
          </Link>
        </nav>

        {account ? (
          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="text-stone-300 hidden sm:inline">{account.name}</span>
            <button
              disabled={leaving}
              className="flex items-center gap-1.5 text-orange-400 hover:text-orange-300 transition-colors disabled:opacity-50 cursor-pointer"
              onClick={async () => {
                setLeaving(true);
                try {
                  await logout();
                  navigate('/login');
                } finally {
                  setLeaving(false);
                }
              }}
            >
              <LogOut size={14} />
              <span>Sign out</span>
            </button>
          </div>
        ) : (
          <Link
            to="/login"
            className="px-4 py-1.5 rounded-xl bg-[#ea580c] hover:bg-[#d4621a] text-white text-xs font-mono font-bold transition-all shadow-sm"
          >
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
};
