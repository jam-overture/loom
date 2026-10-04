import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import {
  deltaIdSchema,
  intentIdSchema,
  proposalIdSchema,
  treeIdSchema,
  type IrreversibilityReason,
  type PrimitiveType,
  type TreeDelta,
} from "@jam-overture/loom"
import type { HeldProposal } from "@jam-overture/loom/write"

import type { PageName } from "@/app/(portal)/_lib/page-name"
import { waitingChange } from "@/app/(portal)/_lib/waiting"
import { NOTHING_WOULD_CHANGE, type WaitingTriage } from "@/app/(portal)/_lib/waiting-effect"

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

/**
 * A reading of a change that touches two parts, one of which takes a section of
 * the page with it. It is built here rather than read off a tree because what
 * these tests pin is what the card does with a reading, and `waiting-effect`
 * is where the reading itself is checked.
 */
const triage: WaitingTriage = {
  steps: [
    { before: "Deletes ", subject: "n_band", after: ", and the 12 pieces inside it." },
    { before: "Changes ", subject: "n_head", after: "'s width." },
  ],
  more: null,
  standing: null,
  technical: ["delete n_band — and everything under it", "reconfigure n_head — width"],
}

/**
 * `"unread"` rather than `undefined` for the page that would not read: a
 * default parameter cannot tell an omitted argument from an explicit
 * `undefined`, so the test for the unread page was quietly getting the reading.
 */
const card = (
  proposal: HeldProposal = held,
  named: PageName = page,
  effect: WaitingTriage | "unread" = triage
) =>
  render(
    <ul>
      <WaitingCard
        change={waitingChange(proposal, effect === "unread" ? undefined : effect)}
        page={named}
      />
    </ul>
  )

/**
 * The card carries two disclosures and they answer different questions, so a
 * test that wants one names it by its summary rather than by being first in the
 * document. `querySelector("details")` used to be unambiguous and silently
 * stopped being so the moment the second one shipped.
 */
const disclosure = (container: HTMLElement, summary: string): HTMLDetailsElement | undefined =>
  [...container.querySelectorAll("details")].find((details) =>
    details.querySelector("summary")?.textContent?.includes(summary)
  )

const judgment = (container: HTMLElement) => disclosure(container, "How Loom decided this")
const steps = (container: HTMLElement) => disclosure(container, "Every step")

/**
 * The same hold, judged irreversible, with the reasons the Gate kept.
 *
 * `reversible: false` and the reasons together, never one without the other —
 * that pairing is the runtime's invariant and a fixture that broke it would be
 * describing a judgment no run of Loom produces, which is what 0216 exists
 * about and what this lane got wrong in a fixture two days ago.
 */
