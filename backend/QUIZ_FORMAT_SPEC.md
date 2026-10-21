# Robothon Quiz Competition System — Quiz Format Specification

This document outlines the official JSON structure for importing questions and configuring quizzes in the Robothon Quiz Module.

---

## Format Option 1: Complete Quiz Package (Settings + Questions)
Use this format when uploading a complete quiz round with timing, scoring rules, and questions in one shot.

```json
{
  "name": "Robothon 2026 — Quiz 1: Preliminary Elimination",
  "durationSeconds": 1800,
  "pointsPerCorrect": 4,
  "negativeMarking": true,
  "negativePoints": 1,
  "qualificationCount": 40,
  "questions": [
    {
      "questionText": "Which type of motor control uses proportional, integral, and derivative terms to calculate correction values?",
      "category": "Control Systems",
      "points": 4,
      "options": [
        { "optionKey": "A", "optionText": "Open-loop feedforward" },
        { "optionKey": "B", "optionText": "Closed-loop PID control" },
        { "optionKey": "C", "optionText": "Bang-bang switching" },
        { "optionKey": "D", "optionText": "Pulse width modulation only" }
      ],
      "correctOption": "B"
    }
  ]
}
```

---

## Format Option 2: Questions Array Only
Use this format if you want to import or append only questions to an existing quiz without altering its settings.

```json
[
  {
    "questionText": "What does an IMU measure directly on a mobile robot platform?",
    "category": "Sensors",
    "points": 4,
    "options": [
      { "optionKey": "A", "optionText": "Linear acceleration and angular rate" },
      { "optionKey": "B", "optionText": "Absolute GPS coordinates" },
      { "optionKey": "C", "optionText": "Wheel odometry slip" },
      { "optionKey": "D", "optionText": "Motor armature temperature" }
    ],
    "correctOption": "A"
  }
]
```

---

## Field Reference

### Quiz Fields
| Field | Type | Description |
|---|---|---|
| `name` | string | Display name of the quiz round |
| `durationSeconds` | number | Total timer in seconds (e.g., `1800` for 30 minutes) |
| `pointsPerCorrect` | number | Default score added for correct response (e.g., `4`) |
| `negativeMarking` | boolean | Set `true` to deduct points on incorrect answers |
| `negativePoints` | number | Marks deducted for incorrect response (e.g., `1`) |
| `qualificationCount` | number | Cutoff count for teams qualifying to the next stage (e.g., `40`) |
| `questions` | array | Array of question objects |

### Question Fields
| Field | Type | Description |
|---|---|---|
| `questionText` | string | **Required**. The technical challenge prompt or question text |
| `category` | string | Topic or section tag (e.g., `Kinematics`, `Electronics`) |
| `points` | number | Marks for this specific question (defaults to quiz `pointsPerCorrect`) |
| `options` | array | **Required**. Array of 2 to 4 options |
| `options[].optionKey` | string | `A`, `B`, `C`, or `D` |
| `options[].optionText` | string | Text for this option choice |
| `correctOption` | string | **Required**. Must match one of the `optionKey` values (e.g., `A`, `B`, `C`, or `D`) |

---

## How to Upload

### Method A: Web UI Upload (Instant)
1. Go to **Organizer / Admin** in the web interface.
2. Select the target quiz (**Quiz 1** or **Quiz 2**).
3. Under the **Import Questions from JSON** panel, paste the JSON into the box or click **Choose JSON File**.
4. Select **Replace All Questions** or **Append Questions**, then click **Validate & Import**.

### Method B: Direct Database File
Place your JSON structure directly inside `data/quiz-state.json` under the `questions` array.
