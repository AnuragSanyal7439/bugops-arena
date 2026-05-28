const STORAGE_KEYS = {
  progress: "bugopsArenaProgress",
  leaderboard: "bugopsArenaLeaderboard",
  apiKey: "bugopsArenaGeminiKey",
  model: "bugopsArenaGeminiModel"
};

const INITIAL_PROGRESS = {
  totalAttempts: 0,
  totalCorrect: 0,
  bugsFixed: 0,
  totalXP: 0,
  timeSpentSeconds: 0,
  currentStreak: 0,
  bestStreak: 0,
  sessionsPlayed: 0,
  badges: [],
  topicStats: {},
  difficultyStats: {},
  languageStats: {}
};

const DIFFICULTY_POINTS = {
  Easy: { seconds: 60, xp: 40, score: 100 },
  Medium: { seconds: 75, xp: 70, score: 160 },
  Hard: { seconds: 90, xp: 110, score: 240 }
};

const BADGES = [
  { id: "first-fix", label: "First Fix", test: (progress) => progress.bugsFixed >= 1 },
  { id: "streak-3", label: "Hot Streak", test: (progress) => progress.bestStreak >= 3 },
  { id: "xp-250", label: "XP Surge", test: (progress) => progress.totalXP >= 250 },
  {
    id: "polyglot",
    label: "Polyglot",
    test: (progress) => Object.keys(progress.languageStats || {}).filter((key) => progress.languageStats[key].correct > 0).length >= 4
  },
  {
    id: "hard-mode",
    label: "Hard Mode",
    test: (progress) => (progress.difficultyStats?.Hard?.correct || 0) >= 2
  }
];

const leaderboardProvider = {
  async list() {
    return readJson(STORAGE_KEYS.leaderboard, []).sort((a, b) => b.score - a.score).slice(0, 12);
  },
  async submit(entry) {
    const entries = readJson(STORAGE_KEYS.leaderboard, []);
    const nextEntries = [entry, ...entries].sort((a, b) => b.score - a.score).slice(0, 25);
    localStorage.setItem(STORAGE_KEYS.leaderboard, JSON.stringify(nextEntries));
    window.dispatchEvent(new CustomEvent("bugops:leaderboard-update"));
    return nextEntries;
  }
};

const sampleLeaders = [
  { username: "NullNinja", score: 1840, xp: 620, accuracy: 92, timeTaken: 412, difficulty: "Hard" },
  { username: "PatchPilot", score: 1510, xp: 480, accuracy: 88, timeTaken: 365, difficulty: "Medium" },
  { username: "StackSmith", score: 1260, xp: 390, accuracy: 82, timeTaken: 337, difficulty: "All" }
];

const state = {
  challenges: window.challenges || [],
  progress: { ...INITIAL_PROGRESS },
  game: createEmptyGame(),
  timerId: null,
  miniStreamId: null,
  particlesStarted: false
};

function createEmptyGame() {
  return {
    active: false,
    selectedDifficulty: "All",
    sessionChallenges: [],
    challengeIndex: 0,
    currentChallenge: null,
    score: 0,
    xp: 0,
    lives: 3,
    correct: 0,
    attempts: 0,
    streak: 0,
    hintsUsed: 0,
    timeLeft: 0,
    elapsedSeconds: 0,
    startedAt: 0,
    answeredCurrent: false,
    submittedCurrent: false
  };
}

const dom = {};

document.addEventListener("DOMContentLoaded", () => {
  cacheDom();
  state.progress = normalizeProgress(readJson(STORAGE_KEYS.progress, INITIAL_PROGRESS));
  bindEvents();
  setupParticles();
  renderMiniCodeStream();
  renderLeaderboard();
  renderDashboard();
  renderBadgeRack();
  updateApiStatus();
  setArenaIdle();
});

function cacheDom() {
  const ids = [
    "site-nav",
    "difficulty-select",
    "start-game",
    "timer",
    "score",
    "session-xp",
    "lives",
    "challenge-count",
    "challenge-progress",
    "badge-rack",
    "challenge-language",
    "challenge-difficulty",
    "challenge-topic",
    "challenge-title",
    "buggy-code-display",
    "answer-input",
    "hint-button",
    "submit-answer",
    "explain-button",
    "next-challenge",
    "feedback",
    "ai-output",
    "correct-count",
    "session-accuracy",
    "session-streak",
    "result-panel",
    "result-title",
    "result-copy",
    "result-stats",
    "score-form",
    "player-name",
    "restart-game",
    "dashboard-stats",
    "topic-bars",
    "recommendation-panel",
    "reset-progress",
    "leaderboard-body",
    "leaderboard-preview-list",
    "api-key-form",
    "api-key",
    "clear-api-key",
    "api-status",
    "test-ai-hint",
    "mini-code-stream",
    "toast-zone"
  ];

  ids.forEach((id) => {
    dom[toCamel(id)] = document.getElementById(id);
  });
  dom.navToggle = document.querySelector(".nav-toggle");
}

