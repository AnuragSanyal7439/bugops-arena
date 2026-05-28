const challenges = [
  {
    id: 1,
    title: "Addition Operator Drift",
    language: "JavaScript",
    difficulty: "Easy",
    topic: "Functions",
    buggyCode: `function add(a, b) {
  return a - b;
}`,
    correctFix: "return a + b;",
    hint: "Check the operator used in the return statement.",
    explanation: "The function should add two values, but it was subtracting them."
  },
  {
    id: 2,
    title: "Loop Syntax Break",
    language: "Python",
    difficulty: "Easy",
    topic: "Loops",
    buggyCode: `def total(numbers):
    result = 0
    for number in numbers
        result += number
    return result`,
    correctFix: "for number in numbers:",
    hint: "Python loop headers need one small punctuation mark at the end.",
    explanation: "The for loop is missing a colon, so Python cannot start the indented loop block."
  },
  {
    id: 3,
    title: "Assignment In The Gate",
    language: "JavaScript",
    difficulty: "Easy",
    topic: "Conditionals",
    buggyCode: `function canDeploy(isAdmin) {
  if (isAdmin = true) {
    return "deploy";
  }
  return "blocked";
}`,
    correctFix: "if (isAdmin === true) {",
    hint: "The condition is changing the value instead of comparing it.",
    explanation: "A single equals sign assigns true to isAdmin. Strict comparison checks the value without overwriting it."
  },
  {
    id: 4,
    title: "Missing Semicolon Signal",
    language: "C",
    difficulty: "Easy",
    topic: "Syntax",
    buggyCode: `#include <stdio.h>

int main() {
  int total = 42
  printf("%d", total);
  return 0;
}`,
    correctFix: "int total = 42;",
    hint: "Look at the line where the integer is declared.",
    explanation: "C statements must end with a semicolon. The declaration for total is missing one."
  },
  {
    id: 5,
    title: "String Identity Trap",
    language: "Java",
    difficulty: "Easy",
    topic: "Strings",
    buggyCode: `String role = "admin";

if (role == "admin") {
  System.out.println("Access granted");
}`,
    correctFix: `if (role.equals("admin")) {`,
    hint: "Java strings should be compared by value, not by reference.",
    explanation: "The == operator compares object references. equals compares the characters inside the strings."
  },
  {
    id: 6,
    title: "Last Item Off By One",
    language: "JavaScript",
    difficulty: "Medium",
    topic: "Arrays",
    buggyCode: `function getLast(items) {
  return items[items.length];
}`,
    correctFix: "return items[items.length - 1];",
    hint: "Array indexes start at zero, so the final index is one less than the length.",
    explanation: "items.length points just after the last element. The last valid index is items.length - 1."
  },
  {
    id: 7,
    title: "Boolean Return Glitch",
    language: "Python",
    difficulty: "Medium",
    topic: "Operators",
    buggyCode: `def is_even(number):
    return number % 2 = 0`,
    correctFix: "return number % 2 == 0",
    hint: "The expression should compare the remainder with zero.",
    explanation: "Assignment is not valid inside this return expression. The function needs equality comparison."
  },
  {
    id: 8,
    title: "Boundary Breach",
    language: "C",
    difficulty: "Medium",
    topic: "Loops",
    buggyCode: `int scores[3] = {7, 8, 9};
int total = 0;

for (int i = 0; i <= 3; i++) {
  total += scores[i];
}`,
    correctFix: "for (int i = 0; i < 3; i++) {",
    hint: "The loop should stop before it reaches the array length.",
    explanation: "Using <= 3 reads scores[3], which is outside the array. The final valid index is 2."
  },
  {
    id: 9,
    title: "Java Array Overrun",
    language: "Java",
    difficulty: "Medium",
    topic: "Arrays",
    buggyCode: `int[] scores = {10, 20, 30};
int total = 0;

for (int i = 0; i <= scores.length; i++) {
  total += scores[i];
}`,
    correctFix: "for (int i = 0; i < scores.length; i++) {",
    hint: "The loop should not include the length as an index.",
    explanation: "Java arrays are zero-indexed. scores.length is outside the array, so the loop must use <."
  },
  {
    id: 10,
    title: "Async JSON Race",
    language: "JavaScript",
    difficulty: "Medium",
    topic: "Async",
    buggyCode: `async function loadUser() {
  const response = await fetch("/api/user");
  const data = response.json();
  return data.name;
}`,
    correctFix: "const data = await response.json();",
    hint: "response.json() returns a Promise.",
    explanation: "The JSON body must be awaited before reading data.name."
  },
  {
    id: 11,
    title: "Append Returns Nothing",
    language: "Python",
    difficulty: "Medium",
    topic: "Lists",
    buggyCode: `tasks = ["build", "test"]
tasks = tasks.append("deploy")
print(tasks)`,
    correctFix: `tasks.append("deploy")`,
    hint: "append changes the list in place.",
    explanation: "list.append returns None, so assigning its result replaces the list with None."
  },
  {
    id: 12,
    title: "Integer Average Collapse",
    language: "C",
    difficulty: "Hard",
    topic: "Types",
    buggyCode: `int total = 7;
int count = 2;
float average = total / count;`,
    correctFix: "float average = (float) total / count;",
    hint: "Force floating-point division before the division happens.",
    explanation: "Both operands are integers, so C performs integer division first. Casting total makes the result precise."
  },
  {
    id: 13,
    title: "Static Entry Missing",
    language: "Java",
    difficulty: "Hard",
    topic: "Methods",
    buggyCode: `public class Main {
  public void main(String[] args) {
    System.out.println("BugOps");
  }
}`,
    correctFix: "public static void main(String[] args) {",
    hint: "The JVM expects the entry method to belong to the class itself.",
    explanation: "The Java entry point must be public static void main so it can run without an instance."
  },
  {
    id: 14,
    title: "Mutable Default Echo",
    language: "Python",
    difficulty: "Hard",
    topic: "Functions",
    buggyCode: `def add_tag(tag, tags=[]):
    tags.append(tag)
    return tags`,
    correctFix: `def add_tag(tag, tags=None):
    if tags is None:
        tags = []
    tags.append(tag)
    return tags`,
    hint: "Default list values are shared between function calls.",
    explanation: "A list default is created once, so later calls reuse the same list. None creates a fresh list per call."
  },
  {
    id: 15,
    title: "C String Compare Mirage",
    language: "C",
    difficulty: "Hard",
    topic: "Strings",
    buggyCode: `#include <stdio.h>
#include <string.h>

char name[] = "admin";

if (name == "admin") {
  printf("Access granted");
}`,
    correctFix: `if (strcmp(name, "admin") == 0) {`,
    hint: "C strings need a library function for content comparison.",
    explanation: "The == operator compares addresses for strings in C. strcmp returns 0 when the text matches."
  }
];

window.challenges = challenges;
