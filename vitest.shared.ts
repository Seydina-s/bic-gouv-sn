import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    // The default 5 s is too tight for cold imports when packages test in parallel
    // on a loaded machine or a small CI runner (API app build took 12.6 s once).
    testTimeout: 30_000,
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      // server.ts is the process entrypoint, covered by the built-bundle smoke test.
      exclude: ["src/**/*.test.ts", "src/index.ts", "src/testing/**", "src/server.ts"],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
});