function bindEvents() {
  dom.navToggle.addEventListener("click", () => {
    const isOpen = dom.siteNav.classList.toggle("is-open");
    dom.navToggle.setAttribute("aria-expanded", String(isOpen));
  });

  document.querySelectorAll(".nav-links a, .hero-actions a").forEach((link) => {
    link.addEventListener("click", () => {
      dom.siteNav.classList.remove("is-open");
      dom.navToggle.setAttribute("aria-expanded", "false");
    });
  });

  dom.startGame.addEventListener("click", startGame);
  dom.submitAnswer.addEventListener("click", submitAnswer);
  dom.hintButton.addEventListener("click", requestHint);
  dom.explainButton.addEventListener("click", explainBug);
  dom.nextChallenge.addEventListener("click", moveToNextChallenge);
  dom.restartGame.addEventListener("click", startGame);
  dom.scoreForm.addEventListener("submit", submitScore);
  dom.resetProgress.addEventListener("click", resetProgress);
  dom.apiKeyForm.addEventListener("submit", saveApiKey);
  dom.clearApiKey.addEventListener("click", clearApiKey);
  dom.testAiHint.addEventListener("click", testAiHint);

  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEYS.leaderboard) {
      renderLeaderboard();
    }
    if (event.key === STORAGE_KEYS.progress) {
      state.progress = normalizeProgress(readJson(STORAGE_KEYS.progress, INITIAL_PROGRESS));
      renderDashboard();
      renderBadgeRack();
    }
  });

  window.addEventListener("bugops:leaderboard-update", renderLeaderboard);
}

function startGame() {
  clearInterval(state.timerId);
  const selectedDifficulty = dom.difficultySelect.value;
  const sessionChallenges = getSessionChallenges(selectedDifficulty);

  state.game = {
    ...createEmptyGame(),
    active: true,
    selectedDifficulty,
    sessionChallenges,
    startedAt: Date.now()
  };

  dom.resultPanel.hidden = true;
  dom.feedback.className = "feedback";
  dom.aiOutput.textContent = "Arena online. Hints will stay partial until you submit.";
  loadChallenge(0);
  updateHud();
  scrollIntoView("#play");
}

function getSessionChallenges(difficulty) {
  const filtered = difficulty === "All"
    ? state.challenges
    : state.challenges.filter((challenge) => challenge.difficulty === difficulty);
  return [...filtered].sort((a, b) => a.id - b.id);
}

function loadChallenge(index) {
  const challenge = state.game.sessionChallenges[index];

  if (!challenge) {
    finishGame("Arena Cleared");
    return;
  }

  state.game.challengeIndex = index;
  state.game.currentChallenge = challenge;
  state.game.answeredCurrent = false;
  state.game.submittedCurrent = false;
  state.game.timeLeft = DIFFICULTY_POINTS[challenge.difficulty].seconds;

  dom.challengeLanguage.textContent = challenge.language;
  dom.challengeDifficulty.textContent = challenge.difficulty;
  dom.challengeTopic.textContent = challenge.topic;
  dom.challengeTitle.textContent = challenge.title;
  dom.buggyCodeDisplay.textContent = challenge.buggyCode;
  dom.answerInput.value = challenge.buggyCode;
  dom.answerInput.disabled = false;
  dom.feedback.textContent = "";
  dom.feedback.className = "feedback";
  dom.nextChallenge.disabled = true;
  dom.submitAnswer.disabled = false;
  dom.hintButton.disabled = false;
  dom.explainButton.disabled = false;
  dom.aiOutput.textContent = "Challenge loaded. Request a hint for a small nudge.";

  updateHud();
  startTimer();
}

