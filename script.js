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
  },
  { id: "bug-surgeon", label: "Bug Surgeon", test: (progress) => progress.bugsFixed >= 25 },
  { id: "accuracy-80", label: "Precision Debugger", test: (progress) => progress.totalAttempts >= 10 },
  { id: "xp-1000", label: "Kilobyte Climber", test: (progress) => progress.totalXP >= 1000 },
  { id: "language-specialist", label: "Language Specialist", test: () => false },
  { id: "topic-master", label: "Topic Master", test: () => false },
  { id: "daily-debugger", label: "Daily Debugger", test: () => false },
  { id: "no-hint-clear", label: "Clean Room Clear", test: () => false },
  { id: "boss-breaker", label: "Boss Breaker", test: () => false },
  { id: "quest-streaker", label: "Quest Streaker", test: () => false }
];

const leaderboardProvider = {
  async list(scope = state.leaderboardScope) {
    const response = await apiRequest(`/api/leaderboard?scope=${encodeURIComponent(scope)}`);
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
  engagement: {
    dailyBug: null,
    weeklyQuests: [],
    tracks: [],
    profile: null,
    achievements: [],
    history: [],
    mastery: null,
    recommendations: []
  },
  leaderboardScope: "weekly",
  workspace: {
    monaco: null,
    editor: null,
    currentServerChallenge: null,
    lastRun: null,
    diffVisible: false,
    hintLevel: 0,
    hintTexts: []
  },
  timerId: null,
  miniStreamId: null,
  particlesStarted: false
};

function createEmptyGame() {
  return {
    active: false,
    selectedDifficulty: "All",
    mode: "standard",
    trackId: null,
    noHintMode: false,
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
  await initializeEditor();
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
    "mode-select",
    "track-select",
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
    "editor-host",
    "answer-input",
    "run-tests",
    "reset-code",
    "toggle-diff",
    "visible-tests",
    "hidden-tests",
    "console-output",
    "compiler-output",
    "expected-actual-output",
    "diff-panel",
    "diff-output",
    "hint-ladder",
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
    "daily-bug-panel",
    "weekly-quests-panel",
    "tracks-panel",
    "topic-bars",
    "recommendation-panel",
    "mastery-panel",
    "history-panel",
    "profile-panel",
    "reset-progress",
    "leaderboard-body",
    "leaderboard-preview-list",
    "leaderboard-weekly",
    "leaderboard-monthly",
    "leaderboard-all-time",
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
  dom.modeSelect.addEventListener("change", () => {
    saveUiPreferences();
    updateModeControls();
  });
  dom.trackSelect.addEventListener("change", saveUiPreferences);
  dom.runTests.addEventListener("click", runTests);
  dom.resetCode.addEventListener("click", resetCode);
  dom.toggleDiff.addEventListener("click", toggleDiff);
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
  dom.answerInput.addEventListener("input", () => {
    if (!state.workspace.editor) {
      saveCurrentDraft();
      renderDiff();
    }
  });
  dom.difficultySelect.addEventListener("change", saveUiPreferences);
  [dom.leaderboardWeekly, dom.leaderboardMonthly, dom.leaderboardAllTime].forEach((button) => {
    button.addEventListener("click", () => {
      state.leaderboardScope = button.dataset.scope || "weekly";
      saveUiPreferences();
      renderLeaderboard();
      trackClientEvent("leaderboard_viewed", { scope: state.leaderboardScope });
    });
  });
  document.addEventListener("keydown", handleGlobalShortcuts);

  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEYS.editorDrafts && state.game.currentChallenge) {
      restoreCurrentDraft();
    }
  });

  window.addEventListener("bugops:leaderboard-update", renderLeaderboard);
}

