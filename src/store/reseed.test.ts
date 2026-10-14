import { describe, expect, it } from "vitest"

import { sequentialIdFactory, type NodeId } from "../ids.js"
import { primitiveTypeSchema, slotNameSchema } from "../primitive-type.js"
import type { Provenance } from "../runtime/proposal.js"
import { FIXED_INSTANT } from "../testing/doubles.js"
import { sampleTree } from "../testing/fixtures.js"
import { applyDelta, applyOperation } from "../tree/apply.js"
import { buildElement, buildText } from "../tree/builders.js"
import { compareTrees, NODE_FACETS, type NodeFacet } from "../tree/compare.js"
import type { TreeDelta, TreeOperation } from "../tree/delta.js"
import { findNode } from "../tree/navigation.js"
import type { LoomNode } from "../tree/node.js"
import { withRoot, type LoomTree } from "../tree/tree.js"

import { memoryTreeStore } from "./memory.js"
import { DEFAULT_REVISION_LIMIT } from "./store.js"
import {
  describeReseedPlan,
  planReseed,
  reseedDiscards,
  UNRESEEDABLE_FACETS,
  type ReseedPlan,
} from "./reseed.js"

/**
 * `sampleTree()` is this suite's builder: it is pure, its id factory is
 * sequential, and two calls produce the same tree with the same ids. That is
 * exactly the property a seeded page has against a fresh build of it, so
 * "authored" below is always a second call and never a hand-written literal.
 */
const authoredBuild = (): LoomTree => sampleTree().tree
const ids = sampleTree().ids

const spare = sequentialIdFactory("spare")

const provenance: Provenance = {
  origin: "user-instruction",
  interpreter: "test",
  authoredBy: "model",
  confidence: 0.9,
  interpretedAt: FIXED_INSTANT,
}

/** The stored page, as the authored build plus whatever happened to it since. */
const storedAfter = (...operations: readonly TreeOperation[]): LoomTree => {
  const start = authoredBuild()

  const reached = operations.reduce<LoomNode>((root, operation) => {
    const applied = applyOperation(root, operation)
    if (!applied.ok) throw new Error(`history: ${applied.error.code}`)

    return applied.value
  }, start.root)

  if (reached.kind !== "element") throw new Error("history: root stopped being an element")

  return { ...withRoot(start, reached), revision: operations.length }
}

const reseedable = (plan: ReseedPlan): Extract<ReseedPlan, { outcome: "reseedable" }> => {
  if (plan.outcome !== "reseedable") {
    throw new Error(`expected a reseedable plan, got ${plan.outcome}: ${describeReseedPlan(plan)}`)
  }

  return plan
}

/** Applying the plan, the way a caller would: one delta against the head it was planned on. */
const deltaOf = (
  tree: LoomTree,
  operations: readonly TreeOperation[],
  headRevision: number
): TreeDelta => ({
  deltaId: spare.deltaId(),
  treeId: tree.treeId,
  baseRevision: headRevision,
  operations,
})

/** The whole claim: the plan, applied, is the authored page and nothing else. */
const lands = (stored: LoomTree, authored: LoomTree): ReseedPlan => {
  const plan = planReseed(stored, authored)
  const { operations, headRevision } = reseedable(plan)

  const applied = applyDelta(stored, deltaOf(stored, operations, headRevision))
  if (!applied.ok) throw new Error(`apply: ${applied.error.code}`)

  expect(compareTrees(authored, applied.value)).toEqual([])

  return plan
}

const propsAt = (tree: LoomTree, nodeId: NodeId): unknown => {
  const found = findNode(tree.root, nodeId)

  return found !== null && found.kind === "element" ? found.props : undefined
}

