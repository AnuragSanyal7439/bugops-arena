# Deployment Guide

BugOps Arena now requires a Node runtime and PostgreSQL. It is no longer a static-only deployment.

## Required Environment Variables

```bash
NODE_ENV=production
PORT=4173
APP_ORIGIN=https://your-domain.example
DATABASE_URL=postgresql://...
SESSION_SECRET=at-least-32-random-characters
```

Optional:

```bash
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GEMINI_API_KEY=
GEMINI_MODEL=gemini-1.5-flash-latest
```

## Release Steps

```bash
npm ci
npm run build
npm run db:deploy
npm run db:seed
npm start
```

## OAuth Callback URLs

Configure provider callbacks with your production origin:

- `https://your-domain.example/auth/google/callback`
- `https://your-domain.example/auth/github/callback`

## Static Hosts

The old static-only Vercel/Netlify setup is no longer sufficient for authenticated persistence. Use a deployment target that supports:

- Long-running Node server or compatible serverless Express adapter
- PostgreSQL connectivity
- Secure environment variables
- HTTPS
