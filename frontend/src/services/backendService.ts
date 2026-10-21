import { MockTeam, MockCheckpoint, MockReviewTicket } from '../mockData';
import { post } from './api';
import { refreshPlatform, getStoredTeams } from './stateStore';
export { loginUser } from './authService';

async function mutate<T>(path: string, payload: object): Promise<T> {
  const result = await post<T>(path, payload);
  // The write already succeeded. A failed refresh must not invite a duplicate award.
  await refreshPlatform().catch(() => undefined);
  return result;
}
export const applyForCheckpointReview = (_teamId: string, checkpointId: string) =>
  mutate<{ ticket: MockReviewTicket; updatedCheckpoint: MockCheckpoint }>('/api/checkpoints/review-request', { checkpointId });
export const verifyCheckpoint = (ticketId: string, _adminId: string, approved: boolean) =>
  mutate<{ ticket: MockReviewTicket; awardedPoints: number }>('/api/admin/checkpoints/verify', { ticketId, approved });
export const assignTicketToAdmin = async (ticketId: string, _adminName: string) =>
  (await mutate<{ ticket: MockReviewTicket }>('/api/admin/checkpoints/assign', { ticketId })).ticket;
export const addMiniGamePoints = (teamId: string, gameName: string, points: number) =>
  mutate<{ team: MockTeam; newTotal: number }>('/api/admin/minigames/award', { teamId, gameName, points });
export const getLiveLeaderboard = async () => getStoredTeams();

export const deductPoints = (teamId: string, points: number, reason?: string) =>
  mutate<{ success: boolean; team: MockTeam; newTotal: number }>('/api/admin/minigames/deduct', { teamId, points, reason });

export const removeMark = (teamId: string, markId: string, type?: string) =>
  mutate<{ success: boolean; team: MockTeam; newTotal: number }>('/api/admin/marks/remove', { teamId, markId, type });
