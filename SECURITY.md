# Security

## API Keys

BugOps Arena can run with a Gemini key for local demos, but private API keys should not be committed to the repository.

For production:

- Store AI keys in server-side environment variables.
- Call Gemini through a serverless function or backend route.
- Rate-limit hint requests if public traffic is expected.

## Reporting Issues

If you find a security issue in this project, open a private report or contact the repository owner directly.
