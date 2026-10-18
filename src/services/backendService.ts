import { MockTeam, MockCheckpoint, MockReviewTicket } from '../mockData';
import {
  getStoredTeams,
  saveTeams,
  getStoredCheckpoints,
  saveCheckpoints,
  getStoredTickets,
  saveTickets,
} from './stateStore';

/**
 * Backend & Event Core Service Layer
 * Responsible for Auth, Checkpoint Reviews, Mini-Game Bonus, and Live Leaderboard.
 * Hand-off Target: Ishan
 */

export interface LoginResult {
  token: string;
  user: {
    id: string;
    name: string;
    role: 'participant' | 'admin';
    teamId?: string;
  };
  team?: MockTeam;
}

// TODO: [Ishan] Connect Backend & Socket APIs here
// POST /api/auth/login
// Expected Payload: { role: 'participant' | 'admin', credentials: { accessCode: string; password?: string } }
// Expected Response: LoginResult { token, user, team }
export const loginUser = async (
  role: 'participant' | 'admin',
  credentials: { accessCode: string; password?: string }
): Promise<LoginResult> => {
  await new Promise((res) => setTimeout(res, 300));

  if (role === 'admin') {
    if (credentials.accessCode === 'admin' || credentials.accessCode === 'admin123') {
      return {
        token: 'mock-jwt-admin-token-777',
        user: {
          id: 'admin-01',
          name: 'Technical Admin (Ishan/Staff)',
          role: 'admin',
        },
      };
    }
    throw new Error('Invalid Admin Passcode. Hint: use "admin123" for demo.');
  }

  // Participant Login
  const teams = getStoredTeams();
  const matchedTeam =
    teams.find(
      (t) =>
        t.id.toLowerCase() === credentials.accessCode.toLowerCase() ||
        t.teamName.toLowerCase().includes(credentials.accessCode.toLowerCase())
    ) || teams[0]; // fallback to team-01 for easy preview

  return {
    token: `mock-jwt-team-token-${matchedTeam.id}`,
    user: {
      id: `usr-${matchedTeam.id}`,
      name: matchedTeam.teamName,
      role: 'participant',
      teamId: matchedTeam.id,
    },
    team: matchedTeam,
  };
};

// TODO: [Ishan] Connect Backend & Socket APIs here
// POST /api/checkpoints/review-request
// Expected Payload: { teamId: string, checkpointId: string }
// Expected Response: { ticket: MockReviewTicket, updatedCheckpoint: MockCheckpoint }
export const applyForCheckpointReview = async (
  teamId: string,
  checkpointId: string
): Promise<{ ticket: MockReviewTicket; updatedCheckpoint: MockCheckpoint }> => {
  await new Promise((res) => setTimeout(res, 350));

  const checkpoints = getStoredCheckpoints();
  const cpIndex = checkpoints.findIndex((c) => c.id === checkpointId);
  if (cpIndex === -1) throw new Error('Checkpoint not found');

  // Mark checkpoint as pending_review
  checkpoints[cpIndex].status = 'pending_review';
  saveCheckpoints(checkpoints);

  const teams = getStoredTeams();
  const currentTeam = teams.find((t) => t.id === teamId) || teams[0];

  const tickets = getStoredTickets();
  const newTicket: MockReviewTicket = {
    ticketId: `TKT-${Math.floor(100 + Math.random() * 900)}`,
    teamId,
    teamName: currentTeam.teamName,
    checkpointId: checkpoints[cpIndex].id,
    checkpointTitle: `Step ${checkpoints[cpIndex].stepNumber}: ${checkpoints[cpIndex].title}`,
    requestedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    assignedAdmin: null,
    status: 'pending',
    points: checkpoints[cpIndex].points,
  };

  tickets.unshift(newTicket);
  saveTickets(tickets);

  return {
    ticket: newTicket,
    updatedCheckpoint: checkpoints[cpIndex],
  };
};

