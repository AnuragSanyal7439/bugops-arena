# AI Setup

BugOps Arena works without an AI key. When no backend key is available, the game uses curated hints and explanations from `levels.js`.

## Production-Safe Gemini Setup

Set the key only in the server environment:

```bash
GEMINI_API_KEY=your_server_side_key
GEMINI_MODEL=gemini-1.5-flash-latest
```

The browser calls protected route `/api/ai/hint`. The key is never read from `config.js`, localStorage, or client JavaScript.

## Auth Requirement

Backend AI hints require a signed-in session. Anonymous players still receive curated fallback hints.

## Hint Behavior

- Before submit: hints stay partial and avoid revealing the exact corrected line.
- After submit: explanations can describe the corrected idea.
- If the backend or provider fails: fallback hints keep the game playable.
