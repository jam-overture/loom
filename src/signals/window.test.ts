import { describe, expect, it, vi } from "vitest"

import type { AudienceId } from "../audience/audience.js"
import type { TreeId } from "../ids.js"
import type { PrimitiveRole } from "../role.js"
import {
  nodeId,
  OTHER_TREE,
  primitiveType,
  region,
  RIDERS,
  SKIERS,
  TREE,
} from "../testing/reader-signal-contract.js"
import type { ElementNode } from "../tree/node.js"
import { TREE_SCHEMA_VERSION, type LoomTree } from "../tree/tree.js"

import { readingKeyOf } from "./audiences.js"
import { deploymentReadingOf } from "./deployment.js"
import { memoryReaderRegionStore, memoryReaderTallyStore } from "./memory.js"
import type { StoredPageViews } from "./page-views.js"
import type { PartDeclarations } from "./parts.js"
import { readingProgressOf } from "./progress.js"
import type { StoredRegionCount } from "./region.js"
import type { ReaderTally } from "./rollup.js"
import type { StoredFunnel, StoredTally, TallyReadRequest } from "./tally.js"
import {
  describeUnjoinedCause,
  readReaderWindow,
  revisionsIn,
  treesIn,
  windowReadingsOf,
  UNJOINED_CAUSES,
  type ReaderWindow,
  type ReaderWindowSources,
} from "./window.js"

/**
 * Two kinds of fixture, because the unit has two halves. The read is against a
 * store double that records what it was asked and a store that fails, and the
 * join is against trees, rows and a registry double — the three things a server
 * holds, exactly as the join underneath is tested.
 */

const element = (name: string, type: string, children: readonly ElementNode[] = []): ElementNode => ({
  kind: "element",
  id: nodeId(name),
  type: primitiveType(type),
  props: {},
  children,
})

const treeOf = (treeId: TreeId, revision: number, root: ElementNode = PAGE): LoomTree => ({
  treeId,
  schemaVersion: TREE_SCHEMA_VERSION,
  revision,
  root,
})

const PAGE = element("page", "loom.page", [
  element("band", "loom.section", [element("cta", "loom.button")]),
])

/** Two parts side by side, so a fall between them is a fall somebody can rank. */
const SIDE_BY_SIDE = element("page", "loom.page", [
  element("band", "loom.section"),
  element("cta", "loom.button"),
])

const DECLARED: PartDeclarations = {
  copyFor: () => undefined,
  typesWithRole: (role: PrimitiveRole) =>
    role === "heading" ? [primitiveType("loom.section")] : [],
}

const NOTHING_DECLARED: PartDeclarations = {
  copyFor: () => undefined,
  typesWithRole: () => [],
}

/**
 * The stored rows, each built against the stored type with its audience column
 * left off, so a field this file gets wrong is a type error. The one cast is
 * the column itself: a row that names no form is what a store never writes and
 * a window built by hand always does, and it is a case the join has to answer
 * for (0284).
 */
const withForm = <Row>(row: Row, audienceId: AudienceId | undefined): Row =>
  audienceId === undefined ? row : { ...row, audienceId }

const tally = (
  where: { readonly treeId?: TreeId; readonly revision?: number },
  name: string,
  counters: Partial<ReaderTally> = {},
  audienceId?: AudienceId
): StoredTally => {
  const row: Omit<StoredTally, "audienceId"> = {
    treeId: where.treeId ?? TREE,
    revision: where.revision ?? 1,
    nodeId: nodeId(name),
    type: primitiveType("loom.section"),
    views: 0,
    reached: 0,
    engaged: 0,
    dwellMs: 0,
    activations: 0,
    opens: 0,
    closes: 0,
    completions: 0,
    updatedAt: "2026-10-24T00:00:00.000Z",
    ...counters,
  }

  return withForm(row, audienceId) as StoredTally
}

