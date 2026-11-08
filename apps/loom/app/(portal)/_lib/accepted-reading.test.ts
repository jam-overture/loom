import { describe, expect, it } from "vitest"

import {
  err,
  proposalIdSchema,
  treeIdSchema,
  type DeltaId,
  type LoomTree,
} from "@jam-overture/loom"
import { memoryTreeStore, type AppendRequest, type TreeStore } from "@jam-overture/loom/store"

import { pageFixture } from "@/app/_lib/pages/fixtures"

import { acceptedOnPages } from "./accepted-reading"
import { elementIdsOf } from "./proposing/fixtures"

const HOME = pageFixture("home", "Welcome", 3)
const ABOUT = pageFixture("about", "About us", 1)
const NEWER_HOME = treeIdSchema.parse("t_homenewer")

const AT = Date.UTC(2026, 10, 7, 9, 0)

/** Takes the page's heading away: a change that fits once and only once. */
const removeHeading = (tree: LoomTree, proposal: string, at: number): AppendRequest => {
  const [, heading] = elementIdsOf(tree)

  if (heading === undefined) throw new Error("the fixture has a heading")

  return {
    proposalId: proposalIdSchema.parse(proposal),
    delta: {
      deltaId: `d_${proposal}` as DeltaId,
      treeId: tree.treeId,
      baseRevision: tree.revision,
      operations: [{ op: "remove", nodeId: heading }],
    },
    provenance: {
      origin: "system-signal",
      interpreter: "scripted",
      authoredBy: "model",
      confidence: 0.8,
      interpretedAt: new Date(at).toISOString(),
    },
    appliedAt: new Date(at).toISOString(),
  }
}

const storeWith = async (trees: readonly LoomTree[]): Promise<TreeStore> => {
  const store = memoryTreeStore()

  for (const tree of trees) await store.create(tree)

  return store
}

describe("acceptedOnPages", () => {
  it("reads a page nothing was proposed for, which has no copy yet, as nothing accepted", async () => {
    const read = await acceptedOnPages(await storeWith([]), [], [HOME.treeId])

    expect(read).toEqual({ ok: true, value: [] })
  })

  it("lists the changes on every page's copies, newest first across pages", async () => {
    const store = await storeWith([HOME, ABOUT])

    await store.append(HOME.treeId, removeHeading(HOME, "p_home", AT))
    await store.append(ABOUT.treeId, removeHeading(ABOUT, "p_about", AT + 1_000))

    const read = await acceptedOnPages(store, [], [HOME.treeId, ABOUT.treeId])

    expect(read.ok && read.value.map((change) => [change.proposalId, change.pageId])).toEqual([
      ["p_about", ABOUT.treeId],
      ["p_home", HOME.treeId],
    ])
  })

  it("reads the copies a newer version started, and pages only a copy names", async () => {
    const store = await storeWith([HOME, { ...HOME, treeId: NEWER_HOME }])

    await store.append(HOME.treeId, removeHeading(HOME, "p_home", AT))

    const read = await acceptedOnPages(
      store,
      [{ pageId: HOME.treeId, copyId: NEWER_HOME, startedAt: AT + 5_000 }],
      []
    )

    expect(read.ok && read.value.map((change) => change.ending)).toEqual([
      { kind: "dropped", at: AT + 5_000 },
    ])
  })

  it("fails whole when one copy cannot be read, rather than list some pages' changes", async () => {
    const store = await storeWith([HOME])
    const failing: Pick<TreeStore, "revisions"> = {
      revisions: (treeId, request) =>
        treeId === ABOUT.treeId
          ? Promise.resolve(err({ code: "unavailable", detail: "down" } as const))
          : store.revisions(treeId, request),
    }

    const read = await acceptedOnPages(failing, [], [HOME.treeId, ABOUT.treeId])

    expect(read.ok).toBe(false)
  })
})
