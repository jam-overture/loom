import { describe, expect, it } from "vitest"

import { err } from "@jam-overture/loom"
import { pageReadingOf } from "@jam-overture/loom/signals"

import { pageFixture } from "@/app/_lib/pages/fixtures"

import { evidenceOf, evidenceText, MINIMUM_OPENED, readEvidence } from "./evidence"
import {
  elementIdsOf,
  NOTHING_DECLARED,
  pageViewsOf,
  readersOn,
  sourcesOf,
  tallyOf,
} from "./fixtures"

const PAGE = pageFixture("home", "Welcome to the shop", 3)
const [ROOT, HEADING] = elementIdsOf(PAGE)

if (ROOT === undefined || HEADING === undefined) throw new Error("the fixture has two elements")

const readingOf = (reachedHeading: number) =>
  pageReadingOf(
    PAGE,
    [
      tallyOf(PAGE, ROOT, { views: 100, reached: 100 }),
      tallyOf(PAGE, HEADING, { views: reachedHeading, reached: reachedHeading }),
    ],
    NOTHING_DECLARED
  )

describe("evidenceOf", () => {
  it("lists every part in reading order with how many readers reached it", () => {
    const evidence = evidenceOf(readingOf(40), [pageViewsOf(PAGE, 100)])

    expect(evidence.ok).toBe(true)
    if (!evidence.ok) return

    expect(evidence.value.opened).toBe(100)
    expect(evidence.value.parts.map((part) => [part.nodeId, part.depth, part.reached])).toEqual([
      [ROOT, 0, 1],
      [HEADING, 1, 0.4],
    ])
  })

  it("keeps a part's words, so the model can tell which one is meant", () => {
    const evidence = evidenceOf(readingOf(40), [pageViewsOf(PAGE, 100)])

    expect(evidence.ok && evidence.value.parts[1]?.words).toBe("Welcome to the shop")
  })

  it(`proposes from nothing below ${MINIMUM_OPENED} page views`, () => {
    expect(evidenceOf(readingOf(5), [pageViewsOf(PAGE, MINIMUM_OPENED - 1)])).toEqual(
      err({ kind: "too-few", opened: MINIMUM_OPENED - 1 })
    )
  })
})

describe("evidenceText", () => {
  it("indents the page by depth and says what readers did on each part", () => {
    const evidence = evidenceOf(readingOf(40), [pageViewsOf(PAGE, 100)])
    if (!evidence.ok) throw new Error("expected evidence")

    const text = evidenceText(evidence.value)

    expect(text).toContain("100 page views were counted on this version.")
    expect(text).toContain(`- ${ROOT} loom.stack: reached by at most 100%`)
    expect(text).toContain(
      `  - ${HEADING} loom.heading "Welcome to the shop": reached by at most 40%`
    )
  })
})

describe("readEvidence", () => {
  it("reads the published version's window and nothing else", async () => {
    const evidence = await readEvidence(readersOn(PAGE, 120), NOTHING_DECLARED, PAGE)

    expect(evidence.ok && evidence.value.opened).toBe(120)
  })

  it("says too few for a page nobody has read", async () => {
    expect(await readEvidence(sourcesOf([], []), NOTHING_DECLARED, PAGE)).toEqual(
      err({ kind: "too-few", opened: 0 })
    )
  })

  it("does not pick one form of a page served in two", async () => {
    const other = { ...tallyOf(PAGE, ROOT, { views: 50, reached: 50 }), audienceId: "aud_members" }
    const sources = sourcesOf(
      [tallyOf(PAGE, ROOT, { views: 50, reached: 50 }), other as never],
      [pageViewsOf(PAGE, 100)]
    )

    expect(await readEvidence(sources, NOTHING_DECLARED, PAGE)).toEqual(err({ kind: "two-forms" }))
  })

  it("says the readings were unavailable when the store did not answer", async () => {
    const sources = {
      tallies: {
        ...readersOn(PAGE, 100).tallies,
        tallies: () => Promise.resolve(err({ code: "unavailable" as const, detail: "gone" })),
      },
    }

    expect(await readEvidence(sources, NOTHING_DECLARED, PAGE)).toEqual(
      err({ kind: "unavailable", detail: "gone" })
    )
  })
})