const door = (
  where: { readonly treeId?: TreeId; readonly revision?: number },
  opened: number,
  audienceId?: AudienceId
): StoredPageViews => {
  const row: Omit<StoredPageViews, "audienceId"> = {
    treeId: where.treeId ?? TREE,
    revision: where.revision ?? 1,
    opened,
    appearances: opened,
    updatedAt: "2026-10-24T00:00:00.000Z",
  }

  return withForm(row, audienceId) as StoredPageViews
}

const funnel = (
  where: { readonly treeId?: TreeId; readonly revision?: number },
  audienceId?: AudienceId
): StoredFunnel => {
  const row: Omit<StoredFunnel, "audienceId"> = {
    treeId: where.treeId ?? TREE,
    revision: where.revision ?? 1,
    pair: {
      from: { nodeId: nodeId("band"), kind: "viewed" },
      to: { nodeId: nodeId("cta"), kind: "activated" },
    },
    reached: 2,
    converted: 1,
    updatedAt: "2026-10-24T00:00:00.000Z",
  }

  return withForm(row, audienceId) as StoredFunnel
}

const bucket = (
  where: { readonly treeId?: TreeId; readonly revision?: number },
  audienceId?: AudienceId
): StoredRegionCount => {
  const row: Omit<StoredRegionCount, "audienceId"> = {
    treeId: where.treeId ?? TREE,
    revision: where.revision ?? 1,
    region: region("FR"),
    views: 120,
    updatedAt: "2026-10-24T00:00:00.000Z",
  }

  return withForm(row, audienceId) as StoredRegionCount
}

const windowOf = (held: Partial<ReaderWindow> = {}): ReaderWindow => ({
  tallies: [],
  funnels: [],
  pageViews: [],
  regions: undefined,
  ...held,
})

const UNAVAILABLE = { code: "unavailable", detail: "no connection" } as const

/** A store double that answers from what it was given and records every ask. */
const storeOf = (
  held: Partial<ReaderWindow> = {}
): {
  readonly sources: ReaderWindowSources
  readonly asked: () => readonly (TallyReadRequest | undefined)[]
} => {
  const asked: (TallyReadRequest | undefined)[] = []
  const answer =
    <Row>(rows: readonly Row[]) =>
    (request?: TallyReadRequest) => {
      asked.push(request)
      return Promise.resolve({ ok: true as const, value: rows })
    }

  return {
    sources: {
      tallies: {
        tallies: answer(held.tallies ?? []),
        funnels: answer(held.funnels ?? []),
        pageViews: answer(held.pageViews ?? []),
      },
      ...(held.regions === undefined ? {} : { regions: { regions: answer(held.regions) } }),
    },
    asked: () => asked,
  }
}

