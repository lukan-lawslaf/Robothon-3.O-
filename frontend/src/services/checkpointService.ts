import { CheckpointMilestone, ReviewTicket, ReviewActionPayload, TicketStatus } from '../types/checkpoint';
import { MOCK_CHECKPOINTS, MOCK_REVIEW_TICKETS } from '../mockData/checkpoints.mock';

/**
 * Service: Boat-Building Hardware Checkpoints & Review Tickets
 * Owner: Ishan
 */

let checkpointsState: CheckpointMilestone[] = [...MOCK_CHECKPOINTS];
let reviewTicketsState: ReviewTicket[] = [...MOCK_REVIEW_TICKETS];

// TODO: [Ishan] Connect to GET /api/teams/:teamId/checkpoints
// Expected Response: CheckpointMilestone[]
export const getTeamCheckpoints = async (_teamId: string): Promise<CheckpointMilestone[]> => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return [...checkpointsState];
};

// TODO: [Ishan] Connect to POST /api/checkpoints/review-request
// Expected Payload: { teamId: string, checkpointId: string, tableNumber?: number }
// Expected Response: { ticket: ReviewTicket, updatedCheckpoint: CheckpointMilestone }
export const applyForReview = async (
  teamId: string,
  checkpointId: string,
  tableNumber: number = 1
): Promise<{ ticket: ReviewTicket; updatedCheckpoint: CheckpointMilestone }> => {
  await new Promise((resolve) => setTimeout(resolve, 600));

  const targetCp = checkpointsState.find((c) => c.id === checkpointId);
  if (!targetCp) throw new Error('Checkpoint not found');

  targetCp.status = 'in_review';

  const newTicket: ReviewTicket = {
    ticketId: `tkt-${Date.now()}`,
    teamId,
    teamName: 'AquaPulse Robotics',
    tableNumber,
    checkpointId: targetCp.id,
    checkpointTitle: targetCp.title,
    requestedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    status: 'pending',
    maxPoints: targetCp.maxPoints,
  };

  reviewTicketsState.unshift(newTicket);

  return {
    ticket: newTicket,
    updatedCheckpoint: { ...targetCp },
  };
};

// TODO: [Ishan] Connect to GET /api/admin/review-tickets?status=:status
// Expected Response: ReviewTicket[]
export const getReviewTickets = async (statusFilter?: TicketStatus): Promise<ReviewTicket[]> => {
  await new Promise((resolve) => setTimeout(resolve, 350));
  if (!statusFilter) return [...reviewTicketsState];
  return reviewTicketsState.filter((t) => t.status === statusFilter);
};

// TODO: [Ishan] Connect to POST /api/admin/review-tickets/:ticketId/action
// Expected Payload: ReviewActionPayload { ticketId, adminId, adminName, decision, awardedPoints, adminNotes }
// Expected Response: { updatedTicket: ReviewTicket, updatedCheckpoint: CheckpointMilestone }
export const processReviewDecision = async (
  payload: ReviewActionPayload
): Promise<{ updatedTicket: ReviewTicket; updatedCheckpoint?: CheckpointMilestone }> => {
  await new Promise((resolve) => setTimeout(resolve, 700));

  const ticketIndex = reviewTicketsState.findIndex((t) => t.ticketId === payload.ticketId);
  if (ticketIndex === -1) throw new Error('Ticket not found in queue');

  const ticket = reviewTicketsState[ticketIndex];
  ticket.status = payload.decision;
  ticket.assignedAdminId = payload.adminId;
  ticket.assignedAdminName = payload.adminName;
  ticket.awardedPoints = payload.awardedPoints;
  ticket.adminNotes = payload.adminNotes;
  ticket.reviewedAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Update target checkpoint
  const cpIndex = checkpointsState.findIndex((c) => c.id === ticket.checkpointId);
  let updatedCp: CheckpointMilestone | undefined;

  if (cpIndex !== -1) {
    checkpointsState[cpIndex].status = payload.decision === 'approved' ? 'approved' : 'rejected';
    checkpointsState[cpIndex].awardedPoints = payload.awardedPoints;
    checkpointsState[cpIndex].reviewedBy = payload.adminName;
    checkpointsState[cpIndex].reviewedAt = ticket.reviewedAt;
    checkpointsState[cpIndex].feedback = payload.adminNotes;
    updatedCp = { ...checkpointsState[cpIndex] };

    // Automatically unlock next checkpoint if approved
    if (payload.decision === 'approved' && cpIndex + 1 < checkpointsState.length) {
      if (checkpointsState[cpIndex + 1].status === 'locked') {
        checkpointsState[cpIndex + 1].status = 'available';
      }
    }
  }

  return {
    updatedTicket: { ...ticket },
    updatedCheckpoint: updatedCp,
  };
};
