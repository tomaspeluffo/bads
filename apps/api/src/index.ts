import "dotenv/config";
import { env } from "./config/env.js";
import { app } from "./app.js";
import { createPipelineWorker } from "./queues/initiative-pipeline.worker.js";
import { redis } from "./lib/redis.js";
import { logger } from "./lib/logger.js";

const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV }, "API server running");
});

// Start BullMQ worker
const worker = createPipelineWorker();

// Graceful shutdown
let shuttingDown = false;

async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;

  logger.info({ signal }, "Shutting down gracefully");

  // Stop accepting new connections
  server.close(() => {
    logger.info("HTTP server closed");
  });

  // Close worker (waits for active jobs to finish)
  await worker.close();
  logger.info("Worker closed");

  // Close Redis
  await redis.quit();
  logger.info("Redis closed");

  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "Unhandled rejection");
});

process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "Uncaught exception, shutting down");
  shutdown("uncaughtException");
});
