import { describe, expect, it } from "vitest"

import {
  nodeIdSchema,
  type DeltaId,
  type LoomNode,
  type ProposalId,
  type Provenance,
  type TreeDelta,
  type TreeOperation,
} from "@jam-overture/loom"
import {
  memoryTreeStore,
  type AppendRequest,
  type RevisionPage,
  type StoredRevision,
  type TreeReader,
} from "@jam-overture/loom/store"

import { foldVersions, versionsOf } from "./progression"
import { seedTree } from "./seed"
import { readingOf } from "./vocabulary"

const PROVENANCE: Provenance = {
  origin: "user-instruction",
  actor: "ana@loom.local",
  interpreter: "scripted",
  authoredBy: "model",
  confidence: 0.9,
  interpretedAt: "2026-08-09T00:00:00.000Z",
}

const scope = seedTree().treeId

const deltaOf = (revision: number, operations: readonly TreeOperation[]): TreeDelta => ({
  deltaId: `d_${revision}` as DeltaId,
  treeId: scope,
  baseRevision: revision - 1,
  operations,
})

const entryOf = (revision: number, operations: readonly TreeOperation[]): StoredRevision => ({
  treeId: scope,
  revision,
  proposalId: `p_${revision}` as ProposalId,
  delta: deltaOf(revision, operations),
  provenance: PROVENANCE,
  appliedAt: "2026-08-09T09:04:00.000Z",
})

const appendOf = (entry: StoredRevision): AppendRequest => ({
  proposalId: entry.proposalId,
  delta: entry.delta,
  provenance: entry.provenance,
  appliedAt: entry.appliedAt,
})

/** The outlined card the seed puts third in the page — the one a real change reshapes. */
const seedCard = (): LoomNode & { readonly kind: "element" } => {
  const card = seedTree().root.children[2]
  if (card?.kind !== "element") throw new Error("the seed changed shape")

  return card
}

/** One `configure` on the card, which is the smallest change that alters the drawing. */
const restyle = (revision: number, variant: string): StoredRevision =>
  entryOf(revision, [
    { op: "configure", nodeId: seedCard().id, set: { variant }, unset: [] },
  ])

const replayed = (progression: ReturnType<typeof foldVersions>) => progression

describe("foldVersions", () => {
  /**
   * A page nothing has happened to is **one version**, not zero. The distinction
   * is the whole of the empty state: "there are no versions" would be a screen
   * saying the page does not exist.
   */
  it("gives a page with no changes exactly one version, and nothing that made it", () => {
    const folded = foldVersions(seedTree(), [])

    expect(folded.versions.map((version) => version.version)).toEqual([0])
    expect(folded.versions[0]?.change).toBeUndefined()
    expect(folded.newest).toBe(0)
    expect(folded.stopped).toBeUndefined()
  })

  it("draws one version per change, oldest first, and numbers them as the record does", () => {
    const folded = foldVersions(seedTree(), [
      restyle(1, "prominent"),
      restyle(2, "flat"),
      restyle(3, "outlined"),
    ])

    expect(folded.versions.map((version) => version.version)).toEqual([0, 1, 2, 3])
    expect(folded.newest).toBe(3)
    expect(folded.stopped).toBeUndefined()
  })

  /**
   * The property that makes this a progression rather than a list: each version
   * is a *different tree*, and the difference is the change that produced it.
   */
  it("hands back a distinct tree for each version, each carrying that change", () => {
    const folded = foldVersions(seedTree(), [restyle(1, "prominent"), restyle(2, "flat")])
    const variants = folded.versions.map((version) => {
      const card = version.tree.root.children[2]

      return card?.kind === "element" ? card.props.variant : undefined
    })

    expect(variants).toEqual(["outlined", "prominent", "flat"])
    expect(folded.versions.map((version) => version.tree.revision)).toEqual([0, 1, 2])
  })

  /**
   * Every version but the oldest says what made it, and the oldest says nothing
   * rather than borrowing the change below it.
   */
  it("attaches what was done to the version it produced, and to no other", () => {
    const folded = foldVersions(seedTree(), [restyle(1, "prominent")])

    expect(folded.versions[0]?.change).toBeUndefined()
    expect(folded.versions[1]?.change?.onTheRecord).toBe("revision 1")
    expect(folded.versions[1]?.change?.view.who).toBe("ana@loom.local asked for this.")
    expect(folded.versions[1]?.change?.when).toContain("2026")
  })

  /**
   * **The half only this screen can do.** A sentence about a change that *removed*
   * something has to name the thing that is gone, and the page as it stands no
   * longer holds it. `/portal/history` recovers the name by inverting the record;
   * here the version before the change is already in hand, so the name comes
   * straight off it.
   */
  it("names a part a change removed, from the version that still had it", () => {
    const card = seedCard()
    const folded = foldVersions(seedTree(), [entryOf(1, [{ op: "remove", nodeId: card.id }])])
    const said = folded.versions[1]?.change?.view.changes[0]

    expect(said && readingOf(said)).toContain("the card “Every change is a delta”")
  })

  /**
   * A gap in the record is not stepped over. Every version before it is real and
   * stays; everything after it is unknown and the fold says where it stopped.
   */
  it("stops at a gap in the record rather than applying across it", () => {
    const folded = foldVersions(seedTree(), [restyle(1, "prominent"), restyle(3, "flat")])

    expect(folded.versions.map((version) => version.version)).toEqual([0, 1])
    expect(folded.stopped?.after).toBe(1)
    expect(folded.stopped?.detail).toContain("revision 2")
    /** The record still claims a version 3, and the screen has to be able to say so. */
    expect(folded.newest).toBe(3)
  })

  it("stops at a change that will not apply, and says which one", () => {
    const missing = nodeIdSchema.parse("n_nowhere")
    const folded = foldVersions(seedTree(), [
      restyle(1, "prominent"),
      entryOf(2, [{ op: "remove", nodeId: missing }]),
    ])

    expect(folded.versions.map((version) => version.version)).toEqual([0, 1])
    expect(folded.stopped?.after).toBe(1)
    expect(folded.stopped?.detail).toContain("revision 2")
  })

  /**
   * The window is a contiguous run at the **newest** end, and the versions it
   * drops are dropped from the oldest end. A sample with holes would be
   * indistinguishable from a page that jumped, which phase 3 forbids by name.
   */
  it("keeps the newest run when there are more versions than may be drawn", () => {
    const folded = foldVersions(
      seedTree(),
      [1, 2, 3, 4, 5].map((revision) => restyle(revision, `v${revision}`)),
      3
    )

    expect(folded.versions.map((version) => version.version)).toEqual([3, 4, 5])
    expect(folded.newest).toBe(5)
    expect(folded.stopped).toBeUndefined()
  })

  /**
   * The oldest version a slid window holds was produced by a change, and the
   * window does not contain the version before it — so offering that change as a
   * step would offer a reader a move they cannot make.
   */
  it("drops the change from the oldest version it draws, whichever one that is", () => {
    const folded = foldVersions(
      seedTree(),
      [1, 2, 3].map((revision) => restyle(revision, `v${revision}`)),
      2
    )

    expect(folded.versions.map((version) => version.version)).toEqual([2, 3])
    expect(folded.versions[0]?.change).toBeUndefined()
    expect(folded.versions[1]?.change).not.toBeUndefined()
  })

  it("never draws more versions than it was allowed", () => {
    const folded = replayed(
      foldVersions(seedTree(), Array.from({ length: 40 }, (_, at) => restyle(at + 1, `v${at}`)), 6)
    )

    expect(folded.versions).toHaveLength(6)
  })
})

