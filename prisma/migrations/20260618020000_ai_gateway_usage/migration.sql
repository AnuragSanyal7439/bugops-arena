CREATE TYPE "AiRequestKind" AS ENUM ('HINT', 'EXPLANATION');

CREATE TABLE "AiUsageEvent" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "gameSessionId" UUID,
  "kind" "AiRequestKind" NOT NULL,
  "provider" TEXT NOT NULL,
  "usedFallback" BOOLEAN NOT NULL DEFAULT false,
  "success" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiUsageEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AiUsageEvent_userId_createdAt_idx" ON "AiUsageEvent"("userId", "createdAt");
CREATE INDEX "AiUsageEvent_gameSessionId_createdAt_idx" ON "AiUsageEvent"("gameSessionId", "createdAt");

ALTER TABLE "AiUsageEvent" ADD CONSTRAINT "AiUsageEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
