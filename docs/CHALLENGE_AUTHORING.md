# Challenge Authoring Guide

Challenges live in `levels.js` as plain JavaScript objects.

## Required Shape

```js
{
  id: 51,
  title: "Short Bug Title",
  language: "JavaScript",
  difficulty: "Easy",
  topic: "Arrays",
  buggyCode: "const value = ...",
  correctFix: "the key line or corrected snippet",
  hint: "A small nudge that does not reveal everything.",
  explanation: "A clear beginner-friendly explanation."
}
```

## Good Challenge Rules

- Keep the bug focused on one concept.
- Keep the fix short enough for typed answers.
- Avoid trick questions.
- Make hints useful without giving away the answer immediately.
- Use the explanation to teach the underlying debugging idea.

## Difficulty Guide

- Easy: syntax, operators, missing imports, simple conditions
- Medium: arrays, loops, async, memory, type behavior
- Hard: closures, recursion, pointers, nested data, lifecycle mistakes
