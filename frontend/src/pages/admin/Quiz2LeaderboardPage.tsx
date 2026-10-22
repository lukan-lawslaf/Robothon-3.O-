import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { quizService, Quiz, TemporaryLeaderboardRow } from '../../services/quizService';
import {
  Trophy,
  Crown,
  Search,
  ChevronRight,
  RefreshCw,
  ArrowRight,
  Zap
} from 'lucide-react';

export const Quiz2LeaderboardPage: React.FC = () => {
  const quizId = 'quiz-2';
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [overallRows, setOverallRows] = useState<TemporaryLeaderboardRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [listRes, boardRes] = await Promise.all([
        quizService.list(true).catch(() => ({ quizzes: [] })),
        quizService.leaderboard(quizId).catch(() => ({ leaderboard: [], rows: [] } as any))
      ]);

      const targetQuiz = listRes.quizzes.find(q => q.id === quizId) || null;
      setQuiz(targetQuiz);

      const rows = (boardRes as any).leaderboard || (boardRes as any).rows || [];
      setOverallRows(rows);
    } catch (err) {
      console.error('Failed to load Quiz 2 data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // SSE real-time listener
  useEffect(() => {
    const sse = new EventSource(`/api/events?quizId=${quizId}`);
    const handleUpdate = () => loadData();

    sse.addEventListener('LEADERBOARD_UPDATED', handleUpdate);
    sse.addEventListener('STAGE_UPDATE', handleUpdate);
    sse.addEventListener('QUIZ_ENDED', handleUpdate);

    return () => sse.close();
  }, [quizId]);

  const filteredOverall = useMemo(() => {
    const list = overallRows.filter(r =>
      r.teamName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.teamId.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Strictly sort from highest score to lowest score (with tie-breaker on server completion time)
    return [...list].sort((a, b) => {
      if (a.debarred && !b.debarred) return 1;
      if (!a.debarred && b.debarred) return -1;
      const scoreDiff = (b.score ?? 0) - (a.score ?? 0);
      if (scoreDiff !== 0) return scoreDiff;
      return (a.timeTaken ?? 0) - (b.timeTaken ?? 0);
    }).map((r, idx) => ({
      ...r,
      rank: r.debarred ? '—' : (idx + 1)
    }));
  }, [overallRows, searchQuery]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-[#FEF3E2] text-[#251306] p-4 sm:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Top Breadcrumb & Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-stone-500 mb-1">
              <Link to="/admin-dashboard" className="hover:text-[#ea580c] transition-colors">Admin Portal</Link>
              <ChevronRight size={12} />
              <Link to="/admin/quizzes" className="hover:text-[#ea580c] transition-colors">Quiz Ops</Link>
              <ChevronRight size={12} />
              <span className="text-[#ea580c] font-bold">Quiz 2 Leaderboard</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-orange-100 flex items-center justify-center text-[#ea580c]">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#1c140e] flex items-center gap-2">
                  Quiz 2 — Bonus Round Leaderboard
                </h1>
                <p className="text-xs sm:text-sm text-stone-600 font-mono mt-0.5">
                  Live rankings, bonus scores, and server-authoritative attempt statistics.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/admin/quizzes/leaderboard/quiz-1"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-stone-200 text-stone-700 hover:text-[#ea580c] text-xs font-mono font-bold transition-all shadow-sm"
            >
              <span>View Quiz 1 Board</span>
              <ArrowRight size={14} />
            </Link>

            <button
              onClick={loadData}
              className="p-2.5 rounded-xl bg-white border border-stone-200 text-stone-600 hover:text-[#ea580c] transition-colors cursor-pointer"
              title="Refresh"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Search & Stats Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-stone-200 shadow-sm">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-[#ea580c]" />
            <span className="font-black text-sm text-[#1c140e]">Bonus Round Standings</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-orange-50 text-[#ea580c] border border-orange-200">
              {overallRows.length} Teams
            </span>
          </div>

          <div className="relative min-w-[240px] sm:w-72">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Search team name or ID..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs font-mono rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#ea580c] bg-stone-50"
            />
          </div>
        </div>

        {/* OVERALL QUIZ 2 LEADERBOARD TABLE */}
        <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead>
                <tr className="bg-stone-50 text-stone-500 uppercase tracking-wider border-b border-stone-200">
                  <th className="py-3 px-4 w-16 text-center">Rank</th>
                  <th className="py-3 px-4">Team</th>
                  <th className="py-3 px-4 text-center">Bonus Score</th>
                  <th className="py-3 px-4 text-center">Server Time</th>
                  <th className="py-3 px-4 text-right">Attempt Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredOverall.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-16 text-stone-400">
                      <Trophy className="w-12 h-12 mx-auto text-stone-300 mb-3" />
                      <p className="font-bold text-sm text-stone-600">No teams found for Quiz 2.</p>
                      <p className="text-xs text-stone-400 mt-1">Quiz 2 attempt results will automatically stream here.</p>
                    </td>
                  </tr>
                ) : (
                  filteredOverall.map((row) => (
                    <tr key={row.teamId} className="hover:bg-stone-50/80 transition-colors">
                      <td className="py-3.5 px-4 text-center font-black">
                        {row.rank === 1 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-400 text-stone-900 font-black text-xs shadow-sm">
                            1
                          </span>
                        ) : row.rank === 2 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-stone-300 text-stone-900 font-black text-xs shadow-sm">
                            2
                          </span>
                        ) : row.rank === 3 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-600 text-white font-black text-xs shadow-sm">
                            3
                          </span>
                        ) : (
                          <span className="text-stone-600 font-bold text-sm">{row.rank ?? '—'}</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-sm text-[#1c140e] flex items-center gap-2">
                          <span>{row.teamName}</span>
                          {row.rank === 1 && <Crown size={15} className="text-amber-500 fill-amber-500" />}
                        </div>
                        <div className="text-[11px] text-stone-400 font-mono mt-0.5">{row.teamId}</div>
                      </td>

                      <td className="py-3.5 px-4 text-center font-black text-base text-[#ea580c]">
                        +{row.score} <span className="text-[10px] text-stone-400 font-mono">pts</span>
                      </td>

                      <td className="py-3.5 px-4 text-center text-stone-600 font-mono">
                        {formatTime(row.timeTaken || 0)}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-stone-100 text-stone-700 border border-stone-200">
                          {row.status || row.qualificationStatus || 'COMPLETED'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};
