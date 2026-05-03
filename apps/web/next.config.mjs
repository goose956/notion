/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    typedRoutes: true,
    serverComponentsExternalPackages: ["postgres", "drizzle-orm"],
  },
  transpilePackages: [
    "@niche-factory/db",
    "@niche-factory/schema",
    "@niche-factory/deployer",
    "@niche-factory/exporter",
    "@niche-factory/notion-client",
    "@niche-factory/adapter-runtime",
    "@niche-factory/sync-engine",
    "@niche-factory/ai",
    "@niche-factory/niches",
  ],
  webpack(config) {
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
      ".mjs": [".mts", ".mjs"],
    };
    return config;
  },
};

export default nextConfig;
