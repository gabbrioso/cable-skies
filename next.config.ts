import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3", "sharp", "heic-convert"],
  images: {
    remotePatterns: [],
    unoptimized: true,
  },
};

export default nextConfig;
