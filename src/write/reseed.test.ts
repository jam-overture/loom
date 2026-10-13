import { describe, expect, it } from "vitest"

import { sequentialIdFactory, type NodeId } from "../ids.js"
import { primitiveTypeSchema } from "../primitive-type.js"
import { fixedPolicy } from "../runtime/policy-source.js"
import { defaultGatePolicy, gatePolicySchema, type GatePolicy } from "../runtime/policy.js"
import type { Provenance } from "../runtime/proposal.js"
import { memoryTreeStore } from "../store/memory.js"
import {
  collectingEventSink,
  fixedClock,
  scriptedRepairer,
  FIXED_INSTANT,
  type CollectingEventSink,
} from "../testing/doubles.js"
import { sampleTree, type SampleTree } from "../testing/fixtures.js"
import { applyOperation } from "../tree/apply.js"
import type { TreeOperation } from "../tree/delta.js"
import { findNode } from "../tree/navigation.js"
import type { LoomNode } from "../tree/node.js"
import { withRoot, type LoomTree } from "../tree/tree.js"

import { confirmHeld, type WritePath } from "./commit.js"
import { memoryHoldStore } from "./held.js"
import { describeReseedOutcome, RESEED_INTERPRETER, reseedPage } from "./reseed.js"

const spare = sequentialIdFactory("res")

const provenance: Provenance = {
  origin: "user-instruction",
  interpreter: "test",
  authoredBy: "model",
  confidence: 0.9,
  interpretedAt: FIXED_INSTANT,
}

type Harness = {
  readonly path: WritePath
  readonly events: CollectingEventSink
  readonly seed: LoomTree
  readonly ids: SampleTree["ids"]
  /** An edit somebody accepted through the portal, as a real log entry. */
  readonly edit: (operations: readonly TreeOperation[]) => Promise<LoomTree>
  readonly head: () => Promise<LoomTree>
}

/**
 * The seeded page, a real log behind it, and the one write path in front of it.
 *
 * No interpreter is supplied: `reseedPage` brings its own, which is the whole
 * point of the seam. Any test that reached a model here would have found a
 * rejected promise instead.
 */
const harnessFor = async (policy: GatePolicy = defaultGatePolicy): Promise<Harness> => {
  const { tree, ids } = sampleTree()
  const store = memoryTreeStore()
  await store.create(tree)

  const events = collectingEventSink()

  const head = async (): Promise<LoomTree> => {
    const current = await store.head(tree.treeId)
    if (!current.ok) throw new Error(`head: ${current.error.code}`)

    return current.value
  }

  return {
    path: {
      store,
      holds: memoryHoldStore(),
      runtime: {
        interpreter: { interpret: () => Promise.reject(new Error("interpreted a reseed")) },
        policySource: fixedPolicy(policy),
        events,
        clock: fixedClock(),
        idFactory: spare,
      },
    },
    events,
    seed: tree,
    ids,
    head,
    edit: async (operations) => {
      const current = await head()
      const appended = await store.append(tree.treeId, {
        proposalId: spare.proposalId(),
        delta: {
          deltaId: spare.deltaId(),
          treeId: tree.treeId,
          baseRevision: current.revision,
          operations,
        },
        provenance,
        appliedAt: FIXED_INSTANT,
      })

      if (!appended.ok) throw new Error(`append: ${appended.error.code}`)

      return appended.value
    },
  }
}

/**
 * A fresh build of the page, as the builder in the repository produces it today.
 *
 * `sampleTree()` is pure with a sequential id factory, so a second call is the
 * same page with the same ids — which is the property a seeded row has against a
 * rebuild of it. An *edited* builder is that tree plus the operations named,
 * which is how a change to the repository is expressed here without a second
 * hand-written fixture that could drift from the first.
 */
const authoredWith = (...operations: readonly TreeOperation[]): LoomTree => {
  const start = sampleTree().tree

  const reached = operations.reduce<LoomNode>((root, operation) => {
    const applied = applyOperation(root, operation)
    if (!applied.ok) throw new Error(`authored: ${applied.error.code}`)

    return applied.value
  }, start.root)

  if (reached.kind !== "element") throw new Error("authored: the root stopped being an element")

  return withRoot(start, reached)
}

/**
 * The same page with one element's primitive changed — a builder edit no
 * operation can express, which `configure` cannot reach and `insert` may not
 * fake under a used id.
 */
