import type { LoomTree, ResolvedTheme } from "@jam-overture/loom"
import { renderLoomTree, themeStyle } from "@jam-overture/loom/react"

import { pageGround } from "@/app/(demo)/_lib/ground"
import { demoRegistry } from "@/app/(demo)/_lib/registry"

/**
 * A part of the clinic's page, rendered a second time inside Loom's rail.
 *
 * **One element, and it is the one the stylesheet clips, fades, hides and
 * makes unpressable** (`globals.css`). Four places in this lane now need it —
 * the band a question is about, the band an ask would touch, the band a landed
 * change took off the page (`part-in-question.tsx`), and the top of the page
 * itself on the arrival screen (`the-page-itself.tsx`) — and what it *is* is
 * not something any of them is allowed to have an opinion about.
 *
 * **It is the band, not a picture of the band.** Same registry, same validator,
 * same components the stage resolved, so a primitive that changes changes here
 * too and there is no copy of the clinic's page anywhere in this repository to
 * keep in step with the first. That is the demo's own claim about itself taken
 * at its word: a page kept as a tree can be shown twice, in two places, at two
 * sizes, with no copy of it existing.
 *
 * ## The three decisions it holds, each of them a defect once
 *
 * **The theme comes from the page render rather than from here.** A theme is
 * resolved from the root's reserved props and handed to the *root primitive*
 * (`render.ts`), so an excerpt rooted at a band gets no theme at all —
 * `loom.stat-grid` never reads `loom.theme` and would not know what to do with
 * it. The variables go on the frame instead, taken from the `ResolvedTheme` the
 * page render already produced. Re-resolving them here would be a second answer
 * to a question that has one, and the failure would be a band in last month's
 * palette that nothing would catch.
 *
 * **And so does the ground, which for three weeks it did not.** The frame wore
 * `.loom-stage`, whose background is the demo chrome's `--surface-stage` — a
 * white that was right for exactly as long as the tree named a light palette.
 * When `DEMO_STARTING_THEME` moved to `midnight` on 26 September the excerpt
 * kept painting white and kept taking its ink from the page, so *"This is what
 * would come off the page"* was followed by `#f3f4f7` on `#ffffff`: **1.10:1**,
 * measured on a production build at 390 × 844. Nothing was hidden and nothing
 * errored; the labels simply were not there. `_lib/ground.ts` reads both ends of
 * the pair off the one palette, so they cannot disagree again.
 *
 * **Edit mode is off**, which is load-bearing rather than tidy. The mark on the
 * stage is a stylesheet keyed on `data-loom-node` (`_lib/spotlight.ts`), so a
 * band rendered with edit mode on would carry the same attribute, match the same
 * rule, and draw a second amber ring and a second chip inside the card that is
 * asking about the first one.
 *
 * `loom-stage` for the same reason the stage has it: the band is the clinic's
 * page and everything around it is Loom's chrome, and a band wearing the rail's
 * ground would be neither. It brings a stacking context of its own, which is
 * what keeps a hero's backdrop from painting over the card, and a ground and a
 * `color-scheme` for the unthemed case. When there *is* a theme the ground comes
 * from it and not from the stylesheet — an inline style, which beats every
 * layer, so the two can be read in one place rather than resolved between a
 * custom property and its fallback.
 */
export const PageBand = ({
  tree,
  theme,
  inert = false,
}: {
  /** The part of the page to draw, rooted at the node it is of. */
  readonly tree: LoomTree
  /**
   * The page's own resolved theme. Absent only if the tree names no theme, in
   * which case the band inherits the same nothing the stage does and the
   * primitives fall back exactly as they do out there.
   */
  readonly theme?: ResolvedTheme
  /**
   * Whether the band is a view of content the document already has.
   *
   * **The stylesheet's `pointer-events: none` is a rule about a mouse.** It
   * leaves every control inside the band in the tab order and leaves the whole
   * band in the accessibility tree, which costs nothing for a band of figures
   * or feature rows — and costs a duplicate `h1` and two duplicate calls to
   * action for the clinic's hero, which is what the arrival screen's window
   * draws (`the-page-itself.tsx`).
   *
   * So it is the caller's answer rather than this file's, because it is a
   * claim about the *document*: a question's band and a landed change's band
   * are the only place their content exists on the screen, and the arrival
   * window's is a second view of a hero the page below carries in full. Only
   * the second of those is inert.
   */
  readonly inert?: boolean
}) => {
  const rendered = renderLoomTree(tree, { resolver: demoRegistry, validator: demoRegistry })

  return (
    <div
      inert={inert}
      className="demo-part-stage loom-stage"
      style={theme ? { ...themeStyle(theme), ...pageGround(theme) } : undefined}
    >
      {rendered.element}
    </div>
  )
}
