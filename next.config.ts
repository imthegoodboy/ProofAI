import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  serverExternalPackages: [
    "@0gfoundation/0g-storage-ts-sdk",
    "tesseract.js",
    "unpdf",
  ],
};

export default nextConfig;
