import { describe, expect, it } from "vitest"

import {
  err,
  ok,
  proposalIdSchema,
  sequentialIdFactory,
  treeIdSchema,
  type LoomTree,
  type TreeOperation,
} from "@jam-overture/loom"
import { memoryTreeStore, type TreeStore } from "@jam-overture/loom/store"

import { pageFixture } from "@/app/_lib/pages/fixtures"

import type { PageCopy } from "./copies"
import { elementIdsOf } from "./fixtures"
import { livePages, liveTreeOf, type LiveReading } from "./live"

const PUBLISHED = pageFixture("home", "Welcome", 3)
const PRICING = pageFixture("pricing", "Pricing", 1)
const [, HEADING] = elementIdsOf(PUBLISHED)

if (HEADING === undefined) throw new Error("the fixture has a heading")

const NEWER = { ...pageFixture("home", "Welcome back", 5), treeId: PUBLISHED.treeId }
const LEVEL: TreeOperation = { op: "configure", nodeId: HEADING, set: { level: 2 }, unset: [] }
const RESTARTED: PageCopy = {
  pageId: PUBLISHED.treeId,
  copyId: treeIdSchema.parse("t_again"),
  startedAt: Date.UTC(2026, 10, 6),
}

/** A store holding `tree` as a copy, with `LEVEL` accepted on it. */
const acceptedOn = async (tree: LoomTree): Promise<{ store: TreeStore; copy: LoomTree }> => {
  const store = memoryTreeStore()
  const created = await store.create(tree)
  if (!created.ok) throw new Error("expected the copy to be made")

  const copy = await store.append(tree.treeId, {
    proposalId: proposalIdSchema.parse("p_level"),
    delta: {
      deltaId: sequentialIdFactory("level").deltaId(),
      treeId: tree.treeId,
      baseRevision: tree.revision,
      operations: [LEVEL],
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
  if (!copy.ok) throw new Error("expected the change to apply")

  return { store, copy: copy.value }
}

const readingOf = (trees: LiveReading["trees"], over: Partial<LiveReading> = {}): LiveReading => ({
  trees,
  copies: [],
  follows: true,
  ...over,
})

describe("liveTreeOf", () => {
  it("is the page as published where Loom never made a copy of it", async () => {
    expect(await liveTreeOf(readingOf(memoryTreeStore()), PUBLISHED)).toEqual(ok(PUBLISHED))
  })

  it("is the copy, with what was accepted on it, while it stands on the published version", async () => {
    const { store, copy } = await acceptedOn(PUBLISHED)

    const live = await liveTreeOf(readingOf(store), PUBLISHED)

    expect(live).toEqual(ok(copy))
    expect(live.ok && live.value.root).not.toEqual(PUBLISHED.root)
  })

  it("names a copy that started again by the page it is a copy of", async () => {
    const { store, copy } = await acceptedOn({ ...NEWER, treeId: RESTARTED.copyId })

    expect(await liveTreeOf(readingOf(store, { copies: [RESTARTED] }), NEWER)).toEqual(
      ok({ ...copy, treeId: PUBLISHED.treeId })
    )
  })

  it("is the copy where the site now publishes the page the accepted change reached", async () => {
    const { store, copy } = await acceptedOn(PUBLISHED)

    expect(await liveTreeOf(readingOf(store), { ...copy, revision: 9 })).toEqual(ok(copy))
  })

  it("is the site's newer version, not an older copy, until the copy starts again from it", async () => {
    const { store } = await acceptedOn(PUBLISHED)

    expect(await liveTreeOf(readingOf(store), NEWER)).toEqual(ok(NEWER))
  })

  it("is always the copy where the site serves the copy itself", async () => {
    const { store, copy } = await acceptedOn(PUBLISHED)

    expect(await liveTreeOf(readingOf(store, { follows: false }), NEWER)).toEqual(ok(copy))
  })

  it("says so when the copy cannot be read, rather than serving the page as built", async () => {
    const down: LiveReading["trees"] = {
      head: () => Promise.resolve(err({ code: "unavailable", detail: "down" })),
      revisions: () => Promise.resolve(err({ code: "unavailable", detail: "down" })),
    }

    expect(await liveTreeOf(readingOf(down), PUBLISHED)).toEqual(
      err({ code: "store", detail: "unavailable" })
    )
  })
})

describe("livePages", () => {
  it("is every published page's live version, by page id", async () => {
    const { store, copy } = await acceptedOn(PUBLISHED)

    expect(await livePages(readingOf(store), [PRICING, PUBLISHED])).toEqual(ok([copy, PRICING]))
  })

  it("is nothing for a site that published nothing", async () => {
    expect(await livePages(readingOf(memoryTreeStore()), [])).toEqual(ok([]))
  })

  it("answers the first page that could not be read, not a partial site", async () => {
    const { store } = await acceptedOn(PUBLISHED)
    const failing: LiveReading["trees"] = {
      head: (treeId) =>
        treeId === PRICING.treeId
          ? Promise.resolve(err({ code: "unavailable", detail: "down" }))
          : store.head(treeId),
      revisions: store.revisions,
    }

    expect(await livePages(readingOf(failing), [PUBLISHED, PRICING])).toEqual(
      err({ code: "store", detail: "unavailable" })
    )
  })
})