async function initializeEditor() {
  if (!window.require || !dom.editorHost) {
    return;
  }

  try {
    window.require.config({ paths: { vs: "/vendor/monaco/vs" } });
    const monaco = await new Promise((resolve, reject) => {
      window.require(
        ["vs/editor/editor.main"],
        () => resolve(window.monaco),
        (error) => reject(error)
      );
    });

    state.workspace.monaco = monaco;
    state.workspace.editor = monaco.editor.create(dom.editorHost, {
      value: dom.answerInput.value || "",
      language: "javascript",
      theme: "vs-dark",
      automaticLayout: true,
      minimap: { enabled: false },
      fontSize: 14,
      tabSize: 2,
      scrollBeyondLastLine: false,
      wordWrap: "on",
      ariaLabel: "BugOps code editor"
    });
    document.body.classList.add("monaco-ready");

    state.workspace.editor.onDidChangeModelContent(() => {
      dom.answerInput.value = state.workspace.editor.getValue();
      saveCurrentDraft();
      renderDiff();
    });
  } catch (error) {
    console.warn(error);
    showToast("Editor fallback is active. Monaco could not load.", "info");
  }
}

function getEditorValue() {
  return state.workspace.editor ? state.workspace.editor.getValue() : dom.answerInput.value;
}

function setEditorValue(value) {
  dom.answerInput.value = value;
  if (state.workspace.editor) {
    state.workspace.editor.setValue(value);
  }
  renderDiff();
}

function setEditorLanguage(language) {
  const monaco = state.workspace.monaco;
  const editor = state.workspace.editor;
  if (!monaco || !editor) {
    return;
  }

  const languageId = {
    JavaScript: "javascript",
    Python: "python",
    C: "c",
    Java: "java"
  }[language] || "plaintext";

  monaco.editor.setModelLanguage(editor.getModel(), languageId);
}

function setEditorDisabled(disabled) {
  dom.answerInput.disabled = disabled;
  if (state.workspace.editor) {
    state.workspace.editor.updateOptions({ readOnly: disabled, domReadOnly: disabled });
  }
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
      await loadEngagementState();
    }
  } catch (error) {
    console.warn(error);
    renderAuthState();
    showToast("Server sync is unavailable. This run will stay on this device.", "info");
  }
  renderEngagementPanels();
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

async function trackClientEvent(eventName, properties = {}) {
  if (!state.auth.authenticated) {
    return;
  }

  await apiRequest("/api/analytics/events", {
    method: "POST",
    body: {
      eventName,
      gameSessionId: state.serverSessionId || undefined,
      properties
    }
  }).catch((error) => console.warn(error));
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

async function loadEngagementState() {
  const [engagement, profile, mastery, history] = await Promise.all([
    apiRequest("/api/engagement"),
    apiRequest("/api/profile/me"),
    apiRequest("/api/profile/mastery"),
    apiRequest("/api/profile/history")
  ]);

  state.engagement.dailyBug = engagement.dailyBug || null;
  state.engagement.weeklyQuests = engagement.weeklyQuests || [];
  state.engagement.tracks = engagement.tracks || [];
  state.engagement.profile = profile.profile || null;
  state.engagement.achievements = profile.achievements || [];
  state.engagement.mastery = mastery.mastery || null;
  state.engagement.recommendations = mastery.recommendations || [];
  state.engagement.history = history.history || [];
  renderEngagementPanels();
  renderTrackOptions();
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
  state.engagement = {
    dailyBug: null,
    weeklyQuests: [],
    tracks: [],
    profile: null,
    achievements: [],
    history: [],
    mastery: null,
    recommendations: []
  };
  renderAuthState();
  renderDashboard();
  renderEngagementPanels();
  renderBadgeRack();
  showToast("Signed out. Progress sync is paused.", "info");
}

function handleGlobalShortcuts(event) {
  if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === "Enter") {
    event.preventDefault();
    runTests();
    return;
  }

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
  const selectedMode = dom.modeSelect.value;
  const selectedTrack = dom.trackSelect.value;
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
    mode: serverSession.mode || selectedMode,
    trackId: serverSession.trackId || selectedTrack,
    noHintMode: Boolean(serverSession.noHintMode),
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
  if (serverSession.noHintMode) {
    dom.aiOutput.textContent = "No-hint mode is active. The server will reject hint requests for this run.";
  }
  await loadChallenge(state.game.challengeIndex);
  updateHud();
  scrollIntoView("#play");
}

