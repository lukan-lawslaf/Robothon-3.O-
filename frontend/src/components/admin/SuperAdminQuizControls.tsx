import React, { useEffect, useRef, useState } from 'react';
import { quizService, Quiz, Attempt, AdminQuestion } from '../../services/quizService';
import { useAccount } from '../../services/authService';
import { refreshPlatform } from '../../services/stateStore';

export const SuperAdminQuizControls: React.FC = () => {
  const account = useAccount();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const revision = useRef(0);
  const [notice, setNotice] = useState('');
  const [template, setTemplate] = useState('BASIC_ROBOTICS');
  const [name, setName] = useState('Basic robotics quiz');
  const [minutes, setMinutes] = useState(5);
  const [monitor, setMonitor] = useState('');
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [resetQuiz, setResetQuiz] = useState('');
  const [preview, setPreview] = useState<{ id: string; questions: AdminQuestion[] } | null>(null);
  const refresh = async () => {
    const catalog = await quizService.list(true);
    const live = monitor ? await quizService.live(monitor) : null;
    setQuizzes(catalog.quizzes); setAttempts(live?.attempts || []);
  };
  useEffect(() => {
    if (account?.role !== 'SUPER_ADMIN') return;
    let alive = true, pending = false;
    const poll = async () => {
      if (pending || busyRef.current) return;
      pending = true;
      const version = revision.current;
      try {
        const result = await quizService.list(true);
        const live = monitor ? await quizService.live(monitor) : null;
        if (alive && !busyRef.current && version === revision.current) { setQuizzes(result.quizzes); setAttempts(live?.attempts || []); }
      } catch (e) { if (alive && version === revision.current) setError((e as Error).message); }
      finally { pending = false; }
    };
    void poll(); const timer = window.setInterval(poll, 3000);
    return () => { alive = false; window.clearInterval(timer); };
  }, [account?.role, monitor]);
  if (account?.role !== 'SUPER_ADMIN') return null;
  const run = async (action: () => Promise<unknown>, message: string) => {
    if (busyRef.current) return;
    busyRef.current = true; revision.current++; setBusy(true); setError(''); setNotice('');
    try { await action(); await refresh(); setNotice(message); }
    catch (e) { setError((e as Error).message); }
    finally { busyRef.current = false; setBusy(false); }
  };
  const style = 'px-4 py-2.5 rounded-xl bg-[#251306] text-white text-sm font-semibold disabled:opacity-40';
  const orange = 'px-4 py-2.5 rounded-xl bg-[#D4621A] text-white text-sm font-semibold disabled:opacity-40';
  const actions: Record<string, [string, string][]> = { DRAFT: [['ready', 'Publish quiz']], READY: [['start', 'Start test']], LIVE: [['pause', 'Pause'], ['end', 'End test']], PAUSED: [['resume', 'Resume'], ['end', 'End test']], RESULTS: [['finalize', 'Finalize qualification']], FINALIZED: [] };
  const order: Record<string, number> = { LIVE: 0, PAUSED: 1, READY: 2, DRAFT: 3, RESULTS: 4, FINALIZED: 5 };
  return <section aria-label="Quiz controls" className="p-5 sm:p-6 rounded-2xl bg-white border border-orange-200 space-y-5">
    <div><p className="text-xs font-mono text-orange-700 uppercase">Super admin only</p><h2 className="font-bold text-xl mt-1">Quiz controls</h2><p className="text-sm text-stone-600 mt-1">Create a quiz, start its countdown, or reset a finished round to run it again.</p></div>
    {error && <p role="alert" className="p-3 rounded-xl bg-red-50 text-red-800 text-sm">{error}</p>}
    {notice && <p role="status" className="p-3 rounded-xl bg-orange-50 text-orange-900 text-sm">{notice}</p>}
    <form className="rounded-xl bg-[#FEF3E2] border border-orange-100 p-4 space-y-3" onSubmit={e => {
      e.preventDefault();
      void run(async () => {
        const input = { id: crypto.randomUUID(), name: name.trim(), durationSeconds: minutes * 60 };
        if (template === 'BASIC_ROBOTICS') await quizService.createBasic(input);
        else await quizService.create(input);
      }, template === 'BASIC_ROBOTICS' ? 'Basic quiz published with 5 questions. Click Start test when everyone is ready.' : 'Draft created. Import your questions, then publish it.');
    }}>
      <h3 className="font-semibold">Create a quiz</h3>
      <label className="block text-sm">Quiz type<select disabled={busy} value={template} onChange={e => setTemplate(e.target.value)} className="block w-full border border-orange-200 rounded-xl bg-white p-3 mt-1"><option value="BASIC_ROBOTICS">Basic robotics — 5 ready-made MCQs</option><option value="CUSTOM">Custom question bank</option></select></label>
      <p className="text-xs text-stone-600">{template === 'BASIC_ROBOTICS' ? 'Batteries, microcontrollers, motor drivers, sensors and DC motors. 1 point per correct answer, no negative marking, and a 10-second opening countdown.' : 'Create an empty round and import your own question bank as JSON.'}</p>
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="block text-sm">Round name<input required disabled={busy} value={name} onChange={e => setName(e.target.value)} className="block w-full border border-orange-200 rounded-xl p-3 mt-1" /></label>
        <label className="block text-sm">Duration (minutes)<input required disabled={busy} min={1} max={240} step={1} type="number" value={minutes} onChange={e => setMinutes(Number(e.target.value))} className="block w-full border border-orange-200 rounded-xl p-3 mt-1" /></label>
      </div>
      <button disabled={busy || !name.trim()} className={orange}>{template === 'BASIC_ROBOTICS' ? 'Create & publish basic quiz' : 'Create draft'}</button>
    </form>
    {!quizzes.length && <p className="text-sm text-stone-600">Your quiz rounds will appear here. Create a basic quiz above to get started.</p>}
    {[...quizzes].sort((a, b) => order[a.status] - order[b.status]).map(quiz => <article aria-label={quiz.name} key={quiz.id} className="border border-orange-200 rounded-xl p-4 space-y-3">
      <div className="flex justify-between gap-2"><h3 className="font-semibold">{quiz.name}</h3><span className="text-xs font-mono text-orange-700">{quiz.status === 'READY' ? 'READY TO START' : quiz.status}</span></div>
      <p className="text-xs text-stone-600">{quiz.template === 'BASIC_ROBOTICS' ? 'Basic robotics' : 'Custom quiz'} · {quiz.questionCount ?? '—'} questions · {quiz.durationSeconds / 60} minutes · Top {quiz.qualificationCount} qualify</p>
      <div className="flex flex-wrap gap-2">
        {(actions[quiz.status] || []).map(([action, label]) => <button key={action} className={action === 'start' ? orange : style} disabled={busy} onClick={() => run(() => quizService.control(quiz.id, action), label + ' completed.')}>{label}</button>)}
        {['RESULTS', 'FINALIZED'].includes(quiz.status) && <button className={orange} disabled={busy} onClick={() => setResetQuiz(quiz.id)}>Reset & republish</button>}
        <button className="text-sm underline px-2" disabled={busy} onClick={() => { if (preview?.id === quiz.id) setPreview(null); else void run(async () => setPreview({ id: quiz.id, questions: (await quizService.adminQuestions(quiz.id)).questions }), ''); }}>{preview?.id === quiz.id ? 'Hide questions' : 'View questions'}</button>
        <button className="text-sm underline px-2" disabled={busy} onClick={() => { setMonitor(monitor === quiz.id ? '' : quiz.id); setAttempts([]); }}>{monitor === quiz.id ? 'Hide attempts' : 'View attempts'}</button>
      </div>
      {resetQuiz === quiz.id && ['RESULTS', 'FINALIZED'].includes(quiz.status) && <div role="group" aria-label={'Reset ' + quiz.name} className="rounded-xl bg-orange-50 border border-orange-200 p-4 space-y-3">
        <p className="font-semibold text-sm">Reset this round and publish it again?</p>
        <p className="text-sm text-stone-700">This clears all teams’ answers, scores and qualification for this round. Questions, checkpoints and bonus points are kept. Click Start test afterwards to launch a fresh countdown.</p>
        <div className="flex flex-wrap gap-2"><button disabled={busy} className={orange} onClick={() => run(async () => { await quizService.control(quiz.id, 'republish'); setResetQuiz(''); setAttempts([]); await refreshPlatform().catch(() => undefined); }, 'Quiz reset and published. Teams can take it again when you click Start test.')}>Confirm reset & republish</button><button disabled={busy} className={style} onClick={() => setResetQuiz('')}>Cancel</button></div>
      </div>}
      {preview?.id === quiz.id && <div className="rounded-xl bg-orange-50/50 p-4 space-y-3"><p className="text-xs font-semibold text-orange-800">Question bank · answer keys are visible only to super admins</p>{!preview.questions.length && <p className="text-sm">No questions yet. Import a question bank below.</p>}<ol className="list-decimal pl-5 space-y-4">{preview.questions.map(q => <li key={q.id} className="text-sm"><p className="font-semibold">{q.questionText}</p><ul className="mt-2 space-y-1">{q.options.map(o => <li key={o.optionKey} className={o.optionKey === q.correctOption ? 'text-orange-800 font-semibold' : 'text-stone-600'}>{o.optionKey}. {o.optionText}{o.optionKey === q.correctOption ? ' — Correct' : ''}</li>)}</ul></li>)}</ol></div>}
      {['DRAFT', 'READY'].includes(quiz.status) && <details><summary className="cursor-pointer text-xs text-stone-600">Replace questions with a JSON file</summary><label className="block text-xs text-stone-600 mt-3">Importing replaces this round’s questions.<input aria-label={'Import questions for ' + quiz.name} type="file" accept=".json,application/json" disabled={busy} className="block mt-2 w-full" onChange={e => { const file = e.target.files?.[0]; if (file) void run(async () => { const input = JSON.parse(await file.text()); await quizService.import(quiz.id, input); setPreview(null); }, 'Question bank imported.'); e.target.value = ''; }} /></label></details>}
      {monitor === quiz.id && <div className="overflow-x-auto"><p className="text-xs text-stone-500 mb-2">{attempts.length} team attempts</p><table className="w-full text-xs text-left"><thead><tr><th className="py-2">Team</th><th>Saved</th><th>Status</th><th>Score</th><th>Session</th></tr></thead><tbody>{attempts.map(a => <tr key={a.id} className="border-t border-stone-100"><td className="py-2">{a.teamName || a.teamId}</td><td>{a.answeredCount}</td><td>{a.status}</td><td>{a.score ?? '—'}</td><td>{a.status === 'ACTIVE' && <button disabled={busy} className="text-orange-700 underline" onClick={() => run(() => quizService.release(quiz.id, a.teamId), 'Session released. The team can sign in and resume.')}>Release session</button>}</td></tr>)}</tbody></table></div>}
    </article>)}
  </section>;
};

