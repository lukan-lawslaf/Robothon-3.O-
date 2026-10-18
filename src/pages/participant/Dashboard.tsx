import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { QualificationBanner } from '../../components/participant/QualificationBanner';
import { StatCard } from '../../components/common/StatCards';
import { Button } from '../../components/common/Button';
import { MOCK_CURRENT_TEAM } from '../../mockData/teams.mock';
import { CheckpointMilestone } from '../../types/checkpoint';
import { getTeamCheckpoints } from '../../services/checkpointService';
import { getTeamRankSummary } from '../../services/leaderboardService';
import { LeaderboardEntry } from '../../types/leaderboard';
import { Trophy, CheckSquare, HelpCircle, Anchor, ArrowRight, Zap, Award } from 'lucide-react';

export const ParticipantDashboard: React.FC = () => {
  const [checkpoints, setCheckpoints] = useState<CheckpointMilestone[]>([]);
  const [rankSummary, setRankSummary] = useState<LeaderboardEntry | undefined>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [cpData, rankData] = await Promise.all([
          getTeamCheckpoints(MOCK_CURRENT_TEAM.id),
          getTeamRankSummary(MOCK_CURRENT_TEAM.id),
        ]);
        setCheckpoints(cpData);
        setRankSummary(rankData);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const completedCheckpoints = checkpoints.filter((c) => c.status === 'approved').length;
  const inReviewCheckpoints = checkpoints.filter((c) => c.status === 'in_review').length;
  const nextMilestone = checkpoints.find((c) => c.status === 'available' || c.status === 'in_review');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      {/* Team Welcome Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              Table {MOCK_CURRENT_TEAM.tableNumber}
            </span>
            <span className="text-xs text-slate-400 font-medium">
              {MOCK_CURRENT_TEAM.college}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
            {MOCK_CURRENT_TEAM.teamName}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Team Lead: {MOCK_CURRENT_TEAM.leaderName} • {MOCK_CURRENT_TEAM.membersCount} Builders
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/participant/checkpoints">
            <Button variant="primary" size="md">
              <CheckSquare className="w-4 h-4" />
              View Checkpoints
            </Button>
          </Link>
          <Link to="/leaderboard">
            <Button variant="outline" size="md">
              <Trophy className="w-4 h-4" />
              Leaderboard
            </Button>
          </Link>
        </div>
      </div>

      {/* Qualification Banner */}
      <QualificationBanner
        status={MOCK_CURRENT_TEAM.qualifiedRound1 ? 'qualified' : 'disqualified'}
        rank={rankSummary?.rank || 1}
        totalTeams={100}
      />

      {/* Key Metric Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Current Rank"
          value={rankSummary ? `#${rankSummary.rank}` : '#1'}
          subValue="Top 50 Advance"
          icon={Trophy}
          colorScheme="amber"
        />
        <StatCard
          label="Total Score"
          value={rankSummary ? `${rankSummary.totalScore} pts` : '235 pts'}
          subValue="Checkpoints + Quizzes + Games"
          icon={Zap}
          colorScheme="cyan"
        />
        <StatCard
          label="Boat Milestones"
          value={`${completedCheckpoints} / 10`}
          subValue={inReviewCheckpoints > 0 ? `${inReviewCheckpoints} In Review` : 'Ready for Next'}
          icon={CheckSquare}
          colorScheme="emerald"
        />
        <StatCard
          label="Mini-Game Bonus"
          value={rankSummary ? `+${rankSummary.breakdown.miniGameScore} pts` : '+20 pts'}
          subValue="Design Team Activities"
          icon={Award}
          colorScheme="blue"
        />
      </div>

      {/* Next Active Milestone Spotlight */}
      {nextMilestone && (
        <div className="p-6 rounded-3xl bg-gradient-to-r from-blue-950/40 via-slate-900 to-slate-900 border border-cyan-500/30 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center font-mono font-bold text-lg shrink-0">
                {nextMilestone.order}
              </div>
              <div>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400">
                  Current Hardware Objective • {nextMilestone.category}
                </span>
                <h3 className="text-lg sm:text-xl font-bold text-white mt-0.5">
                  {nextMilestone.title}
                </h3>
                <p className="text-xs text-slate-300 mt-1 max-w-xl">
                  {nextMilestone.description}
                </p>
              </div>
            </div>

            <Link to="/participant/checkpoints" className="shrink-0">
              <Button variant="primary" size="md">
                Continue Checkpoint
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Event Schedule Quick Reference */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
          <h4 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-2">
            <Anchor className="w-4 h-4 text-cyan-400" />
            Competition Phases
          </h4>
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/80">
              <span className="font-semibold text-slate-200">Phase 1: Elimination Quiz</span>
              <span className="text-emerald-400 font-mono font-bold">COMPLETED</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-cyan-950/30 border border-cyan-500/30">
              <span className="font-semibold text-cyan-300">Phase 2: Boat-Building Milestones</span>
              <span className="text-cyan-400 font-mono font-bold animate-pulse">IN PROGRESS</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/80">
              <span className="font-semibold text-slate-400">Phase 3: Component Quiz & Pool Runs</span>
              <span className="text-slate-500 font-mono">UPCOMING</span>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
          <h4 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-cyan-400" />
            Inspection Reminders
          </h4>
          <ul className="space-y-2 text-xs text-slate-300">
            <li className="flex items-start gap-2">
              <span className="text-cyan-400 font-bold">•</span>
              Keep your table neat and your boat accessible for rapid technical checks.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyan-400 font-bold">•</span>
              Once you click "Apply for Review", an admin will visit your designated table.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyan-400 font-bold">•</span>
              Never immerse electronic chambers without prior gasket inspection by tech staff.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
