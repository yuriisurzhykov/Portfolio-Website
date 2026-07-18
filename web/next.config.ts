import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @portfolio/backend (npm workspace package, see /backend and web/README.md)
  // ships its own TypeScript source with no build step of its own — Next.js
  // only compiles its own app code by default, so packages outside it are
  // normally treated as pre-built JS. transpilePackages tells Next.js to run
  // its own compiler over this package's source too.
  transpilePackages: ["@portfolio/backend"],
};

export default nextConfig;
