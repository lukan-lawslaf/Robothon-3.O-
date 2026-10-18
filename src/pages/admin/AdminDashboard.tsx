import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { StatCard } from '../../components/common/StatCards';
import { ReviewQueueTable } from '../../components/admin/ReviewQueueTable';
import { ReviewModal } from '../../components/admin/ReviewModal';
import { QuizManager } from '../../components/admin/QuizManager';
import { Button } from '../../components/common/Button';
import { ReviewTicket, ReviewActionPayload } from '../../types/checkpoint';
import { QuizDetails, QuizRoundId } from '../../types/quiz';
import { getReviewTickets, processReviewDecision } from '../../services/checkpointService';
import { getQuizDetails, setQuizActiveStatus } from '../../services/quizService';
import { Shield, Clock, CheckCircle2, Gamepad2, ArrowRight } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [tickets, setTickets] = useState<ReviewTicket[]>([]);
  const [quizzes, setQuizzes] = useState<QuizDetails[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<ReviewTicket | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadAdminData = async () => {
      const [ticketData, q1, q3] = await Promise.all([
        getReviewTickets(),
        getQuizDetails('round-1-elimination'),
        getQuizDetails('round-3-component'),
      ]);
      setTickets(ticketData);
      setQuizzes([q1, q3]);
    };
    loadAdminData();
  }, []);

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

  const handleToggleQuiz = async (quizId: QuizRoundId, currentActive: boolean) => {
    const updated = await setQuizActiveStatus(quizId, !currentActive);
    setQuizzes((prev) => prev.map((q) => (q.id === quizId ? updated : q)));
  };

  const pendingTickets = tickets.filter((t) => t.status === 'pending' || t.status === 'in_review');
  const approvedTickets = tickets.filter((t) => t.status === 'approved');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      {/* Admin Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
              Admin Control Center
            </span>
            <span className="text-xs text-slate-400">Technical Team Operations</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
            Robothon Control Dashboard
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Oversee hardware verification tickets, quiz access, and manual mini-game bonuses.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/admin/tickets">
            <Button variant="primary" size="md">
              <Clock className="w-4 h-4" />
              Ticket Queue ({pendingTickets.length})
            </Button>
          </Link>
          <Link to="/admin/minigames">
            <Button variant="secondary" size="md">
              <Gamepad2 className="w-4 h-4" />
              Award Bonus
            </Button>
          </Link>
        </div>
      </div>

      {/* Admin Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Pending Inspections"
          value={pendingTickets.length}
          subValue="Awaiting physical review"
          icon={Clock}
          colorScheme="amber"
        />
        <StatCard
          label="Approved Milestones"
          value={approvedTickets.length}
          subValue="Points credited to teams"
          icon={CheckCircle2}
          colorScheme="emerald"
        />
        <StatCard
          label="Active Quizzes"
          value={quizzes.filter((q) => q.isActive).length}
          subValue="Rounds open to submit"
          icon={Shield}
          colorScheme="cyan"
        />
        <StatCard
          label="Total Review Tickets"
          value={tickets.length}
          subValue="Historical submissions"
          icon={Clock}
          colorScheme="blue"
        />
      </div>

      {/* Review Queue Preview */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-400" />
            Active Inspection Queue
          </h3>
          <Link
            to="/admin/tickets"
            className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
          >
            Full Queue <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <ReviewQueueTable
          tickets={pendingTickets.slice(0, 5)}
          onOpenReviewModal={handleOpenReview}
        />
      </div>

      {/* Quiz Controls */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-white">Event Quiz Controls</h3>
        <QuizManager quizzes={quizzes} onToggleStatus={handleToggleQuiz} />
      </div>

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
