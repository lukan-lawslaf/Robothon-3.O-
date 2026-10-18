import React from 'react';
import { CheckpointMilestone } from '../../types/checkpoint';
import { StatusBadge } from '../common/StatusBadge';
import { Button } from '../common/Button';
import { Check, Send, Award, MessageSquare } from 'lucide-react';

interface CheckpointCardProps {
  milestone: CheckpointMilestone;
  onApplyForReview: (milestoneId: string) => void;
  isSubmitting?: boolean;
}

export const CheckpointCard: React.FC<CheckpointCardProps> = ({
  milestone,
  onApplyForReview,
  isSubmitting = false,
}) => {
  const isAvailable = milestone.status === 'available' || milestone.status === 'rejected';
  const isApproved = milestone.status === 'approved';
  const isInReview = milestone.status === 'in_review';

  return (
    <div
      className={`relative p-5 rounded-2xl border transition-all duration-200 ${
        isApproved
          ? 'bg-slate-900/60 border-emerald-500/30'
          : isInReview
          ? 'bg-slate-900/70 border-amber-500/40 glow-cyan'
          : isAvailable
          ? 'bg-slate-900/90 border-cyan-500/40 hover:border-cyan-400/60'
          : 'bg-slate-950/40 border-slate-800/80 opacity-75'
      }`}
    >
      {/* Top Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center font-mono font-bold text-sm ${
              isApproved
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : 'bg-slate-800 text-slate-300 border border-slate-700'
            }`}
          >
            {milestone.order}
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
              {milestone.category}
            </span>
            <h4 className="text-base font-semibold text-white leading-tight">
              {milestone.title}
            </h4>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1.5">
          <StatusBadge status={milestone.status} />
          <div className="flex items-center gap-1 text-xs font-mono font-semibold text-cyan-300">
            <Award className="w-3.5 h-3.5 text-cyan-400" />
            {isApproved ? `${milestone.awardedPoints} / ${milestone.maxPoints} pts` : `Max: ${milestone.maxPoints} pts`}
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="mt-3 text-xs text-slate-300 leading-relaxed">
        {milestone.description}
      </p>

      {/* Verification Requirements Checklist */}
      <div className="mt-4 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Admin Inspection Criteria:
        </p>
        <ul className="space-y-1.5">
          {milestone.requirements.map((req, idx) => (
            <li key={idx} className="flex items-center gap-2 text-xs text-slate-300">
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                isApproved ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'
              }`}>
                <Check className="w-2.5 h-2.5" />
              </span>
              <span>{req}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Admin Feedback note (if approved or rejected) */}
      {milestone.feedback && (
        <div className="mt-3 p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/60 flex items-start gap-2 text-xs text-slate-300">
          <MessageSquare className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-white">{milestone.reviewedBy || 'Admin'}: </span>
            <span className="text-slate-300 italic">{milestone.feedback}</span>
          </div>
        </div>
      )}

      {/* Action footer */}
      <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
        <span className="text-[11px] text-slate-500">
          {isApproved
            ? `Verified at ${milestone.reviewedAt || 'Today'}`
            : isInReview
            ? 'Waiting for physical hardware inspection...'
            : isAvailable
            ? 'Hardware milestone ready'
            : 'Complete prior milestone to unlock'}
        </span>

        {isAvailable && (
          <Button
            size="sm"
            variant="primary"
            onClick={() => onApplyForReview(milestone.id)}
            isLoading={isSubmitting}
          >
            <Send className="w-3.5 h-3.5" />
            Apply for Review
          </Button>
        )}
      </div>
    </div>
  );
};
