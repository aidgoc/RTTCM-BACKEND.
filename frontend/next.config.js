/** @type {import('next').NextConfig} */
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001";

const nextConfig = {
  reactStrictMode: false, // Disable strict mode to avoid double-mounting issues
  swcMinify: true,
  experimental: {
    esmExternals: 'loose',
  },
  env: {
    NEXT_PUBLIC_API_URL: API_URL,
    NEXT_PUBLIC_WS_URL: WS_URL,
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${API_URL}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
