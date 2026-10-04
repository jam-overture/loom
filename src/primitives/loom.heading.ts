import { createElement } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { colour, family, size, weight, type RampStep } from "./tokens.js"

/**
 * A heading, with its text as child nodes rather than a `text` prop.
 *
 * That is the one deliberate difference from Hermes, whose blocks carried their
 * copy as fields. Text is a node in Loom (0001) so a sentence can be addressed,
 * moved and re-authored the same way a card can — and so rewording a headline
 * is a delta against the sentence rather than a `configure` that replaces the
 * whole heading's props.
 *
 * `level` is the document outline; the visual size follows from it and is not
 * separately settable. A model that wants a smaller headline picks a lower
 * level, which keeps the outline honest rather than letting a page look
 * structured while its heading levels say otherwise.
 */

const props = z
  .object({
    level: z.number().int().min(1).max(6),
    align: z.enum(["start", "center"]).optional(),
    balance: z.boolean().optional(),
  })
  .strict()

type Props = z.infer<typeof props>

/** Level 1 is the largest step on the ramp; each level down is one step smaller. */
const STEP_FOR_LEVEL: Readonly<Record<number, RampStep>> = { 1: 8, 2: 7, 3: 6, 4: 5, 5: 4, 6: 3 }

/**
 * The ceiling the top two steps are held under on a narrow screen, and the
 * finding this lane filed against itself on 20 August.
 *
 * A font pack's `scaleRamp` is **eight fixed pixel sizes**, so `level: 1` is
 * 72px in every registered pack. On a 390px screen that sets one word per line
 * and the long ones run past the padding into the hero's `overflow: hidden` —
 * clipped rather than scrolling, so no overflow measurement sees it and it
 * looks like a design choice until you read the word that lost its last letter.
 *
 * `min()` against a relative unit is the smallest thing that fixes it: the ramp
 * wins at every width that can hold it, and below that the headline is a
 * fraction of the space instead of a fixed number of pixels. It is the same
 * bargain [0079](../../decisions/0079-a-layout-css-alone-can-express-belongs-in-the-stylesheet.md)
 * makes for `loom.mosaic`'s rhythm — the markup is unchanged, nothing is
 * interpolated, and the browser rather than the render function is what reads
 * the width.
 *
 * **The unit is `cqi`, and it used to be `vw`.** This file named the limit of
 * the viewport version in its own comment for eleven days: *a level-1 heading
 * inside a narrow column on a wide screen is not held back*. A container query
 * unit closes it, and it is a strictly safer swap than it looks — with no
 * ancestor declaring containment, `cqi` resolves against the small viewport,
 * which is `vw` without the scrollbar. So a heading on the open page renders as
 * it always did, and a heading in a `loom.card` or in one half of a
 * `loom.split` is now held to the column it is actually in, because those two
 * declare the containment for it to read.
 *
 * What is still not held back is a heading in a bare `loom.grid` cell: a grid
 * styles its children rather than wrapping them, so there is no element to
 * declare containment on without adding one per cell. In practice a grid cell
 * is a card, which is why this is a note rather than a finding.
 *
 * Only the two steps that overflow are capped. Step 6 is 32px and fits a phone
 * with room to spare, so capping it would shrink headings nobody complained
 * about and make the ramp mean less than it says.
 *
 * The better fix is a fluid `scaleRamp` in the font pack, which is a schema
 * three registered packs depend on and therefore another lane's. This does not
 * block it: a pack whose step 8 is already a clamp is simply a ramp that wins
 * here at every width.
 */
const CAP_FOR_STEP: Readonly<Partial<Record<RampStep, string>>> = { 8: "11cqi", 7: "9cqi" }

const headingSize = (step: RampStep): string => {
  const cap = CAP_FOR_STEP[step]

  return cap === undefined ? size(step) : `min(${size(step)}, ${cap})`
}

export const loomHeading = definePrimitive({
  type: "loom.heading",
  description: "A heading. Its level sets both the document outline and the size.",
  props,
  slots: [],
  /**
   * Its words are its children, so there are none of its own in props — and `[]`
   * rather than nothing is the whole of what this says: *a heading shows no words
   * a reading cannot already see* (0122).
   */
  copy: [],
  /**
   * The library's one role, and the declaration `TITLE_BEARING` in two hosts was
   * standing in for: *this is what a reader takes as the title of what follows.*
   * Which heading leads is a fact about a tree and stays one — a role is not a
   * position ([0114](../../decisions/0114-a-primitive-declares-what-part-it-plays-and-the-registry-is-asked.md)).
   */
  role: "heading",
  component: ({ loom, props: given, children }: LoomPrimitiveProps<Props>) =>
    createElement(
      `h${given.level}`,
      {
        ...loom.editable,
        style: {
          margin: "0",
          fontFamily: family("heading"),
          fontWeight: weight("heading"),
          fontSize: headingSize(STEP_FOR_LEVEL[given.level] ?? 5),
          lineHeight: 1.15,
          color: colour("fg-default"),
          /**
           * **Absent means inherit, not `start`.**
           *
           * For as long as this prop has existed it read `given.align ?? "start"`,
           * and an inline `start` is not a default — it is an override of every
           * ancestor that had an opinion. `loom.hero` sets `text-align: center`
           * on the column it lays its content out in, and a heading dropped into
           * that column answered it with a hard `start`, so the one centred band
           * on the marketing site shipped with the largest words on the site
           * ranged left ([0207](../../decisions/0207-a-primitive-that-arranges-only-glyphs-inherits-its-alignment.md)).
           *
           * The tell was in the same column: the eyebrow `loom.hero` renders
           * itself declares no alignment, so it inherited and sat centred above a
           * headline that did not. A band cannot be contradicted by a node it was
           * handed and still mean what its prop says.
           */
          ...(given.align === undefined ? {} : { textAlign: given.align }),
          ...(given.balance === true ? { textWrap: "balance" } : {}),
        },
      },
      children
    ),
})
