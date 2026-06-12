import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  // sharp ships native libvips; keep it external so the server requires it
  // from node_modules instead of bundling (Render runs next start with the
  // full install, so production always has it).
  serverExternalPackages: ["sharp"],
};

export default nextConfig;
