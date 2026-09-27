import { describe, expect, it } from "vitest"

import { proposalIdSchema } from "@jam-overture/loom"
import type { UnreadableHold } from "@jam-overture/loom/write"

import { runtimeWordsIn } from "../_test/plain-language"

import {
  inQueueOrder,
  pagesWaitingSummary,
  unreadableChange,
  unreadableChangesIn,
  unreadableClause,
  unreadableMark,
} from "./unreadable-change"

const row = (proposalId = "p_stuck", heldAt = "2026-07-30T12:00:00.000Z"): UnreadableHold => ({
  proposalId: proposalIdSchema.parse(proposalId),
  heldAt,
  detail: "a stored hold did not parse: disposition",
})

describe("unreadableChange", () => {
  /**
   * The only human-facing fact the row carries. Everything else a queue row
   * usually has — the utterance, the rule, the stakes, what it would do — lives
   * inside the shape this build rejected, so the moment is the whole of what
   * there is to say, and it is worth saying: a row stuck this morning and a row
   * stuck in July are the same error and different problems.
   */
  it("reads the moment it stopped rather than printing the timestamp", () => {
    const change = unreadableChange("t_1", row())

    expect(change.since).toBe("30 July 2026 at 12:00 UTC")
    expect(change.sinceIso).toBe("2026-07-30T12:00:00.000Z")
  })

  it("keeps the row's own name for whoever has to go and find it", () => {
    expect(unreadableChange("t_1", row()).proposalId).toBe("p_stuck")
    expect(unreadableChange("t_1", row()).treeId).toBe("t_1")
  })

  /**
   * The store's account is what tells two of these apart — every other string
   * on the card is the same sentence every time — so it is carried verbatim
   * rather than reworded into something a reader would find friendlier and a
   * developer could not search for.
   */
  it("carries the store's own account of which field disagreed, unreworded", () => {
    expect(unreadableChange("t_1", row()).detail).toBe(
      "a stored hold did not parse: disposition"
    )
  })

  /**
   * The plain-language rule, applied to the one card on this surface whose
   * subject is a runtime failure. It is the hardest case and therefore the one
   * most worth a test: the honest technical description of this row uses four
   * words off the list in a sentence.
   */
  it("says what happened without using a single runtime word", () => {
    const change = unreadableChange("t_1", row())

    expect(runtimeWordsIn(change.why)).toEqual([])
    expect(runtimeWordsIn(change.next)).toEqual([])
  })

  /**
   * The card has no buttons on it, and a reader is owed the reason rather than
   * left to wonder what they are missing. This is the sentence that says it.
   */
  it("says there is nothing here to answer", () => {
    expect(unreadableChange("t_1", row()).why).toContain("nothing here to say yes or no to")
  })

  /**
   * A queue teaches a reader that rows leave when they are answered, and this
   * one never will. It also must not send them to the page: the page screen
   * reads the same store and fails on the same row.
   */
  it("says waiting will not clear it and neither will opening the page", () => {
    const next = unreadableChange("t_1", row()).next

    expect(next).toContain("Waiting won't clear it")
    expect(next).toContain("neither will opening the page")
    expect(next).toContain("Nothing has been lost")
  })
})

describe("unreadableChangesIn", () => {
  it("describes every unreadable row of a listing against the page it is on", () => {
    const changes = unreadableChangesIn("t_2", {
      unreadable: [row("p_a"), row("p_b", "2026-08-01T00:00:00.000Z")],
    })

    expect(changes.map((change) => change.proposalId)).toEqual(["p_a", "p_b"])
    expect(changes.every((change) => change.treeId === "t_2")).toBe(true)
  })

  it("is empty for a listing that read cleanly", () => {
    expect(unreadableChangesIn("t_1", { unreadable: [] })).toEqual([])
  })
})

