/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Convex serves uploaded files from the deployment's storage domain.
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.convex.cloud" },
    ],
  },
};

export default nextConfig;
