import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, useLocation, useNavigate } from 'react-router-dom';
import { PillNavbar } from './components/common/PillNavbar';
import { BaselineFooter } from './components/common/BaselineFooter';
import { AppRoutes } from './routes/AppRoutes';
import { SubsystemKey } from './components/bot/Bot3DViewer';
import { getStoredTeams, refreshPlatform, resetStoreToDefaults } from './services/stateStore';
import { useAccount, restoreSession, isAdmin } from './services/authService';
import { Quiz } from './services/quizService';
import { ParticipantQuizWatcher } from './components/participant/ParticipantQuizWatcher';
import { ApiError } from './services/api';
import { MockTeam } from './mockData';

const AppContent: React.FC = () => {
  const account = useAccount();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [authError, setAuthError] = useState('');
  const [launchedQuiz, setLaunchedQuiz] = useState<Quiz | null>(null);
  const [participantQuizzes, setParticipantQuizzes] = useState<Quiz[] | null>(null);
  const [activeSubsystem, setActiveSubsystem] = useState<SubsystemKey>('chassis');
  const [team, setTeam] = useState<MockTeam | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = new URLSearchParams(location.search).get('tab') === 'quizzes' ? 'quizzes' : 'checkpoints';
  const setActiveTab = (tab: string) => navigate(tab === 'quizzes' ? '/team-dashboard?tab=quizzes' : '/team-dashboard');
  const launchQuiz = useCallback((quiz: Quiz) => {
    setLaunchedQuiz(quiz);
    navigate('/team/quiz/live?quiz=' + encodeURIComponent(quiz.id), { replace: true });
  }, [navigate]);
  const restore = async () => {
    setAuthError('');
    try { await restoreSession(); setReady(true); }
    catch (e) {
      if (e instanceof ApiError && e.status === 401) setReady(true);
      else setAuthError((e as Error).message);
    }
  };
  useEffect(() => { void restore(); }, []);
  useEffect(() => { setParticipantQuizzes(null); setLaunchedQuiz(null); }, [account?.userId]);
  useEffect(() => {
    if (!ready) return;
    resetStoreToDefaults();
    let alive = true, pending = false;
    const refresh = async () => {
      if (pending) return;
      pending = true;
      try { await refreshPlatform(); if (alive) setError(''); }
      catch (e) { if (alive) setError((e as Error).message); }
      finally { pending = false; }
    };
    void refresh();
    const interval = window.setInterval(refresh, 3000);
    return () => { alive = false; window.clearInterval(interval); };
  }, [ready, account?.userId]);
  useEffect(() => {
    const update = () => setTeam(getStoredTeams().find(t => t.id === account?.teamId) || null);
    update();
    window.addEventListener('robothon_store_updated', update);
    return () => window.removeEventListener('robothon_store_updated', update);
  }, [account?.teamId]);
  if (!ready) return <div className="min-h-screen bg-[#FEF3E2] p-12 text-center">{authError || 'Restoring your session…'}{authError && <button className="block mx-auto mt-4 underline" onClick={restore}>Try again</button>}</div>;
  const fullscreen = ['/', '/splash', '/login', '/admin/quizzes/stage'].includes(location.pathname);
  return <div className={`min-h-screen flex flex-col font-sans ${fullscreen ? 'bg-[#0e0a07] text-white' : 'bg-[#FEF3E2] text-[#251306]'}`}>
    {!fullscreen && <PillNavbar activeTab={activeTab} onTabChange={setActiveTab} />}
    {!fullscreen && error && <div role="alert" className="bg-red-50 text-red-800 px-6 py-3 text-sm">{error} Updates will retry automatically.</div>}
    {account && !isAdmin(account) && <ParticipantQuizWatcher key={account.userId} onLaunch={launchQuiz} onCatalogChange={setParticipantQuizzes} />}
    <main className="flex-1 flex flex-col"><AppRoutes activeTab={activeTab} onTabChange={setActiveTab} onSelectSubsystem={setActiveSubsystem} launchedQuiz={launchedQuiz} participantQuizzes={participantQuizzes} ready={ready} /></main>
    {!fullscreen && !(location.pathname === '/team-dashboard' && !isAdmin(account)) && <BaselineFooter team={team} activeSubsystem={activeSubsystem} admin={isAdmin(account)} />}
  </div>;
};
export const App = () => <BrowserRouter><AppContent /></BrowserRouter>;
export default App;
