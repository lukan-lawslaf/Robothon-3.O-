import React from 'react';
import { CheckCircle2, Clock, Lock, XCircle, AlertCircle } from 'lucide-react';
import { CheckpointStatus } from '../../types/checkpoint';

interface StatusBadgeProps {
  status: CheckpointStatus | 'pending';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  switch (status) {
    case 'approved':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 ${className}`}>
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          Approved
        </span>
      );
    case 'in_review':
    case 'pending':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 ${className}`}>
          <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          In Review
        </span>
      );
    case 'available':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 ${className}`}>
          <AlertCircle className="w-3.5 h-3.5 text-cyan-400" />
          Ready to Submit
        </span>
      );
    case 'rejected':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/30 ${className}`}>
          <XCircle className="w-3.5 h-3.5 text-red-400" />
          Needs Rework
        </span>
      );
    case 'locked':
    default:
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700 ${className}`}>
          <Lock className="w-3.5 h-3.5 text-slate-400" />
          Locked
        </span>
      );
  }
};
