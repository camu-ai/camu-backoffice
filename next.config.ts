import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    optimizePackageImports: ["recharts", "lucide-react", "date-fns"],
  },
};

export default nextConfig;
