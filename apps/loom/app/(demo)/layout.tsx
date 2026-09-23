import { GeistSans } from "geist/font/sans"
import type { Metadata, Viewport } from "next"

import { demoShareMetadata } from "@/app/(demo)/_lib/share"

import "./globals.css"

/**
 * The demo's own document.
 *
 * It used to live under `/portal/demo`, inside the signed-in review tool, which
 * meant a public page wore a topbar reading "loom portal · alpha" and a skip
 * link to a rail of six routes a visitor cannot open. The people the demo exists
 * to convince were being shown the tool it is not, at the one path in this
 * application that reads as private.
 *
 * So this is a route group of its own with no chrome but a document: no nav, no
 * identity, nothing to sign in to. What a visitor sees is the page and the
 * record of it, which is the only claim this surface makes.
 */

/**
 * What the document says about itself, **including to the people who never open
 * it.** This used to be a title and a description and nothing else, so a link to
 * the demo pasted into a channel arrived as a bare URL — on the one surface in
 * this repository whose entire job is to be sent to a stranger, while all ten
 * marketing pages, every one of them a page that links *here*, unfurled with a
 * title, a description and a drawn card. `_lib/share.ts` says what is now
 * carried and where each word comes from.
 */
export const metadata: Metadata = demoShareMetadata()

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
}

/**
 * Rendered per request, and this is load bearing rather than cautious.
 *
 * The page reads the visitor cookie to find which copy of the demo this browser
 * is looking at. A prerendered demo would serve one visitor's tree — or, worse,
 * the pristine one — to everybody who arrives after a change, so the first thing
 * a visitor does would appear to have been undone by the second.
 */
export const dynamic = "force-dynamic"

const DemoLayout = ({ children }: { readonly children: React.ReactNode }) => (
  /*
   * Geist under `--font-geist-sans`, which `globals.css` reads. The `geist`
   * package rather than `next/font/google`, because that one fetches from a font
   * CDN during `next build` — a network dependency in a deploy, turning it red
   * for a reason unrelated to the change being deployed.
   *
   * This binds the face for the *chrome* only. The page on the stage carries its
   * own theme on its root node (0050) and names its own families, which is why
   * a visitor re-theming the page changes its typeface and not the rail's.
   */
  <html lang="en" className={GeistSans.variable}>
    <body className="min-h-screen">
      <a href="#ask" className="loom-skip-link">
        skip to the controls
      </a>
      {children}
    </body>
  </html>
)

export default DemoLayout
