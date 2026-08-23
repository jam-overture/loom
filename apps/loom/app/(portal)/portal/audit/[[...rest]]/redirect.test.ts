import { describe, expect, it } from "vitest"

import { targetOf } from "./page"

/**
 * `/portal/audit` was renamed to `/portal/checkup`, and the 308 that keeps the
 * old links alive builds its own `Location`.
 *
 * The query string is the part worth a test, and it matters more here than it
 * did for `/portal/trust`. There `?tree=` narrowed a page that answers without
 * it; here it *is* the request — drop it and a link to one page's result lands
 * on the chooser, which renders, looks right, and answers nothing.
 */
describe("the old audit path", () => {
  it("sends the bare route to the new one", () => {
    expect(targetOf(undefined, {})).toBe("/portal/checkup")
    expect(targetOf([], {})).toBe("/portal/checkup")
  })

  it("carries the tree, which on this page is the whole request", () => {
    expect(targetOf(undefined, { tree: "t_42" })).toBe("/portal/checkup?tree=t_42")
  })

  it("carries anything else the old link had on it", () => {
    expect(targetOf(undefined, { tree: "t_42", after: "cursor" })).toBe(
      "/portal/checkup?tree=t_42&after=cursor"
    )
  })

  it("keeps a repeated parameter repeated rather than picking one", () => {
    expect(targetOf(undefined, { tree: ["t_1", "t_2"] })).toBe("/portal/checkup?tree=t_1&tree=t_2")
  })

  it("drops a parameter that was named with no value, rather than inventing one", () => {
    expect(targetOf(undefined, { tree: undefined })).toBe("/portal/checkup")
  })

  it("carries a deeper path through, a segment at a time", () => {
    expect(targetOf(["details"], {})).toBe("/portal/checkup/details")
  })

  /** A segment is somebody else's input and reaches a URL, so it is encoded. */
  it("encodes what it carries", () => {
    expect(targetOf(["a b"], { tree: "t 1" })).toBe("/portal/checkup/a%20b?tree=t+1")
  })

  /**
   * Three renames now redirect to three different places, all built by a
   * function with the same name in the same shape of file. Copying one and
   * forgetting to change the destination is the mistake this shape invites, and
   * it would send every old audit link to the trust page — which loads.
   */
  it("never lands on another renamed route's destination", () => {
    const landed = targetOf(undefined, { tree: "t_42" })

    expect(landed).not.toContain("/portal/trust")
    expect(landed).not.toContain("/portal/pages")
    expect(landed).not.toContain("/portal/audit")
  })
})
