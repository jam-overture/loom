import type { NextConfig } from "next"

/**
 * `@loom/runtime` is published as TypeScript source — the compile step deferred
 * on day 8 has not landed — so Next has to transpile it rather than consume a
 * build. 0018 predicted this: the portal is the first consumer, and the first
 * consumer is what turns a deferred decision into a concrete cost.
 */
const nextConfig: NextConfig = {
  transpilePackages: ["@loom/runtime"],
}

export default nextConfig
