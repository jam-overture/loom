import { applyDelta, buildElement, createTree, sequentialIdFactory, type LoomTree } from "@loom/runtime"
import { describe, expect, it } from "vitest"

import { piecesIn } from "../measure"
import { treeFor } from "../render"
import { DEFAULT_THEME, HOME, THE_RULES } from "../site"
import { ASKS, askById } from "./asks"
import { runAsk } from "./run"
import {
  askedAgain,
  askedFirst,
  cameBack,
  roundTripsOn,
  weighedDifferently,
  withoutARoundTrip,
} from "./round-trip"

/**
 * A change put through and brought back, held to what the sequence returned.
 *
 * The page these runs feed makes one claim a reader is asked to take on trust
 * rather than check — *the page afterwards is the page you arrived on* — so it
 * is the claim asserted hardest here, in the one form that is evidence for it:
 * the whole page written out, names and all. A count would pass on a page
 * rebuilt from the source, which is the exact thing the claim denies.
 */

const ORIGIN = "https://loom.example"

const frontDoor = (): LoomTree => treeFor(HOME, { origin: ORIGIN, theme: DEFAULT_THEME })

const shapeOf = (page: LoomTree): string => JSON.stringify(page.root)

describe("every round trip the front door can be put through", () => {
  it("is one per request that changes anything, in the order they are offered", async () => {
    const trips = await roundTripsOn(frontDoor())
    const changing = ASKS.filter((ask) => ask.answer !== "refused")

    expect(trips.map((trip) => trip.ask)).toEqual(changing.map((ask) => ask.id))
  })

  /**
   * The refused request has no round trip, and the band says so rather than
   * quietly printing four rows under five buttons.
   */
  it("leaves out the one request that is refused, and names it", async () => {
    const trips = await roundTripsOn(frontDoor())
    const left = withoutARoundTrip(trips)

    expect(left.map((ask) => ask.id)).toEqual(["drop-pitch"])
    expect(left.every((ask) => ask.answer === "refused")).toBe(true)
  })

  /**
   * The page's whole claim, and the only assertion its honesty rests on.
   *
   * Compared as the page written out rather than as a count, because *the same
   * pieces, not new ones that read the same* is a claim about the name on every
   * piece and a count cannot tell those two apart.
   */
  it("comes back to the page the visitor arrived on, piece for piece and name for name", async () => {
    const base = frontDoor()

    for (const trip of await roundTripsOn(base)) {
      expect({ ask: trip.ask, restored: trip.restored, identical: trip.identical }).toEqual({
        ask: trip.ask,
        restored: piecesIn(base.root),
        identical: true,
      })
    }
  })

  it("changed something on the way out, so coming back is not a claim about nothing", async () => {
    for (const trip of await roundTripsOn(frontDoor())) {
      expect({ ask: trip.ask, moved: trip.changed !== trip.arrived || trip.change.landed }).toEqual({
        ask: trip.ask,
        moved: true,
      })
    }
  })

  /**
   * The page refuses to publish rather than printing a round trip that did not
   * come back. Asserted on a page with none of the front door's bands on it,
   * which is the reachable half of the guard: nothing is proposed, so nothing is
   * put back, and a band of four rows would otherwise render as a band of none.
   */
  it("refuses to build a band out of a page nothing can be asked of", async () => {
    const ids = sequentialIdFactory("bare")
    const bare = createTree(buildElement(ids, { type: "loom.page", props: {} }), ids)

    await expect(roundTripsOn(bare)).rejects.toThrow(/nothing can be put back/)
  })
})

/**
 * The comparison the page's central claim rests on, asserted in both directions.
 *
 * Every round trip on this site comes back, so a comparison that always answered
 * *yes* would agree with every run the page prints. The only way to tell a
 * measurement from a constant is to hand it two pages that are genuinely
 * different, which is what this does.
 */
