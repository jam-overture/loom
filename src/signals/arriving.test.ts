import { describe, expect, it } from "vitest"

import {
  ARRIVAL_STANDINGS,
  arrivalStandingOf,
  describeArrivalStanding,
  type ArrivalStanding,
  type TurnedAwayTally,
} from "./arriving.js"
import { treeIdSchema, type TreeId } from "../ids.js"

import type { CollectionHealth, PageHealth } from "./health.js"

/**
 * The two inputs, built as small as the reading actually reads them: it takes
 * the `Pick` of a health reading, so a page here needs only to exist and to be
 * distinct from its neighbours.
 */

type Reason = "wrong-site" | "closed" | "unreadable"

const AT = 1_760_000_000_000

const treeId = (name: string): TreeId => treeIdSchema.parse(name) as TreeId

const page = (name: string): PageHealth => ({
  treeId: treeId(name),
  revision: 1,
  audienceId: null,
  standing: "sound",
  faults: [],
  views: 25,
  arrivals: 100,
  appearances: 100,
  inflation: 0,
  pending: 0,
  foldedAt: null,
  orphaned: 0,
  doubled: 0,
})

const health = (pages: readonly string[], arrivals: number): Pick<
  CollectionHealth,
  "pages" | "arrivals"
> => ({ pages: pages.map(page), arrivals })

const NOTHING = health([], 0)
const COLLECTING = health(["t_pricing", "t_home"], 900)

const tally = (
  reason: Reason,
  refused: number,
  lastAt: number,
  lastOrigin: string | null = "https://copy.example"
): TurnedAwayTally<Reason> => ({ reason, refused, lastAt, lastOrigin })

describe("arrivalStandingOf — which of two silences a quiet deployment is in", () => {
  it("calls a deployment nothing was collected about and nothing was refused by silent", () => {
    const standing = arrivalStandingOf(NOTHING, [])

    expect(standing.standing).toBe("silent")
    expect(standing.refused).toBe(0)
    expect(standing.newest).toBeNull()
  })

  it("calls a deployment nothing was collected about whose door refused deliveries turned-away", () => {
    const standing = arrivalStandingOf(NOTHING, [tally("wrong-site", 12, AT)])

    expect(standing.standing).toBe("turned-away")
    expect(standing.refused).toBe(12)
    expect(standing.newest).toEqual({
      reason: "wrong-site",
      origin: "https://copy.example",
      atMs: AT,
      sinceMs: null,
    })
  })

  it("calls a deployment with rows and no refusals collecting", () => {
    expect(arrivalStandingOf(COLLECTING, []).standing).toBe("collecting")
  })

  it("calls a deployment with rows and refusals mixed, rather than either one", () => {
    const standing = arrivalStandingOf(COLLECTING, [tally("closed", 3, AT)])

    expect(standing.standing).toBe("mixed")
    expect(standing.newest?.reason).toBe("closed")
  })

  it("refuses the question where nothing offered a count, rather than calling it silent", () => {
    const standing = arrivalStandingOf(NOTHING, undefined)

    expect(standing.standing).toBe("unasked")
    expect(standing.refused).toBeNull()
    expect(standing.newest).toBeNull()
  })

  it("refuses the question where nothing offered a count and rows were collected", () => {
    expect(arrivalStandingOf(COLLECTING, undefined).standing).toBe("unasked")
  })

  it("keeps a read counter holding none apart from no counter at all (0240)", () => {
    expect(arrivalStandingOf(NOTHING, []).refused).toBe(0)
    expect(arrivalStandingOf(NOTHING, undefined).refused).toBeNull()
  })

  it("reads what was collected off the pages and never off the arrivals", () => {
    /**
     * A deployment whose senders never mark an opening has counters and no door
     * rows, so `arrivals` is nought while collection is plainly working — its
     * own fault already, and not a sign that nothing arrived.
     */
    const unscaled = arrivalStandingOf(health(["t_pricing"], 0), [tally("closed", 4, AT)])

    expect(unscaled.standing).toBe("mixed")
    expect(unscaled.collected).toBe(1)
    expect(unscaled.arrivals).toBe(0)
  })

  it("publishes every standing it can reach, and the closed set names them all", () => {
    expect(ARRIVAL_STANDINGS).toEqual([
      "unasked",
      "silent",
      "turned-away",
      "collecting",
      "mixed",
    ])

    const reached = new Set([
      arrivalStandingOf(NOTHING, undefined).standing,
      arrivalStandingOf(NOTHING, []).standing,
      arrivalStandingOf(NOTHING, [tally("wrong-site", 1, AT)]).standing,
      arrivalStandingOf(COLLECTING, []).standing,
      arrivalStandingOf(COLLECTING, [tally("wrong-site", 1, AT)]).standing,
    ])

    expect([...ARRIVAL_STANDINGS].filter((name) => !reached.has(name))).toEqual([])
  })
})

