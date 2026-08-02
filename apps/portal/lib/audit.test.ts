import { describe, expect, it } from "vitest"

import { ok, sequentialIdFactory, type ProposalId, type TreeDelta } from "@loom/runtime"
import {
  auditSnapshot,
  memoryTreeStore,
  type AppendRequest,
  type TreeReader,
} from "@loom/runtime/store"

import { describeAudit } from "./audit-view"
import { seedTree } from "./seed"
import { seedFor } from "./seeds"

/**
 * The page's whole read path, without the page: the seed registry, the
 * runtime's fold, and the wording a reviewer ends up reading.
 *
 * Each piece is unit-tested on its own. This is the join — a seed that did not
 * match the stored tree, or a fold handed the wrong starting point, would pass
 * every one of those and still make the page say a false thing.
 */
const PROVENANCE = {
  origin: "user-instruction",
  interpreter: "scripted",
  confidence: 0.9,
  interpretedAt: "2026-08-02T00:00:00.000Z",
} as const

const appendOf = (delta: TreeDelta): AppendRequest => ({
  proposalId: "p_probe" as ProposalId,
  delta,
  provenance: PROVENANCE,
  appliedAt: "2026-08-02T00:00:00.000Z",
})

const storeWithSeed = async () => {
  const store = memoryTreeStore()
  const seed = seedTree()
  await store.create(seed)

  return { store, seed }
}

/** The first prose node in the seed — something a real edit would touch. */
const firstProse = () => {
  const [, prose] = seedTree().root.children
  if (prose?.kind !== "element") throw new Error("the seed changed shape")

  return prose
}

describe("the audit read path", () => {
  it("agrees on a freshly seeded tree that nothing has changed", async () => {
    const { store, seed } = await storeWithSeed()

    const audit = await auditSnapshot(store, seed.treeId, seed)
    if (!audit.ok) throw new Error("the store refused the audit")

    expect(describeAudit(audit.value).tone).toBe("agrees")
    expect(describeAudit(audit.value).detail).toContain("0 accepted changes")
  })

  it("still agrees after a change has been accepted, folding it back from the seed", async () => {
    const { store, seed } = await storeWithSeed()
    const ids = sequentialIdFactory("probe")

    const appended = await store.append(
      seed.treeId,
      appendOf({
        deltaId: ids.deltaId(),
        treeId: seed.treeId,
        baseRevision: 0,
        operations: [{ op: "configure", nodeId: firstProse().id, set: { tone: "loud" }, unset: [] }],
      })
    )
    if (!appended.ok) throw new Error("the store refused the append")

    const audit = await auditSnapshot(store, seed.treeId, seed)
    if (!audit.ok) throw new Error("the store refused the audit")

    const report = describeAudit(audit.value)
    expect(report.tone).toBe("agrees")
    expect(report.detail).toContain("1 accepted change")
  })

  /**
   * The seed the registry hands out has to be the one the tree was created
   * from. If it drifts — a builder edited without a thought for what is already
   * stored — every audit reports divergence, and the page would be blaming the
   * log for a change in source.
   */
  it("uses a registered seed that still matches what was stored", async () => {
    const { store, seed } = await storeWithSeed()

    const registered = seedFor(seed.treeId)
    if (registered === undefined) throw new Error("the portal does not know its own seed")

    const audit = await auditSnapshot(store, seed.treeId, registered)
    if (!audit.ok) throw new Error("the store refused the audit")

    expect(describeAudit(audit.value).tone).toBe("agrees")
  })

  it("refuses to guess when the seed it was handed is not the one the log applies to", async () => {
    const { store, seed } = await storeWithSeed()
    const ids = sequentialIdFactory("probe")
    const prose = firstProse()

    await store.append(
      seed.treeId,
      appendOf({
        deltaId: ids.deltaId(),
        treeId: seed.treeId,
        baseRevision: 0,
        operations: [{ op: "remove", nodeId: prose.id }],
      })
    )

    /** A seed one delta ahead of the real one: the fold then lands short. */
    const audit = await auditSnapshot(store, seed.treeId, {
      ...seed,
      root: { ...seed.root, children: seed.root.children.filter((node) => node.id !== prose.id) },
    })
    if (!audit.ok) throw new Error("the store refused the audit")
    if (audit.value.outcome !== "unreplayable") throw new Error("expected the fold to stop")

    const report = describeAudit(audit.value)
    expect(report.tone).toBe("unreplayable")
    expect(report.detail).toContain("no longer applies")
  })

  /**
   * Real drift cannot be produced through a working store — it keeps the two
   * in step, which is the point. So the disagreement is staged at the read
   * boundary, which is where a store with a bug would show it.
   */
  it("names the node that disagrees when the served tree is not what the log produces", async () => {
    const seed = seedTree()
    const ids = sequentialIdFactory("probe")
    const prose = firstProse()

    const drifted: TreeReader = {
      /** Claims revision 1 while still serving the untouched tree. */
      head: () => Promise.resolve(ok({ ...seed, revision: 1 })),
      revisions: () =>
        Promise.resolve(
          ok({
            older: null,
            newer: null,
            revisions: [
              {
                treeId: seed.treeId,
                revision: 1,
                proposalId: "p_probe" as ProposalId,
                delta: {
                  deltaId: ids.deltaId(),
                  treeId: seed.treeId,
                  baseRevision: 0,
                  operations: [{ op: "remove", nodeId: prose.id }],
                },
                provenance: PROVENANCE,
                appliedAt: "2026-08-02T00:00:00.000Z",
              },
            ],
          })
        ),
    }

    const audit = await auditSnapshot(drifted, seed.treeId, seed)
    if (!audit.ok) throw new Error("the reader refused the audit")

    const report = describeAudit(audit.value)
    expect(report.tone).toBe("diverged")
    expect(report.detail).toContain("1 accepted change")
    expect(report.differences.map((difference) => difference.nodeId)).toContain(prose.id)
    expect(report.differences.map((difference) => difference.label)).toContain("loom.prose")
    expect(report.omitted).toBe(0)
  })
})
