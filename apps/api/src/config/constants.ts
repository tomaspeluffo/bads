export const MODELS = {
  PLANNER: "claude-haiku-4-5-20251001",
  TASK_DECOMPOSER: "claude-haiku-4-5-20251001",
} as const;

export const FALLBACK_MODEL = "claude-haiku-4-5-20251001" as const;

export const AGENT_TIMEOUTS = {
  PLANNER: 120_000,
  TASK_DECOMPOSER: 120_000,
} as const;

export const AGENT_MAX_RETRIES = {
  PLANNER: 2,
  TASK_DECOMPOSER: 2,
} as const;

export const QUEUE = {
  NAME: "initiative-pipeline",
  CONCURRENCY: 3,
  LOCK_DURATION: 15 * 60 * 1000, // 15 min
  DEFAULT_ATTEMPTS: 3,
  BACKOFF: {
    TYPE: "exponential" as const,
    DELAY: 5_000, // 5s base -> 25s -> 125s
  },
} as const;

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

export const REJECTION_FEEDBACK_MIN_LENGTH = 10;

export const MAX_TOKENS = {
  PLANNER: 6144,
  TASK_DECOMPOSER: 8192,
} as const;
