import React, { useState } from 'react';
import { BrowserRouter, useLocation } from 'react-router-dom';
import { Navbar } from './components/common/Navbar';
import { AppRoutes } from './routes/AppRoutes';

const AppContent: React.FC = () => {
  const [currentRole, setCurrentRole] = useState<'participant' | 'admin' | 'public'>(
    (localStorage.getItem('robothon_user_role') as 'participant' | 'admin' | 'public') || 'participant'
  );
  const location = useLocation();

  const handleRoleChange = (role: 'participant' | 'admin' | 'public') => {
    setCurrentRole(role);
    localStorage.setItem('robothon_user_role', role);
  };

  const isLoginPage = location.pathname === '/login';

  return (
    <div className="min-h-screen bg-[#070d1e] text-slate-100 flex flex-col font-sans selection:bg-blue-500 selection:text-white">
      {!isLoginPage && (
        <Navbar
          currentRole={currentRole}
          setCurrentRole={handleRoleChange}
          teamName="AquaPulse Robotics"
        />
      )}

      <main className="flex-1">
        <AppRoutes
          currentRole={currentRole}
          setCurrentRole={handleRoleChange}
        />
      </main>

      {!isLoginPage && (
        <footer className="border-t border-slate-900 bg-slate-950/80 py-6 text-center text-xs text-slate-500">
          <p>© 2026 Robothon 3.O — Robotics Boat-Building Competition & Live Scoring Platform</p>
          <p className="mt-1 text-[11px] text-slate-600 font-mono">
            Modular Frontend Skeleton • Hand-off comments ready for Shubham & Ishan
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
