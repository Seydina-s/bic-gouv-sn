import { describe, expect, it } from "vitest";
import { apiErrorSchema } from "./api-error.schema";
import { healthResponseSchema } from "./health.schema";

describe("healthResponseSchema", () => {
  const health = {
    status: "ok",
    version: "0.0.0",
    uptimeSeconds: 1.5,
    checkedAt: "2026-09-24T10:00:00Z",
  };

  it("accepts a healthy response", () => {
    expect(healthResponseSchema.safeParse(health).success).toBe(true);
  });

  it("rejects negative uptime and unknown statuses", () => {
    expect(healthResponseSchema.safeParse({ ...health, uptimeSeconds: -1 }).success).toBe(false);
    expect(healthResponseSchema.safeParse({ ...health, status: "degraded" }).success).toBe(false);
  });
});

describe("apiErrorSchema", () => {
  it("requires an UPPER_SNAKE_CASE code", () => {
    const error = { code: "ROUTE_NOT_FOUND", message: "Not found", requestId: "req-1" };
    expect(apiErrorSchema.safeParse(error).success).toBe(true);
    expect(apiErrorSchema.safeParse({ ...error, code: "not-found" }).success).toBe(false);
  });
});