describe("reading one window from the stores", () => {
  it("brings the four row sets back as one window", async () => {
    const { sources } = storeOf({
      tallies: [tally({}, "band")],
      funnels: [funnel({})],
      pageViews: [door({}, 9)],
      regions: [bucket({})],
    })

    const read = await readReaderWindow(sources)

    expect(read.ok).toBe(true)
    if (!read.ok) return
    expect(read.value.tallies).toHaveLength(1)
    expect(read.value.funnels).toHaveLength(1)
    expect(read.value.pageViews).toHaveLength(1)
    expect(read.value.regions).toHaveLength(1)
  })

  it("asks every store for the same scope, once each", async () => {
    const { sources, asked } = storeOf({ regions: [] })
    const request = { treeId: TREE, revision: 2, audience: SKIERS }

    await readReaderWindow(sources, request)

    expect(asked()).toEqual([request, request, request, request])
  })

  it("leaves the region map undefined where no region store was offered", async () => {
    const { sources } = storeOf({ tallies: [tally({}, "band")] })

    const read = await readReaderWindow(sources)

    expect(read.ok && read.value.regions).toBeUndefined()
  })

  it("tells an empty region store from no region store at all", async () => {
    const { sources } = storeOf({ regions: [] })

    const read = await readReaderWindow(sources)

    expect(read.ok && read.value.regions).toEqual([])
  })

  it.each([
    ["the counters", "tallies"],
    ["the funnel answers", "funnels"],
    ["the door rows", "pageViews"],
  ] as const)("answers with the failure where %s could not be read", async (_name, failing) => {
    const { sources } = storeOf({})
    const broken = {
      ...sources,
      tallies: {
        ...sources.tallies,
        [failing]: () => Promise.resolve({ ok: false as const, error: UNAVAILABLE }),
      },
    }

    expect(await readReaderWindow(broken)).toEqual({ ok: false, error: UNAVAILABLE })
  })

  it("answers with the failure where the region map could not be read", async () => {
    const { sources } = storeOf({})
    const broken: ReaderWindowSources = {
      ...sources,
      regions: { regions: () => Promise.resolve({ ok: false as const, error: UNAVAILABLE }) },
    }

    expect(await readReaderWindow(broken)).toEqual({ ok: false, error: UNAVAILABLE })
  })

  it("does not serve half a window, because the rates in one would be plausible", async () => {
    const { sources } = storeOf({ tallies: [tally({}, "band", { reached: 4 })] })
    const broken: ReaderWindowSources = {
      ...sources,
      tallies: {
        ...sources.tallies,
        pageViews: () => Promise.resolve({ ok: false as const, error: UNAVAILABLE }),
      },
    }

    const read = await readReaderWindow(broken)

    expect(read.ok).toBe(false)
  })
})

describe("which revisions a window names", () => {
  it("names a revision only the counters mention", () => {
    expect(revisionsIn(windowOf({ tallies: [tally({ revision: 3 }, "band")] }))).toEqual([
      { treeId: TREE, revision: 3 },
    ])
  })

  it("names a revision only the door mentions, which is the uncounted page", () => {
    expect(revisionsIn(windowOf({ pageViews: [door({ revision: 4 }, 11)] }))).toEqual([
      { treeId: TREE, revision: 4 },
    ])
  })

  it("names a revision only a funnel answer mentions", () => {
    expect(revisionsIn(windowOf({ funnels: [funnel({ revision: 5 })] }))).toEqual([
      { treeId: TREE, revision: 5 },
    ])
  })

  it("names a revision only the region map mentions", () => {
    expect(revisionsIn(windowOf({ regions: [bucket({ revision: 6 })] }))).toEqual([
      { treeId: TREE, revision: 6 },
    ])
  })

  it("names a revision once however many rows and forms mention it", () => {
    const held = windowOf({
      tallies: [tally({}, "band", {}, SKIERS), tally({}, "cta", {}, RIDERS)],
      pageViews: [door({}, 3, SKIERS), door({}, 2, RIDERS)],
      funnels: [funnel({}, SKIERS)],
      regions: [bucket({}, RIDERS)],
    })

    expect(revisionsIn(held)).toEqual([{ treeId: TREE, revision: 1 }])
  })

  it("orders by page and then by revision, whatever order the rows arrived in", () => {
    const held = windowOf({
      tallies: [
        tally({ treeId: OTHER_TREE, revision: 2 }, "band"),
        tally({ revision: 9 }, "band"),
        tally({ revision: 1 }, "band"),
        tally({ treeId: OTHER_TREE, revision: 1 }, "band"),
      ],
    })

    expect(revisionsIn(held)).toEqual([
      { treeId: TREE, revision: 1 },
      { treeId: TREE, revision: 9 },
      { treeId: OTHER_TREE, revision: 1 },
      { treeId: OTHER_TREE, revision: 2 },
    ])
  })

  it("names nothing in an empty window", () => {
    expect(revisionsIn(windowOf())).toEqual([])
  })
})

