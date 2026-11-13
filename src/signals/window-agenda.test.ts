import { describe, expect, it } from "vitest"

import type { AudienceId } from "../audience/audience.js"
import type { TreeId } from "../ids.js"
import type { JsonObject } from "../json.js"
import { nodeId, OTHER_TREE, primitiveType, RIDERS, SKIERS, TREE } from "../testing/reader-signal-contract.js"
import type { ElementNode, LoomNode } from "../tree/node.js"
import { TREE_SCHEMA_VERSION, type LoomTree } from "../tree/tree.js"

import {
  collectionHealthOf,
  DEFAULT_REGION_FLOOR,
  deploymentAgendaOf,
  deploymentConversionOf,
  deploymentReadingOf,
  deploymentUnreadOf,
  pageFrontierOf,
  readingProgressOf,
  treesIn,
  arrivalStandingOf,
  windowAgendaOf,
  windowAssemblyOf,
  windowFunnelsOf,
  type CollectionSchedule,
  type DeploymentReadingContext,
  type FunnelPair,
  type PartDeclarations,
  type ReaderWindow,
  type StoredFunnel,
  type StoredPageViews,
  type StoredTally,
  type TurnedAwayTally,
} from "./index.js"

/**
 * Built on real windows and real assemblies, because what is under test is a
 * composition: every reading below is checked against the published call made
 * directly with the rows this says it is entitled to, so the test passes only
 * where the line is the one a careful caller would have written.
 */

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

/**
 * Two siblings, so reading has somewhere to stop, and an ask at the end of
 * them. The first holds a part of its own, so one stop can cost more of the
 * page than another and the fourth order has something to rank.
 */
