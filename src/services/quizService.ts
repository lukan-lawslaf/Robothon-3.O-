import { MockQuiz } from '../mockData';
import { getStoredQuizzes, saveQuizzes, getStoredTeams, saveTeams } from './stateStore';

/**
 * Quiz Service Layer
 * Responsible for Quiz 1 (Elimination), Quiz 2 (Component Allocation), and qualification checking.
 * Hand-off Target: Shubham
 */

// TODO: [Shubham] Connect Quiz API & Top-50 Filter here
// GET /api/quizzes/:quizId
// Expected Response: MockQuiz { id, title, description, timeLimit, totalPoints, isActive, questions }
export const fetchQuiz = async (quizId: string): Promise<MockQuiz> => {
  await new Promise((res) => setTimeout(res, 250));
  const quizzes = getStoredQuizzes();
  const quiz = quizzes[quizId];
  if (!quiz) throw new Error(`Quiz with id "${quizId}" not found`);
  return quiz;
};

// TODO: [Shubham] Connect Quiz API & Top-50 Filter here
// POST /api/quizzes/:quizId/submit
// Expected Payload: { teamId: string, quizId: string, answers: Record<string, number> }
// Expected Response: { score: number, totalPoints: number, passed: boolean, isQualified: boolean }
export const submitQuizAnswers = async (
  teamId: string,
  quizId: string,
  answers: Record<string, number>
): Promise<{ score: number; totalPoints: number; isQualified: boolean }> => {
  await new Promise((res) => setTimeout(res, 400));
  const quizzes = getStoredQuizzes();
  const quiz = quizzes[quizId];
  if (!quiz) throw new Error('Quiz not found');

  // Compute mock score
  let correctCount = 0;
  quiz.questions.forEach((q) => {
    if (answers[q.id] !== undefined && answers[q.id] === q.correctAnswerIndex) {
      correctCount++;
    }
  });

  const pointsPerQuestion = Math.round(quiz.totalPoints / quiz.questions.length);
  const earnedScore = correctCount * pointsPerQuestion;
  const isQualified = earnedScore >= 40; // Qualify if 40% or more

  // Update team score in store
  const teams = getStoredTeams();
  const teamIndex = teams.findIndex((t) => t.id === teamId);
  if (teamIndex !== -1) {
    teams[teamIndex].quizPoints += earnedScore;
    teams[teamIndex].totalPoints += earnedScore;
    if (quizId === 'quiz-1') {
      teams[teamIndex].isQualified = isQualified;
    }
    saveTeams(teams);
  }

  return {
    score: earnedScore,
    totalPoints: quiz.totalPoints,
    isQualified,
  };
};

// TODO: [Shubham] Connect Quiz API & Top-50 Filter here
// GET /api/teams/:teamId/qualification-status
// Expected Response: { teamId: string, isQualified: boolean, rank: number }
export const getQualificationStatus = async (
  teamId: string
): Promise<{ isQualified: boolean; rank: number }> => {
  await new Promise((res) => setTimeout(res, 150));
  const teams = getStoredTeams();
  const team = teams.find((t) => t.id === teamId);
  return {
    isQualified: team ? team.isQualified : false,
    rank: team ? team.rank : 999,
  };
};

// Admin helper: toggle quiz open/close status
export const toggleQuizStatus = async (quizId: string, isActive: boolean): Promise<MockQuiz> => {
  await new Promise((res) => setTimeout(res, 200));
  const quizzes = getStoredQuizzes();
  if (quizzes[quizId]) {
    quizzes[quizId].isActive = isActive;
    saveQuizzes(quizzes);
  }
  return quizzes[quizId];
};

// Aliases for backwards compatibility with earlier scaffold files
export const getQuizDetails = async (quizId: any): Promise<any> => {
  const id = quizId === 'round-1-elimination' ? 'quiz-1' : quizId === 'round-3-component' ? 'quiz-2' : quizId;
  const q = await fetchQuiz(id);
  return {
    ...q,
    roundNumber: id === 'quiz-1' ? 1 : 3,
    durationMinutes: Math.round(q.timeLimit / 60),
    totalQuestions: q.questions.length,
    questions: q.questions.map((item) => ({
      id: item.id,
      text: item.question,
      points: 10,
      options: item.options.map((opt, oIdx) => ({ id: String(oIdx), text: opt })),
    })),
  };
};

export const submitQuiz = async (payload: any): Promise<any> => {
  const id = payload.quizId === 'round-1-elimination' ? 'quiz-1' : 'quiz-2';
  // convert string option ids to number
  const converted: Record<string, number> = {};
  Object.entries(payload.answers || {}).forEach(([k, v]) => {
    converted[k] = Number(v);
  });
  return submitQuizAnswers(payload.teamId, id, converted);
};

export const getTeamQualificationStatus = async (teamId: string) => {
  const res = await getQualificationStatus(teamId);
  return res.isQualified ? 'qualified' : 'disqualified';
};

export const setQuizActiveStatus = async (quizId: any, isActive: boolean) => {
  const id = quizId === 'round-1-elimination' ? 'quiz-1' : 'quiz-2';
  return toggleQuizStatus(id, isActive);
};