describe("the trees a caller already holds", () => {
  it("answers per page and per revision", () => {
    const trees = treesIn([treeOf(TREE, 1), treeOf(TREE, 2), treeOf(OTHER_TREE, 1)])

    expect(trees.treeFor({ treeId: TREE, revision: 2 })?.revision).toBe(2)
    expect(trees.treeFor({ treeId: OTHER_TREE, revision: 1 })?.treeId).toBe(OTHER_TREE)
  })

  it("has nothing for a revision it was not given", () => {
    expect(treesIn([treeOf(TREE, 1)]).treeFor({ treeId: TREE, revision: 2 })).toBeUndefined()
  })

  it("keeps the first of two trees at one revision rather than the last", () => {
    const first = treeOf(TREE, 1, element("first", "loom.page"))
    const second = treeOf(TREE, 1, element("second", "loom.page"))

    expect(treesIn([first, second]).treeFor({ treeId: TREE, revision: 1 })?.root.id).toBe(
      nodeId("first")
    )
  })

  it("has nothing at all when it was given nothing", () => {
    expect(treesIn([]).treeFor({ treeId: TREE, revision: 1 })).toBeUndefined()
  })
})

describe("joining a window to the pages it is about", () => {
  const joined = (held: Partial<ReaderWindow>, trees: readonly LoomTree[]) =>
    windowReadingsOf(windowOf(held), treesIn(trees), DECLARED)

  it("reads a revision against its own tree and the registry", () => {
    const { pages } = joined(
      { tallies: [tally({}, "band", { views: 2, reached: 2 })] },
      [treeOf(TREE, 1)]
    )

    expect(pages).toHaveLength(1)
    expect(pages[0]?.parts.map((part) => part.standing)).toEqual(["skipped", "read", "skipped"])
    expect(pages[0]?.parts[1]?.role).toBe("heading")
  })

  it("hands each reading its own revision's rows, so nothing is foreign to it", () => {
    const { pages } = joined(
      {
        tallies: [
          tally({ revision: 1 }, "band", { views: 2, reached: 2, dwellMs: 400 }),
          tally({ revision: 2 }, "band", { views: 5, reached: 5, dwellMs: 900 }),
          tally({ treeId: OTHER_TREE, revision: 1 }, "band", { views: 1, reached: 1 }),
        ],
      },
      [treeOf(TREE, 1), treeOf(TREE, 2), treeOf(OTHER_TREE, 1)]
    )

    expect(pages.map((page) => page.foreign)).toEqual([0, 0, 0])
    expect(pages.map((page) => page.views)).toEqual([2, 5, 1])
    expect(pages.map((page) => page.roles.find((row) => row.role === "heading")?.dwellMs)).toEqual([
      400, 900, 0,
    ])
  })

  it("orders the readings by page, revision and form", () => {
    const { pages } = joined(
      {
        tallies: [
          tally({ treeId: OTHER_TREE, revision: 1 }, "band", {}, SKIERS),
          tally({ revision: 2 }, "band", {}, SKIERS),
          tally({ revision: 1 }, "band", {}, SKIERS),
          tally({ revision: 1 }, "band", {}, RIDERS),
        ],
      },
      [treeOf(TREE, 1), treeOf(TREE, 2), treeOf(OTHER_TREE, 1)]
    )

    expect(pages.map((page) => [page.treeId, page.revision, page.audienceId])).toEqual([
      [TREE, 1, RIDERS],
      [TREE, 1, SKIERS],
      [TREE, 2, SKIERS],
      [OTHER_TREE, 1, SKIERS],
    ])
  })

  it("reads a window that named no form whole, rather than calling it everyone", () => {
    const { pages } = joined({ tallies: [tally({}, "band", { views: 1, reached: 1 })] }, [
      treeOf(TREE, 1),
    ])

    expect(pages[0]?.audienceId).toBeNull()
    expect(pages[0]?.audiences).toEqual([])
    expect(pages[0]?.parts[1]?.standing).toBe("read")
  })

  it("gives the same window the same answer twice", () => {
    const held = {
      tallies: [tally({}, "band", {}, SKIERS), tally({}, "cta", {}, RIDERS)],
      pageViews: [door({}, 4, RIDERS)],
    }

    expect(joined(held, [treeOf(TREE, 1)])).toEqual(joined(held, [treeOf(TREE, 1)]))
  })
})

