import { initiativePipelineQueue } from "./initiative-pipeline.queue.js";
import { QUEUE } from "../config/constants.js";

// Job type constants
export const JobType = {
  PLAN_INITIATIVE: "PLAN_INITIATIVE",
  DECOMPOSE_FEATURE: "DECOMPOSE_FEATURE",
} as const;

export type JobTypeName = (typeof JobType)[keyof typeof JobType];

// Job data types
export interface PlanInitiativeData {
  type: typeof JobType.PLAN_INITIATIVE;
  initiativeId: string;
  notionPageId?: string;
  targetRepo: string;
  baseBranch: string;
}

export interface DecomposeFeatureData {
  type: typeof JobType.DECOMPOSE_FEATURE;
  initiativeId: string;
  featureId: string;
  targetRepo: string;
  baseBranch: string;
}

export type PipelineJobData =
  | PlanInitiativeData
  | DecomposeFeatureData;

// Enqueue helpers
function enqueue(data: PipelineJobData) {
  const jobId = `${data.type}-${data.initiativeId}-${"featureId" in data ? data.featureId : "na"}-${Date.now()}`;
  return initiativePipelineQueue.add(data.type, data, {
    jobId,
    attempts: QUEUE.DEFAULT_ATTEMPTS,
    backoff: {
      type: QUEUE.BACKOFF.TYPE,
      delay: QUEUE.BACKOFF.DELAY,
    },
  });
}

export function enqueuePlanInitiative(opts: Omit<PlanInitiativeData, "type">) {
  return enqueue({ type: JobType.PLAN_INITIATIVE, ...opts });
}

export function enqueueDecomposeFeature(opts: Omit<DecomposeFeatureData, "type">) {
  return enqueue({ type: JobType.DECOMPOSE_FEATURE, ...opts });
}
