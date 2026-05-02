import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {
    resolveAlias: {
      "porto/internal": "",
      accounts: "",
    },
  },
  webpack: (config) => {
    // wagmi 3.x has optional porto/tempo modules that fail to resolve
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "porto/internal": false,
      accounts: false,
    };
    return config;
  },
};

export default nextConfig;
