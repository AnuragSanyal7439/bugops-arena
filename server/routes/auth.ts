import { Router } from "express";
import passport from "passport";
import { authProviders } from "../config.js";
import { asyncHandler, HttpError } from "../http/errors.js";
import { requireAuth } from "../http/auth.js";

export const authRouter = Router();

authRouter.get("/api/auth/providers", (_req, res) => {
  res.json({ data: authProviders });
});

authRouter.get("/api/auth/me", (req, res) => {
  res.json({
    data: {
      authenticated: Boolean(req.isAuthenticated?.() && req.user),
      user: req.user || null
    }
  });
});

authRouter.post(
  "/api/auth/logout",
  requireAuth,
  asyncHandler(async (req, res) => {
    await new Promise<void>((resolve, reject) => {
      req.logout((error) => {
        if (error) reject(error);
        else resolve();
      });
    });

    req.session.destroy((error) => {
      if (error) throw error;
      res.clearCookie("bugops.sid");
      res.json({ data: { ok: true } });
    });
  })
);

authRouter.get("/auth/google", (req, res, next) => {
  if (!authProviders.google) {
    next(new HttpError(503, "Google login is not configured.", "provider_unavailable"));
    return;
  }
  passport.authenticate("google", { scope: ["profile", "email"] })(req, res, next);
});

authRouter.get(
  "/auth/google/callback",
  (req, res, next) => {
    if (!authProviders.google) {
      next(new HttpError(503, "Google login is not configured.", "provider_unavailable"));
      return;
    }
    passport.authenticate("google", {
      failureRedirect: "/?auth=failed",
      successRedirect: "/?auth=success"
    })(req, res, next);
  }
);

authRouter.get("/auth/github", (req, res, next) => {
  if (!authProviders.github) {
    next(new HttpError(503, "GitHub login is not configured.", "provider_unavailable"));
    return;
  }
  passport.authenticate("github", { scope: ["user:email"] })(req, res, next);
});

authRouter.get(
  "/auth/github/callback",
  (req, res, next) => {
    if (!authProviders.github) {
      next(new HttpError(503, "GitHub login is not configured.", "provider_unavailable"));
      return;
    }
    passport.authenticate("github", {
      failureRedirect: "/?auth=failed",
      successRedirect: "/?auth=success"
    })(req, res, next);
  }
);
