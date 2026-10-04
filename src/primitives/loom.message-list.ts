import { createElement } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { libraryStylesheet } from "./stylesheet.js"
import { space, type RampStep } from "./tokens.js"

/**
 * A conversation, in order: a run of `loom.message` turns down the page.
 *
 * Named by [0054](../../decisions/0054-a-container-is-its-childs-name-plus-the-arrangement.md)
 * from the child it repeats, which is why it is not `loom.chat` or
 * `loom.transcript`. The same list is a chat when its turns are a person and an
 * assistant, an interview when they are two people, and a log when a system
 * line sits between them — naming the container for one of its uses would have
 * made the other two look like primitives that do not exist. The cost is that
 * "chat" is what a person says out loud, so the description says it for them.
 *
 * An `<ol>` rather than a stack of divs, because the order **is** the content:
 * a transcript read out of sequence is a different conversation. That is the
 * same reason `loom.milestone-list` is one, and it is why a page should reach
 * for this rather than a `loom.stack` of cards.
 *
 * It lays out and nothing else. It does not style its turns and does not
 * require them to be turns: rendering is total
 * ([0008](../../decisions/0008-the-renderer-is-a-total-pure-projection.md)), and
 * a list that blanked itself over an unexpected child would fail worse than one
 * with something odd in it.
 *
 * **There is no `speaker` on the list**, and the omission is the point. Every
 * prop that would set a default for its children — a side, a name, a portrait —
 * is a decision that belongs to a turn, and the renderer does not inject props
 * into children ([0009](../../decisions/0009-primitives-receive-props-in-a-bag.md)).
 * A list that carried one would give a model two places to say the same thing
 * and *n* chances to leave them disagreeing.
 */

const props = z
  .object({
    /**
     * How far apart the turns sit. `tight` reads as one rapid exchange;
     * `loose` gives a long conversation somewhere to breathe.
     */
    density: z.enum(["tight", "loose"]).optional(),
  })
  .strict()

type Props = z.infer<typeof props>

const GAPS: Readonly<Record<"tight" | "normal" | "loose", RampStep>> = {
  tight: 3,
  normal: 4,
  loose: 5,
}

export const loomMessageList = definePrimitive({
  type: "loom.message-list",
  description:
    "A conversation in order — a run of loom.message turns down the page. The chat, interview or transcript band.",
  props,
  slots: [],
  copy: [],
  component: ({ loom, props: given, children }: LoomPrimitiveProps<Props>) =>
    createElement(
      "ol",
      {
        ...loom.editable,
        style: {
          display: "flex",
          flexDirection: "column",
          gap: space(GAPS[given.density ?? "normal"]),
          margin: "0",
          padding: "0",
          width: "100%",
          listStyle: "none",
        },
      },
      libraryStylesheet(),
      children
    ),
})
