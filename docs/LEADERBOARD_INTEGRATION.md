# Leaderboard Integration

The leaderboard is now backed by PostgreSQL instead of localStorage.

## Current Flow

1. Signed-in user starts a run through `POST /api/game-sessions`.
2. Submissions are recorded through `POST /api/submissions`.
3. The run is finalized by the submission transaction when lives reach zero or the final challenge is cleared.
4. The score is submitted through protected `POST /api/leaderboard`.
5. Public rankings are read through `GET /api/leaderboard`.

## Data Shape

`Leaderboard` entries are derived from stored `GameSession` records:

```ts
{
  username: string;
  score: number;
  xp: number;
  accuracy: number;
  timeTaken: number;
  difficulty: string;
  createdAt: Date;
}
```

## Integrity Notes

- The client no longer submits arbitrary score objects.
- The server calculates leaderboard values from the stored session.
- Challenge progression, timing, scoring, XP, lives, streaks, and completion are server-authoritative.
