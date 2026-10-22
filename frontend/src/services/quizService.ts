import { api, post, patch, del } from './api';

export interface StageState {
  stage: 'STANDBY' | 'COUNTDOWN' | 'QUESTION' | 'LEADERBOARD' | 'FINAL' | 'COMPLETED';
  questionIndex: number;
  questionId?: string | null;
  remainingSeconds: number;
  endsAt?: string | null;
  startedAt?: string | null;
  totalQuestions?: number;
  updatedAt?: string;
}

export interface Quiz {
  id: string;
  name: string;
  type?: string;
  status: 'DRAFT' | 'READY' | 'LIVE' | 'PAUSED' | 'RESULTS' | 'ENDED' | 'FINALIZED';
  durationSeconds: number;
  startedAt: string | null;
  endedAt?: string | null;
  finalizedAt?: string | null;
  serverTime: string;
  preQuizCountdownSeconds?: number;
  intermissionSeconds?: number;
  perQuestionSeconds?: number;
  questionCount?: number;
  template?: string;
  qualificationCount: number;
  allowNavigation: boolean;
  teamLeaderOnly: boolean;
  pointsPerCorrect: number;
  tieBreaker?: string;
  showLiveScores?: boolean;
  stageState?: StageState;
}

export interface Question {
  id: string;
  questionText: string;
  points: number;
  category?: string;
  options: { optionKey: string; optionText: string }[];
}

export interface AdminQuestion extends Question {
  correctOption: string;
}

export interface Attempt {
  id: string;
  status: string;
  answers: Record<string, string>;
  score: number | null;
  qualificationStatus?: string;
  sessionId: string;
  sessionInvalidated?: boolean;
  teamId: string;
  teamName: string;
  answeredCount: number;
  timeTakenSeconds?: number;
  submittedAt?: string;
  debarred?: boolean;
  debarReason?: string;
  scoreAdjustment?: number;
  adjustmentReason?: string;
}

export interface TemporaryLeaderboardRow {
  rank: number;
  status?: string;
  teamId: string;
  teamName: string;
  score: number;
  timeTaken: number;
  answeredCount?: number;
  qualificationStatus?: string;
  manualQualification?: string;
  manualQualificationReason?: string;
  debarred?: boolean;
}

