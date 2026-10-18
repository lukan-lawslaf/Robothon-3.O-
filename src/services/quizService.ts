import { QuizDetails, QuizRoundId, QuizSubmissionPayload, QuizSubmissionResult, QualificationStatus } from '../types/quiz';
import { MOCK_ROUND_1_QUIZ, MOCK_ROUND_3_QUIZ } from '../mockData/quizzes.mock';

/**
 * Service: Quiz Engine & Qualification
 * Owner: Shubham
 */

let activeQuizzes: Record<QuizRoundId, QuizDetails> = {
  'round-1-elimination': { ...MOCK_ROUND_1_QUIZ },
  'round-3-component': { ...MOCK_ROUND_3_QUIZ },
};

// TODO: [Shubham] Connect to GET /api/quizzes/:quizId
// Expected Response: QuizDetails (without answer keys)
export const getQuizDetails = async (quizId: QuizRoundId): Promise<QuizDetails> => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  const quiz = activeQuizzes[quizId];
  if (!quiz) {
    throw new Error(`Quiz ${quizId} not found`);
  }
  return quiz;
};

// TODO: [Shubham] Connect to POST /api/quizzes/:quizId/submit
// Expected Payload: QuizSubmissionPayload { quizId, teamId, answers, timeTakenSeconds }
// Expected Response: QuizSubmissionResult { quizId, teamId, score, maxScore, rank, isQualified }
export const submitQuiz = async (payload: QuizSubmissionPayload): Promise<QuizSubmissionResult> => {
  await new Promise((resolve) => setTimeout(resolve, 800));

  const quiz = activeQuizzes[payload.quizId];
  const answeredCount = Object.keys(payload.answers).length;
  // Mock scoring calculation (approx 10 points per answered question in demo)
  const score = answeredCount * 10;
  const isQualified = payload.quizId === 'round-1-elimination' ? score >= 40 : true;

  return {
    quizId: payload.quizId,
    teamId: payload.teamId,
    score,
    maxScore: quiz.totalPoints,
    submittedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    rank: 1,
    isQualified,
  };
};

// TODO: [Shubham] Connect to GET /api/teams/:teamId/qualification
// Expected Response: { teamId: string, status: 'pending' | 'qualified' | 'disqualified', rank: number }
export const getTeamQualificationStatus = async (_teamId: string): Promise<QualificationStatus> => {
  await new Promise((resolve) => setTimeout(resolve, 200));
  // Defaulting to qualified for active development
  return 'qualified';
};

// TODO: [Shubham] Connect to PATCH /api/admin/quizzes/:quizId/status
// Admin control: open/close quiz
export const setQuizActiveStatus = async (quizId: QuizRoundId, isActive: boolean): Promise<QuizDetails> => {
  await new Promise((resolve) => setTimeout(resolve, 400));
  if (activeQuizzes[quizId]) {
    activeQuizzes[quizId] = {
      ...activeQuizzes[quizId],
      isActive,
    };
  }
  return activeQuizzes[quizId];
};
