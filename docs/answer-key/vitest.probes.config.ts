import { defineConfig } from "vitest/config";

// Runs only the seeded-bug probes: npx vitest run --config docs/vitest.probes.config.ts
export default defineConfig({
  test: {
    include: ["docs/bug-probes.test.ts"],
    environment: "node",
  },
});
