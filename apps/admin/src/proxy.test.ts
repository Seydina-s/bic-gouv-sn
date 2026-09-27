import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { contentSecurityPolicy, proxy } from "./proxy";

const signedIn = (path: string) =>
  new NextRequest(`https://admin.test${path}`, { headers: { cookie: "bgs_admin_session=abc" } });

function scriptSources(policy: string | null): string {
  return policy?.split("; ").find((part) => part.startsWith("script-src")) ?? "";
}

describe("console proxy", () => {
  it("sends visitors without a session to the sign-in page", () => {
    const response = proxy(new NextRequest("https://admin.test/demarches"));
    expect(response.headers.get("location")).toBe("https://admin.test/connexion");
  });

  it("lets a request with a session cookie through (the page then verifies it)", () => {
    expect(proxy(signedIn("/demarches")).headers.get("location")).toBeNull();
  });

  it("allows only the scripts carrying this request's nonce, a new one each time", () => {
    const first = proxy(signedIn("/services")).headers.get("Content-Security-Policy");
    const second = proxy(signedIn("/services")).headers.get("Content-Security-Policy");
    const scripts = scriptSources(first);
    expect(scripts).toMatch(/'nonce-[A-Za-z0-9+/=]{20,}' 'strict-dynamic'/);
    expect(scripts).not.toContain("'unsafe-inline'");
    expect(first).toContain("frame-ancestors 'none'");
    expect(second).not.toEqual(first);
  });

  it("gives the sign-in page its policy, without asking for a session", () => {
    const response = proxy(new NextRequest("https://admin.test/connexion"));
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("Content-Security-Policy")).toContain("'nonce-");
  });

  it("allows eval on the local development server only", () => {
    expect(scriptSources(contentSecurityPolicy("abc", true))).toContain("'unsafe-eval'");
    expect(scriptSources(contentSecurityPolicy("abc", false))).not.toContain("'unsafe-eval'");
  });
});
