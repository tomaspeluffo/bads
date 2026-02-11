import type { HealthResponse } from "../models/health.js";

export function getHealthStatus(): HealthResponse {
  return {
    status: "ok",
    timestamp: new Date().toISOString(),
  };
}