describe("arrivalStandingOf — the newest refusal, which is the one acted on", () => {
  it("names the newest reason rather than the first or the largest", () => {
    const standing = arrivalStandingOf(NOTHING, [
      tally("wrong-site", 400, AT),
      tally("closed", 2, AT + 5_000),
      tally("unreadable", 9, AT + 1_000),
    ])

    expect(standing.newest?.reason).toBe("closed")
    expect(standing.newest?.atMs).toBe(AT + 5_000)
  })

  it("keeps the earlier of two reasons counted at one instant, so a refresh does not reorder them", () => {
    const standing = arrivalStandingOf(NOTHING, [
      tally("wrong-site", 1, AT),
      tally("closed", 1, AT),
    ])

    expect(standing.newest?.reason).toBe("wrong-site")
  })

  it("carries no origin as a value rather than as a blank", () => {
    const standing = arrivalStandingOf(NOTHING, [tally("wrong-site", 3, AT, null)])

    expect(standing.newest?.origin).toBeNull()
  })

  it("ignores a reason reporting a nought, because it says nothing was turned away for it", () => {
    const standing = arrivalStandingOf(NOTHING, [
      tally("wrong-site", 0, AT + 9_000),
      tally("closed", 6, AT),
    ])

    expect(standing.newest?.reason).toBe("closed")
    expect(standing.refused).toBe(6)
  })

  it("calls a counter whose every reason reports a nought a deployment nothing was refused by", () => {
    const standing = arrivalStandingOf(NOTHING, [
      tally("wrong-site", 0, AT),
      tally("closed", 0, AT + 1),
    ])

    expect(standing.standing).toBe("silent")
    expect(standing.refused).toBe(0)
    expect(standing.newest).toBeNull()
  })

  it("ages the newest refusal against an instant handed in, and never a clock", () => {
    const standing = arrivalStandingOf(NOTHING, [tally("wrong-site", 2, AT)], AT + 240_000)

    expect(standing.newest?.sinceMs).toBe(240_000)
  })

  it("withholds the age where no instant was handed in, and publishes every other figure", () => {
    const standing = arrivalStandingOf(NOTHING, [tally("wrong-site", 2, AT)])

    expect(standing.newest?.sinceMs).toBeNull()
    expect(standing.newest?.atMs).toBe(AT)
    expect(standing.refused).toBe(2)
  })

  it("subtracts a counter ahead of the instant rather than special-casing it (0274)", () => {
    const standing = arrivalStandingOf(NOTHING, [tally("wrong-site", 2, AT + 1_000)], AT)

    expect(standing.newest?.sinceMs).toBe(-1_000)
  })

  it("names a refusal whenever it publishes one, and never one without the other", () => {
    const windows: readonly (readonly TurnedAwayTally<Reason>[])[] = [
      [],
      [tally("wrong-site", 0, AT)],
      [tally("wrong-site", 5, AT)],
      [tally("wrong-site", 0, AT), tally("closed", 1, AT + 1)],
    ]

    for (const turnedAway of windows) {
      for (const pages of [NOTHING, COLLECTING]) {
        const standing = arrivalStandingOf(pages, turnedAway)
        const named = standing.standing === "turned-away" || standing.standing === "mixed"

        expect(named).toBe(standing.newest !== null)
      }
    }
  })
})

