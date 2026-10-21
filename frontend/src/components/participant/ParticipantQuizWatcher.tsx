import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Quiz, quizService } from '../../services/quizService';
import { isRunningQuiz, preferredParticipantQuiz, quizRunKey } from '../../services/quizLaunch';
import { useAccount } from '../../services/authService';

// This stays mounted across participant routes, including the checkpoint dashboard.
export const ParticipantQuizWatcher: React.FC<{ onLaunch: (quiz: Quiz) => void; onCatalogChange: (quizzes: Quiz[]) => void }> = ({ onLaunch, onCatalogChange }) => {
  const [error, setError] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const account = useAccount();

  const onLaunchRef = useRef(onLaunch);
  onLaunchRef.current = onLaunch;
  const catalogRef = useRef(onCatalogChange);
  catalogRef.current = onCatalogChange;
  const locationRef = useRef(location.pathname);
  locationRef.current = location.pathname;

  useEffect(() => {
    let alive = true, pending = false, queued = false;
    const seen = new Set<string>();

    const refresh = async () => {
      if (!alive) return;
      if (pending) { queued = true; return; }
      pending = true;
      try {
        const { quizzes } = await quizService.list();
        if (!alive) return;
        setError('');
        catalogRef.current(quizzes);
        const quiz = preferredParticipantQuiz(quizzes);

        if (quiz) {
          const isLiveNow = quiz.status === 'LIVE' || ['COUNTDOWN', 'QUESTION'].includes(quiz.stageState?.stage || '') || isRunningQuiz(quiz);
          
          if (isLiveNow) {
            // Auto redirect leader to live quiz area if not already there
            const currentPath = locationRef.current;
            const isQuizArea = currentPath === '/team/quiz/live' || currentPath === '/team/quiz/completed';
            
            if (!isQuizArea) {
              navigate(`/team/quiz/live?quiz=${encodeURIComponent(quiz.id)}`, { replace: true });
            }

            if (!seen.has(quizRunKey(quiz))) {
              seen.add(quizRunKey(quiz));
              onLaunchRef.current(quiz);
            }
          }
        }
      } catch (e) {
        if (alive) setError((e as Error).message);
      } finally {
        pending = false;
        if (queued && alive) { queued = false; void refresh(); }
      }
    };

    const update = () => { void refresh(); };
    const unsubscribe = quizService.subscribe((event) => {
      if (event?.type === 'QUIZ_STARTED' || event?.type === 'STAGE_UPDATE' || event?.type === 'QUIZ_RESUMED') {
        void refresh();
      } else {
        void refresh();
      }
    });

    const timer = window.setInterval(update, 2000);
    const visible = () => { if (document.visibilityState === 'visible') update(); };
    window.addEventListener('focus', update);
    document.addEventListener('visibilitychange', visible);
    update();

    return () => {
      alive = false;
      unsubscribe();
      window.clearInterval(timer);
      window.removeEventListener('focus', update);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [navigate]);

  return error ? <p role="alert" className="px-6 py-3 bg-orange-50 text-orange-900 text-sm">Test updates: {error} Retrying automatically.</p> : null;
};
