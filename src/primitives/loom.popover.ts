import { createElement } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import {
  EDGES,
  EDGE_NAMES,
  PANEL_LAYER,
  PLACEMENTS,
  PLACEMENT_NAMES,
  PRESENTATION_ROOT,
  panelPaint,
} from "./presentation.js"
import { libraryStylesheet, LIBRARY_CLASS } from "./stylesheet.js"
import { space } from "./tokens.js"

/**
 * A small panel a reader opens beside the thing it explains — the footnote on a
 * spec, the *what does this include* beside a price, the definition under a term
 * in a paragraph.
 *
 * It is the first of the three primitives that declare `present`, and it is the
 * **general** one: 0062's split, applied to a presentation rather than to an
 * arrangement. `loom.menu` is the named presentation for a run of links, and a
 * presentation of anything else lives here — so this primitive's description
 * says *prefer a named presentation where one fits*, for the reason 0062 makes
 * binding: the description is all a model has when it is choosing.
 *
 * ## Its children are children, and that is the whole content model
 *
 * There is no `title` prop, no `body` prop and no `items` array. What a popover
 * holds is a paragraph, or a heading and a paragraph, or a `loom.link-list`, or
 * a `loom.stat` beside a line of prose — which is 0052 twice over: the content
 * is prose, so it is `text` children, and it is repeated, so each piece is a
 * node. A primitive that predicted *heading plus body* would have made the
 * fourth shape unsayable to save one node.
 *
 * The two props that remain are both **arrangements of however-many children
 * there are**, which is the near-miss `docs/primitive-granularity.md` warns
 * about and the side of it that is a real prop: changing either adds no node and
 * removes none.
 *
 * ## What it is not, and the honest reason
 *
 * **It is not a tooltip.** A tooltip opens on hover and on focus, has no button,
 * and says a handful of words. This opens on a press, because the only thing in
 * the vocabulary that opens a region is a control the reader aims at — and a
 * hover-only disclosure is unreachable on every touchscreen ever made, which is
 * why the pattern libraries that keep tooltips also keep a pressable twin. What
 * is genuinely lost is the *icon-only* affordance: the trigger is the runtime's
 * button carrying a word this primitive declares, so an `ⓘ` with no text beside
 * it cannot be built. Filed rather than faked.
 *
 * **Which way it hangs is declared and not measured.** A panel that would fall
 * off the bottom of the window should flip, and whether it would is a fact about
 * a viewport that only script can read. `presentation.ts` carries why this
 * library will not open a client boundary to find out; a page whose popover sits
 * near its footer says `above`.
 */

const props = z
  .object({
    /**
     * Which side of the trigger the panel opens on. Declared, for the reason
     * `presentation.ts` gives — the browser is the only thing that knows there
     * is no room below, and asking it means measuring.
     */
    placement: z.enum(PLACEMENT_NAMES).optional(),
    /** Which edge of the trigger the panel lines up with. */
    align: z.enum(EDGE_NAMES).optional(),
    /**
     * How wide the panel is allowed to get. Two steps rather than a number: a
     * panel is either a line or two of explanation or a small card of it, and a
     * free length is the "tune it a bit" prop `loom.overlay` declined for its
     * scrim.
     */
    width: z.enum(["narrow", "wide"]).optional(),
  })
  .strict()

type Props = z.infer<typeof props>

/**
 * Capped against the window as well as declared, so the wide panel on a 390px
 * phone is a panel and not a horizontal scrollbar. `100vw` minus a gutter at
 * each end, which is the one measurement a stylesheet can make for itself.
 */
const MEASURES: Readonly<Record<"narrow" | "wide", string>> = {
  narrow: "min(18rem, calc(100vw - 2rem))",
  wide: "min(26rem, calc(100vw - 2rem))",
}

/**
 * The trigger's name, which is the primitive's rather than the tree's: a model
 * writes no part of a control's label (0055), and the deployment's dictionary
 * translates this one without anybody remembering to (0063).
 */
const POPOVER_TEXT = { present: "Details" } as const

type PopoverTextKey = keyof typeof POPOVER_TEXT

export const loomPopover = definePrimitive({
  type: "loom.popover",
  description:
    "A panel a reader opens beside the thing it explains, holding whatever it is given; prefer a named presentation where one fits.",
  props,
  slots: [],
  text: POPOVER_TEXT,
  behaviours: ["present"],
  /** It renders a button, so the Gate must not let it sit inside an anchor. */
  interactive: "always",
  component: ({
    loom,
    props: given,
    children,
  }: LoomPrimitiveProps<Props, PopoverTextKey, "present">) =>
    createElement(
      "div",
      {
        ...loom.editable,
        className: LIBRARY_CLASS.popover,
        style: PRESENTATION_ROOT,
      },
      libraryStylesheet(),
      /**
       * A direct child of the root, because the control publishes its state on
       * whatever element it finds itself in and the rule that hides the panel is
       * keyed on the root. `presentation.ts` has the failure this avoids.
       */
      loom.behaviours.present,
      createElement(
        "div",
        {
          key: "panel",
          className: LIBRARY_CLASS.popoverPanel,
          /**
           * Everything that varies by prop, and nothing else. The panel's
           * `display` is in the sheet: it is what the hide rule sets, and an
           * inline value would beat it.
           */
          style: {
            position: "absolute",
            ...PLACEMENTS[given.placement ?? "below"],
            ...EDGES[given.align ?? "start"],
            zIndex: PANEL_LAYER,
            inlineSize: "max-content",
            maxInlineSize: MEASURES[given.width ?? "narrow"],
            gap: space(2),
            padding: space(4),
            ...panelPaint(),
          },
        },
        children
      )
    ),
})