// TODO: [Ishan] Connect Backend & Socket APIs here
// POST /api/admin/checkpoints/verify
// Expected Payload: { ticketId: string, adminId: string, approved: boolean }
// Expected Response: { ticket: MockReviewTicket, awardedPoints: number }
export const verifyCheckpoint = async (
  ticketId: string,
  adminId: string,
  approved: boolean
): Promise<{ ticket: MockReviewTicket; awardedPoints: number }> => {
  await new Promise((res) => setTimeout(res, 400));

  const tickets = getStoredTickets();
  const tktIndex = tickets.findIndex((t) => t.ticketId === ticketId);
  if (tktIndex === -1) throw new Error('Ticket not found in queue');

  const ticket = tickets[tktIndex];
  ticket.status = approved ? 'approved' : 'rejected';
  ticket.assignedAdmin = adminId || 'Tech Admin';
  saveTickets(tickets);

  let awardedPoints = 0;

  if (approved) {
    awardedPoints = ticket.points;

    // 1. Update checkpoints list: set current checkpoint to 'approved' and unlock next
    const checkpoints = getStoredCheckpoints();
    const cpIndex = checkpoints.findIndex((c) => c.id === ticket.checkpointId);
    if (cpIndex !== -1) {
      checkpoints[cpIndex].status = 'approved';
      if (cpIndex + 1 < checkpoints.length && checkpoints[cpIndex + 1].status === 'locked') {
        checkpoints[cpIndex + 1].status = 'available';
      }
      saveCheckpoints(checkpoints);
    }

    // 2. Add points to team and re-rank leaderboard
    const teams = getStoredTeams();
    const teamIndex = teams.findIndex((t) => t.id === ticket.teamId);
    if (teamIndex !== -1) {
      teams[teamIndex].checkpointPoints += awardedPoints;
      teams[teamIndex].totalPoints += awardedPoints;
      if (cpIndex !== -1 && cpIndex + 1 < checkpoints.length) {
        teams[teamIndex].currentCheckpoint = `Step ${checkpoints[cpIndex + 1].stepNumber}: ${checkpoints[cpIndex + 1].title}`;
      } else {
        teams[teamIndex].currentCheckpoint = 'All Milestones Cleared!';
      }
      saveTeams(teams);
    }
  } else {
    // If rejected, set checkpoint back to available for rework
    const checkpoints = getStoredCheckpoints();
    const cpIndex = checkpoints.findIndex((c) => c.id === ticket.checkpointId);
    if (cpIndex !== -1) {
      checkpoints[cpIndex].status = 'available';
      saveCheckpoints(checkpoints);
    }
  }

  return { ticket, awardedPoints };
};

// Admin helper: Assign ticket to self
export const assignTicketToAdmin = async (
  ticketId: string,
  adminName: string
): Promise<MockReviewTicket> => {
  await new Promise((res) => setTimeout(res, 200));
  const tickets = getStoredTickets();
  const tkt = tickets.find((t) => t.ticketId === ticketId);
  if (tkt) {
    tkt.assignedAdmin = adminName;
    tkt.status = 'in_review';
    saveTickets(tickets);
    return tkt;
  }
  throw new Error('Ticket not found');
};

// TODO: [Ishan] Connect Backend & Socket APIs here
// POST /api/admin/minigames/award
// Expected Payload: { teamId: string, gameName: string, points: number }
// Expected Response: { team: MockTeam, newTotal: number }
export const addMiniGamePoints = async (
  teamId: string,
  _gameName: string,
  points: number
): Promise<{ team: MockTeam; newTotal: number }> => {
  await new Promise((res) => setTimeout(res, 300));

  const teams = getStoredTeams();
  const teamIndex = teams.findIndex((t) => t.id === teamId);
  if (teamIndex === -1) throw new Error('Team not found');

  teams[teamIndex].miniGamePoints += points;
  teams[teamIndex].totalPoints += points;
  saveTeams(teams);

  return {
    team: teams[teamIndex],
    newTotal: teams[teamIndex].totalPoints,
  };
};

// TODO: [Ishan] Connect Backend & Socket APIs here
// GET /api/leaderboard (or WebSocket wss://.../leaderboard)
// Expected Response: MockTeam[] (sorted by totalPoints descending, with updated ranks)
export const getLiveLeaderboard = async (): Promise<MockTeam[]> => {
  await new Promise((res) => setTimeout(res, 200));
  return getStoredTeams();
};
