import path from "node:path";
import express from "express";
import session from "express-session";
import helmet from "helmet";
import { env } from "./config.js";
import { prisma } from "./db.js";
import { configurePassport } from "./auth/passport.js";
import { PrismaSessionStore } from "./auth/sessionStore.js";
import { requireSameOrigin } from "./http/security.js";
import { errorHandler, notFound } from "./http/errors.js";
import { authRouter } from "./routes/auth.js";
import { progressRouter } from "./routes/progress.js";
import { gameRouter } from "./routes/game.js";
import { leaderboardRouter } from "./routes/leaderboard.js";
import { aiRouter } from "./routes/ai.js";
import { workspaceRouter } from "./routes/workspace.js";
import { engagementRouter } from "./routes/engagement.js";
import { profileRouter } from "./routes/profile.js";
import { analyticsRouter } from "./routes/analytics.js";

const rootDir = process.cwd();
const publicAssets = new Set([
  "/",
  "/index.html",
  "/style.css",
  "/script.js",
  "/levels.js",
  "/config.js",
  "/manifest.webmanifest",
  "/robots.txt",
  "/logo.svg"
]);

export function createApp(): express.Express {
  const app = express();
  const passport = configurePassport(prisma);

  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          "default-src": ["'self'"],
          "script-src": ["'self'", "'unsafe-inline'"],
          "style-src": ["'self'", "'unsafe-inline'"],
          "img-src": ["'self'", "data:", "https:"],
          "font-src": ["'self'", "data:"],
          "connect-src": ["'self'"],
          "worker-src": ["'self'", "blob:"],
          "object-src": ["'none'"],
          "base-uri": ["'self'"],
          "form-action": ["'self'"]
        }
      },
      crossOriginEmbedderPolicy: false
    })
  );

  app.use(express.json({ limit: "128kb" }));
  app.use(express.urlencoded({ extended: false, limit: "128kb" }));
  app.use(requireSameOrigin);

  app.use(
    session({
      name: "bugops.sid",
      secret: env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      store: new PrismaSessionStore(prisma),
      cookie: {
        httpOnly: true,
        secure: env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 1000 * 60 * 60 * 24 * 7
      }
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  app.get("/api/health", (_req, res) => {
    res.json({ data: { ok: true } });
  });

  app.use(authRouter);
  app.use(progressRouter);
  app.use(gameRouter);
  app.use(leaderboardRouter);
  app.use(aiRouter);
  app.use(workspaceRouter);
  app.use(engagementRouter);
  app.use(profileRouter);
  app.use(analyticsRouter);

  app.use(
    "/vendor/monaco/vs",
    express.static(path.join(rootDir, "node_modules", "monaco-editor", "min", "vs"), {
      immutable: true,
      maxAge: "1y"
    })
  );

  app.get(Array.from(publicAssets), (req, res, next) => {
    const requestedPath = req.path === "/" ? "/index.html" : req.path;
    const filePath = path.join(rootDir, requestedPath);

    if (!filePath.startsWith(rootDir)) {
      next();
      return;
    }

    res.sendFile(filePath);
  });

  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/") || req.path.startsWith("/auth/")) {
      next();
      return;
    }
    res.sendFile(path.join(rootDir, "index.html"));
  });

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