describe("versionsOf", () => {
  it("says so when this host cannot reproduce the page's starting shape", async () => {
    const store = memoryTreeStore()

    expect(await versionsOf(store, scope, undefined)).toEqual({ kind: "unknown-start" })
  })

  it("reads a page's whole record and folds it", async () => {
    const store = memoryTreeStore()
    const seed = seedTree()
    await store.create(seed)

    for (const revision of [1, 2]) {
      const appended = await store.append(scope, appendOf(restyle(revision, `v${revision}`)))
      if (!appended.ok) throw new Error("the store refused a change the fixture built")
    }

    const progression = await versionsOf(store, scope, seed)

    if (progression.kind !== "replayed") throw new Error("a readable record replays")
    expect(progression.versions.map((version) => version.version)).toEqual([0, 1, 2])
    expect(progression.newest).toBe(2)
  })

  /**
   * A record read in pages is still one record. The walk follows `newer` to the
   * end, so a log longer than one page must not come back as its first page —
   * which is the silent failure this asserts against, because the fold would
   * report a page whose newest version is simply wrong.
   */
  it("follows the record past the end of one page", async () => {
    const entries = Array.from({ length: 5 }, (_, at) => restyle(at + 1, `v${at}`))
    const pages: readonly RevisionPage[] = [
      { revisions: entries.slice(0, 2), older: null, newer: "c2" },
      { revisions: entries.slice(2, 4), older: "c2", newer: "c4" },
      { revisions: entries.slice(4), older: "c4", newer: null },
    ]

    const reader: TreeReader = {
      head: async () => ({ ok: true, value: seedTree() }),
      revisions: async (_treeId, request) => {
        const cursor = request?.cursor
        const page = cursor === undefined ? pages[0] : cursor === "c2" ? pages[1] : pages[2]

        return { ok: true, value: page! }
      },
    }

    const progression = await versionsOf(reader, scope, seedTree())

    if (progression.kind !== "replayed") throw new Error("a readable record replays")
    expect(progression.versions.map((version) => version.version)).toEqual([0, 1, 2, 3, 4, 5])
  })

  it("reports a record it could not read, rather than an empty progression", async () => {
    const reader: TreeReader = {
      head: async () => ({ ok: true, value: seedTree() }),
      revisions: async () => ({
        ok: false,
        error: { code: "unavailable", detail: "the connection went away" },
      }),
    }

    const progression = await versionsOf(reader, scope, seedTree())

    expect(progression.kind).toBe("unreadable")
    if (progression.kind !== "unreadable") return
    expect(progression.detail).toContain("the connection went away")
  })
})
