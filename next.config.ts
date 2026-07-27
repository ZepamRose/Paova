import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Pin the workspace root to this project (a stray lockfile in the home
  // directory can otherwise make Next infer the wrong root).
  outputFileTracingRoot: path.resolve(__dirname),
  // A production build writes the same manifests the dev server is serving
  // from, so running `next build` while `next dev` is up leaves the running
  // app with 404s on its CSS/chunks until restarted. Setting NEXT_DIST_DIR
  // lets a build (CI, or a local check) target its own directory instead.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
