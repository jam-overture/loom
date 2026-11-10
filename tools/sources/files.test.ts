import { describe, expect, it } from "vitest"

import { everySource, sweepBudget } from "./files.js"

/**
 * The budget the whole-repository sweeps run under.
 *
 * What is asserted is the shape rather than a number of milliseconds: that it
 * is a function of how much there is to read, and that it has a floor. A budget
 * that did not grow with the repository is the thing that turned the merge gate
 * red on a diff which cost the sweep nothing.
 */
describe("the budget for a sweep over every source", () => {
  const sources = everySource()

  it("grows with the number of sources, so it cannot erode as the repository does", () => {
    const twice = [...sources, ...sources]

    expect(sweepBudget(twice)).toBeGreaterThan(sweepBudget(sources))
  })

  it("allows a sweep at least twenty milliseconds a source", () => {
    expect(sweepBudget(sources)).toBeGreaterThanOrEqual(sources.length * 20)
  })

  it("keeps a floor, so a sweep over a handful of files still has room", () => {
    expect(sweepBudget([])).toBeGreaterThanOrEqual(10_000)
  })

  it("is far above the default a timeout would otherwise have", () => {
    expect(sweepBudget(sources)).toBeGreaterThan(5_000)
  })
})