describe("inQueueOrder", () => {
  const answerable = (proposalId: string, sinceIso: string) => ({ proposalId, sinceIso })
  const when = (change: { readonly sinceIso: string }) => change.sinceIso

  /**
   * A queue is ordered by how long something has waited. Grouping by page would
   * make the reader do the arithmetic this screen exists to do for them.
   */
  it("puts the longest wait first, whatever page it is on", () => {
    const rows = inQueueOrder(
      [
        answerable("p_new", "2026-08-19T09:00:00.000Z"),
        answerable("p_old", "2026-08-18T09:00:00.000Z"),
      ],
      [],
      when
    )

    expect(rows.map((entry) => (entry.kind === "answerable" ? entry.change.proposalId : ""))).toEqual(
      ["p_old", "p_new"]
    )
  })

  /**
   * The whole reason 0175 sorts `unreadable` in `compareHolds` order beside the
   * rows that parsed. A row lifted into a box at the bottom has had the one
   * fact it carries taken off it — a change stuck since July belongs at the top
   * of the queue whether or not anybody can answer it.
   */
  it("interleaves the rows nobody can answer by when they stopped", () => {
    const rows = inQueueOrder(
      [
        answerable("p_new", "2026-09-01T00:00:00.000Z"),
        answerable("p_mid", "2026-08-01T00:00:00.000Z"),
      ],
      [unreadableChange("t_1", row("p_stuck", "2026-07-01T00:00:00.000Z"))],
      when
    )

    expect(rows.map((entry) => entry.kind)).toEqual(["unreadable", "answerable", "answerable"])
    expect(rows[0]?.kind === "unreadable" ? rows[0].row.proposalId : "").toBe("p_stuck")
  })

  /**
   * The failure mode this function exists to prevent, stated as a test. Both
   * screens that draw a queue are files no test can reach, so a merge written
   * in one of them would sort its unreadable rows last and look entirely
   * correct in a screenshot of a deployment where they happen to be newest.
   */
  it("does not park the unanswerable rows at either end", () => {
    const rows = inQueueOrder(
      [
        answerable("p_old", "2026-07-01T00:00:00.000Z"),
        answerable("p_new", "2026-09-01T00:00:00.000Z"),
      ],
      [unreadableChange("t_1", row("p_stuck", "2026-08-01T00:00:00.000Z"))],
      when
    )

    expect(rows.map((entry) => entry.kind)).toEqual(["answerable", "unreadable", "answerable"])
  })

  /**
   * Two rows filed at the same instant must come out in the same order twice,
   * or a screenshot of one store taken twice is two different screens.
   */
  it("is stable on a tie, with the answerable row first", () => {
    const at = "2026-08-01T00:00:00.000Z"
    const rows = inQueueOrder(
      [answerable("p_1", at), answerable("p_2", at)],
      [unreadableChange("t_1", row("p_stuck", at))],
      when
    )

    expect(rows.map((entry) => entry.kind)).toEqual(["answerable", "answerable", "unreadable"])
    expect(rows.map((entry) => (entry.kind === "answerable" ? entry.change.proposalId : "p_stuck"))).toEqual(
      ["p_1", "p_2", "p_stuck"]
    )
  })

  it("does not mutate what it is given", () => {
    const changes = [
      answerable("p_new", "2026-09-01T00:00:00.000Z"),
      answerable("p_old", "2026-07-01T00:00:00.000Z"),
    ]

    inQueueOrder(changes, [], when)

    expect(changes.map((change) => change.proposalId)).toEqual(["p_new", "p_old"])
  })

  it("is the answerable rows alone when nothing is stuck", () => {
    const rows = inQueueOrder([answerable("p_1", "2026-08-01T00:00:00.000Z")], [], when)

    expect(rows).toEqual([{ kind: "answerable", change: answerable("p_1", "2026-08-01T00:00:00.000Z") }])
  })
})

describe("unreadableClause", () => {
  it("says nothing at all when nothing is stuck", () => {
    expect(unreadableClause([], 3)).toBe("")
  })

  /**
   * "1 more" is the right phrase beside four other rows and a small lie beside
   * none — more than what? A queue whose only row is one nobody can read is the
   * case a reader is most likely to meet on a screen that otherwise says
   * *you're all caught up*, so it is the one the sentence must get right.
   */
  it("drops the word 'more' when there is nothing for it to be more than", () => {
    expect(unreadableClause([unreadableChange("t_1", row())], 0)).toBe(
      " 1 change was found and couldn't be read; it's in the list below."
    )
    expect(unreadableClause([unreadableChange("t_1", row())], 4)).toBe(
      " 1 more was found and couldn't be read; it's in the list below."
    )
  })

  it("agrees with itself in the plural, both ways", () => {
    const two = [unreadableChange("t_1", row("p_a")), unreadableChange("t_1", row("p_b"))]

    expect(unreadableClause(two, 0)).toBe(
      " 2 changes were found and couldn't be read; they're in the list below."
    )
    expect(unreadableClause(two, 1)).toBe(
      " 2 more were found and couldn't be read; they're in the list below."
    )
  })

  /**
   * It is concatenated onto a sentence that already ends in a full stop, so the
   * leading space is load-bearing — the 24 August lesson is that a missing one
   * satisfies every `toContain` either side of it.
   */
  it("leads with the space that joins it to the sentence before it", () => {
    expect(unreadableClause([unreadableChange("t_1", row())], 1).startsWith(" ")).toBe(true)
  })

  it("uses no runtime words", () => {
    expect(runtimeWordsIn(unreadableClause([unreadableChange("t_1", row())], 2))).toEqual([])
  })
})

