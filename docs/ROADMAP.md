# Roadmap

Updated: 2026-06-18

## Completed In This Backend Upgrade

- Added Express + TypeScript backend.
- Added PostgreSQL with Prisma.
- Added migrations and challenge seed data.
- Added Google/GitHub OAuth where configured.
- Added HTTP-only database-backed sessions.
- Added protected API routes.
- Added persistent Profile, GameSession, Submission, Achievement, and Leaderboard storage.
- Added server-side Gemini proxy.
- Added fully server-authoritative scoring, timing, lives, streaks, achievements, and leaderboard calculations.
- Restricted new localStorage writes to editor drafts and UI preferences.
- Added one-time legacy progress migration.
- Added validation, error handling, linting, type checking, tests, build, and npm audit.

## Critical

No known Critical implementation task remains in the current code path.

## High

### 1. Add Database-Backed Integration Tests

Next work:

- Run tests against PostgreSQL in CI.
- Cover migration, progress sync, submissions, session finish, leaderboard submit, and auth-required errors.

### 2. Production Deployment Hardening

Next work:

- Add CI.
- Run `npm audit --audit-level=moderate` in CI.
- Run Prisma migration deploy in release flow.
- Add OAuth callback validation checklist.
- Add rate limiting for auth, submission, leaderboard, and AI routes.

## Medium

### 4. Remove Inline Script For Stronger CSP

Next work:

- Move the inline `window.BUGOPS_ENV` fallback out of `index.html`.
- Remove `'unsafe-inline'` from `script-src`.

### 5. Resolve The Legacy React Scaffold

Next work:

- Remove/archive `src/`, or intentionally migrate the app to React with a real package/build path.

### 6. Add Browser E2E Tests

Next work:

- Use Playwright against the Express app.
- Test signed-in sync with a mocked auth session or test-only auth strategy.

## Future

- Account settings, data export, and account deletion.
- Admin challenge authoring and challenge version publishing.
- Daily challenges and challenge packs.
- Multiplayer rooms using the existing server-authoritative session model.

## Highest-Priority Implementation Task

Add database-backed integration tests for the authoritative scoring APIs.

Reason:

- API keys, localStorage leaderboard persistence, and client-controlled scoring are now addressed.
- The next trust gap is proving transaction behavior against a real PostgreSQL database in CI.
- This protects leaderboard integrity from regressions without redesigning the existing UI.
