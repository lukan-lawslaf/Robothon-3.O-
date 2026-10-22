import fs from 'node:fs/promises';
import path from 'node:path';

export const createInitialState = () => ({
  quizzes: [
    {
      id: 'quiz-1',
      name: 'Elimination Round',
      type: 'ELIMINATION',
      status: 'DRAFT',
      durationSeconds: 350,
      perQuestionSeconds: 35,
      qualificationCount: 40,
      pointsPerCorrect: 5,
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
      durationSeconds: 350,
      perQuestionSeconds: 35,
      qualificationCount: 40,
      pointsPerCorrect: 5,
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
        "id": "q1-1",
        "quizId": "quiz-1",
        "questionText": "What is the main function of an L298N motor driver?",
        "questionType": "SINGLE_CHOICE",
        "points": 5,
        "orderIndex": 1,
        "timeLimitSeconds": 35,
        "category": "Motor Driver",
        "options": [
            {
                "id": "q1-1-a",
                "optionKey": "A",
                "optionText": "Store program code"
            },
            {
                "id": "q1-1-b",
                "optionKey": "B",
                "optionText": "Control motor speed and direction"
            },
            {
                "id": "q1-1-c",
                "optionKey": "C",
                "optionText": "Connect to Wi-Fi"
            },
            {
                "id": "q1-1-d",
                "optionKey": "D",
                "optionText": "Measure battery voltage"
            }
        ],
        "correctOption": "B"
    },
    {
        "id": "q1-2",
        "quizId": "quiz-1",
        "questionText": "Which wireless communication features are available on the original ESP32?",
        "questionType": "SINGLE_CHOICE",
        "points": 5,
        "orderIndex": 2,
        "timeLimitSeconds": 35,
        "category": "ESP32",
        "options": [
            {
                "id": "q1-2-a",
                "optionKey": "A",
                "optionText": "Wi-Fi only"
            },
            {
                "id": "q1-2-b",
                "optionKey": "B",
                "optionText": "Bluetooth only"
            },
            {
                "id": "q1-2-c",
                "optionKey": "C",
                "optionText": "Wi-Fi and Bluetooth"
            },
            {
                "id": "q1-2-d",
                "optionKey": "D",
                "optionText": "Neither"
            }
        ],
        "correctOption": "C"
    },
    {
        "id": "q1-3",
        "quizId": "quiz-1",
        "questionText": "What does PWM stand for?",
        "questionType": "SINGLE_CHOICE",
        "points": 5,
        "orderIndex": 3,
        "timeLimitSeconds": 35,
        "category": "Motor Driver",
        "options": [
            {
                "id": "q1-3-a",
                "optionKey": "A",
                "optionText": "Power Wiring Method"
            },
            {
                "id": "q1-3-b",
                "optionKey": "B",
                "optionText": "Pulse Width Modulation"
            },
            {
                "id": "q1-3-c",
                "optionKey": "C",
                "optionText": "Pulse Wave Measurement"
            },
            {
                "id": "q1-3-d",
                "optionKey": "D",
                "optionText": "Power Width Motor"
            }
        ],
        "correctOption": "B"
    },
    {
        "id": "q1-4",
        "quizId": "quiz-1",
        "questionText": "Which motor would generally be preferred for the highest top speed using identical wheels?",
        "questionType": "SINGLE_CHOICE",
        "points": 5,
        "orderIndex": 4,
        "timeLimitSeconds": 35,
        "category": "Motors",
        "options": [
            {
                "id": "q1-4-a",
                "optionKey": "A",
                "optionText": "200 RPM"
            },
            {
                "id": "q1-4-b",
                "optionKey": "B",
                "optionText": "300 RPM"
            },
            {
                "id": "q1-4-c",
                "optionKey": "C",
                "optionText": "500 RPM"
            },
            {
                "id": "q1-4-d",
                "optionKey": "D",
                "optionText": "All have equal speed"
            }
        ],
        "correctOption": "C"
    },
    {
        "id": "q1-5",
        "quizId": "quiz-1",
        "questionText": "What happens to linear wheel speed when diameter increases while RPM remains constant?",
        "questionType": "SINGLE_CHOICE",
        "points": 5,
        "orderIndex": 5,
        "timeLimitSeconds": 35,
        "category": "Wheels",
        "options": [
            {
                "id": "q1-5-a",
                "optionKey": "A",
                "optionText": "Decreases"
            },
            {
                "id": "q1-5-b",
                "optionKey": "B",
                "optionText": "Increases"
            },
            {
                "id": "q1-5-c",
                "optionKey": "C",
                "optionText": "Remains constant"
            },
            {
                "id": "q1-5-d",
                "optionKey": "D",
                "optionText": "Becomes zero"
            }
        ],
        "correctOption": "B"
    },
    {
        "id": "q1-6",
        "quizId": "quiz-1",
        "questionText": "Why is it unsafe to power a DC motor directly from an ESP32 GPIO?",
        "questionType": "SINGLE_CHOICE",
        "points": 5,
        "orderIndex": 6,
        "timeLimitSeconds": 35,
        "category": "ESP32",
        "options": [
            {
                "id": "q1-6-a",
                "optionKey": "A",
                "optionText": "GPIO cannot supply motor current"
            },
            {
                "id": "q1-6-b",
                "optionKey": "B",
                "optionText": "ESP32 has no PWM"
            },
            {
                "id": "q1-6-c",
                "optionKey": "C",
                "optionText": "Motors only use AC"
            },
            {
                "id": "q1-6-d",
                "optionKey": "D",
                "optionText": "GPIO always outputs 12 V"
            }
        ],
        "correctOption": "A"
    },
    {
        "id": "q1-7",
        "quizId": "quiz-1",
        "questionText": "Assuming equal output power and efficiency, which motor provides more torque?",
        "questionType": "SINGLE_CHOICE",
        "points": 5,
        "orderIndex": 7,
        "timeLimitSeconds": 35,
        "category": "Motors",
        "options": [
            {
                "id": "q1-7-a",
                "optionKey": "A",
                "optionText": "200 RPM"
            },
            {
                "id": "q1-7-b",
                "optionKey": "B",
                "optionText": "300 RPM"
            },
            {
                "id": "q1-7-c",
                "optionKey": "C",
                "optionText": "500 RPM"
            },
            {
                "id": "q1-7-d",
                "optionKey": "D",
                "optionText": "All provide the same torque"
            }
        ],
        "correctOption": "A"
    },
    {
        "id": "q1-8",
        "quizId": "quiz-1",
        "questionText": "If motor torque remains constant but wheel radius doubles, what happens to the tangential force at the tyre edge?",
        "questionType": "SINGLE_CHOICE",
        "points": 5,
        "orderIndex": 8,
        "timeLimitSeconds": 35,
        "category": "Wheels",
        "options": [
            {
                "id": "q1-8-a",
                "optionKey": "A",
                "optionText": "Doubles"
            },
            {
                "id": "q1-8-b",
                "optionKey": "B",
                "optionText": "Halves"
            },
            {
                "id": "q1-8-c",
                "optionKey": "C",
                "optionText": "Remains the same"
            },
            {
                "id": "q1-8-d",
                "optionKey": "D",
                "optionText": "Becomes four times greater"
            }
        ],
        "correctOption": "B"
    },
    {
        "id": "q1-9",
        "quizId": "quiz-1",
        "questionText": "What does an H-bridge allow a DC motor to do?",
        "questionType": "SINGLE_CHOICE",
        "points": 5,
        "orderIndex": 9,
        "timeLimitSeconds": 35,
        "category": "Motor Driver",
        "options": [
            {
                "id": "q1-9-a",
                "optionKey": "A",
                "optionText": "Change rotation direction"
            },
            {
                "id": "q1-9-b",
                "optionKey": "B",
                "optionText": "Increase Bluetooth frequency"
            },
            {
                "id": "q1-9-c",
                "optionKey": "C",
                "optionText": "Measure wheel diameter"
            },
            {
                "id": "q1-9-d",
                "optionKey": "D",
                "optionText": "Generate Wi-Fi signals"
            }
        ],
        "correctOption": "A"
    },
    {
        "id": "q1-10",
        "quizId": "quiz-1",
        "questionText": "Which tyre gives the highest ideal linear speed at the same RPM?",
        "questionType": "SINGLE_CHOICE",
        "points": 5,
        "orderIndex": 10,
        "timeLimitSeconds": 35,
        "category": "Wheels",
        "options": [
            {
                "id": "q1-10-a",
                "optionKey": "A",
                "optionText": "7/2"
            },
            {
                "id": "q1-10-b",
                "optionKey": "B",
                "optionText": "9/2"
            },
            {
                "id": "q1-10-c",
                "optionKey": "C",
                "optionText": "10/2"
            },
            {
                "id": "q1-10-d",
                "optionKey": "D",
                "optionText": "7/4"
            }
        ],
        "correctOption": "C"
    },
    {
        "id": "q2-1",
        "quizId": "quiz-2",
        "questionText": "How many DC motors can one L298N module independently control?",
        "questionType": "SINGLE_CHOICE",
        "points": 5,
        "orderIndex": 1,
        "timeLimitSeconds": 35,
        "category": "Motor Driver",
        "options": [
            {
                "id": "q2-1-a",
                "optionKey": "A",
                "optionText": "One"
            },
            {
                "id": "q2-1-b",
                "optionKey": "B",
                "optionText": "Two"
            },
            {
                "id": "q2-1-c",
                "optionKey": "C",
                "optionText": "Three"
            },
            {
                "id": "q2-1-d",
                "optionKey": "D",
                "optionText": "Four"
            }
        ],
        "correctOption": "B"
    },
    {
        "id": "q2-2",
        "quizId": "quiz-2",
        "questionText": "What is the typical ESP32 GPIO logic voltage?",
        "questionType": "SINGLE_CHOICE",
        "points": 5,
        "orderIndex": 2,
        "timeLimitSeconds": 35,
        "category": "ESP32",
        "options": [
            {
                "id": "q2-2-a",
                "optionKey": "A",
                "optionText": "1.8 V"
            },
            {
                "id": "q2-2-b",
                "optionKey": "B",
                "optionText": "3.3 V"
            },
            {
                "id": "q2-2-c",
                "optionKey": "C",
                "optionText": "5 V"
            },
            {
                "id": "q2-2-d",
                "optionKey": "D",
                "optionText": "12 V"
            }
        ],
        "correctOption": "B"
    },
    {
        "id": "q2-3",
        "quizId": "quiz-2",
        "questionText": "Which component executes the robot's control program?",
        "questionType": "SINGLE_CHOICE",
        "points": 5,
        "orderIndex": 3,
        "timeLimitSeconds": 35,
        "category": "ESP32",
        "options": [
            {
                "id": "q2-3-a",
                "optionKey": "A",
                "optionText": "Wheel"
            },
            {
                "id": "q2-3-b",
                "optionKey": "B",
                "optionText": "L298N"
            },
            {
                "id": "q2-3-c",
                "optionKey": "C",
                "optionText": "ESP32"
            },
            {
                "id": "q2-3-d",
                "optionKey": "D",
                "optionText": "DC motor"
            }
        ],
        "correctOption": "C"
    },
    {
        "id": "q2-4",
        "quizId": "quiz-2",
        "questionText": "What happens if ESP32 and the L298N control circuit do not share a common ground?",
        "questionType": "SINGLE_CHOICE",
        "points": 5,
        "orderIndex": 4,
        "timeLimitSeconds": 35,
        "category": "Motor Driver",
        "options": [
            {
                "id": "q2-4-a",
                "optionKey": "A",
                "optionText": "Speed doubles"
            },
            {
                "id": "q2-4-b",
                "optionKey": "B",
                "optionText": "Motor torque doubles"
            },
            {
                "id": "q2-4-c",
                "optionKey": "C",
                "optionText": "Control may become unreliable"
            },
            {
                "id": "q2-4-d",
                "optionKey": "D",
                "optionText": "Wi-Fi becomes faster"
            }
        ],
        "correctOption": "C"
    },
    {
        "id": "q2-5",
        "quizId": "quiz-2",
        "questionText": "Two robots have equal motor RPM. Robot A uses a 7 cm diameter wheel and Robot B uses a 10 cm diameter wheel. Which has higher ideal linear speed?",
        "questionType": "SINGLE_CHOICE",
        "points": 5,
        "orderIndex": 5,
        "timeLimitSeconds": 35,
        "category": "Wheels",
        "options": [
            {
                "id": "q2-5-a",
                "optionKey": "A",
                "optionText": "Robot A"
            },
            {
                "id": "q2-5-b",
                "optionKey": "B",
                "optionText": "Robot B"
            },
            {
                "id": "q2-5-c",
                "optionKey": "C",
                "optionText": "Both equal"
            },
            {
                "id": "q2-5-d",
                "optionKey": "D",
                "optionText": "Cannot determine without motor voltage"
            }
        ],
        "correctOption": "B"
    },
    {
        "id": "q2-6",
        "quizId": "quiz-2",
        "questionText": "Two motors produce equal mechanical power. Motor A operates at 200 RPM and Motor B at 500 RPM. Which produces more torque?",
        "questionType": "SINGLE_CHOICE",
        "points": 5,
        "orderIndex": 6,
        "timeLimitSeconds": 35,
        "category": "Motors",
        "options": [
            {
                "id": "q2-6-a",
                "optionKey": "A",
                "optionText": "Motor A"
            },
            {
                "id": "q2-6-b",
                "optionKey": "B",
                "optionText": "Motor B"
            },
            {
                "id": "q2-6-c",
                "optionKey": "C",
                "optionText": "Both equal"
            },
            {
                "id": "q2-6-d",
                "optionKey": "D",
                "optionText": "Depends only on tyre width"
            }
        ],
        "correctOption": "A"
    },
    {
        "id": "q2-7",
        "quizId": "quiz-2",
        "questionText": "Which tyre provides the greatest theoretical driving force at the ground for the same axle torque?",
        "questionType": "SINGLE_CHOICE",
        "points": 5,
        "orderIndex": 7,
        "timeLimitSeconds": 35,
        "category": "Wheels",
        "options": [
            {
                "id": "q2-7-a",
                "optionKey": "A",
                "optionText": "10/2"
            },
            {
                "id": "q2-7-b",
                "optionKey": "B",
                "optionText": "9/2"
            },
            {
                "id": "q2-7-c",
                "optionKey": "C",
                "optionText": "7/2"
            },
            {
                "id": "q2-7-d",
                "optionKey": "D",
                "optionText": "10/4"
            }
        ],
        "correctOption": "C"
    },
    {
        "id": "q2-8",
        "quizId": "quiz-2",
        "questionText": "Does the ESP32 contain MOSFETs?",
        "questionType": "SINGLE_CHOICE",
        "points": 5,
        "orderIndex": 8,
        "timeLimitSeconds": 35,
        "category": "ESP32",
        "options": [
            {
                "id": "q2-8-a",
                "optionKey": "A",
                "optionText": "No, ESP32 does not contain any MOSFETs"
            },
            {
                "id": "q2-8-b",
                "optionKey": "B",
                "optionText": "Yes, it contains internal MOSFET transistors but not a high-power motor-driving MOSFET stage"
            },
            {
                "id": "q2-8-c",
                "optionKey": "C",
                "optionText": "Yes, it can directly power any DC motor"
            },
            {
                "id": "q2-8-d",
                "optionKey": "D",
                "optionText": "MOSFETs are used only in the L298N"
            }
        ],
        "correctOption": "B"
    },
    {
        "id": "q2-9",
        "quizId": "quiz-2",
        "questionText": "To achieve the greatest acceleration from a dead stop with identical wheels and equal motor power, which motor should be selected?",
        "questionType": "SINGLE_CHOICE",
        "points": 5,
        "orderIndex": 9,
        "timeLimitSeconds": 35,
        "category": "Motors",
        "options": [
            {
                "id": "q2-9-a",
                "optionKey": "A",
                "optionText": "500 RPM"
            },
            {
                "id": "q2-9-b",
                "optionKey": "B",
                "optionText": "300 RPM"
            },
            {
                "id": "q2-9-c",
                "optionKey": "C",
                "optionText": "200 RPM"
            },
            {
                "id": "q2-9-d",
                "optionKey": "D",
                "optionText": "All produce equal acceleration"
            }
        ],
        "correctOption": "C"
    },
    {
        "id": "q2-10",
        "quizId": "quiz-2",
        "questionText": "Which combination would theoretically produce the greatest wheel-edge driving force if the motors deliver equal mechanical power?",
        "questionType": "SINGLE_CHOICE",
        "points": 5,
        "orderIndex": 10,
        "timeLimitSeconds": 35,
        "category": "Wheels",
        "options": [
            {
                "id": "q2-10-a",
                "optionKey": "A",
                "optionText": "500 RPM + 10/4"
            },
            {
                "id": "q2-10-b",
                "optionKey": "B",
                "optionText": "300 RPM + 10/2"
            },
            {
                "id": "q2-10-c",
                "optionKey": "C",
                "optionText": "200 RPM + 7/4"
            },
            {
                "id": "q2-10-d",
                "optionKey": "D",
                "optionText": "500 RPM + 7/2"
            }
        ],
        "correctOption": "C"
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
        if (q.perQuestionSeconds === undefined) q.perQuestionSeconds = 35;
        if (q.preQuizCountdownSeconds === undefined) q.preQuizCountdownSeconds = 10;
        if (q.intermissionSeconds === undefined) q.intermissionSeconds = 7;
        if (q.qualificationCount === undefined) q.qualificationCount = 40;
        if (q.pointsPerCorrect === undefined) q.pointsPerCorrect = 5;
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