describe("pagesWaitingSummary", () => {
  it("counts only what somebody can answer", () => {
    expect(pagesWaitingSummary([{ waiting: 4, unreadable: 1 }])).toBe(
      "4 changes are waiting for your answer. 1 change couldn't be read — the page it's on is marked below."
    )
  })

  /**
   * The 20 September finding's own case: a page with four answerable changes
   * and one row from a later build reads **4**, which is the first time this
   * number can be confidently short. It is the right number and the shortfall
   * is said out loud rather than absorbed.
   */
  it("never folds an unreadable row into the count", () => {
    expect(pagesWaitingSummary([{ waiting: 4, unreadable: 1 }]).startsWith("4 changes")).toBe(true)
  })

  /**
   * The row that read as *nothing is happening here*. A page whose only waiting
   * change is unreadable had no badge and no sentence, on an index whose entire
   * job is telling a reader which page needs them.
   */
  it("does not say nothing is waiting when a page holds only an unreadable row", () => {
    expect(pagesWaitingSummary([{ waiting: 0, unreadable: 1 }])).toBe(
      "Nothing is waiting that you can answer. 1 change couldn't be read — the page it's on is marked below."
    )
  })

  it("keeps the good news when there is nothing stuck and nothing waiting", () => {
    expect(pagesWaitingSummary([{ waiting: 0, unreadable: 0 }])).toBe(
      "Nothing is waiting for you. Open a page to see it or to ask for a change."
    )
  })

  /**
   * A page whose queue could not be read at all is a third state and not a
   * zero. The row already renders no badge for it, and the total must not
   * quietly treat it as nothing waiting *or* as something stuck — those are
   * both claims this screen cannot make about a page that did not answer.
   */
  it("skips a page whose queue could not be read rather than counting it either way", () => {
    expect(pagesWaitingSummary([{ waiting: null, unreadable: 0 }, { waiting: 2, unreadable: 0 }])).toBe(
      "2 changes are waiting for your answer."
    )
  })

  it("adds up across pages, both halves", () => {
    expect(
      pagesWaitingSummary([
        { waiting: 1, unreadable: 1 },
        { waiting: 2, unreadable: 2 },
      ])
    ).toBe(
      "3 changes are waiting for your answer. 3 changes couldn't be read — the pages they're on are marked below."
    )
  })

  /**
   * The clause here is deliberately not the queue's. `unreadableClause` ends
   * *"in the list below"*, which is true on the two screens that draw a queue
   * and false on an index whose list below is pages — a reader sent to scan it
   * for a change would not find one.
   */
  it("points at the marked page rather than at a list of changes", () => {
    const summary = pagesWaitingSummary([{ waiting: 1, unreadable: 1 }])

    expect(summary).toContain("the page it's on is marked below")
    expect(summary).not.toContain("in the list below")
  })

  it("uses no runtime words", () => {
    expect(runtimeWordsIn(pagesWaitingSummary([{ waiting: 1, unreadable: 1 }]))).toEqual([])
  })
})

describe("unreadableMark", () => {
  /**
   * The defect a photograph found and no test could. Both screens shipped
   * `{count} can&rsquo;t be read` and both rendered **`1can't be read`** —
   * JSX collapses the newline and indent between an expression and the text
   * after it, so the space a reader needs is the one the formatter removes.
   * Asserted as the whole string for the 24 August reason: a `toContain` on
   * either half is satisfied by the run-together version.
   */
  it("keeps the space between the number and the words", () => {
    expect(unreadableMark(1)).toBe("1 can’t be read")
    expect(unreadableMark(4)).toBe("4 can’t be read")
  })

  /**
   * Deliberately the same phrase either way. It is a mark rather than a
   * sentence — it sits beside a count badge, in a space the width of a word —
   * and "1 change can't be read" would make the two badges disagree about what
   * they are counting.
   */
  it("reads the same for one as for many", () => {
    expect(unreadableMark(2).endsWith("can’t be read")).toBe(true)
  })

  it("uses no runtime words", () => {
    expect(runtimeWordsIn(unreadableMark(1))).toEqual([])
  })
})
