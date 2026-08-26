import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    // konva's Node entry point requires the optional native `canvas` package.
    // Client components using react-konva only ever run konva's browser build
    // in the browser; this alias just keeps the server compile from failing
    // to resolve a dependency that build never executes.
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
    };
    return config;
  },
};

export default nextConfig;