const retyped = (tree: LoomTree, nodeId: NodeId, type: string): LoomTree => {
  const replace = (node: LoomNode): LoomNode =>
    node.id === nodeId && node.kind === "element"
      ? { ...node, type: primitiveTypeSchema.parse(type) }
      : node.kind === "text"
        ? node
        : { ...node, children: node.children.map(replace) }

  const root = replace(tree.root)
  if (root.kind !== "element") throw new Error("retyped: the root stopped being an element")

  return withRoot(tree, root)
}

const setValue = (nodeId: NodeId, value: string): readonly TreeOperation[] => [
  { op: "configure", nodeId, set: { value }, unset: [] },
]

const textOf = (tree: LoomTree, nodeId: NodeId): string | undefined => {
  const node = findNode(tree.root, nodeId)

  return node?.kind === "text" ? node.value : undefined
}

/**
 * The marketing case, which is the one the finding was filed about: the builder
 * in the repository changed and nobody has edited the stored page, so the reseed
 * takes nothing away from anybody and needs no one's permission.
 */
describe("reseedPage applies an edited builder to a page nobody has touched", () => {
  it("carries the stored page to what the builder produces now", async () => {
    const harness = await harnessFor()
    const authored = authoredWith(...setValue(harness.ids.headline, "A new headline"))

    const outcome = await reseedPage(harness.path, {
      treeId: harness.seed.treeId,
      authored,
      origin: "developer",
      actor: "maintainer",
    })

    if (outcome.kind !== "committed") throw new Error(describeReseedOutcome(outcome))

    expect(textOf(outcome.tree, harness.ids.headline)).toBe("A new headline")
    expect(outcome.tree.revision).toBe(1)
  })

  it("records the reseed as its own entry in the log, with its own provenance", async () => {
    const harness = await harnessFor()

    await reseedPage(harness.path, {
      treeId: harness.seed.treeId,
      authored: authoredWith(...setValue(harness.ids.headline, "A new headline")),
      origin: "developer",
      actor: "maintainer",
    })

    const page = await harness.path.store.revisions(harness.seed.treeId)
    if (!page.ok) throw new Error(page.error.code)

    const entry = page.value.revisions[0]
    if (!entry) throw new Error("the reseed did not reach the log")

    expect(entry.revision).toBe(1)
    expect(entry.provenance.interpreter).toBe(RESEED_INTERPRETER)
    expect(entry.provenance.origin).toBe("developer")
    expect(entry.provenance.actor).toBe("maintainer")
    /** Computed from two trees, not guessed — the one honest self-grade (0007). */
    expect(entry.provenance.confidence).toBe(1)
  })

  /**
   * A reseed puts back no single revision: it carries the page to a tree that
   * was never in the log. `undoes` names the one revision a change restores, so
   * a number here would be a claim the log cannot support.
   */
  it("claims no revision in `undoes`, because a reseed restores none", async () => {
    const harness = await harnessFor()

    await reseedPage(harness.path, {
      treeId: harness.seed.treeId,
      authored: authoredWith(...setValue(harness.ids.headline, "A new headline")),
      origin: "developer",
    })

    const page = await harness.path.store.revisions(harness.seed.treeId)

    expect(page.ok && page.value.revisions[0]?.provenance.undoes).toBeUndefined()
  })

  it("says in words that the log was read and was clean, where a field cannot say it", async () => {
    const harness = await harnessFor()

    const outcome = await reseedPage(harness.path, {
      treeId: harness.seed.treeId,
      authored: authoredWith(...setValue(harness.ids.headline, "A new headline")),
      origin: "developer",
    })
    if (outcome.kind !== "committed") throw new Error(describeReseedOutcome(outcome))

    expect(outcome.proposal.rationale).toContain("Nothing in the log has touched the nodes it changes")
    /** Absence still means "nobody looked at a log" everywhere else (0035). */
    expect(outcome.proposal.discards).toBeUndefined()
  })

  it("narrates the same stages any other change does", async () => {
    const harness = await harnessFor()

    await reseedPage(harness.path, {
      treeId: harness.seed.treeId,
      authored: authoredWith(...setValue(harness.ids.headline, "A new headline")),
      origin: "developer",
    })

    expect(harness.events.types()).toEqual([
      "intent-received",
      "policy-resolved",
      "change-proposed",
      "change-assessed",
      "disposition-decided",
      "change-applied",
      "change-committed",
    ])
  })
})

