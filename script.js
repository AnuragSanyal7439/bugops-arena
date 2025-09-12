let currentLevel = 0;
let xp = 0;
const maxXP = 100; // XP needed for full bar

// Rank system
const ranks = [
  { xp: 0, title: "👶 Newbie Coder" },
  { xp: 20, title: "🛠️ Bug Fixer" },
  { xp: 50, title: "⚡ Debugging Pro" },
  { xp: 100, title: "🔥 Code Master" },
  { xp: 200, title: "🏆 Legendary Hacker" }
];

// Update XP bar
function updateXP() {
  const xpBar = document.getElementById("xp-bar");
  const percent = Math.min((xp / maxXP) * 100, 100);
  xpBar.style.width = percent + "%";
  xpBar.innerText = `${xp} XP`;

  if (percent >= 100) {
    xpBar.classList.add("full");  // add glow class
  } else {
    xpBar.classList.remove("full"); // remove glow when not full
  }

  // Trigger level-up milestones
  if ([25, 50, 75, 100].includes(xp)) {
    showLevelUp();
  }



  updateRank(); // keep rank updated
}

// Update rank (title)
function updateRank() {
  let currentRank = ranks[0].title;
  for (let i = 0; i < ranks.length; i++) {
    if (xp >= ranks[i].xp) {
      currentRank = ranks[i].title;
    }
  }
  document.getElementById("player-title").innerText = currentRank;
}

// Load current level
function loadLevel() {
  const level = levels[currentLevel];
  document.getElementById("level-title").innerText = level.title;
  document.getElementById("task").innerText = level.task || "Fix the bug!";
  document.getElementById("code-box").value = level.buggyCode;
  document.getElementById("feedback").innerText = "";
  updateXP();
}

// Check user’s fix
function checkFix() {
  const userCode = document.getElementById("code-box").value.trim();
  const correctCode = levels[currentLevel].correctCode.trim();

  if (userCode === correctCode) {
    document.getElementById("feedback").innerText = "✅ Bug Fixed!";
    xp += 10;
    document.getElementById("xp").innerText = `XP: ${xp}`;
    updateXP();
  } else {
    document.getElementById("feedback").innerText = "❌ Still Buggy.";
  }
}

// Next level
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

// Get hint
function getHint() {
  if (xp >= 5) {
    xp -= 5;
    updateXP();
    const hint = levels[currentLevel].hint;
    document.getElementById("feedback").innerText = "💡 Hint: " + hint;
  } else {
    document.getElementById("feedback").innerText = "❌ Not enough XP for a hint!";
  }
}

// Show level-up popup
function showLevelUp(newRank) {
  const popup = document.getElementById("level-up-popup");

  // Random emojis for extra hype
  const emojis = ["🚀", "⚡", "🔥", "✨", "👑", "🎉", "💻", "🏆", "🦾"];
  const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];

  // Dynamic message
  popup.innerHTML = `${randomEmoji} LEVEL UP! ${randomEmoji}<br>🎯 New Rank: <b>${newRank}</b>`;

  popup.style.display = "block";

  // Hide after 3s
  setTimeout(() => {
    popup.style.display = "none";
  }, 3000);

  // 🎉 Emoji Rain
  for (let i = 0; i < 20; i++) {
    let emoji = document.createElement("div");
    emoji.innerText = emojis[Math.floor(Math.random() * emojis.length)];
    emoji.style.position = "fixed";
    emoji.style.left = Math.random() * window.innerWidth + "px";
    emoji.style.top = "-50px";
    emoji.style.fontSize = "2rem";
    emoji.style.animation = "fall 2s linear forwards";
    document.body.appendChild(emoji);
    setTimeout(() => emoji.remove(), 2000);
  }
}


// On page load
window.onload = () => {
  loadLevel();
  updateRank();
};
