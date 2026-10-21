import React, { useState, useEffect } from 'react';
import { ReviewTicket, ReviewActionPayload, TicketStatus } from '../../types/checkpoint';
import { getReviewTickets, processReviewDecision } from '../../services/checkpointService';
import { ReviewQueueTable } from '../../components/admin/ReviewQueueTable';
import { ReviewModal } from '../../components/admin/ReviewModal';
import { Clock, Filter } from 'lucide-react';

export const TicketQueuePage: React.FC = () => {
  const [tickets, setTickets] = useState<ReviewTicket[]>([]);
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all');
  const [selectedTicket, setSelectedTicket] = useState<ReviewTicket | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchTickets = async () => {
      const data = await getReviewTickets(statusFilter === 'all' ? undefined : statusFilter);
      setTickets(data);
    };
    fetchTickets();
  }, [statusFilter]);

  const handleOpenReview = (ticket: ReviewTicket) => {
    setSelectedTicket(ticket);
    setIsModalOpen(true);
  };

  const handleProcessDecision = async (payload: ReviewActionPayload) => {
    try {
      setIsSubmitting(true);
      const res = await processReviewDecision(payload);
      setTickets((prev) =>
        prev.map((t) => (t.ticketId === payload.ticketId ? res.updatedTicket : t))
      );
      setIsModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filterTabs: Array<{ id: TicketStatus | 'all'; label: string }> = [
    { id: 'all', label: 'All Requests' },
    { id: 'pending', label: 'Pending' },
    { id: 'in_review', label: 'In Review' },
    { id: 'approved', label: 'Approved' },
    { id: 'rejected', label: 'Needs Rework' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="pb-6 border-b border-slate-800">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
          Checkpoint Review Queue
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Review and approve team checkpoint submissions.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {filterTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold capitalize whitespace-nowrap transition-all ${
              statusFilter === tab.id
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tickets Table */}
      <ReviewQueueTable
        tickets={tickets}
        onOpenReviewModal={handleOpenReview}
      />

      {/* Review Modal */}
      <ReviewModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        ticket={selectedTicket}
        onSubmitDecision={handleProcessDecision}
        isSubmitting={isSubmitting}
      />
    </div>
  );
};
