import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  reactCompiler: true,
  turbopack: {
    root: path.resolve(__dirname),
  },
  serverActions: {
    bodySizeLimit: '4mb',
  },
};

export default nextConfig;
