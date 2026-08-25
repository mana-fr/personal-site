import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every route here is static (no API routes, no dynamic segments), so this
  // ships as a plain folder of HTML/CSS/JS — no server needed, deployable to
  // Cloudflare Pages directly.
  output: "export",
  // Static export has no server to run Next's on-the-fly image optimizer on,
  // so images are served as-is instead of resized/reformatted per-request.
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
