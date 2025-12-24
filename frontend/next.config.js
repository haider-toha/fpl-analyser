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
};

module.exports = nextConfig;
