import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { MechanicalHelmetSplash } from '../components/splash/MechanicalHelmetSplash';
import { LoginPage } from '../pages/public/LoginPage';
import { LiveLeaderboardPage } from '../pages/public/LiveLeaderboardPage';
import { ParticipantDashboard } from '../pages/participant/Dashboard';
import { AdminDashboard } from '../pages/admin/AdminDashboard';
import { TeamWaitingRoomPage } from '../pages/participant/TeamWaitingRoomPage';
import { LiveAnsweringTerminalPage } from '../pages/participant/LiveAnsweringTerminalPage';
import { QuizCompletedPage } from '../pages/participant/QuizCompletedPage';
import { AdminQuizzesPage } from '../pages/admin/AdminQuizzesPage';
import { QuestionBuilderPage } from '../pages/admin/QuestionBuilderPage';
import { ArenaStagePresenterPage } from '../pages/admin/ArenaStagePresenterPage';
import { LiveMissionControlPage } from '../pages/admin/LiveMissionControlPage';
import { ResultsAuditPage } from '../pages/admin/ResultsAuditPage';
import { TeamRegistrationsPage } from '../pages/admin/TeamRegistrationsPage';
import { AdminInventoryPage } from '../pages/admin/AdminInventoryPage';
import { Quiz1LeaderboardPage } from '../pages/admin/Quiz1LeaderboardPage';
import { Quiz2LeaderboardPage } from '../pages/admin/Quiz2LeaderboardPage';
import { SubsystemKey } from '../components/bot/Bot3DViewer';
import { useAccount, isAdmin } from '../services/authService';
import { getToken } from '../services/api';
import { Quiz } from '../services/quizService';

interface Props {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onSelectSubsystem: (sub: SubsystemKey) => void;
  launchedQuiz?: Quiz | null;
  participantQuizzes?: Quiz[] | null;
  ready?: boolean;
}

export const AppRoutes: React.FC<Props> = (props) => {
  const navigate = useNavigate();
  const location = useLocation();
  const account = useAccount();
  const home = !account ? '/login' : isAdmin(account) ? '/admin-dashboard' : '/team-dashboard';

  const hasToken = Boolean(getToken());

  // Prevent race condition on opening new tabs: wait for session restore before redirecting
  if (props.ready === false && hasToken && !account) {
    return (
      <div className="min-h-screen bg-[#0F0B08] flex items-center justify-center p-4">
        <div className="text-center font-mono text-orange-400 text-xs space-y-3">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="tracking-wider">Restoring secure session...</p>
        </div>
      </div>
    );
  }

  // Support hash routing compatibility (e.g. #/team/quiz, #team/quiz/live)
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.startsWith('#')) {
      const cleanPath = hash.startsWith('#/') ? hash.slice(1) : '/' + hash.slice(1);
      if (cleanPath && cleanPath !== location.pathname) {
        navigate(cleanPath, { replace: true });
      }
    }
  }, [location, navigate]);

  return (
    <Routes>
      <Route path="/" element={<MechanicalHelmetSplash onEnter={() => navigate(home)} />} />
      <Route path="/splash" element={<MechanicalHelmetSplash onEnter={() => navigate(home)} />} />
      <Route path="/login" element={account ? <Navigate to={home} replace /> : <LoginPage />} />
      <Route path="/leaderboard" element={<LiveLeaderboardPage />} />

      {/* Participant Routes */}
      <Route
        path="/team-dashboard"
        element={account && !isAdmin(account) ? <ParticipantDashboard {...props} /> : <Navigate to={home} replace />}
      />
      <Route
        path="/team/quiz"
        element={account ? <TeamWaitingRoomPage /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/team/quiz/live"
        element={account ? <LiveAnsweringTerminalPage /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/team/quiz/completed"
        element={account ? <QuizCompletedPage /> : <Navigate to="/login" replace />}
      />

      {/* Admin & Arena Stage Routes */}
      <Route
        path="/admin/registrations"
        element={isAdmin(account) ? <TeamRegistrationsPage /> : <Navigate to={home} replace />}
      />
      <Route
        path="/admin/inventory"
        element={isAdmin(account) ? <AdminInventoryPage /> : <Navigate to={home} replace />}
      />
      <Route
        path="/admin-dashboard"
        element={isAdmin(account) ? <AdminDashboard /> : <Navigate to={home} replace />}
      />
      <Route
        path="/admin/quizzes"
        element={isAdmin(account) ? <AdminQuizzesPage /> : <Navigate to={home} replace />}
      />
      <Route
        path="/admin/quizzes/leaderboard/quiz-1"
        element={<Quiz1LeaderboardPage />}
      />
      <Route
        path="/admin/quizzes/leaderboard/quiz-2"
        element={<Quiz2LeaderboardPage />}
      />
      <Route
        path="/admin/quizzes/builder"
        element={isAdmin(account) ? <QuestionBuilderPage /> : <Navigate to={home} replace />}
      />
      <Route
        path="/admin/quizzes/stage"
        element={<ArenaStagePresenterPage />}
      />
      <Route
        path="/admin/quizzes/live"
        element={isAdmin(account) ? <LiveMissionControlPage /> : <Navigate to={home} replace />}
      />
      <Route
        path="/admin/quizzes/results"
        element={isAdmin(account) ? <ResultsAuditPage /> : <Navigate to={home} replace />}
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to={home} replace />} />
    </Routes>
  );
};
