export type QuizRoundId = 'round-1-elimination' | 'round-3-component';

export interface QuizOption {
  id: string;
  text: string;
}

export interface QuizQuestion {
  id: string;
  text: string;
  options: QuizOption[];
  points: number;
  category?: string;
  // Answer key omitted on client for security, handled on backend by Shubham
}

export interface QuizDetails {
  id: QuizRoundId;
  title: string;
  roundNumber: 1 | 3;
  description: string;
  totalQuestions: number;
  durationMinutes: number;
  totalPoints: number;
  isActive: boolean;
  questions: QuizQuestion[];
}

export interface QuizSubmissionPayload {
  quizId: QuizRoundId;
  teamId: string;
  answers: Record<string, string>; // questionId -> selectedOptionId
  timeTakenSeconds: number;
}

export interface QuizSubmissionResult {
  quizId: QuizRoundId;
  teamId: string;
  score: number;
  maxScore: number;
  submittedAt: string;
  rank?: number;
  isQualified?: boolean; // Used for Round 1 elimination logic
}

export type QualificationStatus = 'pending' | 'qualified' | 'disqualified';
