export interface TeamScoreBreakdown {
  quiz1Score: number;       // Round 1 Elimination Quiz
  checkpointScore: number;  // Round 2 Hardware Checkpoints
  quiz2Score: number;       // Round 3 Component Quiz
  miniGameScore: number;    // Design Team Mini-Games
}

export interface LeaderboardEntry {
  rank: number;
  previousRank?: number;
  teamId: string;
  teamName: string;
  college?: string;
  qualifiedRound1: boolean;
  totalScore: number;
  breakdown: TeamScoreBreakdown;
  checkpointsCompleted: number;
  totalCheckpoints: number;
  lastUpdated: string;
}

export interface LeaderboardFilters {
  searchQuery?: string;
  onlyQualified?: boolean;
  collegeFilter?: string;
  sortBy?: 'rank' | 'totalScore' | 'checkpointScore' | 'quizScore';
}
