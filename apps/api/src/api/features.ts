import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler, AppError } from "../middleware/error-handler.js";
import { FeatureActionParams, RejectFeatureBody } from "../models/api-schemas.js";
import * as featureService from "../services/feature.service.js";
import * as initiativeService from "../services/initiative.service.js";
import { enqueueMergeFeature, enqueueDevelopFeature } from "../queues/jobs.js";

export const featureRouter = Router();

// POST /api/initiatives/:id/features/:fid/approve
featureRouter.post(
  "/initiatives/:id/features/:fid/approve",
  authMiddleware,
  validate({ params: FeatureActionParams }),
  asyncHandler(async (req, res) => {
    const id = req.params.id as string;
    const fid = req.params.fid as string;

    const initiative = await initiativeService.getInitiativeById(id);
    if (!initiative) throw new AppError(404, "Initiative not found");

    const feature = await featureService.getFeatureById(fid);
    if (!feature || feature.initiative_id !== id) {
      throw new AppError(404, "Feature not found");
    }

    if (feature.status !== "human_review") {
      throw new AppError(400, "Feature is not in human_review status");
    }

    await featureService.updateFeatureStatus(fid, "approved");

    const metadata = initiative.metadata as Record<string, string> | null;
    await enqueueMergeFeature({
      initiativeId: id,
      featureId: fid,
      targetRepo: metadata?.targetRepo ?? "",
      baseBranch: metadata?.baseBranch ?? "main",
    });

    res.json({ message: "Feature approved, merge in progress" });
  }),
);

// POST /api/initiatives/:id/features/:fid/reject
featureRouter.post(
  "/initiatives/:id/features/:fid/reject",
  authMiddleware,
  validate({ params: FeatureActionParams, body: RejectFeatureBody }),
  asyncHandler(async (req, res) => {
    const id = req.params.id as string;
    const fid = req.params.fid as string;
    const { feedback } = req.body as RejectFeatureBody;

    const initiative = await initiativeService.getInitiativeById(id);
    if (!initiative) throw new AppError(404, "Initiative not found");

    const feature = await featureService.getFeatureById(fid);
    if (!feature || feature.initiative_id !== id) {
      throw new AppError(404, "Feature not found");
    }

    if (feature.status !== "human_review") {
      throw new AppError(400, "Feature is not in human_review status");
    }

    await featureService.updateFeatureStatus(fid, "rejected", {
      rejection_feedback: feedback,
    });

    const metadata = initiative.metadata as Record<string, string> | null;
    await enqueueDevelopFeature({
      initiativeId: id,
      featureId: fid,
      targetRepo: metadata?.targetRepo ?? "",
      baseBranch: metadata?.baseBranch ?? "main",
      rejectionFeedback: feedback,
    });

    res.json({ message: "Feature rejected, re-developing with feedback" });
  }),
);
