# Security Audit

Updated: 2026-06-18

## Summary

BugOps Arena now has a backend trust boundary for signed-in users: OAuth login, HTTP-only database-backed sessions, protected API routes, server-side validation, PostgreSQL persistence, and backend-only Gemini access.

The major static-MVP risks around browser API keys, localStorage-backed leaderboard storage, and client-controlled scoring have been addressed in code. Remaining risks are mostly production configuration and broader integration testing.

## Resolved Critical Findings

### Resolved: Gemini API Key Exposure

Status: Implemented

- Browser-visible Gemini key fields were removed from `config.js` and `config.example.js`.
- The AI Helper no longer stores API keys in localStorage.
- `/api/ai/hint` uses server-side `GEMINI_API_KEY`.
- The client falls back to curated hints if the user is not signed in or the backend AI key is unavailable.

### Resolved: localStorage Leaderboard Persistence

Status: Implemented

- Leaderboard reads now call `GET /api/leaderboard`.
- Leaderboard submission now calls protected `POST /api/leaderboard`.
- Server entries are derived from the user's stored `GameSession`, not arbitrary client leaderboard objects.

### Resolved: No Authentication Or Session Boundary

Status: Implemented

- Google OAuth is available when Google credentials are configured.
- GitHub OAuth is available when GitHub credentials are configured.
- Sessions use HTTP-only cookies and the PostgreSQL-backed `Session` model.

## Current High Findings

### High: Production Environment Must Be Correctly Provisioned

Risk:

- The secure architecture depends on production `DATABASE_URL`, `SESSION_SECRET`, OAuth callback URLs, and optional `GEMINI_API_KEY`.
- If these are missing, login and durable persistence will not work.

Required controls:

- Set a strong `SESSION_SECRET` in production.
- Use TLS and run with `NODE_ENV=production`.
- Configure provider callback URLs exactly for the deployed domain.
- Run `npm run db:deploy` and `npm run db:seed`.

### High: Integration Tests Need A Real Database

Risk:

- Unit tests cover core rules, but protected route behavior is not yet tested against PostgreSQL.

Recommended next step:

- Add testcontainers or a dedicated CI PostgreSQL service.
- Exercise auth stubs, progress migration, server-authoritative submissions, terminal session state, and leaderboard submission end to end.

## Current Medium Findings

### Medium: CSP Still Allows Inline Script

Risk:

- Helmet is configured, but `script-src` still allows `'unsafe-inline'` because `index.html` contains an inline initializer.

Recommended remediation:

- Move inline script into a static JS file or use nonce/hash-based CSP.

### Medium: Legacy React Scaffold Remains

Risk:

- `src/` is excluded from the TypeScript backend build and lint scope.
- It remains a confusing non-production artifact.

Recommended remediation:

- Remove/archive it or intentionally restore a real React build path.

### Medium: OAuth Tokens Are Hashed But Not Used

Risk:

- Provider tokens are not stored directly, only hashed.
- This is acceptable for identity linking, but no provider API calls can be made later without re-auth.

Recommended remediation:

- Keep the current model unless provider API access becomes necessary.

## Current Future Findings

- Add account delete/export controls before storing more personal data.
- Add admin audit logs before challenge editing exists.
- Add rate limiting at the reverse proxy or app layer for auth and AI endpoints.

## Ranking

Critical:

- None currently known in the implemented code path.

High:

- Production provisioning must be correct.
- Route/database integration tests are still missing.

Medium:

- CSP permits inline script.
- Legacy React scaffold remains.
- Provider token model intentionally supports identity only.

Future:

- Account data controls, admin audit logs, and rate limiting.
