# Leaderboard Integration Plan

The MVP leaderboard uses localStorage so the game works immediately without backend setup.

## Current Data Shape

```js
{
  username: "Player",
  score: 1200,
  xp: 420,
  accuracy: 86,
  timeTaken: 210,
  difficulty: "Hard",
  createdAt: "2026-06-11T00:00:00.000Z"
}
```

## Firebase/Supabase Upgrade

Replace the `leaderboardProvider` methods in `script.js`:

- `list()` should fetch the top scores ordered by score descending.
- `submit(entry)` should insert the result and return the updated leaderboard.

## Real-Time Behavior

The current app dispatches a local event after score submission. A backend version can replace that with:

- Firebase `onSnapshot`
- Supabase realtime channels
- WebSocket score broadcasts
