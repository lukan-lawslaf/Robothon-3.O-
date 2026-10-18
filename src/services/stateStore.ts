import {
  INITIAL_TEAMS,
  INITIAL_CHECKPOINTS,
  INITIAL_QUIZZES,
  INITIAL_REVIEW_TICKETS,
  MockTeam,
  MockCheckpoint,
  MockQuiz,
  MockReviewTicket,
} from '../mockData';

const STORAGE_KEYS = {
  TEAMS: 'robothon_teams_v2',
  CHECKPOINTS: 'robothon_checkpoints_v2',
  QUIZZES: 'robothon_quizzes_v2',
  TICKETS: 'robothon_tickets_v2',
};

// Helper to initialize or retrieve from localStorage
const getStored = <T>(key: string, defaultVal: T): T => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(defaultVal));
      return defaultVal;
    }
    return JSON.parse(raw);
  } catch {
    return defaultVal;
  }
};

const saveStored = <T>(key: string, val: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(val));
    // Dispatch storage event for cross-component re-renders
    window.dispatchEvent(new Event('robothon_store_updated'));
  } catch (err) {
    console.error('Storage save error:', err);
  }
};

export const getStoredTeams = (): MockTeam[] =>
  getStored<MockTeam[]>(STORAGE_KEYS.TEAMS, INITIAL_TEAMS);

export const saveTeams = (teams: MockTeam[]): void => {
  // Recalculate ranks based on totalPoints
  const sorted = [...teams].sort((a, b) => b.totalPoints - a.totalPoints);
  const ranked = sorted.map((t, idx) => ({ ...t, rank: idx + 1 }));
  saveStored(STORAGE_KEYS.TEAMS, ranked);
};

export const getStoredCheckpoints = (): MockCheckpoint[] =>
  getStored<MockCheckpoint[]>(STORAGE_KEYS.CHECKPOINTS, INITIAL_CHECKPOINTS);

export const saveCheckpoints = (cps: MockCheckpoint[]): void =>
  saveStored(STORAGE_KEYS.CHECKPOINTS, cps);

export const getStoredQuizzes = (): Record<string, MockQuiz> =>
  getStored<Record<string, MockQuiz>>(STORAGE_KEYS.QUIZZES, INITIAL_QUIZZES);

export const saveQuizzes = (quizzes: Record<string, MockQuiz>): void =>
  saveStored(STORAGE_KEYS.QUIZZES, quizzes);

export const getStoredTickets = (): MockReviewTicket[] =>
  getStored<MockReviewTicket[]>(STORAGE_KEYS.TICKETS, INITIAL_REVIEW_TICKETS);

export const saveTickets = (tickets: MockReviewTicket[]): void =>
  saveStored(STORAGE_KEYS.TICKETS, tickets);

export const resetStoreToDefaults = (): void => {
  localStorage.removeItem(STORAGE_KEYS.TEAMS);
  localStorage.removeItem(STORAGE_KEYS.CHECKPOINTS);
  localStorage.removeItem(STORAGE_KEYS.QUIZZES);
  localStorage.removeItem(STORAGE_KEYS.TICKETS);
  window.dispatchEvent(new Event('robothon_store_updated'));
};
