import type { NextConfig } from "next"

/**
 * Nothing, for the same reason the portal's is empty: `@loom/runtime` is
 * compiled to `dist/` before this app builds, so it is an ordinary Node package
 * here rather than TypeScript source a bundler has to be taught to resolve.
 */
const nextConfig: NextConfig = {}

export default nextConfig
