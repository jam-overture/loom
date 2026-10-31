import { describe, expect, it } from "vitest"

import type { AudienceId } from "../audience/audience.js"
import type { TreeId } from "../ids.js"
import type { JsonObject } from "../json.js"
import type { PrimitiveRole } from "../role.js"
import { nodeId, OTHER_TREE, primitiveType, region, TREE } from "../testing/reader-signal-contract.js"
import type { ElementNode, LoomNode } from "../tree/node.js"
import { TREE_SCHEMA_VERSION, type LoomTree } from "../tree/tree.js"

import {
  DEFAULT_REGION_FLOOR,
  meaningOfKindPaceSilence,
  meaningOfKindSilence,
  READING_WORDS_PER_MINUTE,
  treesIn,
  windowAssemblyOf,
  windowFiguresOf,
  type DeploymentReadingContext,
  type PartDeclarations,
  type ReaderTally,
  type ReaderWindow,
  type ReadingSilence,
  type StoredPageViews,
  type StoredRegionCount,
  type StoredTally,
} from "./index.js"

/**
 * Built on real windows and real contexts, because what is under test is a
 * composition and a fixture that short-circuits either side would not exercise
 * it. Every figure below is checked against the reading it delegates to, called
 * directly with the rows this says it is entitled to — so a test passes only
 * where the composition is the one a careful caller would have written.
 *
 * The arithmetic is in round numbers: at the published costing rate a word
 * takes **250 ms**, so a band of twenty words needs five seconds of one
 * reader's time.
 */

const MS_PER_WORD = 60_000 / READING_WORDS_PER_MINUTE

const words = (count: number): string => Array.from({ length: count }, () => "word").join(" ")

const element = (
  name: string,
  type: string,
  props: JsonObject = {},
  children: readonly LoomNode[] = []
): ElementNode => ({
  kind: "element",
  id: nodeId(name),
  type: primitiveType(type),
  props,
  children,
})

/** A page of two bands side by side, so a kind has two placements and neither nests. */
const PAGE = element("page", "loom.page", {}, [
  element("band", "loom.section", { body: words(20) }),
  element("cta", "loom.button", {}),
])

const treeOf = (treeId: TreeId, revision: number): LoomTree => ({
  treeId,
  schemaVersion: TREE_SCHEMA_VERSION,
  revision,
  root: PAGE,
})

const DECLARED: PartDeclarations = {
  copyFor: (type) => (type === "loom.section" ? ["body"] : undefined),
  typesWithRole: (role: PrimitiveRole) =>
    role === "heading" ? [primitiveType("loom.section")] : [],
}

const withForm = <Row>(row: Row, audienceId: AudienceId | undefined): Row =>
  audienceId === undefined ? row : { ...row, audienceId }

const tally = (
  where: { readonly treeId?: TreeId; readonly revision?: number },
  name: string,
  counters: Partial<ReaderTally> = {}
): StoredTally => {
  const row: Omit<StoredTally, "audienceId"> = {
    treeId: where.treeId ?? TREE,
    revision: where.revision ?? 1,
    nodeId: nodeId(name),
    type: primitiveType(name === "cta" ? "loom.button" : "loom.section"),
    views: 0,
    reached: 0,
    engaged: 0,
    dwellMs: 0,
    activations: 0,
    opens: 0,
    closes: 0,
    completions: 0,
    updatedAt: "2026-10-30T00:00:00.000Z",
    ...counters,
  }

  return withForm(row, undefined) as StoredTally
}

const door = (
  where: { readonly treeId?: TreeId; readonly revision?: number },
  opened: number
): StoredPageViews => {
  const row: Omit<StoredPageViews, "audienceId"> = {
    treeId: where.treeId ?? TREE,
    revision: where.revision ?? 1,
    opened,
    appearances: opened,
    updatedAt: "2026-10-30T00:00:00.000Z",
  }

  return withForm(row, undefined) as StoredPageViews
}

const bucket = (held: {
  readonly treeId?: TreeId
  readonly revision?: number
  readonly region?: string
  readonly views?: number
}): StoredRegionCount => {
  const row: Omit<StoredRegionCount, "audienceId"> = {
    treeId: held.treeId ?? TREE,
    revision: held.revision ?? 1,
    region: region(held.region ?? "FR"),
    views: held.views ?? 40,
    updatedAt: "2026-10-30T00:00:00.000Z",
  }

  return withForm(row, undefined) as StoredRegionCount
}

const windowOf = (held: Partial<ReaderWindow> = {}): ReaderWindow => ({
  tallies: [],
  funnels: [],
  pageViews: [],
  regions: undefined,
  ...held,
})

const TREES = treesIn([treeOf(TREE, 1), treeOf(TREE, 2), treeOf(OTHER_TREE, 1)])

const contextOf = (held: Partial<DeploymentReadingContext> = {}): DeploymentReadingContext => ({
  trees: TREES,
  declarations: DECLARED,
  floor: DEFAULT_REGION_FLOOR,
  placings: { placingFor: () => undefined },
  ...held,
})

