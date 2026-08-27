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
 * `level` is the document outline. The size follows from it by default and can
 * now be moved off it, which is a change of position and worth saying why.
 *
 * **The old rule was that a model wanting a smaller headline picks a lower
 * level.** That keeps the outline honest in the case it was written for — a
 * page whose headings are all the page's own — and it fails the case that
 * actually turned up. `Loom marketing` built a band of four `loom.card`s under
 * a level-2 section heading, so each card title is level 3, which is step 6 —
 * **32px in a card about 290px wide**. All four wrapped to two lines and the
 * navigation band came out louder than the argument band above it. The three
 * ways out available at the time were: use level 5 and put an `h5` under an
 * `h2`; drop the headings for prose and lose four destinations from the
 * outline; or show three cards and leave the fourth alone on a second row. The
 * band shipped at 32px and the lane filed this instead, which was the right
 * call.
 *
 * The library was also already disagreeing with itself. `loom.feature` renders
 * its title as a hard-coded `<h3>` at step 4 — 20px — so the *same level* came
 * out at 32px through this primitive and at 20px through that one, and only the
 * wrong one of the two was reachable from a tree. `scale` is that private seam
 * made public.
 *
 * **It is expressed as a level rather than as a ramp step, and that is not
 * cosmetic.** The obvious shape is `scale: 1–8` naming the step directly, and it
 * has an inversion a model would fall into: `level: 1` is the *largest* heading
 * and step 1 is the *smallest* text on the ramp, so the two numbers beside each
 * other in one prop bag run in opposite directions. Saying *size this as though
 * it were level 5* borrows a vocabulary the model already has, points the same
 * way as the prop above it, and cannot name a size the ramp does not hold.
 *
 * It stays a prop under 0052 and under the granularity doc's sharper question:
 * changing it adds no node, removes none and reorders none. It is `align` and
 * `balance`'s kind of thing — a rendering of fixed content — not a `move` in
 * disguise.
 */

const props = z
  .object({
    level: z.number().int().min(1).max(6),
    /**
     * Size this heading as though it were at this level, without moving it in
     * the document outline. Defaults to the heading's own level, so a tree that
     * does not set it renders exactly as it did before this existed.
     */
    scale: z.number().int().min(1).max(6).optional(),
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
 * `min()` against a viewport unit is the smallest thing that fixes it: the ramp
 * wins at every width that can hold it, and below that the headline is a
 * fraction of the screen instead of a fixed number of pixels. It is the same
 * bargain [0079](../../decisions/0079-a-layout-css-alone-can-express-belongs-in-the-stylesheet.md)
 * makes for `loom.mosaic`'s one media query — the markup is unchanged, nothing
 * is interpolated, and the browser rather than the render function is what
 * reads the width. It has the same limit, too: a `vw` is the *viewport*, so a
 * level-1 heading inside a narrow column on a wide screen is not held back.
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
const CAP_FOR_STEP: Readonly<Partial<Record<RampStep, string>>> = { 8: "11vw", 7: "9vw" }

const headingSize = (step: RampStep): string => {
  const cap = CAP_FOR_STEP[step]

  return cap === undefined ? size(step) : `min(${size(step)}, ${cap})`
}

export const loomHeading = definePrimitive({
  type: "loom.heading",
  description:
    "A heading. Its level sets the document outline, and the size unless `scale` names another level to take it from.",
  props,
  slots: [],
  component: ({ loom, props: given, children }: LoomPrimitiveProps<Props>) =>
    createElement(
      `h${given.level}`,
      {
        ...loom.editable,
        style: {
          margin: "0",
          fontFamily: family("heading"),
          fontWeight: weight("heading"),
          fontSize: headingSize(STEP_FOR_LEVEL[given.scale ?? given.level] ?? 5),
          lineHeight: 1.15,
          color: colour("fg-default"),
          textAlign: given.align ?? "start",
          ...(given.balance === true ? { textWrap: "balance" } : {}),
        },
      },
      children
    ),
})
