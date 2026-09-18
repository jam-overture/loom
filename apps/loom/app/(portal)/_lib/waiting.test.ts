import { describe, expect, it } from "vitest"

import { screenName } from "./screen-names"

import {
  deltaIdSchema,
  intentIdSchema,
  proposalIdSchema,
  treeIdSchema,
  type Disposition,
  type TreeDelta,
} from "@loom/runtime"
import type { HeldProposal } from "@loom/runtime/write"

import {
  answerOutcomes,
  inQueueOrder,
  sweepIsPartial,
  waitingChange as describeWaiting,
  waitingSummary,
  type Sweep,
} from "./waiting"

/**
 * Every test in this file is about a field the hold itself carries, so none of
 * them supplies a reading of the page. `undefined` is the honest argument for
 * that — it is what the front door passes when a page could not be read — and
 * `waiting-effect.test.ts` is where the reading is tested.
 */
const waitingChange = (held: HeldProposal) => describeWaiting(held, undefined)

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
    expect(no).toContain(`stays in ${screenName("/portal/activity")}`)
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

/** Every page reached, every page read. What a healthy deployment looks like. */
const SWEPT: Sweep = { unreadable: 0, complete: true }

/** Reached everything, and one page refused to answer. */
const UNREADABLE_ONE: Sweep = { unreadable: 1, complete: true }

describe("waitingSummary", () => {
  it("says nothing is waiting rather than saying zero", () => {
    expect(waitingSummary([], SWEPT)).toBe("Nothing is waiting for you.")
  })

  it("counts one change as one", () => {
    expect(waitingSummary([waitingChange(heldFixture())], SWEPT)).toBe(
      "1 change is waiting for your answer."
    )
  })

  /** Three changes on one page and on three pages are different afternoons. */
  it("says how many pages they are spread across, once there is more than one", () => {
    const here = waitingChange(heldFixture())
    const there = waitingChange(
      heldFixture({ treeId: otherTreeId, proposalId: proposalIdSchema.parse("p_2") })
    )

    expect(waitingSummary([here, there], SWEPT)).toBe(
      "2 changes are waiting for your answer, across 2 pages."
    )
    expect(waitingSummary([here, waitingChange(heldFixture())], SWEPT)).toBe(
      "2 changes are waiting for your answer."
    )
  })

  /**
   * The failure this screen must never hide. A page whose holds could not be
   * read is not a page with none, and this screen's whole claim is that it is
   * where you find out whether anything needs you.
   */
  it("admits a page it could not check rather than reporting a total as complete", () => {
    expect(waitingSummary([], UNREADABLE_ONE)).toBe(
      "Nothing is waiting for you. One page couldn't be checked."
    )
    expect(waitingSummary([waitingChange(heldFixture())], { unreadable: 2, complete: true })).toBe(
      "1 change is waiting for your answer. 2 pages couldn't be checked."
    )
  })

  /**
   * Asserted as the whole sentence rather than as two halves: the 24 August
   * lesson is that a missing space between independently-held strings satisfies
   * every `toContain` either side of it.
   */
  it("reads as one sentence, spaces and full stops included", () => {
    expect(waitingSummary([waitingChange(heldFixture())], UNREADABLE_ONE)).toBe(
      "1 change is waiting for your answer. One page couldn't be checked."
    )
  })

  /**
   * The second way an empty queue can lie, and nothing was checking it.
   *
   * `TreeStore.list` hands back one bounded page and a cursor. This screen takes
   * that page and asks each tree on it for its holds, so a deployment past the
   * bound has changes it never looked for — and what it printed was the same
   * confident sentence a fully-swept deployment gets. An unreadable page was
   * already admitted; an unreached one was not, and it is the more dangerous of
   * the two precisely because nothing failed.
   */
  it("admits pages it never reached, not only ones it could not read", () => {
    expect(waitingSummary([], { unreadable: 0, complete: false })).toBe(
      "Nothing is waiting for you. This deployment has more pages than this screen checks."
    )
  })

  /** Both caveats at once, still one sentence a person could read out loud. */
  it("says both when both are true, in the order they matter", () => {
    expect(waitingSummary([waitingChange(heldFixture())], { unreadable: 1, complete: false })).toBe(
      "1 change is waiting for your answer. One page couldn't be checked. This deployment has more pages than this screen checks."
    )
  })

  /** Neither caveat leaks into a sweep that has nothing to admit. */
  it("says nothing about coverage when it covered everything", () => {
    expect(waitingSummary([waitingChange(heldFixture())], SWEPT)).toBe(
      "1 change is waiting for your answer."
    )
  })
})

/**
 * Asked as one question rather than as two conditions at the call site, because
 * a screen that remembers one of them and forgets the other is the defect this
 * pair exists to prevent.
 */
describe("sweepIsPartial", () => {
  it("is false only when every page was reached and read", () => {
    expect(sweepIsPartial(SWEPT)).toBe(false)
  })

  it("is true when a page could not be read", () => {
    expect(sweepIsPartial(UNREADABLE_ONE)).toBe(true)
  })

  it("is true when a page was never reached, though nothing failed", () => {
    expect(sweepIsPartial({ unreadable: 0, complete: false })).toBe(true)
  })
})
