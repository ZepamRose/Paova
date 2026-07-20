import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Pin the workspace root to this project (a stray lockfile in the home
  // directory can otherwise make Next infer the wrong root).
  outputFileTracingRoot: path.resolve(__dirname),
};

export default nextConfig;
