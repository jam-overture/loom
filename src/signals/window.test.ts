import { describe, expect, it, vi } from "vitest"

import { DEFAULT_AUDIENCE_ID, type AudienceId } from "../audience/audience.js"
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

import { formKeyOf, readingKeyOf, type PageForm } from "./audiences.js"
import { readingChangeOf } from "./change.js"
import { deploymentChangeOf } from "./deployment-change.js"
import { deploymentReadingOf } from "./deployment.js"
import { libraryChangeOf } from "./library-change.js"
import { libraryReachChangeOf, type LibraryWindow } from "./library-reach-change.js"
import { memoryReaderRegionStore, memoryReaderTallyStore } from "./memory.js"
import type { StoredPageViews } from "./page-views.js"
import type { PageReading, PartDeclarations } from "./parts.js"
import { readingProgressOf } from "./progress.js"
import { DEFAULT_REGION_FLOOR, UNKNOWN_REGION, type StoredRegionCount } from "./region.js"
import type { ReaderTally } from "./rollup.js"
import type { StoredFunnel, StoredTally, TallyReadRequest } from "./tally.js"
import {
  describeFormPlacing,
  describeUnjoinedCause,
  placingsIn,
  readReaderWindow,
  revisionsIn,
  treesIn,
  windowAssemblyOf,
  windowLibrariesOf,
  windowPairsOf,
  windowReadingsOf,
  FORM_PLACINGS,
  UNJOINED_CAUSES,
  type DeploymentReadingContext,
  type FormPlacing,
  type FormPlacings,
  type PlacedForm,
  type ReaderWindow,
  type ReaderWindowSources,
  type WindowReadingOptions,
  type WindowReadings,
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
  where: {
    readonly treeId?: TreeId
    readonly revision?: number
    readonly region?: string
    readonly views?: number
  },
  audienceId?: AudienceId
): StoredRegionCount => {
  const row: Omit<StoredRegionCount, "audienceId"> = {
    treeId: where.treeId ?? TREE,
    revision: where.revision ?? 1,
    region: region(where.region ?? "FR"),
    views: where.views ?? 120,
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

/**
 * The region half, which is the one reading this rung used to leave a caller to
 * assemble. The cases that matter are not the arithmetic — `region.test.ts`
 * holds that — they are the three the join is the only place to get wrong: that
 * the floor it was handed is the floor every map used, that a readership and
 * its split maps are the same rows read twice rather than two different sets of
 * rows, and that a bucket handed in twice is not added to itself (0158).
 */
describe("where a window's readers were", () => {
  const joined = (
    held: Partial<ReaderWindow>,
    options?: WindowReadingOptions
  ): WindowReadings =>
    windowReadingsOf(
      windowOf(held),
      treesIn([treeOf(TREE, 1), treeOf(TREE, 2), treeOf(OTHER_TREE, 1)]),
      DECLARED,
      options
    )

  it("says nothing at all where no region store was offered", () => {
    expect(joined({ tallies: [tally({}, "band")] }).regions).toBeUndefined()
  })

  it("reads a region store that holds nothing as a readership of no views", () => {
    const { regions } = joined({ regions: [] })

    expect(regions?.maps).toEqual([])
    expect(regions?.readership.views).toBe(0)
    expect(regions?.readership.regions).toEqual([])
  })

  it("joins one map per revision, per form", () => {
    const { regions } = joined({
      regions: [
        bucket({ revision: 1, region: "FR", views: 90 }, SKIERS),
        bucket({ revision: 1, region: "FR", views: 80 }, RIDERS),
        bucket({ revision: 2, region: "DE", views: 70 }, SKIERS),
      ],
    })

    expect(
      regions?.maps.map((map) => [map.revision, map.audienceId, map.reading.views])
    ).toEqual([
      [1, RIDERS, 80],
      [1, SKIERS, 90],
      [2, SKIERS, 70],
    ])
  })

  it("keys a map so it pairs with the page reading of the same form", () => {
    const { pages, regions } = joined({
      tallies: [tally({ revision: 1 }, "band", { views: 4 }, SKIERS)],
      regions: [bucket({ revision: 1, region: "FR", views: 90 }, SKIERS)],
    })

    const page = pages[0]
    const map = regions?.maps[0]

    expect(page && map && readingKeyOf(map) === readingKeyOf(page)).toBe(true)
  })

  it("counts the readers of a revision whose tree is gone, because a map needs none", () => {
    const { unjoined, regions } = joined({
      tallies: [tally({ revision: 9 }, "band")],
      regions: [bucket({ revision: 9, region: "FR", views: 90 })],
    })

    expect(unjoined.map((row) => [row.revision, row.cause])).toEqual([[9, "no-tree"]])
    expect(regions?.maps.map((map) => [map.revision, map.reading.views])).toEqual([[9, 90]])
    expect(regions?.readership.views).toBe(90)
  })

  it("floors at the default where the caller handed in none", () => {
    const { regions } = joined({ regions: [bucket({ region: "FR", views: 24 })] })

    expect(regions?.readership.floor).toBe(DEFAULT_REGION_FLOOR)
    expect(regions?.readership.regions).toEqual([])
    expect(regions?.readership.withheld).toEqual({ buckets: 1, views: 24 })
  })

  it("takes the floor it was handed through to the readership and to every map", () => {
    const { regions } = joined(
      { regions: [bucket({ region: "FR", views: 40 }, SKIERS)] },
      { floor: 50 }
    )

    expect(regions?.readership.floor).toBe(50)
    expect(regions?.maps[0]?.reading.floor).toBe(50)
    expect(regions?.maps[0]?.reading.regions).toEqual([])
    expect(regions?.readership.withheld.views).toBe(40)
  })

  it("names a country in the readership that both of its forms withhold", () => {
    const { regions } = joined({
      regions: [
        bucket({ region: "FR", views: 15 }, SKIERS),
        bucket({ region: "FR", views: 14 }, RIDERS),
      ],
    })

    expect(regions?.maps.map((map) => map.reading.regions)).toEqual([[], []])
    expect(regions?.readership.regions).toEqual([{ region: region("FR"), views: 29 }])
  })

  it("drops a bucket handed in twice rather than adding it to itself", () => {
    const rows = [
      bucket({ region: "FR", views: 90 }, SKIERS),
      bucket({ region: "DE", views: 60 }, SKIERS),
    ]

    const once = joined({ regions: rows })
    const twice = joined({ regions: [...rows, ...rows] })

    expect(twice.regions?.duplicated).toBe(2)
    expect(once.regions?.duplicated).toBe(0)
    expect(twice.regions?.readership).toEqual(once.regions?.readership)
    expect(twice.regions?.maps).toEqual(once.regions?.maps)
  })

  it("tells two forms' rows for one country apart from one row handed in twice", () => {
    const { regions } = joined({
      regions: [
        bucket({ region: "FR", views: 90 }, SKIERS),
        bucket({ region: "FR", views: 80 }, RIDERS),
      ],
    })

    expect(regions?.duplicated).toBe(0)
    expect(regions?.readership.views).toBe(170)
  })

  it("loses no view and counts none twice between the maps and the readership", () => {
    const rows = [
      bucket({ revision: 1, region: "FR", views: 90 }, SKIERS),
      bucket({ revision: 1, region: "DE", views: 12 }, SKIERS),
      bucket({ revision: 1, region: "FR", views: 80 }, RIDERS),
      bucket({ revision: 2, region: "unknown", views: 3 }, RIDERS),
      bucket({ treeId: OTHER_TREE, revision: 1, region: "GB", views: 44 }),
      bucket({ revision: 9, region: "ES", views: 31 }, SKIERS),
    ]

    const { regions } = joined({ regions: [...rows, ...rows] })
    const split = (regions?.maps ?? []).reduce((total, map) => total + map.reading.views, 0)

    expect(regions?.readership.views).toBe(260)
    expect(split).toBe(regions?.readership.views)
  })

  it("names no form where the rows named none, rather than calling it everyone", () => {
    const { regions } = joined({ regions: [bucket({ region: "FR", views: 90 })] })

    expect(regions?.maps[0]?.audienceId).toBeNull()
    expect(regions?.maps[0]?.reading.audienceId).toBeNull()
    expect(regions?.maps[0]?.reading.audiences).toEqual([])
  })

  it("says on each map which form it is of, and on the readership which it summed", () => {
    const { regions } = joined({
      regions: [
        bucket({ region: "FR", views: 90 }, SKIERS),
        bucket({ region: "FR", views: 80 }, RIDERS),
      ],
    })

    expect(regions?.maps.map((map) => map.reading.audiences)).toEqual([[RIDERS], [SKIERS]])
    expect(regions?.readership.audienceId).toBeNull()
    expect(regions?.readership.audiences).toEqual([RIDERS, SKIERS])
  })

  it("holds the maps in one order whatever order the rows arrived in", () => {
    const rows = [
      bucket({ revision: 2, region: "FR", views: 90 }, SKIERS),
      bucket({ revision: 1, region: "FR", views: 90 }, SKIERS),
      bucket({ revision: 1, region: "FR", views: 90 }),
      bucket({ treeId: OTHER_TREE, revision: 1, region: "FR", views: 90 }, SKIERS),
    ]

    const keys = (held: readonly StoredRegionCount[]): readonly string[] =>
      (joined({ regions: held }).regions?.maps ?? []).map(readingKeyOf)

    expect(keys(rows)).toEqual(keys([...rows].reverse()))
    expect(keys(rows)).toEqual([
      readingKeyOf({ treeId: TREE, revision: 1, audienceId: null }),
      readingKeyOf({ treeId: TREE, revision: 1, audienceId: SKIERS }),
      readingKeyOf({ treeId: TREE, revision: 2, audienceId: SKIERS }),
      readingKeyOf({ treeId: OTHER_TREE, revision: 1, audienceId: SKIERS }),
    ])
  })

  it("never withholds the unplaced bucket, however small it is", () => {
    const { regions } = joined({ regions: [bucket({ region: "unknown", views: 2 })] })

    expect(regions?.readership.regions).toEqual([{ region: UNKNOWN_REGION, views: 2 }])
    expect(regions?.readership.withheld).toEqual({ buckets: 0, views: 0 })
  })
})

/**
 * The second step of the rung. The cases that matter are not the sorting — they
 * are the four a caller writing this itself gets wrong: that a form published
 * three times in one window is one pair and not two, because the only consumer
 * drops a form it was handed two of; that two forms of one page are two pairs
 * and not one comparison across populations; that the latest revision handed in
 * twice does not pair with itself and report that nothing changed; and that
 * every pair this makes is one the comparison layer cannot refuse for a
 * mismatched side.
 */
describe("the pairs a window holds", () => {
  const PAIRED = treesIn([
    treeOf(TREE, 1, SIDE_BY_SIDE),
    treeOf(TREE, 2, SIDE_BY_SIDE),
    treeOf(TREE, 3, SIDE_BY_SIDE),
    treeOf(TREE, 9, SIDE_BY_SIDE),
    treeOf(TREE, 10, SIDE_BY_SIDE),
    treeOf(OTHER_TREE, 1, SIDE_BY_SIDE),
    treeOf(OTHER_TREE, 2, SIDE_BY_SIDE),
  ])

  const pairsIn = (held: Partial<ReaderWindow>) =>
    windowPairsOf(windowReadingsOf(windowOf(held), PAIRED, DECLARED).pages)

  /** Throws rather than asserting, so a fixture that changed shape says so here. */
  const at = (readings: readonly PageReading[], index: number): PageReading => {
    const reading = readings[index]

    if (reading === undefined) throw new Error(`the window held no reading at ${index}`)

    return reading
  }

  it("pairs a form's two revisions, earlier side first", () => {
    const { pairs, unpaired, duplicated } = pairsIn({
      tallies: [
        tally({ revision: 1 }, "band", { views: 10, reached: 10 }),
        tally({ revision: 2 }, "band", { views: 10, reached: 10 }),
      ],
    })

    expect(duplicated).toBe(0)
    expect(unpaired).toEqual([])
    expect(pairs).toHaveLength(1)
    expect([pairs[0]?.was.revision, pairs[0]?.now.revision]).toEqual([1, 2])
    expect(pairs[0]?.superseded).toEqual([])
  })

  it("takes the latest two of three revisions and names the one it left below them", () => {
    const { pairs } = pairsIn({
      tallies: [
        tally({ revision: 3 }, "band", { views: 10 }),
        tally({ revision: 1 }, "band", { views: 10 }),
        tally({ revision: 2 }, "band", { views: 10 }),
      ],
    })

    expect(pairs).toHaveLength(1)
    expect([pairs[0]?.was.revision, pairs[0]?.now.revision]).toEqual([2, 3])
    expect(pairs[0]?.superseded).toEqual([1])
  })

  /**
   * The reason the rule above is the latest pair rather than every consecutive
   * one: `deploymentChangeOf` gates a form handed two different revision pairs
   * as ambiguous and drops it, so a window with three revisions of a page would
   * take that page out of the order it is meant to rank.
   */
  it("hands the deployment order a form it can read, where every consecutive pair would not", () => {
    const rows = [
      tally({ revision: 1 }, "band", { views: 10, reached: 10 }),
      tally({ revision: 2 }, "band", { views: 10, reached: 6 }),
      tally({ revision: 3 }, "band", { views: 10, reached: 4 }),
    ]
    const { pages } = windowReadingsOf(windowOf({ tallies: rows }), PAIRED, DECLARED)
    const { pairs } = windowPairsOf(pages)

    const read = deploymentChangeOf(
      pairs.map(({ was, now }) => readingChangeOf(was, now)),
      []
    )

    expect(read.ambiguous).toEqual([])
    expect(read.duplicated).toBe(0)
    expect(read.compared).toBe(1)

    const everyPair = [
      readingChangeOf(at(pages, 0), at(pages, 1)),
      readingChangeOf(at(pages, 1), at(pages, 2)),
    ]

    expect(deploymentChangeOf(everyPair, []).ambiguous).toEqual([TREE])
    expect(deploymentChangeOf(everyPair, []).compared).toBe(0)
  })

  /** A revision is a number and not a label: as text, revision 10 sorts below 2. */
  it("orders revisions as numbers, so the tenth is later than the second", () => {
    const { pairs } = pairsIn({
      tallies: [
        tally({ revision: 2 }, "band", { views: 10 }),
        tally({ revision: 10 }, "band", { views: 10 }),
        tally({ revision: 9 }, "band", { views: 10 }),
      ],
    })

    expect(pairs).toHaveLength(1)
    expect([pairs[0]?.was.revision, pairs[0]?.now.revision]).toEqual([9, 10])
    expect(pairs[0]?.superseded).toEqual([2])
  })

  it("makes one pair per form, so two forms of one page are two before-and-afters", () => {
    const { pairs, unpaired } = pairsIn({
      tallies: [
        tally({ revision: 1 }, "band", { views: 10 }, SKIERS),
        tally({ revision: 2 }, "band", { views: 10 }, SKIERS),
        tally({ revision: 1 }, "band", { views: 10 }, RIDERS),
        tally({ revision: 2 }, "band", { views: 10 }, RIDERS),
      ],
    })

    expect(unpaired).toEqual([])
    expect(pairs.map((pair) => pair.audienceId)).toEqual([RIDERS, SKIERS])
    expect(pairs.every((pair) => pair.was.audienceId === pair.now.audienceId)).toBe(true)
    expect(new Set(pairs.map(formKeyOf)).size).toBe(2)
  })

  it("reports a form it holds one revision of rather than dropping the page", () => {
    const { pairs, unpaired } = pairsIn({
      tallies: [
        tally({ revision: 1 }, "band", { views: 10 }),
        tally({ revision: 2 }, "band", { views: 10 }),
        tally({ treeId: OTHER_TREE, revision: 1 }, "band", { views: 10 }),
      ],
    })

    expect(pairs.map((pair) => pair.treeId)).toEqual([TREE])
    expect(unpaired.map((form) => [form.treeId, form.reading.revision])).toEqual([[OTHER_TREE, 1]])
  })

  /**
   * The pair spanning the 0284 upgrade is not made, and both of its sides are
   * named. `crossesAudiences` allows that pair — it is unprovable rather than
   * proven two populations — and allowing it is not the same as asserting it,
   * so the caller that knows its own history makes it in one call.
   */
  it("does not pair a form that names no audience with one that does, and says so", () => {
    const window = windowOf({
      tallies: [
        tally({ revision: 1 }, "band", { views: 10, reached: 10 }),
        tally({ revision: 2 }, "band", { views: 10, reached: 4 }, SKIERS),
      ],
    })
    const { pages } = windowReadingsOf(window, PAIRED, DECLARED)
    const { pairs, unpaired } = windowPairsOf(pages)

    expect(pairs).toEqual([])
    expect(unpaired.map((form) => [form.audienceId, form.reading.revision])).toEqual([
      [null, 1],
      [SKIERS, 2],
    ])

    const sides = unpaired.map((form) => form.reading)
    const byHand = readingChangeOf(at(sides, 0), at(sides, 1))

    expect(byHand.silence).not.toBe("different-audiences")
    expect(byHand.audiences).toEqual({ was: null, now: SKIERS })
  })

  /**
   * The double-count case. A caller that concatenated two reads of one window
   * holds the latest revision twice, and pairing it with itself would publish
   * *nothing changed* about a change that was made.
   */
  it("drops a reading handed in twice rather than pairing a revision with itself", () => {
    const { pages } = windowReadingsOf(
      windowOf({
        tallies: [
          tally({ revision: 1 }, "band", { views: 10, reached: 10 }),
          tally({ revision: 2 }, "band", { views: 10, reached: 4 }),
        ],
      }),
      PAIRED,
      DECLARED
    )

    const { pairs, duplicated } = windowPairsOf([...pages, ...pages])

    expect(duplicated).toBe(2)
    expect(pairs).toHaveLength(1)
    expect([pairs[0]?.was.revision, pairs[0]?.now.revision]).toEqual([1, 2])
    expect(windowPairsOf([at(pages, 1), at(pages, 1)]).pairs).toEqual([])
  })

  it("keeps the first of two readings of one key, so the answer does not depend on row order", () => {
    const { pages } = windowReadingsOf(
      windowOf({ tallies: [tally({ revision: 1 }, "band", { views: 10 })] }),
      PAIRED,
      DECLARED
    )
    const other = { ...at(pages, 0), views: 99 }

    expect(windowPairsOf([at(pages, 0), other]).unpaired[0]?.reading.views).toBe(10)
    expect(windowPairsOf([other, at(pages, 0)]).unpaired[0]?.reading.views).toBe(99)
  })

  /**
   * The division this rung is for: of the four states `readingChangeOf`
   * refuses, three are about the two sides and one is about the readers. A pair
   * made here cannot be in the first three, so a silence off this path is a
   * silence about a deployment's readers.
   */
  it("makes no pair the comparison layer can refuse for a mismatched side", () => {
    const { pages } = windowReadingsOf(
      windowOf({
        tallies: [
          tally({ revision: 1 }, "band", { views: 10 }, SKIERS),
          tally({ revision: 2 }, "band", { views: 10 }, SKIERS),
          tally({ revision: 1 }, "band", { views: 10 }, RIDERS),
          tally({ revision: 2 }, "band", { views: 10 }, RIDERS),
          tally({ treeId: OTHER_TREE, revision: 1 }, "band", { views: 10 }),
          tally({ treeId: OTHER_TREE, revision: 2 }, "band", { views: 10 }),
        ],
      }),
      PAIRED,
      DECLARED
    )
    const { pairs } = windowPairsOf(pages)

    expect(pairs).toHaveLength(3)
    expect(
      pairs
        .map(({ was, now }) => readingChangeOf(was, now).silence)
        .filter(
          (silence) =>
            silence === "different-trees" ||
            silence === "different-audiences" ||
            silence === "audiences-mixed"
        )
    ).toEqual([])
  })

  it("holds the pairs and the unpaired in one order whatever order the readings arrived in", () => {
    const { pages } = windowReadingsOf(
      windowOf({
        tallies: [
          tally({ revision: 1 }, "band", { views: 10 }, SKIERS),
          tally({ revision: 2 }, "band", { views: 10 }, SKIERS),
          tally({ revision: 1 }, "band", { views: 10 }, RIDERS),
          tally({ revision: 2 }, "band", { views: 10 }, RIDERS),
          tally({ treeId: OTHER_TREE, revision: 1 }, "band", { views: 10 }, SKIERS),
          tally({ treeId: OTHER_TREE, revision: 1 }, "band", { views: 10 }, RIDERS),
        ],
      }),
      PAIRED,
      DECLARED
    )

    const forwards = windowPairsOf(pages)
    const backwards = windowPairsOf([...pages].reverse())

    expect(forwards.pairs.map(formKeyOf)).toEqual([
      formKeyOf({ treeId: TREE, audienceId: RIDERS }),
      formKeyOf({ treeId: TREE, audienceId: SKIERS }),
    ])
    expect(forwards.unpaired.map(formKeyOf)).toEqual([
      formKeyOf({ treeId: OTHER_TREE, audienceId: RIDERS }),
      formKeyOf({ treeId: OTHER_TREE, audienceId: SKIERS }),
    ])
    expect(backwards.pairs.map(formKeyOf)).toEqual(forwards.pairs.map(formKeyOf))
    expect(backwards.unpaired.map(formKeyOf)).toEqual(forwards.unpaired.map(formKeyOf))
  })

  it("reads a deployment's change order out of one store end to end", async () => {
    const tallies = memoryReaderTallyStore()
    const at = "2026-10-27T09:00:00.000Z"

    await tallies.apply(
      {
        tallies: [
          tally({ revision: 1 }, "band", { views: 10, reached: 10 }),
          tally({ revision: 1 }, "cta", { views: 10, reached: 9 }),
          tally({ revision: 2 }, "band", { views: 10, reached: 10 }),
          tally({ revision: 2 }, "cta", { views: 10, reached: 2 }),
        ],
        funnels: [],
        appearances: [
          { treeId: TREE, revision: 1, views: 10 },
          { treeId: TREE, revision: 2, views: 10 },
        ],
      },
      at
    )
    await tallies.opened([{ treeId: TREE, revision: 2, views: 10 }], at)

    const read = await readReaderWindow({ tallies })
    if (!read.ok) throw new Error("the window was not read")

    const { pages } = windowReadingsOf(read.value, PAIRED, DECLARED)
    const { pairs } = windowPairsOf(pages)
    const order = deploymentChangeOf(
      pairs.map(({ was, now }) => readingChangeOf(was, now)),
      read.value.pageViews
    )

    expect(pairs).toHaveLength(1)
    expect(order.compared).toBe(1)
    expect(order.ambiguous).toEqual([])
    expect(order.duplicated).toBe(0)
    expect(order.arrivals).toBe(10)
    expect(order.standings.ranked).toBe(1)
    expect(order.worst?.treeId).toBe(TREE)
    expect(order.worst?.worsened?.at.before).toBe(nodeId("cta"))
  })
})

describe("the two libraries a window holds", () => {
  const LIBRARY = treesIn([
    treeOf(TREE, 1, SIDE_BY_SIDE),
    treeOf(TREE, 2, SIDE_BY_SIDE),
    treeOf(OTHER_TREE, 1, SIDE_BY_SIDE),
    treeOf(OTHER_TREE, 2, SIDE_BY_SIDE),
  ])

  const heldIn = (window: ReaderWindow) =>
    windowPairsOf(windowReadingsOf(window, LIBRARY, DECLARED).pages)

  const placedAs = (placing: FormPlacing, ...forms: readonly PageForm[]) =>
    placingsIn(forms.map((form) => ({ ...form, placing })))

  /** Nothing this deployment can say, which is the source a caller with no history has. */
  const PLACES_NOTHING: FormPlacings = { placingFor: () => undefined }

  const revisionsOn = (side: LibraryWindow): readonly number[] =>
    side.readings.map((reading) => reading.revision)

  const treesOn = (side: LibraryWindow): readonly TreeId[] =>
    side.readings.map((reading) => reading.treeId)

  it("puts a paired form's earlier revision on one side and its later one on the other", () => {
    const held = heldIn(
      windowOf({
        tallies: [
          tally({ revision: 1 }, "band", { views: 10, reached: 10 }),
          tally({ revision: 2 }, "band", { views: 10, reached: 4 }),
        ],
      })
    )

    const { was, now, unplaced, duplicated } = windowLibrariesOf(held, [], PLACES_NOTHING)

    expect(duplicated).toBe(0)
    expect(unplaced).toEqual([])
    expect(revisionsOn(was)).toEqual([1])
    expect(revisionsOn(now)).toEqual([2])
  })

  it("asks nothing about a paired form, so a placing for one is never read", () => {
    const held = heldIn(
      windowOf({
        tallies: [
          tally({ revision: 1 }, "band", { views: 10 }),
          tally({ revision: 2 }, "band", { views: 10 }),
        ],
      })
    )
    const placingFor = vi.fn(() => undefined)

    windowLibrariesOf(held, [], { placingFor })

    expect(placingFor).not.toHaveBeenCalled()
  })

  it("puts a form the deployment says it published inside the window on the later side only", () => {
    const held = heldIn(
      windowOf({ tallies: [tally({ treeId: OTHER_TREE, revision: 1 }, "band", { views: 10 })] })
    )

    const { was, now, unplaced } = windowLibrariesOf(
      held,
      [],
      placedAs("published", { treeId: OTHER_TREE, audienceId: null })
    )

    expect(unplaced).toEqual([])
    expect(treesOn(was)).toEqual([])
    expect(treesOn(now)).toEqual([OTHER_TREE])
  })

  it("puts a form the deployment says it withdrew on the earlier side only", () => {
    const held = heldIn(
      windowOf({ tallies: [tally({ treeId: OTHER_TREE, revision: 1 }, "band", { views: 10 })] })
    )

    const { was, now } = windowLibrariesOf(
      held,
      [],
      placedAs("withdrawn", { treeId: OTHER_TREE, audienceId: null })
    )

    expect(treesOn(was)).toEqual([OTHER_TREE])
    expect(treesOn(now)).toEqual([])
  })

  it("puts a form the deployment says it never changed on both sides, at the one revision there is", () => {
    const held = heldIn(
      windowOf({ tallies: [tally({ treeId: OTHER_TREE, revision: 1 }, "band", { views: 10 })] })
    )

    const { was, now } = windowLibrariesOf(
      held,
      [],
      placedAs("unchanged", { treeId: OTHER_TREE, audienceId: null })
    )

    expect(revisionsOn(was)).toEqual([1])
    expect(revisionsOn(now)).toEqual([1])
    expect(was.readings[0]).toBe(now.readings[0])
  })

  /**
   * Both guesses are assertions — the later side says a page nobody touched
   * was published, and both sides say a page published this week was always
   * there — so the form is named and on neither.
   */
  it("names a form nobody could place rather than putting it on a side", () => {
    const held = heldIn(
      windowOf({
        tallies: [
          tally({ revision: 1 }, "band", { views: 10 }),
          tally({ revision: 2 }, "band", { views: 10 }),
          tally({ treeId: OTHER_TREE, revision: 1 }, "band", { views: 10 }),
        ],
      })
    )

    const { was, now, unplaced } = windowLibrariesOf(held, [], PLACES_NOTHING)

    expect(unplaced.map((form) => [form.treeId, form.reading.revision])).toEqual([
      [OTHER_TREE, 1],
    ])
    expect(treesOn(was)).toEqual([TREE])
    expect(treesOn(now)).toEqual([TREE])
  })

  /**
   * The whole of why this step exists. The one-line composition over the pairs
   * alone type-checks, runs, and reports nought pages gained on a deployment
   * that published a page this week — because a page published inside the
   * window has one revision in it and is therefore unpaired.
   */
  it("counts a page published inside the window as a page gained, where the pairs alone report nought", () => {
    const held = heldIn(
      windowOf({
        tallies: [
          tally({ revision: 1 }, "band", { views: 10, reached: 10 }),
          tally({ revision: 2 }, "band", { views: 10, reached: 4 }),
          tally({ treeId: OTHER_TREE, revision: 1 }, "band", { views: 10, reached: 5 }),
        ],
      })
    )

    const { was, now } = windowLibrariesOf(
      held,
      [],
      placedAs("published", { treeId: OTHER_TREE, audienceId: null })
    )

    const read = libraryChangeOf(was.readings, now.readings)

    expect(read.pages).toBe(1)
    expect(read.pagesGained).toBe(1)
    expect(read.pagesLost).toBe(0)
    expect(read.republished).toBe(1)

    const overThePairs = libraryChangeOf(
      held.pairs.map((pair) => pair.was),
      held.pairs.map((pair) => pair.now)
    )

    expect(overThePairs.pagesGained).toBe(0)
  })

  it("counts a page withdrawn inside the window as a page lost", () => {
    const held = heldIn(
      windowOf({
        tallies: [
          tally({ revision: 1 }, "band", { views: 10 }),
          tally({ revision: 2 }, "band", { views: 10 }),
          tally({ treeId: OTHER_TREE, revision: 1 }, "band", { views: 10 }),
        ],
      })
    )

    const { was, now } = windowLibrariesOf(
      held,
      [],
      placedAs("withdrawn", { treeId: OTHER_TREE, audienceId: null })
    )
    const read = libraryChangeOf(was.readings, now.readings)

    expect(read.pagesLost).toBe(1)
    expect(read.pagesGained).toBe(0)
    expect(read.pages).toBe(1)
  })

  /**
   * The double-count case for a form on both sides: one reading carried twice
   * has to be **one** page in the comparison and no movement at all, or a
   * library of fifty pages where two changed would report every unchanged page
   * as a page both gained and lost, and its views twice over.
   */
  it("counts an unchanged form once, with no movement and no view counted twice", () => {
    const held = heldIn(
      windowOf({
        tallies: [tally({ treeId: OTHER_TREE, revision: 1 }, "band", { views: 10, reached: 6 })],
      })
    )

    const { was, now } = windowLibrariesOf(
      held,
      [],
      placedAs("unchanged", { treeId: OTHER_TREE, audienceId: null })
    )
    const read = libraryChangeOf(was.readings, now.readings)

    expect(read.pages).toBe(1)
    expect(read.pagesGained).toBe(0)
    expect(read.pagesLost).toBe(0)
    expect(read.republished).toBe(0)
    expect(read.gained).toBe(0)
    expect(read.lost).toBe(0)
    expect(read.viewsWas).toBe(10)
    expect(read.viewsNow).toBe(10)
    expect(read.viewsNow).toBe(read.viewsWas)
  })

  /**
   * The other double-count case, which is a caller's `WindowPairs` rather than
   * one this module made: two readings of one form on one side are `ambiguous`
   * to `pairedWindowOf`, which takes the page out of every figure in the
   * comparison while the totals go on looking right (0158).
   */
  it("drops a form named in both lists rather than gating the page out of the comparison", () => {
    const held = heldIn(
      windowOf({
        tallies: [
          tally({ revision: 1 }, "band", { views: 10, reached: 10 }),
          tally({ revision: 2 }, "band", { views: 10, reached: 4 }),
        ],
      })
    )
    const pair = held.pairs[0]

    if (pair === undefined) throw new Error("the window held no pair")

    const { was, now, duplicated } = windowLibrariesOf(
      { ...held, unpaired: [{ ...pair, reading: pair.now }] },
      [],
      placedAs("published", { treeId: TREE, audienceId: null })
    )

    expect(duplicated).toBe(1)
    expect(revisionsOn(was)).toEqual([1])
    expect(revisionsOn(now)).toEqual([2])

    const read = libraryChangeOf(was.readings, now.readings)

    expect(read.ambiguous).toEqual([])
    expect(read.pages).toBe(1)
  })

  /**
   * A page can be published in a second form while its first form stands
   * unchanged, which is what `formsGained` is for (0295) — so a placing is per
   * form and not per page.
   */
  it("places two forms of one page apart, so a second form begun is not a page published", () => {
    const held = heldIn(
      windowOf({
        tallies: [
          tally({ revision: 1 }, "band", { views: 10 }, SKIERS),
          tally({ revision: 1 }, "band", { views: 10 }, RIDERS),
        ],
      })
    )

    const { was, now, unplaced } = windowLibrariesOf(
      held,
      [],
      placingsIn([
        { treeId: TREE, audienceId: SKIERS, placing: "unchanged" },
        { treeId: TREE, audienceId: RIDERS, placing: "published" },
      ])
    )
    const read = libraryChangeOf(was.readings, now.readings)

    expect(unplaced).toEqual([])
    expect(read.pagesGained).toBe(1)
    expect(read.formsGained).toBe(1)
    expect(read.pages).toBe(1)
  })

  it("keeps the first placing of a form, so the answer does not depend on the history's order", () => {
    const forms: readonly PlacedForm[] = [
      { treeId: TREE, audienceId: null, placing: "published" },
      { treeId: TREE, audienceId: null, placing: "withdrawn" },
    ]

    expect(placingsIn(forms).placingFor({ treeId: TREE, audienceId: null })).toBe("published")
    expect(
      placingsIn([...forms].reverse()).placingFor({ treeId: TREE, audienceId: null })
    ).toBe("withdrawn")
    expect(placingsIn(forms).placingFor({ treeId: OTHER_TREE, audienceId: null })).toBeUndefined()
  })

  /**
   * A side is filled with the pairs and then with the forms a placing put
   * there, which is not the order a form belongs in. The fixture therefore
   * pairs the page that sorts **second** and places the one that sorts first,
   * so a side left in the order it was filled is a different list rather than
   * the same one (0231).
   */
  it("holds each side in the published form order rather than in the order it filled them", () => {
    const held = heldIn(
      windowOf({
        tallies: [
          tally({ treeId: OTHER_TREE, revision: 1 }, "band", { views: 10 }),
          tally({ treeId: OTHER_TREE, revision: 2 }, "band", { views: 10 }),
          tally({ revision: 1 }, "band", { views: 10 }),
        ],
      })
    )

    const { was, now } = windowLibrariesOf(
      held,
      [],
      placedAs("unchanged", { treeId: TREE, audienceId: null })
    )

    expect(treesOn(was)).toEqual([TREE, OTHER_TREE])
    expect(treesOn(now)).toEqual([TREE, OTHER_TREE])
  })

  it("holds each side in one order whatever order the forms arrived in", () => {
    const held = heldIn(
      windowOf({
        tallies: [
          tally({ revision: 1 }, "band", { views: 10 }, SKIERS),
          tally({ revision: 2 }, "band", { views: 10 }, SKIERS),
          tally({ revision: 1 }, "band", { views: 10 }, RIDERS),
          tally({ revision: 2 }, "band", { views: 10 }, RIDERS),
          tally({ treeId: OTHER_TREE, revision: 1 }, "band", { views: 10 }, SKIERS),
          tally({ treeId: OTHER_TREE, revision: 1 }, "band", { views: 10 }, RIDERS),
        ],
      })
    )
    const placings = placedAs(
      "unchanged",
      { treeId: OTHER_TREE, audienceId: SKIERS },
      { treeId: OTHER_TREE, audienceId: RIDERS }
    )
    const formsOn = (side: LibraryWindow) => side.readings.map((reading) => formKeyOf(reading))

    const forwards = windowLibrariesOf(held, [], placings)
    const backwards = windowLibrariesOf(
      {
        ...held,
        pairs: [...held.pairs].reverse(),
        unpaired: [...held.unpaired].reverse(),
      },
      [],
      placings
    )

    expect(formsOn(forwards.now)).toEqual([
      formKeyOf({ treeId: TREE, audienceId: RIDERS }),
      formKeyOf({ treeId: TREE, audienceId: SKIERS }),
      formKeyOf({ treeId: OTHER_TREE, audienceId: RIDERS }),
      formKeyOf({ treeId: OTHER_TREE, audienceId: SKIERS }),
    ])
    expect(formsOn(backwards.now)).toEqual(formsOn(forwards.now))
    expect(formsOn(backwards.was)).toEqual(formsOn(forwards.was))
  })

  it("names the forms it could not place in one order whatever order they arrived in", () => {
    const held = heldIn(
      windowOf({
        tallies: [
          tally({ treeId: OTHER_TREE, revision: 1 }, "band", { views: 10 }),
          tally({ revision: 1 }, "band", { views: 10 }),
        ],
      })
    )

    const backwards = windowLibrariesOf(
      { ...held, unpaired: [...held.unpaired].reverse() },
      [],
      PLACES_NOTHING
    )

    expect(held.unpaired.map((form) => form.treeId)).toEqual([TREE, OTHER_TREE])
    expect(backwards.unplaced.map((form) => form.treeId)).toEqual([TREE, OTHER_TREE])
  })

  /**
   * The door rows are the window's own on both sides, not a slice: each page's
   * row is picked out by `pageViewsFor` on the revision the reading names, and
   * the two sides name different revisions.
   */
  it("hands the reach comparison one window of door rows that answers both sides", () => {
    const window = windowOf({
      tallies: [
        tally({ revision: 1 }, "band", { views: 10, reached: 10 }),
        tally({ revision: 2 }, "band", { views: 20, reached: 8 }),
      ],
      pageViews: [door({ revision: 1 }, 10), door({ revision: 2 }, 20)],
    })

    const { was, now } = windowLibrariesOf(heldIn(window), window.pageViews, PLACES_NOTHING)
    const read = libraryReachChangeOf(was, now)

    expect(was.rows).toBe(now.rows)
    expect(read.pages).toBe(1)
    expect(read.arrivalsWas).toBe(10)
    expect(read.arrivalsNow).toBe(20)
    expect(read.unscaled).toEqual([])
  })

  it("says one line per placing, and the set is closed", () => {
    expect(FORM_PLACINGS).toEqual(["published", "withdrawn", "unchanged"])
    expect(new Set(FORM_PLACINGS.map(describeFormPlacing)).size).toBe(FORM_PLACINGS.length)
    expect(describeFormPlacing("published")).toContain("later library")
    expect(describeFormPlacing("withdrawn")).toContain("earlier library")
    expect(describeFormPlacing("unchanged")).toContain("both")
  })

  it("reads both libraries out of one store end to end", async () => {
    const tallies = memoryReaderTallyStore()
    const at = "2026-10-27T09:00:00.000Z"

    await tallies.apply(
      {
        tallies: [
          tally({ revision: 1 }, "band", { views: 10, reached: 10 }),
          tally({ revision: 2 }, "band", { views: 10, reached: 4 }),
          tally({ treeId: OTHER_TREE, revision: 1 }, "band", { views: 10, reached: 7 }),
        ],
        funnels: [],
        appearances: [
          { treeId: TREE, revision: 1, views: 10 },
          { treeId: TREE, revision: 2, views: 10 },
          { treeId: OTHER_TREE, revision: 1, views: 10 },
        ],
      },
      at
    )

    const read = await readReaderWindow({ tallies })
    if (!read.ok) throw new Error("the window was not read")

    const { pages } = windowReadingsOf(read.value, LIBRARY, DECLARED)
    const { was, now, unplaced } = windowLibrariesOf(
      windowPairsOf(pages),
      read.value.pageViews,
      placedAs("published", { treeId: OTHER_TREE, audienceId: DEFAULT_AUDIENCE_ID })
    )
    const change = libraryChangeOf(was.readings, now.readings)

    expect(unplaced).toEqual([])
    expect(change.pages).toBe(1)
    expect(change.pagesGained).toBe(1)
    expect(change.republished).toBe(1)
    expect(change.audiences).toEqual({
      was: [DEFAULT_AUDIENCE_ID],
      now: [DEFAULT_AUDIENCE_ID],
    })
  })
})

describe("a window assembled for the deployment that holds it", () => {
  const ASSEMBLED = treesIn([
    treeOf(TREE, 1, SIDE_BY_SIDE),
    treeOf(TREE, 2, SIDE_BY_SIDE),
    treeOf(OTHER_TREE, 1, SIDE_BY_SIDE),
  ])

  /** A deployment that holds its trees and its registry and can place nothing. */
  const contextOf = (held: Partial<DeploymentReadingContext> = {}): DeploymentReadingContext => ({
    trees: ASSEMBLED,
    declarations: DECLARED,
    floor: DEFAULT_REGION_FLOOR,
    placings: { placingFor: () => undefined },
    ...held,
  })

  const CHANGED = {
    tallies: [
      tally({ revision: 1 }, "band", { views: 10, reached: 10 }),
      tally({ revision: 2 }, "band", { views: 10, reached: 4 }),
    ],
    pageViews: [door({ revision: 1 }, 10), door({ revision: 2 }, 10)],
  }

  it("reads the pages, the pairs and the two libraries off one call", () => {
    const { readings, pairs, libraries } = windowAssemblyOf(windowOf(CHANGED), contextOf())

    expect(readings.pages.map((page) => page.revision)).toEqual([1, 2])
    expect(readings.unjoined).toEqual([])
    expect(pairs.pairs).toHaveLength(1)
    expect(pairs.unpaired).toEqual([])
    expect(libraries.was.readings.map((page) => page.revision)).toEqual([1])
    expect(libraries.now.readings.map((page) => page.revision)).toEqual([2])
    expect(libraries.unplaced).toEqual([])
  })

  it("hands the deployment's floor to the regions, so a bucket under it is withheld", () => {
    const held = windowOf({ ...CHANGED, regions: [bucket({ revision: 1, views: 40 })] })

    const atDefault = windowAssemblyOf(held, contextOf()).readings.regions
    const raised = windowAssemblyOf(held, contextOf({ floor: 100 })).readings.regions

    expect(atDefault?.readership.regions).toEqual([{ region: region("FR"), views: 40 }])
    expect(atDefault?.readership.floor).toBe(DEFAULT_REGION_FLOOR)
    expect(raised?.readership.regions).toEqual([])
    expect(raised?.readership.withheld).toEqual({ buckets: 1, views: 40 })
    expect(raised?.readership.views).toBe(40)
  })

  it("will not take a context with no floor, because the type is the enforcement", () => {
    const { trees, declarations, placings } = contextOf()

    expect(() =>
      // @ts-expect-error — an absent floor is the smallest bucket the runtime names, so it is not optional
      windowAssemblyOf(windowOf(CHANGED), { trees, declarations, placings })
    ).not.toThrow()
  })

  it("keeps an absent region store absent, rather than reading it as a readership of nobody", () => {
    const { readings } = windowAssemblyOf(windowOf(CHANGED), contextOf())

    expect(readings.regions).toBeUndefined()
    expect(windowAssemblyOf(windowOf({ ...CHANGED, regions: [] }), contextOf()).readings.regions)
      .toEqual({ maps: [], readership: expect.objectContaining({ views: 0 }), duplicated: 0 })
  })

  it("carries a form published inside the window onto the later library, which the pairs alone drop", () => {
    const held = windowOf({
      ...CHANGED,
      tallies: [...CHANGED.tallies, tally({ treeId: OTHER_TREE, revision: 1 }, "band", { views: 10 })],
      pageViews: [...CHANGED.pageViews, door({ treeId: OTHER_TREE, revision: 1 }, 10)],
    })

    const { pairs, libraries } = windowAssemblyOf(
      held,
      contextOf({
        placings: placingsIn([
          { treeId: OTHER_TREE, audienceId: null, placing: "published" },
        ]),
      })
    )

    expect(libraryChangeOf(libraries.was.readings, libraries.now.readings).pagesGained).toBe(1)
    /** The one-line composition over the pairs alone, which is the hazard this step exists for. */
    expect(
      libraryChangeOf(
        pairs.pairs.map(({ was }) => was),
        pairs.pairs.map(({ now }) => now)
      ).pagesGained
    ).toBe(0)
  })

  it("gives both libraries the window's whole set of door rows, so a reach comparison reads", () => {
    const held = windowOf(CHANGED)

    const { libraries } = windowAssemblyOf(held, contextOf())
    const reach = libraryReachChangeOf(libraries.was, libraries.now)

    expect(libraries.was.rows).toEqual(held.pageViews)
    expect(libraries.now.rows).toEqual(held.pageViews)
    expect(reach.arrivalsWas).toBe(10)
    expect(reach.arrivalsNow).toBe(10)
  })

  it("cannot repeat a reading or a form, however many revisions and forms the window holds", () => {
    const held = windowOf({
      tallies: [
        tally({ revision: 1 }, "band", { views: 10 }, SKIERS),
        tally({ revision: 2 }, "band", { views: 10 }, SKIERS),
        tally({ revision: 1 }, "band", { views: 10 }, RIDERS),
        tally({ revision: 2 }, "band", { views: 10 }, RIDERS),
        tally({ treeId: OTHER_TREE, revision: 1 }, "band", { views: 10 }),
      ],
    })

    const { pairs, libraries } = windowAssemblyOf(
      held,
      contextOf({
        placings: placingsIn([
          { treeId: OTHER_TREE, audienceId: null, placing: "unchanged" },
        ]),
      })
    )

    expect(pairs.duplicated).toBe(0)
    expect(libraries.duplicated).toBe(0)
    expect(libraries.was.readings.map(formKeyOf)).toEqual([
      ...new Set(libraries.was.readings.map(formKeyOf)),
    ])
    expect(libraries.now.readings.map(formKeyOf)).toEqual([
      ...new Set(libraries.now.readings.map(formKeyOf)),
    ])
  })

  it("counts a repeated region bucket once and says so, without touching the other two counts", () => {
    const twice = bucket({ revision: 1, views: 40 })

    const { readings, pairs, libraries } = windowAssemblyOf(
      windowOf({ ...CHANGED, regions: [twice, twice] }),
      contextOf()
    )

    expect(readings.regions?.duplicated).toBe(1)
    expect(readings.regions?.readership.views).toBe(40)
    expect(pairs.duplicated).toBe(0)
    expect(libraries.duplicated).toBe(0)
  })

  it("answers the same way however often it is asked, because it holds nothing", () => {
    const held = windowOf({ ...CHANGED, regions: [bucket({ revision: 1, views: 40 })] })
    const context = contextOf()

    expect(windowAssemblyOf(held, context)).toEqual(windowAssemblyOf(held, context))
  })

  it("reports a revision whose tree is gone as unjoined and still counts its readers", () => {
    const held = windowOf({
      tallies: [tally({ revision: 9 }, "band", { views: 10 })],
      regions: [bucket({ revision: 9, views: 40 })],
    })

    const { readings } = windowAssemblyOf(held, contextOf())

    expect(readings.pages).toEqual([])
    expect(readings.unjoined.map(({ cause }) => cause)).toEqual(["no-tree"])
    expect(readings.regions?.readership.views).toBe(40)
  })
})
