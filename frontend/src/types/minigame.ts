export interface MiniGame {
  id: string;
  name: string;
  description: string;
  maxBonusPoints: number;
  iconName?: string;
  isActive: boolean;
}

export interface MiniGameScoreEntry {
  id: string;
  gameId: string;
  gameName: string;
  teamId: string;
  teamName: string;
  awardedPoints: number;
  recordedByAdminId: string;
  recordedByAdminName: string;
  recordedAt: string;
  notes?: string;
}

export interface AwardMiniGamePayload {
  gameId: string;
  teamId: string;
  points: number;
  adminId: string;
  adminName: string;
  notes?: string;
}
