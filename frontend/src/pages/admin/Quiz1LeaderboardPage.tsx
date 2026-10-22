import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { quizService, Quiz, TemporaryLeaderboardRow } from '../../services/quizService';
import {
  Trophy,
  Award,
  Crown,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
  RefreshCw,
  Radio,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';

export const Quiz1LeaderboardPage: React.FC = () => {
  const quizId = 'quiz-1';
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [rows, setRows] = useState<TemporaryLeaderboardRow[]>([]);
  const [cutoff, setCutoff] = useState<number>(40);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterQualifiedOnly, setFilterQualifiedOnly] = useState(false);

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      const [listRes, boardRes] = await Promise.all([
        quizService.list(true).catch(() => ({ quizzes: [] })),
        quizService.leaderboard(quizId).catch(() => ({ leaderboard: [], rows: [], qualificationCutoff: 40 } as any))
      ]);

      const targetQuiz = listRes.quizzes.find(q => q.id === quizId) || null;
      setQuiz(targetQuiz);

      const effectiveCutoff = targetQuiz?.qualificationCount || (boardRes as any).qualificationCutoff || 40;
      setCutoff(effectiveCutoff);

      const boardRows = (boardRes as any).leaderboard || (boardRes as any).rows || [];
      setRows(boardRows);
    } catch (err) {
      console.error('Failed to load Quiz 1 leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeaderboard();
  }, []);

  // Real-time SSE updates
  useEffect(() => {
    const sse = new EventSource(`/api/events?quizId=${quizId}`);
    const handleUpdate = () => loadLeaderboard();

    sse.addEventListener('LEADERBOARD_UPDATED', handleUpdate);
    sse.addEventListener('QUALIFICATION_FINALIZED', handleUpdate);
    sse.addEventListener('STAGE_UPDATE', handleUpdate);
    sse.addEventListener('QUIZ_ENDED', handleUpdate);

    return () => sse.close();
  }, [quizId]);

  const filteredRows = useMemo(() => {
    return rows.filter(r => {
      const matchSearch = r.teamName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.teamId.toLowerCase().includes(searchQuery.toLowerCase());
      const isQual = r.qualificationStatus?.toUpperCase().includes('QUALIFIED');
      const matchFilter = !filterQualifiedOnly || isQual;
      return matchSearch && matchFilter;
    });
  }, [rows, searchQuery, filterQualifiedOnly]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const isFinalized = quiz?.status === 'FINALIZED';

  return (
    <div className="min-h-screen bg-[#FEF3E2] text-[#251306] p-4 sm:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-stone-500 mb-1">
              <Link to="/admin-dashboard" className="hover:text-[#ea580c] transition-colors">Admin Portal</Link>
              <ChevronRight size={12} />
              <Link to="/admin/quizzes" className="hover:text-[#ea580c] transition-colors">Quiz Ops</Link>
              <ChevronRight size={12} />
              <span className="text-[#ea580c] font-bold">Quiz 1 Leaderboard</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-orange-100 flex items-center justify-center text-[#ea580c]">
                <Trophy className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#1c140e] flex items-center gap-2">
                  Quiz 1 — Elimination Round Leaderboard
                </h1>
                <p className="text-xs sm:text-sm text-stone-600 font-mono mt-0.5">
                  Server-authoritative ranking & Top-{cutoff} advancement qualification.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/admin/quizzes/leaderboard/quiz-2"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-stone-200 text-stone-700 hover:text-[#ea580c] text-xs font-mono font-bold transition-all shadow-sm"
            >
              <span>View Quiz 2 Board</span>
              <ArrowRight size={14} />
            </Link>

            <button
              onClick={loadLeaderboard}
              className="p-2.5 rounded-xl bg-white border border-stone-200 text-stone-600 hover:text-[#ea580c] transition-colors cursor-pointer"
              title="Refresh"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Cutoff & Status Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-[10px] font-mono text-stone-400 uppercase tracking-wider font-semibold">Qualification Cutoff</div>
              <div className="text-2xl font-black text-[#1c140e] mt-0.5">Top {cutoff} Teams</div>
            </div>
            <div className="px-3 py-1 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-mono font-bold">
              Advance to Finals
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-[10px] font-mono text-stone-400 uppercase tracking-wider font-semibold">Quiz 1 Status</div>
              <div className="text-xl font-black text-[#1c140e] mt-0.5 flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${
                  quiz?.status === 'LIVE' ? 'bg-emerald-500 animate-pulse' :
                  quiz?.status === 'FINALIZED' ? 'bg-purple-500' : 'bg-amber-500'
                }`} />
                <span>{quiz?.status || 'STANDBY'}</span>
              </div>
            </div>
            <div className="text-xs font-mono text-stone-500">
              {isFinalized ? 'Results Locked' : 'Scores Active'}
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-[10px] font-mono text-stone-400 uppercase tracking-wider font-semibold">Total Submissions</div>
              <div className="text-2xl font-black text-[#ea580c] mt-0.5">{rows.length}</div>
            </div>
            <div className="text-xs font-mono text-stone-500">
              Teams Participating
            </div>
          </div>
        </div>

        {/* Search & Filter bar */}
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
          <div className="flex-1 min-w-[240px] relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Search teams in Quiz 1..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs font-mono rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#ea580c] bg-stone-50"
            />
          </div>

          <button
            onClick={() => setFilterQualifiedOnly(!filterQualifiedOnly)}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer ${
              filterQualifiedOnly
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            <CheckCircle2 size={14} />
            <span>Show Qualified Only</span>
          </button>
        </div>

        {/* Leaderboard Table */}
        <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead>
                <tr className="bg-stone-50 text-stone-500 uppercase tracking-wider border-b border-stone-200">
                  <th className="py-3 px-4 w-16 text-center">Rank</th>
                  <th className="py-3 px-4">Team</th>
                  <th className="py-3 px-4 text-center">Score</th>
                  <th className="py-3 px-4 text-center">Server Time</th>
                  <th className="py-3 px-4 text-center">Cutoff Status</th>
                  <th className="py-3 px-4 text-right">Qualification Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-stone-400">
                      <Trophy className="w-10 h-10 mx-auto text-stone-300 mb-2" />
                      <p className="font-bold text-stone-600">No teams found for Quiz 1.</p>
                      <p className="text-[11px] mt-1">Quiz attempts will automatically appear here live.</p>
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row, idx) => {
                    const isRankTop = row.rank !== null && row.rank <= cutoff;
                    const qualUpper = (row.qualificationStatus || '').toUpperCase();
                    const isQualified = qualUpper === 'QUALIFIED';
                    const isEliminated = qualUpper === 'ELIMINATED';
                    const isProjectedQual = qualUpper.includes('PROJECTED QUALIFIED');
                    const isProjectedElim = qualUpper.includes('PROJECTED ELIMINATED');

                    // Highlight styling: light green for qualified, light red for eliminated
                    let rowBgClass = 'hover:bg-stone-50/70 transition-colors';
                    if (isQualified || isProjectedQual) {
                      rowBgClass = 'bg-[#f0fdf4] hover:bg-[#dcfce7]/70 text-[#14532d] transition-colors';
                    } else if (isEliminated || isProjectedElim) {
                      rowBgClass = 'bg-[#fef2f2] hover:bg-[#fee2e2]/70 text-[#7f1d1d] transition-colors';
                    }

                    return (
                      <tr key={row.teamId} className={rowBgClass}>
                        {/* Rank */}
                        <td className="py-3 px-4 text-center font-black">
                          {row.debarred ? (
                            <span className="text-red-500 font-bold">—</span>
                          ) : row.rank === 1 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-400 text-stone-900 font-black text-xs shadow-sm">
                              1
                            </span>
                          ) : row.rank === 2 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-stone-300 text-stone-900 font-black text-xs shadow-sm">
                              2
                            </span>
                          ) : row.rank === 3 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-600 text-white font-black text-xs shadow-sm">
                              3
                            </span>
                          ) : (
                            <span className="text-stone-600 font-bold">{row.rank ?? '—'}</span>
                          )}
                        </td>

                        {/* Team Name */}
                        <td className="py-3 px-4">
                          <div className="font-bold text-sm text-[#1c140e] flex items-center gap-2">
                            <span>{row.teamName}</span>
                            {row.rank === 1 && <Crown size={14} className="text-amber-500 fill-amber-500" />}
                          </div>
                          <div className="text-[10px] text-stone-500 font-mono mt-0.5">{row.teamId}</div>
                        </td>

                        {/* Score */}
                        <td className="py-3 px-4 text-center">
                          <span className="font-black text-base text-[#1c140e]">{row.score}</span>
                          <span className="text-[10px] text-stone-400 font-mono ml-0.5">pts</span>
                        </td>

                        {/* Time Taken */}
                        <td className="py-3 px-4 text-center text-stone-600 font-mono">
                          {formatTime(row.timeTaken || 0)}
                        </td>

                        {/* Cutoff Status */}
                        <td className="py-3 px-4 text-center">
                          {row.debarred ? (
                            <span className="text-[10px] font-bold text-red-600 uppercase">Debarred</span>
                          ) : isRankTop ? (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                              Top {cutoff}
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-stone-500 bg-stone-200/80 px-2 py-0.5 rounded-full">
                              Below Cutoff
                            </span>
                          )}
                        </td>

                        {/* Qualification Status Badge */}
                        <td className="py-3 px-4 text-right">
                          {row.debarred ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
                              <ShieldAlert size={12} />
                              <span>DEBARRED</span>
                            </span>
                          ) : isQualified ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-[#dcfce7] text-[#166534] border border-[#86efac] shadow-sm">
                              <CheckCircle2 size={13} className="text-[#16a34a]" />
                              <span>QUALIFIED</span>
                            </span>
                          ) : isEliminated ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-[#fee2e2] text-[#991b1b] border border-[#fca5a5]">
                              <XCircle size={13} className="text-[#dc2626]" />
                              <span>ELIMINATED</span>
                            </span>
                          ) : isProjectedQual ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                              <CheckCircle2 size={12} className="text-emerald-600" />
                              <span>PROJECTED QUALIFIED</span>
                            </span>
                          ) : isProjectedElim ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-red-50 text-red-800 border border-red-300">
                              <XCircle size={12} className="text-red-500" />
                              <span>PROJECTED ELIMINATED</span>
                            </span>
                          ) : (
                            <span className="text-stone-400 font-mono text-xs">PENDING</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};
