import { describe, expect, it } from "vitest"

import type { TreeId } from "@loom/runtime"
import type { StoreError } from "@loom/runtime/store"

import { runtimeWordsIn } from "@/app/(portal)/_test/plain-language"

import type { AuditReport } from "./audit-view"
import {
  inWorstFirstOrder,
  plainStanding,
  rowNote,
  standingOf,
  sweepReading,
  type PageCheck,
  type StandingState,
} from "./checkup-sweep"

/**
 * A report is only read here for its tone and its revision, so the rest is
 * filled with the empties `describeAudit` itself produces for a clean audit.
 */
const report = (tone: AuditReport["tone"], revision: number | null = 4): AuditReport => ({
  tone,
  headline: "…",
  detail: "…",
  differences: [],
  names: new Map(),
  omitted: 0,
  recycled: [],
  recyclingOmitted: 0,
  stoppedAt: null,
  revision,
  restored: 0,
})

const unreadable: StoreError = { code: "unavailable", detail: "no connection" } as StoreError

const check = (id: string, state: StandingState, revision = 4): PageCheck => {
  const treeId = id as TreeId

  switch (state) {
    case "nothing-to-check-against":
      return { treeId, standing: { state } }
    case "could-not-be-read":
      return { treeId, standing: { state, error: unreadable } }
    case "adds-up":
      return { treeId, standing: { state, report: report("agrees", revision) } }
    case "does-not-add-up":
      return { treeId, standing: { state, report: report("diverged", revision) } }
    case "could-not-be-finished":
      return { treeId, standing: { state, report: report("unreplayable", null) } }
  }
}

const everything = { everyPage: true }

describe("standingOf", () => {
  it("reads each of the three verdicts as its own standing", () => {
    expect(standingOf(report("agrees")).state).toBe("adds-up")
    expect(standingOf(report("diverged")).state).toBe("does-not-add-up")
    expect(standingOf(report("unreplayable", null)).state).toBe("could-not-be-finished")
  })

  /**
   * The row is a summary and the page behind it is the account. A standing that
   * dropped the report would make the row the only place the verdict exists,
   * and the link under it would lead to a second fold of the same page.
   */
  it("carries the report the row's page will show", () => {
    const standing = standingOf(report("diverged", 9))

    expect(standing.state === "does-not-add-up" && standing.report.revision).toBe(9)
  })
})

describe("plainStanding", () => {
  const STATES: readonly StandingState[] = [
    "adds-up",
    "does-not-add-up",
    "could-not-be-finished",
    "nothing-to-check-against",
    "could-not-be-read",
  ]

  it.each(STATES)("says %s in a person's words", (state) => {
    const word = plainStanding(state)

    expect(word.label.length).toBeGreaterThan(0)
    expect(runtimeWordsIn(`${word.label} ${word.meaning}`)).toEqual([])
  })

  /**
   * Colour is a second channel and never the only one, so the five standings
   * have to be distinguishable with the palette turned off.
   */
  it("gives every standing a label of its own", () => {
    const labels = STATES.map((state) => plainStanding(state).label)

    expect(new Set(labels).size).toBe(STATES.length)
  })

  /**
   * The three that are not a pass must not read as a milder pass. Each says
   * what did *not* happen, which is the distinction the whole module turns on.
   */
  it("never describes an unchecked page as a checked one", () => {
    expect(plainStanding("could-not-be-finished").meaning).toContain("not the same as")
    expect(plainStanding("nothing-to-check-against").meaning).toContain("agree every time")
    expect(plainStanding("could-not-be-read").meaning).toContain("nothing about it was checked")
  })
})

describe("inWorstFirstOrder", () => {
  it("puts the page somebody opened this screen for at the top", () => {
    const ordered = inWorstFirstOrder([
      check("t_a", "adds-up"),
      check("t_b", "nothing-to-check-against"),
      check("t_c", "does-not-add-up"),
      check("t_d", "could-not-be-read"),
      check("t_e", "could-not-be-finished"),
    ])

    expect(ordered.map((entry) => entry.treeId)).toEqual(["t_c", "t_e", "t_d", "t_b", "t_a"])
  })

  /**
   * A press that reshuffled the quiet half of the screen would make two
   * consecutive checks look like two different deployments.
   */
  it("keeps pages of one standing in the order they were listed", () => {
    const ordered = inWorstFirstOrder([
      check("t_1", "adds-up"),
      check("t_2", "adds-up"),
      check("t_3", "adds-up"),
    ])

    expect(ordered.map((entry) => entry.treeId)).toEqual(["t_1", "t_2", "t_3"])
  })

  it("does not modify what it was given", () => {
    const checks = [check("t_a", "adds-up"), check("t_b", "does-not-add-up")]
    inWorstFirstOrder(checks)

    expect(checks.map((entry) => entry.treeId)).toEqual(["t_a", "t_b"])
  })
})

