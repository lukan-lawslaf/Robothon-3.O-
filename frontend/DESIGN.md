# ROBOTHON 3.0 — Master UI/UX & 3D Design Specification (`DESIGN.md`)

You are refactoring the existing functional skeleton into a sleek, studio-grade robotics web application. Eliminate all generic AI "slop" styling (no random Tailwind gradients, no generic stock cards, no heavy synthetic bold fonts). Every screen must strictly obey the visual, layout, and interaction contracts below.

---

## 1. Global Color System & Typography Contract

### Color Palette (Strict 4-Tone Robothon Theme)
All styles across CSS, SVG, and Three.js lighting/materials must use this exact palette:
- `--bg-cream`: `#FEF3E2` (Warm Ivory — primary light canvas for Login & high-contrast text on dark surfaces)
- `--accent-amber`: `#F4AE52` (Warm Amber Gold — active borders, hover glows, hotspot discs, secondary badges)
- `--accent-orange`: `#D4621A` (Burnt Rust Orange — primary CTAs, "Apply for Review" buttons, active states, SVG seams)
- `--surface-espresso`: `#2A1A0E` (Deep Espresso Umber — dark stage backgrounds, cards, visor fills, primary dark ink)
- `--border-subtle`: `rgba(254, 243, 226, 0.14)` on dark surfaces / `rgba(42, 26, 14, 0.15)` on cream surfaces

### Typography & Visual Restraint (VEYRA Contract)
- **Primary Font:** Load `Space Grotesk` (Google Fonts), **weight `400` only**.
- **Hierarchy Rule:** Create visual hierarchy through font size (`clamp()`), tight negative letter-spacing (`-0.025em` to `-0.035em`), and uppercase monospace micro-labels—never synthetic bolds.
- **Surface Treatment:** Use crisp `1px` to `2px` borders, `backdrop-filter: blur(16px)` panels, and restrained spacing.

---

## 2. View 1: Mechanical Helmet Splash / Loading Screen (`/` or Pre-Loader)

Adapt the exact inline SVG mechanical assembly and three-point layout from `outer_design.txt`:

### Layout & Composition
- Full-viewport non-scrolling stage (`.stage`, `width: 100vw; height: 100svh; overflow: hidden`).
- **Background:** Replace the blue gradients with a warm dark espresso-to-burnt-orange radial and linear gradient:
  ```css
  background:
    radial-gradient(circle at 50% 46%, rgba(244,174,82,.35) 0%, rgba(212,98,26,.22) 35%, rgba(42,26,14,.85) 72%, #2A1A0E 100%),
    linear-gradient(128deg, #2A1A0E 0%, #4A2511 48%, #2A1A0E 100%);
  ```
- Three-Point Desktop Composition:
  1. Top-left `<h1 class="brand">Robothon 3.0<sup>TM</sup></h1>` (`top: 6.05%; left: 3.45%`) in `#FEF3E2`.
  2. Center inline `<svg class="robot" viewBox="0 0 660 680">` mechanical helmet.
  3. Bottom-right `<p class="studio">Robotics Studio</p>` (`right: 3.05%; bottom: 6.45%`, italic) in `#F4AE52`.
  4. Top-right vertical `.edge-line` accent bar in `#F4AE52`.

### Inline SVG Helmet & Assembly Choreography
- Retain the exact `<path>` coordinates for all 11 mechanical groups: `.rear-left`, `.rear-right`, `.ear-left`, `.ear-right`, `.jaw-left`, `.jaw-right`, `.jaw-center`, `.visor`, `.crown-fin`, `.seams`, and `.face-details`.
- Recolour the SVG defs & fills:
  - `#shell` gradient stops: `0: #FEF3E2`, `0.56: #F9E5C8`, `1: #F4AE52`.
  - `#visor` gradient stops: `0: #3D2414`, `1: #2A1A0E`.
  - Panel seams & ear accents (`#0763d9` / `#0864d9`): Replace with `#D4621A`.
- **Animation:** Keep the exact `cubic-bezier(.16,1,.3,1)` staggered assembly keyframes (`assemble-left`, `dock-left`, `jaw-center-in`, `visor-seat`, `fin-seat`, `detail-reveal`). When `.studio` finishes its `animationend` (around 1.9s), smoothly transition or provide an "Enter Platform" trigger into `/login`.

---

## 3. View 2: Dual Login Page (`/login`) — "Human Meets Machine"

Model this screen directly on the **NeuralKinetics** editorial reference (`image_da4592.jpg`):

