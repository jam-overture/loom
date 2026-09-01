import { describe, expect, it } from "vitest"

import { everyMemberOf } from "./closed-set.js"

/**
 * The two properties `everyMemberOf` has, one of which a test cannot see.
 *
 * Rejecting an incomplete list is a **compile-time** property, and a test that
 * called it with one would not compile, so there is nothing to assert here and
 * nothing that could fail at run time. What is asserted below is the half that
 * runs: the list arrives unchanged, in the order it was written, with its
 * members intact.
 *
 * The compile-time half is covered where it matters instead — by the three
 * lists in this package that use it, each of which would stop `pnpm typecheck`
 * on the day its union grows and its list does not. That is the check, and it
 * is the reason the helper exists rather than a convention about remembering.
 */
describe("a list that names every member of a union", () => {
  type Kind = "held" | "refused" | "committed"

  it("hands back what it was given, in the order it was written", () => {
    expect(everyMemberOf<Kind>()(["held", "refused", "committed"])).toEqual([
      "held",
      "refused",
      "committed",
    ])
  })

  it("keeps the literal types, so a caller can index the list rather than widen it", () => {
    const kinds = everyMemberOf<Kind>()(["held", "refused", "committed"])
    const first: "held" = kinds[0]

    expect(first).toBe("held")
  })
})
