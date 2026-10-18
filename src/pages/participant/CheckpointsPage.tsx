import React, { useState, useEffect } from 'react';
import { CheckpointMilestone } from '../../types/checkpoint';
import { CheckpointCard } from '../../components/participant/CheckpointCard';
import { getTeamCheckpoints, applyForReview } from '../../services/checkpointService';
import { MOCK_CURRENT_TEAM } from '../../mockData/teams.mock';
import { CheckSquare, ShieldCheck, Clock, AlertCircle } from 'lucide-react';

export const CheckpointsPage: React.FC = () => {
  const [checkpoints, setCheckpoints] = useState<CheckpointMilestone[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    const fetchCheckpoints = async () => {
      const data = await getTeamCheckpoints(MOCK_CURRENT_TEAM.id);
      setCheckpoints(data);
    };
    fetchCheckpoints();
  }, []);

  const handleApply = async (milestoneId: string) => {
    try {
      setSubmittingId(milestoneId);
      const res = await applyForReview(MOCK_CURRENT_TEAM.id, milestoneId, MOCK_CURRENT_TEAM.tableNumber);

      // Update state locally
      setCheckpoints((prev) =>
        prev.map((c) => (c.id === milestoneId ? res.updatedCheckpoint : c))
      );

      setNotification(`Review requested for "${res.updatedCheckpoint.title}". An admin will visit Table ${MOCK_CURRENT_TEAM.tableNumber} shortly.`);
      setTimeout(() => setNotification(null), 6000);
    } finally {
      setSubmittingId(null);
    }
  };

  const categories = ['all', 'hull', 'propulsion', 'electronics', 'waterproofing', 'testing'];

  const filteredCheckpoints =
    selectedCategory === 'all'
      ? checkpoints
      : checkpoints.filter((c) => c.category === selectedCategory);

  const completedCount = checkpoints.filter((c) => c.status === 'approved').length;
  const inReviewCount = checkpoints.filter((c) => c.status === 'in_review').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400">
            Round 2 Hardware Milestones
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
            Boat-Building Checkpoints
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Complete milestones sequentially. Apply for physical hardware inspection to earn high-weightage points.
          </p>
        </div>

        {/* Progress Counters */}
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" />
            <span>{completedCount} Completed</span>
          </div>

          <div className="px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>{inReviewCount} In Review</span>
          </div>
        </div>
      </div>

      {/* Notification Banner */}
      {notification && (
        <div className="p-4 rounded-xl bg-cyan-500/15 border border-cyan-400/40 text-cyan-200 text-xs font-medium flex items-center gap-3 shadow-lg shadow-cyan-500/10 animate-fadeIn">
          <AlertCircle className="w-5 h-5 text-cyan-400 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold capitalize whitespace-nowrap transition-all ${
              selectedCategory === cat
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Checkpoints Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredCheckpoints.map((milestone) => (
          <CheckpointCard
            key={milestone.id}
            milestone={milestone}
            onApplyForReview={handleApply}
            isSubmitting={submittingId === milestone.id}
          />
        ))}
      </div>
    </div>
  );
};
