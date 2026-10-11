// A primitive of your own: one service, and how it is doing right now.
//
// This is the file *A primitive of your own* shows, read off disk as that page
// builds. It is an ordinary module in an ordinary project — nothing in it is
// available to the documentation site and not to you.
//
// Three decisions are worth watching for, because they are the three every
// primitive has to make:
//
//   1. What is a prop and what is a child. A service has one name and one
//      state, so those are props. The detail underneath repeats, so it is
//      children.
//   2. What a string may be. Every string here has a maximum, and `state` is
//      a closed set rather than free text.
//   3. Where the words a reader sees come from. The state words are declared
//      beside the component rather than written inside it, so a deployment can
//      translate them.

import { createElement } from "react"
import { z } from "zod"

import { colour, hairline, radius, space, weight } from "@jam-overture/loom/primitives"
import type { LoomPrimitiveProps } from "@jam-overture/loom/react"
import { definePrimitive } from "@jam-overture/loom/sdk"

/**
 * The words for the three states, and the reason they are not in the component.
 *
 * A primitive shows strings that are not in the tree — this one shows the word
 * for a state the tree names as `offline`. Declaring them means a deployment can
 * hand back its own, and `loom.text` reads whichever is in force.
 */
const STATE_WORDS = {
  operational: "Operational",
  degraded: "Degraded",
  offline: "Offline",
} as const

type StateWord = keyof typeof STATE_WORDS

const props = z
  .object({
    service: z.string().min(1).max(60),
    /**
     * A closed set, which is the whole point of writing this primitive rather
     * than a paragraph. A model may move a service from `operational` to
     * `degraded`; it cannot invent `on fire`, and no schema anywhere has to be
     * consulted to know that.
     */
    state: z.enum(["operational", "degraded", "offline"]),
    /** When it started, as the author wrote it — "09:14 UTC", "Tuesday". */
    since: z.string().min(1).max(40).optional(),
  })
  .strict()

type Props = z.infer<typeof props>

/**
 * The badge's two colours per state, taken from the theme and never typed.
 *
 * Nothing here is green, amber or red, and that is not squeamishness: a Loom
 * palette names a canvas, an accent and a set of borders, and it names no
 * colour that means *bad*. A primitive that reached for `#b91c1c` would look
 * right under the palette its author had open and would survive every re-theme
 * unchanged, which is the one failure the token helpers exist to prevent.
 *
 * So the state is carried by the **word**, and the badge only says how much
 * attention it is asking for.
 */
const BADGE: Readonly<Record<StateWord, { readonly background: string; readonly color: string }>> = {
  operational: { background: colour("bg-surface-muted"), color: colour("fg-muted") },
  degraded: { background: colour("accent-subtle"), color: colour("accent-strong") },
  offline: { background: colour("fg-default"), color: colour("bg-surface") },
}

export const serviceStatus = definePrimitive({
  type: "status.service",
  description:
    "One service and how it is doing right now. Its children are the detail, one sentence per node. Do not use it for anything nobody is measuring — an unmeasured service is worse than an absent one.",
  props,
  slots: [],
  /** The props a reader reads as words. `state` is a state, not copy. */
  copy: ["service", "since"],
  text: STATE_WORDS,
  component: ({ loom, props: given, children }: LoomPrimitiveProps<Props, StateWord>) =>
    createElement(
      "div",
      {
        /*
         * Spread it, always. A primitive that drops this renders perfectly and
         * cannot be selected in the portal, and nothing anywhere reports it.
         */
        ...loom.editable,
        style: {
          display: "grid",
          gap: space(2),
          padding: space(4),
          border: `1px solid ${hairline()}`,
          borderRadius: radius("md"),
          background: colour("bg-surface"),
        },
      },
      createElement(
        "div",
        { style: { display: "flex", alignItems: "center", gap: space(3) } },
        createElement(
          "span",
          { style: { fontWeight: weight("heading"), color: colour("fg-default") } },
          given.service
        ),
        createElement(
          "span",
          {
            style: {
              ...BADGE[given.state],
              padding: `${space(1)} ${space(2)}`,
              borderRadius: radius("full"),
              fontSize: "0.75em",
            },
          },
          loom.text[given.state]
        ),
        given.since === undefined
          ? null
          : createElement("span", { style: { color: colour("fg-subtle"), fontSize: "0.85em" } }, given.since)
      ),
      children
    ),
})
