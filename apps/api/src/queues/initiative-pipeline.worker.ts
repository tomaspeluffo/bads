import { Worker, Job } from "bullmq";
import { createRedisConnection } from "./connection.js";
import { QUEUE } from "../config/constants.js";
import {
  JobType,
  type PipelineJobData,
  type PlanInitiativeData,
  type DecomposeFeatureData,
  type DevelopFeatureData,
  type QAReviewData,
  type NotifyHumanData,
  type MergeFeatureData,
  type CompleteInitiativeData,
} from "./jobs.js";
import { createChildLogger } from "../lib/logger.js";
import * as initiativeService from "../services/initiative.service.js";
import { handlePlanInitiative } from "./handlers/plan-initiative.js";
import { handleDecomposeFeature } from "./handlers/decompose-feature.js";
import { handleDevelopFeature } from "./handlers/develop-feature.js";
import { handleQAReview } from "./handlers/qa-review.js";
import { handleNotifyHuman } from "./handlers/notify-human.js";
import { handleMergeFeature } from "./handlers/merge-feature.js";
import { handleCompleteInitiative } from "./handlers/complete-initiative.js";

const log = createChildLogger({ module: "pipeline-worker" });

async function processJob(job: Job<PipelineJobData>): Promise<void> {
  const { data } = job;
  log.info({ jobType: data.type, jobId: job.id, initiativeId: data.initiativeId }, "Processing job");

  switch (data.type) {
    case JobType.PLAN_INITIATIVE:
      await handlePlanInitiative(data as PlanInitiativeData);
      break;
    case JobType.DECOMPOSE_FEATURE:
      await handleDecomposeFeature(data as DecomposeFeatureData);
      break;
    case JobType.DEVELOP_FEATURE:
      await handleDevelopFeature(data as DevelopFeatureData);
      break;
    case JobType.QA_REVIEW:
      await handleQAReview(data as QAReviewData);
      break;
    case JobType.NOTIFY_HUMAN:
      await handleNotifyHuman(data as NotifyHumanData);
      break;
    case JobType.MERGE_FEATURE:
      await handleMergeFeature(data as MergeFeatureData);
      break;
    case JobType.COMPLETE_INITIATIVE:
      await handleCompleteInitiative(data as CompleteInitiativeData);
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
  });

  worker.on("failed", async (job, err) => {
    log.error(
      { jobId: job?.id, jobType: job?.data.type, err },
      "Job failed",
    );

    // On final failure, ensure initiative status is set to "failed"
    if (job && job.attemptsMade >= (job.opts.attempts ?? 1)) {
      const { data } = job;
      try {
        await initiativeService.updateInitiativeStatus(
          data.initiativeId,
          "failed",
          err instanceof Error ? err.message : "Unknown error",
        );
        log.info({ initiativeId: data.initiativeId, jobType: data.type }, "Initiative marked as failed after all retries exhausted");
      } catch (updateErr) {
        log.error({ updateErr, initiativeId: data.initiativeId }, "Failed to update initiative status to failed");
      }
    }
  });

  worker.on("error", (err) => {
    log.error({ err }, "Worker error");
  });

  log.info("Pipeline worker started");
  return worker;
}
