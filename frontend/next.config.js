/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'standalone',
  env: {
    NEXT_PUBLIC_LIVEKIT_URL: process.env.LIVEKIT_URL,
  },
};

module.exports = nextConfig;
