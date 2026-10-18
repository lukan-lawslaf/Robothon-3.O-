import React, { useState } from 'react';
import { BrowserRouter, useNavigate, useLocation } from 'react-router-dom';
import { UserRole } from './types/auth';
import { Navbar } from './components/common/Navbar';
import { AppRoutes } from './routes/AppRoutes';
import { MOCK_CURRENT_TEAM } from './mockData/teams.mock';

const AppContent: React.FC = () => {
  const [currentRole, setCurrentRole] = useState<UserRole>(
    (localStorage.getItem('robothon_user_role') as UserRole) || 'participant'
  );
  const location = useLocation();
  const navigate = useNavigate();

  const handleRoleToggle = (newRole: UserRole) => {
    setCurrentRole(newRole);
    localStorage.setItem('robothon_user_role', newRole);
    navigate(newRole === 'admin' ? '/admin' : '/participant');
  };

  const handleLogout = () => {
    localStorage.removeItem('robothon_auth_token');
    navigate('/login');
  };

  const isLoginPage = location.pathname === '/login';

  return (
    <div className="min-h-screen bg-[#070d1e] text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      {!isLoginPage && (
        <Navbar
          currentRole={currentRole}
          teamName={currentRole === 'participant' ? MOCK_CURRENT_TEAM.teamName : 'Tech Team Admin'}
          onLogout={handleLogout}
        />
      )}

      {/* Floating Role Quick Switcher for Rapid Testing */}
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-900/90 border border-slate-700 shadow-2xl backdrop-blur-md">
        <span className="text-[10px] font-mono text-slate-400 uppercase px-2 font-bold">
          Demo Switch:
        </span>
        <button
          onClick={() => handleRoleToggle('participant')}
          className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
            currentRole === 'participant'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Participant
        </button>
        <button
          onClick={() => handleRoleToggle('admin')}
          className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
            currentRole === 'admin'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Admin
        </button>
      </div>

      <main className="flex-1">
        <AppRoutes
          currentRole={currentRole}
          onLoginSuccess={(role) => setCurrentRole(role)}
        />
      </main>

      {!isLoginPage && (
        <footer className="border-t border-slate-900/80 bg-slate-950/60 py-6 text-center text-xs text-slate-500">
          <p>© 2026 Robothon 3.O — Robotics Boat-Building Competition & Live Scoring Platform</p>
          <p className="mt-1 text-[11px] text-slate-600 font-mono">
            Decoupled Architecture • Developed by Nakul (Frontend) • Backend by Shubham & Ishan
          </p>
        </footer>
      )}
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
};

export default App;