describe("sweepReading — the counts", () => {
  it("counts a page under exactly one heading", () => {
    const reading = sweepReading(
      [
        check("t_a", "adds-up"),
        check("t_b", "adds-up"),
        check("t_c", "does-not-add-up"),
        check("t_d", "could-not-be-finished"),
        check("t_e", "could-not-be-read"),
        check("t_f", "nothing-to-check-against"),
      ],
      everything
    )

    expect(reading.total).toBe(6)
    expect(reading.addUp).toBe(2)
    expect(reading.problems).toBe(1)
    expect(reading.unanswered).toBe(2)
    expect(reading.skipped).toBe(1)
    expect(reading.addUp + reading.problems + reading.unanswered + reading.skipped).toBe(
      reading.total
    )
  })

  /**
   * The whole module in one assertion: *checked* is the pages a verdict was
   * actually reached for, and nothing else may be counted in it.
   */
  it("counts only the pages a verdict was reached for as checked", () => {
    const reading = sweepReading(
      [
        check("t_a", "adds-up"),
        check("t_b", "could-not-be-finished"),
        check("t_c", "could-not-be-read"),
        check("t_d", "nothing-to-check-against"),
      ],
      everything
    )

    expect(reading.checked).toBe(1)
  })

  /**
   * A replay that stopped saw part of a history, and part of a history is not
   * one — the same reason `describeAudit` reports no revision for it.
   */
  it("counts accepted changes only where one was replayed to the end", () => {
    const reading = sweepReading(
      [
        check("t_a", "adds-up", 3),
        check("t_b", "does-not-add-up", 5),
        check("t_c", "could-not-be-finished"),
        check("t_d", "nothing-to-check-against"),
      ],
      everything
    )

    expect(reading.changesReplayed).toBe(8)
  })
})

