import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Public Views
import { LoginPage } from '../pages/public/LoginPage';
import { LiveLeaderboardPage } from '../pages/public/LiveLeaderboardPage';

// Participant Views
import { ParticipantDashboard } from '../pages/participant/Dashboard';

// Admin Views
import { AdminDashboard } from '../pages/admin/AdminDashboard';

interface AppRoutesProps {
  currentRole: 'participant' | 'admin' | 'public';
  setCurrentRole: (role: 'participant' | 'admin' | 'public') => void;
}

export const AppRoutes: React.FC<AppRoutesProps> = ({ currentRole, setCurrentRole }) => {
  return (
    <Routes>
      {/* 1. Dual Login Screen */}
      <Route
        path="/login"
        element={<LoginPage onLoginSuccess={(role) => setCurrentRole(role)} />}
      />

      {/* 2. Live Leaderboard Page */}
      <Route path="/leaderboard" element={<LiveLeaderboardPage />} />

      {/* 3. Participant Dashboard */}
      <Route path="/team-dashboard" element={<ParticipantDashboard />} />

      {/* 4. Tech Team Admin Portal */}
      <Route path="/admin-dashboard" element={<AdminDashboard />} />

      {/* Default Redirection */}
      <Route
        path="/"
        element={
          currentRole === 'admin' ? (
            <Navigate to="/admin-dashboard" replace />
          ) : currentRole === 'participant' ? (
            <Navigate to="/team-dashboard" replace />
          ) : (
            <Navigate to="/leaderboard" replace />
          )
        }
      />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/leaderboard" replace />} />
    </Routes>
  );
};
