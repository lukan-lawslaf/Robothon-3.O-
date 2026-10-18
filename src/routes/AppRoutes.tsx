import React from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';

// Views
import { MechanicalHelmetSplash } from '../components/splash/MechanicalHelmetSplash';
import { LoginPage } from '../pages/public/LoginPage';
import { LiveLeaderboardPage } from '../pages/public/LiveLeaderboardPage';
import { ParticipantDashboard } from '../pages/participant/Dashboard';
import { AdminDashboard } from '../pages/admin/AdminDashboard';
import { SubsystemKey } from '../components/bot/Bot3DViewer';

interface AppRoutesProps {
  currentRole: 'participant' | 'admin' | 'public';
  setCurrentRole: (role: 'participant' | 'admin' | 'public') => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onSelectSubsystem: (sub: SubsystemKey) => void;
}

export const AppRoutes: React.FC<AppRoutesProps> = ({
  currentRole,
  setCurrentRole,
  activeTab,
  onTabChange,
  onSelectSubsystem,
}) => {
  const navigate = useNavigate();

  return (
    <Routes>
      {/* 1. Mechanical Helmet Splash Pre-loader */}
      <Route
        path="/splash"
        element={<MechanicalHelmetSplash onEnter={() => navigate('/login')} />}
      />

      {/* 2. Dual Login Screen ("Human Meets Machine") */}
      <Route
        path="/login"
        element={
          <LoginPage
            onLoginSuccess={(role) => {
              setCurrentRole(role);
            }}
          />
        }
      />

      {/* 3. Live Leaderboard Page */}
      <Route path="/leaderboard" element={<LiveLeaderboardPage />} />

      {/* 4. Participant Dashboard (Circular 3D Bot + Stacked Pill Cards) */}
      <Route
        path="/team-dashboard"
        element={
          <ParticipantDashboard
            activeTab={activeTab}
            onTabChange={onTabChange}
            onSelectSubsystem={onSelectSubsystem}
          />
        }
      />

      {/* 5. Tech Team Admin Portal (Inspection Target + Review Queue) */}
      <Route path="/admin-dashboard" element={<AdminDashboard />} />

      {/* Default route redirect to splash on first visit, or dashboard */}
      <Route path="/" element={<MechanicalHelmetSplash onEnter={() => navigate('/login')} />} />

      {/* Catch-all fallback */}
      <Route path="*" element={<Navigate to="/team-dashboard" replace />} />
    </Routes>
  );
};
