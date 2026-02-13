export const MODELS = {
  PLANNER: "claude-sonnet-4-5-20250929",
  TASK_DECOMPOSER: "claude-sonnet-4-5-20250929",
  DEVELOPER: "claude-sonnet-4-5-20250929",
  QA: "claude-sonnet-4-5-20250929",
} as const;

export const FALLBACK_MODEL = "claude-sonnet-4-20250514" as const;

export const AGENT_TIMEOUTS = {
  PLANNER: 120_000,
  TASK_DECOMPOSER: 90_000,
  DEVELOPER: 300_000,
  QA: 120_000,
} as const;

export const AGENT_MAX_RETRIES = {
  PLANNER: 2,
  TASK_DECOMPOSER: 2,
  DEVELOPER: 2,
  QA: 2,
} as const;

export const QA_MAX_REJECTION_RETRIES = 2;

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
  PLANNER: 16384,
  TASK_DECOMPOSER: 4096,
  DEVELOPER: 8192,
  QA: 4096,
} as const;
