import fs from 'node:fs/promises';
import path from 'node:path';

export const createInitialState = () => ({
  quizzes: [
    {
      id: 'quiz-1',
      name: 'Elimination Round',
      type: 'ELIMINATION',
      status: 'DRAFT',
      durationSeconds: 1800,
      perQuestionSeconds: 45,
      qualificationCount: 40,
      pointsPerCorrect: 4,
      allowNavigation: true,
      showLiveScores: true,
      leaderboardMode: 'LIVE_RANK',
      autoSubmitOnTimeout: true,
      oneAttemptPerTeam: true,
      teamLeaderOnly: true,
      tieBreaker: 'TIME_TAKEN',
      preQuizCountdownSeconds: 10,
      intermissionSeconds: 7,
      createdAt: new Date().toISOString(),
      startedAt: null,
      endedAt: null,
      finalizedAt: null
    },
    {
      id: 'quiz-2',
      name: 'Bonus Round',
      type: 'BONUS',
      status: 'DRAFT',
      durationSeconds: 900,
      perQuestionSeconds: 45,
      qualificationCount: 40,
      pointsPerCorrect: 4,
      allowNavigation: true,
      showLiveScores: true,
      leaderboardMode: 'LIVE_RANK',
      autoSubmitOnTimeout: true,
      oneAttemptPerTeam: true,
      teamLeaderOnly: true,
      tieBreaker: 'TIME_TAKEN',
      preQuizCountdownSeconds: 10,
      intermissionSeconds: 7,
      createdAt: new Date().toISOString(),
      startedAt: null,
      endedAt: null,
      finalizedAt: null
    }
  ],
  questions: [
    {
      id: 'q1',
      quizId: 'quiz-1',
      questionText: 'Which control strategy is most suitable for maintaining a robot arm at a target position?',
      questionType: 'SINGLE_CHOICE',
      points: 4,
      orderIndex: 1,
      options: [
        { id: 'q1-a', optionKey: 'A', optionText: 'Open-loop control' },
        { id: 'q1-b', optionKey: 'B', optionText: 'Closed-loop PID control' },
        { id: 'q1-c', optionKey: 'C', optionText: 'Random walk control' },
        { id: 'q1-d', optionKey: 'D', optionText: 'Manual polling' }
      ],
      correctOption: 'B'
    },
    {
      id: 'q2',
      quizId: 'quiz-1',
      questionText: 'In a differential-drive robot, what primarily changes its turning radius?',
      questionType: 'SINGLE_CHOICE',
      points: 4,
      orderIndex: 2,
      options: [
        { id: 'q2-a', optionKey: 'A', optionText: 'Wheel speed difference' },
        { id: 'q2-b', optionKey: 'B', optionText: 'Battery chemistry' },
        { id: 'q2-c', optionKey: 'C', optionText: 'Camera resolution' },
        { id: 'q2-d', optionKey: 'D', optionText: 'Payload color' }
      ],
      correctOption: 'A'
    },
    {
      id: 'q3',
      quizId: 'quiz-1',
      questionText: 'What does an IMU measure directly on a mobile robot platform?',
      questionType: 'SINGLE_CHOICE',
      points: 4,
      orderIndex: 3,
      options: [
        { id: 'q3-a', optionKey: 'A', optionText: 'Network latency' },
        { id: 'q3-b', optionKey: 'B', optionText: 'Acceleration and angular velocity' },
        { id: 'q3-c', optionKey: 'C', optionText: 'Motor temperature only' },
        { id: 'q3-d', optionKey: 'D', optionText: 'Absolute GPS coordinates' }
      ],
      correctOption: 'B'
    },
    {
      id: 'q4',
      quizId: 'quiz-1',
      questionText: 'What is the primary function of an H-bridge motor driver circuit?',
      questionType: 'SINGLE_CHOICE',
      points: 4,
      orderIndex: 4,
      options: [
        { id: 'q4-a', optionKey: 'A', optionText: 'Step down logic voltage' },
        { id: 'q4-b', optionKey: 'B', optionText: 'Bidirectional DC motor speed and direction control' },
        { id: 'q4-c', optionKey: 'C', optionText: 'Analog signal filtering' },
        { id: 'q4-d', optionKey: 'D', optionText: 'AC power generation' }
      ],
      correctOption: 'B'
    },
    {
      id: 'q5',
      quizId: 'quiz-1',
      questionText: 'Which sensor is most effective for contactless obstacle distance measurement under water or in humid environments?',
      questionType: 'SINGLE_CHOICE',
      points: 4,
      orderIndex: 5,
      options: [
        { id: 'q5-a', optionKey: 'A', optionText: 'Ultrasonic transducer' },
        { id: 'q5-b', optionKey: 'B', optionText: 'Optical ambient light sensor' },
        { id: 'q5-c', optionKey: 'C', optionText: 'Barometer' },
        { id: 'q5-d', optionKey: 'D', optionText: 'Magnetometer' }
      ],
      correctOption: 'A'
    },
    {
      id: 'q6',
      quizId: 'quiz-2',
      questionText: 'Which serial bus protocol uses a master-slave architecture with dedicated SDA and SCL lines?',
      questionType: 'SINGLE_CHOICE',
      points: 4,
      orderIndex: 1,
      options: [
        { id: 'q6-a', optionKey: 'A', optionText: 'I2C bus' },
        { id: 'q6-b', optionKey: 'B', optionText: 'SPI bus' },
        { id: 'q6-c', optionKey: 'C', optionText: 'RS-232 serial' },
        { id: 'q6-d', optionKey: 'D', optionText: 'CAN bus' }
      ],
      correctOption: 'A'
    },
    {
      id: 'q7',
      quizId: 'quiz-2',
      questionText: 'What is the purpose of a flyback diode connected in antiparallel across an inductive motor coil?',
      questionType: 'SINGLE_CHOICE',
      points: 4,
      orderIndex: 2,
      options: [
        { id: 'q7-a', optionKey: 'A', optionText: 'Increase motor maximum RPM' },
        { id: 'q7-b', optionKey: 'B', optionText: 'Dissipate back-EMF voltage spikes during switching' },
        { id: 'q7-c', optionKey: 'C', optionText: 'Invert motor rotational direction' },
        { id: 'q7-d', optionKey: 'D', optionText: 'Charge the main battery' }
      ],
      correctOption: 'B'
    },
    {
      id: 'q8',
      quizId: 'quiz-2',
      questionText: 'In mobile robotics wheel odometry, slippage causes navigation errors that are predominantly:',
      questionType: 'SINGLE_CHOICE',
      points: 4,
      orderIndex: 3,
      options: [
        { id: 'q8-a', optionKey: 'A', optionText: 'Self-correcting over distance' },
        { id: 'q8-b', optionKey: 'B', optionText: 'Cumulative over travel time and distance' },
        { id: 'q8-c', optionKey: 'C', optionText: 'Completely stationary and invariant' },
        { id: 'q8-d', optionKey: 'D', optionText: 'Inverted automatically without sensor fusion' }
      ],
      correctOption: 'B'
    }
  ],
  attempts: [],
  answers: [],
  events: []
});