describe("a revision served in two forms", () => {
  const TWO_FORMS = {
    tallies: [
      tally({}, "band", { views: 3, reached: 3, dwellMs: 300 }, SKIERS),
      tally({}, "cta", { views: 1, reached: 1, activations: 1 }, RIDERS),
    ],
  }

  it("is two readings rather than one read as neither", () => {
    const { pages } = windowReadingsOf(windowOf(TWO_FORMS), treesIn([treeOf(TREE, 1)]), DECLARED)

    expect(pages.map((page) => page.audienceId)).toEqual([RIDERS, SKIERS])
    expect(pages.every((page) => page.parts.some((part) => part.standing !== "unknown"))).toBe(true)
  })

  it("reads each form's own counters and counts the other form's apart", () => {
    const { pages } = windowReadingsOf(windowOf(TWO_FORMS), treesIn([treeOf(TREE, 1)]), DECLARED)
    const [riders, skiers] = pages

    expect(riders?.parts.find((part) => part.nodeId === nodeId("cta"))?.counters?.activations).toBe(1)
    expect(riders?.parts.find((part) => part.nodeId === nodeId("band"))?.counters).toBeUndefined()
    expect(skiers?.parts.find((part) => part.nodeId === nodeId("band"))?.counters?.dwellMs).toBe(300)
    expect(skiers?.parts.find((part) => part.nodeId === nodeId("cta"))?.counters).toBeUndefined()
    expect([riders?.otherAudience, skiers?.otherAudience]).toEqual([1, 1])
  })

  it("names both forms on each reading, because the page has two", () => {
    const { pages } = windowReadingsOf(windowOf(TWO_FORMS), treesIn([treeOf(TREE, 1)]), DECLARED)

    expect(pages.map((page) => page.audiences)).toEqual([
      [RIDERS, SKIERS],
      [RIDERS, SKIERS],
    ])
  })

  it("reads a form whose readers arrived and whose window has not been folded", () => {
    const { pages } = windowReadingsOf(
      windowOf({
        tallies: [tally({}, "band", { views: 3, reached: 3 }, SKIERS)],
        pageViews: [door({}, 7, RIDERS)],
      }),
      treesIn([treeOf(TREE, 1)]),
      DECLARED
    )
    const riders = pages.find((page) => page.audienceId === RIDERS)

    expect(pages).toHaveLength(2)
    expect(riders?.views).toBe(0)
    expect(riders?.parts.every((part) => part.counters === undefined)).toBe(true)
    expect(riders?.otherAudience).toBe(1)
  })

  it.each([
    ["a funnel answer", { funnels: [funnel({}, RIDERS)] }],
    ["a region bucket", { regions: [bucket({}, RIDERS)] }],
  ])("reads a form named by %s and by no counter", (_name, rows) => {
    const { pages } = windowReadingsOf(
      windowOf({ tallies: [tally({}, "band", {}, SKIERS)], ...rows }),
      treesIn([treeOf(TREE, 1)]),
      DECLARED
    )

    expect(pages.map((page) => page.audienceId)).toEqual([RIDERS, SKIERS])
  })
})

