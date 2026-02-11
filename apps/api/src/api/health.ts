import { Router } from "express";
import { getHealthStatus } from "../services/health.js";

export const healthRouter = Router();

healthRouter.get("/health", (_req, res) => {
  const data = getHealthStatus();
  res.json(data);
});
