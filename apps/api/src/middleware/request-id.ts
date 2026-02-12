import { randomUUID } from "crypto";
import type { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger.js";

const REQUEST_ID_HEADER = "x-request-id";

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestId = (req.headers[REQUEST_ID_HEADER] as string) || randomUUID();
  res.setHeader(REQUEST_ID_HEADER, requestId);

  // Attach to request for downstream use
  (req as Request & { requestId: string }).requestId = requestId;

  // Log request
  const start = Date.now();
  res.on("finish", () => {
    logger.info({
      requestId,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Date.now() - start,
    }, "Request completed");
  });

  next();
}
