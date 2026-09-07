import { describe, expect, it } from "vitest"

import {
  produceAudits,
  produceBoundedRead,
  producePlacements,
  produceWaitingTooLong,
  type Placement,
} from "./checks"

/**
 * What the operations page is allowed to claim.
 *
 * Every assertion here is about a sentence on the page. The page says a card
 * added in one operation leaves one node named and the rest carried; it says an
 * audit can tell an edited snapshot from a broken log; it says a change that
 * waited while the page moved is dead rather than stale. If the runtime stops
 * behaving that way, the page is wrong, and this is what says so.
 *
 * The half worth guarding hardest is the **staging**. Two of the three audit
 * outcomes are produced by handing `auditSnapshot` a reader that has been
 * damaged on purpose, and a staging bug looks exactly like a runtime finding —
 * a page confidently reporting a failure nobody has. So each staged case is
 * asserted down to the field: which node differs and in what facet, which
 * revision the gap is at.
 */

const placementFor = (placements: readonly Placement[], label: string): Placement => {
  const found = placements.find((placement) => placement.label.startsWith(label))

  if (found === undefined) {
    throw new Error(`no row for ${label}; rows were ${placements.map((row) => row.label).join(", ")}`)
  }

  return found
}

describe("who put this node here", () => {
  it("names the person who asked, and the revision that did it", async () => {
    const placements = await producePlacements()
    const card = placementFor(placements, "loom.card")

    expect(card.outcome).toBe("placed")
    expect(card.placedBy).toBe("dana")
    expect(card.placedAt).toBe(1)
  })

  it("separates the node that was asked for from the ones that came with it", async () => {
    const placements = await producePlacements()

    expect(placementFor(placements, "loom.card").named).toBe(true)
    expect(placementFor(placements, "loom.prose — “Published").named).toBe(false)
  })

  it("credits nobody for a node that was there before the log started", async () => {
    const placements = await producePlacements()
    const heading = placementFor(placements, "loom.heading")

    expect(heading.outcome).toBe("seeded")
    expect(heading.placedBy).toBeUndefined()
  })

  it("reports what happened to a node after it was placed, and who did it", async () => {
    const placements = await producePlacements()

    expect(placementFor(placements, "loom.card").since).toEqual([
      { effect: "moved", actor: "dana", revision: 3 },
    ])

    expect(placementFor(placements, "loom.prose — “Nothing here").since).toEqual([
      { effect: "configured", actor: "ravi", revision: 2 },
    ])
  })

  it("never reports a placement as something that happened since", async () => {
    const placements = await producePlacements()

    for (const placement of placements) {
      for (const touch of placement.since) {
        expect(touch.effect, `${placement.label} was placed twice`).not.toBe("placed")
      }
    }
  })

  it("shows no node twice, and no text node at all", async () => {
    const placements = await producePlacements()
    const ids = placements.map((placement) => placement.nodeId)

    expect(new Set(ids).size).toBe(ids.length)

    for (const placement of placements) {
      expect(placement.label.startsWith("“"), `${placement.label} is a text node`).toBe(false)
    }
  })
})

describe("a read that ran out of budget", () => {
  it("says it could not tell, rather than crediting the seed", async () => {
    const bounded = await produceBoundedRead()

    expect(bounded.undetermined).toBeGreaterThan(0)
    expect(bounded.reachedStart).toBe(false)
  })

  it("says how far back it got, which is the number that makes it actionable", async () => {
    const bounded = await produceBoundedRead()

    expect(bounded.examinedTo).toBe(3)
  })

  it("would have answered every node given the whole log", async () => {
    const placements = await producePlacements()
    const bounded = await produceBoundedRead()

    expect(bounded.undetermined).toBe(placements.length)

    for (const placement of placements) {
      expect(placement.outcome, `${placement.label} was undetermined on a full read`).not.toBe(
        "undetermined"
      )
    }
  })
})

describe("does the page still match its own history", () => {
  it("offers the three answers an audit can give, in that order", async () => {
    const audits = await produceAudits()

    expect(audits.map((audit) => audit.outcome)).toEqual(["agrees", "diverged", "unreplayable"])
  })

  it("agrees about a page nothing has been done to behind the runtime's back", async () => {
    const [agrees] = await produceAudits()

    expect(agrees?.revision).toBe(3)
    expect(agrees?.differences).toEqual([])
  })

  it("names the node an edited snapshot differs at, and what differs about it", async () => {
    const [, diverged] = await produceAudits()

    expect(diverged?.differences).toHaveLength(1)
    expect(diverged?.differences[0]?.code).toBe("changed")
    expect(diverged?.differences[0]?.label).toBe("loom.card")
    expect(diverged?.differences[0]).toHaveProperty("facets", ["props"])
  })

  it("stops at the hole in a log rather than folding past it", async () => {
    const [, , unreplayable] = await produceAudits()

    expect(unreplayable?.mismatch).toBe("revision-gap: expected 2, found 3")
    expect(unreplayable?.revision).toBeUndefined()
  })

  it("tells an operator something different to do in each case", async () => {
    const audits = await produceAudits()
    const moves = audits.map((audit) => audit.yourMove)

    expect(new Set(moves).size).toBe(audits.length)
  })
})

describe("a change that waited while the page moved on", () => {
  it("was one change waiting, judged against the revision that was current then", async () => {
    const waiting = await produceWaitingTooLong()

    expect(waiting.queuedBefore).toBe(1)
    expect(waiting.heldAgainst).toBe(3)
  })

  it("is refused when it is finally answered, because the page moved", async () => {
    const waiting = await produceWaitingTooLong()

    expect(waiting.headWhenAnswered).toBe(4)
    expect(waiting.kind).toBe("not-written")
    expect(waiting.said).toContain("moved on")
  })

  it("leaves the queue empty, because a dead change is not left in it", async () => {
    const waiting = await produceWaitingTooLong()

    expect(waiting.queuedAfter).toBe(0)
  })
})