/**
 * The half that answers the question `Loom marketing` filed as *who presses it*.
 *
 * 0035 made discarded work a rule rather than a level: a change that writes over
 * work already in the log is never applied without a person, whatever latitude
 * its origin has. So the safety is a property of what this particular reseed
 * costs, not of which caller asked for it — which is why a deploy step may call
 * this and still cannot quietly discard an editor's change.
 */
describe("reseedPage is held when it would write over accepted work", () => {
  it("holds for confirmation rather than applying, and says which revisions it would overwrite", async () => {
    const harness = await harnessFor()
    await harness.edit(setValue(harness.ids.headline, "Edited in the portal"))

    const outcome = await reseedPage(harness.path, {
      treeId: harness.seed.treeId,
      /** The builder is unchanged, so the reseed is purely undoing the portal edit. */
      authored: authoredWith(),
      /** The origin with the most latitude of the four, so the rule is what holds it. */
      origin: "developer",
      actor: "maintainer",
    })

    if (outcome.kind !== "held") throw new Error(describeReseedOutcome(outcome))

    expect(outcome.held.disposition.kind).toBe("requires-confirmation")
    expect(outcome.held.disposition.reason.code).toBe("discards-later-work")
    expect(outcome.held.disposition.reason.detail).toContain("revision 1")
  })

  it("leaves the page exactly as it was while the hold is unanswered", async () => {
    const harness = await harnessFor()
    await harness.edit(setValue(harness.ids.headline, "Edited in the portal"))

    await reseedPage(harness.path, {
      treeId: harness.seed.treeId,
      authored: authoredWith(),
      origin: "developer",
    })

    const head = await harness.head()

    expect(head.revision).toBe(1)
    expect(textOf(head, harness.ids.headline)).toBe("Edited in the portal")
  })

  it("applies the reseed when a person answers the hold, and records who did", async () => {
    const harness = await harnessFor()
    await harness.edit(setValue(harness.ids.headline, "Edited in the portal"))

    const held = await reseedPage(harness.path, {
      treeId: harness.seed.treeId,
      authored: authoredWith(),
      origin: "developer",
    })
    if (held.kind !== "held") throw new Error(describeReseedOutcome(held))

    const confirmed = await confirmHeld(harness.path, {
      proposalId: held.held.proposalId,
      actor: "reviewer",
    })
    if (confirmed.kind !== "committed") throw new Error(confirmed.kind)

    expect(confirmed.tree.root).toEqual(harness.seed.root)
    expect(confirmed.tree.revision).toBe(2)

    const page = await harness.path.store.revisions(harness.seed.treeId)
    expect(page.ok && page.value.revisions[1]?.answeredBy).toBe("reviewer")
  })

  /**
   * The rationale is what a reviewer reads on the hold (0019), so it has to say
   * what the reseed does to the page as well as what it takes away. A reviewer
   * told only the revisions cannot tell a headline being restored from the page
   * being emptied.
   */
  it("tells the reviewer what the reseed does and what it costs", async () => {
    const harness = await harnessFor()
    await harness.edit(setValue(harness.ids.headline, "Edited in the portal"))

    const held = await reseedPage(harness.path, {
      treeId: harness.seed.treeId,
      authored: authoredWith(),
      origin: "developer",
    })
    if (held.kind !== "held") throw new Error(describeReseedOutcome(held))

    expect(held.held.proposal.rationale).toBe(
      "Puts the page back to the tree its builder produces, at head 1: 1 operation. " +
        "Revision 1 changed nodes this reseed touches, and applying it writes over what they did."
    )
  })

  /**
   * Repair (0006) exists to let a model try a smaller version of what the Gate
   * refused, and there is no smaller version of putting a page back. A reseed the
   * Gate refuses is refused, even with a repairer wired in.
   */
  /**
   * A builder that stopped producing a protected part asks the Gate to destroy
   * one, which is refused at the floor. Repair (0006) exists to let a model try
   * a smaller version of what was refused, and there is no smaller version of
   * putting a page back — so a reseed the Gate refuses is refused, even with a
   * repairer wired in.
   */
  it("never asks a repairer to soften a refused reseed", async () => {
    const harness = await harnessFor(
      gatePolicySchema.parse({ protectedPrimitiveTypes: ["loom.card"] })
    )
    const repairer = scriptedRepairer({ ok: false, error: { code: "refused", detail: "no" } })

    const outcome = await reseedPage(
      { ...harness.path, runtime: { ...harness.path.runtime, repairer } },
      {
        treeId: harness.seed.treeId,
        /** The card is gone from the build, so the reseed removes it from the page. */
        authored: authoredWith({ op: "remove", nodeId: harness.ids.card }),
        origin: "developer",
      }
    )

    expect(outcome.kind).toBe("refused")
    expect(harness.events.types()).not.toContain("repair-attempted")
  })
})

