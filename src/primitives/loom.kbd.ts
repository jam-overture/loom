import { createElement } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { colour, monospace, radius, weight } from "./tokens.js"

/**
 * One key, as a key cap — `⌘`, `K`, `Esc`.
 *
 * The granularity doc's second atomic case, stated in three words the same way
 * `loom.badge` is: a key is a key. There is no interior to carve at and nothing
 * a `move` could usefully reach inside, so the only thing a tree says about one
 * is what is printed on it.
 *
 * **A shortcut is several of these, not one of these.** `⌘ K` is two keys, and
 * the reason this primitive has no `keys` array is 0052's opening clause read
 * exactly: an array prop would put both caps outside the delta model, so
 * changing a chord's second key would be a `configure` carrying the whole chord
 * and neither cap would have an author. Two nodes in a `loom.stack` set to a
 * row with a tight gap is the composition, and every operation on it is one a
 * reviewer can read.
 *
 * It carries no props at all, which makes it the only primitive here with an
 * empty schema — and that is the honest shape rather than an oversight. A size
 * prop was the obvious candidate and is wrong: a key cap sits *inside a line of
 * text* far more often than it stands alone, so it takes its size from what it
 * is set in, which is what `em` is for and what no enum could get right for
 * both cases at once.
 *
 * The cap is `<kbd>`, which is the element browsers and screen readers already
 * know means keyboard input, and the raised edge is a thicker bottom border
 * rather than a shadow: a shadow needs a colour that is neither the surface nor
 * the border, and there is no palette slot that means "a little darker than
 * this" without becoming ink under a palette that reads it as one.
 */

const props = z.object({}).strict()

type Props = z.infer<typeof props>

export const loomKbd = definePrimitive({
  type: "loom.kbd",
  description:
    "One key cap — ⌘, K, Esc. Its legend is a child; compose a chord as several of these in a loom.stack row.",
  props,
  slots: [],
  component: ({ loom, children }: LoomPrimitiveProps<Props>) =>
    createElement(
      "kbd",
      {
        ...loom.editable,
        style: {
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          /**
           * Sized in `em` against the text it sits in, deliberately. Every
           * other length in this library comes off the preset's scale; a cap
           * that did the same would be the same physical size inside a lede and
           * inside a footnote, and would stop reading as part of the sentence
           * in both.
           */
          minWidth: "1.9em",
          paddingBlock: "0.15em",
          paddingInline: "0.45em",
          /**
           * The muted surface rather than the plain one, so a cap reads as a
           * cap on **both** grounds it actually lands on: a `bg-surface` face
           * sitting on a `bg-surface` card is a cap defined by its border
           * alone, which under the dark palette is very nearly invisible.
           */
          background: colour("bg-surface-muted"),
          border: `1px solid ${colour("border-default")}`,
          /** The raised edge. It is the whole of what makes this read as a cap. */
          borderBlockEndWidth: "2px",
          borderBlockEndColor: colour("border-strong"),
          borderRadius: radius("sm"),
          color: colour("fg-default"),
          fontFamily: monospace(),
          fontSize: "0.85em",
          fontWeight: weight("body"),
          lineHeight: 1.4,
          /** A cap is never two lines, and a legend that would wrap is a label. */
          whiteSpace: "nowrap",
        },
      },
      children
    ),
})
