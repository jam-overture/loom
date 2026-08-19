import createMDX from "@next/mdx"
import type { NextConfig } from "next"

/**
 * One application, four surfaces, and two settings between them.
 *
 * `pageExtensions` is the documentation site's decision (§4c) made literal:
 * prose is the page there, so the file a writer edits is the route. It is
 * declared for the whole application because Next takes it once, and nothing
 * outside `(docs)` writes a `page.mdx`.
 *
 * `@loom/runtime` is compiled to `dist/` before this app builds, so it is an
 * ordinary Node package here — no `transpilePackages`, no `extensionAlias`, and
 * no reason to pin the bundler. All three were workarounds for consuming
 * TypeScript source whose relative imports carry `.js` specifiers, which is
 * correct for Node's ESM resolution and unreadable to a bundler asked to resolve
 * it literally.
 */
const nextConfig: NextConfig = {
  pageExtensions: ["ts", "tsx", "mdx"],
}

export default createMDX({})(nextConfig)
