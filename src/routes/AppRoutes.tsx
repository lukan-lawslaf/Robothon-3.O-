import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { UserRole } from '../types/auth';

// Public Pages
import { LoginPage } from '../pages/public/LoginPage';
import { LiveLeaderboardPage } from '../pages/public/LiveLeaderboardPage';

// Participant Pages
import { ParticipantDashboard } from '../pages/participant/Dashboard';
import { CheckpointsPage } from '../pages/participant/CheckpointsPage';
import { QuizPage } from '../pages/participant/QuizPage';

// Admin Pages
import { AdminDashboard } from '../pages/admin/AdminDashboard';
import { TicketQueuePage } from '../pages/admin/TicketQueuePage';
import { MiniGamesPage } from '../pages/admin/MiniGamesPage';

interface AppRoutesProps {
  currentRole: UserRole;
  onLoginSuccess: (role: UserRole) => void;
}

export const AppRoutes: React.FC<AppRoutesProps> = ({ currentRole, onLoginSuccess }) => {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage onLoginSuccess={onLoginSuccess} />} />
      <Route path="/leaderboard" element={<LiveLeaderboardPage />} />

      {/* Participant Routes */}
      <Route
        path="/participant"
        element={
          currentRole === 'participant' ? (
            <ParticipantDashboard />
          ) : (
            <Navigate to="/admin" replace />
          )
        }
      />
      <Route
        path="/participant/checkpoints"
        element={
          currentRole === 'participant' ? (
            <CheckpointsPage />
          ) : (
            <Navigate to="/admin" replace />
          )
        }
      />
      <Route
        path="/participant/quiz"
        element={
          currentRole === 'participant' ? (
            <QuizPage />
          ) : (
            <Navigate to="/admin" replace />
          )
        }
      />

      {/* Admin Routes */}
      <Route
        path="/admin"
        element={
          currentRole === 'admin' ? (
            <AdminDashboard />
          ) : (
            <Navigate to="/participant" replace />
          )
        }
      />
      <Route
        path="/admin/tickets"
        element={
          currentRole === 'admin' ? (
            <TicketQueuePage />
          ) : (
            <Navigate to="/participant" replace />
          )
        }
      />
      <Route
        path="/admin/minigames"
        element={
          currentRole === 'admin' ? (
            <MiniGamesPage />
          ) : (
            <Navigate to="/participant" replace />
          )
        }
      />

      {/* Default route redirect */}
      <Route
        path="/"
        element={
          currentRole === 'admin' ? (
            <Navigate to="/admin" replace />
          ) : (
            <Navigate to="/participant" replace />
          )
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
