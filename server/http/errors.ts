import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code = "request_error"
  ) {
    super(message);
  }
}

export function notFound(_req: Request, _res: Response, next: NextFunction): void {
  next(new HttpError(404, "Route not found.", "not_found"));
}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (error instanceof ZodError) {
    res.status(400).json({
      error: {
        code: "validation_error",
        message: "Invalid request payload.",
        details: error.flatten()
      }
    });
    return;
  }

  if (error instanceof HttpError) {
    res.status(error.status).json({
      error: {
        code: error.code,
        message: error.message
      }
    });
    return;
  }

  console.error(error);
  res.status(500).json({
    error: {
      code: "internal_error",
      message: "Unexpected server error."
    }
  });
}

export function asyncHandler<T>(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<T>
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    handler(req, res, next).catch(next);
  };
}
