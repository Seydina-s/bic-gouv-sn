import { apiBaseUrl } from "./base-url";

describe("apiBaseUrl", () => {
  it("uses the address the build gives", () => {
    expect(apiBaseUrl("https://api.example.test", "192.168.1.2:8081")).toBe(
      "https://api.example.test",
    );
  });

  it("follows the development computer when the build gives none", () => {
    expect(apiBaseUrl(undefined, "192.168.1.2:8081")).toBe("http://192.168.1.2:3100");
    expect(apiBaseUrl("", "192.168.1.14:8081")).toBe("http://192.168.1.14:3100");
  });

  it("falls back to relative addresses when nothing is known", () => {
    expect(apiBaseUrl(undefined, undefined)).toBe("");
    expect(apiBaseUrl("", "")).toBe("");
  });
});
