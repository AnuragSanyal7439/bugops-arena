import passport from "passport";
import { Strategy as GitHubStrategy } from "passport-github2";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import type { PrismaClient } from "@prisma/client";
import { authProviders, env } from "../config.js";
import { findOrCreateOAuthUser } from "./oauth.js";

type OAuthProfileValue = { value?: string };
type OAuthDone = (error: Error | null, user?: Express.User) => void;

export function configurePassport(prisma: PrismaClient): typeof passport {
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id },
        select: { id: true, email: true, name: true, avatarUrl: true }
      });
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  if (authProviders.google) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: env.GOOGLE_CLIENT_ID!,
          clientSecret: env.GOOGLE_CLIENT_SECRET!,
          callbackURL: "/auth/google/callback"
        },
        async (
          accessToken: string,
          _refreshToken: string,
          profile: any,
          done: OAuthDone
        ) => {
          try {
            const email = profile.emails?.find((candidate: OAuthProfileValue) => candidate.value)?.value || null;
            const avatarUrl = profile.photos?.find((candidate: OAuthProfileValue) => candidate.value)?.value || null;
            const user = await findOrCreateOAuthUser(prisma, {
              provider: "GOOGLE",
              providerAccountId: profile.id,
              email,
              name: profile.displayName,
              avatarUrl,
              accessToken
            });
            done(null, user);
          } catch (error) {
            done(error as Error);
          }
        }
      )
    );
  }

  if (authProviders.github) {
    passport.use(
      new GitHubStrategy(
        {
          clientID: env.GITHUB_CLIENT_ID!,
          clientSecret: env.GITHUB_CLIENT_SECRET!,
          callbackURL: "/auth/github/callback",
          scope: ["user:email"]
        },
        async (accessToken: string, _refreshToken: string, profile: any, done: OAuthDone) => {
          try {
            const email = profile.emails?.find((candidate: OAuthProfileValue) => candidate.value)?.value || null;
            const avatarUrl = profile.photos?.find((candidate: OAuthProfileValue) => candidate.value)?.value || null;
            const user = await findOrCreateOAuthUser(prisma, {
              provider: "GITHUB",
              providerAccountId: profile.id,
              email,
              name: profile.displayName || profile.username,
              avatarUrl,
              accessToken
            });
            done(null, user);
          } catch (error) {
            done(error as Error);
          }
        }
      )
    );
  }

  return passport;
}
