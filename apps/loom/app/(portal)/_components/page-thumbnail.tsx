import { renderLoomTree } from "@jam-overture/loom/react"
import type { LoomTree } from "@jam-overture/loom"

import { portalRegistry } from "@/app/(portal)/_lib/registry"

/**
 * A page, drawn small.
 *
 * ## Why the portal needed one
 *
 * The maintainer's verdict on 27 September was that the portal *"fails overall
 * in one major regard; what am I supposed to do here?"* — and the sharpest
 * instance of it was that `/portal` had no picture of anything. A person's pages
 * were a list of names and counts, on a surface whose entire subject is pages
 * that were never written as markup and exist nowhere they could otherwise be
 * looked at. Vercel's project list leads with a screenshot of the project. This
 * is that, and `docs/portal.md` phase 1 is the argument in full.
 *
 * ## It is not an image, and that is the whole design
 *
 * The obvious build is a screenshot pipeline: a browser, a storage bucket, a
 * cache keyed on the page and its version, and an invalidation story. This is
 * none of those. **It is the page itself, rendered and scaled**, which removes
 * every one of those parts along with the one failure they share — a cached
 * image can be stale, and a dashboard drawing a page that is not the page being
 * served is a dashboard that lies about the one thing it is for.
 *
 * Two facts make it affordable, and both were measured before this was written
 * rather than hoped for:
 *
 * 1. **The tree is already read.** `/portal`'s existing fan-out reads the head
 *    of every listed page to name it and to say what a waiting change would do
 *    (`headsOf`, kept since 17 September precisely so the tree is not thrown
 *    away). A thumbnail adds **no read at all**.
 * 2. **The render is pure and synchronous.** `renderLoomTree` is a total
 *    projection over a tree already in memory — no source, no await, nothing
 *    that can fail. 0008 made the renderer degrade rather than throw, so the
 *    worst case is a diagnostic this component does not show.
 *
 * ## What it is honest about
 *
 * **The options are the page screen's own**, deliberately. `/portal/pages/[treeId]`
 * renders with `resolver` and `validator` and nothing else — no `data`, no
 * `submissions`, no `themes`, no `origins` — so a band that reads a data source
 * draws empty there too. Passing more here would make the small picture show
 * something the large one does not, and a thumbnail that disagrees with the
 * preview it links to is worse than no thumbnail. When the page screen resolves
 * more, this inherits it by reading the same registry.
 *
 * It is **decorative and says so**: `aria-hidden`, and no pointer events. The
 * card around it carries the page's name and its id as text, which is what a
 * screen reader gets and what every other list of pages in this portal already
 * shows. A picture of a page is not a name for it — identity is not technical
 * detail (22 August) and a thumbnail is not identity.
 *
 * ## How it is scaled
 *
 * Rendered at a desktop width and scaled down with a transform, rather than
 * rendered into a narrow box. Those produce different pictures and only one of
 * them is the truth: the primitives are responsive (0106 — a band asks its own
 * container for a width), so a 320px-wide container would draw the *phone*
 * layout and label it the page. A person glancing at their dashboard is asking
 * *what does my page look like*, and the answer they mean is the one most of
 * their readers see.
 *
 * `transform` rather than `zoom`: it is the one of the two that is not still
 * arriving in browsers, and it composites rather than reflowing, so a grid of
 * twelve of these lays out once at one width instead of twelve times at twelve.
 *
 * ## The scale is the browser's arithmetic, not the server's
 *
 * `scale(calc(100cqw / 1280px))` — a length over a length is a number, so the
 * factor is whatever fraction of the drawn width the card actually got. **This
 * was a fixed pixel width for one draft and a screenshot refused it**: the card
 * pads its text, a 288px picture inside a 288px grid track needs 312px of card,
 * and the phone shot came back `scrollWidth 402 / innerWidth 390`. Passing the
 * width in means the component has to know what its container will do with it,
 * which is the arrangement that produced the overflow.
 *
 * A container query rather than a layout effect, because the alternative is a
 * client component measuring its own box: a second render, a flash of the page
 * at full size, and a dashboard that jumps on load. 0106 already made container
 * queries this repository's answer to *how wide am I*.
 *
 * If a browser cannot resolve the unit the declaration is dropped and the page
 * draws unscaled inside a box that clips — a zoomed crop of the top-left, which
 * is a worse picture and not a broken card.
 */

/**
 * The width the page is drawn at before it is shrunk.
 *
 * 1280 is the harness's `wide` viewport (`docs/routines.md`), so a thumbnail is
 * the same layout every screenshot in every report of this lane is taken at.
 * That is worth more than a rounder number: when a picture here looks wrong, the
 * instrument that proves it is already pointed at the same width.
 */
export const THUMBNAIL_WIDTH = 1280

/**
 * How much of the page is shown, as a fraction of its own width.
 *
 * A page is arbitrarily tall and a card is not, so a thumbnail is always a crop
 * of the top. 0.625 is 8:5 — wider than the page is tall in the crop, which
 * keeps a row of cards short enough that twelve of them are one screen rather
 * than a scroll. The crop is from the top because that is where a page's
 * heading is, and the heading is what tells one card from the next before the
 * name underneath is read.
 */
const CROP_RATIO = 0.625

export const PageThumbnail = ({ tree }: { readonly tree: LoomTree }) => {
  const { element } = renderLoomTree(tree, {
    resolver: portalRegistry,
    validator: portalRegistry,
  })

  return (
    <div
      aria-hidden="true"
      className="bg-surface-base pointer-events-none w-full overflow-hidden select-none"
      style={{
        containerType: "inline-size",
        aspectRatio: `${1 / CROP_RATIO}`,
      }}
    >
      <div
        /*
         * `top left` and not `center`: the origin decides which part of the page
         * survives the crop, and the top-left is where a left-to-right page puts
         * the thing it leads with. Centring would crop to the middle of the page,
         * which on a long one is whatever happened to be halfway down it.
         */
        style={{
          width: THUMBNAIL_WIDTH,
          transform: `scale(calc(100cqw / ${THUMBNAIL_WIDTH}px))`,
          transformOrigin: "top left",
        }}
      >
        {element}
      </div>
    </div>
  )
}
