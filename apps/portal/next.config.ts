import type { NextConfig } from "next"

/**
 * `@loom/runtime` ships TypeScript source — the compile step deferred on day 8 has
 * not landed — so Next has to transpile it rather than consume a build.
 *
 * That alone is cheap. The expensive part is the convention underneath it: the
 * runtime's internal imports use `.js` specifiers that resolve to `.ts` sources,
 * which is correct for `tsc` and for Vitest and unresolvable for a bundler that
 * takes the extension literally. Day 8 hit the same convention from the other
 * side, in Node's type stripping. `extensionAlias` is the standard answer, and it
 * is why this build runs on webpack rather than Turbopack — Turbopack exposes no
 * equivalent knob today.
 *
 * This is a workaround, not a design. The real fix is the build step, and 0018
 * predicted the portal would be what forced it: the first consumer is what turns
 * a deferred decision into a blocking one.
 */
const nextConfig: NextConfig = {
  transpilePackages: ["@loom/runtime"],
  webpack: (config) => ({
    ...config,
    resolve: {
      ...config.resolve,
      extensionAlias: {
        ...config.resolve?.extensionAlias,
        ".js": [".ts", ".tsx", ".js"],
      },
    },
  }),
}

export default nextConfig
