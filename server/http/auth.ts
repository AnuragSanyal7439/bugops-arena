import type { NextFunction, Request, Response } from "express";
import { HttpError } from "./errors.js";

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  if (!req.isAuthenticated?.() || !req.user?.id) {
    next(new HttpError(401, "Login is required for this action.", "auth_required"));
    return;
  }

  next();
}

export function currentUserId(req: Request): string {
  if (!req.user?.id) {
    throw new HttpError(401, "Login is required for this action.", "auth_required");
  }

  return req.user.id;
}
