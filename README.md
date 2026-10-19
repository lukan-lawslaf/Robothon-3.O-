# 🤖 ROBOTHON 3.0 — Platform

> Autonomous naval & robotics event scoring platform, live leaderboard, checkpoint verification queue, and interactive 3D hardware inspector.

---

## ⚡ Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/lukan-lawslaf/Robothon-3.O-.git
cd Robothon-3.O-
```

### 2. Install Dependencies
```bash
pnpm install
# or: npm install
```

### 3. Run Dev Server
```bash
pnpm dev
# or: npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🧭 Routes & Core Views

| Route | View | Description | Credentials / Defaults |
|---|---|---|---|
| `/login` | **Dual Login** | Participant & Tech Admin authentication with animated looping background video | `team-01` (Team) / `admin123` (Admin) |
| `/team-dashboard` | **Participant Dashboard** | Interactive 3D bot subsystem inspector, live checkpoints timeline, and score breakdown | Default active team: `AquaPulse Robotics` |
| `/admin-dashboard` | **Tech Admin Portal** | Real-time review queue, ticket approval/rejection, and bonus point awards | Role: `admin` |
| `/leaderboard` | **Live Leaderboard** | Public live scoreboard, Top 50 cut-off filters, and detailed score breakdown | Public view |

> 💡 **Role Switcher**: Click the profile pill on the top right of the navigation bar to instantly jump between **Participant**, **Admin**, and **Public** views during development.

---

## 🔌 Backend Integration Guide (API Hook-up)

All mock services are isolated and clearly documented with `// TODO:` hand-off tags so backend engineers can easily swap mock handlers with real REST/WebSocket endpoints:

```
src/
├── services/
│   ├── backendService.ts   # 👈 [Ishan] Connect Auth, Checkpoint Review Queue, Bonus Points APIs
│   ├── quizService.ts      # 👈 [Shubham] Connect Quiz 1 & 2 Question Banks & Qualification APIs
│   └── stateStore.ts       # Central reactive state store (mimics live WebSocket events)
├── mockData/
│   ├── checkpoints.mock.ts # 7 Milestone boat-building definitions
│   ├── quizzes.mock.ts     # Round 1 & Round 2 question banks
│   ├── teams.mock.ts       # Sample teams (qualified and cut-off)
│   └── leaderboard.mock.ts # Seed rankings & point totals
└── components/
    ├── bot/Bot3DViewer.tsx # Three.js interactive 3D model viewer with subsystem camera presets
    └── common/PillNavbar.tsx# Shared header with club emblem and tab navigation
```

---

## 📦 Assets & 3D Models

All static assets are located in the `public/` directory and served at root path:
- `public/robothon_3_bot.glb` — Assembled rover/boat 3D GLTF model
- `public/esp32.glb`, `public/l298n.glb` — Component 3D models
- `public/robotics_club_logo.svg` — Official club branding emblem
- `public/Human_and_robotic_hands_touching_20261019014013.mp4` — High-def looping video for `/login`

---

## 🛠️ Build & Verification

```bash
# Type-check and bundle production build
pnpm build

# Preview production build locally
pnpm preview
```

---

## 🌿 Git Workflow

1. Always pull latest before starting work:
   ```bash
   git checkout main
   git pull origin main
   ```
2. Create a feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. Test build before pushing:
   ```bash
   pnpm build
   ```
