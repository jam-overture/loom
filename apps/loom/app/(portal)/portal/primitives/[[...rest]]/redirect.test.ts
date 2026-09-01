import { describe, expect, it } from "vitest"

import { targetOf } from "./page"

/**
 * `/portal/primitives` was renamed to `/portal/pieces`, and the 308 that keeps
 * the old links alive builds its own `Location`.
 *
 * No query string is carried here, unlike the calibration redirect, because this
 * screen has never taken one — it lists what the deployment registered and there
 * is nothing to scope it by. A test asserting the absence would be asserting a
 * fact about today; what is worth pinning is the part a later scope would have
 * to keep working, which is the path.
 */
describe("the old primitives path", () => {
  it("sends the bare route to the new one", () => {
    expect(targetOf(undefined)).toBe("/portal/pieces")
    expect(targetOf([])).toBe("/portal/pieces")
  })

  it("carries a deeper path through, a segment at a time", () => {
    expect(targetOf(["loom.card"])).toBe("/portal/pieces/loom.card")
    expect(targetOf(["a", "b"])).toBe("/portal/pieces/a/b")
  })

  /** A segment is somebody else's input and reaches a URL, so it is encoded. */
  it("encodes what it carries", () => {
    expect(targetOf(["a b"])).toBe("/portal/pieces/a%20b")
  })
})
