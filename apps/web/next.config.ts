import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@bugproof/shared"],
  agentRules: false,
  // Static replay files (apps/web/data/cases/*.json) are read at runtime via
  // fs.readdirSync, which Next's output file tracing can't detect
  // statically — include them explicitly so they ship with the deployment.
  outputFileTracingIncludes: {
    "/api/cases/**": ["./data/cases/**"],
    "/cases/**": ["./data/cases/**"],
  },
};

export default nextConfig;