function startTimer() {
  clearInterval(state.timerId);
  renderTimer();
  state.timerId = setInterval(() => {
    if (!state.game.active || state.game.answeredCurrent) {
      return;
    }

    state.game.timeLeft -= 1;
    state.game.elapsedSeconds = Math.floor((Date.now() - state.game.startedAt) / 1000);
    renderTimer();

    if (state.game.timeLeft <= 0) {
      handleTimeout();
    }
  }, 1000);
}

function submitAnswer() {
  const game = state.game;
  const challenge = game.currentChallenge;

  if (!game.active || !challenge || game.answeredCurrent) {
    return;
  }

  const isCorrect = isAnswerCorrect(dom.answerInput.value, challenge);
  game.attempts += 1;
  game.submittedCurrent = true;

  if (isCorrect) {
    const points = DIFFICULTY_POINTS[challenge.difficulty];
    const timeBonus = Math.max(0, game.timeLeft * 2);
    const earnedScore = points.score + timeBonus - game.hintsUsed * 5;
    const earnedXp = points.xp;

    game.score += Math.max(points.score, earnedScore);
    game.xp += earnedXp;
    game.correct += 1;
    game.streak += 1;
    game.answeredCurrent = true;

    recordProgressAttempt(challenge, true, earnedXp);
    updateFeedback("success", `Correct. ${challenge.explanation}`);
    dom.aiOutput.textContent = challenge.explanation;
    dom.nextChallenge.disabled = false;
    dom.submitAnswer.disabled = true;
    dom.answerInput.disabled = true;
    triggerConfetti();
  } else {
    game.lives -= 1;
    game.streak = 0;
    recordProgressAttempt(challenge, false, 0);
    updateFeedback("error", `Still buggy. ${challenge.explanation}`);
    dom.aiOutput.textContent = challenge.explanation;
    pulseElement(dom.answerInput);

    if (game.lives <= 0) {
      game.answeredCurrent = true;
      finishGame("System Lockout");
    }
  }

  persistProgress();
  updateHud();
  renderDashboard();
  renderBadgeRack();
}

function handleTimeout() {
  const challenge = state.game.currentChallenge;
  clearInterval(state.timerId);

  state.game.attempts += 1;
  state.game.lives -= 1;
  state.game.streak = 0;
  state.game.answeredCurrent = true;
  state.game.submittedCurrent = true;
  recordProgressAttempt(challenge, false, 0);
  persistProgress();

  updateFeedback("error", `Time expired. ${challenge.explanation}`);
  dom.aiOutput.textContent = challenge.explanation;
  dom.nextChallenge.disabled = state.game.lives <= 0;
  dom.submitAnswer.disabled = true;
  dom.answerInput.disabled = true;

  updateHud();
  renderDashboard();
  renderBadgeRack();

  if (state.game.lives <= 0) {
    finishGame("System Lockout");
  }
}

function moveToNextChallenge() {
  if (!state.game.active) {
    return;
  }

  if (state.game.challengeIndex >= state.game.sessionChallenges.length - 1) {
    finishGame("Arena Cleared");
    return;
  }

  loadChallenge(state.game.challengeIndex + 1);
}

function finishGame(title) {
  clearInterval(state.timerId);
  const game = state.game;

  if (!game.startedAt) {
    return;
  }

  game.active = false;
  game.elapsedSeconds = Math.max(1, Math.floor((Date.now() - game.startedAt) / 1000));
  state.progress.sessionsPlayed += 1;
  state.progress.timeSpentSeconds += game.elapsedSeconds;
  persistProgress();

  const accuracy = getSessionAccuracy();
  dom.resultPanel.hidden = false;
  dom.resultTitle.textContent = title;
  dom.resultCopy.textContent = `${game.correct} bugs fixed with ${accuracy}% accuracy in ${formatTime(game.elapsedSeconds)}.`;
  dom.resultStats.innerHTML = [
    statPill("Score", game.score),
    statPill("XP", game.xp),
    statPill("Lives", Math.max(0, game.lives)),
    statPill("Difficulty", game.selectedDifficulty)
  ].join("");
  dom.nextChallenge.disabled = true;
  dom.submitAnswer.disabled = true;
  dom.hintButton.disabled = true;
  renderDashboard();
  renderBadgeRack();
  triggerConfetti();
}

