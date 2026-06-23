import type { ProgressShape, StatBucket } from "./progress.js";
import { getAccuracy } from "./rules.js";

export type RecommendationSubmission = {
  isCorrect: boolean;
  hintsUsed: number;
  timeLeftSeconds: number;
  challenge: {
    topic: string;
    language: string;
    difficulty: "EASY" | "MEDIUM" | "HARD";
  };
};

export type SkillMasteryItem = {
  key: string;
  attempts: number;
  correct: number;
  accuracy: number;
  mastery: "new" | "learning" | "steady" | "strong";
};

export type AdaptiveRecommendation = {
  id: string;
  title: string;
  reason: string;
  action: string;
  mode: "track" | "no_hint" | "placement_prep" | "boss" | "standard";
  trackId?: string;
};

export function buildSkillMastery(progress: ProgressShape) {
  return {
    topics: masteryFromBucket(progress.topicStats),
    languages: masteryFromBucket(progress.languageStats),
    difficulties: masteryFromBucket(progress.difficultyStats)
  };
}

export function buildAdaptiveRecommendations(
  progress: ProgressShape,
  recentSubmissions: RecommendationSubmission[]
): AdaptiveRecommendation[] {
  const recommendations: AdaptiveRecommendation[] = [];
  const recentMistakeTopic = mostFrequent(
    recentSubmissions.filter((submission) => !submission.isCorrect).map((submission) => submission.challenge.topic)
  );
  const highHintLanguage = mostFrequent(
    recentSubmissions.filter((submission) => submission.hintsUsed >= 2).map((submission) => submission.challenge.language)
  );
  const slowTopic = mostFrequent(
    recentSubmissions.filter((submission) => submission.isCorrect && submission.timeLeftSeconds <= 10).map((submission) => submission.challenge.topic)
  );
  const weakestLanguage = weakestKey(progress.languageStats);

  if (recentMistakeTopic) {
    recommendations.push({
      id: "recent-mistake-topic",
      title: `Stabilize ${recentMistakeTopic}`,
      reason: `Your recent misses cluster around ${recentMistakeTopic}.`,
      action: "Run a focused standard set and inspect expected versus actual output before submitting.",
      mode: "standard"
    });
  }

  if (highHintLanguage) {
    recommendations.push({
      id: "hint-heavy-language",
      title: `Reduce hints in ${highHintLanguage}`,
      reason: `Recent ${highHintLanguage} attempts used multiple hints.`,
      action: "Try no-hint mode for one short run after reviewing the first visible test.",
      mode: "no_hint",
      trackId: `language-${highHintLanguage.toLowerCase()}`
    });
  }

  if (slowTopic) {
    recommendations.push({
      id: "slow-completion-topic",
      title: `Speed up ${slowTopic}`,
      reason: `Correct fixes in ${slowTopic} are landing near the timer edge.`,
      action: "Use placement preparation mode to practice faster pattern recognition.",
      mode: "placement_prep",
      trackId: "placement-prep"
    });
  }

  if (weakestLanguage) {
    recommendations.push({
      id: "weakest-language",
      title: `Rebuild ${weakestLanguage} confidence`,
      reason: `${weakestLanguage} has your lowest mastery score.`,
      action: `Start the ${weakestLanguage} language track.`,
      mode: "track",
      trackId: `language-${weakestLanguage.toLowerCase()}`
    });
  }

  if (progress.bestStreak >= 5 && getAccuracy(progress.totalCorrect, progress.totalAttempts) >= 80) {
    recommendations.push({
      id: "boss-ready",
      title: "Try a boss challenge",
      reason: "Your streak and accuracy suggest you are ready for a higher-pressure run.",
      action: "Start boss mode and aim for a clean completion.",
      mode: "boss",
      trackId: "boss"
    });
  }

  if (!recommendations.length) {
    recommendations.push({
      id: "beginner-track",
      title: "Build a baseline",
      reason: "There is not enough recent history yet.",
      action: "Start the beginner track and complete three visible-test-first fixes.",
      mode: "track",
      trackId: "beginner"
    });
  }

  return recommendations.slice(0, 4);
}

function masteryFromBucket(bucket: StatBucket): SkillMasteryItem[] {
  return Object.entries(bucket)
    .map(([key, stats]) => {
      const accuracy = getAccuracy(stats.correct, stats.attempts);
      return {
        key,
        attempts: stats.attempts,
        correct: stats.correct,
        accuracy,
        mastery: masteryLabel(stats.attempts, accuracy)
      };
    })
    .sort((a, b) => a.accuracy - b.accuracy || b.attempts - a.attempts);
}

function masteryLabel(attempts: number, accuracy: number): SkillMasteryItem["mastery"] {
  if (attempts < 2) return "new";
  if (accuracy < 55) return "learning";
  if (accuracy < 80) return "steady";
  return "strong";
}

function weakestKey(bucket: StatBucket): string | null {
  const candidates = masteryFromBucket(bucket).filter((item) => item.attempts >= 2);
  return candidates[0]?.key || null;
}

function mostFrequent(values: string[]): string | null {
  if (!values.length) return null;

  const counts = values.reduce<Record<string, number>>((accumulator, value) => {
    accumulator[value] = (accumulator[value] || 0) + 1;
    return accumulator;
  }, {});

  return Object.entries(counts).sort(([, a], [, b]) => b - a)[0][0];
}
