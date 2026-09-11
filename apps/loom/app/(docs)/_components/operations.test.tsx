import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import {
  produceAudits,
  produceBoundedRead,
  producePlacements,
  produceWaitingTooLong,
} from "@/app/(docs)/_lib/operations/checks"

import { AnswerArrivingLate, BoundedRead, SnapshotAudits, WhoPlacedIt } from "./operations"

/**
 * What these blocks owe a reader once the answers are real.
 *
 * The answers themselves are checked beside the code that produces them. What
 * is checked here is the failure a generated block is prone to: printing some
 * of what it was handed. A dropped row is a node nobody can see was attributed;
 * a dropped card is an audit outcome a reader never learns exists; a number
 * quietly rendered as `undefined` is the one thing on the page that has to be
 * exact.
 */

describe("who placed it", () => {
  it("shows one row per node it was handed", async () => {
    const placements = await producePlacements()

    render(await WhoPlacedIt())

    const rows = document.querySelectorAll("[data-node]")

    expect([...rows].map((row) => row.getAttribute("data-node"))).toEqual(
      placements.map((placement) => placement.nodeId)
    )
  })

  it("prints a person's name where the log has one, and never the word undefined", async () => {
    const placements = await producePlacements()

    render(await WhoPlacedIt())

    for (const placement of placements) {
      const row = document.querySelector(`[data-node="${placement.nodeId}"]`)

      expect(row?.textContent ?? "").not.toContain("undefined")

      if (placement.placedBy !== undefined) {
        expect(row?.textContent, `${placement.label} lost its asker`).toContain(placement.placedBy)
      }
    }
  })

  it("says in words whether the node was asked for or came with something else", async () => {
    render(await WhoPlacedIt())

    expect(screen.getByText("yes, by name")).toBeDefined()
    expect(screen.getByText("no — it came with something else")).toBeDefined()
  })
})

describe("a bounded read", () => {
  it("prints the revision the walk reached", async () => {
    const bounded = await produceBoundedRead()

    render(await BoundedRead())

    const said = document.querySelector("[data-examined-to]")

    expect(said?.getAttribute("data-examined-to")).toBe(String(bounded.examinedTo))
    expect(said?.textContent).toContain(String(bounded.undetermined))
  })
})

describe("the three things an audit can say", () => {
  it("shows one card per outcome, in the order they were produced", async () => {
    const audits = await produceAudits()

    render(await SnapshotAudits())

    const cards = document.querySelectorAll("[data-audit]")

    expect([...cards].map((card) => card.getAttribute("data-audit"))).toEqual(
      audits.map((audit) => audit.outcome)
    )
  })

  it("prints the runtime's own report on the two that have something to report", async () => {
    render(await SnapshotAudits())

    expect(document.querySelector('[data-said="diverged"]')?.textContent).toContain("differs: props")
    expect(document.querySelector('[data-said="unreplayable"]')?.textContent).toBe(
      "revision-gap: expected 2, found 3"
    )
  })
})

describe("an answer that arrived late", () => {
  it("shows the two revision numbers that differ, and the sentence between them", async () => {
    const waiting = await produceWaitingTooLong()

    render(await AnswerArrivingLate())

    expect(document.querySelector("[data-held-against]")?.textContent).toBe(String(waiting.heldAgainst))
    expect(document.querySelector("[data-head-when-answered]")?.textContent).toBe(
      String(waiting.headWhenAnswered)
    )
    expect(document.querySelector("[data-said]")?.textContent).toBe(waiting.said)
    expect(document.querySelector("[data-queued-after]")?.textContent).toBe("0")
  })
})
