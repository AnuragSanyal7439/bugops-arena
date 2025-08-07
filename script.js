let currentLevel = 0;
let xp = 0;

function loadLevel() {
  const level = levels[currentLevel];
  document.getElementById("level-title").innerText = level.title;
  document.getElementById("code-box").value = level.buggyCode;
  document.getElementById("feedback").innerText = "";
}

function checkFix() {
  const userCode = document.getElementById("code-box").value.trim();
  const correctCode = levels[currentLevel].correctCode.trim();

  if (userCode === correctCode) {
    document.getElementById("feedback").innerText = "✅ Bug Fixed!";
    xp += 10;
    document.getElementById("xp").innerText = `XP: ${xp}`;
  } else {
    document.getElementById("feedback").innerText = "❌ Still Buggy.";
  }
}

function nextLevel() {
  if (currentLevel < levels.length - 1) {
    currentLevel++;
    loadLevel();
  } else {
    document.getElementById("feedback").innerText = "🎉 All levels completed!";
    document.getElementById("code-box").value = "";
    document.getElementById("level-title").innerText = "All Done!";
  }
}

function getHint() {
  if (xp >= 5) {
    xp -= 5;
    document.getElementById("xp").innerText = xp;
    const hint = levels[currentLevel].hint;
    document.getElementById("feedback").innerText = "💡 Hint: " + hint;
  } else {
    document.getElementById("feedback").innerText = "❌ Not enough XP for a hint!";
  }
}



window.onload = loadLevel;
