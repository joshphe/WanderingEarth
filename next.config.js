/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.echova.top",
      },
      {
        protocol: "https",
        hostname: "*.bkt.clouddn.com",
      },
      {
        protocol: "https",
        hostname: "*.qiniudns.com",
      },
      {
        protocol: "https",
        hostname: "*.clouddn.com",
      },
    ],
  },
  experimental: {
    optimizePackageImports: [
      "three",
      "@react-three/fiber",
      "@react-three/drei",
    ],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.optimization.splitChunks = {
        ...config.optimization.splitChunks,
        cacheGroups: {
          ...config.optimization.splitChunks?.cacheGroups,
          three: {
            test: /[\\/]node_modules[\\/](three|@react-three)[\\/]/,
            name: "vendor-three",
            chunks: "all",
            priority: 20,
          },
        },
      };
    }
    return config;
  },
};

module.exports = nextConfig;
