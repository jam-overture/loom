import { describe, expect, it } from "vitest"

import { treeIdSchema, type TreeId } from "../ids.js"
import { err, ok } from "../result.js"
import type { StoreError } from "../store/errors.js"
import type { TreeReader } from "../store/store.js"
import { sampleTree } from "../testing/fixtures.js"
import { heldProposalFixture } from "../testing/hold-contract.js"
import type { LoomTree } from "../tree/tree.js"

import type { HeldProposal } from "./held.js"
import {
  holdLiveness,
  HOLD_LIVENESS,
  markHolds,
  markHoldsFromStore,
  treesAwaitingAnswer,
  type HoldLiveness,
} from "./liveness.js"

const treeId = (name: string): TreeId => treeIdSchema.parse(name)

const heldAt = (revision: number, tree: string): HeldProposal => ({
  ...heldProposalFixture({ treeId: treeId(tree) }),
  baseRevision: revision,
})

/**
 * Only `head` is ever called, so the double answers with a revision and nothing
 * else about a tree. `revisions` is present because `TreeReader` has it and
 * throws rather than returning an empty page, so a change that started reading
 * history through here would fail loudly instead of silently agreeing.
 */
const treeAt = (id: TreeId, revision: number): LoomTree => ({
  ...sampleTree().tree,
  treeId: id,
  revision,
})

const readerOf = (heads: Readonly<Record<string, number | StoreError>>): TreeReader => ({
  head: (id) => {
    const found = heads[id]

    if (found === undefined) {
      return Promise.resolve(err<StoreError>({ code: "not-found", treeId: id }))
    }

    return Promise.resolve(typeof found === "number" ? ok(treeAt(id, found)) : err<StoreError>(found))
  },
  revisions: () => {
    throw new Error("a liveness check reads heads and nothing else")
  },
})

describe("holdLiveness", () => {
  it("calls a hold live when the page has not moved since it was judged", () => {
    expect(holdLiveness(heldAt(4, "t_a"), 4)).toBe("live")
  })

  it("calls a hold dead when the page has moved on", () => {
    expect(holdLiveness(heldAt(3, "t_a"), 4)).toBe("dead")
  })

  /**
   * The direction the write path actually compares in. `confirmHeld` refuses any
   * head that is not the exact revision judged against, so a hold naming a
   * revision *ahead* of head is refused too — a helper reading it as live would
   * badge a change that cannot happen as one that can.
   */
  it("calls a hold ahead of head dead rather than live", () => {
    expect(holdLiveness(heldAt(5, "t_a"), 4)).toBe("dead")
  })

  it("says nothing about a tree it was given no revision for", () => {
    expect(holdLiveness(heldAt(4, "t_a"), undefined)).toBe("unknown")
  })
})

describe("HOLD_LIVENESS", () => {
  it("names every answer once", () => {
    expect(new Set(HOLD_LIVENESS).size).toBe(HOLD_LIVENESS.length)
  })

  /**
   * The reason the constant exists rather than the constant restated: a host
   * keying a bucket per answer gets a total record, and a fourth answer would
   * take this red rather than being quietly dropped by whatever walked it.
   */
  it("is total against the type", () => {
    const legend: Record<HoldLiveness, string> = {
      live: "can still be answered",
      dead: "the page moved on",
      unknown: "nobody could say",
    }

    expect(HOLD_LIVENESS.map((liveness) => legend[liveness])).toHaveLength(HOLD_LIVENESS.length)
  })
})

describe("treesAwaitingAnswer", () => {
  it("names each tree once however many holds it has", () => {
    const holds = [heldAt(1, "t_a"), heldAt(2, "t_a"), heldAt(1, "t_b")]

    expect(treesAwaitingAnswer(holds)).toEqual([treeId("t_a"), treeId("t_b")])
  })

  it("keeps the order the holds arrived in rather than sorting", () => {
    const holds = [heldAt(1, "t_b"), heldAt(1, "t_a")]

    expect(treesAwaitingAnswer(holds)).toEqual([treeId("t_b"), treeId("t_a")])
  })

  it("has nothing to read for an empty queue", () => {
    expect(treesAwaitingAnswer([])).toEqual([])
  })
})

