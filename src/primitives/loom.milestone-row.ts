import { createElement } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { libraryStylesheet, LIBRARY_CLASS } from "./stylesheet.js"
import { space } from "./tokens.js"

/**
 * The same entries as a `loom.milestone-list`, laid **across** rather than
 * down: the *how it works* band, three or four steps wide, each with its
 * number over its title and a connector running to the next.
 *
 * Every landing page in the world has this band and this library could not say
 * it. What it had was a rail — one column, marker on the left, dots joined by a
 * vertical line — which is right for a history and wrong for a process: a
 * roadmap is read *down* because time runs that way, and three steps are read
 * *across* because they are meant to be taken in at once.
 *
 * ## Why this is a second container and not a second child
 *
 * The tempting shape is `loom.step` — a numeral, a title, a sentence — and it
 * would have been a third primitive rendering the three fields
 * `loom.milestone` already renders. 0054 says what to build instead: **a
 * container is its child's name plus the arrangement**, so a run of milestones
 * laid in a row is a `loom.milestone-row`, exactly as a run of them down a rail
 * is a `loom.milestone-list`. The port map's collapse rule agrees from the
 * other side — two blocks are two primitives when they want different *markup*,
 * and a step wants the same markup in a different direction.
 *
 * That distinction cost something real to honour, and it is the finding worth
 * carrying forward. **A child that lays itself out inline cannot be rearranged
 * by its container.** `loom.milestone` set its own grid columns, its rail's
 * direction and its dot's optical offset as inline styles, and an inline style
 * beats a rule in `stylesheet.ts` — so no parent could have flipped any of
 * them, and the only reachable answer would have been the duplicate child.
 * Four declarations moved into the stylesheet and the second arrangement became
 * possible; nothing about a milestone rendered on a rail changed.
 *
 * ## Why the arrangement word is `row` and not `grid`
 *
 * Three previous runs in this lane proposed a `-list` and shipped a `-grid`,
 * because what those containers do is `repeat(auto-fit, minmax(…))` and 0054
 * names the container for what it actually does. This one is a **wrapping flex
 * row** — the entries take a basis and share what is left, so four steps are
 * four columns, five are five, and a phone gets one under another with no
 * breakpoint anywhere. That is a row, so it is called one, and the same
 * discipline that produced two `-grid`s produces a `-row` here.
 *
 * It shares `density` and `rail` with `loom.milestone-list` rather than
 * inventing near-synonyms, because the two containers are one family and a
 * model choosing between them should find the same two questions on both.
 */

const props = z
  .object({
    /** How far apart the steps sit. `tight` reads as a strip; `loose` as a band. */
    density: z.enum(["tight", "loose"]).optional(),
    /**
     * The connector between one step and the next. `none` keeps the dots and
     * drops the line, for a band of steps that are parallel rather than
     * sequential — the same word, meaning the same thing, as on the list.
     */
    rail: z.enum(["line", "none"]).optional(),
  })
  .strict()

type Props = z.infer<typeof props>

const GAP_FOR: Readonly<Record<"tight" | "standard" | "loose", string>> = {
  tight: space(4),
  standard: space(5),
  loose: space(6),
}

export const loomMilestoneRow = definePrimitive({
  type: "loom.milestone-row",
  description:
    "A run of loom.milestone entries laid across the page — the “how it works” band of numbered steps. Wraps to one column on a narrow screen.",
  props,
  slots: [],
  component: ({ loom, props: given, children }: LoomPrimitiveProps<Props>) =>
    createElement(
      "ol",
      {
        ...loom.editable,
        className: [
          LIBRARY_CLASS.milestoneRow,
          /**
           * The list's own class, reused rather than copied. Its rule —
           * `.loom-rail-none .loom-rail-line { visibility: hidden }` — is
           * scoped to a library class and not to the list, so it reaches an
           * entry in either container and the two arrangements cannot drift
           * apart on what `rail: "none"` means.
           */
          given.rail === "none" ? LIBRARY_CLASS.railNone : undefined,
        ]
          .filter((name) => name !== undefined)
          .join(" "),
        style: {
          /**
           * The gap is the one thing here that no rule has to vary, so it is
           * the one thing set inline. Everything else about this arrangement —
           * the wrap, the entries' basis, the order their three parts take —
           * is in the stylesheet, because it is applied to children this
           * primitive does not render.
           */
          gap: GAP_FOR[given.density ?? "standard"],
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