### Canvas & Center Orb
- **Background:** Clean, warm `#FEF3E2` ivory full-screen canvas with dark `#2A1A0E` typography.
- **Center Atmospheric Orb:** Positioned dead-center (`width: 460px; height: 460px; border-radius: 50%; filter: blur(45px)`), using a soft radial gradient of `#F4AE52` (top-left), `#D4621A` (core accent), and subtle warm white.

### The Reaching Hands Hero Composition
- **Left Edge:** A stylized Human Hand reaching inward horizontally from the left viewport edge (`left: 0; top: 44%`), index finger extended toward the center.
- **Right Edge:** A high-detail Robotic/Bionic Hand reaching inward from the right viewport edge (`right: 0; top: 42%`), mechanical index finger pointing directly at the human finger with a small gap over the center orb. (Use crisp high-contrast SVGs/PNGs or a clean canvas illustration).

### Center Typography & Floating Login Card
- **Top Minimal Bar:** Left brand wordmark `Robothon 3.0`, coupled with a dark `#2A1A0E` pill badge (`+ Portal Access`), and right status pill (`Adaptive Scoring System`).
- **Center Headline (Between the Hands):**
  - Line 1: `Robothon 3.0` (medium-large, `#2A1A0E`)
  - Line 2: `Engineering made organic` (with the left half slightly muted `#8C7360` and the right half crisp `#2A1A0E`).
- **Interactive Login Module (Floating Below Headline):**
  - Sleek translucent card (`background: rgba(254, 243, 226, 0.78); backdrop-filter: blur(20px); border: 1px solid rgba(42, 26, 14, 0.15); border-radius: 20px; padding: 24px; width: 380px`).
  - **Pill Role Switcher:** Toggle between **`Participant Team`** and **`Tech Team Admin`** (active pill uses `#2A1A0E` background with `#FEF3E2` text; CTA submit button uses `#D4621A`).
- **Bottom Corner Anchors (From Reference):**
  - Bottom-Left: Small label `Autonomous Naval & Rover Dynamics` + 3-line summary: *"Unifying hardware precision with live telemetry to power the next round of Robothon."*
  - Bottom-Right: Three minimal outline pill tags (`Round 1: Quiz`, `Top 50 Cut-off`, `Live Checkpoints`).

---

## 4. View 3: Main Inner Workspace (`/team-dashboard`, `/admin-dashboard`, `/leaderboard`)

Strictly implement the wireframe layout from `image_da50de.png` combined with VEYRA's interaction contract (`innter_design.txt`) and the 3D Bot (`robothon_3d_bot.html`):

```
+-------------------------------------------------------------------------+
|  ( N )        [ Checkpoints ]   [ Quizzes ]   [ Leaderboard ]      (O)  |  <- Top Pill Navbar
+-------------------------------------------------------------------------+
|                                                                         |
|        . - ~ ~ ~ - .                     +---------------------------+  |
|    , '               ' ,                 | Checkpoint 01 // Approved |  |
|   /     [ 3D BOT ]      \                +---------------------------+  |
|  |   Interactive GLB /   |               +---------------------------+  |
|  |   Three.js Viewport   |               | Checkpoint 02 // Active   |  |
|   \   + VEYRA Hotspots  /                | [ Apply for Review ]      |  |
|    '.                 .'                 +---------------------------+  |
|      ' - . _ _ _ . - '                   +---------------------------+  |
|     [ Explode Slider % ]                 | Checkpoint 03 // Locked   |  |
|                                          +---------------------------+  |
+-------------------------------------------------------------------------+
|  ROBOTHON 3.0 — Design Study & Telemetry     Rank: #04 | Score: 420 pts |  <- Baseline Footer
+-------------------------------------------------------------------------+
```

### A. Top Floating Pill Navbar (`image_da50de.png`)
- Full-width rounded pill container (`margin: 16px 24px; padding: 10px 24px; border-radius: 999px; border: 2px solid var(--border-subtle); background: rgba(42, 26, 14, 0.9)`).
- **Left:** Custom `N` / Robothon geometric monogram icon.
- **Center:** 3 pill navigation buttons (`border-radius: 12px`):
  1. `Bot & Checkpoints`
  2. `Quizzes (Elimination & Component)`
  3. `Live Leaderboard`
  *( Plus Admin Queue tab when logged in as Tech Team )*.
- **Right:** Circular profile/role-switcher avatar button (`width: 40px; height: 40px; border-radius: 50%`).

