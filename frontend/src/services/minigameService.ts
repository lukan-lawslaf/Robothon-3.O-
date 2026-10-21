import { MiniGame, MiniGameScoreEntry, AwardMiniGamePayload } from '../types/minigame';

/**
 * Service: Design Team Mini-Games & Bonus Points
 * Owner: Ishan
 */

export const MOCK_MINI_GAMES: MiniGame[] = [
  {
    id: 'game-ping-pong',
    name: 'Hydro Ping Pong Showdown',
    description: 'Teams compete in a quick reaction table rally. Up to 15 bonus points.',
    maxBonusPoints: 15,
    iconName: 'Activity',
    isActive: true,
  },
  {
    id: 'game-precision-wire',
    name: 'Steady Hand Buzzer Wire',
    description: 'Guide the metallic wand along the curved electric track without setting off the buzzer.',
    maxBonusPoints: 20,
    iconName: 'Zap',
    isActive: true,
  },
  {
    id: 'game-target-toss',
    name: 'Buoy Ring Toss Challenge',
    description: 'Toss buoyant rings onto the floating target posts at varying distances.',
    maxBonusPoints: 15,
    iconName: 'Target',
    isActive: true,
  },
];

let awardedEntries: MiniGameScoreEntry[] = [
  {
    id: 'bns-01',
    gameId: 'game-ping-pong',
    gameName: 'Hydro Ping Pong Showdown',
    teamId: 'team-01',
    teamName: 'AquaPulse Robotics',
    awardedPoints: 15,
    recordedByAdminId: 'admin-01',
    recordedByAdminName: 'Admin (Ishan)',
    recordedAt: '11:10 AM',
    notes: 'Won finals match against Team 05',
  },
  {
    id: 'bns-02',
    gameId: 'game-precision-wire',
    gameName: 'Steady Hand Buzzer Wire',
    teamId: 'team-03',
    teamName: 'Submersible Titans',
    awardedPoints: 20,
    recordedByAdminId: 'admin-02',
    recordedByAdminName: 'Admin (Nakul)',
    recordedAt: '11:22 AM',
    notes: 'Flawless run in 24 seconds',
  },
];

// TODO: [Ishan] Connect to GET /api/minigames
// Expected Response: MiniGame[]
export const getMiniGames = async (): Promise<MiniGame[]> => {
  await new Promise((resolve) => setTimeout(resolve, 250));
  return [...MOCK_MINI_GAMES];
};

// TODO: [Ishan] Connect to POST /api/admin/minigames/award
// Expected Payload: AwardMiniGamePayload { gameId, teamId, points, adminId, adminName, notes }
// Expected Response: MiniGameScoreEntry
export const awardMiniGameBonus = async (payload: AwardMiniGamePayload): Promise<MiniGameScoreEntry> => {
  await new Promise((resolve) => setTimeout(resolve, 500));

  const game = MOCK_MINI_GAMES.find((g) => g.id === payload.gameId);
  const entry: MiniGameScoreEntry = {
    id: `bns-${Date.now()}`,
    gameId: payload.gameId,
    gameName: game?.name || 'Mini-Game Bonus',
    teamId: payload.teamId,
    teamName: 'Selected Team',
    awardedPoints: payload.points,
    recordedByAdminId: payload.adminId,
    recordedByAdminName: payload.adminName,
    recordedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    notes: payload.notes,
  };

  awardedEntries.unshift(entry);
  return entry;
};

// TODO: [Ishan] Connect to GET /api/minigames/recent-awards
export const getRecentBonusAwards = async (): Promise<MiniGameScoreEntry[]> => {
  await new Promise((resolve) => setTimeout(resolve, 250));
  return [...awardedEntries];
};
