# BugOps Arena

BugOps Arena is an AI-powered debugging game where players fix buggy code under time pressure, earn XP, unlock achievements, submit leaderboard scores, and sync progress across devices after signing in.

## Current Stack

- Frontend: HTML, CSS, vanilla JavaScript
- Backend: Node.js, Express, TypeScript
- Auth: Google and GitHub OAuth where provider credentials are configured
- Sessions: secure HTTP-only cookies backed by PostgreSQL
- Database: PostgreSQL with Prisma
- Validation: Zod
- Tests: Vitest
- AI: server-side provider gateway with curated fallback hints

## Features

- Timed debugging arena with lives, score, XP, streaks, and badges
- 50 JavaScript, Python, C, and Java challenges
- Signed-in progress synced through PostgreSQL
- Server-backed leaderboard
- Legacy local progress migration when a signed-in user has old `bugopsArenaProgress`
- localStorage limited to editor drafts and UI preferences
- AI hints through secure backend configuration

## Local Setup

Install dependencies:

```bash
npm install
```

Create `.env` from `.env.example` and set at least:

```bash
DATABASE_URL=postgresql://bugops:bugops@localhost:5432/bugops
SESSION_SECRET=replace-with-at-least-32-random-characters
APP_ORIGIN=http://localhost:4173
```

Run migrations and seed challenges:

```bash
npm run db:deploy
npm run db:seed
```

Start the app:

```bash
npm run dev
```

Open:

```text
http://localhost:4173
```

## OAuth

Login buttons appear only when credentials are configured:

```bash
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
```

Configure callback URLs:

- Google: `http://localhost:4173/auth/google/callback`
- GitHub: `http://localhost:4173/auth/github/callback`

Use the deployed origin instead of localhost in production.

## AI Gateway

Set AI provider credentials only on the server. Do not put API keys in `config.js` or browser storage.

```bash
AI_PROVIDER=gemini
GEMINI_API_KEY=
GEMINI_MODEL=gemini-1.5-flash-latest
AI_RATE_LIMIT_PER_MINUTE=8
AI_DAILY_QUOTA=60
AI_TIMEOUT_MS=6000
AI_MAX_RETRIES=1
```

The browser never receives or stores the key. `/api/ai/hint` validates the active signed-in game session, applies per-user rate limits and daily quotas, records hint usage for scoring penalties, calls the configured provider with timeout/retry limits, validates output, and falls back to curated hints from `levels.js` when AI fails.

The coach prompt is Socratic: it asks diagnostic questions, suggests evidence to inspect, gives progressive hints, avoids immediate answers, and treats submitted code/comments as untrusted data so prompt-injection instructions inside a challenge are ignored.

## Verification

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm audit --audit-level=moderate
```

## Project Docs

- `docs/CURRENT_ARCHITECTURE.md`
- `docs/IMPLEMENTATION_STATUS.md`
- `docs/SECURITY_AUDIT.md`
- `docs/ROADMAP.md`
- `docs/AI_SETUP.md`
- `docs/DEPLOYMENT.md`
- `docs/LEADERBOARD_INTEGRATION.md`
- `docs/TESTING_CHECKLIST.md`
- `docs/CHALLENGE_AUTHORING.md`
