import type { ResolvedTheme } from "@loom/runtime"
import { renderLoomTree, themeStyle } from "@loom/runtime/react"

import type { PartInQuestion } from "@/app/(demo)/_lib/in-question"
import { demoRegistry } from "@/app/(demo)/_lib/registry"

/**
 * The part of the page the question is about, inside the question.
 *
 * `_lib/in-question.ts` decides which node and what is about to happen to it,
 * and says why a stacked layout needs this at all. What is here is the rendering
 * and the three decisions in it.
 *
 * **It is the band, not a picture of the band.** Same registry, same validator,
 * same components the stage resolved — so a primitive that changes changes here
 * too, and there is no second rendering of the clinic's page anywhere in this
 * repository to keep in step with the first. That is the demo's own claim about
 * itself, taken at its word: a page kept as a tree can be shown twice, in two
 * places, at two sizes, with no copy of it existing.
 *
 * **The theme comes from the page render rather than from here.** A theme is
 * resolved from the root's reserved props and handed to the *root primitive*
 * (`render.ts`), which means an excerpt rooted at a band gets no theme at all —
 * `loom.stat-grid` never reads `loom.theme` and would not know what to do with
 * it. So the variables are put on the frame around the excerpt, taken from the
 * `ResolvedTheme` the page render already produced. Re-resolving them here would
 * be a second answer to a question that has one, and the failure would be a
 * preview in last month's palette that nothing would catch.
 *
 * **Edit mode is off**, which is load-bearing rather than tidy. The mark on the
 * stage is a stylesheet keyed on `data-loom-node` (`_lib/spotlight.ts`), so an
 * excerpt rendered with edit mode on would carry the same attribute, match the
 * same rule, and draw a second amber ring and a second chip inside the card that
 * is asking about the first one.
 */
export const PartInQuestionView = ({
  part,
  theme,
}: {
  readonly part: PartInQuestion
  /**
   * The page's own resolved theme. Absent only if the tree names no theme, in
   * which case the excerpt inherits the same nothing the stage does and the
   * primitives fall back exactly as they do out there.
   */
  readonly theme?: ResolvedTheme
}) => {
  const rendered = renderLoomTree(part.tree, { resolver: demoRegistry, validator: demoRegistry })

  return (
    <section className="demo-part">
      {/*
        * A heading rather than a label, and the same size as the card's other
        * heading, so the two readings of the change — what it would do, and what
        * it would do it to — read as siblings rather than as a section and its
        * caption.
        */}
      <h4 className="text-ink-secondary text-xs">{part.lead}</h4>

      {/*
        * `loom-stage` for the same reason the stage has it: the excerpt is the
        * clinic's page and everything around it is Loom's chrome, and a band on
        * a dark ground would be neither. It brings the light ground, the
        * `color-scheme` and a stacking context of its own, which is what keeps a
        * hero's backdrop from painting over the card.
        */}
      <div className="demo-part-stage loom-stage" style={theme ? themeStyle(theme) : undefined}>
        {rendered.element}
      </div>
    </section>
  )
}
