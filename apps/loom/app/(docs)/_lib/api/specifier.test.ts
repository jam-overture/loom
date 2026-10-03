import { describe, expect, it } from "vitest"

import { entryPoints } from "@/app/(docs)/_lib/entry-points"

import { specifierSegments } from "./specifier"

/**
 * The splitter, held to the one property that makes it safe to put inside a
 * heading: it does not change the words.
 *
 * Everything else here is about shape. This first block is about the text,
 * because a function that rewrites the name of an import on the page that tells
 * a reader what to type would be worse than the ragged heading it replaces.
 */
describe("splitting an import specifier", () => {
  it("gives back exactly what it was handed, joined up", () => {
    for (const { specifier } of entryPoints) {
      expect(specifierSegments(specifier).join("")).toBe(specifier)
    }
  })

  /**
   * Not just the published ones. The invariant is about any string, and the
   * cases that would break a naive split are the edges — nothing, a bare slash,
   * a trailing one — none of which is a specifier today and any of which could
   * reach this function from a heading somebody writes next year.
   */
  it.each(["", "/", "a/", "/a", "//", "@scope", "@scope/pkg/a/b/c/d"])(
    "joins back up for %o",
    (odd) => {
      expect(specifierSegments(odd).join("")).toBe(odd)
    }
  )

  it("puts one segment per slash, plus the tail", () => {
    for (const { specifier } of entryPoints) {
      const slashes = [...specifier].filter((character) => character === "/").length

      expect(specifierSegments(specifier)).toHaveLength(slashes + 1)
    }
  })

  /**
   * The decision this file records: the slash goes on the end of the part
   * before it, so a line that breaks after one looks unfinished.
   */
  it("keeps each slash at the end of the segment it closes", () => {
    const segments = specifierSegments("@jam-overture/loom/signals/broadcast")

    expect(segments).toEqual(["@jam-overture/", "loom/", "signals/", "broadcast"])
  })

  it("leaves a specifier with no slash whole", () => {
    expect(specifierSegments("react")).toEqual(["react"])
  })

  /**
   * A break opportunity inside a segment would be a break the component never
   * asked for, and the component asks for one between every pair.
   */
  it("never puts a slash anywhere but the end of a segment", () => {
    for (const { specifier } of entryPoints) {
      for (const segment of specifierSegments(specifier)) {
        expect(segment.slice(0, -1)).not.toContain("/")
      }
    }
  })

  /**
   * The floor. Every assertion above walks `entryPoints`, and all of them are
   * satisfied at once by a list with nothing in it — this lane's own 28
   * September entry, *a test derived from the list it checks cannot see the list
   * shrink*.
   */
  it("is asked about more than one real door", () => {
    expect(entryPoints.length).toBeGreaterThan(1)
    expect(entryPoints.filter(({ specifier }) => specifier.includes("/")).length).toBeGreaterThan(1)
  })
})
