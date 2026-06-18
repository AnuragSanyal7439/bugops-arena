# Current Architecture

Updated: 2026-06-18

## Overview

BugOps Arena is now a same-origin static frontend plus Express API backend.

The frontend remains the existing browser game in `index.html`, `style.css`, `levels.js`, and `script.js`. The backend in `server/` adds authentication, secure sessions, PostgreSQL persistence, protected API routes, server-side validation, and a server-side Gemini proxy.

## Tech Stack

- Frontend: HTML, CSS, vanilla JavaScript
- Backend: Node.js 20, Express, TypeScript
- Auth: Passport with Google OAuth 2.0 and GitHub OAuth where credentials are configured
- Sessions: `express-session` using HTTP-only cookies and a Prisma-backed `Session` table
- Database: PostgreSQL
- ORM/migrations: Prisma
- Validation: Zod
- Security headers: Helmet
- Tests: Vitest
- Static assets: served by Express from the repository root

## Runtime Flow

1. Express starts from `server/index.ts`.
2. `server/app.ts` applies Helmet, JSON limits, same-origin mutation checks, session middleware, Passport, API routers, and static file serving.
3. Browser loads the existing static app.
4. `script.js` calls `/api/auth/me` and `/api/auth/providers`.
5. Signed-in users load progress from `/api/progress`.
6. Legacy local progress is migrated once through `/api/progress/migrate`.
7. Game sessions, server-authoritative submissions, and leaderboard submission use protected API routes.
8. Leaderboard reads come from PostgreSQL.
9. AI hints call `/api/ai/hint`, which uses server-side `GEMINI_API_KEY` when configured.

## Data Model

Required models are implemented in `prisma/schema.prisma`:

- `User`
- `Profile`
- `Challenge`
- `ChallengeVersion`
- `GameSession`
- `Submission`
- `Achievement`
- `Leaderboard`

Additional support models:

- `Account` for OAuth provider identities
- `Session` for database-backed HTTP-only sessions

## Authentication

Google and GitHub login routes exist at:

- `/auth/google`
- `/auth/google/callback`
- `/auth/github`
- `/auth/github/callback`

Provider buttons are shown only when credentials are configured in the backend environment.

Session cookies:

- Name: `bugops.sid`
- HTTP-only: yes
- SameSite: `lax`
- Secure: enabled in production
- Store: PostgreSQL through Prisma

## localStorage Usage

Current new localStorage writes are limited to:

- `bugopsArenaEditorDrafts`
- `bugopsArenaUiPreferences`

Legacy keys are read/removed only for migration or cleanup:

- `bugopsArenaProgress`
- `bugopsArenaLeaderboard`
- `bugopsArenaGeminiKey`
- `bugopsArenaGeminiModel`

Progress, XP, streaks, achievements, submissions, sessions, and leaderboard entries are persisted in PostgreSQL for signed-in users.

## API Routes

Public:

- `GET /api/health`
- `GET /api/auth/providers`
- `GET /api/auth/me`
- `GET /api/leaderboard`

Protected:

- `POST /api/auth/logout`
- `GET /api/progress`
- `POST /api/progress/migrate`
- `DELETE /api/progress`
- `POST /api/game-sessions`
- `PATCH /api/game-sessions/:id/finish` rejects active sessions and only reports already-terminal runs
- `POST /api/submissions`
- `POST /api/leaderboard`
- `POST /api/ai/hint`

## Deployment Notes

The app is no longer static-only. Production needs a Node runtime, PostgreSQL, Prisma migrations, seed data, and environment variables.

Minimum production setup:

```bash
npm ci
npm run build
npm run db:deploy
npm run db:seed
npm start
```

## Current Limitations

High:

- Production OAuth credentials and database provisioning are environment responsibilities.
- Scored gameplay requires a signed-in server session; unauthenticated users cannot start scored runs.

Medium:

- Integration tests do not yet run against a real PostgreSQL instance.
- The legacy React `src/` scaffold is still excluded from the backend build and remains non-production.

Future:

- Add admin challenge management and challenge version publishing workflows.
