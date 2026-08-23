import createMDX from "@next/mdx"
import type { NextConfig } from "next"

import { docsRehypePlugins, docsRemarkPlugins } from "./app/(docs)/_lib/mdx"

/**
 * One application, four surfaces, and two settings between them.
 *
 * `pageExtensions` is the documentation site's decision (§4c) made literal:
 * prose is the page there, so the file a writer edits is the route. It is
 * declared for the whole application because Next takes it once, and nothing
 * outside `(docs)` writes a `page.mdx`. The markdown dialect those pages are
 * parsed in is the same decision and is stated in `(docs)/_lib/mdx.ts`, next to
 * the pages it governs; this file only hands it to the loader.
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

export default createMDX({
  options: {
    remarkPlugins: docsRemarkPlugins.map(([name, options]) => [name, options]),
    rehypePlugins: docsRehypePlugins.map(([name, options]) => [name, options]),
  },
})(nextConfig)
