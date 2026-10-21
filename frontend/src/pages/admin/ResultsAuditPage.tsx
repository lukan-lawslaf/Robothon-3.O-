import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { quizService, Quiz, TemporaryLeaderboardRow } from '../../services/quizService';
import {
  Award,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Lock,
  Sliders,
  Sparkles,
  UserX,
  Edit2
} from 'lucide-react';

export const ResultsAuditPage: React.FC = () => {
  const searchParams = new URLSearchParams(useLocation().search);
  const requestedQuizId = searchParams.get('quiz') || 'quiz-1';

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedQuizId, setSelectedQuizId] = useState(requestedQuizId);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [rows, setRows] = useState<TemporaryLeaderboardRow[]>([]);
  const [cutoff, setCutoff] = useState<number>(40);

  // Intervention modals
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [targetTeamId, setTargetTeamId] = useState('');
  const [adjustScoreVal, setAdjustScoreVal] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState('');

  const [showDebarModal, setShowDebarModal] = useState(false);
  const [debarReason, setDebarReason] = useState('');

  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const fetchResults = async (qId: string) => {
    try {
      const catalog = await quizService.list(true);
      setQuizzes(catalog.quizzes);
      const target = catalog.quizzes.find(q => q.id === qId) || catalog.quizzes[0];
      if (!target) return;

      setSelectedQuizId(target.id);
      setQuiz(target);
      setCutoff(target.qualificationCount || 40);

      const lbRes = await quizService.leaderboard(target.id);
      setRows(lbRes.leaderboard || []);
    } catch (err: any) {
      setError(err.message || 'Cannot load results.');
    }
  };

  useEffect(() => {
    fetchResults(selectedQuizId);
  }, [selectedQuizId]);

  const handleUpdateCutoff = async (newVal: number) => {
    setCutoff(newVal);
    try {
      await quizService.updateConfig(selectedQuizId, {
        qualificationCount: newVal,
        forceLiveEdit: true
      });
      setNotice(`Qualification cutoff updated to Top ${newVal}.`);
      setTimeout(() => setNotice(''), 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to update cutoff on server.');
    }
  };

  const handleAdjustScore = async () => {
    if (!adjustReason.trim()) {
      setError('Audit reason is required for live score adjustment.');
      return;
    }
    try {
      setBusy(true);
      await quizService.adjustScore(selectedQuizId, targetTeamId, {
        score: adjustScoreVal,
        reason: adjustReason.trim()
      });
      setNotice(`Score adjusted for team ${targetTeamId}.`);
      setShowAdjustModal(false);
      setAdjustReason('');
      fetchResults(selectedQuizId);
    } catch (err: any) {
      setError(err.message || 'Score adjustment failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleMoveToQualified = async (teamId: string, status: 'QUALIFIED' | 'AUTO' = 'QUALIFIED') => {
    try {
      setBusy(true);
      setError('');
      await quizService.qualifyTeam(selectedQuizId, teamId, {
        status,
        reason: status === 'QUALIFIED' ? 'Promoted to qualified by Admin prior to finalization' : 'Reset manual qualification override'
      });
      setNotice(status === 'QUALIFIED' ? (`Team ${teamId} has been moved to Qualified status.`) : (`Team ${teamId} reset to automatic cutoff.`));
      fetchResults(selectedQuizId);
    } catch (err: any) {
      setError(err.message || 'Failed to update qualification status.');
    } finally {
      setBusy(false);
    }
  };

  const handleDebarTeam = async (shouldDebar: boolean) => {
    if (shouldDebar && !debarReason.trim()) {
      setError('Debarment reason is required.');
      return;
    }
    try {
      setBusy(true);
      await quizService.debarTeam(selectedQuizId, targetTeamId, {
        debar: shouldDebar,
        reason: debarReason.trim() || 'Debarment restored'
      });
      setNotice(`Team ${targetTeamId} ${shouldDebar ? 'debarred' : 'reinstated'}.`);
      setShowDebarModal(false);
      setDebarReason('');
      fetchResults(selectedQuizId);
    } catch (err: any) {
      setError(err.message || 'Debarment action failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleFinalize = async () => {
    try {
      setBusy(true);
      await quizService.control(selectedQuizId, 'finalize');
      setNotice('Quiz results and qualification permanently finalized! Committed to Global Leaderboard.');
      setShowFinalizeModal(false);
      fetchResults(selectedQuizId);
    } catch (err: any) {
      setError(err.message || 'Finalization failed.');
    } finally {
      setBusy(false);
    }
  };

  const isFinalized = quiz?.status === 'FINALIZED';

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 text-[#251306]">
      
      {/* Top Header */}
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
              Results & Audit
            </h1>
          </div>
        </div>

        {/* Finalize Action */}
        <div>
          {!isFinalized ? (
            <button
              type="button"
              onClick={() => setShowFinalizeModal(true)}
              className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-md transition-all cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Finalize Qualification</span>
            </button>
          ) : (
            <div className="px-4 py-2 rounded-2xl bg-purple-100 border border-purple-200 font-mono text-xs text-purple-900 font-bold flex items-center gap-2">
              <Lock className="w-4 h-4 text-purple-700" />
              <span>Qualification Permanently Finalized</span>
            </div>
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

      {/* Qualification Threshold Settings Card */}
      <div className="mt-6 bg-white rounded-3xl p-6 border border-orange-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono uppercase font-bold text-[#D4621A] block">
            Configurable Cutoff Threshold
          </span>
          <h3 className="text-lg font-bold text-[#251306] mt-0.5">
            Advancement Slot Count
          </h3>
          <p className="text-xs font-mono text-stone-500 mt-1">
            Adjust the qualifying threshold. The visual demarcation adjusts dynamically without source code edits.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label htmlFor="cutoff-input" className="text-xs font-mono font-bold text-stone-600">
            Top Qualifying Teams:
          </label>
          <input
            type="number"
            id="cutoff-input"
            disabled={isFinalized}
            value={cutoff}
            onChange={(e) => handleUpdateCutoff(Number(e.target.value))}
            className="w-24 p-2 rounded-xl bg-stone-50 border border-stone-300 text-sm font-mono font-bold text-[#251306] text-center focus:outline-none focus:border-[#D4621A]"
          />
        </div>
      </div>

      {/* Adjudication Ranked Table */}
      <div className="mt-6 bg-white rounded-3xl border border-orange-200 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-stone-100 flex items-center justify-between bg-[#FEF3E2]/50 font-mono text-xs">
          <span className="font-bold uppercase tracking-wider text-stone-600">
            Adjudication Standings ({rows.length} Teams)
          </span>
          <span className="text-[#D4621A] font-bold">Deterministic Ranking Engine</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-mono text-xs">
            <thead>
              <tr className="bg-stone-50 text-stone-500 uppercase border-b border-stone-200 text-[10px] tracking-wider">
                <th className="py-3 px-4 w-16 text-center">Rank</th>
                <th className="py-3 px-4">Team</th>
                <th className="py-3 px-4 text-right">Score</th>
                <th className="py-3 px-4 text-right">Time Taken</th>
                <th className="py-3 px-4 text-center">Qualification Status</th>
                <th className="py-3 px-4 text-center">Admin Interventions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-[#251306]">
              {rows.map((row, idx) => {
                const isDebarred = Boolean(row.debarred);
                const isManualQualified = row.qualificationStatus === 'QUALIFIED' && idx >= cutoff;
                const isQualifying = !isDebarred && (row.qualificationStatus === 'QUALIFIED' || idx < cutoff);
                const isCutoffLine = idx === cutoff - 1;

                return (
                  <React.Fragment key={row.teamId}>
                    <tr className={`hover:bg-orange-50/40 transition-colors ${
                      isDebarred ? 'bg-red-50/50 opacity-70' : isQualifying ? 'bg-emerald-50/20' : ''
                    }`}>
                      <td className="py-3.5 px-4 text-center font-bold">
                        <span className={`inline-block px-2.5 py-1 rounded-xl ${
                          idx < 3 ? 'bg-[#D4621A] text-white' : 'text-stone-600'
                        }`}>
                          #{idx + 1}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-bold font-sans text-sm text-[#251306]">
                        {row.teamName || row.teamId}
                      </td>

                      <td className="py-3.5 px-4 text-right font-bold text-[#D4621A]">
                        {row.score} pts
                      </td>

                      <td className="py-3.5 px-4 text-right text-stone-500">
                        {Math.floor(row.timeTaken / 60)}m {String(row.timeTaken % 60).padStart(2, '0')}s
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {isDebarred ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-red-100 text-red-800">
                            Debarred
                          </span>
                        ) : isFinalized ? (
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            row.qualificationStatus === 'QUALIFIED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-stone-100 text-stone-600'
                          }`}>
                            {row.qualificationStatus || (isQualifying ? 'QUALIFIED' : 'ELIMINATED')}
                          </span>
                        ) : (
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            row.qualificationStatus === 'QUALIFIED' || isQualifying
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {row.qualificationStatus === 'QUALIFIED'
                              ? (isManualQualified ? 'Qualified (Override)' : 'Projected Qualified')
                              : isQualifying
                              ? 'Projected Qualified'
                              : 'Projected Eliminated'}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {!isFinalized ? (
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            {!isDebarred && (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => handleMoveToQualified(row.teamId, isManualQualified ? 'AUTO' : 'QUALIFIED')}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer border ${
                                  isManualQualified
                                    ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                                    : row.qualificationStatus === 'QUALIFIED'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                    : 'bg-emerald-600 text-white hover:bg-emerald-700 border-emerald-600 shadow-sm'
                                }`}
                                title={isManualQualified ? 'Reset back to automatic rank cutoff' : 'Move eliminated team to qualified status before finalization'}
                              >
                                {isManualQualified ? 'Revert Auto' : (row.qualificationStatus === 'QUALIFIED' ? 'Qualified' : 'Move to Qualified')}
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                setTargetTeamId(row.teamId);
                                setAdjustScoreVal(row.score);
                                setShowAdjustModal(true);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-[10px] font-bold transition-colors cursor-pointer"
                            >
                              Adjust Score
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setTargetTeamId(row.teamId);
                                if (isDebarred) {
                                  handleDebarTeam(false);
                                } else {
                                  setShowDebarModal(true);
                                }
                              }}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${
                                isDebarred
                                  ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                  : 'bg-red-50 text-red-700 hover:bg-red-100'
                              }`}
                            >
                              {isDebarred ? 'Restore' : 'Debar'}
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-stone-400">Locked</span>
                        )}
                      </td>
                    </tr>

                    {/* Cutoff Demarcation Line */}
                    {isCutoffLine && (
                      <tr className="bg-[#D4621A] text-white font-mono text-[11px] font-bold">
                        <td colSpan={6} className="py-2 px-4 text-center tracking-wider">
                          ▲ TOP {cutoff} ADVANCE TO BOAT TRIALS — TEAMS BELOW ARE ELIMINATED ▼
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}

              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-stone-400 font-mono text-xs">
                    No evaluated submissions found for this round.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Adjust Score Modal */}
      {showAdjustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-orange-200 shadow-2xl space-y-4">
            <h3 className="text-xl font-bold text-[#251306]">Adjust Team Score</h3>
            <p className="text-xs font-mono text-stone-600">
              Modifying score for <strong>{targetTeamId}</strong>.
            </p>

            <div>
              <label htmlFor="adjust-score-input" className="block text-xs font-mono uppercase font-bold text-stone-600 mb-1">
                New Absolute Score:
              </label>
              <input
                type="number"
                id="adjust-score-input"
                value={adjustScoreVal}
                onChange={(e) => setAdjustScoreVal(Number(e.target.value))}
                className="w-full p-3 rounded-xl bg-stone-50 border border-stone-300 font-mono text-sm font-bold text-[#251306]"
              />
            </div>

            <div>
              <label htmlFor="adjust-reason-input" className="block text-xs font-mono uppercase font-bold text-stone-600 mb-1">
                Audit Reason (Mandatory):
              </label>
              <textarea
                rows={3}
                id="adjust-reason-input"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                className="w-full p-3 rounded-xl bg-stone-50 border border-stone-300 text-xs font-mono text-[#251306]"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowAdjustModal(false)}
                className="px-4 py-2 rounded-xl border border-stone-300 font-mono text-xs font-bold text-stone-700 hover:bg-stone-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={handleAdjustScore}
                className="px-5 py-2 rounded-xl bg-[#D4621A] text-white font-mono text-xs font-bold uppercase hover:bg-[#b85214] cursor-pointer disabled:opacity-50"
              >
                Save Adjustment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Debar Team Modal */}
      {showDebarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-orange-200 shadow-2xl space-y-4">
            <h3 className="text-xl font-bold text-[#251306]">Debar Team from Competition</h3>
            <p className="text-xs font-mono text-stone-600">
              Debarring team <strong>{targetTeamId}</strong>. Debarred teams do not consume qualification slots.
            </p>

            <div>
              <label htmlFor="debar-reason-input" className="block text-xs font-mono uppercase font-bold text-stone-600 mb-1">
                Debarment Reason (Mandatory):
              </label>
              <textarea
                rows={3}
                id="debar-reason-input"
                value={debarReason}
                onChange={(e) => setDebarReason(e.target.value)}
                className="w-full p-3 rounded-xl bg-stone-50 border border-stone-300 text-xs font-mono text-[#251306]"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDebarModal(false)}
                className="px-4 py-2 rounded-xl border border-stone-300 font-mono text-xs font-bold text-stone-700 hover:bg-stone-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => handleDebarTeam(true)}
                className="px-5 py-2 rounded-xl bg-red-600 text-white font-mono text-xs font-bold uppercase hover:bg-red-700 cursor-pointer disabled:opacity-50"
              >
                Confirm Debarment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Finalize Confirmation Modal */}
      {showFinalizeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-orange-200 shadow-2xl space-y-4 text-center flex flex-col items-center">
            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-[#251306]">Finalize Qualification?</h3>
              <p className="text-xs font-mono text-stone-600 mt-2 leading-relaxed">
                This locks qualification permanently. Official round scores will be committed to the <strong>Global Robothon Leaderboard</strong>.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 w-full pt-2">
              <button
                type="button"
                onClick={() => setShowFinalizeModal(false)}
                className="py-3 px-4 rounded-xl border border-stone-300 font-mono text-xs font-bold text-stone-700 hover:bg-stone-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={handleFinalize}
                className="py-3 px-4 rounded-xl bg-emerald-600 text-white font-mono text-xs font-bold uppercase hover:bg-emerald-700 shadow-md cursor-pointer disabled:opacity-50"
              >
                {busy ? 'Committing…' : 'Finalize Now'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
