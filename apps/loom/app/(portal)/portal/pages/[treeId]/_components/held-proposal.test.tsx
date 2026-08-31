import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import {
  deltaIdSchema,
  intentIdSchema,
  proposalIdSchema,
  treeIdSchema,
  type TreeDelta,
} from "@loom/runtime"
import type { HeldProposal } from "@loom/runtime/write"

import type { ProposalEffect } from "@/app/(portal)/_lib/proposal-effect"
import { answerOutcomes } from "@/app/(portal)/_lib/waiting"

import { HeldProposalCard } from "./held-proposal"

/**
 * The one screen where somebody is being asked to make a decision, so the
 * assertions are about the *order* they meet things in rather than about
 * whether a field is present.
 *
 * The card used to lead with five monospace pairs — stakes, reversible,
 * confidence, the operation verbs, a policy id — and reach the sentence
 * explaining why anybody was being asked at all sixth. All five are still on
 * the card. What these pin is that they are behind the disclosure and the
 * decision is in front of it, because that ordering is the whole of what this
 * branch changed and it is exactly the sort of thing a later refactor
 * unwittingly reverses.
 */

const treeId = treeIdSchema.parse("t_1")
const proposalId = proposalIdSchema.parse("p_1")
const intentId = intentIdSchema.parse("i_1")

const delta: TreeDelta = {
  deltaId: deltaIdSchema.parse("d_1"),
  treeId,
  baseRevision: 2,
  operations: [],
}

const held: HeldProposal = {
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
    rationale: "The heading is the page's first line, so changing it changes the page's subject.",
    provenance: {
      origin: "user-instruction",
      interpreter: "test",
      authoredBy: "model",
      confidence: 0.62,
      interpretedAt: "2026-08-19T09:00:00.000Z",
    },
  },
  disposition: {
    kind: "requires-confirmation",
    reason: { code: "confidence-below-minimum", detail: "0.62 is under the apply floor of 0.8" },
    stakes: "medium",
    reversible: true,
    confidence: 0.62,
    policyId: "default",
  },
  heldAt: "2026-08-19T09:00:00.000Z",
}

const effect: ProposalEffect = {
  applies: true,
  obstacle: null,
  stale: false,
  baseRevision: 2,
  treeRevision: 2,
  inertCount: 0,
  operations: [],
}

const card = () => render(<HeldProposalCard held={held} effect={effect} />)

describe("HeldProposalCard", () => {
  it("leads with what the AI wants to do, in its own sentence", () => {
    card()

    expect(screen.getByText(/changing it changes the page's subject/)).toBeTruthy()
  })

  /**
   * `confidence-below-minimum` is a rule code. Somebody being asked to overrule
   * a rule has to be able to read what the rule is for, and `reason.detail`
   * ("0.62 is under the apply floor of 0.8") is written about thresholds rather
   * than about this change.
   */
  it("says why you are being asked, before it says anything about numbers", () => {
    card()

    expect(screen.getByText(/Sure enough to suggest, not sure enough to do without asking\./))
      .toBeTruthy()
  })

  it("attributes the confidence to the AI rather than stating it as a fact", () => {
    card()

    expect(document.body.textContent).toContain("The AI says it is not certain")
  })

  it("says the risk as a consequence, not as a level on a scale", () => {
    card()

    expect(document.body.textContent).toContain("Some risk")
    expect(document.body.textContent).toContain("you could undo it")
  })

  it("gives the two answers plain names", () => {
    card()

    expect(screen.getByRole("button", { name: "Apply this change" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "No thanks" })).toBeTruthy()
  })

  /**
   * The card described the change and never the *answer*. A person hovering
   * over two buttons wants to know what each one sets in motion — and the
   * undoability of a yes, which is the sharpest half, was a `reversible no`
   * pair one click down.
   */
  it("says what each answer would do, before either button", () => {
    const { container } = card()
    const text = container.textContent ?? ""

    expect(text).toContain("If you say yes")
    expect(text).toContain("If you say no")
    expect(text.indexOf("If you say yes")).toBeLessThan(text.indexOf("Apply this change"))
  })

  it("says a yes is re-judged rather than obeyed", () => {
    card()

    expect(document.body.textContent).toContain("checks its rules once more")
  })

  /**
   * Asserted against `answerOutcomes` itself rather than against a copy of the
   * sentence: the queue on `/portal` renders the same two lines, and a test that
   * pinned the wording here would let the two screens drift apart while both
   * stayed green.
   */
  it("reads the sentences from the one place both screens read them", () => {
    const { container } = card()
    const answers = answerOutcomes(held.disposition)

    expect(container.textContent).toContain(answers.yes)
    expect(container.textContent).toContain(answers.no)
  })

  /** Nothing is removed. Every value the card used to lead with is still on it. */
  it("keeps the whole technical record, behind one disclosure", () => {
    const { container } = card()
    const details = container.querySelector("details")

    expect(details?.open).toBe(false)
    expect(details?.textContent).toContain("medium")
    expect(details?.textContent).toContain("0.62")
    expect(details?.textContent).toContain("confidence-below-minimum")
    expect(details?.textContent).toContain("default")
    expect(details?.textContent).toContain("0.62 is under the apply floor of 0.8")
  })

  it("puts the rule code nowhere a reader meets it unasked", () => {
    const { container } = card()
    const details = container.querySelector("details")
    details?.remove()

    expect(container.textContent).not.toContain("confidence-below-minimum")
  })
})
