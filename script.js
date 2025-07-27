let currentLevel = level1;
let xp = 100;

window.onload = () => {
  document.getElementById("task").innerText = currentLevel.description;
  document.getElementById("codeEditor").value = currentLevel.buggyCSS;
};

function submitCode() {
  const userCode = document.getElementById("codeEditor").value.trim();
  if (userCode === currentLevel.expectedCSS.trim()) {
    document.getElementById("result").innerText = "✅ Bug Fixed!";
  } else {
    document.getElementById("result").innerText = "❌ Still buggy. Try again.";
    xp -= 10;
  }
  updateXP();
}

function getHint() {
  document.getElementById("result").innerText = "💡 Hint: " + currentLevel.hint;
  xp -= 5;
  updateXP();
}

function updateXP() {
  document.getElementById("xp").innerText = `XP: ${xp}`;
}
