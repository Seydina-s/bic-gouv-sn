import { X509Certificate } from "node:crypto";
import { request } from "node:https";
import { rootCertificates } from "node:tls";

/*
 * Some official sites send their certificate without the intermediate one (der.sn,
 * 15/10/2026). Browsers complete the chain themselves from the address the
 * certificate gives ("CA Issuers"); Node.js does not, and refuses the site. Here the
 * chain is completed the same way, and only safely: the intermediate is accepted
 * only when a root the system already trusts signed it, then every connection is
 * verified as usual. Nothing is ever accepted unverified (CLAUDE.md §4.5).
 */

/** True when one of `roots` (PEM) issued and signed `certificate`. */
export function signedByTrustedRoot(
  certificate: X509Certificate,
  roots: readonly string[] = rootCertificates,
): boolean {
  return roots.some((pem) => {
    const root = new X509Certificate(pem);
    return certificate.checkIssued(root) && certificate.verify(root.publicKey);
  });
}

/** The intermediate certificate at `url` (DER or PEM), refused unless a trusted root signed it. */
export async function trustedIntermediate(
  url: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const response = await fetchImpl(url, { signal: AbortSignal.timeout(15_000) });
  if (!response.ok) {
    throw new Error(`Intermediate certificate unavailable: ${url} (${String(response.status)})`);
  }
  const certificate = new X509Certificate(Buffer.from(await response.arrayBuffer()));
  if (!signedByTrustedRoot(certificate)) {
    throw new Error(`Intermediate certificate not signed by a trusted root: ${url}`);
  }
  return certificate.toString();
}

/** A GET through https with the trusted roots plus `intermediate`, read whole. */
function get(url: string, init: RequestInit | undefined, ca: string[]): Promise<Response> {
  return new Promise((resolve, reject) => {
    const headers = Object.fromEntries(new Headers(init?.headers).entries());
    const outgoing = request(
      url,
      { method: "GET", headers, ca, signal: init?.signal ?? undefined },
      (incoming) => {
        const chunks: Buffer[] = [];
        incoming.on("data", (chunk: Buffer) => chunks.push(chunk));
        incoming.on("error", reject);
        incoming.on("end", () => {
          const responseHeaders = new Headers();
          for (const [name, value] of Object.entries(incoming.headers)) {
            if (typeof value === "string") {
              responseHeaders.set(name, value);
            }
          }
          resolve(
            new Response(Buffer.concat(chunks), {
              status: incoming.statusCode ?? 502,
              headers: responseHeaders,
            }),
          );
        });
      },
    );
    outgoing.on("error", reject);
    outgoing.end();
  });
}

/**
 * A fetch for one site whose certificate comes without its intermediate: the
 * intermediate is read once from `intermediateUrl` and checked (trustedIntermediate).
 */
export function completedChainFetch(
  intermediateUrl: string,
  fetchImpl: typeof fetch = fetch,
): typeof fetch {
  let ca: Promise<string[]> | null = null;
  return async (input, init) => {
    ca ??= trustedIntermediate(intermediateUrl, fetchImpl).then((pem) => [
      ...rootCertificates,
      pem,
    ]);
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    return get(
      url,
      init,
      await ca.catch((error: unknown) => {
        ca = null;
        throw error;
      }),
    );
  };
}
