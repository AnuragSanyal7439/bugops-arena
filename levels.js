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
  },
  {
    id: 16,
    title: "Map Without Return",
    language: "JavaScript",
    difficulty: "Easy",
    topic: "Arrays",
    buggyCode: `const prices = [10, 20, 30];
const discounted = prices.map(price => {
  price * 0.9;
});`,
    correctFix: "return price * 0.9;",
    hint: "A block-bodied arrow function needs an explicit return.",
    explanation: "The map callback uses braces, so JavaScript does not automatically return the expression."
  },
  {
    id: 17,
    title: "Python Name Case Crash",
    language: "Python",
    difficulty: "Easy",
    topic: "Variables",
    buggyCode: `user_name = "Ada"
print(User_Name)`,
    correctFix: "print(user_name)",
    hint: "Python variable names are case-sensitive.",
    explanation: "user_name and User_Name are different identifiers, so the print statement references a missing variable."
  },
  {
    id: 18,
    title: "Printf Placeholder Mismatch",
    language: "C",
    difficulty: "Easy",
    topic: "Output",
    buggyCode: `int age = 21;
printf("Age: %s", age);`,
    correctFix: `printf("Age: %d", age);`,
    hint: "The format specifier should match an integer.",
    explanation: "%s expects a string pointer, but age is an integer. %d is the correct placeholder."
  },
  {
    id: 19,
    title: "Java Missing New Keyword",
    language: "Java",
    difficulty: "Easy",
    topic: "Objects",
    buggyCode: `ArrayList<String> tasks = ArrayList<String>();
tasks.add("debug");`,
    correctFix: `ArrayList<String> tasks = new ArrayList<String>();`,
    hint: "Object construction in Java needs one keyword before the class name.",
    explanation: "The new keyword creates the ArrayList instance before methods can be called on it."
  },
  {
    id: 20,
    title: "Strict Equality Save",
    language: "JavaScript",
    difficulty: "Easy",
    topic: "Operators",
    buggyCode: `function isZero(value) {
  return value = 0;
}`,
    correctFix: "return value === 0;",
    hint: "The return statement should compare, not assign.",
    explanation: "A single equals sign assigns zero. Strict equality checks whether value is zero."
  },
  {
    id: 21,
    title: "Range Stops Too Soon",
    language: "Python",
    difficulty: "Medium",
    topic: "Loops",
    buggyCode: `def count_to_five():
    numbers = []
    for value in range(1, 5):
        numbers.append(value)
    return numbers`,
    correctFix: "for value in range(1, 6):",
    hint: "The second range value is excluded.",
    explanation: "range(1, 5) stops before 5. Using 6 includes values from 1 through 5."
  },
  {
    id: 22,
    title: "Malloc Size Slip",
    language: "C",
    difficulty: "Medium",
    topic: "Memory",
    buggyCode: `int *scores = malloc(5);
scores[0] = 100;`,
    correctFix: "int *scores = malloc(5 * sizeof(int));",
    hint: "malloc expects bytes, not number of elements.",
    explanation: "Allocating only 5 bytes may be too small for 5 integers. Multiplying by sizeof(int) reserves enough memory."
  },
  {
    id: 23,
    title: "Java Integer Division",
    language: "Java",
    difficulty: "Medium",
    topic: "Types",
    buggyCode: `int wins = 7;
int games = 10;
double rate = wins / games;`,
    correctFix: "double rate = (double) wins / games;",
    hint: "Cast before dividing so the result keeps decimals.",
    explanation: "wins / games uses integer division first. Casting wins to double makes the calculation floating-point."
  },
  {
    id: 24,
    title: "Promise Chain Leak",
    language: "JavaScript",
    difficulty: "Medium",
    topic: "Async",
    buggyCode: `function loadScore() {
  fetch("/score")
    .then(response => response.json())
    .then(data => data.score);
}`,
    correctFix: "return fetch(\"/score\")",
    hint: "The outer function should return the Promise chain.",
    explanation: "Without returning fetch, callers cannot await or chain the async score result."
  },
  {
    id: 25,
    title: "List Alias Surprise",
    language: "Python",
    difficulty: "Medium",
    topic: "Lists",
    buggyCode: `original = [1, 2, 3]
copy = original
copy.append(4)
print(original)`,
    correctFix: "copy = original.copy()",
    hint: "Both names currently point to the same list.",
    explanation: "Assigning a list does not clone it. copy() creates a separate list before mutation."
  },
  {
    id: 26,
    title: "Char Buffer Too Small",
    language: "C",
    difficulty: "Hard",
    topic: "Strings",
    buggyCode: `char label[5] = "debug";
printf("%s", label);`,
    correctFix: `char label[6] = "debug";`,
    hint: "C strings need space for the null terminator.",
    explanation: "The word debug has 5 characters, and C also stores a trailing null byte, so the buffer needs 6 slots."
  },
  {
    id: 27,
    title: "Java Null Check Order",
    language: "Java",
    difficulty: "Hard",
    topic: "Conditionals",
    buggyCode: `String name = null;

if (name.equals("admin") && name != null) {
  System.out.println("Access granted");
}`,
    correctFix: `if (name != null && name.equals("admin")) {`,
    hint: "Check for null before calling a method on the value.",
    explanation: "Calling equals on null throws NullPointerException. The null check must happen first."
  },
  {
    id: 28,
    title: "Closure Counter Trap",
    language: "JavaScript",
    difficulty: "Hard",
    topic: "Closures",
    buggyCode: `const handlers = [];

for (var i = 0; i < 3; i++) {
  handlers.push(() => i);
}`,
    correctFix: "for (let i = 0; i < 3; i++) {",
    hint: "Use a loop variable with block scope.",
    explanation: "var is function-scoped, so every handler sees the final i value. let creates a fresh binding per iteration."
  },
  {
    id: 29,
    title: "Python Recursive Exit",
    language: "Python",
    difficulty: "Hard",
    topic: "Recursion",
    buggyCode: `def countdown(n):
    print(n)
    countdown(n - 1)`,
    correctFix: `if n <= 0:
        return`,
    hint: "The recursive function needs a base case.",
    explanation: "Without a stopping condition, countdown keeps calling itself until recursion fails."
  },
  {
    id: 30,
    title: "C Pointer Address Mixup",
    language: "C",
    difficulty: "Hard",
    topic: "Pointers",
    buggyCode: `int score = 10;
int *scorePtr = score;
printf("%d", *scorePtr);`,
    correctFix: "int *scorePtr = &score;",
    hint: "A pointer should store an address.",
    explanation: "scorePtr needs the address of score. The ampersand operator produces that address."
  },
  {
    id: 31,
    title: "JavaScript Sort String Trap",
    language: "JavaScript",
    difficulty: "Medium",
    topic: "Arrays",
    buggyCode: `const scores = [1, 30, 4, 21];
scores.sort();
console.log(scores);`,
    correctFix: "scores.sort((a, b) => a - b);",
    hint: "The default sort compares values as strings.",
    explanation: "JavaScript sort converts values to strings by default. A numeric comparator sorts the numbers correctly."
  },
  {
    id: 32,
    title: "Python Dictionary Key Miss",
    language: "Python",
    difficulty: "Easy",
    topic: "Dictionaries",
    buggyCode: `profile = {"name": "Ada"}
print(profile["role"])`,
    correctFix: `print(profile.get("role", "guest"))`,
    hint: "Use a safe lookup when the key might not exist.",
    explanation: "Accessing a missing dictionary key raises KeyError. get can provide a fallback value."
  },
  {
    id: 33,
    title: "C Header Missing",
    language: "C",
    difficulty: "Easy",
    topic: "Syntax",
    buggyCode: `int main() {
  printf("BugOps");
  return 0;
}`,
    correctFix: "#include <stdio.h>",
    hint: "The compiler needs the standard I/O declaration.",
    explanation: "printf is declared in stdio.h, so the file should include that header."
  },
  {
    id: 34,
    title: "Java List Import Gap",
    language: "Java",
    difficulty: "Easy",
    topic: "Imports",
    buggyCode: `List<String> bugs = new ArrayList<>();
bugs.add("timer");`,
    correctFix: "import java.util.*;",
    hint: "List and ArrayList live in the same standard utility package.",
    explanation: "Java needs imports for collection types unless their fully qualified names are used."
  },
  {
    id: 35,
    title: "Event Listener Fires Early",
    language: "JavaScript",
    difficulty: "Medium",
    topic: "Events",
    buggyCode: `button.addEventListener("click", saveScore());`,
    correctFix: `button.addEventListener("click", saveScore);`,
    hint: "Pass the function reference instead of calling it immediately.",
    explanation: "saveScore() runs during setup. Passing saveScore lets the browser call it when the click happens."
  },
  {
    id: 36,
    title: "Python File Handle Leak",
    language: "Python",
    difficulty: "Medium",
    topic: "Files",
    buggyCode: `file = open("scores.txt")
data = file.read()
print(data)`,
    correctFix: `with open("scores.txt") as file:`,
    hint: "Use the context-manager pattern for files.",
    explanation: "with open closes the file automatically after the block, even if reading fails."
  },
  {
    id: 37,
    title: "C scanf Address Bug",
    language: "C",
    difficulty: "Medium",
    topic: "Input",
    buggyCode: `int score;
scanf("%d", score);`,
    correctFix: `scanf("%d", &score);`,
    hint: "scanf needs the address where it should store the value.",
    explanation: "The ampersand passes the address of score so scanf can write into that variable."
  },
  {
    id: 38,
    title: "Java Constructor Return Type",
    language: "Java",
    difficulty: "Hard",
    topic: "Classes",
    buggyCode: `class Player {
  void Player(String name) {
    System.out.println(name);
  }
}`,
    correctFix: "Player(String name) {",
    hint: "Constructors do not declare a return type.",
    explanation: "Adding void turns the constructor into a normal method. A constructor uses only the class name."
  },
  {
    id: 39,
    title: "JavaScript Lost This",
    language: "JavaScript",
    difficulty: "Hard",
    topic: "Objects",
    buggyCode: `const player = {
  score: 10,
  show: () => this.score
};`,
    correctFix: "show() { return this.score; }",
    hint: "Arrow functions do not bind their own this.",
    explanation: "Object methods that need this should use method syntax or a regular function."
  },
  {
    id: 40,
    title: "Python Except Too Broad",
    language: "Python",
    difficulty: "Hard",
    topic: "Errors",
    buggyCode: `try:
    total = int(value)
except:
    total = 0`,
    correctFix: "except ValueError:",
    hint: "Catch the specific error caused by invalid integer parsing.",
    explanation: "A bare except hides unrelated failures. ValueError targets the expected conversion problem."
  },
  {
    id: 41,
    title: "JavaScript Reduce Seed",
    language: "JavaScript",
    difficulty: "Easy",
    topic: "Arrays",
    buggyCode: `const total = [].reduce((sum, value) => sum + value);
console.log(total);`,
    correctFix: "const total = [].reduce((sum, value) => sum + value, 0);",
    hint: "An empty array needs an initial value for reduce.",
    explanation: "reduce has no first value to use when the array is empty. Passing 0 gives it a safe starting point."
  },
  {
    id: 42,
    title: "Python Indentation Drift",
    language: "Python",
    difficulty: "Easy",
    topic: "Syntax",
    buggyCode: `def greet(name):
print("Hello", name)`,
    correctFix: `    print("Hello", name)`,
    hint: "The statement inside the function needs indentation.",
    explanation: "Python uses indentation to define blocks. The print line must be indented inside greet."
  },
  {
    id: 43,
    title: "C Missing Return Value",
    language: "C",
    difficulty: "Easy",
    topic: "Functions",
    buggyCode: `int doubleScore(int score) {
  score * 2;
}`,
    correctFix: "return score * 2;",
    hint: "The function calculates a value but never sends it back.",
    explanation: "A non-void C function should return the calculated result."
  },
  {
    id: 44,
    title: "Java Boolean Assignment",
    language: "Java",
    difficulty: "Easy",
    topic: "Conditionals",
    buggyCode: `boolean ready = false;

if (ready = true) {
  System.out.println("Launch");
}`,
    correctFix: "if (ready == true) {",
    hint: "The condition should compare the boolean value.",
    explanation: "Using = assigns true to ready. The condition needs comparison, or simply if (ready)."
  },
  {
    id: 45,
    title: "JavaScript DOM Null Guard",
    language: "JavaScript",
    difficulty: "Medium",
    topic: "DOM",
    buggyCode: `const panel = document.querySelector(".score-panel");
panel.textContent = "Ready";`,
    correctFix: `if (panel) panel.textContent = "Ready";`,
    hint: "The selector might not find an element.",
    explanation: "querySelector returns null when no element matches. Guarding avoids reading textContent on null."
  },
  {
    id: 46,
    title: "Python Set Method Mixup",
    language: "Python",
    difficulty: "Medium",
    topic: "Sets",
    buggyCode: `tags = {"bug", "fix"}
tags.append("arena")`,
    correctFix: `tags.add("arena")`,
    hint: "Sets do not use the list method for adding one item.",
    explanation: "append is for lists. Sets use add to insert a single value."
  },
  {
    id: 47,
    title: "C Free Wrong Pointer",
    language: "C",
    difficulty: "Medium",
    topic: "Memory",
    buggyCode: `int *scores = malloc(3 * sizeof(int));
scores++;
free(scores);`,
    correctFix: "free(scoresStart);",
    hint: "free should receive the original pointer returned by malloc.",
    explanation: "After incrementing scores, it no longer points to the allocation start. Store the original pointer before moving it."
  },
  {
    id: 48,
    title: "Java Generic Type Mismatch",
    language: "Java",
    difficulty: "Medium",
    topic: "Generics",
    buggyCode: `List<Integer> scores = new ArrayList<>();
scores.add("100");`,
    correctFix: "scores.add(100);",
    hint: "The list expects integers, not strings.",
    explanation: "List<Integer> only accepts Integer values. Removing the quotes makes 100 an integer literal."
  },
  {
    id: 49,
    title: "JavaScript Await Outside Async",
    language: "JavaScript",
    difficulty: "Hard",
    topic: "Async",
    buggyCode: `function getProfile() {
  const response = await fetch("/profile");
  return response.json();
}`,
    correctFix: "async function getProfile() {",
    hint: "A function must opt into await.",
    explanation: "await can be used inside async functions. Marking getProfile async makes the code valid."
  },
  {
    id: 50,
    title: "Python Shallow Copy Nest",
    language: "Python",
    difficulty: "Hard",
    topic: "Lists",
    buggyCode: `board = [[0], [1]]
clone = board.copy()
clone[0].append(9)
print(board)`,
    correctFix: "clone = [row.copy() for row in board]",
    hint: "The outer list is copied, but the nested lists are still shared.",
    explanation: "A shallow copy keeps references to nested lists. Copying each row prevents nested mutation leaks."
  }
];

window.challenges = challenges;