describe("sweepReading — the verdict", () => {
  it("says everything adds up only when everything did", () => {
    const reading = sweepReading([check("t_a", "adds-up"), check("t_b", "adds-up")], everything)

    expect(reading.tone).toBe("applied")
    expect(reading.label).toBe("Everything adds up.")
    expect(reading.next).toBe("Nothing to do.")
  })

  /**
   * The defect this module exists to make impossible, asserted from both ends:
   * the word must be gone, and the reason must be on the screen.
   */
  it.each([
    ["a page that could not be replayed", "could-not-be-finished" as StandingState],
    ["a page that could not be read", "could-not-be-read" as StandingState],
    ["a page with no starting shape", "nothing-to-check-against" as StandingState],
  ])("never claims everything adds up beside %s", (_label, state) => {
    const reading = sweepReading([check("t_a", "adds-up"), check("t_b", state)], everything)

    expect(reading.label).not.toContain("Everything adds up")
    expect(reading.label + reading.meaning).toMatch(/couldn.t be checked|nothing to check against/iu)
  })

  it("leads with the pages that do not match, however many others are fine", () => {
    const reading = sweepReading(
      [
        check("t_a", "adds-up"),
        check("t_b", "adds-up"),
        check("t_c", "does-not-add-up"),
        check("t_d", "could-not-be-read"),
      ],
      everything
    )

    expect(reading.tone).toBe("rejected")
    expect(reading.label).toBe("One of your pages doesn’t match its own history.")
  })

  it("counts the pages that do not match, in both forms", () => {
    const two = sweepReading(
      [check("t_a", "does-not-add-up"), check("t_b", "does-not-add-up")],
      everything
    )

    expect(two.label).toBe("2 of your pages don’t match their own history.")
  })

  /**
   * Nothing checked is not a clean sweep, and it is the arm a future edit would
   * collapse into the green one because "no problems were found".
   */
  it("refuses to pass a sweep that reached no verdict at all", () => {
    const reading = sweepReading(
      [check("t_a", "nothing-to-check-against"), check("t_b", "nothing-to-check-against")],
      everything
    )

    expect(reading.tone).not.toBe("applied")
    expect(reading.checked).toBe(0)
    expect(reading.label).toContain("Nothing could be checked")
    expect(reading.label).toContain("2 pages")
    expect(reading.next.length).toBeGreaterThan(0)
  })

  it("says which kind of nothing it was", () => {
    const noStart = sweepReading([check("t_a", "nothing-to-check-against")], everything)
    const noAnswer = sweepReading([check("t_a", "could-not-be-read")], everything)

    expect(noStart.meaning).toContain("starting shape")
    expect(noAnswer.meaning).toContain("unreadable")
  })

  it("reports the pages that reached no answer above the ones with nothing to check against", () => {
    const reading = sweepReading(
      [
        check("t_a", "adds-up"),
        check("t_b", "could-not-be-read"),
        check("t_c", "nothing-to-check-against"),
      ],
      everything
    )

    expect(reading.label).toBe("1 of your pages couldn’t be checked.")
    expect(reading.meaning).toContain("a page nobody could check is a page nobody has checked")
  })

  it("says a page with no starting shape was left out rather than passed", () => {
    const reading = sweepReading(
      [check("t_a", "adds-up"), check("t_b", "nothing-to-check-against")],
      everything
    )

    expect(reading.tone).toBe("applied")
    expect(reading.label).toBe("All 1 page that could be checked adds up.")
    expect(reading.meaning).toContain("left out rather than passed")
  })

  /**
   * A count and a verb that disagree — *All 1 page that could be checked add
   * up* — was in this module's first build and was found by the test above
   * asserting the whole sentence rather than a phrase inside it. Both forms
   * are pinned, because a `toContain` on either half passes either way.
   */
  it("agrees its verb with the count on both sides of one", () => {
    const one = sweepReading(
      [check("t_a", "adds-up"), check("t_b", "nothing-to-check-against")],
      everything
    )
    const two = sweepReading(
      [
        check("t_a", "adds-up"),
        check("t_b", "adds-up"),
        check("t_c", "nothing-to-check-against"),
      ],
      everything
    )

    expect(one.label).toBe("All 1 page that could be checked adds up.")
    expect(two.label).toBe("All 2 pages that could be checked add up.")
  })

  it("agrees its verb with the count when nothing was checked at all", () => {
    expect(sweepReading([check("t_a", "could-not-be-read")], everything).label).toBe(
      "Nothing could be checked, so nothing here says your 1 page is fine."
    )
    expect(
      sweepReading(
        [check("t_a", "could-not-be-read"), check("t_b", "could-not-be-read")],
        everything
      ).label
    ).toBe("Nothing could be checked, so nothing here says your 2 pages are fine.")
  })

  it("pluralises the pages it left out", () => {
    const reading = sweepReading(
      [
        check("t_a", "adds-up"),
        check("t_b", "nothing-to-check-against"),
        check("t_c", "nothing-to-check-against"),
      ],
      everything
    )

    expect(reading.meaning).toContain("2 other pages have")
    expect(reading.meaning).toContain("they were left out")
  })

  /**
   * A deployment with no pages has not passed a checkup. It also has not failed
   * one, and the difference is the empty state's whole job.
   */
  it("does not congratulate a deployment with nothing on it", () => {
    const reading = sweepReading([], everything)

    expect(reading.tone).toBe("inapplicable")
    expect(reading.total).toBe(0)
    expect(reading.label).toBe("There are no pages to check.")
    expect(reading.next).toContain("nothing to set up")
  })
})

describe("sweepReading — a listing that did not reach the end", () => {
  /**
   * The honesty the sweep's own limit forces. A screen that claimed a clean
   * bill of health over pages it never listed would be wrong in exactly the way
   * every other arm of this module is built to avoid.
   */
  it("withdraws the word everything when there are more pages than it listed", () => {
    const reading = sweepReading([check("t_a", "adds-up"), check("t_b", "adds-up")], {
      everyPage: false,
    })

    expect(reading.tone).toBe("applied")
    expect(reading.label).toBe("The first 2 pages all add up, and there are more than that.")
    expect(reading.meaning).toContain("nothing on this screen speaks for them")
    expect(reading.next).not.toBe("Nothing to do.")
  })

  it("still leads with a page that does not match when the listing was partial", () => {
    const reading = sweepReading([check("t_a", "does-not-add-up")], { everyPage: false })

    expect(reading.tone).toBe("rejected")
  })
})

