export type CheckpointStatus = 'locked' | 'available' | 'pending_review' | 'approved';

export interface TeamMemberInfo {
  memberIndex?: number;
  role?: string;
  name: string;
  enrollment?: string;
  email?: string;
  phone?: string;
  residence?: string;
}

export interface MockTeam {
  id: string;
  teamName: string;
  rank: number;
  totalPoints: number;
  checkpointPoints: number;
  quizPoints: number;
  miniGamePoints: number;
  currentCheckpoint: string;
  isQualified: boolean;
  isEliminated?: boolean;
  isDisqualified?: boolean;
  debarred?: boolean;
  qualificationStatus?: string;
  leader?: TeamMemberInfo | null;
  members?: TeamMemberInfo[];
  allMembers?: TeamMemberInfo[];
}

export interface MockCheckpoint {
  id: string;
  code: string;
  stepNumber: number;
  title: string;
  subsystem: 'motors' | 'l298n' | 'wires' | 'esp32' | 'battery' | 'chassis' | 'wheels';
  description: string;
  points: number;
  status: CheckpointStatus;
}

export interface MockQuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswerIndex?: number;
}

export interface MockQuiz {
  id: string;
  title: string;
  description: string;
  timeLimit: number; // seconds
  totalPoints: number;
  isActive: boolean;
  questions: MockQuizQuestion[];
}

export interface MockReviewTicket {
  ticketId: string;
  teamId: string;
  teamName: string;
  checkpointId: string;
  checkpointTitle: string;
  requestedAt: string;
  assignedAdmin: string | null;
  assignedAdminId?: string | null;
  status: 'pending' | 'in_review' | 'approved' | 'rejected';
  points: number;
}

export const INITIAL_TEAMS: MockTeam[] = [
  {
    id: 'team-01',
    teamName: 'AquaPulse Robotics',
    rank: 1,
    totalPoints: 245,
    checkpointPoints: 125,
    quizPoints: 90,
    miniGamePoints: 30,
    currentCheckpoint: 'Step 3: ESC & Signal Wiring',
    isQualified: true,
  },
  {
    id: 'team-02',
    teamName: 'HydroVortex Titans',
    rank: 2,
    totalPoints: 230,
    checkpointPoints: 125,
    quizPoints: 85,
    miniGamePoints: 20,
    currentCheckpoint: 'Step 3: ESC & Signal Wiring',
    isQualified: true,
  },
  {
    id: 'team-03',
    teamName: 'NauticalBytes Lab',
    rank: 3,
    totalPoints: 205,
    checkpointPoints: 75,
    quizPoints: 95,
    miniGamePoints: 35,
    currentCheckpoint: 'Step 2: Thruster Mounting',
    isQualified: true,
  },
  {
    id: 'team-04',
    teamName: 'WaveRiders Crew',
    rank: 4,
    totalPoints: 175,
    checkpointPoints: 75,
    quizPoints: 80,
    miniGamePoints: 20,
    currentCheckpoint: 'Step 2: Thruster Mounting',
    isQualified: true,
  },
  {
    id: 'team-05',
    teamName: 'Oceanic Circuit Masters',
    rank: 5,
    totalPoints: 160,
    checkpointPoints: 75,
    quizPoints: 70,
    miniGamePoints: 15,
    currentCheckpoint: 'Step 2: Thruster Mounting',
    isQualified: true,
  },
  {
    id: 'team-06',
    teamName: 'Submersible Pioneers',
    rank: 6,
    totalPoints: 140,
    checkpointPoints: 50,
    quizPoints: 75,
    miniGamePoints: 15,
    currentCheckpoint: 'Step 2: Thruster Mounting',
    isQualified: true,
  },
  {
    id: 'team-07',
    teamName: 'Rudder Dynamics',
    rank: 7,
    totalPoints: 125,
    checkpointPoints: 50,
    quizPoints: 65,
    miniGamePoints: 10,
    currentCheckpoint: 'Step 2: Thruster Mounting',
    isQualified: true,
  },
  {
    id: 'team-08',
    teamName: 'DeepBlue Builders',
    rank: 8,
    totalPoints: 115,
    checkpointPoints: 50,
    quizPoints: 60,
    miniGamePoints: 5,
    currentCheckpoint: 'Step 2: Thruster Mounting',
    isQualified: true,
  },
  {
    id: 'team-09',
    teamName: 'Propeller Surge',
    rank: 9,
    totalPoints: 105,
    checkpointPoints: 50,
    quizPoints: 55,
    miniGamePoints: 0,
    currentCheckpoint: 'Step 1: Hull Base Assembly',
    isQualified: true,
  },
  {
    id: 'team-10',
    teamName: 'AnchorTech Innovations',
    rank: 10,
    totalPoints: 90,
    checkpointPoints: 0,
    quizPoints: 80,
    miniGamePoints: 10,
    currentCheckpoint: 'Step 1: Hull Base Assembly',
    isQualified: true,
  },
  {
    id: 'team-11',
    teamName: 'Buoyancy Rangers',
    rank: 11,
    totalPoints: 40,
    checkpointPoints: 0,
    quizPoints: 40,
    miniGamePoints: 0,
    currentCheckpoint: 'Locked (Eliminated)',
    isQualified: false,
  },
  {
    id: 'team-12',
    teamName: 'Surface Gliders',
    rank: 12,
    totalPoints: 35,
    checkpointPoints: 0,
    quizPoints: 35,
    miniGamePoints: 0,
    currentCheckpoint: 'Locked (Eliminated)',
    isQualified: false,
  },
];

