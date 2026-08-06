import { describe, expect, it } from "vitest"

import { sequentialIdFactory, type NodeId, type ProposalId, type TreeId } from "../ids.js"
import { ok } from "../result.js"
import { FIXED_INSTANT } from "../testing/doubles.js"
import { sampleTree } from "../testing/fixtures.js"
import { buildElement, buildText } from "../tree/builders.js"
import type { TreeDelta, TreeOperation } from "../tree/delta.js"
import type { LoomNode } from "../tree/node.js"
import type { LoomTree } from "../tree/tree.js"

import type { Provenance } from "../runtime/proposal.js"

import { attributeTree, type NodeAttribution } from "./attribution.js"
import { memoryTreeStore } from "./memory.js"
import type { AppendRequest, TreeReader } from "./store.js"

const provenanceBy = (actor: string, interpreter = "scripted"): Provenance => ({
  origin: "user-instruction",
  actor,
  interpreter,
  authoredBy: "model",
  confidence: 0.9,
  interpretedAt: FIXED_INSTANT,
})

const appendOf = (
  delta: TreeDelta,
  provenance: Provenance,
  answeredBy?: string
): AppendRequest => ({
  proposalId: "p_1" as ProposalId,
  delta,
  provenance,
  appliedAt: FIXED_INSTANT,
  ...(answeredBy === undefined ? {} : { answeredBy }),
})

const deltaOf = (
  treeId: TreeId,
  baseRevision: number,
  operations: readonly TreeOperation[]
): TreeDelta => ({
  deltaId: sequentialIdFactory("d").deltaId(),
  treeId,
  baseRevision,
  operations,
})

/** A tree with one appended revision per delta, and the head it ended at. */
const logged = async (
  seed: LoomTree,
  entries: readonly { readonly operations: readonly TreeOperation[]; readonly actor: string }[]
) => {
  const store = memoryTreeStore()
  const created = await store.create(seed)
  if (!created.ok) throw new Error(`seed rejected: ${created.error.code}`)

  let head = created.value

  for (const entry of entries) {
    const appended = await store.append(
      seed.treeId,
      appendOf(deltaOf(seed.treeId, head.revision, entry.operations), provenanceBy(entry.actor))
    )

    if (!appended.ok) throw new Error(`append rejected: ${appended.error.code}`)
    head = appended.value
  }

  return { store, head }
}

const attributionFor = (
  attribution: { readonly nodes: ReadonlyMap<NodeId, NodeAttribution> },
  nodeId: NodeId
): NodeAttribution => {
  const found = attribution.nodes.get(nodeId)
  if (!found) throw new Error(`no attribution for ${nodeId}`)

  return found
}

const cardWith = (children: readonly LoomNode[]) => {
  const idFactory = sequentialIdFactory("new")
  const heading = buildText(idFactory, "Added")

  return buildElement(idFactory, { type: "loom.card", children: [heading, ...children] })
}

