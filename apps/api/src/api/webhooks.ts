import { Router } from "express";
import { logger } from "../lib/logger.js";

export const webhookRouter = Router();

// POST /api/webhooks/notion - Stub for Notion webhook
webhookRouter.post("/webhooks/notion", (req, res) => {
  logger.info({ body: req.body }, "Notion webhook received (stub)");
  res.json({ ok: true });
});
