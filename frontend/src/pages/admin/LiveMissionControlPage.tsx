import React, { useState, useEffect, useRef } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { quizService, Quiz, Attempt, TemporaryLeaderboardRow } from '../../services/quizService';
import {
  Play,
  Pause,
  RotateCcw,
  StopCircle,
  Tv,
  Clock,
  Search,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  ShieldAlert,
  Zap,
  Users
} from 'lucide-react';

export const LiveMissionControlPage: React.FC = () => {
  const searchParams = new URLSearchParams(useLocation().search);
  const requestedQuizId = searchParams.get('quiz') || 'quiz-1';

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedQuizId, setSelectedQuizId] = useState(requestedQuizId);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [leaderboard, setLeaderboard] = useState<TemporaryLeaderboardRow[]>([]);
  const [search, setSearch] = useState('');
  const [localTimer, setLocalTimer] = useState(0);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const fetchLiveTelemetry = async (qId: string) => {
    try {
      const catalog = await quizService.list(true);
      setQuizzes(catalog.quizzes);
      const target = catalog.quizzes.find(q => q.id === qId) || catalog.quizzes[0];
      if (!target) return;

      setSelectedQuizId(target.id);
      setQuiz(target);

      const liveData = await quizService.live(target.id);
      setAttempts(liveData.attempts || []);
      setLeaderboard(liveData.leaderboard?.leaderboard || []);
    } catch (err: any) {
      setError(err.message || 'Cannot synchronize telemetry stream.');
    }
  };

  useEffect(() => {
    fetchLiveTelemetry(selectedQuizId);

    const unsubscribe = quizService.subscribe((event) => {
      fetchLiveTelemetry(selectedQuizId);
    });

    const pollTimer = window.setInterval(() => {
      fetchLiveTelemetry(selectedQuizId);
    }, 3000);

    return () => {
      unsubscribe();
      window.clearInterval(pollTimer);
    };
  }, [selectedQuizId]);

  const handleControl = async (action: 'start' | 'pause' | 'resume' | 'end' | 'redo') => {
    try {
      setBusy(true);
      setError('');
      await quizService.control(selectedQuizId, action);
      setNotice(`Quiz ${action.toUpperCase()} executed successfully.`);
      setTimeout(() => setNotice(''), 3000);
      fetchLiveTelemetry(selectedQuizId);
    } catch (err: any) {
      setError(err.message || `Action ${action} failed.`);
    } finally {
      setBusy(false);
    }
  };

  const handleRevokeSession = async (teamId: string) => {
    if (!window.confirm(`Revoke active session for team ${teamId}? This unlocks their login so they can reconnect on a replacement device.`)) return;
    try {
      await quizService.release(selectedQuizId, teamId);
      setNotice(`Session for team ${teamId} invalidated. Team may now resume.`);
      setTimeout(() => setNotice(''), 3000);
      fetchLiveTelemetry(selectedQuizId);
    } catch (err: any) {
      setError(err.message || 'Failed to revoke session.');
    }
  };

  const isLive = quiz?.status === 'LIVE';
  const isPaused = quiz?.status === 'PAUSED';
  const isReady = quiz?.status === 'READY';
  const isDraft = quiz?.status === 'DRAFT';

  const filteredAttempts = attempts.filter((a) => {
    const q = search.trim().toLowerCase();
    return !q || (a.teamName || a.teamId).toLowerCase().includes(q);
  });

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 text-[#251306]">
      
      {/* Top Header & Stage Link */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#F4AE52]/30">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/quizzes"
            className="p-2 rounded-xl bg-white border border-orange-200 hover:bg-orange-50 text-stone-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-stone-600">
                {quiz?.name} ({quiz?.status})
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#251306] mt-0.5">
              Mission Control
            </h1>
          </div>
        </div>

        {/* Master Action Strip */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to={`/admin/quizzes/stage?quiz=${encodeURIComponent(selectedQuizId)}`}
            className="px-4 py-2.5 rounded-xl bg-[#251306] hover:bg-[#3b1e0a] text-white font-mono text-xs font-bold uppercase flex items-center gap-2 shadow-md transition-all"
          >
            <Tv className="w-4 h-4 text-[#F4AE52]" />
            <span>Launch Arena Stage</span>
          </Link>

          {isReady && (
            <Link
              to={`/admin/quizzes/stage?quiz=${encodeURIComponent(selectedQuizId)}`}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-xs font-bold uppercase flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
            >
              <Tv className="w-4 h-4 text-white" />
              <span>Open Presenter to Start</span>
            </Link>
          )}

          {isLive && (
            <button
              type="button"
              disabled={busy}
              onClick={() => handleControl('pause')}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-mono text-xs font-bold uppercase flex items-center gap-1.5 shadow-md transition-all cursor-pointer disabled:opacity-40"
            >
              <Pause className="w-4 h-4 fill-white" />
              <span>Pause Quiz</span>
            </button>
          )}

          {isPaused && (
            <button
              type="button"
              disabled={busy}
              onClick={() => handleControl('resume')}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-xs font-bold uppercase flex items-center gap-1.5 shadow-md transition-all cursor-pointer disabled:opacity-40"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Resume Quiz</span>
            </button>
          )}

          {(isLive || isPaused) && (
            <button
              type="button"
              disabled={busy}
              onClick={() => handleControl('end')}
              className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-mono text-xs font-bold uppercase flex items-center gap-1.5 shadow-md transition-all cursor-pointer disabled:opacity-40"
            >
              <StopCircle className="w-4 h-4" />
              <span>End Quiz</span>
            </button>
          )}

          {['READY', 'LIVE', 'PAUSED', 'RESULTS', 'FINALIZED'].includes(quiz?.status || '') && (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (window.confirm('Reset all attempts and restart this round as DRAFT?')) {
                  handleControl('redo');
                }
              }}
              className="px-3.5 py-2.5 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-800 font-mono text-xs font-bold uppercase flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Redo</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4 p-4 rounded-2xl bg-red-50 text-red-800 border border-red-200 text-xs font-mono">
          {error}
        </div>
      )}

      {notice && (
        <div className="mt-4 p-4 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-mono flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{notice}</span>
        </div>
      )}

      {/* Telemetry KPI Cards Strip */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 font-mono text-xs">
        <div className="bg-white p-4 rounded-2xl border border-orange-200 shadow-sm">
          <span className="text-stone-500 uppercase text-[10px] font-bold block mb-1">Active Teams</span>
          <span className="text-2xl font-bold text-[#D4621A]">
            {attempts.filter(a => a.status === 'ACTIVE').length}
          </span>
          <span className="text-[10px] text-stone-500 block mt-1">Workstations answering</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-orange-200 shadow-sm">
          <span className="text-stone-500 uppercase text-[10px] font-bold block mb-1">Submitted / Done</span>
          <span className="text-2xl font-bold text-emerald-700">
            {attempts.filter(a => ['SUBMITTED', 'EVALUATED'].includes(a.status)).length}
          </span>
          <span className="text-[10px] text-stone-500 block mt-1">Finished attempts</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-orange-200 shadow-sm">
          <span className="text-stone-500 uppercase text-[10px] font-bold block mb-1">Advancement Slots</span>
          <span className="text-2xl font-bold text-[#251306]">
            Top {quiz?.qualificationCount ?? 40}
          </span>
          <span className="text-[10px] text-stone-500 block mt-1">Configured cutoff</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-orange-200 shadow-sm">
          <span className="text-stone-500 uppercase text-[10px] font-bold block mb-1">SSE Stream</span>
          <span className="text-base font-bold text-emerald-600 flex items-center gap-2 mt-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <span>Real-time Active</span>
          </span>
          <span className="text-[10px] text-stone-500 block mt-1">Live updates</span>
        </div>
      </div>

      {/* Live Teams Telemetry Table */}
      <div className="mt-6 bg-white rounded-3xl border border-orange-200 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-stone-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#FEF3E2]/50">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-stone-400" />
            <input
              type="text"
              aria-label="Filter teams"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white border border-stone-300 text-xs font-mono text-[#251306] focus:outline-none focus:border-[#D4621A]"
            />
          </div>

          <span className="text-xs font-mono text-stone-500">
            Showing {filteredAttempts.length} of {attempts.length} workstations
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-mono text-xs">
            <thead>
              <tr className="bg-stone-50 text-stone-500 uppercase border-b border-stone-200 text-[10px] tracking-wider">
                <th className="py-3 px-4">Team</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Answered</th>
                <th className="py-3 px-4 text-right">Score</th>
                <th className="py-3 px-4 text-right">Time Taken</th>
                <th className="py-3 px-4 text-center">Session Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-[#251306]">
              {filteredAttempts.map((att) => {
                const isEvaluated = ['SUBMITTED', 'EVALUATED'].includes(att.status);
                const timeStr = att.timeTakenSeconds
                  ? `${Math.floor(att.timeTakenSeconds / 60)}m ${String(att.timeTakenSeconds % 60).padStart(2, '0')}s`
                  : 'In Progress';

                return (
                  <tr key={att.id} className="hover:bg-orange-50/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div>
                        <span className="font-bold font-sans text-sm block text-[#251306]">
                          {att.teamName || att.teamId}
                        </span>
                        <span className="text-[10px] text-stone-400 block mt-0.5">
                          Session: {att.sessionId ? att.sessionId.slice(0, 12) + '…' : 'None'}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        isEvaluated
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800 animate-pulse'
                      }`}>
                        {att.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right font-bold">
                      {att.answeredCount ?? Object.keys(att.answers || {}).length}
                    </td>

                    <td className="py-3.5 px-4 text-right font-bold text-[#D4621A]">
                      {att.score !== null ? `${att.score} pts` : '—'}
                    </td>

                    <td className="py-3.5 px-4 text-right text-stone-500">
                      {timeStr}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      {att.status === 'ACTIVE' ? (
                        <button
                          type="button"
                          onClick={() => handleRevokeSession(att.teamId)}
                          className="px-2.5 py-1 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 text-[10px] font-bold uppercase transition-colors cursor-pointer"
                        >
                          Unlock / Revoke
                        </button>
                      ) : (
                        <span className="text-[10px] text-stone-400 uppercase">Sealed</span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filteredAttempts.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-stone-400 font-mono text-xs">
                    No matching team attempts found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
