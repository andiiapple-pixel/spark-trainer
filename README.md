# AI Personal Trainer

A complete AI-powered personal training app built with React + Vite, Tailwind CSS, and the Anthropic Claude API.

## Features

- **Onboarding** — 8-step profile builder (name, stats, goal, experience, injuries, equipment, schedule, lifestyle)
- **New Workout** — Guided wizard to generate a custom one-off session via Claude
- **Programmes** — Build structured multi-week plans; generate daily sessions on demand
- **Active Workout Mode** — Distraction-free training UI with set logging, rest timer, and form cues
- **Coach Chat** — Full AI chat with your personal trainer, with profile context always loaded
- **Progress** — Weight trend chart, volume by muscle group, personal records table
- **Workout History** — Full log with trainer feedback, pre-session notes, and sets/reps/weights

## Setup

### 1. Clone and install

```bash
cd ai-personal-trainer
npm install
```

### 2. Add your Anthropic API key

Copy the example env file and fill in your key:

```bash
cp .env.example .env
```

Edit `.env`:
```
VITE_ANTHROPIC_API_KEY=sk-ant-...
```

Get a key at https://console.anthropic.com

### 3. Run locally

```bash
npm run dev
```

Open http://localhost:5173

### 4. Build for production

```bash
npm run build
npm run preview
```

## Notes

- All data is stored in `localStorage` — no backend required
- The Claude API is called directly from the browser (requires the `anthropic-dangerous-direct-browser-access` header, which is set automatically)
- Mobile-first design, max-width 430px, centered on desktop
- Dark mode only
