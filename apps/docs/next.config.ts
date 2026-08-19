import createMDX from "@next/mdx"
import type { NextConfig } from "next"

/**
 * Two settings, and both of them are the MDX decision in §4c made literal.
 *
 * `pageExtensions` is what lets a page be a `page.mdx` file rather than a
 * component that imports one: prose is the page here, so the file the writer
 * edits is the route. Nothing else in the app needs to know that a page was
 * written in MDX.
 *
 * `@loom/runtime` is compiled to `dist/` before this app builds, so it is an
 * ordinary Node package here — no `transpilePackages` and no bundler pinning,
 * for the reasons the portal's config records.
 */
const nextConfig: NextConfig = {
  pageExtensions: ["ts", "tsx", "mdx"],
}

export default createMDX({})(nextConfig)
