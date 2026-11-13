import { describe, expect, it } from "vitest"

import {
  LANDMARKS_COUNTED,
  copyPositionsIn,
  describeUnmeasured,
  landmarksOf,
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

/**
 * The rule the reading of 8 November was wrong about, character for character.
 *
 * 78 bytes, and the two runs of eight or more escape-safe characters it holds
 * exactly once are `background-color` and `color-scheme` — the first of which
 * a document that is mostly CSS holds hundreds of times.
 */
const DARK_ROOT = [":root {", "  background-color: #0a0a0a;", "  color: #f5f5f5;", "  color-scheme: dark;", "}"].join(
  "\n",
)

/** A library stylesheet's shape: the same property names, over and over, in rules nothing else shares. */
const LIBRARY = Array.from(
  { length: 8 },
  (_, nth) =>
    `.loom-panel-${nth} { background-color: var(--loom-surface-${nth}); border-radius: 0.${nth}rem; outline-offset: ${nth}px; }`,
).join("\n")

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

describe("landmarksOf", () => {
  it("takes the escape-safe tokens the text contains exactly once, in the text's order", () => {
    expect(landmarksOf(STYLESHEET).map((landmark) => landmark.token)).toEqual([
      "prefers-reduced-motion",
      ".loom-halo-trace",
      "animation",
      ".loom-trend-plot",
      ".loom-stat",
      "grid-auto-columns",
    ])
  })

  it("measures each landmark from the one before it, so a copy can be followed", () => {
    const landmarks = landmarksOf(STYLESHEET)

    expect(landmarks[0]?.since).toBe(0)
    expect(landmarks.reduce((at, landmark) => at + landmark.since, 0)).toBe(
      STYLESHEET.indexOf("grid-auto-columns") - STYLESHEET.indexOf("prefers-reduced-motion"),
    )
  })

  it("never spans a character escaping would rewrite, so a copy still matches", () => {
    expect(landmarksOf("loom-trend-plot>loom-stat-label").map((landmark) => landmark.token)).toEqual([
      "loom-trend-plot",
      "loom-stat-label",
    ])
  })

  it("rejects a token the text repeats, however long", () => {
    expect(landmarksOf("the-same-long-token and the-same-long-token")).toEqual([])
  })

  it("is empty when nothing in the text is long enough to be a landmark", () => {
    expect(landmarksOf("a > b { c: d }")).toEqual([])
  })

  it("keeps the longest when the text has more than it counts by, ties breaking lexicographically", () => {
    const text = Array.from({ length: LANDMARKS_COUNTED + 2 }, (_, nth) => `landmark-token-${nth}`).join(" ")

    expect(landmarksOf(text).map((landmark) => landmark.token)).toEqual(
      Array.from({ length: LANDMARKS_COUNTED }, (_, nth) => `landmark-token-${nth}`),
    )
  })

  it("prefers a longer token to an earlier one, because a copy is likelier to be alone in carrying it", () => {
    const text = `${Array.from({ length: 7 }, (_, nth) => `shorter-${nth}`).join(" ")} a-much-longer-landmark`

    expect(landmarksOf(text).map((landmark) => landmark.token)).toEqual([
      "shorter-0",
      "shorter-1",
      "shorter-2",
      "shorter-3",
      "shorter-4",
      "a-much-longer-landmark",
    ])
  })
})

describe("copyPositionsIn", () => {
  it("gives one position per copy, in order", () => {
    const document = `<style>${STYLESHEET}</style>${asFlightPayload(STYLESHEET)}`
    const at = copyPositionsIn(document, STYLESHEET)

    expect(at).toHaveLength(2)
    expect(at[0]).toBeLessThan(at[1] ?? 0)
  })

  it("is empty for a text whose count would rest on one landmark", () => {
    expect(copyPositionsIn("background-color: red", "background-color: red")).toEqual([])
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

  it("declines to measure a text whose count would rest on a single landmark", () => {
    const text = "html { background-color: red }"
    const measured = repetitionIn(`<style>${text}</style>${asFlightPayload(text)}`, text)

    expect(landmarksOf(text).map((landmark) => landmark.token)).toEqual(["background-color"])
    expect(measured.ok).toBe(false)
    if (measured.ok) return
    expect(measured.error.code).toBe("one-landmark")
    expect(describeUnmeasured(measured.error)).toContain("only one run")
    expect(describeUnmeasured(measured.error)).toContain(`${text.length} bytes`)
  })

  it("counts zero copies for a text the document does not carry at all", () => {
    const measured = repetitionIn("nothing of the sort in here", STYLESHEET)

    expect(measured.ok).toBe(true)
    if (!measured.ok) return
    expect(measured.value.copies).toBe(0)
    expect(measured.value.repeatedBytes).toBe(0)
  })

  /**
   * The reading of 8 November, reconstructed.
   *
   * `pnpm weigh` printed *78 bytes carried 426 times, at least 33,150 bytes
   * repeated* for a rule the document held **twice**, because its landmark was
   * `background-color` and the library stylesheet beside it is 48KB of CSS
   * carried once per primitive in the flight payload. 426 is not an estimate
   * being loose: it is one token's count standing in for a copy's.
   */
  describe("a landmark the rest of the document uses is not a count", () => {
    const document = [
      `<style href="loom-primitives">${LIBRARY}</style>`,
      `<style href="loom-marketing-document">${DARK_ROOT}</style>`,
      "<body class=\"loom-panel-0\">",
      ...Array.from({ length: 52 }, () => `self.__next_f.push([1,"${asFlightPayload(LIBRARY)}"])`),
      `self.__next_f.push([1,"${asFlightPayload(DARK_ROOT)}"])`,
    ].join("")

    it("is the number the defect was reported with", () => {
      expect(DARK_ROOT.length).toBe(78)
      expect(occurrencesOf(document, "background-color")).toBe(426)
    })

    it("counts the copies the document holds and not the token's occurrences", () => {
      const measured = repetitionIn(document, DARK_ROOT)

      expect(measured.ok).toBe(true)
      if (!measured.ok) return
      expect(measured.value.copies).toBe(2)
      expect(measured.value.repeatedBytes).toBe(78)
    })

    it("still counts the stylesheet whose copies are the thing worth finding", () => {
      const measured = repetitionIn(document, LIBRARY)

      expect(measured.ok).toBe(true)
      if (!measured.ok) return
      expect(measured.value.copies).toBe(53)
      expect(measured.value.repeatedBytes).toBe(LIBRARY.length * 52)
    })
  })

  it("is not fooled by a landmark the page also carries in its markup", () => {
    const document = [
      `<style href="loom-primitives">${STYLESHEET}</style>`,
      '<div class="loom-halo-trace"><p class="loom-trend-plot loom-stat">text</p></div>',
      asFlightPayload(STYLESHEET),
      '<div class="loom-halo-trace animation-none grid-auto-columns-3"></div>',
    ].join("")

    const measured = repetitionIn(document, STYLESHEET)

    expect(occurrencesOf(document, "loom-halo-trace")).toBe(4)
    expect(measured.ok).toBe(true)
    if (!measured.ok) return
    expect(measured.value.copies).toBe(2)
  })

  /**
   * The span that is one copy's tail and the next copy's head, which is what
   * two landmarks at a plausible distance are otherwise satisfied by: the last
   * `background-color` of a stylesheet, and the `color-scheme` of the rule
   * encoded after it. The copy this document holds is the payload one, and the
   * position says which was counted.
   */
  it("will not take a span that carries one of the landmarks twice for a copy", () => {
    const document = `<style>${LIBRARY}</style>${asFlightPayload(DARK_ROOT)}`

    expect(copyPositionsIn(document, DARK_ROOT)).toEqual([document.lastIndexOf("background-color")])
  })

  it("will not take landmarks closer together than the text puts them for a copy", () => {
    const squeezed = "background-color:#0a0a0a;color-scheme:dark"

    expect(DARK_ROOT.indexOf("color-scheme") - DARK_ROOT.indexOf("background-color")).toBeGreaterThan(
      squeezed.indexOf("color-scheme") - squeezed.indexOf("background-color"),
    )
    expect(copyPositionsIn(`<style>${squeezed}</style>`, DARK_ROOT)).toEqual([])
  })
})