describe("what it refuses to count twice", () => {
  it("never holds two readings of one page, revision and form", () => {
    const { pages } = windowReadingsOf(
      windowOf({
        tallies: [
          tally({ revision: 1 }, "band", {}, SKIERS),
          tally({ revision: 1 }, "cta", {}, SKIERS),
          tally({ revision: 1 }, "band", {}, RIDERS),
          tally({ revision: 2 }, "band", {}, SKIERS),
          tally({ treeId: OTHER_TREE, revision: 1 }, "band", {}, SKIERS),
          tally({ treeId: OTHER_TREE, revision: 1 }, "band", {}, RIDERS),
        ],
        pageViews: [door({ revision: 1 }, 5, SKIERS), door({ revision: 1 }, 5, SKIERS)],
      }),
      treesIn([treeOf(TREE, 1), treeOf(TREE, 2), treeOf(OTHER_TREE, 1)]),
      DECLARED
    )

    expect(pages).toHaveLength(5)
    expect(new Set(pages.map(readingKeyOf)).size).toBe(pages.length)
  })

  it("counts a node's row once and reports the repeat, rather than adding it", () => {
    const { pages } = windowReadingsOf(
      windowOf({
        tallies: [
          tally({}, "band", { views: 2, reached: 2, dwellMs: 500 }, SKIERS),
          tally({}, "band", { views: 2, reached: 2, dwellMs: 500 }, SKIERS),
        ],
      }),
      treesIn([treeOf(TREE, 1)]),
      DECLARED
    )

    expect(pages).toHaveLength(1)
    expect(pages[0]?.duplicated).toEqual([nodeId("band")])
    expect(pages[0]?.roles.find((row) => row.role === "heading")?.dwellMs).toBe(500)
  })

  it("keeps one revision's counters out of another's reading", () => {
    const { pages } = windowReadingsOf(
      windowOf({
        tallies: [
          tally({ revision: 1 }, "band", { views: 2, reached: 2 }),
          tally({ revision: 2 }, "cta", { views: 4, reached: 4 }),
        ],
      }),
      treesIn([treeOf(TREE, 1), treeOf(TREE, 2)]),
      DECLARED
    )

    expect(pages[0]?.parts.find((part) => part.nodeId === nodeId("cta"))?.counters).toBeUndefined()
    expect(pages[1]?.parts.find((part) => part.nodeId === nodeId("band"))?.counters).toBeUndefined()
  })
})

describe("a revision with no tree to read it against", () => {
  it("is published with the rows it left unread, rather than dropped", () => {
    const { pages, unjoined } = windowReadingsOf(
      windowOf({
        tallies: [
          tally({ revision: 1 }, "band"),
          tally({ revision: 7 }, "band"),
          tally({ revision: 7 }, "cta"),
        ],
      }),
      treesIn([treeOf(TREE, 1)]),
      DECLARED
    )

    expect(pages).toHaveLength(1)
    expect(unjoined).toEqual([{ treeId: TREE, revision: 7, cause: "no-tree", tallies: 2 }])
  })

  it("refuses a tree of another revision rather than reading the counters against it", () => {
    const { pages, unjoined } = windowReadingsOf(
      windowOf({ tallies: [tally({ revision: 2 }, "band", { views: 3, reached: 3 })] }),
      { treeFor: () => treeOf(TREE, 1) },
      DECLARED
    )

    expect(pages).toEqual([])
    expect(unjoined).toEqual([{ treeId: TREE, revision: 2, cause: "mismatched", tallies: 1 }])
  })

  it("refuses a tree of another page just as firmly", () => {
    const { pages, unjoined } = windowReadingsOf(
      windowOf({ tallies: [tally({ revision: 1 }, "band")] }),
      { treeFor: () => treeOf(OTHER_TREE, 1) },
      DECLARED
    )

    expect(pages).toEqual([])
    expect(unjoined[0]?.cause).toBe("mismatched")
  })

  it("leaves nothing unjoined where every revision resolved", () => {
    const { unjoined } = windowReadingsOf(
      windowOf({ tallies: [tally({}, "band")] }),
      treesIn([treeOf(TREE, 1)]),
      DECLARED
    )

    expect(unjoined).toEqual([])
  })

  it("keeps the unjoined in the order the revisions are in", () => {
    const { unjoined } = windowReadingsOf(
      windowOf({
        tallies: [
          tally({ treeId: OTHER_TREE, revision: 1 }, "band"),
          tally({ revision: 3 }, "band"),
          tally({ revision: 2 }, "band"),
        ],
      }),
      treesIn([]),
      DECLARED
    )

    expect(unjoined.map((row) => [row.treeId, row.revision])).toEqual([
      [TREE, 2],
      [TREE, 3],
      [OTHER_TREE, 1],
    ])
  })
})

