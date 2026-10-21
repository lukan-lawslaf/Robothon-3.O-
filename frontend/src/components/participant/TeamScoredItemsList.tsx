import React, { useEffect, useState } from 'react';
import { MockCheckpoint, MockTeam } from '../../mockData';
import { getStoredBonuses, BonusAward } from '../../services/stateStore';
import { quizService, Quiz, Attempt } from '../../services/quizService';
import { useAccount } from '../../services/authService';
import { Award, CheckCircle2, Trophy, HelpCircle, Gamepad2, Sparkles, Clock } from 'lucide-react';

interface Props {
  team: MockTeam | null;
  checkpoints: MockCheckpoint[];
  quizzes?: Quiz[] | null;
}

interface ScoredItem {
  id: string;
  type: 'CHECKPOINT' | 'QUIZ' | 'BONUS';
  title: string;
  subtitle: string;
  points: number;
  markedAt?: string;
  badgeText: string;
  badgeColor: string;
}

export const TeamScoredItemsList: React.FC<Props> = ({ team, checkpoints, quizzes }) => {
  const account = useAccount();
  const [bonuses, setBonuses] = useState<BonusAward[]>([]);
  const [quizAttempts, setQuizAttempts] = useState<Record<string, Attempt>>({});
  const [loadingAttempts, setLoadingAttempts] = useState(false);

  useEffect(() => {
    const updateBonuses = () => {
      const all = getStoredBonuses();
      const myBonuses = all.filter(b => b.teamId === (team?.id || account?.teamId));
      setBonuses(myBonuses);
    };
    updateBonuses();
    window.addEventListener('robothon_store_updated', updateBonuses);
    return () => window.removeEventListener('robothon_store_updated', updateBonuses);
  }, [team?.id, account?.teamId]);

  // Load quiz scores for this team
  useEffect(() => {
    let alive = true;
    const loadQuizScores = async () => {
      if (!account?.teamId) return;
      try {
        setLoadingAttempts(true);
        const catalog = quizzes || (await quizService.list(true)).quizzes;
        const attemptsMap: Record<string, Attempt> = {};

        for (const q of catalog) {
          try {
            const res = await quizService.attempt(q.id);
            if (res.attempt && ((res.attempt.score ?? 0) > 0 || res.attempt.status === 'EVALUATED' || res.attempt.status === 'SUBMITTED')) {
              attemptsMap[q.id] = res.attempt;
            }
          } catch {
            // ignore
          }
        }
        if (alive) setQuizAttempts(attemptsMap);
      } catch {
        // ignore
      } finally {
        if (alive) setLoadingAttempts(false);
      }
    };
    loadQuizScores();
    return () => { alive = false; };
  }, [account?.teamId, quizzes]);

  // Build the list of ONLY marked items
  const markedItems: ScoredItem[] = [];

  // 1. Approved Checkpoints
  checkpoints.forEach((cp) => {
    if (cp.status === 'approved') {
      markedItems.push({
        id: `cp-${cp.id}`,
        type: 'CHECKPOINT',
        title: `${cp.code}: ${cp.title}`,
        subtitle: `Physical Milestone Inspection Verified`,
        points: cp.points,
        badgeText: 'Checkpoint Cleared',
        badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300'
      });
    }
  });

  // 2. Marked / Evaluated Quizzes
  Object.entries(quizAttempts).forEach(([qId, att]) => {
    if (att && ((att.score ?? 0) > 0 || att.status === 'EVALUATED' || att.status === 'SUBMITTED')) {
      const q = quizzes?.find(item => item.id === qId);
      markedItems.push({
        id: `quiz-${qId}`,
        type: 'QUIZ',
        title: q?.name || `Quiz Round (${qId})`,
        subtitle: `${Object.keys(att.answers || {}).length} answers recorded • Status: ${att.status}`,
        points: att.score ?? 0,
        badgeText: 'Quiz Evaluated',
        badgeColor: 'bg-orange-100 text-[#D4621A] border-orange-300'
      });
    }
  });

  // 3. Awarded Bonus Points & Adjustments
  bonuses.forEach((b) => {
    const isDeduction = b.points < 0;
    markedItems.push({
      id: `bonus-${b.id}`,
      type: 'BONUS',
      title: b.gameName,
      subtitle: b.awardedAt ? `${isDeduction ? 'Adjusted' : 'Awarded'} ${new Date(b.awardedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Score Adjustment',
      points: b.points,
      badgeText: isDeduction ? 'Point Deduction' : 'Bonus Award',
      badgeColor: isDeduction ? 'bg-red-100 text-red-900 border-red-300' : 'bg-amber-100 text-amber-900 border-amber-300'
    });
  });

  const totalMarkedPoints = markedItems.reduce((sum, item) => sum + item.points, 0);

  return (
    <section className="rounded-3xl bg-[#fdfcf9] border border-[#e8dfcf] p-5 sm:p-6 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-[#D4621A]" />
            <h2 className="text-lg font-bold text-stone-900">
              Verified Scoring &amp; Activity Log
            </h2>
          </div>
          <p className="text-xs text-stone-500 mt-0.5 font-mono">
            Itemized breakdown of all marked checkpoints, quiz attempts, and awarded bonus points.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-[#251306] text-[#FEF3E2] shadow-xs">
            {markedItems.length} Marked Items • {totalMarkedPoints >= 0 ? `+${totalMarkedPoints}` : totalMarkedPoints} pts Total
          </span>
        </div>
      </div>

      {markedItems.length === 0 ? (
        <div className="py-8 px-4 text-center text-stone-500 font-mono text-xs rounded-2xl bg-stone-50/70 border border-stone-200">
          <Clock className="w-6 h-6 mx-auto mb-2 text-stone-400 opacity-80" />
          <p className="font-bold text-stone-700">No scored items recorded yet.</p>
          <p className="text-[11px] text-stone-500 mt-1">
            As marshals approve your boat checkpoints, quizzes are completed, and minigame bonus points are awarded, each verified receipt will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5 max-h-[45vh] overflow-y-auto pr-1">
          {markedItems.map((item) => (
            <div
              key={item.id}
              className="p-3.5 sm:p-4 rounded-2xl border border-stone-200 bg-white hover:border-[#D4621A]/50 transition-all flex items-center justify-between gap-4 shadow-2xs"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${item.badgeColor}`}>
                  {item.type === 'CHECKPOINT' && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                  {item.type === 'QUIZ' && <Trophy className="w-5 h-5 text-[#D4621A]" />}
                  {item.type === 'BONUS' && <Sparkles className="w-5 h-5 text-amber-600" />}
                </div>

                <div className="truncate">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-stone-900 truncate">
                      {item.title}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${item.badgeColor}`}>
                      {item.badgeText}
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 font-mono mt-0.5 truncate">
                    {item.subtitle}
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className={`text-base sm:text-lg font-black font-mono ${item.points < 0 ? 'text-red-600' : 'text-[#D4621A]'}`}>
                  {item.points > 0 ? `+${item.points}` : item.points} pts
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
