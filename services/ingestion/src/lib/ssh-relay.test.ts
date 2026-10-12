import { describe, expect, it, vi } from "vitest";
import { createSshRelayFetch, relayCommand, relayedUrl } from "./ssh-relay";

const ALLOWED = ["apimfb.finances.gouv.sn"];

describe("relayedUrl", () => {
  it("reads only the allowed hosts, over https, without characters a shell would read", () => {
    expect(relayedUrl("https://apimfb.finances.gouv.sn/article/published?page=1", ALLOWED)).toBe(
      "https://apimfb.finances.gouv.sn/article/published?page=1",
    );
    expect(() => relayedUrl("https://www.presidence.sn/fr/", ALLOWED)).toThrow("does not read");
    expect(() => relayedUrl("http://apimfb.finances.gouv.sn/", ALLOWED)).toThrow("does not read");
    expect(() => relayedUrl("https://apimfb.finances.gouv.sn/a'b", ALLOWED)).toThrow(
      "unexpected characters",
    );
  });
});

describe("relayCommand", () => {
  it("asks for one https read, follows no redirection, forwards only safe headers", () => {
    const command = relayCommand("https://apimfb.finances.gouv.sn/x", {
      "user-agent": "BicGouvSN-ingestion/0.1 (+https://github.com/Seydina-s/bic-gouv-sn)",
      cookie: "secret=1",
      accept: "text/html'; rm -rf /",
    });
    expect(command).toContain("--proto =https --max-redirs 0");
    expect(command).toContain("-H 'user-agent: BicGouvSN-ingestion/0.1");
    expect(command).not.toContain("cookie");
    expect(command).not.toContain("rm -rf");
    expect(command.endsWith("'https://apimfb.finances.gouv.sn/x'")).toBe(true);
  });
});

describe("createSshRelayFetch", () => {
  it("answers with the server's body and status, and fails like fetch without an answer", async () => {
    const run = vi.fn(() =>
      Promise.resolve({ code: 0, body: Buffer.from('{"ok":true}'), stderr: "200" }),
    );
    const relay = createSshRelayFetch({ host: "u@h", keyPath: "k", allowedHosts: ALLOWED, run });
    const response = await relay("https://apimfb.finances.gouv.sn/x");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });

    const missing = createSshRelayFetch({
      host: "u@h",
      keyPath: "k",
      allowedHosts: ALLOWED,
      run: () => Promise.resolve({ code: 0, body: Buffer.from("absent"), stderr: "404" }),
    });
    expect((await missing("https://apimfb.finances.gouv.sn/y")).status).toBe(404);

    const down = createSshRelayFetch({
      host: "u@h",
      keyPath: "k",
      allowedHosts: ALLOWED,
      run: () => Promise.resolve({ code: 28, body: Buffer.alloc(0), stderr: "timed out 000" }),
    });
    await expect(down("https://apimfb.finances.gouv.sn/z")).rejects.toThrow("fetch failed");
    await expect(relay("https://evil.example/")).rejects.toThrow("does not read");
  });
});