describe("markHolds", () => {
  it("marks a mixed queue against the heads it was given", () => {
    const live = heldAt(4, "t_a")
    const dead = heldAt(3, "t_a")
    const holds = [live, dead]

    expect(markHolds(holds, new Map([[treeId("t_a"), 4]]))).toEqual([
      { held: live, liveness: "live", headRevision: 4 },
      { held: dead, liveness: "dead", headRevision: 4 },
    ])
  })

  /**
   * The listing must not lose rows. A queue that quietly dropped the holds it
   * could not judge would be a worse version of the failure this closes: a
   * reviewer would not know the change was there at all.
   */
  it("keeps a hold whose tree it has no head for, and carries no revision for it", () => {
    const orphan = heldAt(2, "t_b")

    const marked = markHolds([orphan], new Map([[treeId("t_a"), 4]]))

    expect(marked).toEqual([{ held: orphan, liveness: "unknown" }])
    expect("headRevision" in (marked[0] ?? {})).toBe(false)
  })

  it("keeps the order it was handed, so a queue keeps compareHolds order", () => {
    const first = heldAt(1, "t_a")
    const second = heldAt(2, "t_b")

    const marked = markHolds(
      [first, second],
      new Map([
        [treeId("t_a"), 1],
        [treeId("t_b"), 9],
      ])
    )

    expect(marked.map(({ held, liveness }) => [held.treeId, liveness])).toEqual([
      [treeId("t_a"), "live"],
      [treeId("t_b"), "dead"],
    ])
  })
})

describe("markHoldsFromStore", () => {
  it("badges a queue spanning two trees from one head read each", async () => {
    const live = heldAt(4, "t_a")
    const dead = heldAt(3, "t_b")

    const { marked, unreadable } = await markHoldsFromStore(readerOf({ t_a: 4, t_b: 9 }), [
      live,
      dead,
    ])

    expect(marked).toEqual([
      { held: live, liveness: "live", headRevision: 4 },
      { held: dead, liveness: "dead", headRevision: 9 },
    ])
    expect(unreadable).toEqual([])
  })

  /**
   * The point of not returning a `Result`. One tree being unavailable leaves the
   * rest of the queue badged; failing the whole call would put a reviewer back in
   * front of the undifferentiated list this module exists to remove.
   */
  it("leaves one tree's holds unknown when its head cannot be read, and badges the rest", async () => {
    const reachable = heldAt(4, "t_a")
    const unreachable = heldAt(4, "t_b")

    const { marked, unreadable } = await markHoldsFromStore(
      readerOf({ t_a: 4, t_b: { code: "unavailable", detail: "connection lost" } }),
      [reachable, unreachable]
    )

    expect(marked).toEqual([
      { held: reachable, liveness: "live", headRevision: 4 },
      { held: unreachable, liveness: "unknown" },
    ])
    expect(unreadable).toEqual([{ code: "unavailable", detail: "connection lost" }])
  })

  /**
   * `not-found` is a different fault from a revision conflict, and dressing it
   * up as one would tell a reviewer the page moved on when the page is gone.
   */
  it("calls a hold against a missing tree unknown rather than dead", async () => {
    const orphan = heldAt(4, "t_gone")

    const { marked, unreadable } = await markHoldsFromStore(readerOf({}), [orphan])

    expect(marked).toEqual([{ held: orphan, liveness: "unknown" }])
    expect(unreadable).toEqual([{ code: "not-found", treeId: treeId("t_gone") }])
  })

  it("reads one head per tree rather than one per hold", async () => {
    const reads: TreeId[] = []
    const counting: TreeReader = {
      head: (id) => {
        reads.push(id)

        return Promise.resolve(ok(treeAt(id, 4)))
      },
      revisions: () => {
        throw new Error("a liveness check reads heads and nothing else")
      },
    }

    await markHoldsFromStore(counting, [heldAt(4, "t_a"), heldAt(3, "t_a"), heldAt(4, "t_b")])

    expect(reads).toEqual([treeId("t_a"), treeId("t_b")])
  })

  it("reads nothing at all for an empty queue", async () => {
    const { marked, unreadable } = await markHoldsFromStore(readerOf({}), [])

    expect(marked).toEqual([])
    expect(unreadable).toEqual([])
  })
})
