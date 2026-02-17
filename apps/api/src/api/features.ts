import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler, AppError } from "../middleware/error-handler.js";
import { z } from "zod";
import { FeatureActionParams } from "../models/api-schemas.js";
import { taskStatuses } from "../models/task.js";
import * as featureService from "../services/feature.service.js";
import * as initiativeService from "../services/initiative.service.js";
import * as taskService from "../services/task.service.js";
import { enqueueDecomposeFeature } from "../queues/jobs.js";

const TaskStatusParams = z.object({
  id: z.string().uuid(),
  fid: z.string().uuid(),
  tid: z.string().uuid(),
});

const UpdateTaskStatusBody = z.object({
  status: z.enum(taskStatuses),
});

export const featureRouter = Router();

// POST /api/initiatives/:id/features/:fid/decompose
// Starts decomposition for a pending or failed feature
featureRouter.post(
  "/initiatives/:id/features/:fid/decompose",
  authMiddleware,
  validate({ params: FeatureActionParams }),
  asyncHandler(async (req, res) => {
    const id = req.params.id as string;
    const fid = req.params.fid as string;

    const initiative = await initiativeService.getInitiativeById(id);
    if (!initiative) throw new AppError(404, "Initiative not found");

    const metadata = initiative.metadata as Record<string, string> | null;
    if (!metadata?.targetRepo) {
      throw new AppError(400, "La iniciativa no tiene un repositorio configurado.");
    }

    const feature = await featureService.getFeatureById(fid);
    if (!feature || feature.initiative_id !== id) {
      throw new AppError(404, "Feature not found");
    }

    const allowedStatuses = ["pending", "failed"];
    if (!allowedStatuses.includes(feature.status)) {
      throw new AppError(400, `No se puede descomponer desde el estado "${feature.status}"`);
    }

    await initiativeService.updateInitiativeStatus(id, "in_progress");

    await enqueueDecomposeFeature({
      initiativeId: id,
      featureId: fid,
      targetRepo: metadata.targetRepo,
      baseBranch: metadata.baseBranch ?? "main",
    });

    res.json({ message: "Descomposición iniciada" });
  }),
);

// PATCH /api/initiatives/:id/features/:fid/tasks/:tid/status
featureRouter.patch(
  "/initiatives/:id/features/:fid/tasks/:tid/status",
  authMiddleware,
  validate({ params: TaskStatusParams, body: UpdateTaskStatusBody }),
  asyncHandler(async (req, res) => {
    const { id, fid, tid } = req.params as { id: string; fid: string; tid: string };
    const { status } = req.body as { status: string };

    const feature = await featureService.getFeatureById(fid);
    if (!feature || feature.initiative_id !== id) {
      throw new AppError(404, "Feature not found");
    }

    const task = await taskService.getTaskById(tid);
    if (!task || task.feature_id !== fid) {
      throw new AppError(404, "Task not found");
    }

    const updated = await taskService.updateTaskStatus(tid, status as typeof taskStatuses[number]);
    res.json(updated);
  }),
);
