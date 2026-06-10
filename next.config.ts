import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true
  },
  outputFileTracingRoot: process.cwd(),
  reactStrictMode: true
};

export default nextConfig;
