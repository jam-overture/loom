import { describe, expect, it } from "vitest"

import type { LoomTree, TreeId } from "@loom/runtime"

import { runtimeWordsIn } from "@/app/(portal)/_test/plain-language"

import {
  checkupReach,
  reachDetail,
  reachReading,
  type CheckupReach,
  type ReachGap,
} from "./checkup-reach"

const id = (name: string): TreeId => name as TreeId

/**
 * A head is only read here for its revision, which is the number of accepted
 * changes (0016) and the only thing this module takes off a page.
 */
const head = (name: string, revision: number): LoomTree =>
  ({ treeId: id(name), schemaVersion: 1, revision, root: {} }) as unknown as LoomTree

const headsOf = (entries: readonly (readonly [string, number])[]): ReadonlyMap<string, LoomTree> =>
  new Map(entries.map(([name, revision]) => [name, head(name, revision)] as const))

const reach = (over: Partial<CheckupReach> = {}): CheckupReach => ({
  listed: 4,
  checkable: 4,
  unvouchable: 0,
  unreadable: 0,
  changes: 12,
  complete: true,
  ...over,
})

const surfaceOf = (reading: ReturnType<typeof reachReading>): string =>
  [reading.headline, reading.meaning, reading.cost, ...reading.gaps.map((gap) => gap.plain)].join(
    " "
  )

const keys = (gaps: readonly ReachGap[]): readonly string[] => gaps.map((gap) => gap.key)

describe("checkupReach", () => {
  it("counts a page with a starting shape and a head that answered as checkable", () => {
    const found = checkupReach({
      treeIds: [id("t_a"), id("t_b")],
      heads: headsOf([
        ["t_a", 3],
        ["t_b", 5],
      ]),
      hasStartingShape: () => true,
      complete: true,
    })

    expect(found).toEqual({
      listed: 2,
      checkable: 2,
      unvouchable: 0,
      unreadable: 0,
      changes: 8,
      complete: true,
    })
  })

  /**
   * The rule the module exists for. A page this deployment cannot reproduce the
   * starting shape of is absent from every verdict the portal can give — it
   * fails nothing and passes nothing — so counting it as checkable is the one
   * mistake that would make the sentence above the press a lie.
   */
  it("never counts a page with no starting shape among the ones it can check", () => {
    const found = checkupReach({
      treeIds: [id("t_seeded"), id("t_other")],
      heads: headsOf([
        ["t_seeded", 6],
        ["t_other", 40],
      ]),
      hasStartingShape: (treeId) => treeId === id("t_seeded"),
      complete: true,
    })

    expect(found.checkable).toBe(1)
    expect(found.unvouchable).toBe(1)
  })

  /**
   * And its cost is not in the sum either. `t_other` has forty accepted changes
   * and none of them would be replayed, so a press promising forty would be
   * promising work it is not going to do.
   */
  it("leaves the changes on an uncheckable page out of what a press would replay", () => {
    const found = checkupReach({
      treeIds: [id("t_seeded"), id("t_other")],
      heads: headsOf([
        ["t_seeded", 6],
        ["t_other", 40],
      ]),
      hasStartingShape: (treeId) => treeId === id("t_seeded"),
      complete: true,
    })

    expect(found.changes).toBe(6)
  })

  /**
   * A head missing from the map is a read that failed, and it is a third state
   * rather than either of the other two: not a pass, and not the permanent
   * condition that no starting shape is.
   */
  it("counts a page whose head did not come back apart from one with no starting shape", () => {
    const found = checkupReach({
      treeIds: [id("t_a"), id("t_b"), id("t_c")],
      heads: headsOf([["t_a", 2]]),
      hasStartingShape: (treeId) => treeId !== id("t_c"),
      complete: true,
    })

    expect(found).toEqual({
      listed: 3,
      checkable: 1,
      unvouchable: 1,
      unreadable: 1,
      changes: 2,
      complete: true,
    })
  })

  /**
   * The three counts are a partition, asserted rather than trusted. This is the
   * assertion that fails if a fourth reason a page cannot be checked is added
   * and quietly lands in one of the existing buckets.
   */
  it("puts every listed page under exactly one of the three counts", () => {
    const found = checkupReach({
      treeIds: [id("t_a"), id("t_b"), id("t_c"), id("t_d"), id("t_e")],
      heads: headsOf([
        ["t_a", 1],
        ["t_b", 1],
        ["t_d", 1],
      ]),
      hasStartingShape: (treeId) => treeId !== id("t_e"),
      complete: true,
    })

    expect(found.checkable + found.unvouchable + found.unreadable).toBe(found.listed)
  })

  it("carries the listing's own honesty about whether it reached the end", () => {
    const found = checkupReach({
      treeIds: [id("t_a")],
      heads: headsOf([["t_a", 0]]),
      hasStartingShape: () => true,
      complete: false,
    })

    expect(found.complete).toBe(false)
  })

  it("has no counts and nothing to replay over an empty listing", () => {
    const found = checkupReach({
      treeIds: [],
      heads: new Map(),
      hasStartingShape: () => true,
      complete: true,
    })

    expect(found).toEqual({
      listed: 0,
      checkable: 0,
      unvouchable: 0,
      unreadable: 0,
      changes: 0,
      complete: true,
    })
  })
})

