import { X509Certificate } from "node:crypto";
import { rootCertificates } from "node:tls";
import { describe, expect, it } from "vitest";
import { signedByTrustedRoot, trustedIntermediate } from "./completed-chain-fetch";

// A root the system trusts: it issued and signed itself.
const ROOT = new X509Certificate(rootCertificates[0] ?? "");

describe("completing a certificate chain", () => {
  it("accepts a certificate only when a trusted root signed it", () => {
    expect(signedByTrustedRoot(ROOT)).toBe(true);
    expect(signedByTrustedRoot(ROOT, [])).toBe(false);
  });

  it("reads the intermediate from the address given, and refuses an unavailable one", async () => {
    const served = (body: Uint8Array | null) =>
      (() =>
        Promise.resolve(
          body === null ? new Response(null, { status: 404 }) : new Response(Buffer.from(body)),
        )) as unknown as typeof fetch;
    await expect(trustedIntermediate("http://ca.example/r.crt", served(ROOT.raw))).resolves.toBe(
      ROOT.toString(),
    );
    await expect(trustedIntermediate("http://ca.example/r.crt", served(null))).rejects.toThrow(
      /unavailable/,
    );
    await expect(
      trustedIntermediate(
        "http://ca.example/r.crt",
        served(new TextEncoder().encode("pas un certificat")),
      ),
    ).rejects.toThrow();
  });
});
