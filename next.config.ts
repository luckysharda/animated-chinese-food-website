import type { NextConfig } from "next";

/**
 * Two build targets from one config.
 *
 *   default            output: "standalone" — a self-contained server.js plus only
 *                      the node_modules Next actually traced. The Docker runner
 *                      stage ships that instead of a 600MB node_modules.
 *
 *   BUILD_TARGET=static  output: "export" — a plain directory of files in out/,
 *                      for Cloudflare Pages. Both routes are already prerendered
 *                      (○ Static), so nothing is lost by dropping the server.
 *
 * The one cost of the static target is next/image: without a server there is no
 * optimizer, so images are served at their authored size. That is why the images
 * in /public are authored at the sizes the layout actually uses.
 */
const isStatic = process.env.BUILD_TARGET === "static";

const nextConfig: NextConfig = {
  output: isStatic ? "export" : "standalone",
  ...(isStatic ? { images: { unoptimized: true } } : {}),
};

export default nextConfig;
