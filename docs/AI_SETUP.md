# AI Setup

BugOps Arena works without an AI key. When no key is available, the game uses curated hints and explanations from `levels.js`.

## Gemini Option

For local demos, open `config.js` and add:

```js
window.BUGOPS_ENV = {
  VITE_GEMINI_API_KEY: "your_key_here",
  GEMINI_MODEL: "gemini-1.5-flash-latest"
};
```

You can also paste a key into the in-app AI Helper panel. That stores the key in browser localStorage for local testing.

## Production Note

Do not expose private keys in a public frontend. For production, move the Gemini request into a serverless function and call that function from the browser.

## Hint Behavior

- Before submit: hints stay partial and avoid revealing the full fix.
- After submit: explanations become clearer and can describe the corrected idea.
- If the API request fails: fallback hints keep the game playable.
