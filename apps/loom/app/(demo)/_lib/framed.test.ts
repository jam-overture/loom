import { describe, expect, it } from "vitest"

import { isFramed, type FrameView } from "./framed"

/**
 * The predicate behind both withdrawals, tested where it is pure.
 *
 * The hook that reads a real `window` is one expression (`use-framed.ts`) and
 * the two components that act on the answer are tested against a real frame in
 * `wordmark.test.tsx`. This file is the part that has to be right about the
 * shapes a browser can actually hand it, including the two that are not a
 * frame and look like one.
 */
describe("whether the demonstration is in somebody else's page", () => {
  const view = (self: unknown, top: unknown): FrameView => ({ self, top })

  it("is not framed at the top level, where the two handles are the same window", () => {
    const window = { name: "top" }

    expect(isFramed(view(window, window))).toBe(false)
  })

  it("is framed when the document above is a different window", () => {
    expect(isFramed(view({ name: "me" }, { name: "host" }))).toBe(true)
  })

  /**
   * The cross-origin case, which is the one the identity comparison exists for.
   * A `WindowProxy` for a document this one may not read is still a handle, and
   * comparing it is allowed where reading through it is not — so a third party
   * framing the demonstration gets the same answer the front door does.
   */
  it("is framed by a host it cannot see into", () => {
    const opaque = Object.freeze({})

    expect(isFramed(view({ name: "me" }, opaque))).toBe(true)
  })

  /**
   * Both directions of "cannot tell" take the safe one. A wrong *framed*
   * withdraws the way out of a page that has one, which is a worse failure
   * than a link that behaves as it always has.
   */
  it("is not framed when there is no window at all", () => {
    expect(isFramed(undefined)).toBe(false)
  })

  it("is not framed when the document above is absent", () => {
    expect(isFramed(view({ name: "me" }, undefined))).toBe(false)
    expect(isFramed(view({ name: "me" }, null))).toBe(false)
  })
})
