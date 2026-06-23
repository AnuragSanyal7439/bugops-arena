ALTER TABLE "GameSession"
  ADD COLUMN "mode" TEXT NOT NULL DEFAULT 'standard',
  ADD COLUMN "trackId" TEXT,
  ADD COLUMN "engagementKey" TEXT,
  ADD COLUMN "noHintMode" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "bossChallenge" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "GameSession_mode_createdAt_idx" ON "GameSession"("mode", "createdAt");
CREATE INDEX "GameSession_trackId_createdAt_idx" ON "GameSession"("trackId", "createdAt");

CREATE TABLE "AnalyticsEvent" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID,
  "gameSessionId" UUID,
  "eventName" TEXT NOT NULL,
  "properties" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AnalyticsEvent_userId_createdAt_idx" ON "AnalyticsEvent"("userId", "createdAt");
CREATE INDEX "AnalyticsEvent_eventName_createdAt_idx" ON "AnalyticsEvent"("eventName", "createdAt");
CREATE INDEX "AnalyticsEvent_gameSessionId_createdAt_idx" ON "AnalyticsEvent"("gameSessionId", "createdAt");

ALTER TABLE "AnalyticsEvent"
  ADD CONSTRAINT "AnalyticsEvent_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
