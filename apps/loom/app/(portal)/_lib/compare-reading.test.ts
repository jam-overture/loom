import { describe, expect, it } from "vitest"

import {
  err,
  proposalIdSchema,
  sequentialIdFactory,
  treeIdSchema,
  type LoomTree,
  type ProposalId,
  type TreeOperation,
} from "@jam-overture/loom"
import { memoryTreeStore, type TreeStore } from "@jam-overture/loom/store"

import { pageFixture } from "@/app/_lib/pages/fixtures"

import { compareChange, type CompareReading } from "./compare-reading"
import type { PageCopy } from "./proposing/copies"
import { elementIdsOf } from "./proposing/fixtures"

const PUBLISHED = pageFixture("home", "Welcome", 3)
const [STACK, HEADING] = elementIdsOf(PUBLISHED)

if (STACK === undefined || HEADING === undefined) throw new Error("the fixture has a heading")

const LEVEL = proposalIdSchema.parse("p_level")
const DROP = proposalIdSchema.parse("p_drop")
const NEWER = { ...pageFixture("home", "Welcome back", 5), treeId: PUBLISHED.treeId }
const RESTARTED: PageCopy = {
  pageId: PUBLISHED.treeId,
  copyId: treeIdSchema.parse("t_again"),
  startedAt: Date.UTC(2026, 10, 6),
}

/** A store holding `tree` as a copy, with each change accepted on it in turn. */
const copyWith = async (
  tree: LoomTree,
  changes: readonly (readonly [ProposalId, TreeOperation])[]
): Promise<TreeStore> => {
  const store = memoryTreeStore()
  const ids = sequentialIdFactory("accept")
  const created = await store.create(tree)
  if (!created.ok) throw new Error("expected the copy to be made")

  await changes.reduce<Promise<LoomTree>>(async (prior, [proposalId, operation]) => {
    const copy = await prior
    const appended = await store.append(tree.treeId, {
      proposalId,
      delta: {
        deltaId: ids.deltaId(),
        treeId: tree.treeId,
        baseRevision: copy.revision,
        operations: [operation],
      },
      provenance: {
        origin: "system-signal",
        interpreter: "test",
        authoredBy: "model",
        confidence: 0.9,
        interpretedAt: "2026-11-06T00:00:00.000Z",
      },
      appliedAt: "2026-11-06T00:00:00.000Z",
      answeredBy: "owner:ana",
    })
    if (!appended.ok) throw new Error("expected the change to apply")

    return appended.value
  }, Promise.resolve(created.value))

  return store
}

const SET_LEVEL: TreeOperation = {
  op: "configure",
  nodeId: HEADING,
  set: { level: 2 },
  unset: [],
}
const REMOVE_HEADING: TreeOperation = { op: "remove", nodeId: HEADING }

const readingOf = (
  trees: CompareReading["trees"],
  over: Partial<CompareReading> = {}
): CompareReading => ({ trees, copies: [], published: PUBLISHED, ...over })

describe("compareChange", () => {
  it("draws the page just before the change and just after it", async () => {
    const store = await copyWith(PUBLISHED, [
      [LEVEL, SET_LEVEL],
      [DROP, REMOVE_HEADING],
    ])

    const compared = await compareChange(readingOf(store), LEVEL)

    expect(compared.kind).toBe("drawn")
    expect(compared.kind === "drawn" && compared.comparison.summary).toBe("1 part changed.")
  })

  it("draws a later change from the page the earlier one left", async () => {
    const store = await copyWith(PUBLISHED, [
      [LEVEL, SET_LEVEL],
      [DROP, REMOVE_HEADING],
    ])

    const compared = await compareChange(readingOf(store), DROP)

    expect(compared.kind === "drawn" && compared.comparison.summary).toBe("1 part taken off.")
    expect(compared.kind === "drawn" && compared.comparison.after).toEqual([])
  })

  it("reads the page's current copy once the site's newer version was followed", async () => {
    const store = await copyWith({ ...NEWER, treeId: RESTARTED.copyId }, [[LEVEL, SET_LEVEL]])

    const compared = await compareChange(
      readingOf(store, { copies: [RESTARTED], published: NEWER }),
      LEVEL
    )

    expect(compared.kind === "drawn" && compared.comparison.summary).toBe("1 part changed.")
  })

  it("does not draw a change that is not on the live page's record", async () => {
    const store = await copyWith(PUBLISHED, [[LEVEL, SET_LEVEL]])

    expect(await compareChange(readingOf(store), DROP)).toEqual({
      kind: "not-drawn",
      why: "off-the-page",
    })
  })

  it("does not draw a page Loom never made a copy of", async () => {
    expect(await compareChange(readingOf(memoryTreeStore()), LEVEL)).toEqual({
      kind: "not-drawn",
      why: "off-the-page",
    })
  })

  it("does not guess where the site published a version the copy does not stand on", async () => {
    const store = await copyWith(PUBLISHED, [[LEVEL, SET_LEVEL]])

    expect(await compareChange(readingOf(store, { published: NEWER }), LEVEL)).toEqual({
      kind: "not-drawn",
      why: "site-moved",
    })
  })

  it("says the record could not be read rather than drawing nothing", async () => {
    const failing: CompareReading["trees"] = {
      head: () => Promise.resolve(err({ code: "unavailable", detail: "down" })),
      revisions: () => Promise.resolve(err({ code: "unavailable", detail: "down" })),
    }

    expect(await compareChange(readingOf(failing), LEVEL)).toEqual({ kind: "unreadable" })
  })
})
