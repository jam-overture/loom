import { describe, expect, it } from "vitest"

import { keptBy, PAGE_FILTER_NAME, readPageFilter } from "./page-filter"

describe("the filter somebody asked for", () => {
  it("reads the one the data can answer", () => {
    expect(readPageFilter("waiting")).toBe("waiting")
  })

  /**
   * `changed` is the prototype's fourth entry and is deliberately not a filter:
   * a revision number counts what has happened to one page, so it cannot order
   * two. Reading it as no filter is the same answer a typo gets.
   */
  it("reads the one it cannot answer as no filter at all", () => {
    expect(readPageFilter("changed")).toBeUndefined()
  })

  it("reads anything else as no filter rather than refusing the screen", () => {
    expect([readPageFilter("nonsense"), readPageFilter(""), readPageFilter(7), readPageFilter(undefined)]).toEqual([
      undefined,
      undefined,
      undefined,
      undefined,
    ])
  })

  it("has a name for every filter it reads", () => {
    const filter = readPageFilter("waiting")

    expect(filter === undefined ? undefined : PAGE_FILTER_NAME[filter]).toBe("Waiting on you")
  })
})

describe("which pages a filter keeps", () => {
  it("keeps everything when there is no filter", () => {
    expect(keptBy(undefined, { waiting: 0, unreadable: 0 })).toBe(true)
  })

  it("keeps a page with a change waiting for an answer", () => {
    expect(keptBy("waiting", { waiting: 2, unreadable: 0 })).toBe(true)
  })

  /**
   * A row the store could place and this build could not read is still
   * something waiting on somebody — `pagesWaitingSummary` counts it separately
   * and this screen must not drop it, or the one page that needs looking at
   * hardest is the one the filter hides.
   */
  it("keeps a page whose only waiting change could not be read", () => {
    expect(keptBy("waiting", { waiting: 0, unreadable: 1 })).toBe(true)
  })

  it("drops a page with nothing waiting", () => {
    expect(keptBy("waiting", { waiting: 0, unreadable: 0 })).toBe(false)
  })

  /** `null` is a hold listing that would not answer, which is not a count of none. */
  it("treats a count that could not be read as none of its own", () => {
    expect(keptBy("waiting", { waiting: null, unreadable: 0 })).toBe(false)
  })
})
