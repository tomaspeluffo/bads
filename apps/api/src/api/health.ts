import { Router } from "express";
import { getHealthStatus } from "../services/health.js";

export const healthRouter = Router();

healthRouter.get("/health", async (_req, res) => {
  const data = await getHealthStatus();
  const httpStatus = data.status === "ok" ? 200 : data.status === "degraded" ? 200 : 503;
  res.status(httpStatus).json(data);
});
