// A gate in front of the local API for remote testers (through a tunnel, ngrok):
// only what the app itself calls goes through; the console, the API documentation,
// the status pages and everything else answer 404. Usage:
//   node scripts/public-gate.mjs [listen port] [api port] [media folder]
import { createReadStream, statSync } from "node:fs";
import http from "node:http";
import { extname, join, normalize, sep } from "node:path";

const [listenPort = "3200", apiPort = "3100", mediaRoot = "C:/bic-gouv-sn/.data/media"] =
  process.argv.slice(2);

/**
 * With MEDIA_BASE_URL set, the API leaves /media to the CDN: here the gate plays
 * that part, read-only, from the media folder, never outside it.
 */
const TYPES = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".png": "image/png",
  ".pdf": "application/pdf",
};

function serveMedia(path, response) {
  const root = normalize(mediaRoot);
  const file = normalize(join(root, decodeURIComponent(path.slice("/media/".length))));
  const type = TYPES[extname(file).toLowerCase()];
  try {
    if (!file.startsWith(root + sep) || type === undefined || !statSync(file).isFile()) {
      throw new Error("not served");
    }
    response.writeHead(200, {
      "content-type": type,
      "cache-control": "public, max-age=86400",
      "x-content-type-options": "nosniff",
    });
    createReadStream(file).pipe(response);
  } catch {
    response.writeHead(404, { "content-type": "application/json" });
    response.end('{"error":"NOT_FOUND"}');
  }
}

/** Method and path prefix the app uses (apps/mobile/src). */
const ALLOWED = [
  ["GET", "/v1/health"],
  ["GET", "/v1/news"],
  ["GET", "/v1/procedures"],
  ["GET", "/v1/services"],
  ["GET", "/v1/map/"],
  ["GET", "/v1/opportunities"],
  ["GET", "/v1/remote-config"],
  ["GET", "/media/"],
  ["POST", "/v1/stats"],
  ["POST", "/v1/participation/messages"],
  ["POST", "/v1/participation/reports"],
  ["PUT", "/v1/push/subscription"],
  ["DELETE", "/v1/push/subscription"],
];

function allowed(method, url) {
  const path = url.split("?")[0] ?? "";
  // No way around the list with "..", encoded slashes or doubled slashes.
  if (path.includes("..") || /%2f|%5c|\/\//i.test(path)) {
    return false;
  }
  const asked = method === "HEAD" ? "GET" : method;
  return ALLOWED.some(([m, prefix]) => m === asked && (path === prefix || path.startsWith(prefix)));
}

http
  .createServer((request, response) => {
    if (!allowed(request.method ?? "", request.url ?? "")) {
      response.writeHead(404, { "content-type": "application/json" });
      response.end('{"error":"NOT_FOUND"}');
      return;
    }
    const path = (request.url ?? "").split("?")[0] ?? "";
    if (path.startsWith("/media/")) {
      serveMedia(path, response);
      return;
    }
    const upstream = http.request(
      {
        host: "127.0.0.1",
        port: Number(apiPort),
        method: request.method,
        path: request.url,
        headers: request.headers,
      },
      (answer) => {
        response.writeHead(answer.statusCode ?? 502, answer.headers);
        answer.pipe(response);
      },
    );
    upstream.on("error", () => {
      if (!response.headersSent) {
        response.writeHead(502, { "content-type": "application/json" });
      }
      response.end('{"error":"UPSTREAM_UNAVAILABLE"}');
    });
    request.pipe(upstream);
  })
  .listen(Number(listenPort), "127.0.0.1", () => {
    process.stdout.write(`gate on 127.0.0.1:${listenPort} -> api ${apiPort}\n`);
  });
