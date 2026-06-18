import type { NextFunction, Request, Response } from "express";
import { env } from "../config.js";
import { HttpError } from "./errors.js";

const unsafeMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function requireSameOrigin(req: Request, _res: Response, next: NextFunction): void {
  if (!unsafeMethods.has(req.method)) {
    next();
    return;
  }

  const origin = req.get("origin");
  if (!origin) {
    next();
    return;
  }

  if (origin !== env.APP_ORIGIN) {
    next(new HttpError(403, "Cross-origin state-changing requests are not allowed.", "origin_forbidden"));
    return;
  }

  next();
}