export const quizService = {
  subscribe: (onChange: (event?: { type: string; payload?: any }) => void) => {
    const source = new EventSource('/api/events');
    const events = [
      'QUIZ_STARTED',
      'QUIZ_PAUSED',
      'QUIZ_RESUMED',
      'QUIZ_ENDED',
      'QUIZ_READY',
      'QUIZ_RESET',
      'QUIZ_CONFIGURATION_UPDATED',
      'QUALIFICATION_FINALIZED',
      'ATTEMPT_SESSION_CHANGED',
      'SESSION_INVALIDATED',
      'STAGE_UPDATE',
      'LEADERBOARD_UPDATED',
      'FORCE_SUBMIT'
    ];
    events.forEach(eventName => {
      source.addEventListener(eventName, (e: any) => {
        try {
          const payload = e.data ? JSON.parse(e.data) : null;
          onChange({ type: eventName, payload });
        } catch {
          onChange({ type: eventName });
        }
      });
    });
    source.onopen = () => onChange({ type: 'CONNECTED' });
    return () => source.close();
  },

  list: (admin = false) => api<{ quizzes: Quiz[] }>(admin ? '/api/admin/quizzes' : '/api/quizzes/active'),
  details: (id: string) => api<{ quiz: Quiz; questions: Question[] }>('/api/quizzes/' + encodeURIComponent(id)),
  attempt: (id: string) => api<{ attempt: Attempt | null }>('/api/quizzes/' + encodeURIComponent(id) + '/my-attempt'),
  join: (id: string) => post<{ quiz: Quiz; questions: Question[]; attempt: Attempt }>('/api/quizzes/' + encodeURIComponent(id) + '/join'),
  resumeAttempt: (id: string) => post<{ quiz: Quiz; questions: Question[]; attempt: Attempt }>('/api/quizzes/' + encodeURIComponent(id) + '/resume'),
  answer: (id: string, questionId: string, selectedOption: string) =>
    post<{ recorded: boolean; answers: Record<string, string>; answeredCount: number }>(
      '/api/quizzes/' + encodeURIComponent(id) + '/answer',
      { questionId, selectedOption }
    ),
  submit: (id: string) => post<{ attempt: Attempt; timedOut?: boolean }>('/api/quizzes/' + encodeURIComponent(id) + '/submit'),

  // Stage Projector methods
  getStage: (id: string) => api<{ quizId: string; stageState: StageState }>('/api/quizzes/' + encodeURIComponent(id) + '/stage'),
  updateStage: (id: string, stageState: Partial<StageState>) =>
    post<{ quiz: Quiz; stageState: StageState }>('/api/admin/quizzes/' + encodeURIComponent(id) + '/stage', stageState),

  // Admin lifecycle controls
  control: (id: string, action: string, payload: Record<string, any> = {}) =>
    post<{ quiz: Quiz }>('/api/admin/quizzes/' + encodeURIComponent(id) + '/' + action, payload),
  updateConfig: (id: string, patchData: Partial<Quiz> & { forceLiveEdit?: boolean }) =>
    patch<{ quiz: Quiz }>('/api/admin/quizzes/' + encodeURIComponent(id), patchData),

  // Telemetry & Security
  live: (id: string) =>
    api<{ quiz: Quiz; leaderboard: { leaderboard: TemporaryLeaderboardRow[] }; attempts: Attempt[] }>(
      '/api/admin/quizzes/' + encodeURIComponent(id) + '/live'
    ),
  release: (id: string, teamId: string) =>
    post<{ invalidated: boolean; attemptId: string }>(
      '/api/admin/quizzes/' + encodeURIComponent(id) + '/sessions/' + encodeURIComponent(teamId) + '/invalidate'
    ),

  // Adjudication interventions
  adjustScore: (id: string, teamId: string, input: { delta?: number; score?: number; reason: string }) =>
    post<{ attempt: Attempt; adjustment: any }>(
      '/api/admin/quizzes/' + encodeURIComponent(id) + '/attempts/' + encodeURIComponent(teamId) + '/score',
      input
    ),
  debarTeam: (id: string, teamId: string, input: { debar: boolean; reason: string }) =>
    post<{ attempt: Attempt }>(
      '/api/admin/quizzes/' + encodeURIComponent(id) + '/attempts/' + encodeURIComponent(teamId) + '/debar',
      input
    ),
  qualifyTeam: (id: string, teamId: string, input: { status?: 'QUALIFIED' | 'ELIMINATED' | 'AUTO'; reason?: string } = {}) =>
    post<{ attempt: Attempt; leaderboard?: any }>(
      '/api/admin/quizzes/' + encodeURIComponent(id) + '/attempts/' + encodeURIComponent(teamId) + '/qualify',
      input
    ),

  // Question bank authoring
  adminQuestions: (id: string) => api<{ questions: AdminQuestion[] }>('/api/admin/quizzes/' + encodeURIComponent(id) + '/questions'),
  createQuestion: (id: string, question: Omit<AdminQuestion, 'id'>) =>
    post<{ question: AdminQuestion }>('/api/admin/quizzes/' + encodeURIComponent(id) + '/questions', question),
  updateQuestion: (questionId: string, patchData: Partial<AdminQuestion>) =>
    patch<{ question: AdminQuestion }>('/api/admin/questions/' + encodeURIComponent(questionId), patchData),
  deleteQuestion: (questionId: string) =>
    del<{ deleted: boolean }>('/api/admin/questions/' + encodeURIComponent(questionId)),
  import: (id: string, input: object) => post<{ quiz: Quiz; questions: AdminQuestion[] }>('/api/admin/quizzes/' + encodeURIComponent(id) + '/import', input),
  export: (id: string) => api<any>('/api/admin/quizzes/' + encodeURIComponent(id) + '/export'),

  // Leaderboard
  leaderboard: (id: string) =>
    api<{ leaderboard: TemporaryLeaderboardRow[]; qualificationCutoff?: number }>('/api/quizzes/' + encodeURIComponent(id) + '/leaderboard'),

  create: (input: object) => post<{ quiz: Quiz }>('/api/admin/quizzes', input),
  createBasic: (input: object) => post<{ quiz: Quiz }>('/api/admin/quiz-templates/basic-robotics', input),
};
