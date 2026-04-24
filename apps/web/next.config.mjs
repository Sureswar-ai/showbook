/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@showbook/types"],
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  experimental: { typedRoutes: false },
};

export default nextConfig;