### B. Left Stage: Circular Framed 3D Bot Viewport (`robothon_3d_bot.html` + `innter_design.txt`)
- **Circular Frame Contract:** Place the interactive Three.js canvas inside a large circular (or `border-radius: 50%` / `24px` framed) stage on the left half of the screen (`border: 3px solid #FEF3E2` or `#F4AE52`, matching VEYRA's 3px outer frame rule and the circle in `image_da50de.png`).
- **3D Model Integration:** Reuse the exact procedural Three.js `Robothon_3_Bot` builder and `.glb` loader (`./robothon_3_bot.glb`) from `robothon_3d_bot.html`.
- Update the Three.js scene background to `#2A1A0E` and rim/fill directional lights to `#F4AE52` and `#D4621A`.
- Retain all 7 subsystems and their exact `explodeOffset` vectors:
  1. `chassis` (`Chassis & Deck`, offset `0, -0.45, 0`)
  2. `wheels` (`Wheels (x4)`, lateral explode `1.05`)
  3. `motors` (`DC Motors (x4)`, offset `0, -0.80, 0`)
  4. `l298n` (`L298N Driver`, offset `0, 1.15, 0.70`)
  5. `battery` (`3S Battery Pack`, offset `0, 1.45, 0`)
  6. `esp32` (`ESP32-WROOM`, offset `0, 1.20, -0.85`)
  7. `wires` (`Wiring Harness`, offset `0, 2.10, 0`)
- **VEYRA Hotspot Overlay & Detail State Machine (`innter_design.txt`):**
  - Overlay 48px interaction target discs with compact `#F4AE52` / `#D4621A` circles, dark `#2A1A0E` thin `+` icons, and restrained hover labels on the 3D bot viewport.
  - Maintain the `overview → entering → detail → returning → overview` transition state machine: clicking a hotspot or a checkpoint card smoothly interpolates the 3D camera and `targetExplode` value (`0.75`) to isolate and inspect that hardware subsystem.
  - Include a compact pill dock directly beneath the circular frame (never obstructing the bot) with the **Explode Slider (`0% - 100%`)** and **Reset View** button.

### C. Right Column: Stacked Horizontal Pill Cards (`image_da50de.png`)
- Right half of the workspace displays a vertical stack of sleek, elongated horizontal rounded cards (`border-radius: 16px; padding: 18px 24px; border: 1.5px solid var(--border-subtle)`) matching the 4 stacked bars in `image_da50de.png`.
- **Synchronized Checkpoints (Participant View):**
  - Each card maps to a hardware build checkpoint (e.g., *01: Chassis & Aero Deck*, *02: 4WD GA25 DC Motors*, *03: High-Grip Chevron Wheels*, *04: L298N H-Bridge Driver*, *05: 3S 11.1V Li-Ion Pack*, *06: ESP32-WROOM Telemetry*, *07: Dupont & Silicone Wiring Harness* — plus custom boat/bot checkpoints from Tech Lead Gaurav).
  - Hovering or clicking a card highlights the corresponding 3D subsystem on the left and displays its technical specs (`Weight`, `Voltage`, `Connections`).
  - The active card expands slightly (matching the taller 3rd bar in `image_da50de.png`) to reveal the **`Apply for Review`** button in `#D4621A` orange, which dispatches the review ticket to the Admin Queue.
- **When Switched to Quizzes / Leaderboard / Admin View:**
  - Keep the exact Top Pill Navbar and Bottom Baseline Footer.
  - **Quiz View:** Left side shows the live countdown timer, question progress, and 3D component preview (for Quiz 2 Component Allocation); Right side shows the 4 MCQ options styled as the 4 stacked horizontal pill bars from `image_da50de.png`!
  - **Admin View:** Left side shows the 3D Bot with pulsing hotspots on whichever subsystem a team has requested a review for; Right side stacks the incoming **Review Request Tickets** (`Assign to Me`, `Approve +Points`, `Reject`) and the **Mini-Game Bonus Points** quick-entry bar.
  - **Live Leaderboard View:** Top 3 Podium cards highlighted in `#F4AE52` Amber Gold and `#D4621A` Rust Orange, with a live-updating table showing `Top 50 Qualified` badges.

### D. Bottom Baseline Footer (`innter_design.txt` + `image_da50de.png`)
- Full-width slim baseline bar anchored at the bottom of the viewport (`border-top: 1.5px solid var(--border-subtle)`).
- Left side displays `ROBOTHON 3.0 — Hardware Telemetry` and the active subsystem's 1-line summary.
- Right side displays live team status: `Team Rank`, `Qualification Status (Top 50)`, `Checkpoint Score + Quiz Score + Mini-Game Score = Total`.
