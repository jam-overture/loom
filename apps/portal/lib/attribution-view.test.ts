import { describe, expect, it } from "vitest"

import type { DeltaId, NodeId, ProposalId, TreeDelta, TreeId } from "@loom/runtime"
import type { NodeAttribution, NodeChange, NodeTouch, StoredRevision } from "@loom/runtime/store"

import { creditFor, nodeCredits, TOUCH_LIMIT } from "./attribution-view"

const APPLIED_AT = "2026-08-06T00:00:00.000Z"

/**
 * A credit never reads the delta — it reads the provenance beside it. This is
 * here to make a `StoredRevision` a real one rather than a cast.
 */
const deltaAt = (revision: number): TreeDelta => ({
  deltaId: "d_1" as DeltaId,
  treeId: "t_1" as TreeId,
  baseRevision: revision - 1,
  operations: [{ op: "remove", nodeId: "n_gone" as NodeId }],
})

const entryAt = (
  revision: number,
  actor: string | undefined,
  extra: { readonly authoredBy?: "model" | "runtime"; readonly answeredBy?: string } = {}
): StoredRevision => ({
  treeId: "t_1" as TreeId,
  revision,
  proposalId: "p_1" as ProposalId,
  delta: deltaAt(revision),
  provenance: {
    origin: "user-instruction",
    ...(actor === undefined ? {} : { actor }),
    interpreter: "scripted",
    authoredBy: extra.authoredBy ?? "model",
    confidence: 0.8,
    interpretedAt: APPLIED_AT,
  },
  appliedAt: APPLIED_AT,
  ...(extra.answeredBy === undefined ? {} : { answeredBy: extra.answeredBy }),
})

const changeAt = (revision: number, actor: string, effect: NodeChange): NodeTouch<NodeChange> => ({
  effect,
  named: true,
  entry: entryAt(revision, actor),
})

const placedBy = (
  touch: NodeTouch,
  since: readonly NodeTouch<NodeChange>[] = []
): NodeAttribution => ({
  outcome: "placed",
  nodeId: "n_1" as NodeId,
  placed: touch,
  since,
})

describe("creditFor", () => {
  it("names who asked and who wrote it", () => {
    const credit = creditFor(placedBy({ effect: "placed", named: true, entry: entryAt(4, "alice") }))

    expect(credit.placed).toContain("added at revision 4")
    expect(credit.placed).toContain("alice asked")
    expect(credit.placed).toContain("the model wrote it")
    expect(credit.revision).toBe(4)
    expect(credit.partial).toBe(false)
  })

  it("says the runtime wrote it when the runtime did", () => {
    const credit = creditFor(
      placedBy({
        effect: "placed",
        named: true,
        entry: entryAt(9, "alice", { authoredBy: "runtime" }),
      })
    )

    expect(credit.placed).toContain("the runtime wrote it")
    expect(credit.placed).not.toContain("the model wrote it")
  })

  it("names the approver separately from the asker", () => {
    const credit = creditFor(
      placedBy({ effect: "placed", named: true, entry: entryAt(4, "alice", { answeredBy: "bob" }) })
    )

    expect(credit.placed).toContain("alice asked")
    expect(credit.placed).toContain("allowed by bob")
  })

  it("says nothing about an approver when nobody had to allow it", () => {
    const credit = creditFor(placedBy({ effect: "placed", named: true, entry: entryAt(4, "alice") }))

    expect(credit.placed).not.toContain("allowed by")
  })

  it("distinguishes a node that was carried in from one that was asked for", () => {
    const carried = creditFor(
      placedBy({ effect: "placed", named: false, entry: entryAt(4, "alice") })
    )

    expect(carried.placed).toContain("brought in as part of a larger change")
    expect(carried.placed).not.toContain("added at revision")
  })

  it("does not invent an actor when the log recorded none", () => {
    const credit = creditFor(
      placedBy({ effect: "placed", named: true, entry: entryAt(4, undefined) })
    )

    expect(credit.placed).toContain("someone unrecorded asked")
  })

  it("credits a seeded node to no revision, and links nowhere", () => {
    const credit = creditFor({ outcome: "seeded", nodeId: "n_1" as NodeId, since: [] })

    expect(credit.placed).toContain("from the start")
    expect(credit.revision).toBeNull()
    expect(credit.partial).toBe(false)
  })

  it("marks an undetermined credit partial rather than calling it seeded", () => {
    const credit = creditFor({ outcome: "undetermined", nodeId: "n_1" as NodeId, since: [] })

    expect(credit.partial).toBe(true)
    expect(credit.placed).toContain("further back")
    expect(credit.placed).not.toContain("from the start")
    expect(credit.revision).toBeNull()
  })

  it("has nothing to say about a node nothing has touched", () => {
    expect(creditFor(placedBy({ effect: "placed", named: true, entry: entryAt(1, "alice") })).since).toBeNull()
  })

  it("lists what has touched it since, with the verb and the actor", () => {
    const credit = creditFor(
      placedBy({ effect: "placed", named: true, entry: entryAt(1, "alice") }, [
        changeAt(2, "bob", "configured"),
        changeAt(3, "carol", "moved"),
      ])
    )

    expect(credit.since).toBe(
      "since: configured by bob at revision 2, moved by carol at revision 3"
    )
  })

  it("keeps the most recent touches and counts the rest", () => {
    const many = Array.from({ length: TOUCH_LIMIT + 2 }, (_, index) =>
      changeAt(index + 2, `actor-${index}`, "configured")
    )

    const credit = creditFor(placedBy({ effect: "placed", named: true, entry: entryAt(1, "a") }, many))

    expect(credit.since).toContain("and 2 earlier")
    /** The newest survive the cap — the oldest is the one dropped. */
    expect(credit.since).not.toContain("actor-0")
    expect(credit.since).toContain(`actor-${TOUCH_LIMIT + 1}`)
  })

  it("reports touches on a node whose placement was never found", () => {
    const credit = creditFor({
      outcome: "undetermined",
      nodeId: "n_1" as NodeId,
      since: [changeAt(12, "bob", "configured")],
    })

    expect(credit.partial).toBe(true)
    expect(credit.since).toContain("configured by bob at revision 12")
  })
})

describe("nodeCredits", () => {
  it("keys credits by node id, in a shape that crosses to the client", () => {
    const credits = nodeCredits({
      nodes: new Map<NodeId, NodeAttribution>([
        ["n_1" as NodeId, placedBy({ effect: "placed", named: true, entry: entryAt(2, "alice") })],
        ["n_2" as NodeId, { outcome: "seeded", nodeId: "n_2" as NodeId, since: [] }],
      ]),
      examinedTo: 1,
      reachedStart: true,
    })

    expect(Object.keys(credits).sort()).toEqual(["n_1", "n_2"])
    expect(credits.n_1?.revision).toBe(2)
    expect(credits.n_2?.revision).toBeNull()
    expect(JSON.parse(JSON.stringify(credits))).toEqual(credits)
  })
})
