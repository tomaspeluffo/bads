import { Queue } from "bullmq";
import { createRedisConnection } from "./connection.js";
import { QUEUE } from "../config/constants.js";
import type { PipelineJobData } from "./jobs.js";

export const initiativePipelineQueue = new Queue<PipelineJobData>(QUEUE.NAME, {
  connection: createRedisConnection(),
  defaultJobOptions: {
    attempts: QUEUE.DEFAULT_ATTEMPTS,
    backoff: {
      type: QUEUE.BACKOFF.TYPE,
      delay: QUEUE.BACKOFF.DELAY,
    },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  },
});