describe("what a surface draws an unjoined revision as", () => {
  it("has a line for every member of the closed set", () => {
    expect(UNJOINED_CAUSES.map(describeUnjoinedCause).every((line) => line.length > 0)).toBe(true)
  })

  it("gives the two causes two different lines", () => {
    expect(describeUnjoinedCause("no-tree")).not.toBe(describeUnjoinedCause("mismatched"))
  })
})

describe("from a store to a question, over the store a deployment has", () => {
  /**
   * The unit exists to make the counters askable, so the one test that says
   * whether it did goes all the way: write what an intake and a rollup write,
   * read it back through this rung, and ask a reading of a deployment's pages
   * for the order it publishes. Nothing in it is a double of anything.
   */
  it("answers which page to fix first, from rows nothing had read before", async () => {
    const tallies = memoryReaderTallyStore()
    const regions = memoryReaderRegionStore()
    const at = "2026-10-24T09:00:00.000Z"

    await tallies.opened(
      [
        { treeId: TREE, revision: 1, views: 10 },
        { treeId: OTHER_TREE, revision: 1, views: 4 },
      ],
      at
    )
    await tallies.apply(
      {
        tallies: [
          tally({ treeId: TREE, revision: 1 }, "band", { views: 10, reached: 10 }),
          tally({ treeId: TREE, revision: 1 }, "cta", { views: 10, reached: 2 }),
          tally({ treeId: OTHER_TREE, revision: 1 }, "band", { views: 4, reached: 4 }),
          tally({ treeId: OTHER_TREE, revision: 1 }, "cta", { views: 4, reached: 3 }),
        ],
        funnels: [],
        appearances: [
          { treeId: TREE, revision: 1, views: 10 },
          { treeId: OTHER_TREE, revision: 1, views: 4 },
        ],
      },
      at
    )
    await regions.count([{ treeId: TREE, revision: 1, region: region("FR"), views: 10 }], at)

    const read = await readReaderWindow({ tallies, regions })

    expect(read.ok).toBe(true)
    if (!read.ok) return

    const { pages, unjoined } = windowReadingsOf(
      read.value,
      treesIn([treeOf(TREE, 1, SIDE_BY_SIDE), treeOf(OTHER_TREE, 1, SIDE_BY_SIDE)]),
      DECLARED
    )

    expect(unjoined).toEqual([])
    expect(pages).toHaveLength(2)

    const order = deploymentReadingOf(pages.map(readingProgressOf), read.value.pageViews)

    expect(order.ranked.map((page) => [page.treeId, page.lost])).toEqual([
      [TREE, 8],
      [OTHER_TREE, 1],
    ])
    expect(order.arrivals).toBe(14)
  })

  it("says which revisions it could not read, where the trees are gone", async () => {
    const tallies = memoryReaderTallyStore()
    await tallies.apply(
      { tallies: [tally({ revision: 4 }, "band")], funnels: [] },
      "2026-10-24T09:00:00.000Z"
    )

    const read = await readReaderWindow({ tallies })
    if (!read.ok) throw new Error("the window was not read")

    const { pages, unjoined } = windowReadingsOf(read.value, treesIn([]), NOTHING_DECLARED)

    expect(pages).toEqual([])
    expect(unjoined.map((row) => row.cause)).toEqual(["no-tree"])
  })

  it("reads every store once for a screen of a whole deployment", async () => {
    const tallies = memoryReaderTallyStore()
    const spied = {
      tallies: vi.fn(tallies.tallies),
      funnels: vi.fn(tallies.funnels),
      pageViews: vi.fn(tallies.pageViews),
    }

    await readReaderWindow({ tallies: spied })

    expect([
      spied.tallies.mock.calls.length,
      spied.funnels.mock.calls.length,
      spied.pageViews.mock.calls.length,
    ]).toEqual([1, 1, 1])
  })
})
