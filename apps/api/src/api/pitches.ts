import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler, AppError } from "../middleware/error-handler.js";
import {
  CreatePitchBody,
  PitchIdParams,
  ListPitchesQuery,
} from "../models/api-schemas.js";
import * as pitchService from "../services/pitch.service.js";
import * as clientService from "../services/client.service.js";
import * as initiativeService from "../services/initiative.service.js";
import { enqueueGeneratePitch, enqueuePlanInitiative } from "../queues/jobs.js";
import type { AuthenticatedRequest } from "../types/index.js";

export const pitchRouter = Router();

// POST /api/pitches - Create pitch and enqueue generation
pitchRouter.post(
  "/pitches",
  authMiddleware,
  validate({ body: CreatePitchBody }),
  asyncHandler(async (req, res) => {
    const { title, brief, clientId } = req.body as CreatePitchBody;
    const user = (req as AuthenticatedRequest).user;

    let clientName = "Cliente";
    if (clientId) {
      const client = await clientService.getClientById(clientId);
      if (!client) throw new AppError(404, "Cliente no encontrado");
      clientName = client.name;
    }

    const pitch = await pitchService.createPitch({
      client_id: clientId ?? null,
      title,
      brief,
      client_name: clientName,
      created_by: user.id,
    });

    await enqueueGeneratePitch({ pitchId: pitch.id });

    res.status(201).json(pitch);
  }),
);

// GET /api/pitches - List pitches
pitchRouter.get(
  "/pitches",
  authMiddleware,
  validate({ query: ListPitchesQuery }),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as ListPitchesQuery;
    const result = await pitchService.listPitches({
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      clientId: query.clientId,
    });

    res.json({
      data: result.data,
      total: result.total,
      page: query.page ?? 1,
      limit: query.limit ?? 20,
    });
  }),
);

// GET /api/pitches/:pitchId - Get pitch detail
pitchRouter.get(
  "/pitches/:pitchId",
  authMiddleware,
  validate({ params: PitchIdParams }),
  asyncHandler(async (req, res) => {
    const { pitchId } = req.params as unknown as { pitchId: string };
    const pitch = await pitchService.getPitchById(pitchId);
    if (!pitch) throw new AppError(404, "Pitch no encontrado");

    res.json(pitch);
  }),
);

// DELETE /api/pitches/:pitchId - Delete pitch (not allowed if converted)
pitchRouter.delete(
  "/pitches/:pitchId",
  authMiddleware,
  validate({ params: PitchIdParams }),
  asyncHandler(async (req, res) => {
    const { pitchId } = req.params as unknown as { pitchId: string };
    const pitch = await pitchService.getPitchById(pitchId);
    if (!pitch) throw new AppError(404, "Pitch no encontrado");

    if (pitch.status === "converted") {
      throw new AppError(400, "No se puede eliminar un pitch ya convertido en iniciativa");
    }

    await pitchService.deletePitch(pitchId);
    res.json({ message: "Pitch eliminado" });
  }),
);

// POST /api/pitches/:pitchId/to-initiative - Convert pitch to initiative
pitchRouter.post(
  "/pitches/:pitchId/to-initiative",
  authMiddleware,
  validate({ params: PitchIdParams }),
  asyncHandler(async (req, res) => {
    const { pitchId } = req.params as unknown as { pitchId: string };
    const user = (req as AuthenticatedRequest).user;

    const pitch = await pitchService.getPitchById(pitchId);
    if (!pitch) throw new AppError(404, "Pitch no encontrado");

    if (pitch.status !== "ready") {
      throw new AppError(400, `El pitch debe estar en estado "ready" para convertirlo. Estado actual: "${pitch.status}"`);
    }

    const content = pitch.content!;

    // Map pitch content to initiative raw_content structure
    const rawContent = {
      title: pitch.title,
      url: null,
      problem: content.problema,
      solutionSketch: content.solucion,
      noGos: [],
      risks: content.riesgos,
      successCriteria: content.metricas_de_exito.join("\n"),
      techStack: content.enfoque_tecnico,
      additionalNotes: [
        content.executive_summary,
        content.entregables.length > 0 ? `Entregables:\n${content.entregables.map((e) => `- ${e}`).join("\n")}` : "",
        content.proximos_pasos.length > 0 ? `Próximos pasos:\n${content.proximos_pasos.map((p) => `- ${p}`).join("\n")}` : "",
      ].filter(Boolean).join("\n\n"),
      rawBlocks: [],
      attachments: [],
    };

    const initiative = await initiativeService.createInitiative({
      notion_page_id: `pitch-${pitchId}`,
      title: pitch.title,
      raw_content: rawContent,
      status: "pending",
      started_by: user.id,
      client_id: pitch.client_id ?? null,
      metadata: { targetRepo: null, baseBranch: "main" },
    });

    await pitchService.convertPitchToInitiative(pitchId, initiative.id);

    await enqueuePlanInitiative({
      initiativeId: initiative.id,
      targetRepo: "",
      baseBranch: "main",
    });

    res.json({ initiativeId: initiative.id });
  }),
);
