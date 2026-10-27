import type { NextConfig } from "next";

/**
 * Development origins allowed to load Next.js dev resources.
 *
 * Next 16 blocks its client runtime (HMR, dev overlay) for hostnames it does
 * not know about. The cloud preview serves this app from the VM hostname below,
 * so without this the page renders its static HTML but the JavaScript never
 * boots — the language toggle appears dead and the Leaflet map never appears.
 * Only the exact preview host is listed; no wildcards.
 */
const allowedDevOrigins = [
  "pv-311c61b7a415-34c598d4-25f4-4e18-94ca-3f09b02ad075.style.dev",
  "localhost",
  "127.0.0.1",
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins,
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