/**
 * One page at two revisions and a second page at one, with readers who had
 * exactly the time the band's twenty words ask of them.
 */
const READ = {
  tallies: [
    tally({ revision: 1 }, "band", { views: 10, reached: 10, dwellMs: 10 * 20 * MS_PER_WORD }),
    tally({ revision: 2 }, "band", { views: 10, reached: 10, dwellMs: 10 * 20 * MS_PER_WORD }),
    tally({ treeId: OTHER_TREE }, "band", {
      views: 10,
      reached: 10,
      dwellMs: 10 * 20 * MS_PER_WORD,
    }),
  ],
  pageViews: [
    door({ revision: 1 }, 10),
    door({ revision: 2 }, 10),
    door({ treeId: OTHER_TREE }, 10),
  ],
}

const figuresOf = (
  held: Partial<ReaderWindow> = READ,
  context: DeploymentReadingContext = contextOf(),
  options?: Parameters<typeof windowFiguresOf>[3]
) => {
  const window = windowOf(held)
  const assembly = windowAssemblyOf(window, context)

  return {
    window,
    assembly,
    figures: windowFiguresOf(window, assembly, context, options),
  }
}

describe("the figures a window holds about itself", () => {
  it("reads the regions, the kinds' pace and the census off one call", () => {
    const { figures } = figuresOf({ ...READ, regions: [bucket({ views: 40 })] })

    expect(figures.regions?.map.regions.map((at) => at.region)).toEqual([region("FR")])
    expect(figures.regions?.regions).toHaveLength(1)
    expect(figures.pace.pages).toBe(3)
    expect(figures.census.readings).toBe(figures.silences.length)
  })

  it("adds no figure of its own, so every number is the reading's", () => {
    const { figures } = figuresOf()

    expect(Object.keys(figures).sort()).toEqual(["census", "pace", "regions", "silences"])
  })
})

describe("the regions a caller reaching past this would read wrongly", () => {
  it("is undefined where no store was offered, which is not a readership of nobody", () => {
    expect(figuresOf({ ...READ, regions: undefined }).figures.regions).toBeUndefined()
  })

  it("is a reading of no views where a store answered with nothing", () => {
    const { figures } = figuresOf({ ...READ, regions: [] })

    expect(figures.regions).not.toBeUndefined()
    expect(figures.regions?.map.views).toBe(0)
    expect(figures.regions?.regions).toEqual([])
  })

  it("reads the same readership the assembly's maps did, off the same rows at the same floor", () => {
    const { assembly, figures } = figuresOf({
      ...READ,
      regions: [bucket({ views: 40 }), bucket({ revision: 2, region: "DE", views: 30 })],
    })

    expect(figures.regions?.map).toEqual(assembly.readings.regions?.readership)
  })

  it("withholds under the deployment's floor rather than one typed at this call", () => {
    const held = { ...READ, regions: [bucket({ views: 40 })] }

    expect(figuresOf(held).figures.regions?.map.regions).toHaveLength(1)
    expect(figuresOf(held, contextOf({ floor: 100 })).figures.regions?.map.regions).toEqual([])
    expect(figuresOf(held, contextOf({ floor: 100 })).figures.regions?.map.withheld).toEqual({
      buckets: 1,
      views: 40,
    })
  })

  it("folds a bucket handed in twice rather than doubling it", () => {
    const once = bucket({ views: 40 })
    const { figures } = figuresOf({ ...READ, regions: [once, once] })

    expect(figures.regions?.map.views).toBe(40)
    expect(figures.regions?.regions[0]?.views).toBe(40)
  })

  it("does not let a doubled bucket clear a floor it should not have cleared", () => {
    const small = bucket({ views: 20 })
    const { figures } = figuresOf({ ...READ, regions: [small, small] }, contextOf({ floor: 30 }))

    expect(figures.regions?.map.regions).toEqual([])
    expect(figures.regions?.map.withheld).toEqual({ buckets: 1, views: 20 })
  })

  it("keeps a page's cells whole under a repeat, so the breakdown and the map agree", () => {
    const one = bucket({ views: 40 })
    const other = bucket({ treeId: OTHER_TREE, views: 40 })
    const { figures } = figuresOf({ ...READ, regions: [one, other, one, other] })

    const breakdown = figures.regions?.regions[0]

    expect(breakdown?.views).toBe(80)
    expect(breakdown?.pages.map((page) => page.views)).toEqual([40, 40])
  })
})

