import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@bugproof/shared"],
  agentRules: false,
};

export default nextConfig;
