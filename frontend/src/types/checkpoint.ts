export type CheckpointStatus = 'locked' | 'available' | 'in_review' | 'approved' | 'rejected';

export interface CheckpointMilestone {
  id: string;
  order: number;
  title: string;
  category: 'hull' | 'propulsion' | 'electronics' | 'waterproofing' | 'testing';
  description: string;
  requirements: string[];
  maxPoints: number;
  status: CheckpointStatus;
  awardedPoints?: number;
  reviewedBy?: string;
  reviewedAt?: string;
  feedback?: string;
  attemptCount?: number;
}

export type TicketStatus = 'pending' | 'in_review' | 'approved' | 'rejected';

export interface ReviewTicket {
  ticketId: string;
  teamId: string;
  teamName: string;
  tableNumber?: number;
  checkpointId: string;
  checkpointTitle: string;
  requestedAt: string;
  status: TicketStatus;
  assignedAdminId?: string;
  assignedAdminName?: string;
  reviewedAt?: string;
  awardedPoints?: number;
  maxPoints: number;
  adminNotes?: string;
}

export interface ReviewActionPayload {
  ticketId: string;
  adminId: string;
  adminName: string;
  decision: 'approved' | 'rejected';
  awardedPoints: number;
  adminNotes?: string;
}