export const checkpoints = [
  { id: 1, code: "CP 01", title: "Motor Mounting & Connection", subsystem: "motors", points: 100 },
  { id: 2, code: "CP 02", title: "L298N Motor Driver Setup", subsystem: "l298n", points: 100 },
  { id: 3, code: "CP 03", title: "ESP32 Logic Wiring", subsystem: "wires", points: 100 },
  { id: 4, code: "CP 04", title: "Firmware & Code Push", subsystem: "esp32", points: 100 },
  { id: 5, code: "CP 05", title: "3S Battery Power Integration", subsystem: "battery", points: 100 },
  { id: 6, code: "CP 06", title: "Wi-Fi / BLE Pairing", subsystem: "esp32", points: 100 },
  { id: 7, code: "CP 07", title: "Polarity Check & Maiden Run", subsystem: "chassis", points: 200 }
];

export const INITIAL_CHECKPOINTS: MockCheckpoint[] = [
  {
    id: 'cp-1',
    code: 'CP 01',
    stepNumber: 1,
    title: 'Motor Mounting & Connection',
    subsystem: 'motors',
    description: 'Mount 4x GA25 DC geared motors to chassis brackets and secure 12mm hex couplers.',
    points: 100,
    status: 'approved',
  },
  {
    id: 'cp-2',
    code: 'CP 02',
    stepNumber: 2,
    title: 'L298N Motor Driver Setup',
    subsystem: 'l298n',
    description: 'Connect and configure L298N motor driver with proper power supply and motor outputs.',
    points: 100,
    status: 'approved',
  },
  {
    id: 'cp-3',
    code: 'CP 03',
    stepNumber: 3,
    title: 'ESP32 Logic Wiring',
    subsystem: 'wires',
    description: 'Wire ESP32 with sensors, motor driver and peripherals as per circuit diagram.',
    points: 100,
    status: 'available',
  },
  {
    id: 'cp-4',
    code: 'CP 04',
    stepNumber: 4,
    title: 'Firmware & Code Push',
    subsystem: 'esp32',
    description: 'Upload firmware, configure parameters and verify basic control functions.',
    points: 100,
    status: 'locked',
  },
  {
    id: 'cp-5',
    code: 'CP 05',
    stepNumber: 5,
    title: '3S Battery Power Integration',
    subsystem: 'battery',
    description: 'Integrate 3S LiPo battery with power management and voltage regulation.',
    points: 100,
    status: 'locked',
  },
  {
    id: 'cp-6',
    code: 'CP 06',
    stepNumber: 6,
    title: 'Wi-Fi / BLE Pairing',
    subsystem: 'esp32',
    description: 'Establish Wi-Fi / BLE pairing for teleoperation and real-time telemetry.',
    points: 100,
    status: 'locked',
  },
  {
    id: 'cp-7',
    code: 'CP 07',
    stepNumber: 7,
    title: 'Polarity Check & Maiden Run',
    subsystem: 'chassis',
    description: 'Verify motor polarity, chassis structural balance, and perform maiden trial run.',
    points: 200,
    status: 'locked',
  },
];

