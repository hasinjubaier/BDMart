import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@bdmart/contracts", "@bdmart/utils"],
};

export default nextConfig;
