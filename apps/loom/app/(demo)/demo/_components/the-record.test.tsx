import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { MARKED_APPLIED, MARKED_MANY, type MarkedPage } from "@/app/(demo)/_lib/marked"
import { ASK_AGAIN_LABEL, movedOn } from "@/app/(demo)/_lib/moved"
import type { ChangeRecord } from "@/app/(demo)/_lib/record"
import { UNDO_LABEL, UNDO_WAITING } from "@/app/(demo)/_lib/undo"

import { awaitingAnswer, TheRecord, type HeldReading } from "./the-record"

/**
 * The list, and the three things about it a stranger's eye catches before any
 * of its contents.
 *
 * This file exists because of what reached `main` on 11 September: two
 * `records.map` calls in one `<ul>`, so every card rendered twice and the
 * demo's leading question arrived with two **Apply this change** buttons under
 * it. Every module involved was correct, both copies were valid React, and the
 * page that rendered them has never been mountable in a test — it is an async
 * Server Component that reads a cookie and opens a session.
 *
 * So the counting happens here. A card is a thing this suite already covers in
 * depth (`record-card.test.tsx`, twenty-four tests); what it could not see is
 * how many of them there are, and whether each is addressable by the id the rest
 * of the surface finds it with.
 */

/** One ask, interpreted and weighed, with everything both fixtures share. */
const ASKED: Omit<ChangeRecord, "outcome" | "revision"> = {
  recordId: "i_1",
  askedAt: "2026-09-12T09:00:00.000Z",
  utterance: "Take the numbers band off the page.",
  origin: "user-instruction",
  actor: "a demo visitor",
  interpretation: {
    rationale: "The band is one node with three under it.",
    interpreter: "loom/demo-preset",
    authoredBy: "runtime",
    confidence: 1,
    interpretedAt: "2026-09-12T09:00:00.000Z",
    operations: ["remove n_7"],
  },
  stakes: { level: "medium", factors: [] },
  reversibility: { reversible: true, retainedNodeCount: 4, reasons: [], inverseOperations: [] },
  disposition: {
    kind: "requires-confirmation",
    ruleCode: "stakes-above-ceiling",
    detail: "restructures at depth 1",
    policyId: "demo",
    policyFingerprint: "0123456789abcdef0123",
    confidence: 1,
  },
  repaired: false,
  touched: [],
  /**
   * Every ask on this page but a typed one came from a button, and the id is
   * what lets a dead hold be asked again (`PageMovedOn`). The fixtures carry it
   * because the demo's own records do.
   */
  presetId: "take-the-numbers-off",
}

/** Waiting on the visitor: a proposal in custody and no revision yet. */
const HELD: ChangeRecord = { ...ASKED, outcome: "awaiting-you", heldProposalId: "p_1" }

/** The same ask, answered, and now the thing an undo would be offered against. */
const APPLIED: ChangeRecord = {
  ...ASKED,
  recordId: "i_2",
  outcome: "applied",
  revision: { produced: 1, replaced: 0 },
  answeredBy: "a demo visitor",
}

/** A second, unrelated ask that landed on its own. */
const OTHER: ChangeRecord = {
  ...ASKED,
  recordId: "i_3",
  utterance: "Repaint the top band.",
  outcome: "applied",
  revision: { produced: 2, replaced: 1 },
  disposition: {
    kind: "accepted",
    ruleCode: "within-policy",
    detail: "stakes low, within the ceiling for user-instruction",
    policyId: "demo",
    confidence: 1,
  },
}

const NOTHING_MARKED: MarkedPage = { words: new Map() }

const ONE_MARK: MarkedPage = { line: MARKED_APPLIED, tone: "applied", words: new Map() }

const NO_READINGS: ReadonlyMap<string, HeldReading> = new Map()

/**
 * jsdom implements neither, and every card that is waiting on an answer mounts
 * `AnswerInView`, which reads both. Same stub as `answer-in-view.test.tsx`; the
 * scrolling itself is that file's subject rather than this one's.
 */
beforeEach(() => {
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: false, media: query }))
  Element.prototype.scrollIntoView = vi.fn()
})

const cardsIn = (container: HTMLElement): readonly HTMLElement[] => [
  ...container.querySelectorAll<HTMLElement>("li[id]"),
]

