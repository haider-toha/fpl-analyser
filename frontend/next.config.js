/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "resources.premierleague.com",
        pathname: "/premierleague/photos/players/**",
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001"}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;

