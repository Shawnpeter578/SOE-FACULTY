import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdfkit"],
  outputFileTracingIncludes: {
    "/faculty/events/\\[id\\]/letter/pdf": [
      "./node_modules/@fontsource/noto-sans/package.json",
      "./node_modules/@fontsource/noto-sans/files/noto-sans-latin-400-{normal,italic}.woff",
      "./node_modules/@fontsource/noto-sans/files/noto-sans-latin-700-normal.woff",
      "./node_modules/@fontsource/noto-sans/files/noto-sans-latin-ext-400-normal.woff",
    ],
  },
  experimental: {
    serverActions: { bodySizeLimit: "16mb" },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
