import { describe, expect, it } from "vitest"

import { err, nodeIdSchema } from "@jam-overture/loom"
import { pageReadingOf, type StoredTally } from "@jam-overture/loom/signals"

import { pageFixture } from "@/app/_lib/pages/fixtures"

import { pageStopsOf, readPageStops, wordCountOf } from "./page-stops"
import { namesInTree } from "./part-name"
import { elementIdsOf, NOTHING_DECLARED, readersOn, sourcesOf, tallyOf } from "./proposing/fixtures"

const PAGE = pageFixture("home", "Welcome to the shop", 3)
const [ROOT, HEADING] = elementIdsOf(PAGE)

if (ROOT === undefined || HEADING === undefined) throw new Error("the fixture has two elements")

const readingOf = (tallies: readonly StoredTally[]) =>
  pageReadingOf(PAGE, tallies, NOTHING_DECLARED)

const ROOT_READ = tallyOf(PAGE, ROOT, { views: 100, reached: 100 })

describe("pageStopsOf", () => {
  it("names each place reading stopped by what the page calls it, with what it costs and the words nobody reached", () => {
    expect(pageStopsOf([readingOf([ROOT_READ])], PAGE)).toEqual({
      kind: "read",
      version: 3,
      views: 100,
      parts: 2,
      unseen: 1,
      places: 1,
      costliest: [{ nodeId: HEADING, name: namesInTree(PAGE).get(HEADING)?.name, unseen: 1 }],
      words: ["Welcome to the shop"],
      notReporting: [],
    })
  })

  it("finds no place readers stopped where every part was reached", () => {
    const stops = pageStopsOf(
      [readingOf([ROOT_READ, tallyOf(PAGE, HEADING, { views: 40, reached: 40 })])],
      PAGE
    )

    expect(stops.kind === "read" && [stops.places, stops.unseen, stops.costliest]).toEqual([
      0,
      0,
      [],
    ])
  })

  it("keeps a part that was on screen without saying so apart from the places readers stopped", () => {
    const stops = pageStopsOf(
      [readingOf([tallyOf(PAGE, HEADING, { views: 40, reached: 40 })])],
      PAGE
    )

    expect(stops.kind === "read" && stops.notReporting.map((part) => part.nodeId)).toEqual([ROOT])
  })

  it("says nobody opened the version where the window held no reading of it", () => {
    expect(pageStopsOf([], PAGE)).toEqual({ kind: "unopened", version: 3 })
  })

  it("refuses a page served in more than one form", () => {
    const reading = readingOf([ROOT_READ])

    expect(pageStopsOf([reading, reading], PAGE)).toEqual({ kind: "two-forms" })
  })

  it("refuses counters that name a part the version does not hold, before anything else", () => {
    const gone = { ...ROOT_READ, nodeId: nodeIdSchema.parse("n_gone") }

    expect(pageStopsOf([readingOf([ROOT_READ, gone])], PAGE)).toEqual({
      kind: "mismatched",
      orphaned: 1,
    })
  })
})

describe("readPageStops", () => {
  it("has nothing to read for a page the site has not published", async () => {
    expect(await readPageStops(readersOn(PAGE, 10), NOTHING_DECLARED, undefined)).toEqual({
      kind: "unpublished",
    })
  })

  it("reads the published version's window", async () => {
    const stops = await readPageStops(sourcesOf([ROOT_READ], []), NOTHING_DECLARED, PAGE)

    expect(stops.kind === "read" && [stops.places, stops.unseen]).toEqual([1, 1])
  })

  it("says it could not read counters that did not answer", async () => {
    const sources = sourcesOf([], [])
    const failing = {
      tallies: {
        ...sources.tallies,
        tallies: () => Promise.resolve(err({ code: "unavailable", detail: "timed out" } as const)),
      },
    }

    expect(await readPageStops(failing, NOTHING_DECLARED, PAGE)).toEqual({ kind: "unreadable" })
  })
})

describe("wordCountOf", () => {
  it("counts words across passages, not passages", () => {
    expect(wordCountOf(["Pricing", "Pay as  you go", " "])).toBe(5)
  })
})
