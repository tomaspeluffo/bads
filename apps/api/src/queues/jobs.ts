import { initiativePipelineQueue } from "./initiative-pipeline.queue.js";
import { QUEUE } from "../config/constants.js";

// Job type constants
export const JobType = {
  PLAN_INITIATIVE: "PLAN_INITIATIVE",
  DECOMPOSE_FEATURE: "DECOMPOSE_FEATURE",
  DEVELOP_FEATURE: "DEVELOP_FEATURE",
  QA_REVIEW: "QA_REVIEW",
  NOTIFY_HUMAN: "NOTIFY_HUMAN",
  MERGE_FEATURE: "MERGE_FEATURE",
  COMPLETE_INITIATIVE: "COMPLETE_INITIATIVE",
} as const;

export type JobTypeName = (typeof JobType)[keyof typeof JobType];

// Job data types
export interface PlanInitiativeData {
  type: typeof JobType.PLAN_INITIATIVE;
  initiativeId: string;
  notionPageId: string;
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

export interface DevelopFeatureData {
  type: typeof JobType.DEVELOP_FEATURE;
  initiativeId: string;
  featureId: string;
  targetRepo: string;
  baseBranch: string;
  rejectionFeedback?: string;
}

export interface QAReviewData {
  type: typeof JobType.QA_REVIEW;
  initiativeId: string;
  featureId: string;
  targetRepo: string;
  baseBranch: string;
}

export interface NotifyHumanData {
  type: typeof JobType.NOTIFY_HUMAN;
  initiativeId: string;
  featureId: string;
  prUrl: string;
}

export interface MergeFeatureData {
  type: typeof JobType.MERGE_FEATURE;
  initiativeId: string;
  featureId: string;
  targetRepo: string;
  baseBranch: string;
}

export interface CompleteInitiativeData {
  type: typeof JobType.COMPLETE_INITIATIVE;
  initiativeId: string;
  targetRepo: string;
  baseBranch: string;
}

export type PipelineJobData =
  | PlanInitiativeData
  | DecomposeFeatureData
  | DevelopFeatureData
  | QAReviewData
  | NotifyHumanData
  | MergeFeatureData
  | CompleteInitiativeData;

// Enqueue helpers
function enqueue(data: PipelineJobData) {
  const jobId = `${data.type}-${data.initiativeId}-${"featureId" in data ? data.featureId : "na"}-${Date.now()}`;
  return initiativePipelineQueue.add(data.type, data, {
    jobId,
  });
}

export function enqueuePlanInitiative(opts: Omit<PlanInitiativeData, "type">) {
  return enqueue({ type: JobType.PLAN_INITIATIVE, ...opts });
}

export function enqueueDecomposeFeature(opts: Omit<DecomposeFeatureData, "type">) {
  return enqueue({ type: JobType.DECOMPOSE_FEATURE, ...opts });
}

export function enqueueDevelopFeature(opts: Omit<DevelopFeatureData, "type">) {
  return enqueue({ type: JobType.DEVELOP_FEATURE, ...opts });
}

export function enqueueQAReview(opts: Omit<QAReviewData, "type">) {
  return enqueue({ type: JobType.QA_REVIEW, ...opts });
}

export function enqueueNotifyHuman(opts: Omit<NotifyHumanData, "type">) {
  return enqueue({ type: JobType.NOTIFY_HUMAN, ...opts });
}

export function enqueueMergeFeature(opts: Omit<MergeFeatureData, "type">) {
  return enqueue({ type: JobType.MERGE_FEATURE, ...opts });
}

export function enqueueCompleteInitiative(opts: Omit<CompleteInitiativeData, "type">) {
  return enqueue({ type: JobType.COMPLETE_INITIATIVE, ...opts });
}