describe("whether a page came back", () => {
  it("says yes to the page itself", () => {
    expect(cameBack(frontDoor(), frontDoor())).toBe(true)
  })

  it("says no to a page a change has been applied to", async () => {
    const base = frontDoor()
    const ask = askById("shorter")

    if (ask === undefined) throw new Error("loom: the hurry choice is not offered")

    const run = await runAsk(base, ask, true)

    expect(run.record.landed).toBe(true)
    expect(cameBack(base, run.page)).toBe(false)
  })

  it("says no to a different page of this site", () => {
    expect(cameBack(frontDoor(), treeFor(THE_RULES, { origin: ORIGIN, theme: DEFAULT_THEME }))).toBe(
      false
    )
  })

  /**
   * The limit of what this comparison can see, written down rather than left for
   * somebody to discover as a bug.
   *
   * A page rebuilt from the source is **not** distinguishable from a restored one
   * here, because this site's builders are deterministic and `pages.test.ts`
   * holds them to it on purpose. That is a fact about a surface that keeps
   * nothing (0081) rather than a weakness in the comparison, and it is asserted
   * so that the page's copy stays inside what is measured: it says the pieces
   * that came back are the ones that were there, and it does not say that
   * rebuilding would have looked different.
   */
  it("cannot tell a rebuilt front door from a restored one, because this site rebuilds the same one", () => {
    expect(cameBack(frontDoor(), frontDoor())).toBe(true)
    expect(piecesIn(frontDoor().root)).toBe(piecesIn(frontDoor().root))
  })
})

describe("the rules weigh the way back on its own terms", () => {
  it("weighs at least one of them differently from the change it reverses", async () => {
    const differing = weighedDifferently(await roundTripsOn(frontDoor()))

    expect(differing.length).toBeGreaterThan(0)

    for (const trip of differing) {
      expect(trip.change.weighed).not.toBe(trip.back.weighed)
    }
  })

  /**
   * The interesting direction, and the one a reader does not expect: undoing an
   * addition is a removal, so the way back picks up a weight the change never
   * carried.
   */
  it("notices a removal on the way back that the change did not carry", async () => {
    const trips = await roundTripsOn(frontDoor())
    const addition = trips.find((trip) => trip.ask === "proof")

    expect(addition?.change.weighed).not.toContain("takes a lot off the page at once")
    expect(addition?.back.weighed).toContain("takes a lot off the page at once")
  })

  /**
   * The band the page is worth reading for. A change the rules stopped and the
   * visitor allowed is not thereby allowed back: putting it back moves the same
   * protected band the other way, which is the thing the rules were told to ask
   * about.
   */
  it("stops and asks again before putting back the one it stopped and asked about", async () => {
    const trips = await roundTripsOn(frontDoor())
    const stopped = askedAgain(trips)

    expect(stopped.map((trip) => trip.ask)).toEqual(["problem"])

    for (const trip of stopped) {
      expect(askedFirst(trip.change)).toBe(true)
      expect(trip.back.verdict).toBe("approved")
      expect(trip.back.verdictLine).toContain("waits for a person to say yes")
    }
  })

  /** A change nobody was asked about is not reported as one that somebody was. */
  it("does not report a change that landed on its own as one you were asked about", async () => {
    const trips = await roundTripsOn(frontDoor())

    for (const trip of trips.filter((one) => one.ask !== "problem")) {
      expect(askedFirst(trip.change)).toBe(false)
      expect(trip.change.verdict).toBe("landed")
    }
  })
})

/**
 * The band runs its changes through the whole sequence rather than applying the
 * reversing change directly, and the two have to agree — otherwise the page is
 * reporting on a journey nobody could take.
 */
describe("the sequence and the change that reverses one", () => {
  it("leave the same page as applying it straight to the changed one", async () => {
    const base = frontDoor()
    const ask = askById("shorter")

    if (ask === undefined) throw new Error("loom: the hurry choice is not offered")

    const run = await runAsk(base, ask, true)

    if (run.undo === undefined) throw new Error("loom: the change landed without a way back")

    const applied = applyDelta(run.page, run.undo)

    expect(applied.ok).toBe(true)
    if (applied.ok) expect(shapeOf(applied.value)).toBe(shapeOf(base))
  })
})
