const levels = [
  {
    title: "Level 1: Fix the console",
    buggyCode: "consol.log('Hello World')",
    correctCode: "console.log('Hello World')",
    hint: "Check the spelling of 'console'."
  },
  {
    title: "Level 2: Assignment Bug",
    buggyCode: "let x == 5;",
    correctCode: "let x = 5;",
    hint: "Remember: '=' is assignment, '==' is comparison."
  },
  {
    title: "Level 3: Missing Quote",
    buggyCode: "'Hello World;",
    correctCode: "\"Hello World\"",
    hint: "Check the quotes."
  }
];