describe("every sentence the sweep shows unasked", () => {
  const readings = [
    sweepReading([], everything),
    sweepReading([check("t_a", "adds-up")], everything),
    sweepReading([check("t_a", "adds-up"), check("t_b", "adds-up")], { everyPage: false }),
    sweepReading([check("t_a", "does-not-add-up")], everything),
    sweepReading([check("t_a", "adds-up"), check("t_b", "could-not-be-finished")], everything),
    sweepReading([check("t_a", "adds-up"), check("t_b", "nothing-to-check-against")], everything),
    sweepReading([check("t_a", "nothing-to-check-against")], everything),
    sweepReading([check("t_a", "could-not-be-read")], everything),
  ]

  /**
   * Eight readings, eight different things said — asserted over the whole of
   * each one rather than over its headline, because two of the arms share a
   * headline on purpose. *Nothing could be checked* is the same news whether
   * every page was unreadable or none of them has a starting shape; what
   * differs is the sentence under it, which is the one that tells a reader
   * which of the two they are looking at. A uniqueness check on the headline
   * alone would force those two apart for no reader's benefit.
   */
  it("says something different in every arm", () => {
    const whole = readings.map(
      (reading) => `${reading.label} ${reading.meaning} ${reading.next}`
    )

    expect(new Set(whole).size).toBe(readings.length)
  })

  it("keeps the two arms that share a headline apart in the sentence under it", () => {
    const noStart = sweepReading([check("t_a", "nothing-to-check-against")], everything)
    const noAnswer = sweepReading([check("t_a", "could-not-be-read")], everything)

    expect(noStart.label).toBe(noAnswer.label)
    expect(noStart.meaning).not.toBe(noAnswer.meaning)
  })

  it.each(readings.map((reading) => [reading.label, reading]))(
    "%s reads plainly, and answers what to do now",
    (_label, reading) => {
      expect(runtimeWordsIn(`${reading.label} ${reading.meaning} ${reading.next}`)).toEqual([])
      expect(reading.next.length).toBeGreaterThan(0)
    }
  )
})

describe("rowNote", () => {
  const withDifferences = (listed: number, omitted: number): PageCheck["standing"] => ({
    state: "does-not-add-up",
    report: {
      ...report("diverged"),
      differences: Array.from({ length: listed }, (_, index) => ({
        code: "missing" as const,
        nodeId: `n_${index}` as never,
        label: "loom.prose",
      })),
      omitted,
    },
  })

  const withRecycling = (listed: number, omitted: number): PageCheck["standing"] => ({
    state: "adds-up",
    report: {
      ...report("agrees"),
      recycled: Array.from({ length: listed }, (_, index) => ({
        code: "recycled" as const,
        nodeId: `n_${index}` as never,
        leftAs: "loom.card",
        returnedAs: "text",
        leftAt: 2,
        returnedAt: 5,
      })),
      recyclingOmitted: omitted,
    },
  })

  it("says how much of the page disagrees, not only that some of it does", () => {
    expect(rowNote(withDifferences(3, 0))).toBe("3 parts disagree.")
  })

  /**
   * The count a reader needs is how many parts differ, and the report holds
   * that in two places — the ones it listed and the ones it stopped listing.
   * A note that read only the first would say *25 parts disagree* about a page
   * with four hundred.
   */
  it("counts the differences the report stopped listing", () => {
    expect(rowNote(withDifferences(25, 91))).toBe("116 parts disagree.")
  })

  it("agrees its verb with the count", () => {
    expect(rowNote(withDifferences(1, 0))).toBe("1 part disagrees.")
  })

  /**
   * The case this function exists for. A page can agree with its own history
   * and still have names pointing at two parts (0038), and a row printing only
   * *Adds up* would be the one place in the portal where that finding vanishes.
   */
  it("does not let a green row swallow a recycled name", () => {
    expect(rowNote(withRecycling(1, 0))).toBe(
      "One name here is used for more than one part of the page."
    )
    expect(rowNote(withRecycling(2, 3))).toBe(
      "5 names here are each used for more than one part of the page."
    )
  })

  it("says nothing extra about a page with nothing extra to say", () => {
    expect(rowNote({ state: "adds-up", report: report("agrees") })).toBeNull()
    expect(rowNote({ state: "nothing-to-check-against" })).toBeNull()
    expect(rowNote({ state: "could-not-be-read", error: unreadable })).toBeNull()
    expect(rowNote({ state: "could-not-be-finished", report: report("unreplayable", null) })).toBeNull()
  })

  it("reads plainly wherever it says anything", () => {
    for (const note of [
      rowNote(withDifferences(1, 0)),
      rowNote(withDifferences(4, 0)),
      rowNote(withRecycling(1, 0)),
      rowNote(withRecycling(3, 0)),
    ]) {
      expect(note).not.toBeNull()
      expect(runtimeWordsIn(note ?? "")).toEqual([])
    }
  })
})
