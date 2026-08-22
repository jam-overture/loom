import { describe, expect, it } from "vitest"

import { targetOf } from "./page"

/**
 * `/portal/calibration` was renamed to `/portal/trust`, and the 308 that keeps
 * the old links alive builds its own `Location`. That is the part worth a test:
 * a redirect that drops the query string still redirects, still renders, and
 * quietly answers a different question — a link scoped to one page becomes a
 * verdict over every page, and nothing about the result looks wrong.
 */
describe("the old calibration path", () => {
  it("sends the bare route to the new one", () => {
    expect(targetOf(undefined, {})).toBe("/portal/trust")
    expect(targetOf([], {})).toBe("/portal/trust")
  })

  it("carries the scope, so a link about one page stays about one page", () => {
    expect(targetOf(undefined, { tree: "t_42" })).toBe("/portal/trust?tree=t_42")
  })

  it("carries anything else the old link had on it", () => {
    expect(targetOf(undefined, { tree: "t_42", after: "cursor" })).toBe(
      "/portal/trust?tree=t_42&after=cursor"
    )
  })

  it("keeps a repeated parameter repeated rather than picking one", () => {
    expect(targetOf(undefined, { tree: ["t_1", "t_2"] })).toBe("/portal/trust?tree=t_1&tree=t_2")
  })

  it("drops a parameter that was named with no value, rather than inventing one", () => {
    expect(targetOf(undefined, { tree: undefined })).toBe("/portal/trust")
  })

  it("carries a deeper path through, a segment at a time", () => {
    expect(targetOf(["details"], {})).toBe("/portal/trust/details")
  })

  /** A segment is somebody else's input and reaches a URL, so it is encoded. */
  it("encodes what it carries", () => {
    expect(targetOf(["a b"], { tree: "t 1" })).toBe("/portal/trust/a%20b?tree=t+1")
  })
})