const PAGE = element("page", "loom.page", {}, [
  element("band", "loom.section", { body: "a word" }, [element("note", "loom.text", {})]),
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
  typesWithRole: () => [],
}

const AT = "2026-11-01T09:00:00.000Z"
const THREE_HOURS_EARLIER = "2026-11-01T06:00:00.000Z"
const AN_HOUR = 60 * 60 * 1000
const THREE_HOURS = 3 * AN_HOUR

/** A fold is expected within seventy minutes, which three hours is past. */
const SCHEDULE: CollectionSchedule = { at: AT, foldsWithinMs: AN_HOUR + 10 * 60 * 1000 }

type Where = {
  readonly treeId?: TreeId
  readonly revision?: number
  readonly audienceId?: AudienceId
}

const tally = (where: Where, name: string, reached: number): StoredTally =>
  ({
    treeId: where.treeId ?? TREE,
    revision: where.revision ?? 1,
    nodeId: nodeId(name),
    type: primitiveType(name === "cta" ? "loom.button" : "loom.section"),
    views: reached,
    reached,
    engaged: 0,
    dwellMs: 0,
    activations: 0,
    opens: 0,
    closes: 0,
    completions: 0,
    updatedAt: AT,
    ...(where.audienceId === undefined ? {} : { audienceId: where.audienceId }),
  }) as StoredTally

const door = (
  where: Where,
  opened: number,
  appearances = opened,
  foldedAt?: string
): StoredPageViews =>
  ({
    treeId: where.treeId ?? TREE,
    revision: where.revision ?? 1,
    opened,
    appearances,
    updatedAt: AT,
    ...(foldedAt === undefined ? {} : { foldedAt }),
    ...(where.audienceId === undefined ? {} : { audienceId: where.audienceId }),
  }) as StoredPageViews

const pair = (from: string, to: string): FunnelPair => ({
  from: { nodeId: nodeId(from), kind: "viewed" },
  to: { nodeId: nodeId(to), kind: "completed" },
})

const funnel = (where: Where, reached: number, converted: number): StoredFunnel =>
  ({
    treeId: where.treeId ?? TREE,
    revision: where.revision ?? 1,
    pair: pair("band", "cta"),
    reached,
    converted,
    updatedAt: AT,
    ...(where.audienceId === undefined ? {} : { audienceId: where.audienceId }),
  }) as StoredFunnel

const windowOf = (held: Partial<ReaderWindow> = {}): ReaderWindow => ({
  tallies: [],
  funnels: [],
  pageViews: [],
  regions: undefined,
  ...held,
})

const TREES = treesIn([
  treeOf(TREE, 1),
  treeOf(TREE, 2),
  treeOf(OTHER_TREE, 1),
])

const CONTEXT: DeploymentReadingContext = {
  trees: TREES,
  declarations: DECLARED,
  floor: DEFAULT_REGION_FLOOR,
  placings: { placingFor: () => undefined },
}

/** One reason this deployment's door turned deliveries away, as its counter holds it. */
const refusal = (
  reason: Reason,
  refused: number,
  lastAt = Date.parse(THREE_HOURS_EARLIER)
): TurnedAwayTally<Reason> => ({ reason, refused, lastAt, lastOrigin: "https://loomjs.org" })

/** A deployment's own closed set, which the framework never names (0311, 0326). */
type Reason = "wrong-site" | "closed" | "unreadable"

const agendaOf = (
  held: Partial<ReaderWindow>,
  schedule: CollectionSchedule | null = SCHEDULE,
  turnedAway: readonly TurnedAwayTally<Reason>[] | undefined = undefined
) => {
  const window = windowOf(held)
  const assembly = windowAssemblyOf(window, CONTEXT)
  const funnels = windowFunnelsOf(window, assembly)

  return {
    window,
    assembly,
    funnels,
    read: windowAgendaOf(window, assembly, funnels, schedule, turnedAway),
  }
}

/**
 * One page whose readers stop between its two parts and whose ask leaks.
 *
 * The page itself reports, as a page whose bands are being read must: a part
 * that said nothing with a reader below it is a sender defect and faults the
 * whole page (0382), which this fixture is not about.
 */
const FALLING: Partial<ReaderWindow> = {
  tallies: [tally({}, "page", 100), tally({}, "band", 100), tally({}, "cta", 20)],
  pageViews: [door({}, 200)],
  funnels: [funnel({}, 100, 10)],
}

/** The same page, with a fold three hours behind and openings waiting on it. */
const STALLED: Partial<ReaderWindow> = {
  ...FALLING,
  pageViews: [door({}, 200, 140, THREE_HOURS_EARLIER)],
}

const faultsIn = (read: ReturnType<typeof agendaOf>["read"]): readonly string[] =>
  read.health.pages.flatMap((page) => page.faults)

describe("a deployment's fix-list, read off one window", () => {
  it("makes one progress reading per reading the window holds, in the readings' own order", () => {
    const { assembly, read } = agendaOf(FALLING)

    expect(read.progress).toHaveLength(assembly.readings.pages.length)
    expect(read.progress).toEqual(assembly.readings.pages.map(readingProgressOf))
  })

  it("ranks the falls off those progress readings and the window's own door rows", () => {
    const { window, read } = agendaOf(FALLING)

    expect(read.order).toEqual(deploymentReadingOf(read.progress, window.pageViews))
    expect(read.order.ranked).toHaveLength(1)
    expect(read.order.worst?.treeId).toBe(TREE)
  })

  /**
   * The progress readings are over the window's readings and not over a side of
   * a library, which is the line that type-checks and drops a revision.
   */
  it("keeps both live revisions of a page in the fix-list", () => {
    const { read } = agendaOf({
      tallies: [
        tally({ revision: 1 }, "page", 100),
        tally({ revision: 1 }, "band", 100),
        tally({ revision: 1 }, "cta", 20),
        tally({ revision: 2 }, "page", 100),
        tally({ revision: 2 }, "band", 100),
        tally({ revision: 2 }, "cta", 90),
      ],
      pageViews: [door({ revision: 1 }, 200), door({ revision: 2 }, 200)],
      funnels: [funnel({ revision: 1 }, 100, 10), funnel({ revision: 2 }, 100, 80)],
    })

    expect(read.agenda.rows.map((row) => row.revision)).toEqual([2, 1])
    expect(read.agenda.trees).toBe(1)
  })

  /**
   * The fourth order, made here under the rung's own rule: `pageFrontierOf` is
   * one call over the assembly's own readings, so a caller asked to hand it in
   * would be writing the line this rung exists to write.
   */
  it("reads the places reading stopped off the same readings the orders were ranked from", () => {
    const { assembly, read } = agendaOf(FALLING)

    expect(read.unread).toEqual(
      deploymentUnreadOf(assembly.readings.pages.map(pageFrontierOf))
    )
    expect(read.unread.duplicated).toBe(0)
    expect(read.unread.ranked).toHaveLength(1)
    expect(read.unread.ranked.map((row) => row.reading)).toEqual(
      assembly.readings.pages.map(pageFrontierOf)
    )
  })

  /**
   * Its key is parts of a page and the fix-list's three are readers, so the two
   * can name different pages and the fourth order does not get to re-rank what
   * an operator is already handed (0327, 0377).
   */
  it("ranks the places in parts of a page and leaves the fix-list untouched", () => {
    const { read } = agendaOf({
      tallies: [
        tally({}, "page", 100),
        tally({}, "band", 100),
        tally({}, "cta", 20),
        tally({ treeId: OTHER_TREE }, "page", 5),
      ],
      pageViews: [door({}, 200), door({ treeId: OTHER_TREE }, 10)],
      funnels: [funnel({}, 100, 10)],
    })

    expect(read.agenda.first?.treeId).toBe(TREE)
    expect(read.unread.worst?.treeId).toBe(OTHER_TREE)
    expect(read.unread.worst?.costs).toBe(2)
    expect(read.unread.ranked.find((row) => row.treeId === TREE)?.costs).toBe(1)

    expect(read.agenda).toEqual(
      deploymentAgendaOf(read.order, read.conversion, read.health, read.arrival, read.unread)
    )

    /*
     * The fourth order is also the reading the rows carry, and the same object:
     * a screen drawing the order of places and the fix-list over it holds one
     * answer about one page (0378).
     */
    expect(read.agenda.rows.find((row) => row.treeId === OTHER_TREE)?.unread).toBe(
      read.unread.worst
    )
  })

  it("reads the conversion order off the funnel answers handed in", () => {
    const { funnels, read } = agendaOf(FALLING)

    expect(read.conversion).toEqual(deploymentConversionOf(funnels.pages))
    expect(read.conversion.ranked).toHaveLength(1)
  })

  /**
   * The one reading that is handed in rather than made here, so that a screen
   * drawing a funnel and the fix-list over it cannot hold two answers of one
   * revision.
   */
  it("carries the conversion row on the fix-list as the same object the order published", () => {
    const { read } = agendaOf(FALLING)

    expect(read.agenda.rows[0]?.conversion).toBe(read.conversion.ranked[0])
    expect(read.agenda.rows[0]?.order).toBe(read.order.ranked[0])
    expect(read.agenda.rows[0]?.health).toBe(read.health.pages[0])
  })

  describe("the schedule, which is the argument a caller loses a fault by leaving out", () => {
    it("faults a fold that has waited longer than the deployment says it should", () => {
      const { read } = agendaOf(STALLED)

      expect(faultsIn(read)).toContain("collection-stalled")
      expect(read.agenda.collection).toHaveLength(1)
      expect(read.agenda.first?.work).toBe("collection")
    })

    it("judges no fold at all where the deployment states no schedule", () => {
      const { read } = agendaOf(STALLED, null)

      expect(faultsIn(read)).not.toContain("collection-stalled")
      expect(read.agenda.collection).toEqual([])
    })

    /**
     * The same window read twice, which is what makes the argument worth being
     * required rather than optional. The three readings under the join are
     * identical, and the fix-list over them says the opposite thing about the
     * same page: *rewrite this page* where no schedule was stated, *repair this
     * measurement* where one was.
     */
    it("withdraws the fall a stalled fold produced, which the unscheduled reading ranks", () => {
      const judged = agendaOf(STALLED).read
      const unjudged = agendaOf(STALLED, null).read

      expect(judged.progress).toEqual(unjudged.progress)
      expect(judged.order).toEqual(unjudged.order)
      expect(judged.conversion).toEqual(unjudged.conversion)

      expect(unjudged.agenda.first?.work).toBe("page")
      expect(unjudged.agenda.page).toHaveLength(1)
      expect(unjudged.agenda.contested).toEqual([])

      expect(judged.agenda.first?.work).toBe("collection")
      expect(judged.agenda.page).toEqual([])
      expect(judged.agenda.converting).toEqual([])
      expect(judged.agenda.contested).toHaveLength(1)
      expect(judged.agenda.rows[0]?.spoiled).toBe(true)
      expect(judged.agenda.rows[0]?.spoiledConversion).toBe(true)
    })

    it("takes the health reading over the window's readings and its door rows", () => {
      const { window, assembly, read } = agendaOf(STALLED)

      expect(read.health).toEqual(
        collectionHealthOf(assembly.readings.pages, window.pageViews, SCHEDULE)
      )
    })
  })

  describe("four readings of one window, which is what the join cannot be handed here", () => {
    it("pairs every page, so nothing is unpaired on any of the four sides", () => {
      const { read } = agendaOf({
        tallies: [
          tally({ audienceId: SKIERS }, "page", 100),
          tally({ audienceId: SKIERS }, "band", 100),
          tally({ audienceId: SKIERS }, "cta", 20),
          tally({ audienceId: RIDERS }, "page", 100),
          tally({ audienceId: RIDERS }, "band", 100),
          tally({ audienceId: RIDERS }, "cta", 90),
          tally({ treeId: OTHER_TREE }, "page", 50),
          tally({ treeId: OTHER_TREE }, "band", 50),
          tally({ treeId: OTHER_TREE }, "cta", 10),
        ],
        pageViews: [
          door({ audienceId: SKIERS }, 200),
          door({ audienceId: RIDERS }, 200),
          door({ treeId: OTHER_TREE }, 100),
        ],
        funnels: [funnel({ audienceId: SKIERS }, 100, 10)],
      })

      expect(read.agenda.unpaired).toEqual({ order: 0, health: 0, conversion: 0, unread: 0 })
      expect(read.agenda.rows).toHaveLength(3)
      expect(read.agenda.trees).toBe(2)
    })

    it("puts a deployment that asks its readers nothing in no conversion order at all", () => {
      const { read } = agendaOf({ ...FALLING, funnels: [] })

      expect(read.conversion.standings.unasked).toBe(1)
      expect(read.conversion.ranked).toEqual([])
      expect(read.agenda.unpaired).toEqual({ order: 0, health: 0, conversion: 0, unread: 0 })
      expect(read.agenda.converting).toEqual([])
    })

    it("holds a page the window has no tree for out of the fix-list, as the assembly does", () => {
      const { assembly, read } = agendaOf({
        tallies: [tally({ treeId: OTHER_TREE, revision: 9 }, "page", 10)],
        pageViews: [door({ treeId: OTHER_TREE, revision: 9 }, 10)],
      })

      expect(assembly.readings.unjoined).toHaveLength(1)
      expect(read.agenda.rows).toEqual([])
      expect(read.agenda.first).toBe(null)
      expect(read.agenda.work.none).toBe(0)
    })
  })

  describe("nothing is counted twice", () => {
    it("counts a page no reading can hold twice, because the assembly holds it once", () => {
      const { read } = agendaOf({
        ...FALLING,
        /** The same counters delivered twice, which the rollup folds into one row. */
        tallies: [...(FALLING.tallies ?? []), ...(FALLING.tallies ?? [])],
      })

      expect(read.agenda.rows).toHaveLength(1)
      expect(read.agenda.duplicated).toBe(0)
      expect(read.order.duplicated).toBe(0)
      expect(read.conversion.duplicated).toBe(0)
      expect(read.health.duplicated).toBe(0)
    })

    /**
     * A caller that concatenated two reads of the door. The repeat is in the
     * rows handed in rather than one the assembly made, so it is counted and
     * named rather than being nought by construction.
     */
    it("names a door row handed in twice rather than scaling the page by both", () => {
      const once = agendaOf(FALLING).read
      const twice = agendaOf({ ...FALLING, pageViews: [door({}, 200), door({}, 200)] }).read

      expect(twice.order.duplicatedRows).toBe(1)
      expect(twice.order.ranked[0]?.opened).toBe(200)
      expect(twice.order.ranked[0]?.readers).toBe(once.order.ranked[0]?.readers)
      expect(twice.agenda.rows).toHaveLength(1)
    })

    it("is one row in both page orders where a page both falls and leaks", () => {
      const { read } = agendaOf(FALLING)

      expect(read.agenda.page).toHaveLength(1)
      expect(read.agenda.converting).toHaveLength(1)
      /** One page, one row object, counted once. */
      expect(read.agenda.page[0]).toBe(read.agenda.converting[0])
      expect(read.agenda.work.page + read.agenda.work.both).toBe(1)
      expect(read.agenda.rows).toHaveLength(1)
    })
  })
})

describe("the fix-list's subject, off the refusal rows the rung is handed", () => {
  it("sends an operator to the intake where a window is empty and the door refused deliveries", () => {
    const { read } = agendaOf({}, SCHEDULE, [refusal("wrong-site", 12)])

    expect(read.agenda.subject).toBe("intake")
    expect(read.agenda.first).toBeNull()
    expect(read.arrival.standing).toBe("turned-away")
    expect(read.arrival.refused).toBe(12)
  })

  it("says nothing is posting where a window is empty and the counter holds no refusal", () => {
    const { read } = agendaOf({}, SCHEDULE, [])

    expect(read.agenda.subject).toBe("silence")
    expect(read.arrival.standing).toBe("silent")
    expect(read.arrival.refused).toBe(0)
  })

  it("refuses to choose between the two silences where the deployment keeps no counter", () => {
    const { read } = agendaOf({}, SCHEDULE, undefined)

    expect(read.agenda.subject).toBe("unverified")
    expect(read.arrival.standing).toBe("unasked")
    expect(read.arrival.refused).toBeNull()
  })

  it("says pages about a window that holds one, with the refusal named beside it", () => {
    const { read } = agendaOf(FALLING, SCHEDULE, [refusal("closed", 3)])

    expect(read.agenda.subject).toBe("pages")
    expect(read.arrival.standing).toBe("mixed")
    expect(read.agenda.first?.work).toBe("page")
  })

  it("carries the deployment's own reason through to the remedy, unworded", () => {
    const { read } = agendaOf({}, SCHEDULE, [refusal("unreadable", 4)])

    /** Typed in the host's set, not the framework's, so this switch is exhaustive. */
    const reason: Reason | undefined = read.arrival.newest?.reason

    expect(reason).toBe("unreadable")
    expect(read.arrival.newest?.origin).toBe("https://loomjs.org")
  })

  it("ages the newest refusal against the schedule's instant rather than a clock", () => {
    const { read } = agendaOf({}, SCHEDULE, [refusal("wrong-site", 1)])

    expect(read.arrival.newest?.sinceMs).toBe(THREE_HOURS)
  })

  it("gives every arrival figure and no age where the schedule is null or its instant unreadable", () => {
    const none = agendaOf({}, null, [refusal("wrong-site", 1)]).read
    const unreadable = agendaOf({}, { at: "not a date", foldsWithinMs: AN_HOUR }, [
      refusal("wrong-site", 1),
    ]).read

    expect([none.arrival.newest?.sinceMs, unreadable.arrival.newest?.sinceMs]).toEqual([null, null])
    expect([none.arrival.refused, unreadable.arrival.refused]).toEqual([1, 1])
    expect([none.agenda.subject, unreadable.agenda.subject]).toEqual(["intake", "intake"])
  })

  it("is the reading arrivalStandingOf gives over the health reading the rows were judged by", () => {
    const refusals = [refusal("wrong-site", 2), refusal("closed", 5)]
    const { read } = agendaOf(FALLING, SCHEDULE, refusals)

    expect(read.arrival).toEqual(
      arrivalStandingOf<Reason>(read.health, refusals, Date.parse(AT))
    )
  })

  it("adds the refusals once where a caller handed one reason in twice", () => {
    const once = agendaOf({}, SCHEDULE, [refusal("wrong-site", 7)]).read
    const twice = agendaOf({}, SCHEDULE, [refusal("wrong-site", 7), refusal("wrong-site", 7)]).read

    expect(twice.arrival.refused).toBe(once.arrival.refused)
    expect(twice.arrival.duplicated).toBe(1)
    expect(twice.agenda.subject).toBe("intake")
  })
})
