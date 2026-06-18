# Security

## API Keys

Do not commit Gemini or OAuth secrets.

Gemini keys must be stored only in the backend environment as `GEMINI_API_KEY`. The browser app does not read API keys from `config.js` or localStorage.

## Sessions

BugOps Arena uses HTTP-only session cookies backed by PostgreSQL. In production:

- Set `NODE_ENV=production`.
- Use HTTPS.
- Set a strong `SESSION_SECRET`.
- Configure OAuth callback URLs exactly for the deployed origin.

## Database

Run Prisma migrations before serving production traffic:

```bash
npm run db:deploy
npm run db:seed
```

## Reporting Issues

If you find a security issue in this project, open a private report or contact the repository owner directly.
