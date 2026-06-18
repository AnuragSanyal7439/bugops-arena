const STORAGE_KEYS = {
  legacyProgress: "bugopsArenaProgress",
  legacyLeaderboard: "bugopsArenaLeaderboard",
  legacyApiKey: "bugopsArenaGeminiKey",
  legacyModel: "bugopsArenaGeminiModel",
  editorDrafts: "bugopsArenaEditorDrafts",
  uiPreferences: "bugopsArenaUiPreferences"
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
    const response = await apiRequest("/api/leaderboard");
    return response.entries || [];
  },
  async submit(entry) {
    const response = await apiRequest("/api/leaderboard", {
      method: "POST",
      body: entry
    });
    window.dispatchEvent(new CustomEvent("bugops:leaderboard-update"));
    return response.entry;
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
  auth: {
    authenticated: false,
    user: null,
    providers: { google: false, github: false }
  },
  serverSessionId: null,
  finishSyncPromise: null,
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

document.addEventListener("DOMContentLoaded", async () => {
  cacheDom();
  state.progress = normalizeProgress(INITIAL_PROGRESS);
  bindEvents();
  loadUiPreferences();
  setupParticles();
  renderMiniCodeStream();
  await bootstrapRemoteState();
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
    "toast-zone",
    "auth-panel",
    "auth-status",
    "login-google",
    "login-github",
    "logout-button"
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
  dom.logoutButton.addEventListener("click", logout);
  dom.answerInput.addEventListener("input", saveCurrentDraft);
  dom.difficultySelect.addEventListener("change", saveUiPreferences);
  document.addEventListener("keydown", handleGlobalShortcuts);

  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEYS.editorDrafts && state.game.currentChallenge) {
      restoreCurrentDraft();
    }
  });

  window.addEventListener("bugops:leaderboard-update", renderLeaderboard);
}

async function bootstrapRemoteState() {
  removeLegacySecrets();

  try {
    const providers = await apiRequest("/api/auth/providers");
    state.auth.providers = providers || state.auth.providers;

    const session = await apiRequest("/api/auth/me");
    state.auth.authenticated = Boolean(session?.authenticated);
    state.auth.user = session?.user || null;
    renderAuthState();

    if (state.auth.authenticated) {
      await migrateLegacyProgress();
      await loadProgress();
    }
  } catch (error) {
    console.warn(error);
    renderAuthState();
    showToast("Server sync is unavailable. This run will stay on this device.", "info");
  }
}

