# BugOps Arena

BugOps Arena is an AI-powered real-time debugging game where players fix buggy code under time pressure, earn XP, unlock badges, use AI-guided hints, submit scores to a live local leaderboard, and review progress in a productivity dashboard.

## Hackathon Theme Alignment

Theme: **Create Websites That Feel Alive - Build the Future of the Web**

BugOps Arena combines:

- Interactive website
- Productivity application
- Creative frontend experiment
- Browser-based game
- Real-time leaderboard
- AI-powered web utility

The result is a polished hackathon experience with animated UI, a playable debugging arena, persistent local progress, AI-ready hints, and a leaderboard that can later be connected to Firebase or Supabase.

## Features

- Futuristic landing page with glitch heading, animated code preview, smooth scrolling, feature cards, and leaderboard preview
- Browser-based debugging game with 50 challenges across JavaScript, Python, C, and Java
- Timer countdown, score, XP, lives, difficulty selection, streak tracking, and final result screen
- AI hint utility with Gemini API support and curated fallback hints
- Explain Bug flow that reveals clearer explanations after submission
- Productivity dashboard with total bugs fixed, accuracy, streaks, XP, time spent, weak topics, best difficulty, recommendations, and progress bars
- Local real-time leaderboard using localStorage and cross-tab storage events
- Confetti effects, badge unlock toasts, animated background particles, terminal-style panels, and responsive neon UI

## Tech Stack

- HTML5
- CSS3
- Vanilla JavaScript
- localStorage persistence
- Optional Gemini API integration through browser config or saved key
- Static deployment ready for Vercel, Netlify, GitHub Pages, or any static host

## How To Run Locally

From the project folder:

```bash
python -m http.server 4173
```

Then open:

```text
http://localhost:4173
```

You can also open `index.html` directly, but a local server is recommended for browser APIs and deployment-like behavior.

## Environment Variables For AI API

For the static MVP, the app reads Gemini keys from:

- `window.BUGOPS_ENV.VITE_GEMINI_API_KEY`
- `window.BUGOPS_ENV.NEXT_PUBLIC_GEMINI_API_KEY`
- `window.BUGOPS_ENV.GEMINI_API_KEY`
- the in-app AI Helper key field, stored locally in the browser

Use the included `config.js` file for local static demos, or copy from `config.example.js` if you want to reset the template:

```js
window.BUGOPS_ENV = {
  VITE_GEMINI_API_KEY: "your_gemini_key_here",
  GEMINI_MODEL: "gemini-1.5-flash-latest"
};
```

For production, route AI requests through a small backend or serverless function so private API keys are not exposed to the browser.

## Deployment

Static deployment helpers are included through `vercel.json`, `netlify.toml`, and `_redirects`.

### Vercel

1. Import this folder as a static project.
2. Keep the output directory as the project root.
3. Deploy.

### Netlify

1. Create a new site from this folder.
2. Leave build command blank.
3. Set publish directory to `.`.
4. Deploy.

## Screenshots / Demo

Add final screenshots or a demo GIF here:

- Landing page screenshot
- Arena gameplay screenshot
- Dashboard screenshot
- Leaderboard screenshot

See `docs/SCREENSHOT_GUIDE.md` for a capture checklist and `docs/DEMO_SCRIPT.md` for a short judging walkthrough.

## Project Docs

- `docs/AI_SETUP.md`
- `docs/DEPLOYMENT.md`
- `docs/CHALLENGE_AUTHORING.md`
- `docs/LEADERBOARD_INTEGRATION.md`
- `docs/TESTING_CHECKLIST.md`
- `docs/JUDGING_NOTES.md`
- `CHANGELOG.md`
- `SECURITY.md`

## Future Improvements

- Replace localStorage leaderboard with Firebase Realtime Database, Firestore, or Supabase channels
- Add authenticated player profiles
- Add multiplayer live rooms and head-to-head debugging races
- Add Monaco Editor for richer code editing
- Add challenge packs by topic and language
- Add backend-secured AI hint generation
- Add daily quests and shareable result cards
