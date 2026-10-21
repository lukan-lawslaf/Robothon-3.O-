import { QuizDetails } from '../types/quiz';

export const MOCK_ROUND_1_QUIZ: QuizDetails = {
  id: 'round-1-elimination',
  title: 'Round 1: Elimination Quiz',
  roundNumber: 1,
  description: 'Test your foundational knowledge in marine robotics, electronics, and naval hydrodynamics. Top 50 teams advance to Round 2!',
  totalQuestions: 10,
  durationMinutes: 15,
  totalPoints: 100,
  isActive: true,
  questions: [
    {
      id: 'q1-1',
      text: 'Which motor driver H-bridge configuration is best suited for high-current bidirectional DC thruster control?',
      options: [
        { id: 'opt-a', text: 'L298N dual full-bridge' },
        { id: 'opt-b', text: 'BTS7960 43A High Power Driver' },
        { id: 'opt-c', text: 'ULN2003 Darlington array' },
        { id: 'opt-d', text: 'L293D motor shield' },
      ],
      points: 10,
      category: 'Electronics',
    },
    {
      id: 'q1-2',
      text: 'What principle governs the buoyant upward force experienced by a fully or partially immersed boat hull?',
      options: [
        { id: 'opt-a', text: "Bernoulli's Principle" },
        { id: 'opt-b', text: "Archimedes' Principle" },
        { id: 'opt-c', text: "Pascal's Law" },
        { id: 'opt-d', text: 'Reynolds Number Theorem' },
      ],
      points: 10,
      category: 'Hydrodynamics',
    },
    {
      id: 'q1-3',
      text: 'When waterproofing brushless DC motors for fresh water navigation, what is the most critical preparation?',
      options: [
        { id: 'opt-a', text: 'Hermetically sealing the stator with conformal coating and bearing grease' },
        { id: 'opt-b', text: 'Wrapping the propeller blades in electrical tape' },
        { id: 'opt-c', text: 'Operating only at under 5V' },
        { id: 'opt-d', text: 'Using paper gaskets on motor mounts' },
      ],
      points: 10,
      category: 'Waterproofing',
    },
    {
      id: 'q1-4',
      text: 'What is the standard radio frequency band most commonly used for long-range RC surface water craft transmitters?',
      options: [
        { id: 'opt-a', text: '2.4 GHz FHSS' },
        { id: 'opt-b', text: '5.8 GHz analog video only' },
        { id: 'opt-c', text: '13.56 MHz NFC' },
        { id: 'opt-d', text: '900 MHz GSM cellular' },
      ],
      points: 10,
      category: 'RF Telemetry',
    },
    {
      id: 'q1-5',
      text: 'To prevent electrolysis and galvanic corrosion on metallic boat rudder fittings in water, which sacrificial anode is standard?',
      options: [
        { id: 'opt-a', text: 'Zinc or Magnesium anode' },
        { id: 'opt-b', text: 'Pure Lead strip' },
        { id: 'opt-c', text: 'Copper wire' },
        { id: 'opt-d', text: 'Tungsten filament' },
      ],
      points: 10,
      category: 'Hardware',
    },
  ],
};

export const MOCK_ROUND_3_QUIZ: QuizDetails = {
  id: 'round-3-component',
  title: 'Round 3: Component Allocation Quiz',
  roundNumber: 3,
  description: 'Mid-event technical challenge to secure prime component upgrades (high-flow cooling, telemetry antennas, lipo boosters).',
  totalQuestions: 5,
  durationMinutes: 10,
  totalPoints: 50,
  isActive: false, // Locked until round 2 progresses
  questions: [
    {
      id: 'q3-1',
      text: 'What does a LiPo battery C-rating of 45C on a 2200mAh pack signify regarding maximum continuous discharge?',
      options: [
        { id: 'opt-a', text: '99 Amps' },
        { id: 'opt-b', text: '45 Amps' },
        { id: 'opt-c', text: '22 Amps' },
        { id: 'opt-d', text: '110 Amps' },
      ],
      points: 10,
      category: 'Power Systems',
    },
    {
      id: 'q3-2',
      text: 'Which protocol is most efficient for digital telemetry transfer between boat flight controller and companion computer?',
      options: [
        { id: 'opt-a', text: 'MAVLink over UART' },
        { id: 'opt-b', text: 'Raw RS232 7-bit' },
        { id: 'opt-c', text: 'Bit-banged SPI' },
        { id: 'opt-d', text: 'Parallel 8-bit bus' },
      ],
      points: 10,
      category: 'Communication',
    },
  ],
};
