import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { proposalIdSchema } from "@jam-overture/loom"

import type { JudgedChange, Moved } from "@/app/(portal)/_lib/what-if"
import { runtimeWordsIn } from "@/app/(portal)/_test/plain-language"
import { recordOf, surfaceOf } from "@/app/(portal)/_test/rendered"

import { MovedGroup } from "./moved-group"

const change = (over: Partial<JudgedChange> = {}): JudgedChange => ({
  proposalId: proposalIdSchema.parse("p_1"),
  origin: "user-instruction",
  confidence: 0.62,
  stakes: "medium",
  reversible: true,
  factors: [],
  recorded: { kind: "requires-confirmation", code: "confidence-below-minimum" },
  answer: "discarded",
  held: true,
  asked: "make the bottom of the page less empty",
  at: "2026-10-01T09:00:00.000Z",
  ...over,
})

const entry = (over: Partial<JudgedChange> = {}): Moved => ({
  change: change(over),
  would: { kind: "accepted", code: "within-policy" },
  movement: "goes-ahead",
})

describe("a group of changes that would land in one place", () => {
  it("draws nothing at all when nothing lands there", () => {
    const { container } = render(<MovedGroup movement="turned-down" moved={[]} />)

    expect(container.textContent).toBe("")
  })

  it("names where they land and counts them", () => {
    const { container } = render(
      <MovedGroup
        movement="goes-ahead"
        moved={[entry(), entry({ proposalId: proposalIdSchema.parse("p_2") })]}
      />
    )

    expect(surfaceOf(container)).toContain("Would go ahead without asking")
    expect(surfaceOf(container)).toContain("2")
  })

  /**
   * A row that only said what *would* happen would be unverifiable — a reader
   * has no way to tell it from a screen inventing changes. Both worlds on every
   * row, with the recorded half in the same words the rest of the portal uses
   * about that change.
   */
  it("says what was asked for, what really became of it, and what would instead", () => {
    const { container } = render(<MovedGroup movement="goes-ahead" moved={[entry()]} />)
    const surface = surfaceOf(container)

    expect(surface).toContain("make the bottom of the page less empty")
    expect(surface).toContain("You said no to this one.")
    expect(surface).toContain("Nothing this project watches for was involved")
  })

  it("reads plainly on the surface", () => {
    const { container } = render(
      <MovedGroup movement="goes-ahead" moved={[entry({ factors: ["large-removal"] })]} />
    )

    expect(runtimeWordsIn(surfaceOf(container))).toEqual([])
  })

  /**
   * Nothing is removed to make the row simple. The runtime's own names for both
   * verdicts, the numbers they were read from, and the factor codes are all
   * still rendered — one click down, where find-in-page reaches them.
   */
  it("keeps the whole technical account one click down", () => {
    const { container } = render(
      <MovedGroup movement="goes-ahead" moved={[entry({ factors: ["large-removal"] })]} />
    )
    const record = recordOf(container)

    expect(record).toContain("confidence-below-minimum")
    expect(record).toContain("within-policy")
    expect(record).toContain("user-instruction")
    expect(record).toContain("0.62")
    expect(record).toContain("medium")
    expect(record).toContain("p_1")
  })

  it("says what was weighed against a change, and says so when nothing was", () => {
    const withFactor = render(
      <MovedGroup movement="goes-ahead" moved={[entry({ factors: ["large-removal"] })]} />
    )
    const without = render(<MovedGroup movement="goes-ahead" moved={[entry()]} />)

    expect(recordOf(withFactor.container)).toContain("takes a lot of the page away")
    expect(recordOf(without.container)).toContain("Nothing this project watches for was weighed")
  })

  /**
   * The row's reason is the rule that would be in charge in the world the
   * reader is asking about, not the one that fired for real. That is the thing
   * being decided, and it is the half a reader cannot work out themselves.
   */
  it("names the rule that would decide, rather than the one that did", () => {
    const held: Moved = {
      change: change({ recorded: { kind: "accepted", code: "within-policy" }, answer: undefined, held: false }),
      would: { kind: "requires-confirmation", code: "stakes-above-ceiling" },
      movement: "asks-you",
    }

    const { container } = render(<MovedGroup movement="asks-you" moved={[held]} />)

    expect(surfaceOf(container)).toContain("A change this big is not something Loom may make on its own")
  })

  it("tells each change apart when two rows ask for the same thing", () => {
    const { container } = render(
      <MovedGroup
        movement="goes-ahead"
        moved={[entry(), entry({ proposalId: proposalIdSchema.parse("p_2") })]}
      />
    )

    expect(container.querySelectorAll("li")).toHaveLength(2)
  })
})
