import type { ErrorEvent } from "@sentry/react-native";
import * as Sentry from "@sentry/react-native";
import { initMonitoring, tagWithErrorCode } from "./monitoring";

jest.mock("@sentry/react-native", () => ({ init: jest.fn() }));

const DSN = "https://public@o1.ingest.sentry.io/1";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("initMonitoring", () => {
  it.each([undefined, ""])("stays off without a DSN (%j)", (dsn) => {
    expect(initMonitoring({ dsn, environment: undefined })).toBe(false);
    expect(Sentry.init).not.toHaveBeenCalled();
  });

  it("starts with privacy-safe options when a DSN is set", () => {
    expect(initMonitoring({ dsn: DSN, environment: "production" })).toBe(true);
    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: DSN,
        environment: "production",
        sendDefaultPii: false,
        attachScreenshot: false,
        attachViewHierarchy: false,
        enableAutoSessionTracking: true,
      }),
    );
  });

  it("defaults to the development environment", () => {
    initMonitoring({ dsn: DSN, environment: undefined });
    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({ environment: "development" }),
    );
  });
});

describe("tagWithErrorCode", () => {
  const event = () => ({ type: undefined, tags: { screen: "home" } }) as ErrorEvent;

  it("tags reports carrying a catalog code", () => {
    const hint = { originalException: { code: "RESILIENCE_TIMEOUT" } };
    expect(tagWithErrorCode(event(), hint).tags).toEqual({
      screen: "home",
      "error.code": "RESILIENCE_TIMEOUT",
      "error.catalogued": "true",
    });
  });

  it("leaves other reports untouched", () => {
    expect(tagWithErrorCode(event(), { originalException: new Error("x") }).tags).toEqual({
      screen: "home",
    });
  });
});
