import { defineConfig } from "tsdown";

// Bundles the API and the workspace packages (shipped as TypeScript sources)
// into one Node file; npm dependencies stay external.
export default defineConfig({
  entry: ["src/server.ts"],
  platform: "node",
  format: "esm",
  outDir: "dist",
  noExternal: [/^@bgs\//],
  sourcemap: true,
});