describe("what the invitation says", () => {
  /**
   * Every sentence here is shown unasked, so none of them may use a word from
   * the runtime's vocabulary. Asserted over the whole surface of every arm
   * rather than a headline, because the sentence under a headline is the one a
   * rewrite leaves a runtime word in.
   */
  it("says nothing a reader has to already know, in any state", () => {
    const states: readonly CheckupReach[] = [
      reach(),
      reach({ listed: 1, checkable: 1, changes: 3 }),
      reach({ listed: 1, checkable: 1, changes: 0 }),
      reach({ checkable: 1, unvouchable: 3, changes: 4 }),
      reach({ checkable: 0, unvouchable: 4, changes: 0 }),
      reach({ checkable: 0, unvouchable: 0, unreadable: 4, changes: 0 }),
      reach({ checkable: 2, unreadable: 2, changes: 7, complete: false }),
      reach({ listed: 1, checkable: 0, unvouchable: 1, changes: 0 }),
    ]

    for (const state of states) {
      expect(runtimeWordsIn(surfaceOf(reachReading(state))), surfaceOf(reachReading(state))).toEqual(
        []
      )
    }
  })

  /**
   * The count and the verb have to agree, and the two defects the sweep caught
   * before it shipped were both this — *"All 1 page that could be checked add
   * up"*. Both were found by asserting the whole sentence rather than a phrase
   * inside it, so both sides of one are pinned here.
   */
  it("reads as English on both sides of one page", () => {
    expect(reachReading(reach({ listed: 1, checkable: 1, changes: 1 })).headline).toBe(
      "Loom can check your page."
    )
    expect(reachReading(reach({ listed: 1, checkable: 1, changes: 1 })).cost).toBe(
      "It replays 1 change across 1 page, so it takes a moment."
    )
    expect(reachReading(reach({ listed: 2, checkable: 2, changes: 2 })).headline).toBe(
      "Loom can check all 2 of your pages."
    )
    expect(reachReading(reach({ listed: 2, checkable: 2, changes: 2 })).cost).toBe(
      "It replays 2 changes across 2 pages, so it takes a moment."
    )
  })

  it("says how many of the listed pages it can speak for when it cannot speak for all of them", () => {
    expect(reachReading(reach({ checkable: 1, unvouchable: 3, changes: 4 })).headline).toBe(
      "Loom can check 1 of your 4 pages."
    )
  })

  /**
   * The arm a later edit would fold into the one above it, because "some pages
   * can't be checked" is true of both. It is a different sentence because it is
   * a different fact: there is no green result available on this deployment at
   * all, and a headline that implied one was coming would be the confident empty
   * state this whole surface is built against.
   */
  it("does not promise a checkup on a deployment where nothing can be checked", () => {
    const reading = reachReading(reach({ checkable: 0, unvouchable: 4, changes: 0 }))

    expect(reading.headline).toBe("Loom can’t check any of your 4 pages yet.")
    expect(reading.headline).not.toContain("Loom can check")
    expect(reading.meaning).toContain("nothing to compare")
  })

  it("says it of one page in the singular", () => {
    expect(reachReading(reach({ listed: 1, checkable: 0, unvouchable: 1, changes: 0 })).headline).toBe(
      "Loom can’t check your page yet."
    )
  })

  /**
   * The press is still offered where nothing can be checked, and the sentence
   * says why rather than leaving a button with no promise on it: the sweep is
   * the only screen in the portal that names *which* pages it cannot speak for.
   */
  it("gives the press a reason even when there is nothing to check", () => {
    expect(reachReading(reach({ checkable: 0, unvouchable: 4, changes: 0 })).meaning).toContain(
      "names the pages it can’t speak for"
    )
  })

  /**
   * "It takes a moment" was the whole of what the checkup screen could say about
   * its own cost, and a moment is not a unit. The count is free on the front
   * door and it is what the wait is actually made of.
   */
  it("says what the wait is made of, in the number it is made of", () => {
    expect(reachReading(reach({ checkable: 4, changes: 37 })).cost).toBe(
      "It replays 37 changes across 4 pages, so it takes a moment."
    )
  })

  /**
   * A deployment nothing has been accepted on is a real state and its own
   * sentence. "It replays 0 changes" is a number where a reader expects news,
   * and the news is that there is no history to replay yet — which does not make
   * the check pointless, because the page can still have drifted from the shape
   * it was created with.
   */
  it("tells a deployment with nothing to replay what the check would still do", () => {
    expect(reachReading(reach({ checkable: 2, changes: 0 })).cost).toContain(
      "the shape it started as"
    )
    expect(reachReading(reach({ checkable: 2, changes: 0 })).cost).not.toContain("0 changes")
    expect(reachReading(reach({ listed: 1, checkable: 1, changes: 0 })).cost).toBe(
      "Nothing has been accepted on it yet, so the checkup compares it with the shape it started as."
    )
  })
})

