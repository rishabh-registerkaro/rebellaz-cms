import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  remotePatterns: [
      {
        protocol: "https",
        hostname: "mediumvioletred-louse-678358.hostingersite.com",
      },
    ],
  },
};

export default nextConfig;
