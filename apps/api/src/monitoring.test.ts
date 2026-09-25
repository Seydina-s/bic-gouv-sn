import type { ErrorEvent, EventHint } from "@sentry/node";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "./app";
import { loadConfig } from "./config";
import { temporaryStore } from "./testing/store";
import { initMonitoring, tagWithErrorCode } from "./monitoring";

const sentry = vi.hoisted(() => ({
  init: vi.fn(),
  isInitialized: vi.fn(() => false),
  setupFastifyErrorHandler: vi.fn(),
}));
vi.mock("@sentry/node", () => sentry);

const DSN = "https://public@o1.ingest.sentry.io/1";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("initMonitoring", () => {
  it("stays off without a DSN", () => {
    expect(initMonitoring(loadConfig({}), "1.0.0")).toBe(false);
    expect(sentry.init).not.toHaveBeenCalled();
  });

  it("starts with privacy-safe options when a DSN is set", () => {
    expect(initMonitoring(loadConfig({ SENTRY_DSN: DSN, NODE_ENV: "production" }), "1.0.0")).toBe(
      true,
    );
    expect(sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: DSN,
        environment: "production",
        release: "bic-gouv-sn-api@1.0.0",
        sendDefaultPii: false,
        tracesSampleRate: 0.02,
      }),
    );
  });

  it("rejects a non-HTTPS DSN", () => {
    expect(() => loadConfig({ SENTRY_DSN: "http://public@example.test/1" })).toThrow(/SENTRY_DSN/);
  });
});

describe("tagWithErrorCode", () => {
  const event = () => ({ type: undefined, tags: { existing: "yes" } }) as ErrorEvent;

  it("tags reports with the catalog code", () => {
    const hint: EventHint = { originalException: { code: "INTERNAL_ERROR" } };
    expect(tagWithErrorCode(event(), hint).tags).toEqual({
      existing: "yes",
      "error.code": "INTERNAL_ERROR",
      "error.catalogued": "true",
    });
  });

  it("flags codes missing from the catalog", () => {
    const hint: EventHint = { originalException: { code: "NEW_THING" } };
    expect(tagWithErrorCode(event(), hint).tags?.["error.catalogued"]).toBe("false");
  });

  it("leaves reports without a code untouched", () => {
    expect(tagWithErrorCode(event(), { originalException: new Error("x") }).tags).toEqual({
      existing: "yes",
    });
  });
});

describe("buildApp error reporting", () => {
  const config = loadConfig({ LOG_LEVEL: "silent" });

  it("hooks Sentry into Fastify only when monitoring is on", async () => {
    const off = await buildApp({ config, version: "1.0.0", articles: temporaryStore() });
    expect(sentry.setupFastifyErrorHandler).not.toHaveBeenCalled();
    await off.close();

    sentry.isInitialized.mockReturnValueOnce(true);
    const on = await buildApp({ config, version: "1.0.0", articles: temporaryStore() });
    expect(sentry.setupFastifyErrorHandler).toHaveBeenCalledWith(on);
    await on.close();
  });
});
