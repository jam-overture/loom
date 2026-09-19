import { describe, expect, it } from "vitest"

import { stillToAsk } from "./already-asked"
import { DEMO_LEADING_PRESET, DEMO_PRESETS, type DemoPresetId } from "./presets"
import type { ChangeRecord } from "./record"
import { setAside } from "./set-aside"

/**
 * Which asks the panel is offered, once the store is allowed a say.
 *
 * Two properties carry it, and they pull against each other the way `setAside`'s
 * do: an ask whose question is on screen must not be offered again, and an ask
 * whose question is **gone** must come back — a demo that quietly narrows every
 * time a visitor presses something would end the sixty seconds with nothing left
 * to press.
 */

const ASKED: Omit<ChangeRecord, "outcome"> = {
  recordId: "i_1",
  askedAt: "2026-09-17T09:00:00.000Z",
  utterance: "Take the numbers band off the page.",
  origin: "user-instruction",
  actor: "a demo visitor",
  stakes: { level: "medium", factors: [] },
  reversibility: { reversible: true, retainedNodeCount: 4, reasons: [], inverseOperations: [] },
  repaired: false,
  touched: [],
}

/** The removal, waiting on the visitor. The lead, and the case this is for. */
const HELD_TRIM: ChangeRecord = {
  ...ASKED,
  recordId: "i_held",
  outcome: "awaiting-you",
  heldProposalId: "p_held",
  presetId: "trim",
}

/** A second question, from a different button. Two asks held against one revision. */
const HELD_BAND: ChangeRecord = {
  ...ASKED,
  recordId: "i_held_2",
  outcome: "awaiting-you",
  heldProposalId: "p_held_2",
  presetId: "band",
  utterance: "Add a section with our address and opening hours.",
}

/** Landed on its own, so nothing is waiting and nothing is withdrawn. */
const APPLIED_PALETTE: ChangeRecord = {
  ...ASKED,
  recordId: "i_applied",
  outcome: "applied",
  revision: { produced: 1, replaced: 0 },
  presetId: "palette",
  utterance: "Switch this page to the other palette.",
}

/** Typed into the box: a question with no button behind it. */
const HELD_FREE_TEXT: ChangeRecord = {
  ...ASKED,
  recordId: "i_held_typed",
  outcome: "awaiting-you",
  heldProposalId: "p_held_typed",
  utterance: "Make the questions two columns.",
}

const ALL: readonly DemoPresetId[] = DEMO_PRESETS.map((preset) => preset.id)

describe("the asks still worth offering", () => {
  it("offers everything the tree can honour when nothing is waiting", () => {
    expect(stillToAsk(ALL, [], new Set())).toEqual(ALL)
    expect(stillToAsk(ALL, [APPLIED_PALETTE], new Set())).toEqual(ALL)
  })

  it("withdraws the one ask whose question is already on screen", () => {
    const offered = stillToAsk(ALL, [HELD_TRIM], new Set(["p_held"]))

    expect(offered).not.toContain("trim")
    expect(offered).toHaveLength(ALL.length - 1)
  })

  /**
   * The half that keeps the demo from narrowing. Withdrawing the ask a visitor is
   * waiting on is only defensible because every other one stays live: a stranger
   * who wants to watch the page move twice is still allowed to, which is the shape
   * of this fix `set-aside.ts` argued for over disabling the panel.
   */
  it("leaves every other ask live while a question is open", () => {
    expect(stillToAsk(ALL, [HELD_TRIM], new Set(["p_held"]))).toEqual(
      ALL.filter((id) => id !== "trim")
    )
  })

  it("withdraws both when the visitor is waiting on two", () => {
    const offered = stillToAsk(ALL, [HELD_BAND, HELD_TRIM], new Set(["p_held", "p_held_2"]))

    expect(offered).not.toContain("trim")
    expect(offered).not.toContain("band")
    expect(offered).toHaveLength(ALL.length - 2)
  })

  /**
   * The direction that matters, and the reason this is keyed on the store rather
   * than on `heldProposalId` alone. A record keeps the proposal id it was written
   * with; whether that question can still be answered is a fact about the store
   * and the tree's revision together, and `page.tsx` works it out once for every
   * reading that needs it. The ask comes back the moment its question does not.
   */
  it("offers the ask again once the page has moved past its question", () => {
    expect(stillToAsk(ALL, [HELD_TRIM], new Set())).toEqual(ALL)
  })

  it("never takes a record with no hold for a question", () => {
    expect(APPLIED_PALETTE.heldProposalId).toBeUndefined()
    expect(stillToAsk(ALL, [APPLIED_PALETTE], new Set(["p_held"]))).toEqual(ALL)
  })

  /**
   * Free text is a question the panel has no button for, so there is nothing to
   * withdraw — and it must not withdraw something else by accident.
   */
  it("withdraws nothing for a question that came from the box", () => {
    expect(HELD_FREE_TEXT.presetId).toBeUndefined()
    expect(stillToAsk(ALL, [HELD_FREE_TEXT], new Set(["p_held_typed"]))).toEqual(ALL)
  })

  it("keeps the table's order, so the asks that survive do not move", () => {
    const offered = stillToAsk(ALL, [HELD_BAND], new Set(["p_held_2"]))

    expect(offered).toEqual(["palette", "backdrop", "trim", "promote"])
  })

  /**
   * The list a visitor sees after the first press is the list they saw before it.
   *
   * `AskPanel` renders the lead separately and the rest under it, so before the
   * press the list is everything but the lead. Once the lead is waiting on an
   * answer the panel gives up its green button and the lead would otherwise drop
   * back into the list at its table position — which pushed the last ask down
   * under the visitor's cursor. Asserted as the equality rather than as a count,
   * because the property is that nothing moved.
   */
  it("leaves the list identical to the one the lead was pressed from", () => {
    const beforeThePress = ALL.filter((id) => id !== DEMO_LEADING_PRESET)
    const afterIt = stillToAsk(ALL, [HELD_TRIM], new Set(["p_held"]))

    expect(HELD_TRIM.presetId).toBe(DEMO_LEADING_PRESET)
    expect(afterIt).toEqual(beforeThePress)
  })

  /**
   * The caution counts open questions and this withdraws the buttons that make
   * them, so the two must agree about what "a question" is. One press, one
   * question, one ask withdrawn — and no second press available to make the count
   * say two about one removal, which is the sentence that surfaced this.
   */
  it("cannot leave the rail counting two questions about one ask", () => {
    const answerable = new Set(["p_held"])

    expect(setAside([HELD_TRIM], answerable)?.questions).toBe(1)
    expect(stillToAsk(ALL, [HELD_TRIM], answerable)).not.toContain(HELD_TRIM.presetId)
  })
})
