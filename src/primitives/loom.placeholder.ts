import { createElement } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { colour, family, radius, size, space, weight } from "./tokens.js"

/**
 * What a region says when it has nothing to show — and *which* nothing it is.
 *
 * ## The gap, and why it arrived with the binding seam
 *
 * For ninety-three primitives every list on a Loom page was authored, so a list
 * with no children was a page somebody had not finished writing. Bindings
 * changed that:
 * [0058](../../decisions/0058-a-binding-is-a-question-the-tree-asks-answered-before-the-walk.md)
 * lets a region ask a question answered from a source, and **a source can
 * legitimately have nothing to say.** A page whose three services come from a
 * database now has a real, correct, shipped state in which that band is empty —
 * and nothing in the library could draw it, so every surface was going to
 * invent its own "no results yet".
 *
 * ## Two states, because 0058 says collapsing them is the mistake
 *
 * That record is unusually direct about this, and it is the whole of the
 * design here:
 *
 * > **An answer is `ready` or `unavailable` with a reason — never merely
 * > absent.** […] a source with nothing to report answers `ready` with an empty
 * > list. Collapsing those two is the mistake.
 *
 * So `state` is required rather than defaulted, and it has exactly two members:
 *
 * - **`empty`** — the source answered, and the answer is nothing. *You have not
 *   published anything yet.* It is not a failure, nothing is retrying, and the
 *   page should read as finished rather than broken.
 * - **`unavailable`** — the source could not answer. *We could not load this.*
 *   Something is wrong, it is probably temporary, and a visitor who waits may
 *   get a different answer.
 *
 * Telling a visitor their services list is empty when the truth is that a query
 * timed out is the specific failure 0058 exists to prevent, and it is the one a
 * single-state placeholder would have reintroduced at the last hop.
 *
 * **There is no `waiting`.** A binding is answered *before the walk* — that is
 * 0058's title — so a rendered tree never contains a region still waiting for
 * its data, and a loading state would be vocabulary no page could reach. A host
 * that streams is rendering twice, and the first render has an honest answer of
 * its own.
 *
 * ## What it renders, and the one thing that is not decoration
 *
 * A title, a line, and a region for the one thing to do about it. The element
 * changes with the state and that is the accessibility half of the same
 * distinction: **`unavailable` is a `role="status"`**, so a reader who is not
 * looking at that part of the page is told the region failed, while `empty` is
 * an ordinary box because "you have nothing yet" is not an event. A screen
 * reader gets the same two-way distinction the props make.
 *
 * ## Why it is not a `loom.callout`
 *
 * A callout is an `<aside>` — *"an aside a page steps out of its flow to
 * make"* — which is content beside the argument. A placeholder is not beside
 * anything: it **stands in the place of** the content a region was going to
 * hold, and it is the only thing in that region. Rendering it as an aside would
 * put a page's empty services band in the document outline as a digression from
 * itself.
 */

const STATES = ["empty", "unavailable"] as const

const props = z
  .object({
    /**
     * Required, with no default, which is the one deliberate friction in this
     * schema. A default would be a guess about which of the two a page means,
     * and the two mean opposite things to a visitor — so the author says.
     */
    state: z.enum(STATES),
    /** The sentence a reader gets first. Exactly one of it, so 0052 keeps it a prop. */
    title: z.string().min(1).max(120),
    /** The line under it: what to do, or what happened. */
    body: z.string().min(1).max(320).optional(),
  })
  .strict()

type Props = z.infer<typeof props>

export const loomPlaceholder = definePrimitive({
  type: "loom.placeholder",
  description:
    "What a region says when it has nothing to show: state \"empty\" when the source answered with nothing, or \"unavailable\" when it could not answer. Its title and body are props; put one loom.action in its action region.",
  props,
  slots: ["action"],
  component: ({ loom, props: given }: LoomPrimitiveProps<Props>) => {
    const failed = given.state === "unavailable"
    const action = loom.slots["action"]

    return createElement(
      "div",
      {
        ...loom.editable,
        /**
         * Announced only when something went wrong. `role="status"` is polite —
         * it waits for a pause rather than interrupting — which is right for a
         * region that failed to load and wrong for a region that is simply
         * empty, because the second is not news.
         */
        ...(failed ? { role: "status" } : {}),
        style: {
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: space(2),
          textAlign: "center",
          boxSizing: "border-box",
          width: "100%",
          paddingBlock: space(7),
          paddingInline: space(4),
          borderRadius: radius("lg"),
          /**
           * Dashed for `empty` and solid for `unavailable`, which is the same
           * distinction the element makes, drawn. A dashed edge is the
           * convention for a space waiting to be filled; a solid one reads as a
           * panel reporting something. Neither is a colour a palette has to
           * supply beyond the border slots every palette declares.
           */
          border: `1px ${failed ? "solid" : "dashed"} ${colour(failed ? "border-strong" : "border-default")}`,
        },
      },
      createElement(
        "span",
        {
          style: {
            fontFamily: family("heading"),
            fontWeight: weight("heading"),
            fontSize: size(5),
            lineHeight: 1.2,
            color: colour("fg-default"),
          },
        },
        given.title
      ),
      given.body === undefined
        ? null
        : createElement(
            "span",
            {
              style: {
                fontFamily: family("body"),
                fontSize: size(3),
                lineHeight: 1.5,
                color: colour("fg-muted"),
                maxWidth: "46ch",
              },
            },
            given.body
          ),
      /**
       * Wrapped rather than placed directly, and the first screenshot is why:
       * the region the seam hands back is a block that takes the full width, so
       * `align-items: center` on this element centred the title and the body
       * and left the button against the left edge. Centring the *wrapper* is
       * what the eye reads as one column.
       */
      action === undefined
        ? null
        : createElement("div", { style: { display: "flex", justifyContent: "center" } }, action)
    )
  },
})
