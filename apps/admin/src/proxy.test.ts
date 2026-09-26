import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { proxy } from "./proxy";

describe("console proxy", () => {
  it("sends visitors without a session to the sign-in page", () => {
    const response = proxy(new NextRequest("https://admin.test/demarches"));
    expect(response.headers.get("location")).toBe("https://admin.test/connexion");
  });

  it("lets a request with a session cookie through (the page then verifies it)", () => {
    const request = new NextRequest("https://admin.test/demarches", {
      headers: { cookie: "bgs_admin_session=abc" },
    });
    expect(proxy(request).headers.get("location")).toBeNull();
  });
});