describe("the record", () => {
  /**
   * The assertion this file was written for. Two asks, two cards — and the
   * failure it catches is not a card rendering wrongly but a card rendering
   * twice, which no test of a card can see.
   */
  it("shows one card per ask, and never two", () => {
    const { container } = render(
      <TheRecord
        records={[APPLIED, OTHER]}
        marked={NOTHING_MARKED}
        held={NO_READINGS}
        revision={2}
      />
    )

    const cards = cardsIn(container)

    expect(cards).toHaveLength(2)
    expect(cards.map((card) => card.id)).toEqual([APPLIED.recordId, OTHER.recordId])
  })

  /**
   * And the same fact stated the way the rest of the surface depends on it. The
   * card's element id is an address: `AnswerInView` finds the waiting question
   * with `getElementById` and `BackToTheRecord` sends a phone visitor back up to
   * it, and both silently resolve to whichever element came first. On
   * 11 September that was the copy with no offer and no mark on it.
   */
  it("gives each record exactly one element carrying its id", () => {
    const { container } = render(
      <TheRecord records={[HELD, OTHER]} marked={NOTHING_MARKED} held={NO_READINGS} revision={2} />
    )

    for (const record of [HELD, OTHER]) {
      expect(container.querySelectorAll(`[id="${record.recordId}"]`)).toHaveLength(1)
    }
  })

  /**
   * The consequence a visitor actually meets: one question, one pair of buttons.
   * Two **Apply this change** buttons 511px apart is the screen asking a
   * stranger which of two identical controls the page meant.
   */
  it("puts one pair of controls under a question, not two", () => {
    render(<TheRecord records={[HELD]} marked={NOTHING_MARKED} held={NO_READINGS} revision={0} />)

    expect(screen.getAllByRole("button", { name: "Apply this change" })).toHaveLength(1)
    expect(screen.getAllByRole("button", { name: "No thanks" })).toHaveLength(1)
  })

  /**
   * Every card is decorated, because the decoration is what the stripped
   * duplicate was missing. `undoOffer` reads the whole list, so a revision with
   * an undo already waiting on it says so instead of offering the button again —
   * a second press would propose a second undo of the same revision.
   */
  it("reads each card's undo offer from the whole list", () => {
    const undo: ChangeRecord = {
      ...ASKED,
      recordId: "i_4",
      outcome: "awaiting-you",
      utterance: "Undo revision 1.",
      heldProposalId: "p_2",
      undoes: 1,
    }

    render(
      <TheRecord records={[undo, APPLIED]} marked={NOTHING_MARKED} held={NO_READINGS} revision={1} />
    )

    expect(screen.getByText(UNDO_WAITING)).toBeTruthy()
    expect(screen.queryByRole("button", { name: UNDO_LABEL })).toBeNull()
  })

  /**
   * And the other half of the decoration: with more than one mark on the page,
   * each card wears its own mark's words, so the pairing is a thing to look at
   * rather than a sentence to reason about.
   */
  it("gives each card the words its own mark is wearing", () => {
    const marked: MarkedPage = {
      line: MARKED_MANY,
      tone: "awaiting",
      words: new Map([
        [APPLIED.recordId, "This would be removed"],
        [OTHER.recordId, "Something new would go here"],
      ]),
    }

    render(
      <TheRecord records={[APPLIED, OTHER]} marked={marked} held={NO_READINGS} revision={2} />
    )

    expect(screen.getByText(MARKED_MANY)).toBeTruthy()
    expect(screen.getByText("This would be removed")).toBeTruthy()
    expect(screen.getByText("Something new would go here")).toBeTruthy()
  })

  /**
   * The rail's line is the legend for the marks, and it appears only when there
   * is a mark to explain — never as a legend for something that is not on
   * screen.
   */
  it("explains the marks only when the page is carrying one", () => {
    const { rerender } = render(
      <TheRecord records={[APPLIED]} marked={NOTHING_MARKED} held={NO_READINGS} revision={1} />
    )

    expect(screen.queryByText(MARKED_APPLIED)).toBeNull()

    rerender(
      <TheRecord records={[APPLIED]} marked={ONE_MARK} held={NO_READINGS} revision={1} />
    )

    expect(screen.getByText(MARKED_APPLIED)).toBeTruthy()
  })

  /**
   * A rail with nothing on it renders nothing rather than an empty heading:
   * before the first ask, the sequence (`WhatHappens`) is what stands here.
   */
  it("is absent until there is something to record", () => {
    const { container } = render(
      <TheRecord records={[]} marked={NOTHING_MARKED} held={NO_READINGS} revision={0} />
    )

    expect(container.querySelector("section")).toBeNull()
  })

  /**
   * A held reading belongs to the card whose record it is about, and the one a
   * reader is told unasked is the plain sentence above the buttons.
   */
  it("hands each waiting card its own reading of the change", () => {
    const held = new Map<string, HeldReading>([
      [
        HELD.recordId,
        { plain: [{ sentence: "This comes off the page.", words: ["3,400"], more: 0 }] },
      ],
    ])

    render(<TheRecord records={[HELD]} marked={NOTHING_MARKED} held={held} revision={0} />)

    expect(screen.getByText("This comes off the page.")).toBeTruthy()
    expect(screen.getByText(/3,400/)).toBeTruthy()
  })

  /**
   * And a hold the page has moved past is a different card: the state, the two
   * buttons and the plain reading are all about a question that is still open,
   * and this one is shut.
   */
  it("shows a question the page has moved past as the shut question it is", () => {
    const held = new Map<string, HeldReading>([
      [HELD.recordId, { moved: movedOn(0, 3)! }],
    ])

    render(<TheRecord records={[HELD]} marked={NOTHING_MARKED} held={held} revision={3} />)

    expect(screen.queryByRole("button", { name: "Apply this change" })).toBeNull()
    expect(screen.getByRole("button", { name: ASK_AGAIN_LABEL })).toBeTruthy()
  })
})

describe("the question waiting on an answer", () => {
  it("is the newest hold nobody has answered", () => {
    expect(awaitingAnswer([HELD, APPLIED], NO_READINGS)?.recordId).toBe(HELD.recordId)
  })

  it("is nothing when every change has been settled", () => {
    expect(awaitingAnswer([APPLIED, OTHER], NO_READINGS)).toBeUndefined()
  })

  /**
   * Never a question nobody can answer. Scrolling a visitor to a hold the page
   * has moved past is worse than leaving them where they are, and a stale hold
   * is exactly the one whose reading carries a `moved` note.
   */
  it("is never a hold the page has moved past", () => {
    const moved = new Map<string, HeldReading>([
      [HELD.recordId, { moved: movedOn(0, 3)! }],
    ])

    expect(awaitingAnswer([HELD, APPLIED], moved)).toBeUndefined()
  })
})