describe("planReseed", () => {
  it("has nothing to propose when the stored page is the authored one", () => {
    const stored = authoredBuild()

    expect(planReseed(stored, authoredBuild())).toEqual({
      outcome: "already-authored",
      headRevision: 0,
    })
  })

  it("says so at a later revision too, when the history came back to the authored shape", () => {
    const stored = storedAfter(
      { op: "configure", nodeId: ids.page, set: { title: "Away" }, unset: [] },
      { op: "configure", nodeId: ids.page, set: { title: "Home" }, unset: [] }
    )

    expect(planReseed(stored, authoredBuild())).toEqual({
      outcome: "already-authored",
      headRevision: 2,
    })
  })

  describe("the facets a configure can close", () => {
    it("puts a changed prop back, in one operation", () => {
      const stored = storedAfter({
        op: "configure",
        nodeId: ids.card,
        set: { variant: "filled" },
        unset: ["elevation"],
      })

      const plan = reseedable(lands(stored, authoredBuild()))

      expect(plan.operations).toEqual([
        {
          op: "configure",
          nodeId: ids.card,
          set: { variant: "outlined", elevation: 1 },
          unset: [],
        },
      ])
    })

    it("unsets a prop the authored page does not carry", () => {
      const stored = storedAfter({
        op: "configure",
        nodeId: ids.page,
        set: { subtitle: "added later" },
        unset: [],
      })

      const plan = reseedable(lands(stored, authoredBuild()))

      expect(plan.operations).toEqual([
        { op: "configure", nodeId: ids.page, set: {}, unset: ["subtitle"] },
      ])
      expect(propsAt(authoredBuild(), ids.page)).toEqual({ title: "Home" })
    })

    /**
     * The reseed a deployment is most likely to want, and the one the four
     * operations only just reach. A builder whose headline changed produces a
     * text node with the *same* id and a new value; `configure` setting `value`
     * is what keeps that a one-operation reseed instead of an id 0038 refuses to
     * hand back.
     */
    it("puts a changed headline back under its own id", () => {
      const stored = storedAfter({
        op: "configure",
        nodeId: ids.headline,
        set: { value: "Welcome back" },
        unset: [],
      })

      const plan = reseedable(lands(stored, authoredBuild()))

      expect(plan.operations).toEqual([
        { op: "configure", nodeId: ids.headline, set: { value: "Welcome" }, unset: [] },
      ])
      expect(plan.revives).toEqual([])
      expect(plan.retires).toEqual([])
    })

    it("puts a renamed slot back", () => {
      const stored = storedAfter({
        op: "configure",
        nodeId: ids.main,
        set: { name: "sidebar" },
        unset: [],
      })

      const plan = reseedable(lands(stored, authoredBuild()))

      expect(plan.operations).toEqual([
        { op: "configure", nodeId: ids.main, set: { name: "main" }, unset: [] },
      ])
    })
  })

  describe("structure", () => {
    it("removes what the authored page does not have, and names it as retired", () => {
      const added = buildElement(spare, { type: "loom.footer", children: [] })
      const stored = storedAfter({ op: "insert", parentId: ids.page, index: 3, node: added })

      const plan = reseedable(lands(stored, authoredBuild()))

      expect(plan.operations).toEqual([{ op: "remove", nodeId: added.id }])
      expect(plan.retires).toEqual([{ nodeId: added.id, label: "loom.footer" }])
      expect(plan.revives).toEqual([])
    })

    /**
     * One `remove` for the top of a subtree, not one per node. A remove takes the
     * whole subtree, so naming a child under one already removed would be an
     * operation against a node that is gone.
     */
    it("removes an added subtree from its top", () => {
      const inner = buildText(spare, "late")
      const outer = buildElement(spare, { type: "loom.card", children: [inner] })
      const stored = storedAfter({ op: "insert", parentId: ids.page, index: 0, node: outer })

      const plan = reseedable(lands(stored, authoredBuild()))

      expect(plan.operations).toEqual([{ op: "remove", nodeId: outer.id }])
    })

    it("puts a deleted subtree back whole, and names the ids it revives", () => {
      const stored = storedAfter({ op: "remove", nodeId: ids.card })

      const plan = reseedable(lands(stored, authoredBuild()))

      expect(plan.operations).toEqual([
        {
          op: "insert",
          parentId: ids.main,
          index: 0,
          node: findNode(authoredBuild().root, ids.card),
        },
      ])
      expect(plan.revives).toEqual([
        { nodeId: ids.card, label: "loom.card" },
        { nodeId: ids.body, label: "text" },
      ])
    })

    it("moves a node back to the parent the authored page gives it", () => {
      const stored = storedAfter({
        op: "move",
        nodeId: ids.card,
        parentId: ids.page,
        index: 2,
      })

      const plan = reseedable(lands(stored, authoredBuild()))

      expect(plan.operations).toEqual([
        { op: "move", nodeId: ids.card, parentId: ids.main, index: 0 },
      ])
      expect(plan.revives).toEqual([])
      expect(plan.retires).toEqual([])
    })

    it("puts reordered siblings back", () => {
      const stored = storedAfter({
        op: "move",
        nodeId: ids.footer,
        parentId: ids.page,
        index: 0,
      })

      const plan = reseedable(lands(stored, authoredBuild()))

      expect(plan.operations).toEqual([
        { op: "move", nodeId: ids.header, parentId: ids.page, index: 0 },
        { op: "move", nodeId: ids.main, parentId: ids.page, index: 1 },
      ])
    })

    /**
     * The case the ordering pass is shaped by: the stored page has nested two
     * nodes the authored page keeps as siblings. Claiming children top-down
     * converges — a node in the wrong parent is claimed when its own authored
     * parent is reached, and no node has two authored parents, so a container
     * fixed earlier cannot be broken by one fixed later.
     */
    it("unpicks a node nested under its own authored sibling", () => {
      const stored = storedAfter({
        op: "move",
        nodeId: ids.main,
        parentId: ids.header,
        index: 1,
      })

      lands(stored, authoredBuild())
    })

    /**
     * A subtree that has to go back in, holding a node the page still has
     * somewhere else. Inserting it whole would name that id twice and be
     * refused, so the top goes in without its children and the ordering pass
     * brings them home.
     */
    it("puts back a container whose authored children are still live elsewhere", () => {
      const stored = storedAfter(
        { op: "move", nodeId: ids.card, parentId: ids.page, index: 1 },
        { op: "remove", nodeId: ids.main }
      )

      const plan = reseedable(lands(stored, authoredBuild()))

      expect(plan.operations).toEqual([
        {
          op: "insert",
          parentId: ids.page,
          index: 1,
          node: { kind: "slot", id: ids.main, name: "main", children: [] },
        },
        { op: "move", nodeId: ids.card, parentId: ids.main, index: 0 },
      ])
      expect(plan.revives).toEqual([{ nodeId: ids.main, label: "main" }])
      expect(plan.retires).toEqual([])
    })

    it("carries a page back from several changes at once, in one plan", () => {
      const extra = buildElement(spare, { type: "loom.card", children: [] })
      const stored = storedAfter(
        { op: "configure", nodeId: ids.headline, set: { value: "Hello" }, unset: [] },
        { op: "configure", nodeId: ids.card, set: { variant: "filled" }, unset: ["elevation"] },
        { op: "remove", nodeId: ids.footer },
        { op: "insert", parentId: ids.page, index: 0, node: extra },
        { op: "move", nodeId: ids.main, parentId: ids.page, index: 0 }
      )

      const plan = reseedable(lands(stored, authoredBuild()))

      expect(plan.retires).toEqual([{ nodeId: extra.id, label: "loom.card" }])
      expect(plan.revives).toEqual([{ nodeId: ids.footer, label: "loom.footer" }])
    })
  })

  describe("what no plan can close", () => {
    const retyped = (authored: LoomTree, nodeId: NodeId, type: string): LoomTree => {
      const replace = (node: LoomNode): LoomNode =>
        node.id === nodeId && node.kind === "element"
          ? { ...node, type: primitiveTypeSchema.parse(type) }
          : node.kind === "text"
            ? node
            : { ...node, children: node.children.map(replace) }

      const root = replace(authored.root)
      if (root.kind !== "element") throw new Error("retyped: root")

      return withRoot(authored, root)
    }

    /**
     * `configure` never changes a node's primitive, and removing the node to
     * re-insert it under its own id is the recycling 0038 refuses. So this is
     * reported rather than attempted, naming the node a deployment has to decide
     * about.
     */
    it("refuses when an element's primitive changed under a stable id", () => {
      const stored = authoredBuild()
      const authored = retyped(authoredBuild(), ids.card, "loom.panel")

      expect(planReseed(stored, authored)).toEqual({
        outcome: "unexpressible",
        blocking: [{ code: "changed", nodeId: ids.card, label: "loom.panel", facets: ["type"] }],
      })
    })

    it("refuses when a node's kind changed under a stable id", () => {
      const stored = authoredBuild()
      const swapped = ((): LoomTree => {
        const header = findNode(authoredBuild().root, ids.header)
        if (header === null || header.kind !== "element") throw new Error("header")

        const replace = (node: LoomNode): LoomNode =>
          node.kind === "text"
            ? node
            : {
                ...node,
                children: node.children.map((child) =>
                  child.id === ids.headline
                    ? {
                        kind: "slot" as const,
                        id: ids.headline,
                        name: slotNameSchema.parse("headline"),
                        children: [],
                      }
                    : replace(child)
                ),
              }

        const root = replace(authoredBuild().root)
        if (root.kind !== "element") throw new Error("root")

        return withRoot(authoredBuild(), root)
      })()

      const plan = planReseed(stored, swapped)

      expect(plan.outcome).toBe("unexpressible")
      expect(describeReseedPlan(plan)).toContain(ids.headline)
    })

    it("is not another page's reseed", () => {
      const stored = authoredBuild()
      const other = { ...authoredBuild(), treeId: spare.treeId() }

      expect(planReseed(stored, other)).toEqual({
        outcome: "different-page",
        mismatch: { facet: "treeId", stored: stored.treeId, authored: other.treeId },
      })
    })

    it("refuses two different roots, because no operation replaces one", () => {
      const stored = authoredBuild()
      const rebuilt = sequentialIdFactory("rebuilt")
      const authored = withRoot(
        authoredBuild(),
        buildElement(rebuilt, { type: "loom.page", props: { title: "Home" }, children: [] })
      )

      expect(planReseed(stored, authored)).toEqual({
        outcome: "different-page",
        mismatch: { facet: "rootId", stored: ids.page, authored: authored.root.id },
      })
    })

    /**
     * The subset is checked against the whole list where it is written, so a
     * sixth facet in `compare.ts` stops this suite compiling until somebody says
     * whether a reseed can close it.
     */
    it("accounts for every facet a comparison can report", () => {
      const closable: readonly NodeFacet[] = NODE_FACETS.filter(
        (facet) => !UNRESEEDABLE_FACETS.includes(facet)
      )

      expect(UNRESEEDABLE_FACETS).toEqual(["kind", "type"])
      expect(closable).toEqual(["name", "props", "text", "parent", "position"])
    })
  })

  describe("the plan is a change like any other", () => {
    /**
     * The finding this closes asked for an append, not a delete: the log should
     * say *this page was put back* rather than ending. So the operations go
     * through a real store, and what comes out is a revision with provenance on
     * it.
     */
    it("appends as one revision, with provenance, and leaves the history intact", async () => {
      const authored = authoredBuild()
      const store = memoryTreeStore()
      await store.create(authored)

      const away = await store.append(authored.treeId, {
        proposalId: spare.proposalId(),
        delta: deltaOf(
          authored,
          [{ op: "configure", nodeId: ids.headline, set: { value: "Drifted" }, unset: [] }],
          0
        ),
        provenance,
        appliedAt: FIXED_INSTANT,
      })
      if (!away.ok) throw new Error(`append: ${away.error.code}`)

      const plan = reseedable(planReseed(away.value, authored))

      const back = await store.append(authored.treeId, {
        proposalId: spare.proposalId(),
        delta: deltaOf(authored, plan.operations, plan.headRevision),
        provenance,
        appliedAt: FIXED_INSTANT,
      })
      if (!back.ok) throw new Error(`append: ${back.error.code}`)

      expect(back.value.revision).toBe(2)
      expect(compareTrees(authored, back.value)).toEqual([])

      const log = await store.revisions(authored.treeId)
      if (!log.ok) throw new Error(`revisions: ${log.error.code}`)

      expect(log.value.revisions.map((entry) => entry.revision)).toEqual([1, 2])
      expect(log.value.revisions.at(-1)?.provenance).toEqual(provenance)
    })

    it("plans against the head it was given, so a stale plan is refused rather than applied", async () => {
      const authored = authoredBuild()
      const store = memoryTreeStore()
      await store.create(authored)

      const drifted = await store.append(authored.treeId, {
        proposalId: spare.proposalId(),
        delta: deltaOf(
          authored,
          [{ op: "configure", nodeId: ids.page, set: { title: "Away" }, unset: [] }],
          0
        ),
        provenance,
        appliedAt: FIXED_INSTANT,
      })
      if (!drifted.ok) throw new Error(`append: ${drifted.error.code}`)

      const plan = reseedable(planReseed(drifted.value, authored))

      await store.append(authored.treeId, {
        proposalId: spare.proposalId(),
        delta: deltaOf(
          authored,
          [{ op: "configure", nodeId: ids.page, set: { title: "Elsewhere" }, unset: [] }],
          1
        ),
        provenance,
        appliedAt: FIXED_INSTANT,
      })

      const late = await store.append(authored.treeId, {
        proposalId: spare.proposalId(),
        delta: deltaOf(authored, plan.operations, plan.headRevision),
        provenance,
        appliedAt: FIXED_INSTANT,
      })

      expect(late).toEqual({
        ok: false,
        error: { code: "revision-conflict", treeId: authored.treeId, expected: 1, found: 2 },
      })
    })
  })

  describe("describeReseedPlan", () => {
    it("says a page is already the authored one", () => {
      expect(describeReseedPlan({ outcome: "already-authored", headRevision: 4 })).toBe(
        "revision 4 is the page the builder produces"
      )
    })

    it("counts the operations, what goes, and what comes back", () => {
      const stored = storedAfter({ op: "remove", nodeId: ids.footer })

      expect(describeReseedPlan(planReseed(stored, authoredBuild()))).toBe(
        "1 operation would put the page back at head 1, reviving 1 id"
      )
    })

    it("names what a reseed would remove", () => {
      const extra = buildElement(spare, { type: "loom.card", children: [] })
      const stored = storedAfter({ op: "insert", parentId: ids.page, index: 0, node: extra })

      expect(describeReseedPlan(planReseed(stored, authoredBuild()))).toBe(
        "1 operation would put the page back at head 1, removing 1 node"
      )
    })

    it("says which page the authored tree belongs to instead", () => {
      const other = { ...authoredBuild(), treeId: spare.treeId() }

      expect(describeReseedPlan(planReseed(authoredBuild(), other))).toBe(
        `treeId ${authoredBuild().treeId} is not ${other.treeId}`
      )
    })

    it("names a planned operation that was refused", () => {
      expect(
        describeReseedPlan({
          outcome: "unplannable",
          operation: { op: "remove", nodeId: ids.card },
          error: { code: "node-not-found", nodeId: ids.card },
        })
      ).toBe("a planned remove was refused: node-not-found")
    })
  })
})

