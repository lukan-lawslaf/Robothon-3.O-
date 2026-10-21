import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { quizService, Quiz, Question, Attempt } from '../../services/quizService';
import { useAccount } from '../../services/authService';
import { refreshPlatform } from '../../services/stateStore';
import { preferredParticipantQuiz, quizLaunchTiming, quizRunKey } from '../../services/quizLaunch';
import { QuizLaunchCountdown } from './QuizLaunchCountdown';

export const LiveQuizPanel: React.FC<{ initialQuiz?: Quiz | null; requestedQuizId?: string }> = ({ initialQuiz = null, requestedQuizId = '' }) => {
  const account = useAccount();
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selected, setSelected] = useState(requestedQuizId);
  const [quiz, setQuiz] = useState<Quiz | null>(initialQuiz);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [index, setIndex] = useState(0);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Auto-redirect leader to live Kahoot answering terminal when quiz is active
  useEffect(() => {
    if (quiz && (quiz.status === 'LIVE' || ['COUNTDOWN', 'QUESTION'].includes(quiz.stageState?.stage || ''))) {
      navigate('/team/quiz/live?quiz=' + encodeURIComponent(quiz.id), { replace: true });
    }
  }, [quiz, navigate]);
  const [timing, setTiming] = useState(() => initialQuiz ? quizLaunchTiming(initialQuiz, Date.parse(initialQuiz.serverTime)) : { secondsRemaining: 0, countdown: null });
  const busyRef = useRef(false);
  const revision = useRef(0);
  const clockOffset = useRef(initialQuiz ? Date.parse(initialQuiz.serverTime) - Date.now() : 0);
  const autoJoined = useRef(new Set<string>());

  useEffect(() => {
    let alive = true, polling = false;
    const refresh = async () => {
      if (polling || busyRef.current) return;
      polling = true;
      const version = revision.current;
      try {
        const catalog = await quizService.list();
        if (!alive || busyRef.current || version !== revision.current) return;
        setQuizzes(catalog.quizzes);
        setLoaded(true);
        const preferred = preferredParticipantQuiz(catalog.quizzes, selected);
        if (preferred?.id !== selected) {
          setSelected(preferred?.id || ''); setQuiz(preferred || null); setQuestions([]); setAttempt(null); setIndex(0); setNotice(''); setActionError('');
          if (preferred) clockOffset.current = Date.parse(preferred.serverTime) - Date.now();
          setError(''); return;
        }
        if (!selected) return;
        const details = await quizService.details(selected);
        const offset = Date.parse(details.quiz.serverTime) - Date.now();
        const canTake = !details.quiz.teamLeaderOnly || account?.role === 'TEAM_LEADER';
        const result = canTake ? await quizService.attempt(selected) : { attempt: null };
        if (!alive || busyRef.current || version !== revision.current) return;
        clockOffset.current = offset;
        setQuiz(details.quiz);
        setQuestions(details.questions);
        setAttempt(result.attempt);
        setError('');
        const runKey = `${quizRunKey(details.quiz)}:${result.attempt?.sessionInvalidated ? 'released' : 'new'}`;
        const canResume = !result.attempt || (result.attempt.status === 'ACTIVE' && result.attempt.sessionInvalidated);
        if (canTake && canResume && details.quiz.status === 'LIVE' && quizLaunchTiming(details.quiz, Date.now() + offset).secondsRemaining > 0 && !autoJoined.current.has(runKey)) {
          autoJoined.current.add(runKey);
          busyRef.current = true; revision.current++; setBusy(true);
          try {
            const joined = await quizService.join(selected);
            if (alive) {
              clockOffset.current = Date.parse(joined.quiz.serverTime) - Date.now();
              setQuiz(joined.quiz); setQuestions(joined.questions); setAttempt(joined.attempt); setActionError('');
            }
          } catch (e) {
            if (alive) setActionError((e as Error).message);
          } finally { busyRef.current = false; setBusy(false); }
        }
      } catch (e) { if (alive) setError((e as Error).message); }
      finally { polling = false; }
    };
    void refresh();
    const unsubscribe = quizService.subscribe(() => { void refresh(); });
    const timer = window.setInterval(refresh, 2000);
    return () => { alive = false; unsubscribe(); window.clearInterval(timer); };
  }, [selected, account?.role, account?.sessionId]);

  useEffect(() => {
    const tick = () => setTiming(quiz ? quizLaunchTiming(quiz, Date.now() + clockOffset.current) : { secondsRemaining: 0, countdown: null });
    tick();
    const timer = window.setInterval(tick, 100);
    return () => window.clearInterval(timer);
  }, [quiz]);

  const run = async (action: () => Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = true; revision.current++; setBusy(true); setActionError(''); setNotice('');
    try { await action(); }
    catch (e) { setActionError((e as Error).message); }
    finally { busyRef.current = false; setBusy(false); }
  };
  const canTake = quiz && (!quiz.teamLeaderOnly || account?.role === 'TEAM_LEADER');
  const active = attempt?.status === 'ACTIVE';
  const ownSession = attempt?.sessionId === account?.sessionId && !attempt?.sessionInvalidated;
  const sessionConflict = active && !ownSession && !attempt?.sessionInvalidated;
  const { secondsRemaining: seconds, countdown } = timing;
  const canAnswer = active && ownSession && quiz?.status === 'LIVE' && seconds > 0 && countdown === null;
  const question = questions[index];
  const button = 'rounded-xl bg-[#251306] text-white px-5 py-2.5 text-sm font-semibold disabled:opacity-40';

  if (quiz?.status === 'LIVE' && canTake && countdown !== null && (!attempt || active)) return <QuizLaunchCountdown name={quiz.name} seconds={countdown} />;

  return <section className="max-w-5xl mx-auto w-full p-4 sm:p-8 space-y-6">
    <div><p className="text-xs font-mono text-orange-700 uppercase tracking-wider">Participant assessment</p><h1 className="text-3xl font-bold mt-1">Quizzes & Assessment</h1><p className="text-sm text-stone-600 mt-2">Wait for the super admin to start the test. Each answer is saved to your team.</p></div>
    <label className="block text-sm font-semibold">Quiz round<select aria-label="Quiz round" disabled={busy} value={selected} onChange={e => { revision.current++; setSelected(e.target.value); setQuiz(null); setAttempt(null); setQuestions([]); setIndex(0); setNotice(''); setActionError(''); }} className="block w-full mt-2 rounded-xl p-3 bg-white border border-orange-200">{quizzes.map(q => <option key={q.id} value={q.id}>{q.name} · {q.status}</option>)}</select></label>
    {(actionError || error) && <p role="alert" className="rounded-xl bg-red-50 text-red-800 border border-red-200 p-4">{actionError || error}</p>}
    {notice && <p role="status" className="text-orange-900 bg-orange-50 p-3 rounded-xl">{notice}</p>}
    {!loaded && !error && <p>Loading quizzes…</p>}
    {loaded && !quizzes.length && <p className="p-6 bg-white rounded-2xl">No quizzes have been published yet. This page updates automatically.</p>}
    {quiz && <div className="rounded-3xl bg-white border border-orange-200 p-5 sm:p-8 space-y-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-xl font-bold">{quiz.name}</h2><p className="text-sm text-stone-500 mt-1">{quiz.status} · {quiz.durationSeconds / 60} minutes · Top {quiz.qualificationCount} qualify after finalization</p></div>{quiz.startedAt && ['LIVE', 'PAUSED'].includes(quiz.status) && <div aria-label="Time remaining" className="text-3xl font-mono font-bold text-orange-700">{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</div>}</div>
      {!canTake ? <p className="bg-amber-50 p-4 rounded-xl">Only your registered team leader can answer this quiz. You can continue viewing checkpoints and the leaderboard.</p> : <>
        {quiz.status === 'READY' && <p className="bg-orange-50 p-5 rounded-xl">Waiting for the super admin to start the test. This page updates automatically.</p>}
        {quiz.status === 'PAUSED' && <p className="bg-amber-50 p-4 rounded-xl">The test is paused. Answering will resume when the super admin resumes it. The test deadline continues to run.</p>}
        {quiz.status === 'LIVE' && seconds === 0 && <p>The time limit has ended. Saved answers are being evaluated.</p>}
        {seconds > 0 && ((quiz.status === 'LIVE' && !attempt) || (['LIVE', 'PAUSED'].includes(quiz.status) && active && !ownSession)) && <div className="space-y-3"><p>{sessionConflict ? 'An earlier session is linked to your team’s attempt. Resume here to keep your saved answers and remaining time. Any other tab will stop accepting answers.' : 'Your team has one attempt. Late entry uses the remaining test time.'}</p><button className={button} disabled={busy} onClick={() => run(async () => { const result = await (attempt ? quizService.resumeAttempt(quiz.id) : quizService.join(quiz.id)); clockOffset.current = Date.parse(result.quiz.serverTime) - Date.now(); setAttempt(result.attempt); setQuestions(result.questions); setQuiz(result.quiz); setIndex(Math.max(0, result.questions.findIndex(q => !result.attempt.answers[q.id]))); if (attempt) setNotice('Attempt resumed here. Your saved answers and original time limit are kept.'); })}>{busy ? 'Opening…' : attempt ? 'Resume team attempt' : 'Join test'}</button></div>}
        {active && ownSession && question && <>
          <div className="flex justify-between text-sm text-stone-500"><span>Question {index + 1} of {questions.length}</span><span>{Object.keys(attempt.answers).length} answers saved</span></div>
          <fieldset disabled={!canAnswer || busy} className="space-y-3"><legend className="text-lg font-semibold mb-4">{question.questionText}</legend>
            {question.options.map(option => <label key={option.optionKey} className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer ${attempt.answers[question.id] === option.optionKey ? 'border-orange-600 bg-orange-50' : 'border-stone-200'} ${!canAnswer || busy ? 'opacity-60' : ''}`}><input type="radio" className="accent-[#D4621A]" name={question.id} checked={attempt.answers[question.id] === option.optionKey} onChange={() => run(async () => { await quizService.answer(quiz.id, question.id, option.optionKey); setAttempt(previous => previous ? { ...previous, answers: { ...previous.answers, [question.id]: option.optionKey } } : previous); setNotice('Answer saved.'); })} /><span><strong>{option.optionKey}.</strong> {option.optionText}</span></label>)}
          </fieldset>
          <div className="flex flex-wrap justify-between gap-3 pt-3 border-t border-stone-200">
            <button className={button} disabled={busy || index === 0 || !quiz.allowNavigation} onClick={() => setIndex(i => i - 1)}>Previous</button>
            {index < questions.length - 1 && <button className={button} disabled={busy || (!quiz.allowNavigation && !attempt.answers[question.id])} onClick={() => setIndex(i => i + 1)}>Next question</button>}
            <button className="rounded-xl bg-orange-700 text-white px-5 py-2.5 text-sm font-semibold disabled:opacity-40" disabled={!canAnswer || busy} onClick={() => run(async () => { const result = await quizService.submit(quiz.id); setAttempt(result.attempt); setNotice('Your answers have been submitted.'); await refreshPlatform().catch(() => undefined); })}>{busy ? 'Saving…' : 'Submit test'}</button>
          </div><p className="text-xs text-stone-500">Submission is final. Unanswered questions receive zero points.</p>
        </>}
        {attempt && !active && <div className="rounded-2xl bg-orange-50 p-5"><h3 className="font-bold text-lg">Test submitted</h3><p className="mt-2">Score: {attempt.score ?? 'Pending'} points</p><p className="text-sm mt-2">{attempt.qualificationStatus && attempt.qualificationStatus !== 'PENDING' ? `Qualification: ${attempt.qualificationStatus}` : 'Qualification is pending finalization by the super admin.'}</p></div>}
        {!attempt && ['RESULTS', 'FINALIZED'].includes(quiz.status) && <p>This quiz has ended. Your team did not submit an attempt.</p>}
      </>}
    </div>}
  </section>;
};
