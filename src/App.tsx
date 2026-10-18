import React, { useState, useEffect } from 'react';
import { BrowserRouter, useLocation } from 'react-router-dom';
import { PillNavbar } from './components/common/PillNavbar';
import { BaselineFooter } from './components/common/BaselineFooter';
import { AppRoutes } from './routes/AppRoutes';
import { SubsystemKey } from './components/bot/Bot3DViewer';
import { getStoredTeams } from './services/stateStore';
import { MockTeam } from './mockData';

const AppContent: React.FC = () => {
  const [currentRole, setCurrentRole] = useState<'participant' | 'admin' | 'public'>(
    (localStorage.getItem('robothon_user_role') as 'participant' | 'admin' | 'public') || 'participant'
  );
  const [activeTab, setActiveTab] = useState<string>('checkpoints');
  const [activeSubsystem, setActiveSubsystem] = useState<SubsystemKey>('chassis');
  const [team, setTeam] = useState<MockTeam | null>(null);

  const location = useLocation();

  const loadTeam = () => {
    const teams = getStoredTeams();
    if (teams.length > 0) setTeam(teams[0]);
  };

  useEffect(() => {
    loadTeam();
    window.addEventListener('robothon_store_updated', loadTeam);
    return () => window.removeEventListener('robothon_store_updated', loadTeam);
  }, []);

  const handleRoleChange = (role: 'participant' | 'admin' | 'public') => {
    setCurrentRole(role);
    localStorage.setItem('robothon_user_role', role);
  };

  // Determine if full-screen mode (splash or login)
  const isFullScreenView = location.pathname === '/' || location.pathname === '/splash' || location.pathname === '/login';

  return (
    <div
      className={`min-h-screen ${
        isFullScreenView ? 'bg-[#0e0a07] text-white' : 'bg-[#FEF3E2] text-[#251306]'
      } flex flex-col font-sans selection:bg-[#D4621A] selection:text-[#FEF3E2]`}
    >
      {!isFullScreenView && (
        <PillNavbar
          currentRole={currentRole}
          setCurrentRole={handleRoleChange}
          activeTab={activeTab}
          onTabChange={(t) => setActiveTab(t)}
        />
      )}

      <main className="flex-1 flex flex-col">
        <AppRoutes
          currentRole={currentRole}
          setCurrentRole={handleRoleChange}
          activeTab={activeTab}
          onTabChange={(t) => setActiveTab(t)}
          onSelectSubsystem={(sub) => setActiveSubsystem(sub)}
        />
      </main>

      {!isFullScreenView && (
        <BaselineFooter
          team={team}
          activeSubsystem={activeSubsystem}
        />
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
