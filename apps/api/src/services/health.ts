import type { HealthResponse, ComponentStatus } from "../models/health.js";
import { supabase } from "../lib/supabase.js";
import { redis } from "../lib/redis.js";
import { initiativePipelineQueue } from "../queues/initiative-pipeline.queue.js";

const startTime = Date.now();

async function checkSupabase(): Promise<ComponentStatus> {
  const start = Date.now();
  try {
    const { error } = await supabase.from("initiatives").select("id").limit(1);
    const latencyMs = Date.now() - start;
    if (error) return { status: "degraded", latencyMs, message: error.message };
    return { status: "ok", latencyMs };
  } catch (err) {
    return { status: "down", latencyMs: Date.now() - start, message: (err as Error).message };
  }
}

async function checkRedis(): Promise<ComponentStatus> {
  const start = Date.now();
  try {
    const pong = await redis.ping();
    const latencyMs = Date.now() - start;
    if (pong !== "PONG") return { status: "degraded", latencyMs, message: `Unexpected: ${pong}` };
    return { status: "ok", latencyMs };
  } catch (err) {
    return { status: "down", latencyMs: Date.now() - start, message: (err as Error).message };
  }
}

async function checkQueue() {
  try {
    const [waiting, active, completed, failed] = await Promise.all([
      initiativePipelineQueue.getWaitingCount(),
      initiativePipelineQueue.getActiveCount(),
      initiativePipelineQueue.getCompletedCount(),
      initiativePipelineQueue.getFailedCount(),
    ]);
    return { status: "ok" as const, waiting, active, completed, failed };
  } catch {
    return { status: "down" as const, waiting: 0, active: 0, completed: 0, failed: 0 };
  }
}

export async function getHealthStatus(): Promise<HealthResponse> {
  const [supabaseStatus, redisStatus, queueStatus] = await Promise.all([
    checkSupabase(),
    checkRedis(),
    checkQueue(),
  ]);

  const allOk = supabaseStatus.status === "ok" && redisStatus.status === "ok" && queueStatus.status === "ok";
  const anyDown = supabaseStatus.status === "down" || redisStatus.status === "down" || queueStatus.status === "down";

  return {
    status: anyDown ? "down" : allOk ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    version: "0.1.0",
    uptime: Math.floor((Date.now() - startTime) / 1000),
    components: {
      supabase: supabaseStatus,
      redis: redisStatus,
      queue: queueStatus,
    },
  };
}