async function requestHint() {
  const challenge = state.game.currentChallenge || state.challenges[0];
  if (!challenge) {
    return;
  }

  state.game.hintsUsed += state.game.active ? 1 : 0;
  updateHud();
  dom.aiOutput.textContent = "Generating hint...";

  const prompt = [
    "You are the BugOps Arena hint coach.",
    "Give one short debugging hint.",
    "Do not reveal the exact corrected line or full answer.",
    `Language: ${challenge.language}`,
    `Topic: ${challenge.topic}`,
    `Buggy code:\n${challenge.buggyCode}`
  ].join("\n");

  const hint = await getAiText(prompt, challenge.hint, challenge, false);
  dom.aiOutput.textContent = hint;
  updateFeedback("info", `Hint: ${hint}`);
}

async function explainBug() {
  const challenge = state.game.currentChallenge || state.challenges[0];
  if (!challenge) {
    return;
  }

  dom.aiOutput.textContent = "Preparing explanation...";
  const canRevealMore = state.game.submittedCurrent || !state.game.active;
  const prompt = [
    "You are the BugOps Arena debugging coach.",
    canRevealMore
      ? "Explain the bug clearly in beginner-friendly language. You may describe the corrected idea."
      : "Explain the bug conceptually without revealing the full corrected answer.",
    `Language: ${challenge.language}`,
    `Topic: ${challenge.topic}`,
    `Buggy code:\n${challenge.buggyCode}`
  ].join("\n");

  const explanation = await getAiText(prompt, challenge.explanation, challenge, canRevealMore);
  dom.aiOutput.textContent = explanation;
  updateFeedback("info", explanation);
}

async function getAiText(prompt, fallback, challenge, revealAnswer) {
  const apiKey = getConfiguredApiKey();

  if (!apiKey) {
    return fallback;
  }

  try {
    const model = getConfiguredModel();
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.35,
            maxOutputTokens: 140
          }
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini request failed: ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text).join(" ").trim();
    return cleanAiResponse(text || fallback, challenge, revealAnswer);
  } catch (error) {
    console.warn(error);
    updateApiStatus("AI request failed. Fallback hints are active.");
    return fallback;
  }
}

function cleanAiResponse(text, challenge, revealAnswer) {
  let cleaned = text.replace(/\s+/g, " ").trim();

  if (!revealAnswer && challenge.correctFix) {
    const exactFix = challenge.correctFix.replace(/\s+/g, " ").trim();
    cleaned = cleaned.replaceAll(exactFix, "[answer hidden]");
    cleaned = cleaned.replace(/```[\s\S]*?```/g, "[code hidden]");
  }

  return cleaned.length > 360 ? `${cleaned.slice(0, 357)}...` : cleaned;
}

function saveApiKey(event) {
  event.preventDefault();
  const key = dom.apiKey.value.trim();

  if (!key) {
    updateApiStatus("Paste a key before saving.");
    return;
  }

  localStorage.setItem(STORAGE_KEYS.apiKey, key);
  dom.apiKey.value = "";
  updateApiStatus("Gemini key saved. AI hints enabled.");
}

function clearApiKey() {
  localStorage.removeItem(STORAGE_KEYS.apiKey);
  updateApiStatus("Gemini key cleared. Fallback hints active.");
}

async function testAiHint() {
  const challenge = state.challenges[0];
  dom.aiOutput.textContent = "Testing AI hint path...";
  const prompt = [
    "Give one short debugging hint. Do not reveal the answer.",
    `Buggy code:\n${challenge.buggyCode}`
  ].join("\n");
  const hint = await getAiText(prompt, challenge.hint, challenge, false);
  dom.aiOutput.textContent = hint;
  updateFeedback("info", `AI Helper: ${hint}`);
}

function submitScore(event) {
  event.preventDefault();
  const name = dom.playerName.value.trim();

  if (!name) {
    return;
  }

  const entry = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    username: name,
    score: state.game.score,
    xp: state.game.xp,
    accuracy: getSessionAccuracy(),
    timeTaken: state.game.elapsedSeconds,
    difficulty: state.game.selectedDifficulty,
    createdAt: new Date().toISOString()
  };

  leaderboardProvider.submit(entry).then(() => {
    dom.playerName.value = "";
    showToast("Score submitted to leaderboard.", "success");
    scrollIntoView("#leaderboard");
  });
}

