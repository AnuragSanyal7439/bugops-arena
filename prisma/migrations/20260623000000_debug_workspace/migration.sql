ALTER TABLE "ChallengeVersion"
  ADD COLUMN "hints" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "testCases" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "rootCause" TEXT NOT NULL DEFAULT '';

ALTER TABLE "Submission"
  ADD COLUMN "testResults" JSONB,
  ADD COLUMN "consoleOutput" TEXT,
  ADD COLUMN "compilerOutput" TEXT;
