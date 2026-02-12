import { describe, it, expect } from "vitest";
import { getHealthStatus } from "../src/services/health.js";

describe("Health Service", () => {
  it("returns status with components", async () => {
    const result = await getHealthStatus();
    expect(result.status).toBeDefined();
    expect(result.timestamp).toBeDefined();
    expect(result.version).toBe("0.1.0");
    expect(result.uptime).toBeGreaterThanOrEqual(0);
    expect(result.components).toBeDefined();
    expect(result.components.supabase).toBeDefined();
    expect(result.components.redis).toBeDefined();
    expect(result.components.queue).toBeDefined();
  });
});
