import { Worker, Job } from "bullmq";
import { createRedisConnection } from "./connection.js";
import { QUEUE } from "../config/constants.js";
import {
  JobType,
  type PipelineJobData,
  type PlanInitiativeData,
  type DecomposeFeatureData,
  type GeneratePitchData,
} from "./jobs.js";
import { createChildLogger } from "../lib/logger.js";
import * as initiativeService from "../services/initiative.service.js";
import * as pitchService from "../services/pitch.service.js";
import { handlePlanInitiative } from "./handlers/plan-initiative.js";
import { handleDecomposeFeature } from "./handlers/decompose-feature.js";
import { handleGeneratePitch } from "./handlers/generate-pitch.js";

const log = createChildLogger({ module: "pipeline-worker" });

async function processJob(job: Job<PipelineJobData>): Promise<void> {
  const { data } = job;
  const jobMeta = data.type === JobType.GENERATE_PITCH
    ? { jobType: data.type, jobId: job.id, pitchId: data.pitchId }
    : { jobType: data.type, jobId: job.id, initiativeId: (data as PlanInitiativeData).initiativeId };
  log.info(jobMeta, "Processing job");

  switch (data.type) {
    case JobType.PLAN_INITIATIVE:
      await handlePlanInitiative(data as PlanInitiativeData);
      break;
    case JobType.DECOMPOSE_FEATURE:
      await handleDecomposeFeature(data as DecomposeFeatureData);
      break;
    case JobType.GENERATE_PITCH:
      await handleGeneratePitch(data as GeneratePitchData);
      break;
    default:
      log.error({ data }, "Unknown job type");
  }

  log.info({ jobType: data.type, jobId: job.id }, "Job completed");
}

export function createPipelineWorker() {
  const worker = new Worker<PipelineJobData>(QUEUE.NAME, processJob, {
    connection: createRedisConnection(),
    concurrency: QUEUE.CONCURRENCY,
    lockDuration: QUEUE.LOCK_DURATION,
    stalledInterval: 5 * 60 * 1000, // Check for stalled jobs every 5 min (default 30s is too aggressive for AI calls)
    maxStalledCount: 3, // Allow up to 3 stall detections before marking as failed
  });

  worker.on("failed", async (job, err) => {
    log.error(
      { jobId: job?.id, jobType: job?.data.type, err },
      "Job failed",
    );

    // Mark entity as failed on final retry or unrecoverable errors (e.g. stalled jobs)
    const isFinalAttempt = job && job.attemptsMade >= (job.opts.attempts ?? 1);
    const isUnrecoverable = err?.name === "UnrecoverableError";
    if (job && (isFinalAttempt || isUnrecoverable)) {
      const { data } = job;
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      try {
        if (data.type === JobType.GENERATE_PITCH) {
          await pitchService.updatePitchStatus(data.pitchId, "failed", errorMsg);
          log.info({ pitchId: data.pitchId, jobType: data.type }, "Pitch marked as failed after all retries exhausted");
        } else {
          await initiativeService.updateInitiativeStatus(
            (data as PlanInitiativeData).initiativeId,
            "failed",
            errorMsg,
          );
          log.info({ initiativeId: (data as PlanInitiativeData).initiativeId, jobType: data.type }, "Initiative marked as failed after all retries exhausted");
        }
      } catch (updateErr) {
        log.error({ updateErr, jobType: data.type }, "Failed to update entity status to failed");
      }
    }
  });

  worker.on("error", (err) => {
    log.error({ err }, "Worker error");
  });

  log.info("Pipeline worker started");
  return worker;
}
