import { describe, expect, it } from "vitest";
import { readApiUrl } from "./config";
import { formatClockTime, formatDuration } from "./format";
import { t } from "./i18n";
import { themeCss } from "./theme-css";

describe("formatDuration", () => {
  it.each([
    [-5, "moins d'une minute"],
    [59, "moins d'une minute"],
    [60, "1 min"],
    [3_599, "59 min"],
    [11_520, "3 h 12 min"],
    [86_400, "1 j 0 h"],
    [200_000, "2 j 7 h"],
  ])("%s s → %s", (seconds, expected) => {
    expect(formatDuration(seconds, t)).toBe(expected);
  });
});

describe("formatClockTime", () => {
  it("shows Dakar time", () => {
    expect(formatClockTime(new Date("2026-09-24T14:32:00Z"))).toBe("14:32");
  });
});

describe("readApiUrl", () => {
  it("accepts http(s) URLs and trims trailing slashes", () => {
    expect(readApiUrl({ API_URL: "https://api.bic.test/" })).toBe("https://api.bic.test");
    expect(readApiUrl({ API_URL: "http://localhost:3000" })).toBe("http://localhost:3000");
  });

  it.each([undefined, "", "not a url", "ftp://api.test"])("rejects %s", (value) => {
    expect(readApiUrl({ API_URL: value })).toBeNull();
  });
});

describe("themeCss", () => {
  it("declares both themes and the exact flag colors", () => {
    const css = themeCss();
    expect(css).toContain("--bgs-flag-green:#00853F");
    expect(css).toContain("@media (prefers-color-scheme: dark)");
    expect(css).toContain("--bgs-color-background:#FFFFFF");
  });
});