async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    method: options.method || "GET",
    credentials: "same-origin",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = payload?.error?.message || `Request failed with ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.code = payload?.error?.code;
    throw error;
  }

  return payload.data ?? payload;
}

function renderAuthState() {
  const displayName = state.auth.user?.name || state.auth.user?.email || "signed-in player";
  dom.authStatus.textContent = state.auth.authenticated
    ? `Signed in as ${displayName}`
    : "Sign in to sync progress";
  dom.loginGoogle.hidden = state.auth.authenticated || !state.auth.providers.google;
  dom.loginGithub.hidden = state.auth.authenticated || !state.auth.providers.github;
  dom.logoutButton.hidden = !state.auth.authenticated;
}

async function loadProgress() {
  const response = await apiRequest("/api/progress");
  state.progress = normalizeProgress(response.progress);
}

async function migrateLegacyProgress() {
  const legacy = readJson(STORAGE_KEYS.legacyProgress, null);

  if (!legacy || !legacy.totalAttempts) {
    return;
  }

  const response = await apiRequest("/api/progress/migrate", {
    method: "POST",
    body: legacy
  });

  if (response.progress) {
    state.progress = normalizeProgress(response.progress);
  }

  localStorage.removeItem(STORAGE_KEYS.legacyProgress);
  localStorage.removeItem(STORAGE_KEYS.legacyLeaderboard);

  if (response.migrated) {
    showToast("Local progress migrated to your account.", "success");
  }
}

async function logout() {
  try {
    await apiRequest("/api/auth/logout", { method: "POST" });
  } catch (error) {
    console.warn(error);
  }

  state.auth.authenticated = false;
  state.auth.user = null;
  state.serverSessionId = null;
  state.progress = normalizeProgress(INITIAL_PROGRESS);
  renderAuthState();
  renderDashboard();
  renderBadgeRack();
  showToast("Signed out. Progress sync is paused.", "info");
}

function handleGlobalShortcuts(event) {
  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
    event.preventDefault();
    submitAnswer();
    return;
  }

  if (event.altKey && event.key.toLowerCase() === "h") {
    event.preventDefault();
    requestHint();
    return;
  }

  if (event.altKey && event.key.toLowerCase() === "n" && !dom.nextChallenge.disabled) {
    event.preventDefault();
    moveToNextChallenge();
  }
}

async function startGame() {
  clearInterval(state.timerId);
  const selectedDifficulty = dom.difficultySelect.value;
  saveUiPreferences();

  if (!state.auth.authenticated) {
    showToast("Sign in to start a server-scored run.", "info");
    scrollIntoView("#home");
    return;
  }

  const serverSession = await createServerGameSession(selectedDifficulty);
  if (!serverSession) {
    return;
  }

  const sessionChallenges = getChallengesByIds(serverSession.challengeIds);
  if (!sessionChallenges.length) {
    showToast("Server-selected challenges are not available in this client build.", "info");
    return;
  }

  state.game = {
    ...createEmptyGame(),
    active: true,
    selectedDifficulty,
    sessionChallenges,
    challengeIndex: serverSession.currentChallengeIndex,
    score: serverSession.score,
    xp: serverSession.xp,
    lives: serverSession.lives,
    correct: serverSession.correct,
    attempts: serverSession.attempts,
    streak: serverSession.streak,
    startedAt: new Date(serverSession.startedAt).getTime()
  };
  state.serverSessionId = serverSession.id;
  state.finishSyncPromise = null;

  dom.resultPanel.hidden = true;
  dom.feedback.className = "feedback";
  dom.aiOutput.textContent = "Arena online. Hints will stay partial until you submit.";
  loadChallenge(state.game.challengeIndex);
  updateHud();
  scrollIntoView("#play");
}

async function createServerGameSession(selectedDifficulty) {
  try {
    const response = await apiRequest("/api/game-sessions", {
      method: "POST",
      body: {
        selectedDifficulty
      }
    });
    return response.session;
  } catch (error) {
    console.warn(error);
    showToast("Could not create a server-scored run.", "info");
    return null;
  }
}

function getChallengesByIds(challengeIds) {
  const byId = new Map(state.challenges.map((challenge) => [challenge.id, challenge]));
  return challengeIds.map((id) => byId.get(id)).filter(Boolean);
}

function loadChallenge(index) {
  const challenge = state.game.sessionChallenges[index];

  if (!challenge) {
    showToast("No server-selected challenge is available.", "info");
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
  dom.answerInput.value = getDraftForChallenge(challenge.id) || challenge.buggyCode;
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

async function submitAnswer() {
  const game = state.game;
  const challenge = game.currentChallenge;

  if (!game.active || !challenge || game.answeredCurrent) {
    return;
  }

  const answer = dom.answerInput.value;
  game.submittedCurrent = true;
  dom.submitAnswer.disabled = true;

  if (!state.serverSessionId) {
    showToast("No server session is active.", "info");
    dom.submitAnswer.disabled = false;
    return;
  }

  try {
    const response = await apiRequest("/api/submissions", {
      method: "POST",
      body: {
        gameSessionId: state.serverSessionId,
        answer
      }
    });

    applyServerSession(response.session);
    if (response.progress) {
      state.progress = normalizeProgress(response.progress);
    }

    renderSubmissionOutcome(response, challenge);
    persistProgress();
    updateHud();
    renderDashboard();
    renderBadgeRack();
  } catch (error) {
    console.warn(error);
    showToast(error.message || "Submission sync failed.", "info");
    game.submittedCurrent = false;
    dom.submitAnswer.disabled = false;
  }
}

function renderSubmissionOutcome(response, challenge) {
  const outcome = response.outcome || {};

  if (response.session?.status && response.session.status !== "IN_PROGRESS") {
    state.game.answeredCurrent = true;
    dom.answerInput.disabled = true;
    dom.hintButton.disabled = true;
    dom.nextChallenge.disabled = true;
    clearDraftForChallenge(challenge.id);
    const title = response.session.status === "LOCKED" ? "System Lockout" : "Arena Cleared";
    const copy = outcome.timedOut
      ? `Time expired. ${challenge.explanation}`
      : outcome.isCorrect
        ? `Correct. ${challenge.explanation}`
        : `Still buggy. ${challenge.explanation}`;
    updateFeedback(outcome.isCorrect ? "success" : "error", copy);
    dom.aiOutput.textContent = challenge.explanation;
    finishGameFromServer(title, response.session);
    return;
  }

  if (outcome.isCorrect) {
    state.game.answeredCurrent = true;
    updateFeedback("success", `Correct. ${challenge.explanation}`);
    dom.aiOutput.textContent = challenge.explanation;
    dom.nextChallenge.disabled = false;
    dom.submitAnswer.disabled = true;
    dom.answerInput.disabled = true;
    clearDraftForChallenge(challenge.id);
    triggerConfetti();
    return;
  }

  if (outcome.timedOut) {
    state.game.answeredCurrent = true;
    updateFeedback("error", `Time expired. ${challenge.explanation}`);
    dom.aiOutput.textContent = challenge.explanation;
    dom.nextChallenge.disabled = false;
    dom.submitAnswer.disabled = true;
    dom.answerInput.disabled = true;
    clearDraftForChallenge(challenge.id);
    return;
  }

  state.game.answeredCurrent = false;
  state.game.submittedCurrent = false;
  updateFeedback("error", `Still buggy. ${challenge.explanation}`);
  dom.aiOutput.textContent = challenge.explanation;
  dom.nextChallenge.disabled = true;
  dom.submitAnswer.disabled = false;
  dom.answerInput.disabled = false;
  pulseElement(dom.answerInput);
}

async function handleTimeout() {
  clearInterval(state.timerId);
  dom.feedback.textContent = "Time expired. Validating with server...";
  dom.submitAnswer.disabled = true;
  await submitAnswer();
}

function moveToNextChallenge() {
  if (!state.game.active) {
    return;
  }

  if (state.game.challengeIndex >= state.game.sessionChallenges.length) {
    return;
  }

  loadChallenge(state.game.challengeIndex);
}

function applyServerSession(session) {
  if (!session) {
    return;
  }

  state.game.score = session.score;
  state.game.xp = session.xp;
  state.game.correct = session.correct;
  state.game.attempts = session.attempts;
  state.game.hintsUsed = session.hintsUsed;
  state.game.lives = session.lives;
  state.game.streak = session.streak;
  state.game.challengeIndex = session.currentChallengeIndex;
  state.game.elapsedSeconds = session.timeSpentSeconds || Math.max(1, Math.floor((Date.now() - state.game.startedAt) / 1000));
  state.game.active = session.status === "IN_PROGRESS";
}

function finishGameFromServer(title, session) {
  clearInterval(state.timerId);

  if (!session) {
    return;
  }

  applyServerSession(session);
  state.finishSyncPromise = Promise.resolve();

  const accuracy = getAccuracy(session.correct, session.attempts);
  dom.resultPanel.hidden = false;
  dom.resultTitle.textContent = title;
  dom.resultCopy.textContent = `${session.correct} bugs fixed with ${accuracy}% accuracy in ${formatTime(session.timeSpentSeconds)}.`;
  dom.resultStats.innerHTML = [
    statPill("Score", session.score),
    statPill("XP", session.xp),
    statPill("Lives", Math.max(0, session.lives)),
    statPill("Difficulty", session.selectedDifficulty)
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

  dom.aiOutput.textContent = "Generating hint...";
  const hint = await getAiText("hint", challenge.hint, challenge, false);
  dom.aiOutput.textContent = hint;
  updateFeedback("info", `Hint: ${hint}`);
  updateHud();
}

async function explainBug() {
  const challenge = state.game.currentChallenge || state.challenges[0];
  if (!challenge) {
    return;
  }

  if (state.game.answeredCurrent || !state.game.active) {
    dom.aiOutput.textContent = challenge.explanation;
    updateFeedback("info", challenge.explanation);
    return;
  }

  dom.aiOutput.textContent = "Preparing explanation...";
  const canRevealMore = state.game.submittedCurrent || !state.game.active;
  const explanation = await getAiText("explanation", challenge.explanation, challenge, canRevealMore);
  dom.aiOutput.textContent = explanation;
  updateFeedback("info", explanation);
}

async function getAiText(kind, fallback, challenge, revealAnswer) {
  if (!state.auth.authenticated || !state.serverSessionId) {
    return fallback;
  }

  try {
    const response = await apiRequest("/api/ai/hint", {
      method: "POST",
      body: { gameSessionId: state.serverSessionId, kind }
    });
    if (typeof response.hintsUsed === "number") {
      state.game.hintsUsed = response.hintsUsed;
    }
    return cleanAiResponse(response.text || fallback, challenge, revealAnswer);
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
  updateApiStatus();
  testAiHint();
}

function clearApiKey() {
  localStorage.removeItem(STORAGE_KEYS.editorDrafts);
  updateApiStatus("Local editor drafts cleared. Backend AI configuration is unchanged.");
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

async function submitScore(event) {
  event.preventDefault();
  const name = dom.playerName.value.trim();

  if (!name) {
    return;
  }

  if (!state.auth.authenticated || !state.serverSessionId) {
    showToast("Sign in and finish a synced run before submitting a leaderboard score.", "info");
    return;
  }

  if (state.finishSyncPromise) {
    await state.finishSyncPromise;
  }

  try {
    await leaderboardProvider.submit({
      gameSessionId: state.serverSessionId,
      username: name
    });
    dom.playerName.value = "";
    showToast("Score submitted to leaderboard.", "success");
    await renderLeaderboard();
    scrollIntoView("#leaderboard");
  } catch (error) {
    console.warn(error);
    showToast(error.message || "Leaderboard submission failed.", "info");
  }
}

async function renderLeaderboard() {
  let entries = [];
  try {
    entries = await leaderboardProvider.list();
  } catch (error) {
    console.warn(error);
  }
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

function persistProgress() {
  // Server-backed progress is updated through protected submission/session routes.
}

async function resetProgress() {
  const confirmed = window.confirm("Reset dashboard progress and badges?");
  if (!confirmed) {
    return;
  }

  if (state.auth.authenticated) {
    try {
      const response = await apiRequest("/api/progress", { method: "DELETE" });
      state.progress = normalizeProgress(response.progress);
    } catch (error) {
      console.warn(error);
      showToast(error.message || "Progress reset failed.", "info");
      return;
    }
  } else {
    state.progress = normalizeProgress(INITIAL_PROGRESS);
  }

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

  dom.apiStatus.textContent = state.auth.authenticated
    ? "Signed in. AI hints use the secure backend when configured."
    : "Sign in to use backend AI hints. Curated fallback hints remain active.";
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

function loadUiPreferences() {
  const preferences = readJson(STORAGE_KEYS.uiPreferences, {});
  const difficulty = preferences?.difficulty;

  if (["All", "Easy", "Medium", "Hard"].includes(difficulty)) {
    dom.difficultySelect.value = difficulty;
  }
}

function saveUiPreferences() {
  localStorage.setItem(
    STORAGE_KEYS.uiPreferences,
    JSON.stringify({
      difficulty: dom.difficultySelect.value
    })
  );
}

function getDraftForChallenge(challengeId) {
  const drafts = readJson(STORAGE_KEYS.editorDrafts, {});
  return drafts?.[challengeId] || "";
}

function saveCurrentDraft() {
  const challenge = state.game.currentChallenge;
  if (!challenge || dom.answerInput.disabled) {
    return;
  }

  const drafts = readJson(STORAGE_KEYS.editorDrafts, {});
  drafts[challenge.id] = dom.answerInput.value;
  localStorage.setItem(STORAGE_KEYS.editorDrafts, JSON.stringify(drafts));
}

function restoreCurrentDraft() {
  const challenge = state.game.currentChallenge;
  if (!challenge || dom.answerInput.disabled) {
    return;
  }

  const draft = getDraftForChallenge(challenge.id);
  if (draft) {
    dom.answerInput.value = draft;
  }
}

function clearDraftForChallenge(challengeId) {
  const drafts = readJson(STORAGE_KEYS.editorDrafts, {});
  delete drafts[challengeId];
  localStorage.setItem(STORAGE_KEYS.editorDrafts, JSON.stringify(drafts));
}

function removeLegacySecrets() {
  localStorage.removeItem(STORAGE_KEYS.legacyApiKey);
  localStorage.removeItem(STORAGE_KEYS.legacyModel);
}

function toCamel(id) {
  return id.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}
