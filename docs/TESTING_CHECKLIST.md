# Testing Checklist

## Automated

Run before deployment:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm audit --audit-level=moderate
```

## Database

- Run `npm run db:deploy`.
- Run `npm run db:seed`.
- Confirm challenges exist in PostgreSQL.

## Auth

- Visit `/api/auth/providers` and confirm configured providers are enabled.
- Sign in with Google when configured.
- Sign in with GitHub when configured.
- Confirm `/api/auth/me` returns the signed-in user.
- Log out and confirm protected routes return 401.

## Gameplay

- Start a signed-in run.
- Submit a correct answer and confirm progress updates.
- Submit a wrong answer and confirm attempts/lives update.
- Finish or fail a run.
- Submit a leaderboard score.
- Refresh and confirm dashboard progress persists.
- Sign in from another browser profile/device and confirm progress loads.

## localStorage

- Confirm new app writes are limited to `bugopsArenaEditorDrafts` and `bugopsArenaUiPreferences`.
- With old `bugopsArenaProgress` present, sign in and confirm migration removes the legacy progress key.

## Responsive QA

- Desktop: 1440 x 900
- Tablet: 768 x 1024
- Mobile: 390 x 844

Confirm there is no horizontal overflow and buttons remain readable.