/**
 * A reseed is the operation that gets pressed twice — by a person who cannot see
 * whether the first took, and by a deploy that runs on every release. So *the
 * page is already right* is the healthy answer and has to be distinguishable
 * from *the page cannot be put back*, or every release after the first reports a
 * success as a failure.
 */
describe("reseedPage reports a page that is already authored as its own ending", () => {
  it("proposes nothing when the stored page is the tree the builder produces", async () => {
    const harness = await harnessFor()

    const outcome = await reseedPage(harness.path, {
      treeId: harness.seed.treeId,
      authored: authoredWith(),
      origin: "developer",
    })

    expect(outcome).toEqual({ kind: "already-authored", headRevision: 0 })
    /** Nothing was proposed, so the Gate never ran. */
    expect(harness.events.types()).toEqual([])
  })

  it("is what a second press reports, and adds no revision for it", async () => {
    const harness = await harnessFor()
    const authored = authoredWith(...setValue(harness.ids.headline, "A new headline"))

    const first = await reseedPage(harness.path, {
      treeId: harness.seed.treeId,
      authored,
      origin: "developer",
    })
    if (first.kind !== "committed") throw new Error(describeReseedOutcome(first))

    const second = await reseedPage(harness.path, {
      treeId: harness.seed.treeId,
      authored,
      origin: "developer",
    })

    expect(second).toEqual({ kind: "already-authored", headRevision: 1 })
    expect((await harness.head()).revision).toBe(1)
  })

  it("describes itself as a page that needs nothing rather than as an obstacle", async () => {
    const harness = await harnessFor()

    const outcome = await reseedPage(harness.path, {
      treeId: harness.seed.treeId,
      authored: authoredWith(),
      origin: "developer",
    })

    expect(describeReseedOutcome(outcome)).toBe(
      "already authored: revision 0 is the page the builder produces"
    )
  })
})

describe("reseedPage refuses to propose what no reseed can express", () => {
  it("will not reseed one page from another page's build", async () => {
    const harness = await harnessFor()
    const elsewhere = { ...authoredWith(), treeId: spare.treeId() }

    const outcome = await reseedPage(harness.path, {
      treeId: harness.seed.treeId,
      authored: elsewhere,
      origin: "developer",
    })

    if (outcome.kind !== "not-reseedable") throw new Error(describeReseedOutcome(outcome))

    expect(outcome.plan.outcome).toBe("different-page")
    expect(harness.events.types()).toEqual([])
  })

  /**
   * An element's primitive is what the node *is*, and no `configure` reaches it.
   * Removing the node to re-insert it under its own id is the recycling 0038
   * refuses, so the plan reports the node instead — and the write path passes
   * that through rather than reseeding the page to something near it.
   */
  it("reports the differences no operation can close, and proposes nothing", async () => {
    const harness = await harnessFor()

    const outcome = await reseedPage(harness.path, {
      treeId: harness.seed.treeId,
      /** The builder now makes a panel where the stored page holds a card. */
      authored: retyped(authoredWith(), harness.ids.card, "loom.panel"),
      origin: "developer",
    })

    if (outcome.kind !== "not-reseedable") throw new Error(describeReseedOutcome(outcome))

    expect(outcome.plan.outcome).toBe("unexpressible")
    expect(harness.events.types()).toEqual([])
  })

  it("reports a page the store does not hold as a store error", async () => {
    const harness = await harnessFor()

    const outcome = await reseedPage(harness.path, {
      treeId: spare.treeId(),
      authored: authoredWith(),
      origin: "developer",
    })

    expect(outcome.kind).toBe("not-written")
  })
})