export class QuizStore {
  constructor(state = createInitialState()) { this.state = state; }
  getQuiz(id) {
    return this.state.quizzes.find(q => q.id === id || (id === 'elimination-2026' && q.id === 'quiz-1'));
  }
  getQuestions(quizId) {
    return this.state.questions
      .filter(q => q.quizId === quizId || (quizId === 'elimination-2026' && q.quizId === 'quiz-1'))
      .sort((a, b) => a.orderIndex - b.orderIndex);
  }
  getAttempt(quizId, teamId) {
    return this.state.attempts.find(a => (a.quizId === quizId || (quizId === 'elimination-2026' && a.quizId === 'quiz-1')) && a.teamId === teamId);
  }
  save() { return Promise.resolve(); }
}

export class JsonQuizStore extends QuizStore {
  constructor(filePath) {
    super(createInitialState());
    this.filePath = filePath;
    this.writeQueue = Promise.resolve();
  }
  async load() {
    try {
      const raw = await fs.readFile(this.filePath, 'utf8');
      this.state = JSON.parse(raw);
    } catch (error) {
      if (error.code !== 'ENOENT') console.error('Error reading quiz state file:', error);
      await this.save();
    }
    if (Array.isArray(this.state?.quizzes)) {
      this.state.quizzes.forEach(q => {
        if (q.perQuestionSeconds === undefined) q.perQuestionSeconds = 45;
        if (q.preQuizCountdownSeconds === undefined) q.preQuizCountdownSeconds = 10;
        if (q.intermissionSeconds === undefined) q.intermissionSeconds = 7;
        if (q.qualificationCount === undefined) q.qualificationCount = 40;
        if (q.pointsPerCorrect === undefined) q.pointsPerCorrect = 4;
      });
    }
    return this;
  }
  save() {
    this.writeQueue = this.writeQueue
      .then(async () => {
        await fs.mkdir(path.dirname(this.filePath), { recursive: true });
        const jsonStr = JSON.stringify(this.state, null, 2);
        await fs.writeFile(this.filePath, jsonStr, 'utf8');
      })
      .catch(err => {
        console.error('JsonQuizStore save error:', err);
      });
    return this.writeQueue;
  }
}