export const INITIAL_QUIZZES: Record<string, MockQuiz> = {
  'quiz-1': {
    id: 'quiz-1',
    title: 'Quiz 1: Round 1 Elimination Challenge',
    description: 'Timed technical challenge on marine electronics, motor sizing, and hydrodynamics. Top 50 teams qualify for Round 2!',
    timeLimit: 600, // 10 minutes
    totalPoints: 100,
    isActive: true,
    questions: [
      {
        id: 'q1-1',
        question: 'Which motor driver is best suited for high-current bidirectional DC thruster control?',
        options: ['L298N Dual H-Bridge', 'BTS7960 43A High Power Driver', 'ULN2003 Stepper Driver', 'L293D Shield'],
        correctAnswerIndex: 1,
      },
      {
        id: 'q1-2',
        question: 'What physical principle determines the buoyant upward force on a submerged boat hull?',
        options: ["Bernoulli's Principle", "Archimedes' Principle", "Pascal's Law", "Hooke's Law"],
        correctAnswerIndex: 1,
      },
      {
        id: 'q1-3',
        question: 'What is the primary risk of operating unsealed brushless motors in contaminated water?',
        options: ['Electrolytic corrosion and bearing seizure', 'Immediate loss of magnet polarity', 'High frequency interference', 'Battery overvoltage'],
        correctAnswerIndex: 0,
      },
      {
        id: 'q1-4',
        question: 'Which frequency band is most standard for interference-free surface RC boat controls?',
        options: ['2.4 GHz FHSS', '5.8 GHz analog video', '433 MHz LoRa', '13.56 MHz NFC'],
        correctAnswerIndex: 0,
      },
      {
        id: 'q1-5',
        question: 'What is the function of a sacrificial zinc anode on marine hardware?',
        options: ['Prevents galvanic corrosion of structural metals', 'Increases hull displacement', 'Reduces water drag', 'Acts as electrical grounding return'],
        correctAnswerIndex: 0,
      },
    ],
  },
  'quiz-2': {
    id: 'quiz-2',
    title: 'Quiz 2: Round 3 Component Allocation Quiz',
    description: 'Mid-event sprint challenge to earn bonus component kits (extra high-discharge LiPos, water cooling sleeves, telemetry units).',
    timeLimit: 300, // 5 minutes
    totalPoints: 50,
    isActive: true,
    questions: [
      {
        id: 'q2-1',
        question: 'What does a 50C continuous discharge rating represent on a 3000mAh 3S LiPo pack?',
        options: ['150 Amperes maximum continuous current', '50 Amperes maximum current', '30 Amperes maximum current', '15 Amperes continuous current'],
        correctAnswerIndex: 0,
      },
      {
        id: 'q2-2',
        question: 'When calibrating ESC throttle range using PWM, what pulse width corresponds to full reverse in bi-directional mode?',
        options: ['1000 microseconds', '1500 microseconds', '2000 microseconds', '500 microseconds'],
        correctAnswerIndex: 0,
      },
      {
        id: 'q2-3',
        question: 'Which serial communication protocol is standard for flight controller telemetry to onboard companion computers?',
        options: ['MAVLink over UART', 'I2S Audio protocol', 'Raw 1-Wire protocol', 'Modbus RTU'],
        correctAnswerIndex: 0,
      },
    ],
  },
};

export const INITIAL_REVIEW_TICKETS: MockReviewTicket[] = [
  {
    ticketId: 'TKT-101',
    teamId: 'team-01',
    teamName: 'AquaPulse Robotics',
    checkpointId: 'cp-3',
    checkpointTitle: 'Step 3: ESC & Signal Wiring',
    requestedAt: '11:42 AM',
    assignedAdmin: 'Ishan (Tech Lead)',
    status: 'in_review',
    points: 75,
  },
  {
    ticketId: 'TKT-102',
    teamId: 'team-02',
    teamName: 'HydroVortex Titans',
    checkpointId: 'cp-3',
    checkpointTitle: 'Step 3: ESC & Signal Wiring',
    requestedAt: '11:45 AM',
    assignedAdmin: null,
    status: 'pending',
    points: 75,
  },
  {
    ticketId: 'TKT-103',
    teamId: 'team-03',
    teamName: 'NauticalBytes Lab',
    checkpointId: 'cp-2',
    checkpointTitle: 'Step 2: Motor & Thruster Mounting',
    requestedAt: '11:30 AM',
    assignedAdmin: 'Shubham',
    status: 'approved',
    points: 75,
  },
];
