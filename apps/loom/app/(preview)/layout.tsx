import { GeistSans } from "geist/font/sans"
import type { Metadata } from "next"

import "@/app/(portal)/preview-marks.css"

/**
 * A root layout with nothing in it, because what it wraps has to be a page and
 * not a page inside a tool.
 *
 * ## Why this route group exists at all
 *
 * `/portal/pages/[treeId]` can now show a page at a phone's size, a tablet's or
 * a desktop's, and the only honest way to show a page at a screen size is to
 * give it a **viewport** of that size. Most of the primitive library responds
 * with `@container` and would be satisfied by a fixed-width box; three rules are
 * still viewport `@media`, and one of them folds `loom.nav`'s destinations
 * behind a button below 48rem. A box 390 pixels wide changes no viewport, so a
 * pane built from one would draw a phone-width page wearing a desktop
 * navigation bar.
 *
 * An iframe has a viewport. The document inside it has to be a page of its own,
 * with no rail, no top bar and no skip link — and in the App Router a layout
 * cannot be opted out of, only replaced by a different root. This is that root.
 *
 * **It is a sixth route group and not a fifth surface.** `(demo)`, `(docs)`,
 * `(lessons)`, `(marketing)` and `(portal)` are the four surfaces of 0067 plus
 * the demo; this is none of them. It owns one address, it is behind the
 * portal's session, and everything it decides is about how the portal draws its
 * own preview — so it belongs to `Loom portal` by the rule `routines.md` states
 * for the MDX pipeline: a file is another lane's because of what it decides,
 * not where the framework makes it live.
 *
 * ## What it deliberately does not carry
 *
 * No `globals.css`. The page inside is a **Loom tree**, styled by the library's
 * own stylesheet, which the render hoists into this document's head; Tailwind
 * and the portal's chrome tokens have no business in a preview of somebody
 * else's page. The font is loaded because the `minimal-sans` pack names Geist
 * first and a font pack carries a family name rather than a file, so the family
 * is only real where a surface loads it — the same sentence `(portal)/layout.tsx`
 * makes, for the same reason.
 *
 * No background. The pane behind the iframe draws the device; a document that
 * painted its own would hide the frame it is sitting in.
 */
export const metadata: Metadata = {
  title: "Preview",
  /** Never indexed: it is one reviewer's page, behind one reviewer's session. */
  robots: { index: false, follow: false },
}

/**
 * Per request, for the reason `(portal)/layout.tsx` gives at length: a guarded
 * page has no cookie at build time, so a prerendered copy of this route would be
 * whatever the build saw rather than what the reviewer is serving.
 */
export const dynamic = "force-dynamic"

/**
 * The same font stack the portal's own document gave this page by inheritance,
 * and it is here because moving the preview into a document of its own took it
 * away.
 *
 * The tree carries a theme and the portal has never resolved one — no surface
 * passes `themes` to `renderRequest` except the marketing site — so a previewed
 * page has always been drawn in whatever font the document around it supplied.
 * Inside the portal that was Geist. Inside a bare root it was Times, and the
 * first screenshot of this pane showed a phone-width page set in a serif that
 * nothing in this system had chosen.
 *
 * So this is a faithful move rather than a restyle: the pane shows what the
 * inline preview showed, at a width somebody is served. **Resolving the tree's
 * own theme is the right answer and is a different change** — it would alter
 * every preview in the portal, which is a decision rather than a repair, and it
 * is filed.
 */
const PREVIEW_FONT =
  'var(--font-geist-sans), ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'

const PreviewLayout = ({ children }: { children: React.ReactNode }) => (
  <html lang="en" className={GeistSans.variable}>
    <body style={{ margin: 0, background: "transparent", fontFamily: PREVIEW_FONT }}>
      {children}
    </body>
  </html>
)

export default PreviewLayout
