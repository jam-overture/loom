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

import type { PageName } from "@/app/(portal)/_lib/page-name"
import { waitingChange } from "@/app/(portal)/_lib/waiting"

import { WaitingCard } from "./waiting-card"

/**
 * The triage card. What these pin is the order a reader meets it in and the two
 * things it must not do: promise an answer it cannot take, and print a rule
 * code at somebody who did not ask for one.
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
    actor: "ana@loom.local",
    utterance: "make the pricing band say something friendlier",
    observedAt: "2026-08-19T09:00:00.000Z",
  },
  proposal: {
    proposalId,
    intentId,
    delta,
    rationale: "The band's heading is the first thing a visitor reads.",
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

const page: PageName = { name: "Autumn arrivals", treeId: "t_1", derived: true }

const card = (proposal: HeldProposal = held, named: PageName = page) =>
  render(
    <ul>
      <WaitingCard change={waitingChange(proposal)} page={named} />
    </ul>
  )

describe("WaitingCard", () => {
  it("leads with what somebody typed", () => {
    card()

    expect(screen.getByText(/make the pricing band say something friendlier/)).toBeTruthy()
  })

  it("names the page the change is waiting on, and how long it has waited", () => {
    const { container } = card()

    expect(container.textContent).toContain("Autumn arrivals")
    expect(container.textContent).toContain("t_1")
    expect(container.querySelector("time")?.getAttribute("dateTime")).toBe(
      "2026-08-19T09:00:00.000Z"
    )
    expect(container.textContent).toContain("waiting since 19 August 2026 at 09:00 UTC")
  })

  /**
   * The queue this card sits in is drawn from every page at once, so the page is
   * what tells one row from the next — and for a fortnight it told a reader
   * `t_1`. Both halves are pinned, in order: the words, then the id.
   */
  it("says which page in words before it says which page in an id", () => {
    const { container } = card()
    const text = container.textContent ?? ""

    expect(text.indexOf("Autumn arrivals")).toBeLessThan(text.indexOf("t_1"))
  })

  it("still names the page by its id when it could not be named in words", () => {
    const { container } = card(held, { name: "Untitled page", treeId: "t_1", derived: false })

    expect(container.textContent).toContain("Untitled page")
    expect(container.textContent).toContain("t_1")
  })

  it("says why it stopped before it says what either answer would do", () => {
    const { container } = card()
    const text = container.textContent ?? ""

    expect(text.indexOf("Why it stopped")).toBeGreaterThan(-1)
    expect(text.indexOf("If you say yes")).toBeGreaterThan(text.indexOf("Why it stopped"))
    expect(text.indexOf("If you say no")).toBeGreaterThan(text.indexOf("If you say yes"))
  })

  /**
   * The card cannot show what the change would replace — it has read no tree —
   * so it must not offer a button that decides one. The action is a link to the
   * screen that can, which is the reading 0019 asks for rather than a
   * limitation worked around.
   */
  it("hands the reader to the page rather than offering to answer here", () => {
    const { container } = card()

    expect(container.querySelector("button")).toBeNull()
    expect(screen.getByRole("link", { name: /Look at it on the page/ }).getAttribute("href")).toBe(
      "/portal/pages/t_1"
    )
  })

  it("says a yes cannot be taken back, when it cannot", () => {
    const { container } = card({
      ...held,
      disposition: { ...held.disposition, reversible: false },
    })

    expect(container.textContent).toContain("can't be undone afterwards")
  })

  /** Nothing is removed: the record is one click down, and closed by default. */
  it("keeps the rule code and the ids behind one disclosure", () => {
    const { container } = card()
    const details = container.querySelector("details")

    expect(details?.open).toBe(false)
    expect(details?.textContent).toContain("confidence-below-minimum")
    expect(details?.textContent).toContain("p_1")
    expect(details?.textContent).toContain("user-instruction")

    details?.remove()
    expect(container.textContent).not.toContain("confidence-below-minimum")
    expect(container.textContent).not.toContain("user-instruction")
  })
})
