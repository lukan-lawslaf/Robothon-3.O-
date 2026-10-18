import React from 'react';
import { ReviewTicket } from '../../types/checkpoint';
import { StatusBadge } from '../common/StatusBadge';
import { Button } from '../common/Button';
import { UserCheck, ShieldAlert } from 'lucide-react';

interface ReviewQueueTableProps {
  tickets: ReviewTicket[];
  onOpenReviewModal: (ticket: ReviewTicket) => void;
}

export const ReviewQueueTable: React.FC<ReviewQueueTableProps> = ({
  tickets,
  onOpenReviewModal,
}) => {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl">
      <table className="w-full text-left text-sm text-slate-300">
        <thead className="bg-slate-950/80 text-[11px] uppercase tracking-wider text-slate-400 font-semibold border-b border-slate-800">
          <tr>
            <th className="py-3.5 px-4">Ticket</th>
            <th className="py-3.5 px-4">Team</th>
            <th className="py-3.5 px-4">Table #</th>
            <th className="py-3.5 px-4">Checkpoint</th>
            <th className="py-3.5 px-4">Time</th>
            <th className="py-3.5 px-4">Status</th>
            <th className="py-3.5 px-4">Inspector</th>
            <th className="py-3.5 px-4 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/80 font-normal">
          {tickets.map((tkt) => {
            const isPending = tkt.status === 'pending';
            const isInReview = tkt.status === 'in_review';

            return (
              <tr
                key={tkt.ticketId}
                className="hover:bg-slate-800/40 transition-colors"
              >
                <td className="py-3 px-4 font-mono text-xs text-cyan-400 font-semibold">
                  {tkt.ticketId}
                </td>
                <td className="py-3 px-4 font-semibold text-white">
                  {tkt.teamName}
                </td>
                <td className="py-3 px-4 font-mono text-xs text-slate-300">
                  {tkt.tableNumber ? `Table ${tkt.tableNumber}` : '—'}
                </td>
                <td className="py-3 px-4 text-slate-200">
                  <div className="max-w-[220px] truncate" title={tkt.checkpointTitle}>
                    {tkt.checkpointTitle}
                  </div>
                </td>
                <td className="py-3 px-4 text-xs font-mono text-slate-400">
                  {tkt.requestedAt}
                </td>
                <td className="py-3 px-4">
                  <StatusBadge status={tkt.status} />
                </td>
                <td className="py-3 px-4 text-xs text-slate-300">
                  {tkt.assignedAdminName || <span className="text-slate-500 italic">Unassigned</span>}
                </td>
                <td className="py-3 px-4 text-right">
                  {isPending || isInReview ? (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => onOpenReviewModal(tkt)}
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      Verify
                    </Button>
                  ) : (
                    <span className="text-xs font-mono text-slate-500">
                      {tkt.awardedPoints} / {tkt.maxPoints} pts
                    </span>
                  )}
                </td>
              </tr>
            );
          })}

          {tickets.length === 0 && (
            <tr>
              <td colSpan={8} className="py-12 text-center text-slate-500">
                <div className="flex flex-col items-center justify-center gap-2">
                  <ShieldAlert className="w-8 h-8 text-slate-600" />
                  <p>No review requests currently in queue.</p>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
