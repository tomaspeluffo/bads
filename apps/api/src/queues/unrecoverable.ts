import { UnrecoverableError } from "bullmq";

/**
 * Returns true for errors that will never succeed on retry:
 * auth failures (401/403), resource not found (404), missing local data.
 * Transient errors like network timeouts, 429 rate-limits, or 5xx are
 * left to BullMQ's normal exponential-backoff retry logic.
 */
export function isUnrecoverable(err: unknown): boolean {
  if (!(err instanceof Error)) return false;

  const withStatus = err as { status?: number; code?: string };

  // HTTP 4xx auth / not-found (but not 429 rate-limit — that may clear up)
  if (withStatus.status === 401 || withStatus.status === 403 || withStatus.status === 404) {
    return true;
  }

  // Notion-specific error codes
  if (withStatus.code === "unauthorized" || withStatus.code === "object_not_found") {
    return true;
  }

  // Missing local data — these won't change between retries
  const msg = err.message.toLowerCase();
  if (msg.includes("has no raw_content") || msg.includes("not found")) {
    return true;
  }

  return false;
}

/**
 * Wraps an error in UnrecoverableError if it should not be retried,
 * otherwise re-throws the original error.
 */
export function throwMaybeUnrecoverable(err: unknown): never {
  const message = err instanceof Error ? err.message : "Unknown error";
  if (isUnrecoverable(err)) {
    throw new UnrecoverableError(message);
  }
  throw err as Error;
}