/**
 * `reseedDiscards` is the half the Gate needs and `planReseed` deliberately does
 * not provide: not *can this page go back* but *whose accepted work does putting
 * it back destroy*. The declaration is what makes 0035's rule fire, so these
 * assertions are the difference between a reseed that waits for a person and one
 * that overwrites an editor's change on a deploy.
 */
describe("reseedDiscards reads the log for what a reseed would write over", () => {
  /** A page with a real log behind it: the authored build, then the changes named. */
  const loggedPage = async (
    ...history: readonly (readonly TreeOperation[])[]
  ): Promise<{ readonly store: ReturnType<typeof memoryTreeStore>; readonly tree: LoomTree }> => {
    const authored = authoredBuild()
    const store = memoryTreeStore()
    await store.create(authored)

    const reached = await history.reduce<Promise<LoomTree>>(
      async (previous, operations) => {
        const current = await previous
        const appended = await store.append(authored.treeId, {
          proposalId: spare.proposalId(),
          delta: deltaOf(authored, operations, current.revision),
          provenance,
          appliedAt: FIXED_INSTANT,
        })
        if (!appended.ok) throw new Error(`append: ${appended.error.code}`)

        return appended.value
      },
      Promise.resolve(authored)
    )

    return { store, tree: reached }
  }

  const setValue = (nodeId: NodeId, value: string): readonly TreeOperation[] => [
    { op: "configure", nodeId, set: { value }, unset: [] },
  ]

  it("declares the revision that changed the node a reseed reconfigures", async () => {
    const { store, tree } = await loggedPage(setValue(ids.headline, "Drifted"))
    const plan = reseedable(planReseed(tree, authoredBuild()))

    const discards = await reseedDiscards(store, {
      treeId: tree.treeId,
      operations: plan.operations,
    })
    if (!discards.ok) throw new Error(discards.error.code)

    expect(discards.value).toEqual([{ revision: 1, nodeIds: [ids.headline] }])
  })

  /**
   * The commonest reseed there is — one edited value — names no revival and no
   * retirement. A declaration built from the plan's two lists would therefore be
   * empty here, and the reseed would have applied over the editor's change with
   * nobody asked. That is why `ReseedDiscardsRequest` takes the operations.
   */
  it("declares work for a reseed that revives and retires nothing", async () => {
    const { store, tree } = await loggedPage(setValue(ids.body, "Edited in the portal"))
    const plan = reseedable(planReseed(tree, authoredBuild()))

    expect(plan.revives).toEqual([])
    expect(plan.retires).toEqual([])

    const discards = await reseedDiscards(store, {
      treeId: tree.treeId,
      operations: plan.operations,
    })
    if (!discards.ok) throw new Error(discards.error.code)

    expect(discards.value).toEqual([{ revision: 1, nodeIds: [ids.body] }])
  })

  it("declares nothing when the log touched no node the reseed names", async () => {
    const { store, tree } = await loggedPage(setValue(ids.body, "Edited in the portal"))

    const discards = await reseedDiscards(store, {
      treeId: tree.treeId,
      operations: setValue(ids.footer, "back"),
    })
    if (!discards.ok) throw new Error(discards.error.code)

    expect(discards.value).toEqual([])
  })

  it("declares every entry that touched a reseeded node, ascending, and not the ones that did not", async () => {
    const { store, tree } = await loggedPage(
      setValue(ids.headline, "first"),
      setValue(ids.body, "untouched by the reseed"),
      setValue(ids.headline, "second")
    )

    const discards = await reseedDiscards(store, {
      treeId: tree.treeId,
      operations: setValue(ids.headline, "back"),
    })
    if (!discards.ok) throw new Error(discards.error.code)

    expect(discards.value).toEqual([
      { revision: 1, nodeIds: [ids.headline] },
      { revision: 3, nodeIds: [ids.headline] },
    ])
  })

  it("names only the overlap when one revision changed a reseeded node and another", async () => {
    const { store, tree } = await loggedPage([
      ...setValue(ids.headline, "both"),
      ...setValue(ids.body, "both"),
    ])

    const discards = await reseedDiscards(store, {
      treeId: tree.treeId,
      operations: setValue(ids.headline, "back"),
    })
    if (!discards.ok) throw new Error(discards.error.code)

    expect(discards.value).toEqual([{ revision: 1, nodeIds: [ids.headline] }])
  })

  it("reads an empty log as nothing discarded rather than as an error", async () => {
    const { store, tree } = await loggedPage()

    const discards = await reseedDiscards(store, {
      treeId: tree.treeId,
      operations: setValue(ids.headline, "back"),
    })
    if (!discards.ok) throw new Error(discards.error.code)

    expect(discards.value).toEqual([])
  })

  /**
   * A log too long for one page is the case where a hand-rolled walk quietly
   * reports a cheaper reseed than the real one, so the limit is crossed on
   * purpose rather than assumed irrelevant.
   */
  it("walks past the end of the first page", async () => {
    const edits = Array.from({ length: DEFAULT_REVISION_LIMIT + 3 }, (_, index) =>
      setValue(ids.headline, `edit ${index}`)
    )
    const { store, tree } = await loggedPage(...edits)

    const discards = await reseedDiscards(store, {
      treeId: tree.treeId,
      operations: setValue(ids.headline, "back"),
    })
    if (!discards.ok) throw new Error(discards.error.code)

    expect(discards.value).toHaveLength(edits.length)
    expect(discards.value.at(-1)?.revision).toBe(edits.length)
  })

  it("reports the store's error rather than an empty declaration, which would read as a clean log", async () => {
    const { tree } = await loggedPage(setValue(ids.headline, "Drifted"))
    const unreadable = memoryTreeStore()

    const discards = await reseedDiscards(unreadable, {
      treeId: tree.treeId,
      operations: setValue(ids.headline, "back"),
    })

    expect(discards.ok).toBe(false)
  })
})
