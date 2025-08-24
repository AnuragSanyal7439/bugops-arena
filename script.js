let currentLevel = 0;
let xp = 0;
const maxXP = 100; // Goal to reach (you can adjust)

function updateXP() {
  const xpBar = document.getElementById("xp-bar");
  const percent = Math.min((xp / maxXP) * 100, 100);
  xpBar.style.width = percent + "%";
  xpBar.innerText = `${xp} XP`;

  // Trigger level-up at milestones
  if ([25, 50, 75, 100].includes(xp)) {
    showLevelUp();
  }
}

// Rank system based on XP
const ranks = [
  { xp: 0, title: "👶 Newbie Coder" },
  { xp: 20, title: "🛠️ Bug Fixer" },
  { xp: 50, title: "⚡ Debugging Pro" },
  { xp: 100, title: "🔥 Code Master" },
  { xp: 200, title: "🏆 Legendary Hacker" }
];

function updateRank() {
  let currentRank = ranks[0].title;
  for (let i = 0; i < ranks.length; i++) {
    if (xp >= ranks[i].xp) {
      currentRank = ranks[i].title;
    }
  }
  document.getElementById("player-title").innerText = currentRank;
}



function loadLevel() {
  const level = levels[currentLevel];
  document.getElementById("level-title").innerText = level.title;
  document.getElementById("code-box").value = level.buggyCode;
  document.getElementById("feedback").innerText = "";
  updateXP();
}

function updateProgress() {
  const progress = (xp % 100); // XP resets after each level
  document.getElementById("progress-bar").style.width = progress + "%";

  if (progress === 0 && xp > 0) {
    currentLevel++;
    if (currentLevel < levels.length) {
      document.getElementById("feedback").innerText = "🎉 Level Up!";
      loadLevel();
    } else {
      document.getElementById("feedback").innerText = "🏆 All levels completed!";
    }
  }
}

function checkFix() {
  const userCode = document.getElementById("code-box").value.trim();
  const correctCode = levels[currentLevel].correctCode.trim();

  if (userCode === correctCode) {
    document.getElementById("feedback").innerText = "✅ Bug Fixed!";
    xp += 10;
    document.getElementById("xp").innerText = `XP: ${xp}`;
    updateProgress();
  } else {
    document.getElementById("feedback").innerText = "❌ Still Buggy.";
  }
}


  if (userCode === correctCode) {
    document.getElementById("feedback").innerText = "✅ Bug Fixed!";
    xp += 10;
    updateXP();
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
    updateXP();
    const hint = levels[currentLevel].hint;
    document.getElementById("feedback").innerText = "💡 Hint: " + hint;
  } else {
    document.getElementById("feedback").innerText = "❌ Not enough XP for a hint!";
  }
  xp -= 5;
document.getElementById("xp").innerText = `XP: ${xp}`;
updateRank(); // ⬅️ NEW LINE

}

function showLevelUp() {
  const popup = document.getElementById("level-up-popup");
  popup.style.display = "block";

  // Animate with fade-out after 2s
  setTimeout(() => {
    popup.style.display = "none";
  }, 2000);

  // 🎉 Extra flair: emoji rain
  for (let i = 0; i < 20; i++) {
    let emoji = document.createElement("div");
    emoji.innerText = "✨";
    emoji.style.position = "fixed";
    emoji.style.left = Math.random() * window.innerWidth + "px";
    emoji.style.top = "-50px";
    emoji.style.fontSize = "2rem";
    emoji.style.animation = "fall 2s linear forwards";
    document.body.appendChild(emoji);
    setTimeout(() => emoji.remove(), 2000);
  }
}

function updateTitle() {
  let title = "👶 Newbie Coder";

  if (xp >= 25 && xp < 50) {
    title = "🐞 Bug Slayer";
  } else if (xp >= 50 && xp < 75) {
    title = "⚡ Debugging Ninja";
  } else if (xp >= 75 && xp < 100) {
    title = "🔥 Code Wizard";
  } else if (xp >= 100) {
    title = "👑 Legendary Hacker";
  }

  document.getElementById("player-title").innerText = title;
}


window.onload = () => {
  loadLevel();
  updateRank();
};
