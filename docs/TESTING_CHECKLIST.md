# Testing Checklist

Use this checklist before a demo or deployment.

## Gameplay

- Start a run from the Arena section.
- Submit a correct answer and confirm score/XP increases.
- Submit a wrong answer and confirm lives decrease.
- Use Hint and Explain Bug.
- Finish or fail a run and submit a leaderboard score.

## Persistence

- Refresh the page and confirm dashboard stats remain.
- Submit a score and confirm leaderboard entries remain.
- Reset progress and confirm dashboard clears.

## Responsive QA

- Desktop: 1440 x 900
- Tablet: 768 x 1024
- Mobile: 390 x 844

Confirm there is no horizontal overflow and that buttons remain readable.

## JavaScript Checks

```bash
node --check script.js
node --check levels.js
node --check config.js
```
