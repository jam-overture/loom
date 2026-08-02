import type { NextConfig } from "next"

/**
 * Nothing. `@loom/runtime` is compiled to `dist/` before this app builds, so it
 * is an ordinary Node package here — no `transpilePackages`, no `extensionAlias`,
 * and no reason to pin the bundler.
 *
 * All three of those were workarounds for consuming TypeScript source whose
 * relative imports carry `.js` specifiers. That convention is correct for Node's
 * ESM resolution and unreadable to a bundler asked to resolve it literally, which
 * broke Node's type stripping on day 8 and the build on day 11. Compiling is what
 * makes the convention true rather than aspirational.
 */
const nextConfig: NextConfig = {}

export default nextConfig
