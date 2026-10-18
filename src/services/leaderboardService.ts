import { LeaderboardEntry, LeaderboardFilters } from '../types/leaderboard';
import { MOCK_LEADERBOARD } from '../mockData/leaderboard.mock';

/**
 * Service: Live Real-Time Leaderboard & Scoreboard
 * Owner: Ishan
 */

let liveLeaderboardState: LeaderboardEntry[] = [...MOCK_LEADERBOARD];

// TODO: [Ishan] Connect to GET /api/leaderboard?search=:query&qualified=:bool
// Expected Response: LeaderboardEntry[]
export const getLeaderboard = async (filters?: LeaderboardFilters): Promise<LeaderboardEntry[]> => {
  await new Promise((resolve) => setTimeout(resolve, 350));
  let data = [...liveLeaderboardState];

  if (filters?.onlyQualified) {
    data = data.filter((item) => item.qualifiedRound1);
  }

  if (filters?.searchQuery) {
    const q = filters.searchQuery.toLowerCase();
    data = data.filter(
      (item) =>
        item.teamName.toLowerCase().includes(q) ||
        (item.college && item.college.toLowerCase().includes(q))
    );
  }

  // Recalculate ranks based on total score
  data.sort((a, b) => b.totalScore - a.totalScore);
  return data.map((item, idx) => ({ ...item, rank: idx + 1 }));
};

// TODO: [Ishan] Connect to WebSocket wss://api.robothon.internal/ws/leaderboard
// Provides live updates whenever a checkpoint is approved, quiz graded, or mini-game bonus recorded
export const subscribeToLeaderboard = (
  onUpdate: (data: LeaderboardEntry[]) => void
): (() => void) => {
  // Simulate live heartbeat
  const interval = setInterval(() => {
    // Return updated snapshot
    onUpdate([...liveLeaderboardState]);
  }, 10000);

  return () => clearInterval(interval);
};

// TODO: [Ishan] Connect to GET /api/teams/:teamId/rank
export const getTeamRankSummary = async (teamId: string): Promise<LeaderboardEntry | undefined> => {
  await new Promise((resolve) => setTimeout(resolve, 200));
  return liveLeaderboardState.find((entry) => entry.teamId === teamId);
};
