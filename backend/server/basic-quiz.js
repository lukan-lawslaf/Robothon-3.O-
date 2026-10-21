// Answer keys stay on the server; participant responses use publicQuestions().
export const basicRoboticsQuestions = [
  ['Which component supplies electrical energy to a battery-powered robot?', ['Battery', 'Wheel', 'Chassis', 'Sensor bracket'], 'A'],
  ['What is the main job of a microcontroller in a robot?', ['Store mechanical energy', 'Support the wheels', 'Run the program and control connected components', 'Replace all sensors'], 'C'],
  ['Why is a motor driver used between a microcontroller and a DC motor?', ['To measure room temperature', 'To control the motor using a suitable power circuit', 'To store the robot code', 'To increase camera resolution'], 'B'],
  ['Which sensor can measure distance by sending and receiving sound pulses?', ['Temperature sensor', 'Light-dependent resistor', 'Push button', 'Ultrasonic sensor'], 'D'],
  ['What usually happens when the supply polarity of a simple brushed DC motor is reversed?', ['It changes its direction of rotation', 'It becomes a distance sensor', 'Its shaft permanently locks', 'It stores the control program'], 'A'],
].map(([questionText, choices, correctOption]) => ({
  questionText, correctOption, points: 1, category: 'Basic robotics',
  options: choices.map((optionText, index) => ({ optionKey: 'ABCD'[index], optionText })),
}));
