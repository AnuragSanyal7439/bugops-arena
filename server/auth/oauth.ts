import crypto from "node:crypto";
import type { PrismaClient, AuthProvider } from "@prisma/client";

export type OAuthUserInput = {
  provider: AuthProvider;
  providerAccountId: string;
  email?: string | null;
  name?: string | null;
  avatarUrl?: string | null;
  accessToken?: string | null;
};

export async function findOrCreateOAuthUser(prisma: PrismaClient, input: OAuthUserInput): Promise<Express.User> {
  const existingAccount = await prisma.account.findUnique({
    where: {
      provider_providerAccountId: {
        provider: input.provider,
        providerAccountId: input.providerAccountId
      }
    },
    include: { user: true }
  });

  if (existingAccount) {
    const user = await prisma.user.update({
      where: { id: existingAccount.userId },
      data: {
        name: input.name || existingAccount.user.name,
        avatarUrl: input.avatarUrl || existingAccount.user.avatarUrl,
        lastLoginAt: new Date(),
        accounts: {
          update: {
            where: { id: existingAccount.id },
            data: {
              email: input.email || existingAccount.email,
              accessTokenHash: hashToken(input.accessToken)
            }
          }
        }
      }
    });
    return toExpressUser(user);
  }

  const userByEmail = input.email
    ? await prisma.user.findUnique({
        where: { email: input.email }
      })
    : null;

  const user = userByEmail
    ? await prisma.user.update({
        where: { id: userByEmail.id },
        data: {
          name: input.name || userByEmail.name,
          avatarUrl: input.avatarUrl || userByEmail.avatarUrl,
          lastLoginAt: new Date(),
          accounts: {
            create: {
              provider: input.provider,
              providerAccountId: input.providerAccountId,
              email: input.email,
              accessTokenHash: hashToken(input.accessToken)
            }
          },
          profile: {
            upsert: {
              create: { displayName: input.name || input.email || "BugOps Player" },
              update: {}
            }
          }
        }
      })
    : await prisma.user.create({
        data: {
          email: input.email || null,
          name: input.name || null,
          avatarUrl: input.avatarUrl || null,
          lastLoginAt: new Date(),
          accounts: {
            create: {
              provider: input.provider,
              providerAccountId: input.providerAccountId,
              email: input.email || null,
              accessTokenHash: hashToken(input.accessToken)
            }
          },
          profile: {
            create: { displayName: input.name || input.email || "BugOps Player" }
          }
        }
      });

  return toExpressUser(user);
}

export function hashToken(token?: string | null): string | null {
  if (!token) return null;
  return crypto.createHash("sha256").update(token).digest("hex");
}

function toExpressUser(user: { id: string; email: string | null; name: string | null; avatarUrl: string | null }): Express.User {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl
  };
}
