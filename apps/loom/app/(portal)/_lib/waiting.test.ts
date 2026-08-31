import { describe, expect, it } from "vitest"

import {
  deltaIdSchema,
  intentIdSchema,
  proposalIdSchema,
  treeIdSchema,
  type Disposition,
  type TreeDelta,
} from "@loom/runtime"
import type { HeldProposal } from "@loom/runtime/write"

import { answerOutcomes, inQueueOrder, waitingChange, waitingSummary } from "./waiting"

const treeId = treeIdSchema.parse("t_1")
const otherTreeId = treeIdSchema.parse("t_2")
const proposalId = proposalIdSchema.parse("p_1")
const intentId = intentIdSchema.parse("i_1")

const delta: TreeDelta = {
  deltaId: deltaIdSchema.parse("d_1"),
  treeId,
  baseRevision: 2,
  operations: [],
}

const disposition: Disposition = {
  kind: "requires-confirmation",
  reason: { code: "confidence-below-minimum", detail: "0.62 is under the apply floor of 0.8" },
  stakes: "medium",
  reversible: true,
  confidence: 0.62,
  policyId: "default",
}

const heldFixture = (overrides: Partial<HeldProposal> = {}): HeldProposal => ({
  proposalId,
  treeId,
  baseRevision: 2,
  intent: {
    intentId,
    treeId,
    baseRevision: 2,
    origin: "user-instruction",
    utterance: "make the heading say something else",
    observedAt: "2026-08-19T09:00:00.000Z",
  },
  proposal: {
    proposalId,
    intentId,
    delta,
    rationale: "The heading is the page's first line.",
    provenance: {
      origin: "user-instruction",
      interpreter: "test",
      authoredBy: "model",
      confidence: 0.62,
      interpretedAt: "2026-08-19T09:00:00.000Z",
    },
  },
  disposition,
  heldAt: "2026-08-19T09:00:00.000Z",
  ...overrides,
})

describe("answerOutcomes", () => {
  it("says a yes is checked again rather than obeyed", () => {
    expect(answerOutcomes(disposition).yes).toContain("checks its rules once more")
  })

  /**
   * The one sentence on the card that changes what a person should do. It was
   * `reversible no` in a monospace pair one click down, which is the wrong
   * altitude for the most consequential fact about a decision somebody is being
   * asked to make.
   */
  it("says when a yes cannot be taken back", () => {
    const yes = answerOutcomes({ ...disposition, reversible: false }).yes

    expect(yes).toContain("can't be undone afterwards")
    expect(answerOutcomes(disposition).yes).toContain("where you can undo it")
  })

  /**
   * A "no" throws the change away and keeps the record of the ask (0023), and
   * those are different objects. A sentence that said only the first would read
   * as if turning something down erased it.
   */
  it("says a no leaves the page alone and keeps the record", () => {
    const no = answerOutcomes(disposition).no

    expect(no).toContain("left exactly as it is")
    expect(no).toContain("stays in Activity")
  })

  /**
   * The card and the queue describe the same two buttons, so they read the
   * sentences from here rather than each holding their own. This is the test
   * that would fail if one of them grew a private copy.
   */
  it("is one source for both screens", () => {
    expect(answerOutcomes(disposition)).toEqual(answerOutcomes({ ...disposition }))
  })
})

describe("waitingChange", () => {
  it("leads with what a person actually typed, unreworded", () => {
    expect(waitingChange(heldFixture()).asked).toBe("make the heading say something else")
  })

  it("says why it stopped in a sentence with no rule code in it", () => {
    const change = waitingChange(heldFixture())

    expect(change.why).toBe("Sure enough to suggest, not sure enough to do without asking.")
    expect(change.why).not.toContain("confidence-below-minimum")
    expect(change.ruleCode).toBe("confidence-below-minimum")
  })

  it("reads the moment it stopped rather than printing the timestamp", () => {
    const change = waitingChange(heldFixture())

    expect(change.since).toBe("19 August 2026 at 09:00 UTC")
    expect(change.sinceIso).toBe("2026-08-19T09:00:00.000Z")
  })

  /**
   * A hold does not always carry an actor — `actor` is optional on an intent —
   * and the origin is what is left to say. Neither is invented from the other.
   */
  it("names whoever asked when the host recorded one, and the act when it did not", () => {
    expect(waitingChange(heldFixture()).actor).toBeNull()

    const named = waitingChange(
      heldFixture({
        intent: { ...heldFixture().intent, actor: "ana@loom.local" },
      })
    )

    expect(named.actor).toBe("ana@loom.local")
    expect(named.origin.label).toBe("Somebody using the site asked for this")
  })

  it("points at the one place the change can be answered", () => {
    expect(waitingChange(heldFixture()).href).toBe("/portal/pages/t_1")
  })
})

describe("inQueueOrder", () => {
  /**
   * A queue is ordered by how long something has waited. Grouping by page would
   * make the reader do the arithmetic this screen exists to do for them.
   */
  it("puts the longest wait first, whatever page it is on", () => {
    const older = waitingChange(
      heldFixture({
        treeId: otherTreeId,
        proposalId: proposalIdSchema.parse("p_0"),
        heldAt: "2026-08-18T09:00:00.000Z",
      })
    )
    const newer = waitingChange(heldFixture())

    expect(inQueueOrder([newer, older]).map((change) => change.proposalId)).toEqual(["p_0", "p_1"])
  })

  it("does not mutate what it is given", () => {
    const changes = [
      waitingChange(heldFixture()),
      waitingChange(
        heldFixture({ proposalId: proposalIdSchema.parse("p_0"), heldAt: "2026-08-18T09:00:00.000Z" })
      ),
    ]

    inQueueOrder(changes)

    expect(changes.map((change) => change.proposalId)).toEqual(["p_1", "p_0"])
  })
})

describe("waitingSummary", () => {
  it("says nothing is waiting rather than saying zero", () => {
    expect(waitingSummary([], 0)).toBe("Nothing is waiting for you.")
  })

  it("counts one change as one", () => {
    expect(waitingSummary([waitingChange(heldFixture())], 0)).toBe(
      "1 change is waiting for your answer."
    )
  })

  /** Three changes on one page and on three pages are different afternoons. */
  it("says how many pages they are spread across, once there is more than one", () => {
    const here = waitingChange(heldFixture())
    const there = waitingChange(
      heldFixture({ treeId: otherTreeId, proposalId: proposalIdSchema.parse("p_2") })
    )

    expect(waitingSummary([here, there], 0)).toBe(
      "2 changes are waiting for your answer, across 2 pages."
    )
    expect(waitingSummary([here, waitingChange(heldFixture())], 0)).toBe(
      "2 changes are waiting for your answer."
    )
  })

  /**
   * The failure this screen must never hide. A page whose holds could not be
   * read is not a page with none, and this screen's whole claim is that it is
   * where you find out whether anything needs you.
   */
  it("admits a page it could not check rather than reporting a total as complete", () => {
    expect(waitingSummary([], 1)).toBe("Nothing is waiting for you. One page couldn't be checked.")
    expect(waitingSummary([waitingChange(heldFixture())], 2)).toBe(
      "1 change is waiting for your answer. 2 pages couldn't be checked."
    )
  })

  /**
   * Asserted as the whole sentence rather than as two halves: the 24 August
   * lesson is that a missing space between independently-held strings satisfies
   * every `toContain` either side of it.
   */
  it("reads as one sentence, spaces and full stops included", () => {
    expect(waitingSummary([waitingChange(heldFixture())], 1)).toBe(
      "1 change is waiting for your answer. One page couldn't be checked."
    )
  })
})
