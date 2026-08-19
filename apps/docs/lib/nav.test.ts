import { describe, expect, it } from "vitest"

import {
  docsEntryAt,
  docsEntryPoint,
  docsHref,
  docsNeighbours,
  docsOrder,
  docsSections,
} from "./nav"

describe("the navigation model", () => {
  it("gives every page a unique href", () => {
    const hrefs = docsOrder.map((entry) => entry.href)

    expect(new Set(hrefs).size).toBe(hrefs.length)
  })

  it("lists no section without pages", () => {
    expect(docsSections.every((section) => section.pages.length > 0)).toBe(true)
  })

  it("keeps reading order the order the sections declare", () => {
    const first = docsSections[0]?.pages[0]

    expect(docsOrder[0]?.href).toBe(docsHref("getting-started", first?.slug ?? ""))
  })

  it("finds the entry behind an href", () => {
    const entry = docsEntryAt("/docs/getting-started/introduction")

    expect(entry?.page.title).toBe("Introduction")
    expect(entry?.section.title).toBe("Getting started")
  })

  it("knows nothing about an href it does not have", () => {
    expect(docsEntryAt("/docs/getting-started/nowhere")).toBeUndefined()
    expect(docsNeighbours("/docs/getting-started/nowhere")).toEqual({})
  })

  it("leaves the first page with no previous and the last with no next", () => {
    const first = docsOrder[0]
    const last = docsOrder[docsOrder.length - 1]

    expect(docsNeighbours(first?.href ?? "").previous).toBeUndefined()
    expect(docsNeighbours(last?.href ?? "").next).toBeUndefined()
  })

  it("walks forwards and backwards to the same pair", () => {
    const [, second] = docsOrder
    const here = second?.href ?? ""
    const { previous, next } = docsNeighbours(here)

    expect(previous?.href).toBe(docsOrder[0]?.href)
    expect(docsNeighbours(next?.href ?? "").previous?.href).toBe(here)
  })

  it("crosses a section boundary rather than stopping at it", () => {
    const boundary = docsOrder.findIndex(
      (entry, index) => index > 0 && entry.section !== docsOrder[index - 1]?.section
    )

    expect(boundary).toBeGreaterThan(0)
    expect(docsNeighbours(docsOrder[boundary - 1]?.href ?? "").next?.href).toBe(
      docsOrder[boundary]?.href
    )
  })

  it("enters at the first page of the first section", () => {
    expect(docsEntryPoint()).toBe(docsOrder[0]?.href)
  })

  it("gives every page a summary that reads as a sentence", () => {
    for (const { page } of docsOrder) {
      expect(page.summary.length).toBeGreaterThan(20)
      expect(page.summary.endsWith(".")).toBe(true)
    }
  })
})
