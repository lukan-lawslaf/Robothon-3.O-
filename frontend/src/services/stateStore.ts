import { MockTeam, MockCheckpoint, MockReviewTicket, getTeamLeaderName } from '../mockData';
export { getTeamLeaderName };
import { api, getToken } from './api';
export interface BonusAward {
  id: string;
  teamId: string;
  gameName: string;
  points: number;
  awardedAt?: string;
}
export interface PlatformSnapshot {
  teams: MockTeam[];
  checkpoints: MockCheckpoint[];
  tickets: MockReviewTicket[];
  bonuses?: BonusAward[];
}
let snapshot: PlatformSnapshot = { teams: [], checkpoints: [], tickets: [], bonuses: [] };
let version = 0;
const notify = () => window.dispatchEvent(new Event('robothon_store_updated'));
export const getStoredTeams = () => snapshot.teams;
export const getStoredCheckpoints = () => snapshot.checkpoints;
export const getStoredTickets = () => snapshot.tickets;
export const getStoredBonuses = () => snapshot.bonuses || [];
export const resetStoreToDefaults = () => { version++; snapshot = { teams: [], checkpoints: [], tickets: [], bonuses: [] }; notify(); };
export async function refreshPlatform() {
  const started = version;
  const token = getToken();
  const data = token ? await api<PlatformSnapshot>('/api/platform') : { ...(await api<{ teams: MockTeam[] }>('/api/leaderboard')), checkpoints: [], tickets: [] };
  if (started !== version || token !== getToken()) return;
  snapshot = data;
  notify();
}