async function createServerGameSession(selectedDifficulty) {
  try {
    const response = await apiRequest("/api/game-sessions", {
      method: "POST",
      body: {
        selectedDifficulty,
        mode: dom.modeSelect.value,
        trackId: dom.trackSelect.value
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

async function loadChallenge(index) {
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
  state.workspace.currentServerChallenge = null;
  state.workspace.lastRun = null;
  state.workspace.hintLevel = 0;

  dom.challengeLanguage.textContent = challenge.language;
  dom.challengeDifficulty.textContent = challenge.difficulty;
  dom.challengeTopic.textContent = challenge.topic;
  dom.challengeTitle.textContent = challenge.title;
  dom.buggyCodeDisplay.textContent = challenge.buggyCode;
  setEditorLanguage(challenge.language);
  setEditorValue(getDraftForChallenge(challenge.id) || challenge.buggyCode);
  setEditorDisabled(false);
  dom.feedback.textContent = "";
  dom.feedback.className = "feedback";
  dom.nextChallenge.disabled = true;
  dom.submitAnswer.disabled = false;
  dom.hintButton.disabled = Boolean(state.game.noHintMode);
  dom.runTests.disabled = false;
  dom.resetCode.disabled = false;
  dom.toggleDiff.disabled = false;
  dom.explainButton.disabled = false;
  dom.aiOutput.textContent = state.game.noHintMode
    ? "Challenge loaded. No-hint mode is active for this run."
    : "Challenge loaded. Request a hint for a small nudge.";
  clearWorkspaceOutputs();
  renderHintLadder();

  updateHud();
  startTimer();
  await loadWorkspaceChallenge();
}

async function loadWorkspaceChallenge() {
  if (!state.serverSessionId) {
    return;
  }

  try {
    const response = await apiRequest(`/api/workspace/game-sessions/${state.serverSessionId}/current`);
    const challenge = response.challenge;
    if (!challenge) {
      return;
    }

    state.workspace.currentServerChallenge = challenge;
    dom.buggyCodeDisplay.textContent = challenge.starterCode;
    if (!getDraftForChallenge(challenge.id)) {
      setEditorValue(challenge.starterCode);
    }
    renderWorkspaceTests(challenge);
    renderHintLadder();
    renderDiff();
  } catch (error) {
    console.warn(error);
    showToast("Workspace metadata is unavailable. Static challenge data is still loaded.", "info");
  }
}

function clearWorkspaceOutputs() {
  state.workspace.lastRun = null;
  state.workspace.hintTexts = [];
  dom.visibleTests.innerHTML = `<li><strong>Waiting for challenge tests</strong><span>Start a synced run to load visible tests.</span></li>`;
  dom.hiddenTests.innerHTML = `<li><strong>Hidden validation</strong><span>Hidden tests appear after the server loads the challenge.</span></li>`;
  dom.consoleOutput.textContent = "No run yet.";
  dom.compilerOutput.textContent = "No compiler output.";
  dom.expectedActualOutput.textContent = "Run tests to compare results.";
  renderDiff();
}

function renderWorkspaceTests(challenge, run = state.workspace.lastRun) {
  const visibleTests = challenge?.visibleTests || [];
  const hiddenTests = challenge?.hiddenTests || [];
  dom.visibleTests.innerHTML = visibleTests.length
    ? visibleTests.map((test) => renderTestListItem(test, run)).join("")
    : `<li><strong>No visible tests</strong><span>The server did not provide visible tests.</span></li>`;
  dom.hiddenTests.innerHTML = hiddenTests.length
    ? hiddenTests.map((test) => renderTestListItem(test, run)).join("")
    : `<li><strong>No hidden tests</strong><span>This challenge has no hidden checks.</span></li>`;
}

function renderTestListItem(test, run) {
  const result = run?.results?.find((candidate) => candidate.id === test.id);
  const statusClass = result ? ` class="is-${result.status}"` : "";
  const status = result ? result.status.toUpperCase() : test.expected;
  return `<li${statusClass}><strong>${escapeHtml(test.name)}</strong><span>${escapeHtml(status)}</span></li>`;
}

function renderExecutionResult(run) {
  state.workspace.lastRun = run;
  renderWorkspaceTests(state.workspace.currentServerChallenge, run);
  dom.consoleOutput.textContent = run.consoleOutput?.length ? run.consoleOutput.join("\n") : "No console output.";
  dom.compilerOutput.textContent = run.compilerOutput || "No compiler output.";

  if (!run.results?.length) {
    dom.expectedActualOutput.textContent = "No test results returned.";
    return;
  }

  dom.expectedActualOutput.innerHTML = run.results
    .map(
      (result) => `
        <div class="comparison-row">
          <span><strong>${escapeHtml(result.name)}</strong><br>${escapeHtml(result.status)}</span>
          <span><strong>Expected</strong><br>${escapeHtml(result.expected || "")}</span>
          <span><strong>Actual</strong><br>${escapeHtml(result.actual || "")}</span>
        </div>
      `
    )
    .join("");
}

async function runTests() {
  const challenge = state.game.currentChallenge;
  if (!state.game.active || !challenge || !state.serverSessionId) {
    showToast("Start a signed-in run before testing.", "info");
    return null;
  }

  dom.runTests.disabled = true;
  dom.consoleOutput.textContent = "Running tests in the server execution provider...";
  dom.compilerOutput.textContent = "Waiting for compiler output...";

  try {
    const response = await apiRequest("/api/workspace/run-tests", {
      method: "POST",
      body: {
        gameSessionId: state.serverSessionId,
        code: getEditorValue()
      }
    });
    const run = response.run;
    renderExecutionResult(run);
    updateFeedback(run.passed ? "success" : "error", run.passed ? "All visible and hidden tests passed." : "Some tests are still failing.");
    return run;
  } catch (error) {
    console.warn(error);
    dom.compilerOutput.textContent = error.message || "Test run failed.";
    updateFeedback("error", error.message || "Test run failed.");
    return null;
  } finally {
    dom.runTests.disabled = false;
  }
}

function resetCode() {
  const challenge = state.workspace.currentServerChallenge || state.game.currentChallenge;
  if (!challenge) {
    return;
  }

  const starterCode = challenge.starterCode || challenge.buggyCode || "";
  setEditorValue(starterCode);
  clearDraftForChallenge(challenge.id);
  state.workspace.lastRun = null;
  renderWorkspaceTests(state.workspace.currentServerChallenge);
  dom.consoleOutput.textContent = "Reset to starter code.";
  dom.compilerOutput.textContent = "No compiler output.";
  dom.expectedActualOutput.textContent = "Run tests to compare results.";
}

function toggleDiff() {
  state.workspace.diffVisible = !state.workspace.diffVisible;
  dom.diffPanel.hidden = !state.workspace.diffVisible;
  dom.toggleDiff.setAttribute("aria-expanded", String(state.workspace.diffVisible));
  renderDiff();
}

function renderDiff() {
  if (!dom.diffPanel || dom.diffPanel.hidden) {
    return;
  }

  const challenge = state.workspace.currentServerChallenge || state.game.currentChallenge;
  const starterCode = challenge?.starterCode || challenge?.buggyCode || "";
  const currentCode = getEditorValue();
  dom.diffOutput.innerHTML = buildSimpleDiff(starterCode, currentCode);
}

function buildSimpleDiff(before, after) {
  const beforeLines = String(before || "").split("\n");
  const afterLines = String(after || "").split("\n");
  const max = Math.max(beforeLines.length, afterLines.length);
  const rows = [];

  for (let index = 0; index < max; index += 1) {
    const previous = beforeLines[index];
    const current = afterLines[index];
    if (previous === current) {
      rows.push(`<span class="diff-line is-same">  ${escapeHtml(current || "")}</span>`);
    } else {
      if (typeof previous === "string") {
        rows.push(`<span class="diff-line is-removed">- ${escapeHtml(previous)}</span>`);
      }
      if (typeof current === "string") {
        rows.push(`<span class="diff-line is-added">+ ${escapeHtml(current)}</span>`);
      }
    }
  }

  return rows.join("") || `<span class="diff-line is-same">No differences.</span>`;
}

function renderHintLadder() {
  const total = state.workspace.currentServerChallenge?.hintsAvailable || 5;
  dom.hintLadder.innerHTML = Array.from({ length: total }, (_, index) => {
    const level = index + 1;
    const text = state.workspace.hintTexts[index] || `Hint ${level}`;
    const unlocked = index < state.workspace.hintLevel;
    return `<li class="${unlocked ? "is-unlocked" : ""}"><strong>${level}</strong><br>${escapeHtml(unlocked ? text : "Locked")}</li>`;
  }).join("");
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

  const answer = getEditorValue();
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
    if (response.execution) {
      renderExecutionResult(response.execution);
    }

    renderSubmissionOutcome(response, challenge);
    persistProgress();
    updateHud();
    renderDashboard();
    renderBadgeRack();
    if (state.auth.authenticated) {
      await loadEngagementState().catch((error) => console.warn(error));
    }
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
    setEditorDisabled(true);
    dom.hintButton.disabled = true;
    dom.runTests.disabled = true;
    dom.resetCode.disabled = true;
    dom.nextChallenge.disabled = true;
    clearDraftForChallenge(challenge.id);
    const title = response.session.status === "LOCKED" ? "System Lockout" : "Arena Cleared";
    const copy = outcome.timedOut
      ? `Time expired. ${response.rootCause || "Review the failed tests and retry the pattern in a fresh run."}`
      : outcome.isCorrect
        ? `Correct. ${response.rootCause || challenge.explanation}`
        : "Still buggy. The server tests did not accept this fix.";
    updateFeedback(outcome.isCorrect ? "success" : "error", copy);
    dom.aiOutput.textContent = response.rootCause || copy;
    finishGameFromServer(title, response.session);
    return;
  }

  if (outcome.isCorrect) {
    state.game.answeredCurrent = true;
    updateFeedback("success", `Correct. ${response.rootCause || challenge.explanation}`);
    dom.aiOutput.textContent = response.rootCause || challenge.explanation;
    dom.nextChallenge.disabled = false;
    dom.submitAnswer.disabled = true;
    dom.runTests.disabled = true;
    dom.resetCode.disabled = true;
    setEditorDisabled(true);
    clearDraftForChallenge(challenge.id);
    triggerConfetti();
    return;
  }

  if (outcome.timedOut) {
    state.game.answeredCurrent = true;
    updateFeedback("error", `Time expired. ${response.rootCause || "The run expired before a server-verified fix landed."}`);
    dom.aiOutput.textContent = response.rootCause || "The run expired before a server-verified fix landed.";
    dom.nextChallenge.disabled = false;
    dom.submitAnswer.disabled = true;
    dom.runTests.disabled = true;
    dom.resetCode.disabled = true;
    setEditorDisabled(true);
    clearDraftForChallenge(challenge.id);
    return;
  }

  state.game.answeredCurrent = false;
  state.game.submittedCurrent = false;
  updateFeedback("error", "Still buggy. Use the failing expected/actual output before submitting again.");
  dom.aiOutput.textContent = "The root cause unlocks after the server verifies the fix.";
  dom.nextChallenge.disabled = true;
  dom.submitAnswer.disabled = false;
  setEditorDisabled(false);
  pulseElement(dom.editorHost || dom.answerInput);
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

  void loadChallenge(state.game.challengeIndex);
}

function applyServerSession(session) {
  if (!session) {
    return;
  }

  state.game.score = session.score;
  state.game.mode = session.mode || state.game.mode;
  state.game.trackId = session.trackId || state.game.trackId;
  state.game.noHintMode = Boolean(session.noHintMode);
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
  dom.runTests.disabled = true;
  dom.resetCode.disabled = true;
  dom.toggleDiff.disabled = true;
  renderDashboard();
  renderBadgeRack();
  triggerConfetti();
}

async function requestHint() {
  const challenge = state.game.currentChallenge || state.challenges[0];
  if (!challenge) {
    return;
  }

  if (state.game.noHintMode) {
    updateFeedback("info", "No-hint mode is active. Hints are blocked for this run.");
    dom.aiOutput.textContent = "Use visible tests, expected versus actual output, and the diff view to reason through this one.";
    return;
  }

  dom.aiOutput.textContent = "Generating hint...";
  const hint = await getAiText("hint", challenge.hint, challenge, false);
  const nextLevel = Math.min(state.workspace.currentServerChallenge?.hintsAvailable || 5, state.workspace.hintLevel + 1);
  state.workspace.hintLevel = nextLevel;
  state.workspace.hintTexts[nextLevel - 1] = hint;
  renderHintLadder();
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
  const hint = await getAiText("hint", challenge.hint, challenge, false);
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
  [dom.leaderboardWeekly, dom.leaderboardMonthly, dom.leaderboardAllTime].forEach((button) => {
    const isActive = button.dataset.scope === state.leaderboardScope;
    button.classList.toggle("btn-secondary", isActive);
    button.classList.toggle("btn-ghost", !isActive);
  });

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
  renderEngagementPanels();
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
  if (state.engagement.recommendations.length) {
    dom.recommendationPanel.innerHTML = state.engagement.recommendations
      .map(
        (recommendation) => `
          <div class="recommendation-card">
            <span>${escapeHtml(recommendation.mode.replaceAll("_", " "))}</span>
            <strong>${escapeHtml(recommendation.title)}</strong>
            <p>${escapeHtml(recommendation.reason)} ${escapeHtml(recommendation.action)}</p>
          </div>
        `
      )
      .join("");
    return;
  }

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

function renderEngagementPanels() {
  renderDailyBug();
  renderWeeklyQuests();
  renderTracks();
  renderMastery();
  renderHistory();
  renderProfilePanel();
}

function renderDailyBug() {
  const dailyBug = state.engagement.dailyBug;
  dom.dailyBugPanel.innerHTML = dailyBug
    ? `
      <div class="recommendation-card">
        <span>${escapeHtml(dailyBug.language)} · ${escapeHtml(dailyBug.difficulty)}</span>
        <strong>${escapeHtml(dailyBug.title)}</strong>
        <p>${escapeHtml(dailyBug.topic)} · ${escapeHtml(dailyBug.engagementKey || "daily")}</p>
      </div>
    `
    : `<p class="muted-copy">Sign in to load today&apos;s server-selected bug.</p>`;
}

function renderWeeklyQuests() {
  const quests = state.engagement.weeklyQuests || [];
  dom.weeklyQuestsPanel.innerHTML = quests.length
    ? quests
        .map((quest) => {
          const percent = Math.round((quest.progress / Math.max(1, quest.target)) * 100);
          return `
            <div class="metric-row compact">
              <div>
                <strong>${escapeHtml(quest.label)}</strong>
                <span>${quest.progress}/${quest.target} · +${quest.rewardXp} XP</span>
              </div>
              <div class="progress-bar"><span style="width: ${percent}%"></span></div>
              <em>${quest.completed ? "Done" : `${percent}%`}</em>
            </div>
          `;
        })
        .join("")
    : `<p class="muted-copy">Weekly quests load after sign-in.</p>`;
}

function renderTracks() {
  const tracks = state.engagement.tracks || [];
  dom.tracksPanel.innerHTML = tracks.length
    ? tracks
        .slice(0, 8)
        .map(
          (track) => `
            <div class="track-chip">
              <strong>${escapeHtml(track.label)}</strong>
              <span>${escapeHtml(track.level)}${track.language ? ` · ${escapeHtml(track.language)}` : ""}</span>
            </div>
          `
        )
        .join("")
    : `<p class="muted-copy">Beginner, intermediate, advanced, language, and placement tracks are available after sign-in.</p>`;
}

function renderMastery() {
  const mastery = state.engagement.mastery;
  const items = [
    ...(mastery?.topics || []).slice(0, 3).map((item) => ({ ...item, group: "Topic" })),
    ...(mastery?.languages || []).slice(0, 2).map((item) => ({ ...item, group: "Language" }))
  ];
  dom.masteryPanel.innerHTML = items.length
    ? items
        .map(
          (item) => `
            <div class="metric-row compact">
              <div>
                <strong>${escapeHtml(item.key)}</strong>
                <span>${escapeHtml(item.group)} · ${escapeHtml(item.mastery)}</span>
              </div>
              <div class="progress-bar"><span style="width: ${item.accuracy}%"></span></div>
              <em>${item.accuracy}%</em>
            </div>
          `
        )
        .join("")
    : `<p class="muted-copy">Mastery appears after a few server-scored submissions.</p>`;
}

function renderHistory() {
  const history = state.engagement.history || [];
  dom.historyPanel.innerHTML = history.length
    ? history
        .slice(0, 8)
        .map(
          (entry) => `
            <div class="history-row">
              <strong>${escapeHtml(entry.title)}</strong>
              <span>${entry.isCorrect ? "Fixed" : "Missed"} · ${escapeHtml(entry.language)} · ${entry.hintsUsed} hints · ${entry.timeLeftSeconds}s left</span>
            </div>
          `
        )
        .join("")
    : `<p class="muted-copy">Challenge history will appear here without storing submitted source code.</p>`;
}

function renderProfilePanel() {
  const achievements = state.engagement.achievements || [];
  dom.profilePanel.innerHTML = state.auth.authenticated
    ? `
      <div class="profile-summary">
        <span>${escapeHtml(state.auth.user?.name || state.auth.user?.email || "Signed-in player")}</span>
        <strong>${state.progress.totalXP} XP · ${state.progress.bugsFixed} bugs fixed</strong>
      </div>
      <div class="achievement-grid">
        ${
          achievements.length
            ? achievements
                .slice(0, 12)
                .map((achievement) => `<span class="badge-chip">${escapeHtml(achievement.label || achievement.code)}</span>`)
                .join("")
            : '<span class="badge-empty">No achievements yet</span>'
        }
      </div>
    `
    : `<p class="muted-copy">Sign in to see profile, achievements, mastery, and history.</p>`;
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
  setEditorValue("");
  setEditorDisabled(true);
  dom.hintButton.disabled = true;
  dom.runTests.disabled = true;
  dom.resetCode.disabled = true;
  dom.toggleDiff.disabled = true;
  dom.submitAnswer.disabled = true;
  dom.explainButton.disabled = false;
  dom.nextChallenge.disabled = true;
  clearWorkspaceOutputs();
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
  if (["standard", "daily_bug", "track", "placement_prep", "no_hint", "boss"].includes(preferences?.mode)) {
    dom.modeSelect.value = preferences.mode;
  }
  if (typeof preferences?.trackId === "string" && preferences.trackId) {
    dom.trackSelect.value = preferences.trackId;
  }
  if (["weekly", "monthly", "all_time"].includes(preferences?.leaderboardScope)) {
    state.leaderboardScope = preferences.leaderboardScope;
  }
  updateModeControls();
}

function saveUiPreferences() {
  localStorage.setItem(
    STORAGE_KEYS.uiPreferences,
    JSON.stringify({
      difficulty: dom.difficultySelect.value,
      mode: dom.modeSelect.value,
      trackId: dom.trackSelect.value,
      leaderboardScope: state.leaderboardScope
    })
  );
}

function updateModeControls() {
  const mode = dom.modeSelect.value;
  dom.trackSelect.disabled = mode !== "track";
  if (mode === "placement_prep") {
    dom.trackSelect.value = "placement-prep";
  }
  if (mode === "boss") {
    dom.trackSelect.value = "advanced";
  }
}

function renderTrackOptions() {
  const tracks = state.engagement.tracks.length
    ? state.engagement.tracks
    : [
        { id: "beginner", label: "Beginner" },
        { id: "intermediate", label: "Intermediate" },
        { id: "advanced", label: "Advanced" },
        { id: "language-javascript", label: "JavaScript" },
        { id: "language-python", label: "Python" },
        { id: "language-c", label: "C" },
        { id: "language-java", label: "Java" }
      ];
  const current = dom.trackSelect.value;
  dom.trackSelect.innerHTML = tracks
    .map((track) => `<option value="${escapeHtml(track.id)}">${escapeHtml(track.label)}</option>`)
    .join("");
  if (tracks.some((track) => track.id === current)) {
    dom.trackSelect.value = current;
  }
  updateModeControls();
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
  drafts[challenge.id] = getEditorValue();
  localStorage.setItem(STORAGE_KEYS.editorDrafts, JSON.stringify(drafts));
}

function restoreCurrentDraft() {
  const challenge = state.game.currentChallenge;
  if (!challenge || dom.answerInput.disabled) {
    return;
  }

  const draft = getDraftForChallenge(challenge.id);
  if (draft) {
    setEditorValue(draft);
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
