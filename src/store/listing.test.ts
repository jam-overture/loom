import { describe, expect, it } from "vitest"

import { clampListingLimit, DEFAULT_LISTING_LIMIT, MAX_LISTING_LIMIT } from "./store.js"

/**
 * The clamp is a pure function of the request, so it is tested here rather than
 * through a store. Every implementation calls it, which is what stops one of them
 * honouring a limit the others refuse.
 */
describe("clampListingLimit", () => {
  it("defaults when unasked, caps when asked for too much, and never returns zero", () => {
    expect(clampListingLimit(undefined)).toBe(DEFAULT_LISTING_LIMIT)
    expect(clampListingLimit(Number.NaN)).toBe(DEFAULT_LISTING_LIMIT)
    expect(clampListingLimit(10_000)).toBe(MAX_LISTING_LIMIT)
    expect(clampListingLimit(0)).toBe(1)
    expect(clampListingLimit(-5)).toBe(1)
    expect(clampListingLimit(2.7)).toBe(2)
  })
})