describe("arrivalStandingOf — the case it would double-count", () => {
  it("adds one reason once, however many rows of it were handed in", () => {
    const standing = arrivalStandingOf(NOTHING, [
      tally("wrong-site", 12, AT),
      tally("wrong-site", 12, AT + 1_000),
    ])

    expect(standing.refused).toBe(12)
    expect(standing.duplicated).toBe(1)
  })

  it("keeps the first row of a repeated reason, so the figure does not depend on the order", () => {
    const standing = arrivalStandingOf(NOTHING, [
      tally("closed", 3, AT),
      tally("closed", 99, AT + 1_000),
    ])

    expect(standing.refused).toBe(3)
    expect(standing.newest?.atMs).toBe(AT)
  })

  it("counts every row beyond the first, across reasons", () => {
    const standing = arrivalStandingOf(NOTHING, [
      tally("wrong-site", 1, AT),
      tally("closed", 1, AT),
      tally("wrong-site", 1, AT),
      tally("closed", 1, AT),
      tally("closed", 1, AT),
    ])

    expect(standing.refused).toBe(2)
    expect(standing.duplicated).toBe(3)
  })

  it("reports nothing duplicated where each reason arrived once", () => {
    const standing = arrivalStandingOf(NOTHING, [
      tally("wrong-site", 4, AT),
      tally("closed", 5, AT),
      tally("unreadable", 6, AT),
    ])

    expect(standing.refused).toBe(15)
    expect(standing.duplicated).toBe(0)
  })

  it("reports nothing duplicated where no counter was offered at all", () => {
    expect(arrivalStandingOf(COLLECTING, undefined).duplicated).toBe(0)
  })

  it("adds the pages it was handed and never counts one twice", () => {
    /**
     * Two revisions of one tree are two live versions of one page, which is the
     * rule every count of pages in this subsystem keeps (0250, 0257) — so this
     * reading adds the rows a health reading published and derives nothing of
     * its own about which of them are the same page.
     */
    expect(arrivalStandingOf(health(["t_a", "t_a", "t_b"], 10), []).collected).toBe(3)
  })

  it("carries the arrivals a health reading added, and adds nothing to them", () => {
    expect(arrivalStandingOf(health(["t_a"], 1_100), []).arrivals).toBe(1_100)
  })
})

describe("describeArrivalStanding", () => {
  const line = (standing: ArrivalStanding): string => describeArrivalStanding(standing)

  it("says which of the two silences a quiet deployment is in", () => {
    expect(line(arrivalStandingOf(NOTHING, []))).toBe(
      "nothing has been collected and nothing has been turned away, " +
        "so no page is posting to this deployment at all"
    )
    expect(line(arrivalStandingOf(NOTHING, [tally("wrong-site", 12, AT)]))).toBe(
      "nothing has been collected and 12 deliveries were turned away, " +
        "the latest of them wrong-site, from https://copy.example: " +
        "a page is posting and this door is refusing it"
    )
  })

  it("says that a deployment with no counter cannot be told apart either way", () => {
    expect(line(arrivalStandingOf(NOTHING, undefined))).toBe(
      "nothing counted what this door turned away, so a deployment nobody is posting to " +
        "cannot be told from one whose deliveries are being refused"
    )
  })

  it("names the reason as the deployment spelled it, and never translates one", () => {
    expect(line(arrivalStandingOf(NOTHING, [tally("unreadable", 1, AT)]))).toContain("unreadable")
  })

  it("makes no site named a sentence rather than a blank", () => {
    expect(line(arrivalStandingOf(NOTHING, [tally("wrong-site", 2, AT, null)]))).toContain(
      "the latest of them wrong-site and naming no site"
    )
  })

  it("counts one delivery and one version in the singular", () => {
    expect(line(arrivalStandingOf(NOTHING, [tally("closed", 1, AT)]))).toContain(
      "1 delivery was turned away"
    )
    expect(line(arrivalStandingOf(health(["t_a"], 1), []))).toBe(
      "1 page view was counted at the door across 1 version of 1 page, " +
        "and nothing has been turned away"
    )
  })

  it("gives the live states both figures, because the pair is the sentence", () => {
    expect(line(arrivalStandingOf(COLLECTING, []))).toBe(
      "900 page views were counted at the door across 2 versions, " +
        "and nothing has been turned away"
    )
    expect(line(arrivalStandingOf(COLLECTING, [tally("closed", 4, AT)]))).toBe(
      "900 page views were counted at the door across 2 versions, " +
        "and 4 deliveries were turned away, the latest of them closed, from https://copy.example"
    )
  })

  it("has a line for every standing in the closed set", () => {
    for (const standing of ARRIVAL_STANDINGS) {
      expect(describeArrivalStanding({
        standing,
        collected: 1,
        arrivals: 1,
        refused: 1,
        newest: { reason: "closed", origin: null, atMs: AT, sinceMs: null },
        duplicated: 0,
      })).not.toBe("")
    }
  })
})