const irreversible = (reasons: readonly IrreversibilityReason[]): HeldProposal => ({
  ...held,
  disposition: {
    ...held.disposition,
    reason: { code: "irreversible", detail: "cannot be undone cleanly: out-of-tree-effect" },
    reversible: false,
    irreversibilityReasons: reasons,
  },
})

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
   * The card says what a change would do and not what it would *replace* — the
   * values it overwrites, the place in the page, the words leaving — so it must
   * not offer a button that decides one. The action is a link to the screen
   * that can show those, which is the reading 0019 asks for rather than a
   * limitation worked around.
   */
  it("hands the reader somewhere else rather than offering to answer here", () => {
    const { container } = card()

    expect(container.querySelector("button")).toBeNull()
    expect(screen.getByRole("link", { name: /Look at it on the page/ }).getAttribute("href")).toBe(
      "/portal/pages/t_1"
    )
  })

  /**
   * Which of the two destinations is the button, as of 30 September. The page is
   * where every *other* change waiting on it is; the screen this now leads with
   * draws **this** change — the page as it stands beside the page it would become
   * — and that is what a row of triage is trying to get a reader to.
   *
   * Asserted as an ordering rather than as two links, because two links is what it
   * was and the defect would be offering them as equals: a reader choosing between
   * two nouns before they know what either holds.
   */
  it("leads with the screen that draws this change, and keeps the page beside it", () => {
    const { container } = card()
    const text = container.textContent ?? ""

    expect(
      screen.getByRole("link", { name: /See what it would look like/ }).getAttribute("href")
    ).toBe("/portal/pages/t_1/proposed/p_1")
    expect(text.indexOf("See what it would look like")).toBeLessThan(
      text.indexOf("Look at it on the page")
    )
  })

  /** One bordered shape, so a reader is never asked to choose between two. */
  it("offers exactly one of the two as a button", () => {
    const { container } = card()
    const bordered = [...container.querySelectorAll("a")].filter((link) =>
      link.className.includes("border")
    )

    expect(bordered).toHaveLength(1)
    expect(bordered[0]?.textContent).toContain("See what it would look like")
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
    const details = judgment(container)

    expect(details?.open).toBe(false)
    expect(details?.textContent).toContain("confidence-below-minimum")
    expect(details?.textContent).toContain("p_1")
    expect(details?.textContent).toContain("user-instruction")

    details?.remove()
    expect(container.textContent).not.toContain("confidence-below-minimum")
    expect(container.textContent).not.toContain("user-instruction")
  })

  /**
   * The change of 4 October, and the sentence it finishes.
   *
   * `If you say yes` has ended in *"This one can't be undone afterwards."* since
   * this card was written. That is a warning delivered at the one moment a
   * person is deciding, with nothing about what to be careful of — and the Gate
   * has always known which of two very different things happened. Until 0222 a
   * hold carried the reasons only inside the prose of `reason.detail`.
   */
  describe("why saying yes could not be taken back", () => {
    it("names the piece that reaches outside the page, under the sentence that warns", () => {
      const { container } = card(
        irreversible([{ code: "out-of-tree-effect", primitiveTypes: ["loom.form" as PrimitiveType] }])
      )

      expect(container.textContent).toContain("This one can't be undone afterwards.")
      expect(container.textContent).toContain("Check what Form is wired to before you say yes")
    })

    it("says what the rules keep when the budget is the obstacle", () => {
      const { container } = card(
        irreversible([{ code: "retention-budget-exceeded", retainedNodeCount: 9, budget: 4 }])
      )

      expect(container.textContent).toContain(
        "This one takes 9 parts off the page, and your rules keep at most 4."
      )
    })

    /**
     * The explanation goes under the claim, not under the second answer. A
     * reviewer reads "If you say yes", meets the warning at the end of it, and
     * the next thing they read should be what to do about it — which a refactor
     * that files it after "If you say no" would silently undo.
     */
    it("puts the reason between the two answers rather than after both", () => {
      const { container } = card(
        irreversible([{ code: "out-of-tree-effect", primitiveTypes: ["loom.form" as PrimitiveType] }])
      )
      const read = container.textContent ?? ""

      expect(read.indexOf("can't be undone afterwards")).toBeLessThan(read.indexOf("Check what Form"))
      expect(read.indexOf("Check what Form")).toBeLessThan(read.indexOf("If you say no"))
    })

    /** The ordinary case gets nothing: the row is long enough already. */
    it("says nothing more about undo on a change that can be undone", () => {
      const { container } = card()

      expect(container.textContent).toContain("where you can undo it")
      expect(container.textContent).not.toContain("Check what")
      expect(container.textContent).not.toContain("gone for good")
    })

    /** The runtime's codes stay off a card nobody has opened a disclosure on. */
    it("prints no runtime code in the sentence a reviewer meets unasked", () => {
      const { container } = card(
        irreversible([{ code: "out-of-tree-effect", primitiveTypes: ["loom.form" as PrimitiveType] }])
      )

      expect(container.textContent).not.toContain("out-of-tree-effect")
      expect(container.textContent).not.toContain("loom.form")
    })
  })

  describe("what it would do", () => {
    /**
     * The whole reason this section exists. A queue that lists three waiting
     * changes without saying which one takes a section of the page off it has
     * sorted nothing — the reader still has to open all three.
     */
    it("says what the change would do, on the surface", () => {
      const { container } = card()

      for (const details of container.querySelectorAll("details")) details.remove()

      expect(container.textContent).toContain("Deletes")
      expect(container.textContent).toContain("12 pieces inside it")
    })

    /**
     * Above the two answers, because those read the same on every row and this
     * is the only thing on the card that differs by how much is at stake.
     */
    it("says what it would do before it says what answering would do", () => {
      const { container } = card()
      const text = container.textContent ?? ""

      expect(text.indexOf("What it would do")).toBeGreaterThan(text.indexOf("Why it stopped"))
      expect(text.indexOf("If you say yes")).toBeGreaterThan(text.indexOf("What it would do"))
    })

    it("counts the steps it did not show", () => {
      const { container } = card(held, page, { ...triage, more: "and 3 more steps" })

      expect(container.textContent).toContain("and 3 more steps")
    })

    /**
     * The preview cut decides how tall a row is and must not decide what a
     * reader may find out, so every step is in the record — including one the
     * surface never printed.
     */
    it("keeps every step in a disclosure, including one the preview left out", () => {
      const { container } = card(held, page, {
        ...triage,
        steps: [triage.steps[0]!],
        more: "and 1 more step",
        technical: [...triage.technical, "move n_foot — into n_page at 0"],
      })
      const details = steps(container)

      expect(details?.open).toBe(false)
      expect(details?.textContent).toContain("move n_foot")

      for (const open of container.querySelectorAll("details")) open.remove()
      expect(container.textContent).not.toContain("move n_foot")
    })

    /**
     * The most actionable thing a row can carry, and the one that saves the
     * trip: a change that would not land as it stands is turned down and asked
     * for again, and the reader can know that without opening anything.
     */
    it("leads with how the change stands when it does not simply stand", () => {
      const { container } = card(held, page, { ...triage, standing: NOTHING_WOULD_CHANGE })
      const text = container.textContent ?? ""

      expect(text).toContain(NOTHING_WOULD_CHANGE.label)
      expect(text).toContain(NOTHING_WOULD_CHANGE.meaning)
      expect(text.indexOf(NOTHING_WOULD_CHANGE.label)).toBeLessThan(text.indexOf("Deletes"))
    })

    it("says nothing about how it stands on the ordinary waiting change", () => {
      const { container } = card()

      expect(container.textContent).not.toContain(NOTHING_WOULD_CHANGE.label)
    })

    /**
     * A page that would not read and a change with no steps in it render
     * identically and are opposite facts. The row survives either way, because
     * everything above this section comes off the held change itself.
     */
    it("says it could not read the page rather than showing a change with no steps", () => {
      const { container } = card(held, page, "unread")

      expect(container.textContent).toContain("couldn’t read this page")
      expect(container.textContent).toContain("make the pricing band say something friendlier")
      expect(container.textContent).not.toContain("Deletes")
    })
  })
})
