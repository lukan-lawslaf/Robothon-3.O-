import React, { useState } from 'react';
import { ReviewTicket, ReviewActionPayload } from '../../types/checkpoint';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { CheckCircle2, XCircle, Award } from 'lucide-react';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: ReviewTicket | null;
  onSubmitDecision: (payload: ReviewActionPayload) => Promise<void>;
  isSubmitting?: boolean;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  isOpen,
  onClose,
  ticket,
  onSubmitDecision,
  isSubmitting = false,
}) => {
  if (!ticket) return null;

  const [decision, setDecision] = useState<'approved' | 'rejected'>('approved');
  const [awardedPoints, setAwardedPoints] = useState<number>(ticket.maxPoints);
  const [adminNotes, setAdminNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmitDecision({
      ticketId: ticket.ticketId,
      adminId: 'admin-01',
      adminName: 'Admin (Ishan)',
      decision,
      awardedPoints: decision === 'approved' ? Number(awardedPoints) : 0,
      adminNotes,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Hardware Milestone Verification"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Ticket Header Overview */}
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-cyan-400 font-semibold">
              {ticket.ticketId}
            </span>
            <span className="text-xs font-mono text-slate-400">
              {ticket.tableNumber ? `Table ${ticket.tableNumber}` : ''}
            </span>
          </div>
          <h4 className="text-base font-bold text-white mt-1">{ticket.teamName}</h4>
          <p className="text-xs text-slate-300 mt-0.5">
            Milestone: <span className="font-semibold text-cyan-300">{ticket.checkpointTitle}</span>
          </p>
        </div>

        {/* Decision Toggle */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Inspection Decision:
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                setDecision('approved');
                setAwardedPoints(ticket.maxPoints);
              }}
              className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-semibold text-sm transition-all ${
                decision === 'approved'
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-lg shadow-emerald-500/10'
                  : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Approve Hardware
            </button>

            <button
              type="button"
              onClick={() => {
                setDecision('rejected');
                setAwardedPoints(0);
              }}
              className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-semibold text-sm transition-all ${
                decision === 'rejected'
                  ? 'bg-red-500/20 border-red-500 text-red-300 shadow-lg shadow-red-500/10'
                  : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <XCircle className="w-4 h-4 text-red-400" />
              Reject / Needs Rework
            </button>
          </div>
        </div>

        {/* Awarded Points Input */}
        {decision === 'approved' && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Awarded Points (Max: {ticket.maxPoints} pts)
              </label>
              <span className="text-xs font-mono font-bold text-cyan-400 flex items-center gap-1">
                <Award className="w-3.5 h-3.5" />
                {awardedPoints} pts
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={ticket.maxPoints}
              step={5}
              value={awardedPoints}
              onChange={(e) => setAwardedPoints(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
          </div>
        )}

        {/* Inspector Feedback / Notes */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            Admin Feedback / Rework Instructions:
          </label>
          <textarea
            rows={3}
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
          />
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant={decision === 'approved' ? 'primary' : 'danger'}
            size="sm"
            isLoading={isSubmitting}
          >
            {decision === 'approved' ? 'Confirm Approval' : 'Submit Rejection'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
