/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
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
          modals: {
            test: /[\\/]src[\\/]components[\\/]ui[\\/](AddMemoryModal|EditLocationModal|EditPhotoModal|AddPhotoModal|DeleteConfirmModal)/,
            name: "modals",
            chunks: "all",
            priority: 15,
          },
        },
      };
    }
    return config;
  },
};

module.exports = nextConfig;
