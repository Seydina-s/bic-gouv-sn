import { spawn } from "node:child_process";

/*
 * Some official sites answer only from abroad (finances.gouv.sn filters by origin,
 * 11/10/2026). Their pages are then read by our own server over its SSH connection:
 * it runs curl for one address and sends the answer back. No port is opened, and
 * only the hosts listed here can be asked for (owner's decision of 12/10/2026).
 */

export interface SshRelayOptions {
  /** "user@host" of our server. */
  host: string;
  /** Private key file of that connection. */
  keyPath: string;
  /** The only hosts the relay may read, over https. */
  allowedHosts: readonly string[];
  /** Runs ssh with these arguments (tests only). */
  run?: (args: readonly string[], signal: AbortSignal | undefined) => Promise<RelayOutput>;
}

export interface RelayOutput {
  /** curl's exit code: 0 once an answer, of any status, came back. */
  code: number;
  body: Buffer;
  /** curl writes the answer's HTTP status there. */
  stderr: string;
}

/** Characters of an address that cannot end a quoted shell word on the server. */
const SAFE_URL = /^[A-Za-z0-9\-._~:/?#[\]@!$&()*+,;=%]+$/;
const SAFE_HEADER = /^[A-Za-z0-9 \-._~:/()+,;=*]+$/;
const FORWARDED_HEADERS = ["user-agent", "accept"];

/** The relayed address, checked: https, an allowed host, nothing a shell would read. */
export function relayedUrl(raw: string, allowedHosts: readonly string[]): string {
  const url = new URL(raw);
  if (url.protocol !== "https:" || !allowedHosts.includes(url.hostname)) {
    throw new Error(`the relay does not read ${url.origin}`);
  }
  if (!SAFE_URL.test(url.href)) {
    throw new Error("the relay refuses an address with unexpected characters");
  }
  return url.href;
}

/** The command run on our server: one https read, no redirection followed. */
export function relayCommand(url: string, headers: Readonly<Record<string, string>>): string {
  const headerArgs = Object.entries(headers)
    .filter(
      ([name, value]) => FORWARDED_HEADERS.includes(name.toLowerCase()) && SAFE_HEADER.test(value),
    )
    .map(([name, value]) => `-H '${name}: ${value}'`);
  // A redirection could lead off the allowed hosts: it is never followed.
  return [
    "curl -sS --max-time 25 --proto =https --max-redirs 0",
    ...headerArgs,
    `-w '%{stderr}%{http_code}' '${url}'`,
  ].join(" ");
}

function runSsh(
  host: string,
  keyPath: string,
): (args: readonly string[], signal: AbortSignal | undefined) => Promise<RelayOutput> {
  return (args, signal) =>
    new Promise((resolve, reject) => {
      const child = spawn(
        "ssh",
        ["-i", keyPath, "-o", "IdentitiesOnly=yes", "-o", "BatchMode=yes", host, ...args],
        { signal, windowsHide: true },
      );
      const body: Buffer[] = [];
      let stderr = "";
      child.stdout.on("data", (chunk: Buffer) => body.push(chunk));
      child.stderr.on("data", (chunk: Buffer) => {
        stderr += chunk.toString("utf8");
      });
      child.on("error", reject);
      child.on("close", (code) => {
        resolve({ code: code ?? 1, body: Buffer.concat(body), stderr });
      });
    });
}

/** A `fetch` that reads the allowed hosts through our server. */
export function createSshRelayFetch({
  host,
  keyPath,
  allowedHosts,
  run = runSsh(host, keyPath),
}: SshRelayOptions): typeof fetch {
  return async (input, init) => {
    const raw = input instanceof Request ? input.url : String(input);
    const url = relayedUrl(raw, allowedHosts);
    const headers = Object.fromEntries(new Headers(init?.headers).entries());
    const output = await run([relayCommand(url, headers)], init?.signal ?? undefined);
    const status = Number(/(\d{3})\s*$/.exec(output.stderr)?.[1] ?? 0);
    if (output.code !== 0 || status < 200) {
      // Like fetch: no answer at all is a failure, any status is an answer.
      throw new TypeError("fetch failed", { cause: output.stderr.trim().slice(0, 200) });
    }
    return new Response(status === 204 || status === 304 ? null : new Uint8Array(output.body), {
      status,
    });
  };
}

/**
 * The relay when RELAY_SSH_HOST and RELAY_SSH_KEY are set (a collector in Senegal),
 * plain fetch otherwise (a server abroad, where the site answers directly).
 */
export function relayFetchFrom(
  env: Readonly<Record<string, string | undefined>>,
  allowedHosts: readonly string[],
): typeof fetch {
  const host = env["RELAY_SSH_HOST"];
  const keyPath = env["RELAY_SSH_KEY"];
  return host === undefined || keyPath === undefined
    ? fetch
    : createSshRelayFetch({ host, keyPath, allowedHosts });
}
