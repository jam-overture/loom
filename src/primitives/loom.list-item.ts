import { createElement } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

/**
 * One point in a `loom.list`. An `<li>`, and named for it.
 *
 * It carries no props, which is the second time this library has arrived there
 * and the same reason both times: there is nothing about a point that is not
 * either its text or a fact about the list it sits in. `loom.kbd` reached the
 * empty schema by having one thing printed on it; this reaches it by having
 * every candidate prop belong one level up. Marker, density, size and measure
 * are all properties of the *run* — a list whose third row was numbered and
 * whose fourth was not is not a list — so they are the container's, and a row
 * that could disagree with its siblings would be a bug with a schema behind it.
 *
 * **Its content is children rather than a `text` prop**, which is 0052's third
 * clause and the call `loom.badge`, `loom.action` and `loom.code` all make: one
 * string that is the whole of what a node says is prose, so it is a text node
 * with an author, a history and an inverse of its own. It is also what lets a
 * point hold something other than a string — a `loom.emphasis` on the word that
 * carries the distinction, a `loom.code-span` naming a symbol, a `loom.link` to
 * the page that explains it. A `text: string` prop would have made every one of
 * those unreachable, and the run of `loom.prose` nodes this pair replaces could
 * not express them either.
 *
 * A `loom.list` nested inside one of these is an ordinary child and renders as
 * a sublist, with the indent and the gap the stylesheet gives it. Nothing here
 * needs to know that happened.
 *
 * **Why the `-item` suffix, when 0054 says never.** 0054's rule is that the
 * child is the singular thing and the container is that word plus its
 * arrangement — `loom.stat` under `loom.stat-grid`. It assumes the child *has*
 * a singular noun, and this one does not: what a list repeats is whatever the
 * page happens to be saying — a sentence, a clause, a link, a symbol. The rule's
 * *input* is missing rather than its output being wrong, so this is not an
 * exception to it. It is two records that are already accepted, composing:
 *
 * - **The container** is named for the arrangement alone, which is
 *   [0062](../../decisions/0062-a-general-arranger-is-named-for-the-arrangement-alone.md)
 *   exactly — the rule that named `loom.stack`, `loom.grid` and `loom.mosaic`,
 *   *because* a container that repeats nothing in particular has no child word
 *   to build a name out of. `loom.list` is the fourth of those, and it trips no
 *   part of the stem test that enforces 0054: that test strips an arrangement
 *   word with its hyphen, and `loom.list` has none.
 * - **The child** is named for the element it is, which is
 *   [0061](../../decisions/0061-a-suffix-that-names-the-markup-earns-its-place.md)
 *   extended by one step. 0061 licensed the suffix for a primitive with a twin
 *   — `loom.perk` and `loom.perk-list-item` being one content model in two
 *   elements. Here there is no twin, and the suffix still earns its place,
 *   because the element is the only thing there is to name.
 *
 * The practical test is 0054's own — the name a model guesses when it has read
 * no part of the catalogue — and this pair passes it more plainly than a coined
 * noun would. `loom.point` under `loom.point-list` was the alternative and
 * satisfies 0054 with no amendment at all; it was rejected because *point* is
 * invented. Nothing calls a numbered step a point, so a model has to read the
 * catalogue to find it, and it reads wrongly for an ordered list — which is the
 * tell that the noun is a naming convenience rather than a description.
 *
 * **This is stated here rather than as a decision record**, and deliberately:
 * the record would have been `0085`, `0084` is on an unmerged pull request from
 * this lane, and `pnpm decisions:index` refuses a gap. That is the 21 August
 * governance finding, hit by a second lane; the precedent set the same day is
 * to fold the reasoning into the code and the report rather than to stack.
 */

const props = z.object({}).strict()

type Props = z.infer<typeof props>

export const loomListItem = definePrimitive({
  type: "loom.list-item",
  description:
    "One point in a loom.list. Its text is a child, so it may hold a link, an emphasis or a code span rather than only a string.",
  props,
  slots: [],
  component: ({ loom, children }: LoomPrimitiveProps<Props>) =>
    createElement(
      "li",
      /**
       * No style at all, which is the point rather than an omission. The gap
       * between rows is the list's — set from the stylesheet, because a row
       * cannot know how far it should sit from a sibling it cannot see — and
       * the type is inherited, because a row that restated it would be a row
       * that could disagree with the list it is in.
       */
      { ...loom.editable },
      children
    ),
})
