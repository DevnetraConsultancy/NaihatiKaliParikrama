import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The map, crowd and routing APIs are all server-routed so keys stay on the
  // server and responses can be cached in Neon. Nothing needs custom config
  // beyond a small header pass-through for the health endpoint.
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
    ];
  },
};

export default nextConfig;