async function renderLeaderboard() {
  const entries = await leaderboardProvider.list();
  const rows = entries.length ? entries : sampleLeaders;

  dom.leaderboardBody.innerHTML = rows
    .map((entry, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(entry.username)}</td>
        <td>${entry.score}</td>
        <td>${entry.xp}</td>
        <td>${entry.accuracy}%</td>
        <td>${formatTime(entry.timeTaken)}</td>
        <td>${entry.difficulty}</td>
      </tr>
    `)
    .join("");

  dom.leaderboardPreviewList.innerHTML = rows
    .slice(0, 4)
    .map((entry) => `<li><span>${escapeHtml(entry.username)}</span><strong>${entry.score}</strong></li>`)
    .join("");
}

function renderDashboard() {
  const progress = state.progress;
  const accuracy = getAccuracy(progress.totalCorrect, progress.totalAttempts);
  const weakTopic = getWeakTopic();
  const bestDifficulty = getBestDifficulty();
  const recommendedTopic = weakTopic === "No weak topic yet" ? getUnplayedTopic() : weakTopic;

  const stats = [
    ["Total Bugs Fixed", progress.bugsFixed],
    ["Accuracy", `${accuracy}%`],
    ["Current Streak", progress.currentStreak],
    ["Total XP", progress.totalXP],
    ["Time Spent", formatTime(progress.timeSpentSeconds)],
    ["Weak Topics", weakTopic],
    ["Best Difficulty", bestDifficulty],
    ["Recommended Next", recommendedTopic]
  ];

  dom.dashboardStats.innerHTML = stats
    .map(([label, value]) => `
      <article class="stat-card">
        <span>${label}</span>
        <strong>${value}</strong>
      </article>
    `)
    .join("");

  renderTopicBars();
  renderRecommendations(accuracy, weakTopic, recommendedTopic, bestDifficulty);
}

function renderTopicBars() {
  const topics = Array.from(new Set(state.challenges.map((challenge) => challenge.topic)));

  dom.topicBars.innerHTML = topics
    .map((topic) => {
      const stats = state.progress.topicStats[topic] || { attempts: 0, correct: 0 };
      const accuracy = getAccuracy(stats.correct, stats.attempts);
      return `
        <div class="metric-row">
          <div>
            <strong>${topic}</strong>
            <span>${stats.correct}/${stats.attempts} fixed</span>
          </div>
          <div class="progress-bar">
            <span style="width: ${accuracy}%"></span>
          </div>
          <em>${accuracy}%</em>
        </div>
      `;
    })
    .join("");
}

function renderRecommendations(accuracy, weakTopic, recommendedTopic, bestDifficulty) {
  const xpPercent = Math.min(100, Math.round((state.progress.totalXP % 500) / 5));
  dom.recommendationPanel.innerHTML = `
    <div class="recommendation-card">
      <span>Next focus</span>
      <strong>${recommendedTopic}</strong>
      <p>Accuracy ${accuracy}%. Best difficulty so far: ${bestDifficulty}.</p>
    </div>
    <div class="metric-row compact">
      <div>
        <strong>XP to next badge</strong>
        <span>${state.progress.totalXP % 500}/500</span>
      </div>
      <div class="progress-bar">
        <span style="width: ${xpPercent}%"></span>
      </div>
    </div>
    <div class="recommendation-card">
      <span>Weak topic</span>
      <strong>${weakTopic}</strong>
      <p>Play a targeted run to raise your weakest accuracy band.</p>
    </div>
  `;
}

function renderBadgeRack() {
  const badges = state.progress.badges || [];
  dom.badgeRack.innerHTML = badges.length
    ? badges.map((id) => `<span class="badge-chip">${BADGES.find((badge) => badge.id === id)?.label || id}</span>`).join("")
    : `<span class="badge-empty">No badges yet</span>`;
}

function recordProgressAttempt(challenge, isCorrect, earnedXp) {
  const progress = state.progress;
  progress.totalAttempts += 1;
  progress.totalXP += earnedXp;

  if (isCorrect) {
    progress.totalCorrect += 1;
    progress.bugsFixed += 1;
    progress.currentStreak += 1;
    progress.bestStreak = Math.max(progress.bestStreak, progress.currentStreak);
  } else {
    progress.currentStreak = 0;
  }

  bumpStats(progress.topicStats, challenge.topic, isCorrect);
  bumpStats(progress.difficultyStats, challenge.difficulty, isCorrect);
  bumpStats(progress.languageStats, challenge.language, isCorrect);
  unlockBadges();
}

function bumpStats(bucket, key, isCorrect) {
  if (!bucket[key]) {
    bucket[key] = { attempts: 0, correct: 0 };
  }

  bucket[key].attempts += 1;
  bucket[key].correct += isCorrect ? 1 : 0;
}

function unlockBadges() {
  const earned = new Set(state.progress.badges || []);

  BADGES.forEach((badge) => {
    if (!earned.has(badge.id) && badge.test(state.progress)) {
      earned.add(badge.id);
      showToast(`Badge unlocked: ${badge.label}`, "success");
    }
  });

  state.progress.badges = [...earned];
}

function persistProgress() {
  localStorage.setItem(STORAGE_KEYS.progress, JSON.stringify(state.progress));
}

function resetProgress() {
  const confirmed = window.confirm("Reset dashboard progress and badges?");
  if (!confirmed) {
    return;
  }

  state.progress = normalizeProgress(INITIAL_PROGRESS);
  persistProgress();
  renderDashboard();
  renderBadgeRack();
  showToast("Progress reset.", "info");
}

function updateHud() {
  const game = state.game;
  const total = game.sessionChallenges.length || state.challenges.length;
  const current = game.active || game.currentChallenge ? game.challengeIndex + 1 : 0;
  const progressPercent = total ? Math.round((current / total) * 100) : 0;

  dom.score.textContent = game.score;
  dom.sessionXp.textContent = game.xp;
  dom.lives.textContent = Math.max(0, game.lives);
  dom.correctCount.textContent = game.correct;
  dom.sessionAccuracy.textContent = `${getSessionAccuracy()}%`;
  dom.sessionStreak.textContent = game.streak;
  dom.challengeCount.textContent = `${current} / ${total}`;
  dom.challengeProgress.style.width = `${progressPercent}%`;
  renderTimer();
}

function renderTimer() {
  dom.timer.textContent = formatClock(Math.max(0, state.game.timeLeft));
  dom.timer.classList.toggle("is-low", state.game.timeLeft <= 10 && state.game.active);
}

function setArenaIdle() {
  dom.challengeLanguage.textContent = "JavaScript";
  dom.challengeDifficulty.textContent = "Easy";
  dom.challengeTopic.textContent = "Functions";
  dom.challengeTitle.textContent = "Press Start Run";
  dom.buggyCodeDisplay.textContent = "Choose a difficulty and enter the arena.";
  dom.answerInput.value = "";
  dom.answerInput.disabled = true;
  dom.hintButton.disabled = true;
  dom.submitAnswer.disabled = true;
  dom.explainButton.disabled = false;
  dom.nextChallenge.disabled = true;
  updateHud();
}

function updateFeedback(type, message) {
  dom.feedback.className = `feedback is-${type}`;
  dom.feedback.textContent = message;
}

function isAnswerCorrect(answer, challenge) {
  const submitted = normalizeCode(answer);
  const correct = normalizeCode(challenge.correctFix);
  const original = normalizeCode(challenge.buggyCode);
  return submitted === correct || (submitted.includes(correct) && submitted !== original);
}

function normalizeCode(value) {
  return String(value)
    .replace(/\r/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function getSessionAccuracy() {
  return getAccuracy(state.game.correct, state.game.attempts);
}

function getAccuracy(correct, attempts) {
  if (!attempts) {
    return 0;
  }
  return Math.round((correct / attempts) * 100);
}

function getWeakTopic() {
  const stats = Object.entries(state.progress.topicStats || {}).filter(([, value]) => value.attempts > 0);

  if (!stats.length) {
    return "No weak topic yet";
  }

  return stats
    .sort(([, a], [, b]) => getAccuracy(a.correct, a.attempts) - getAccuracy(b.correct, b.attempts))[0][0];
}

function getBestDifficulty() {
  const stats = Object.entries(state.progress.difficultyStats || {}).filter(([, value]) => value.attempts > 0);

  if (!stats.length) {
    return "Not played yet";
  }

  return stats
    .sort(([, a], [, b]) => getAccuracy(b.correct, b.attempts) - getAccuracy(a.correct, a.attempts))[0][0];
}

function getUnplayedTopic() {
  const topics = Array.from(new Set(state.challenges.map((challenge) => challenge.topic)));
  return topics.find((topic) => !state.progress.topicStats[topic]?.attempts) || topics[0] || "Functions";
}

function renderMiniCodeStream() {
  const snippets = state.challenges.slice(0, 5);
  let cursor = 0;

  const draw = () => {
    const visible = snippets.slice(cursor, cursor + 3);
    const wrapped = visible.length === 3 ? visible : [...visible, ...snippets.slice(0, 3 - visible.length)];
    dom.miniCodeStream.innerHTML = wrapped
      .map((challenge) => `
        <div class="stream-line">
          <span>${challenge.language}</span>
          <code>${escapeHtml(challenge.correctFix)}</code>
        </div>
      `)
      .join("");
    cursor = (cursor + 1) % snippets.length;
  };

  draw();
  clearInterval(state.miniStreamId);
  state.miniStreamId = setInterval(draw, 2600);
}

function setupParticles() {
  const canvas = document.getElementById("arena-particles");
  if (!canvas || state.particlesStarted) {
    return;
  }

  const context = canvas.getContext("2d");
  const particles = [];
  const colors = ["#22d3ee", "#a3e635", "#f97316", "#e879f9", "#facc15"];

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    particles.length = 0;

    const count = Math.min(90, Math.floor(window.innerWidth / 18));
    for (let index = 0; index < count; index += 1) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2 + 0.5,
        speed: Math.random() * 0.35 + 0.12,
        color: colors[Math.floor(Math.random() * colors.length)],
        drift: Math.random() * 0.6 - 0.3
      });
    }
  }

  function animate() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach((particle) => {
      particle.y += particle.speed;
      particle.x += particle.drift;

      if (particle.y > canvas.height) {
        particle.y = -4;
        particle.x = Math.random() * canvas.width;
      }

      context.beginPath();
      context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      context.fillStyle = particle.color;
      context.globalAlpha = 0.58;
      context.fill();
    });
    context.globalAlpha = 1;
    requestAnimationFrame(animate);
  }

  window.addEventListener("resize", resize);
  resize();
  animate();
  state.particlesStarted = true;
}

function triggerConfetti() {
  const colors = ["#22d3ee", "#a3e635", "#f97316", "#e879f9", "#facc15"];

  for (let index = 0; index < 34; index += 1) {
    const piece = document.createElement("span");
    piece.className = "confetti-piece";
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = colors[index % colors.length];
    piece.style.animationDelay = `${Math.random() * 0.3}s`;
    piece.style.transform = `rotate(${Math.random() * 180}deg)`;
    document.body.appendChild(piece);
    setTimeout(() => piece.remove(), 1500);
  }
}

function pulseElement(element) {
  element.classList.remove("shake");
  window.requestAnimationFrame(() => {
    element.classList.add("shake");
  });
}

function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  dom.toastZone.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}

function updateApiStatus(message) {
  if (message) {
    dom.apiStatus.textContent = message;
    return;
  }

  const hasKey = Boolean(getConfiguredApiKey());
  dom.apiStatus.textContent = hasKey
    ? "Gemini key detected. AI hints enabled."
    : "No key detected. Curated fallback hints enabled.";
}

function getConfiguredApiKey() {
  const env = window.BUGOPS_ENV || {};
  return (
    env.NEXT_PUBLIC_GEMINI_API_KEY ||
    env.VITE_GEMINI_API_KEY ||
    env.GEMINI_API_KEY ||
    localStorage.getItem(STORAGE_KEYS.apiKey) ||
    ""
  );
}

function getConfiguredModel() {
  const env = window.BUGOPS_ENV || {};
  return env.GEMINI_MODEL || localStorage.getItem(STORAGE_KEYS.model) || "gemini-1.5-flash-latest";
}

function readJson(key, fallback) {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : cloneValue(fallback);
  } catch (error) {
    console.warn(error);
    return cloneValue(fallback);
  }
}

function normalizeProgress(progress) {
  return {
    ...cloneValue(INITIAL_PROGRESS),
    ...cloneValue(progress || {}),
    badges: [...(progress?.badges || [])],
    topicStats: { ...(progress?.topicStats || {}) },
    difficultyStats: { ...(progress?.difficultyStats || {}) },
    languageStats: { ...(progress?.languageStats || {}) }
  };
}

function cloneValue(value) {
  return JSON.parse(JSON.stringify(value));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatClock(seconds) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const secs = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${secs}`;
}

function formatTime(seconds) {
  if (!seconds) {
    return "0s";
  }

  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return minutes ? `${minutes}m ${secs}s` : `${secs}s`;
}

function statPill(label, value) {
  return `<span><strong>${value}</strong>${label}</span>`;
}

function scrollIntoView(selector) {
  document.querySelector(selector)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function toCamel(id) {
  return id.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}
