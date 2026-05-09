import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;

// Initialize the Cloudflare bindings (env vars, R2, etc.) for `next dev` so
// that local development sees the same environment shape as production. Only
// runs in dev — no-op in production builds.
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
