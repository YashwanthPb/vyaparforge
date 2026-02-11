import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",  // <--- ADD THIS LINE HERE
  // ... leave your other existing config settings alone
};

export default nextConfig;