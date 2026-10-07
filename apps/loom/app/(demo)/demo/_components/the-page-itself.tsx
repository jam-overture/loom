import type { ResolvedTheme } from "@jam-overture/loom"

import type { PageItself } from "@/app/(demo)/_lib/the-page-itself"

import { PageBand } from "./page-band"

/**
 * The top of the page, on the first screen, where a phone had no page on it at
 * all.
 *
 * `_lib/the-page-itself.ts` has the measurement — the stage begins 250px past
 * the fold at 390 × 844 — the one silence, and the three shapes that were
 * refused. What is here is the frame and the two decisions in it.
 *
 * **It is inert, and that is the one way it differs from the other three
 * bands.** `globals.css` already makes nothing inside a band pressable, but
 * `pointer-events: none` is a rule about a mouse: it leaves every control
 * inside in the tab order and leaves the whole band in the accessibility
 * tree. The other three bands never cared, because what they draw is a stat
 * grid or a feature row. **The top of this page is the clinic's hero**, which
 * carries an `h1` and two calls to action — so without `inert` this window
 * would put a second *Book an assessment* in the tab order, a second `h1`
 * ahead of the page's own, and a whole duplicate hero into a screen reader's
 * reading of a rail whose sentences are the only ones that explain anything.
 *
 * It removes all of that in one attribute, which is the honest shape: this is
 * a view of something the document already carries in full, 250 pixels below,
 * so there is nothing in it a visitor is meant to reach. It is React 19's
 * boolean prop rather than `aria-hidden` and a `tabindex` sweep, and it is on
 * the **band** rather than on the section around it, so the caption under the
 * band is still read — the band is the part with nothing to reach in, and the
 * caption is Loom's own voice. A browser that does not honour it falls back to
 * the stylesheet's `pointer-events: none`: a band you can see and cannot
 * press, which is where the other three started.
 *
 * **Its window is 15rem and both ends of it are measured.** The two existing
 * windows are sized by what is *in* them — 13rem so a question's two buttons
 * stay on a phone screen, 21rem so an ask's three figures are not previewed as
 * one. This one has a floor and a ceiling. The floor is the clinic's own
 * heading, which begins 146px into the hero, after a backdrop and an eyebrow:
 * built first at 9rem this was a dark box with a pill in it on a dark rail,
 * which is a worse thing to put on a first screen than nothing. The ceiling is
 * the press, because every pixel here pushes the green button and the four
 * secondary asks down a screen that had no slack at all. `globals.css` has the
 * arithmetic, the two sizes at which this does not draw, and the cost.
 */
export const ThePageItselfView = ({
  page,
  theme,
}: {
  readonly page: PageItself
  /**
   * The page's own resolved theme, handed down from the page render exactly as
   * it is for the other three bands — so a visitor who re-themes the page
   * re-themes this. Absent only if the tree names no theme.
   */
  readonly theme?: ResolvedTheme
}) => (
  /*
   * A `<section>` with no heading and no label, and both absences are the same
   * decision as `inert`.
   *
   * A labelled region announces itself to a screen reader as something to
   * navigate into, and there is nothing in here to navigate to: the page it is
   * a view of is the next landmark in the document. The rail's own `h1` is
   * three lines up and the sentence under it — *It's the page below.* — is what
   * this window is the referent for, so a heading here would be a third voice
   * saying the same thing in the space of eighty pixels.
   */
  <section className="demo-part demo-part--arrival">
    <PageBand inert tree={page.tree} {...(theme ? { theme } : {})} />

    {/*
      * The line that keeps the window from being read as the whole page.
      *
      * `the-page-itself.ts` argues the words. It is under the band rather than
      * over it because it is about what the fade at the band's foot has just
      * shown the visitor, and because the thing above it is the band's own
      * referent in the header.
      */}
    <p className="text-ink-muted text-xs">{page.caption}</p>
  </section>
)
