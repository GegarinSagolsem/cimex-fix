import { build } from "esbuild";
import { mkdirSync } from "node:fs";

mkdirSync("dist", { recursive: true });

await build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  platform: "node",
  target: "node22",
  format: "esm",
  outfile: "dist/index.js",
  banner: {
    js: "#!/usr/bin/env node",
  },
  // Mark all node built-ins and workspace packages as external
  external: [
    "node:*",
    "@bugproof/shared",
    "@modelcontextprotocol/sdk",
    "zod",
  ],
  // esbuild doesn't strip #!/usr/bin/env node at top of entry
  sourcemap: false,
  minify: false,
});

console.log("bugproof-mcp: build complete → dist/index.js");
