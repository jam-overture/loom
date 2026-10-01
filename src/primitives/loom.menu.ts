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
 * A run of links behind one button — the drop-down every site has in its header
 * and this library could not draw.
 *
 * `loom.nav` can collapse its whole menu behind a button on a phone, which is
 * `disclose` doing the one thing `disclose` does: a region laid out beside its
 * own trigger. What it cannot do is **nest** — a header whose *Product* entry
 * opens four links, a footer whose *Legal* column folds on a phone, the account
 * menu at the end of a bar. A dropped panel is not its button's sibling; it is
 * positioned against it and drawn over the page, and 0176 is the record that
 * says why that needed a different member of the vocabulary.
 *
 * ## Named for the arrangement, and it is the named half of a pair
 *
 * `loom.popover` presents whatever it is handed. This presents a **run of
 * links**, laid out as rows a reader runs a cursor down, and 0062's rule is why
 * both exist rather than one with a prop: the general one is the floor, the
 * named one is what a tree should say when it fits, and *menu* is what a person
 * calls this. The name carries no hyphen, so 0054's stem rule reads it as a
 * whole name rather than as a container that lost its child — the same reading
 * `loom.mosaic` and `loom.grid` get.
 *
 * Its children are children, for 0052's plainest reason: a menu grows and
 * shrinks by `insert` and `remove`, which is the whole argument against an
 * `items: MenuItem[]` prop. They are `loom.link` nodes in every use anybody has
 * written down, and nothing here requires that — a `loom.action` as the last row
 * of an account menu is a tree this primitive renders correctly without knowing.
 *
 * ## The rows are a rule, and they have to be
 *
 * A menu row is the full width of the panel, with a background under the cursor
 * rather than an underline under the words. `loom.link` sets its own `display`,
 * colour and type inline and deliberately leaves **padding** off the element —
 * the note in its own file says so, in as many words, because `loom.link-pager`
 * needed exactly that. So the rows here are the pager's pattern a second time: a
 * rule on the panel's direct children, which reaches a `loom.link` and an
 * `loom.action` alike and reaches nothing else on the page.
 *
 * The one thing it has to undo is the underline wipe, which is a background
 * image on `.loom-underline` and would animate under a row that is already
 * painting a background of its own.
 */

const props = z
  .object({
    /** Which side of the button the panel drops. See `presentation.ts`. */
    placement: z.enum(PLACEMENT_NAMES).optional(),
    /**
     * Which edge of the button the panel lines up with. `end` is what a menu at
     * the right-hand end of a bar wants, and the only alternative to measuring
     * the window — which `presentation.ts` explains this library will not do.
     */
    align: z.enum(EDGE_NAMES).optional(),
  })
  .strict()

type Props = z.infer<typeof props>

/**
 * The button's name, which is this primitive's and not the tree's (0055). It is
 * the one real limit on this primitive and it is stated here rather than
 * discovered: a header with two of these has two buttons reading *Menu*, because
 * nothing in the behaviour seam lets a node name a control. A finding is filed.
 */
const MENU_TEXT = { present: "Menu" } as const

type MenuTextKey = keyof typeof MENU_TEXT

export const loomMenu = definePrimitive({
  type: "loom.menu",
  description:
    "A run of loom.link behind one button, dropped over the page — the nested menu in a header or the folded column in a footer.",
  props,
  slots: [],
  text: MENU_TEXT,
  behaviours: ["present"],
  interactive: "always",
  component: ({ loom, props: given, children }: LoomPrimitiveProps<Props, MenuTextKey, "present">) =>
    createElement(
      "div",
      {
        ...loom.editable,
        className: LIBRARY_CLASS.menu,
        style: PRESENTATION_ROOT,
      },
      libraryStylesheet(),
      loom.behaviours.present,
      createElement(
        "div",
        {
          key: "panel",
          className: LIBRARY_CLASS.menuPanel,
          style: {
            position: "absolute",
            ...PLACEMENTS[given.placement ?? "below"],
            ...EDGES[given.align ?? "start"],
            zIndex: PANEL_LAYER,
            minInlineSize: "14rem",
            /**
             * Capped against the window as well as against itself, because a
             * panel aligned to one edge of a trigger grows **away** from it:
             * a trigger near the left of a phone with `align: "end"` hangs its
             * panel off the left of the page, where nothing can scroll to it.
             * The cap bounds that and does not abolish it — a panel cannot know
             * whether it fits, which is filed.
             */
            maxInlineSize: "min(18rem, calc(100vw - 2rem))",
            padding: space(2),
            ...panelPaint(),
          },
        },
        children
      )
    ),
})
