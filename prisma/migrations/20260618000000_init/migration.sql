CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE "AuthProvider" AS ENUM ('GOOGLE', 'GITHUB');
CREATE TYPE "Difficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');
CREATE TYPE "GameSessionStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'LOCKED', 'ABANDONED');

CREATE TABLE "User" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "email" TEXT,
  "name" TEXT,
  "avatarUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastLoginAt" TIMESTAMP(3),
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Account" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "provider" "AuthProvider" NOT NULL,
  "providerAccountId" TEXT NOT NULL,
  "email" TEXT,
  "accessTokenHash" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Profile" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "displayName" TEXT,
  "totalAttempts" INTEGER NOT NULL DEFAULT 0,
  "totalCorrect" INTEGER NOT NULL DEFAULT 0,
  "bugsFixed" INTEGER NOT NULL DEFAULT 0,
  "totalXP" INTEGER NOT NULL DEFAULT 0,
  "timeSpentSeconds" INTEGER NOT NULL DEFAULT 0,
  "currentStreak" INTEGER NOT NULL DEFAULT 0,
  "bestStreak" INTEGER NOT NULL DEFAULT 0,
  "sessionsPlayed" INTEGER NOT NULL DEFAULT 0,
  "topicStats" JSONB NOT NULL DEFAULT '{}',
  "difficultyStats" JSONB NOT NULL DEFAULT '{}',
  "languageStats" JSONB NOT NULL DEFAULT '{}',
  "migratedLocalProgressAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Challenge" (
  "id" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "language" TEXT NOT NULL,
  "difficulty" "Difficulty" NOT NULL,
  "topic" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Challenge_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ChallengeVersion" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "challengeId" INTEGER NOT NULL,
  "version" INTEGER NOT NULL,
  "buggyCode" TEXT NOT NULL,
  "correctFix" TEXT NOT NULL,
  "hint" TEXT NOT NULL,
  "explanation" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChallengeVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GameSession" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "selectedDifficulty" TEXT NOT NULL,
  "status" "GameSessionStatus" NOT NULL DEFAULT 'IN_PROGRESS',
  "score" INTEGER NOT NULL DEFAULT 0,
  "xp" INTEGER NOT NULL DEFAULT 0,
  "correct" INTEGER NOT NULL DEFAULT 0,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "hintsUsed" INTEGER NOT NULL DEFAULT 0,
  "timeSpentSeconds" INTEGER NOT NULL DEFAULT 0,
  "challengeIds" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GameSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Submission" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "gameSessionId" UUID,
  "challengeId" INTEGER NOT NULL,
  "challengeVersionId" UUID,
  "submittedAnswer" TEXT NOT NULL,
  "isCorrect" BOOLEAN NOT NULL,
  "scoreAwarded" INTEGER NOT NULL DEFAULT 0,
  "xpAwarded" INTEGER NOT NULL DEFAULT 0,
  "timeLeftSeconds" INTEGER NOT NULL DEFAULT 0,
  "hintsUsed" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Achievement" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "metadata" JSONB,
  "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Achievement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Leaderboard" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "gameSessionId" UUID,
  "username" TEXT NOT NULL,
  "score" INTEGER NOT NULL,
  "xp" INTEGER NOT NULL,
  "accuracy" INTEGER NOT NULL,
  "timeTaken" INTEGER NOT NULL,
  "difficulty" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Leaderboard_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Session" (
  "sid" TEXT NOT NULL,
  "data" JSONB NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Session_pkey" PRIMARY KEY ("sid")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");
CREATE INDEX "Account_userId_idx" ON "Account"("userId");
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");
CREATE UNIQUE INDEX "ChallengeVersion_challengeId_version_key" ON "ChallengeVersion"("challengeId", "version");
CREATE INDEX "ChallengeVersion_challengeId_isActive_idx" ON "ChallengeVersion"("challengeId", "isActive");
CREATE INDEX "GameSession_userId_createdAt_idx" ON "GameSession"("userId", "createdAt");
CREATE INDEX "GameSession_status_idx" ON "GameSession"("status");
CREATE INDEX "Submission_userId_createdAt_idx" ON "Submission"("userId", "createdAt");
CREATE INDEX "Submission_gameSessionId_challengeId_idx" ON "Submission"("gameSessionId", "challengeId");
CREATE INDEX "Submission_challengeId_idx" ON "Submission"("challengeId");
CREATE UNIQUE INDEX "Achievement_userId_code_key" ON "Achievement"("userId", "code");
CREATE INDEX "Achievement_userId_unlockedAt_idx" ON "Achievement"("userId", "unlockedAt");
CREATE UNIQUE INDEX "Leaderboard_gameSessionId_key" ON "Leaderboard"("gameSessionId");
CREATE INDEX "Leaderboard_score_createdAt_idx" ON "Leaderboard"("score", "createdAt");
CREATE INDEX "Leaderboard_userId_createdAt_idx" ON "Leaderboard"("userId", "createdAt");
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChallengeVersion" ADD CONSTRAINT "ChallengeVersion_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GameSession" ADD CONSTRAINT "GameSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_gameSessionId_fkey" FOREIGN KEY ("gameSessionId") REFERENCES "GameSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_challengeVersionId_fkey" FOREIGN KEY ("challengeVersionId") REFERENCES "ChallengeVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Achievement" ADD CONSTRAINT "Achievement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Leaderboard" ADD CONSTRAINT "Leaderboard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Leaderboard" ADD CONSTRAINT "Leaderboard_gameSessionId_fkey" FOREIGN KEY ("gameSessionId") REFERENCES "GameSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