describe("attributeTree", () => {
  it("credits a node to the revision that inserted it, and to who asked", async () => {
    const { tree, ids } = sampleTree()
    const inserted = buildText(sequentialIdFactory("new"), "Added")

    const { store, head } = await logged(tree, [
      { operations: [{ op: "insert", parentId: ids.main, index: 1, node: inserted }], actor: "alice" },
    ])

    const attribution = await attributeTree(store, head)
    expect(attribution.ok).toBe(true)
    if (!attribution.ok) return

    const found = attributionFor(attribution.value, inserted.id)
    expect(found.outcome).toBe("placed")
    if (found.outcome !== "placed") return

    expect(found.placed.entry.revision).toBe(1)
    expect(found.placed.entry.provenance.actor).toBe("alice")
    expect(found.placed.named).toBe(true)
    expect(found.since).toEqual([])
  })

  it("credits a node the seed carried to no revision at all", async () => {
    const { tree, ids } = sampleTree()
    const { store, head } = await logged(tree, [
      { operations: [{ op: "remove", nodeId: ids.footer }], actor: "alice" },
    ])

    const attribution = await attributeTree(store, head)
    if (!attribution.ok) throw new Error("read failed")

    expect(attributionFor(attribution.value, ids.card).outcome).toBe("seeded")
    expect(attribution.value.reachedStart).toBe(true)
  })

  it("distinguishes the node an insert named from the ones it carried in", async () => {
    const { tree, ids } = sampleTree()
    const carried = buildText(sequentialIdFactory("kid"), "Inside")
    const card = cardWith([carried])

    const { store, head } = await logged(tree, [
      { operations: [{ op: "insert", parentId: ids.main, index: 1, node: card }], actor: "alice" },
    ])

    const attribution = await attributeTree(store, head)
    if (!attribution.ok) throw new Error("read failed")

    const root = attributionFor(attribution.value, card.id)
    const child = attributionFor(attribution.value, carried.id)

    expect(root.outcome === "placed" && root.placed.named).toBe(true)
    expect(child.outcome === "placed" && child.placed.named).toBe(false)
    /** Same revision, different sentence: both were placed by revision 1. */
    expect(child.outcome === "placed" && child.placed.entry.revision).toBe(1)
  })

  it("lists what touched a node after it was placed, oldest first", async () => {
    const { tree, ids } = sampleTree()
    const inserted = buildElement(sequentialIdFactory("new"), { type: "loom.card" })

    const { store, head } = await logged(tree, [
      { operations: [{ op: "insert", parentId: ids.main, index: 1, node: inserted }], actor: "alice" },
      { operations: [{ op: "configure", nodeId: inserted.id, set: { variant: "filled" }, unset: [] }], actor: "bob" },
      { operations: [{ op: "move", nodeId: inserted.id, parentId: ids.main, index: 0 }], actor: "carol" },
    ])

    const attribution = await attributeTree(store, head)
    if (!attribution.ok) throw new Error("read failed")

    const found = attributionFor(attribution.value, inserted.id)
    if (found.outcome !== "placed") throw new Error("expected a placement")

    expect(found.placed.entry.provenance.actor).toBe("alice")
    expect(found.since.map((touch) => touch.effect)).toEqual(["configured", "moved"])
    expect(found.since.map((touch) => touch.entry.provenance.actor)).toEqual(["bob", "carol"])
  })

  it("credits a node that left and came back to the revision that brought it back", async () => {
    const { tree, ids } = sampleTree()
    const original = buildText(sequentialIdFactory("new"), "Added")

    const { store, head } = await logged(tree, [
      { operations: [{ op: "insert", parentId: ids.main, index: 1, node: original }], actor: "alice" },
      { operations: [{ op: "remove", nodeId: original.id }], actor: "bob" },
      { operations: [{ op: "insert", parentId: ids.main, index: 1, node: original }], actor: "carol" },
    ])

    const attribution = await attributeTree(store, head)
    if (!attribution.ok) throw new Error("read failed")

    const found = attributionFor(attribution.value, original.id)
    if (found.outcome !== "placed") throw new Error("expected a placement")

    /**
     * The current tenancy, not the first one. Attribution answers "how did this
     * node come to be here", and the undo at revision 3 is that answer.
     */
    expect(found.placed.entry.revision).toBe(3)
    expect(found.placed.entry.provenance.actor).toBe("carol")
  })

  it("does not count a touch from before the node's current tenancy", async () => {
    const { tree, ids } = sampleTree()
    const node = buildElement(sequentialIdFactory("new"), { type: "loom.card" })

    const { store, head } = await logged(tree, [
      { operations: [{ op: "insert", parentId: ids.main, index: 1, node }], actor: "alice" },
      { operations: [{ op: "configure", nodeId: node.id, set: { variant: "filled" }, unset: [] }], actor: "bob" },
      { operations: [{ op: "remove", nodeId: node.id }], actor: "carol" },
      { operations: [{ op: "insert", parentId: ids.main, index: 1, node }], actor: "dave" },
    ])

    const attribution = await attributeTree(store, head)
    if (!attribution.ok) throw new Error("read failed")

    const found = attributionFor(attribution.value, node.id)
    if (found.outcome !== "placed") throw new Error("expected a placement")

    expect(found.placed.entry.revision).toBe(4)
    expect(found.since).toEqual([])
  })

  it("carries the approver through, because who allowed it is not who asked", async () => {
    const { tree, ids } = sampleTree()
    const store = memoryTreeStore()
    const created = await store.create(tree)
    if (!created.ok) throw new Error("seed rejected")

    const inserted = buildText(sequentialIdFactory("new"), "Added")
    const appended = await store.append(
      tree.treeId,
      appendOf(
        deltaOf(tree.treeId, 0, [{ op: "insert", parentId: ids.main, index: 1, node: inserted }]),
        provenanceBy("alice"),
        "bob"
      )
    )
    if (!appended.ok) throw new Error("append rejected")

    const attribution = await attributeTree(store, appended.value)
    if (!attribution.ok) throw new Error("read failed")

    const found = attributionFor(attribution.value, inserted.id)
    if (found.outcome !== "placed") throw new Error("expected a placement")

    expect(found.placed.entry.provenance.actor).toBe("alice")
    expect(found.placed.entry.answeredBy).toBe("bob")
  })

  it("attributes every node of an unedited tree to the seed", async () => {
    const { tree } = sampleTree()
    const { store, head } = await logged(tree, [])

    const attribution = await attributeTree(store, head)
    if (!attribution.ok) throw new Error("read failed")

    expect(attribution.value.nodes.size).toBe(7)
    expect([...attribution.value.nodes.values()].every((found) => found.outcome === "seeded")).toBe(true)
    expect(attribution.value.examinedTo).toBeNull()
    expect(attribution.value.reachedStart).toBe(true)
  })

  it("says undetermined rather than seeded when it runs out of budget", async () => {
    const { tree, ids } = sampleTree()
    const inserted = buildText(sequentialIdFactory("new"), "Added")

    const { store, head } = await logged(tree, [
      { operations: [{ op: "insert", parentId: ids.main, index: 1, node: inserted }], actor: "alice" },
      { operations: [{ op: "configure", nodeId: ids.card, set: { elevation: 2 }, unset: [] }], actor: "bob" },
    ])

    /** One page of one revision reaches only the newest entry. */
    const attribution = await attributeTree(paged(store, 1), head, { pages: 1 })
    if (!attribution.ok) throw new Error("read failed")

    expect(attribution.value.reachedStart).toBe(false)
    expect(attribution.value.examinedTo).toBe(2)

    const found = attributionFor(attribution.value, inserted.id)
    expect(found.outcome).toBe("undetermined")
    /** The node it did reach is still credited — a partial read is not a useless one. */
    expect(attributionFor(attribution.value, ids.card).since.map((touch) => touch.effect)).toEqual([
      "configured",
    ])
  })

  it("stops reading once every node is accounted for", async () => {
    const { tree, ids } = sampleTree()
    const inserted = buildText(sequentialIdFactory("new"), "Added")

    const { store, head } = await logged(tree, [
      { operations: [{ op: "insert", parentId: ids.main, index: 1, node: inserted }], actor: "alice" },
    ])

    /** Every seed node resolves only at the log's start, so this one keeps reading. */
    const counted = counting(paged(store, 1))
    const attribution = await attributeTree(counted.reader, head)
    if (!attribution.ok) throw new Error("read failed")

    expect(attributionFor(attribution.value, inserted.id).outcome).toBe("placed")
    /** One page of log, then the page that reports the start. Not the full budget. */
    expect(counted.reads()).toBeLessThan(5)
  })

  it("ignores revisions newer than the tree it was handed", async () => {
    const { tree, ids } = sampleTree()
    const inserted = buildElement(sequentialIdFactory("new"), { type: "loom.card" })

    const store = memoryTreeStore()
    const created = await store.create(tree)
    if (!created.ok) throw new Error("seed rejected")

    const first = await store.append(
      tree.treeId,
      appendOf(
        deltaOf(tree.treeId, 0, [{ op: "insert", parentId: ids.main, index: 1, node: inserted }]),
        provenanceBy("alice")
      )
    )
    if (!first.ok) throw new Error("append rejected")

    /** The log moves on after the caller read its tree. */
    const second = await store.append(
      tree.treeId,
      appendOf(
        deltaOf(tree.treeId, 1, [{ op: "configure", nodeId: inserted.id, set: { variant: "filled" }, unset: [] }]),
        provenanceBy("bob")
      )
    )
    if (!second.ok) throw new Error("append rejected")

    const attribution = await attributeTree(store, first.value)
    if (!attribution.ok) throw new Error("read failed")

    const found = attributionFor(attribution.value, inserted.id)
    if (found.outcome !== "placed") throw new Error("expected a placement")

    expect(found.placed.entry.revision).toBe(1)
    /** Bob's configure is real, but it is not part of the tree on screen. */
    expect(found.since).toEqual([])
    expect(attribution.value.examinedTo).toBe(1)
  })

  it("reports a read failure rather than an empty attribution", async () => {
    const { tree } = sampleTree()
    const failing: TreeReader = {
      head: () => Promise.resolve(ok(tree)),
      revisions: () => Promise.resolve({ ok: false as const, error: { code: "unavailable" as const, detail: "down" } }),
    }

    const attribution = await attributeTree(failing, tree)
    expect(attribution.ok).toBe(false)
  })
})

/** A reader that hands out smaller pages than the store's default, to force paging. */
const paged = (reader: TreeReader, limit: number): TreeReader => ({
  head: reader.head,
  revisions: (treeId, request) => reader.revisions(treeId, { ...request, limit }),
})

const counting = (reader: TreeReader): { readonly reader: TreeReader; readonly reads: () => number } => {
  let reads = 0

  return {
    reader: {
      head: reader.head,
      revisions: (treeId, request) => {
        reads += 1

        return reader.revisions(treeId, request)
      },
    },
    reads: () => reads,
  }
}
