import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { PrismaClient } from "@prisma/client";
import { toDifficultyEnum } from "../server/game/rules.js";

const prisma = new PrismaClient();

type SeedChallenge = {
  id: number;
  title: string;
  language: string;
  difficulty: string;
  topic: string;
  buggyCode: string;
  correctFix: string;
  hint: string;
  explanation: string;
};

async function main(): Promise<void> {
  const challenges = loadChallenges();

  for (const challenge of challenges) {
    await prisma.challenge.upsert({
      where: { id: challenge.id },
      create: {
        id: challenge.id,
        title: challenge.title,
        language: challenge.language,
        difficulty: toDifficultyEnum(challenge.difficulty),
        topic: challenge.topic,
        versions: {
          create: {
            version: 1,
            buggyCode: challenge.buggyCode,
            correctFix: challenge.correctFix,
            hint: challenge.hint,
            explanation: challenge.explanation,
            isActive: true
          }
        }
      },
      update: {
        title: challenge.title,
        language: challenge.language,
        difficulty: toDifficultyEnum(challenge.difficulty),
        topic: challenge.topic,
        versions: {
          upsert: {
            where: {
              challengeId_version: {
                challengeId: challenge.id,
                version: 1
              }
            },
            create: {
              version: 1,
              buggyCode: challenge.buggyCode,
              correctFix: challenge.correctFix,
              hint: challenge.hint,
              explanation: challenge.explanation,
              isActive: true
            },
            update: {
              buggyCode: challenge.buggyCode,
              correctFix: challenge.correctFix,
              hint: challenge.hint,
              explanation: challenge.explanation,
              isActive: true
            }
          }
        }
      }
    });
  }

  console.log(`Seeded ${challenges.length} challenges.`);
}

function loadChallenges(): SeedChallenge[] {
  const filePath = path.resolve(process.cwd(), "levels.js");
  const source = fs.readFileSync(filePath, "utf8");
  const sandbox = {
    window: {} as { challenges?: SeedChallenge[] },
    console
  };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: "levels.js" });

  if (!Array.isArray(sandbox.window.challenges)) {
    throw new Error("levels.js did not expose window.challenges.");
  }

  return sandbox.window.challenges;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