describe("the gaps between what was listed and what can be checked", () => {
  it("names none of them when a checkup can speak for the whole listing", () => {
    expect(reachReading(reach()).gaps).toEqual([])
  })

  /**
   * The gap worth the module. A page with no starting shape is neither passing
   * nor failing, and the sentence has to say so — a reader who reads *can't be
   * checked* and stops will otherwise assume it is fine.
   */
  it("says a page it cannot speak for is neither passing nor failing", () => {
    const gaps = reachReading(reach({ checkable: 1, unvouchable: 3, changes: 4 })).gaps

    expect(keys(gaps)).toEqual(["no-starting-shape"])
    expect(gaps[0]?.plain).toContain("neither passing nor failing")
  })

  it("says it of one page in the singular", () => {
    const gaps = reachReading(reach({ checkable: 3, unvouchable: 1, changes: 4 })).gaps

    expect(gaps[0]?.plain).toBe(
      "One page has no starting shape on record, so a checkup can’t speak for it either way. It is neither passing nor failing — it is simply left out."
    )
  })

  /**
   * A store that did not answer this second and a deployment that will never be
   * able to check a page are not the same news, and only one of them is worth
   * doing something about today.
   */
  it("tells a page that would not answer apart from one with no starting shape", () => {
    const gaps = reachReading(reach({ checkable: 2, unvouchable: 1, unreadable: 1, changes: 4 })).gaps

    expect(keys(gaps)).toEqual(["no-starting-shape", "would-not-answer"])
    expect(gaps[1]?.plain).toContain("this moment rather than a fault")
  })

  it("admits the listing was partial rather than counting over the whole deployment", () => {
    const gaps = reachReading(reach({ complete: false })).gaps

    expect(keys(gaps)).toEqual(["beyond-the-listing"])
    expect(gaps[0]?.plain).toContain("more pages than this screen listed")
  })

  it("says all three when all three are true, in the order they can be acted on", () => {
    const gaps = reachReading(
      reach({ checkable: 1, unvouchable: 2, unreadable: 1, changes: 3, complete: false })
    ).gaps

    expect(keys(gaps)).toEqual(["no-starting-shape", "would-not-answer", "beyond-the-listing"])
  })

  it("gives every gap a sentence of its own rather than one shared wording", () => {
    const gaps = reachReading(
      reach({ checkable: 1, unvouchable: 2, unreadable: 1, changes: 3, complete: false })
    ).gaps

    expect(new Set(gaps.map((gap) => gap.plain)).size).toBe(gaps.length)
  })
})

describe("the runtime's account, one click down", () => {
  /**
   * The other half of the rule. Nothing is removed to make the surface plain —
   * the seed, the fold, the snapshot and the revisions are all still here, and
   * this assertion is what says so.
   */
  it("keeps every word the surface is not allowed to say", () => {
    const detail = reachDetail(reach({ unreadable: 1 })).join(" ")

    expect(runtimeWordsIn(detail).length).toBeGreaterThan(0)
    for (const word of ["seed", "snapshot", "revision", "log"]) expect(detail).toContain(word)
  })

  it("cites the two records the refusal and the cost come from", () => {
    const detail = reachDetail(reach()).join(" ")

    expect(detail).toContain("0028")
    expect(detail).toContain("0016")
  })

  it("says the listing was partial when it was", () => {
    expect(reachDetail(reach({ complete: false })).join(" ")).toContain("there are more")
    expect(reachDetail(reach()).join(" ")).toContain("reached the end of it")
  })

  /**
   * A sum that silently omits the pages whose heads did not come back is a sum
   * that under-promises without saying so. It is said in the disclosure rather
   * than on the surface because the surface already has a sentence for those
   * pages.
   */
  it("says which reads are missing from the sum when any are", () => {
    expect(reachDetail(reach({ checkable: 3, unreadable: 1 })).join(" ")).toContain(
      "did not come back"
    )
    expect(reachDetail(reach()).join(" ")).not.toContain("did not come back")
  })
})
