import { describe, expect, it } from "vitest"

import { sequentialIdFactory } from "../ids.js"
import { FIXED_INSTANT } from "../testing/doubles.js"

import type { StoredRevision } from "./store.js"
import { undoneRevisions } from "./undone.js"

const ids = sequentialIdFactory("undone")
const treeId = ids.treeId()

/**
 * A log entry with nothing in its delta.
 *
 * `undoneRevisions` reads provenance and revision numbers and never looks at a
 * delta, so giving these operations would be describing work the assertions do
 * not depend on.
 */
const entry = (revision: number, undoes?: number): StoredRevision => ({
  treeId,
  revision,
  proposalId: ids.proposalId(),
  delta: { deltaId: ids.deltaId(), treeId, baseRevision: revision - 1, operations: [] },
  appliedAt: FIXED_INSTANT,
  provenance: {
    origin: "user-instruction",
    interpreter: undoes === undefined ? "test/model" : "loom/revert",
    authoredBy: undoes === undefined ? "model" : "runtime",
    ...(undoes === undefined ? {} : { undoes }),
    confidence: 1,
    interpretedAt: FIXED_INSTANT,
  },
})

const undoneIn = (entries: readonly StoredRevision[]): readonly number[] =>
  [...undoneRevisions(entries).keys()].sort((left, right) => left - right)

describe("undoneRevisions", () => {
  it("reports nothing for a log in which nothing was put back", () => {
    expect(undoneIn([entry(1), entry(2), entry(3)]).length).toBe(0)
  })

  it("names the entry that put a revision back", () => {
    const undo = entry(4, 2)
    const undone = undoneRevisions([entry(1), entry(2), entry(3), undo])

    expect([...undone.keys()]).toEqual([2])
    expect(undone.get(2)).toBe(undo)
  })

  it("does not report a revision as undone when the undo was itself undone", () => {
    /** 5 puts 3 back; 7 puts 5 back, so 3's change is live again — and 5 is not. */
    expect(undoneIn([entry(3), entry(5, 3), entry(7, 5)])).toEqual([5])
  })

  it("reports a revision as undone again when the undo of its undo was undone", () => {
    /**
     * The case a single hop gets wrong in both directions: 3 is undone (by 5,
     * which stands because 7 does not), and 7 is undone (by 9). This is the
     * assertion that separates "is this undone now" from "did anything ever
     * undo this".
     */
    expect(undoneIn([entry(3), entry(5, 3), entry(7, 5), entry(9, 7)])).toEqual([3, 7])
  })

  it("reads the same log the same way whatever order the entries arrive in", () => {
    const entries = [entry(3), entry(5, 3), entry(7, 5), entry(9, 7)]

    expect(undoneIn([...entries].reverse())).toEqual([3, 7])
  })

  it("reports the oldest standing undo when two entries undo one revision", () => {
    const first = entry(4, 2)
    const second = entry(6, 2)
    const undone = undoneRevisions([entry(2), second, first])

    expect(undone.get(2)).toBe(first)
  })

  it("falls through to a later undo when the first one was itself undone", () => {
    const first = entry(4, 2)
    const second = entry(6, 2)
    const undone = undoneRevisions([entry(2), first, entry(5, 4), second])

    expect(undone.get(2)).toBe(second)
  })

  it("treats an undo outside the stretch it was given as not seen", () => {
    /**
     * The bound is the caller's page, not the log. Reading only the older half
     * of the same log reports 3 as standing, which is the honest answer to
     * "undone within this stretch" and is why the absence is documented as that
     * rather than as "not undone".
     */
    expect(undoneIn([entry(3)])).toEqual([])
    expect(undoneIn([entry(3), entry(5, 3)])).toEqual([3])
  })

  it("still reports an undo whose target is off the page", () => {
    /**
     * What the entry says it put back is a fact the entry carries, and a screen
     * showing that entry wants it whether or not the revision it names was paged
     * in beside it.
     */
    const undo = entry(9, 1)

    expect(undoneRevisions([entry(8), undo]).get(1)).toBe(undo)
  })
})
