import type { NextConfig } from 'next';

/**
 * Static export: `npm run build` writes a fully static site to /out that can be
 * served by any static host (S3, Nginx, GitHub Pages, Netlify, an internal web server…).
 * `trailingSlash` makes every route a folder with an index.html so deep links work
 * on hosts without rewrite rules.
 */
const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  reactStrictMode: true,
  agentRules: false,
  devIndicators: false,
  images: { unoptimized: true },
  // Set NEXT_PUBLIC_BASE_PATH when hosting under a sub-path (e.g. /tayf-demo).
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || undefined,
};

export default nextConfig;
