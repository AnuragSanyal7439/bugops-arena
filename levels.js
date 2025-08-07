const levels = [
  {
    title: "Level 1 – Missing Semicolon",
    buggyCode: "let x = 5\nconsole.log(x)",
    correctCode: "let x = 5;\nconsole.log(x);",
    hint: "Check for missing semicolons at the end of each line."
  },
  {
    title: "Level 2 – Typo in Function Keyword",
    buggyCode: "functon greet() {\n  console.log('Hello')\n}",
    correctCode: "function greet() {\n  console.log('Hello');\n}",
    hint: "There's a typo in the keyword used to declare the function."
  },
  {
    title: "Level 3 – Missing Bracket",
    buggyCode: "if (true)\n  console.log('Buggy')",
    correctCode: "if (true) {\n  console.log('Buggy');\n}",
    hint: "Conditional blocks should use curly braces `{}`."
  }
];