describe("the pace of a kind, over the readings a window holds", () => {
  it("counts every reading in the window and not one side of a library", () => {
    const { assembly, figures } = figuresOf()

    expect(figures.pace.pages).toBe(3)
    expect(figures.pace.trees).toBe(2)

    /**
     * The nearest line to hand, and what it would have cost: one page was
     * revised inside the window and the other cannot be placed, so each side
     * of the library holds one of the three readings and the third is on
     * neither.
     */
    expect(assembly.libraries.was.readings).toHaveLength(1)
    expect(assembly.libraries.now.readings).toHaveLength(1)
    expect(assembly.libraries.unplaced).toHaveLength(1)
  })

  it("cannot double-count a reading, because the assembly never holds one twice", () => {
    const { figures } = figuresOf()

    expect(figures.pace.duplicated).toBe(0)
  })

  it("carries a door row handed in twice as a repeat rather than adding it", () => {
    const twice = { ...READ, pageViews: [...READ.pageViews, door({ revision: 1 }, 10)] }

    expect(figuresOf(twice).figures.pace.duplicatedRows).toBe(1)
    expect(figuresOf(twice).figures.pace.byType).toEqual(figuresOf().figures.pace.byType)
  })

  it("applies the costing rate it was given", () => {
    const { figures } = figuresOf(READ, contextOf(), { wordsPerMinute: 120 })

    expect(figures.pace.wordsPerMinute).toBe(120)
    expect(figuresOf().figures.pace.wordsPerMinute).toBe(READING_WORDS_PER_MINUTE)
  })

  it("reads the band at the pace its words ask of the readers who met it", () => {
    const band = figuresOf().figures.pace.byType.find(
      (row) => row.kind.by === "type" && row.kind.type === primitiveType("loom.section")
    )

    expect(band?.pace).toBe(1)
    expect(band?.standing).toBe("paced")
    expect(band?.silence).toBeNull()
  })
})

describe("the census, over the readings somebody is looking at", () => {
  const ANSWERED: ReadingSilence = { meaning: null }

  it("is over the published list and nothing else", () => {
    const { figures } = figuresOf(READ, contextOf(), { silences: [ANSWERED, ANSWERED] })

    expect(figures.census.readings).toBe(figures.silences.length)
    expect(figures.silences.slice(0, 2)).toEqual([ANSWERED, ANSWERED])
  })

  it("is over the pace's own rows where the caller handed in none", () => {
    const { figures } = figuresOf()
    const rows = [...figures.pace.byType, ...figures.pace.byRole]

    expect(figures.silences).toHaveLength(rows.length)
    expect(figures.census.readings).toBe(rows.length)
  })

  it("maps each kind row through its own vocabulary", () => {
    const { figures } = figuresOf()

    expect(figures.pace.byType.map((row) => row.silence)).toEqual([null, "unread", "unread"])
    expect(figures.census.states.map((state) => state.vocabulary)).toEqual(["library-pace"])
    expect(figures.silences).toContainEqual({
      meaning: meaningOfKindPaceSilence("unread"),
      form: null,
    })
  })

  it("holds a role nothing plays, which is a reason a reading of the rows could not give", () => {
    const { figures } = figuresOf(
      READ,
      contextOf({ declarations: { copyFor: DECLARED.copyFor, typesWithRole: () => [] } })
    )

    expect(figures.pace.byRole.find((row) => row.kind.by === "role" && row.kind.role === "heading")?.silence).toBe("unplaced")
    expect(figures.silences).toContainEqual({
      meaning: meaningOfKindPaceSilence("unplaced"),
      form: null,
    })
    expect(
      figures.census.states.map((state) => state.condition)
    ).toContain("nothing-of-the-kind")
  })

  it("attributes a kind's silence to no page, because a kind is not a page", () => {
    const { figures } = figuresOf()

    expect(figures.census.byForm).toEqual([])
    expect(figures.census.wide.readings).toBe(figures.silences.length)
    expect(figures.census.states.every((state) => state.forms.length === 0)).toBe(true)
  })

  it("keeps the caller's vocabulary where both report one state", () => {
    const mine: ReadingSilence = { meaning: meaningOfKindSilence("unread") }
    const { figures } = figuresOf(READ, contextOf(), { silences: [mine] })

    const shared = figures.census.states.find(
      (state) => state.condition === "no-view-reported" && state.subject === "kind"
    )

    expect(shared?.vocabulary).toBe("library")
    expect(shared?.vocabularies).toEqual(["library", "library-pace"])
  })

  it("counts a reading that answered in the denominator and in no state", () => {
    const { figures } = figuresOf(READ, contextOf(), { silences: [ANSWERED] })

    expect(figures.census.readings).toBe(figures.silences.length)
    expect(figures.census.answered).toBeGreaterThan(0)
    expect(figures.census.silent + figures.census.answered).toBe(figures.census.readings)
  })

  it("folds one state reported by three rows into one state of three readings", () => {
    const { figures } = figuresOf()

    expect(figures.census.readings).toBe(5)
    expect(figures.census.silent).toBe(3)
    expect(figures.census.answered).toBe(2)
    expect(figures.census.states).toHaveLength(1)
    expect(figures.census.states[0]?.readings).toBe(3)
  })
})
