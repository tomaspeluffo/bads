import { describe, it, expect } from "vitest";
import { getHealthStatus } from "../src/services/health.js";

describe("Health Service", () => {
  it("returns ok status", () => {
    const result = getHealthStatus();
    expect(result.status).toBe("ok");
    expect(result.timestamp).toBeDefined();
  });
});
