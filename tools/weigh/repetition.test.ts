import { describe, expect, it } from "vitest"

import {
  describeUnmeasured,
  fingerprintOf,
  occurrencesOf,
  positionsOf,
  repetitionIn,
} from "./repetition.js"

/**
 * The escaping that made this instrument necessary, as a function.
 *
 * What the RSC flight payload does to a stylesheet: JSON-escapes it and writes
 * `<` and `>` as `\u003c` and `\u003e`. Written here rather than imported
 * because the fixture's job is to be a copy that shares **no long substring**
 * with the original, which is the property the whole module turns on.
 */
const asFlightPayload = (text: string): string =>
  JSON.stringify(text).slice(1, -1).replace(/</g, "\\u003c").replace(/>/g, "\\u003e")

const STYLESHEET = [
  "@media (prefers-reduced-motion: reduce) {",
  "  .loom-halo-trace { animation: none; }",
  "}",
  ".loom-trend-plot > .loom-stat { grid-auto-columns: minmax(3.5rem, 1fr); }",
].join("\n")

describe("occurrencesOf", () => {
  it("counts non-overlapping matches", () => {
    expect(occurrencesOf("aaaa", "aa")).toBe(2)
  })

  it("is zero for a needle that is absent", () => {
    expect(occurrencesOf("loom", "weave")).toBe(0)
  })
})

describe("positionsOf", () => {
  it("gives the start of every non-overlapping match in order", () => {
    expect(positionsOf("x..x..x", "x")).toEqual([0, 3, 6])
  })
})

describe("fingerprintOf", () => {
  it("is the longest escape-safe token the text contains exactly once", () => {
    expect(fingerprintOf(STYLESHEET)).toBe("prefers-reduced-motion")
  })

  it("never spans a character escaping would rewrite, so a copy still matches", () => {
    expect(fingerprintOf("loom-trend-plot>loom-stat-label")).toBe("loom-stat-label")
  })

  it("rejects a token the text repeats, however long", () => {
    expect(fingerprintOf("the-same-long-token and the-same-long-token")).toBeUndefined()
  })

  it("is undefined when nothing in the text is long enough to be a landmark", () => {
    expect(fingerprintOf("a > b { c: d }")).toBeUndefined()
  })

  it("breaks ties lexicographically, so two runs agree", () => {
    expect(fingerprintOf("alphabet1 alphabet2")).toBe("alphabet1")
  })
})

describe("repetitionIn", () => {
  it("counts a copy that shares no long substring with the original", () => {
    const document = `<style>${STYLESHEET}</style>${asFlightPayload(STYLESHEET)}`

    const measured = repetitionIn(document, STYLESHEET)

    expect(measured.ok).toBe(true)
    if (!measured.ok) return
    expect(measured.value.copies).toBe(2)
    expect(measured.value.repeatedBytes).toBeGreaterThan(0)
  })

  it("is the defect the instrument was written for: one element, many payload copies", () => {
    const copies = 6
    const document = [
      `<style href="loom-primitives">${STYLESHEET}</style>`,
      ...Array.from({ length: copies - 1 }, () => asFlightPayload(STYLESHEET)),
    ].join("")

    const measured = repetitionIn(document, STYLESHEET)

    expect(measured.ok).toBe(true)
    if (!measured.ok) return
    expect(measured.value.copies).toBe(copies)
    expect(measured.value.repeatedBytes).toBe(STYLESHEET.length * (copies - 1))
  })

  it("stays under the true saving, because an encoded copy is larger than the text", () => {
    const encoded = asFlightPayload(STYLESHEET)
    const document = `<style>${STYLESHEET}</style>${encoded}`

    const measured = repetitionIn(document, STYLESHEET)

    expect(encoded.length).toBeGreaterThan(STYLESHEET.length)
    expect(measured.ok).toBe(true)
    if (!measured.ok) return
    expect(measured.value.repeatedBytes).toBeLessThanOrEqual(encoded.length)
  })

  it("charges nothing for a text the document carries once", () => {
    const measured = repetitionIn(`<style>${STYLESHEET}</style>`, STYLESHEET)

    expect(measured.ok).toBe(true)
    if (!measured.ok) return
    expect(measured.value.copies).toBe(1)
    expect(measured.value.repeatedBytes).toBe(0)
  })

  it("declines to measure a text with no unique landmark rather than estimating", () => {
    const measured = repetitionIn("padding", "x > y")

    expect(measured.ok).toBe(false)
    if (measured.ok) return
    expect(measured.error.code).toBe("no-landmark")
    expect(describeUnmeasured(measured.error)).toContain("no landmark")
  })

  it("counts zero copies for a text the document does not carry at all", () => {
    const measured = repetitionIn("nothing of the sort in here", STYLESHEET)

    expect(measured.ok).toBe(true)
    if (!measured.ok) return
    expect(measured.value.copies).toBe(0)
    expect(measured.value.repeatedBytes).toBe(0)
  })
})
