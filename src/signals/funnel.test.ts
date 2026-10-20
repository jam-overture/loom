import { describe, expect, it } from "vitest"

import { DEFAULT_AUDIENCE_ID } from "../audience/audience.js"
import { nodeId, primitiveType, RIDERS, SKIERS, TREE } from "../testing/reader-signal-contract.js"
import type { ElementNode, LoomNode } from "../tree/node.js"
import { TREE_SCHEMA_VERSION } from "../tree/tree.js"

import {
  describeEndStanding,
  describeFunnelStage,
  END_STANDINGS,
  FUNNEL_STAGES,
  funnelReachOf,
  inflationFor,
  pageReadingOf,
  pageViewsFor,
  type FunnelPair,
  type PageReading,
  type PartDeclarations,
  type StoredFunnel,
  type StoredTally,
  type StoredPageViews,
} from "./index.js"

/**
 * Built on stored rows and a tree, because those are what the function takes: a
 * window's funnel counters, the two numbers the door and the rollups wrote, and
 * the revision the pairs are being asked about. A share of the readers who
 * arrived comes out of the other end, and so does whether the question still
 * names anything.
 */

const element = (name: string, type: string, children: readonly LoomNode[] = []): ElementNode => ({
  kind: "element",
  id: nodeId(name),
  type: primitiveType(type),
  props: {},
  children,
})

const text = (name: string, value: string): LoomNode => ({
  kind: "text",
  id: nodeId(name),
  value,
})

const NOTHING_DECLARED: PartDeclarations = {
  copyFor: () => undefined,
  typesWithRole: () => [],
}

/**
 * The revision every pair below is asked of, holding each node the fixtures
 * name. Built through `pageReadingOf` rather than written out, so what the
 * reading says a revision contains is what §6 says it does and not a second
 * spelling of it.
 */
const readingOf = (root: ElementNode, revision = 1): PageReading =>
  pageReadingOf(
    { treeId: TREE, schemaVersion: TREE_SCHEMA_VERSION, revision, root },
    [],
    NOTHING_DECLARED
  )

const PAGE = element("root", "loom.stack", [
  element("a", "loom.section"),
  element("b", "loom.section"),
  element("c", "loom.section"),
  element("z", "loom.section"),
  element("band", "loom.section", [element("form", "loom.form")]),
  element("deep", "loom.section"),
])

const WHERE = readingOf(PAGE)

const AT = "2026-10-05T09:00:00.000Z"

const pair = (from: string, to: string): FunnelPair => ({
  from: { nodeId: nodeId(from), kind: "viewed" },
  to: { nodeId: nodeId(to), kind: "completed" },
})

const funnel = (
  from: string,
  to: string,
  reached: number,
  converted: number,
  where: { treeId: typeof TREE; revision: number } = WHERE
): StoredFunnel => ({
  audienceId: DEFAULT_AUDIENCE_ID,
  treeId: where.treeId,
  revision: where.revision,
  pair: pair(from, to),
  reached,
  converted,
  updatedAt: AT,
})

const views = (
  opened: number,
  appearances: number,
  where: { treeId: typeof TREE; revision: number } = WHERE
): StoredPageViews => ({
  audienceId: DEFAULT_AUDIENCE_ID,
  treeId: where.treeId,
  revision: where.revision,
  opened,
  appearances,
  updatedAt: AT,
})

describe("pageViewsFor", () => {
  it("picks the row for the revision asked about", () => {
    const picked = pageViewsFor(WHERE, [views(10, 10, { treeId: TREE, revision: 2 }), views(4, 5)])

    expect(picked.measured?.opened).toBe(4)
    expect(picked.measured?.appearances).toBe(5)
    expect(picked.foreign).toBe(1)
    expect(picked.duplicated).toBe(0)
  })

  it("reads drift, pending and inflation through the one definition of them", () => {
    expect(pageViewsFor(WHERE, [views(4, 5)]).measured).toMatchObject({
      drift: 1,
      pending: 0,
      inflation: 0.25,
    })

    expect(pageViewsFor(WHERE, [views(5, 4)]).measured).toMatchObject({
      drift: 0,
      pending: 1,
      inflation: 0,
    })
  })

  it("has no row to give where the revision was never counted", () => {
    const picked = pageViewsFor(WHERE, [views(9, 9, { treeId: TREE, revision: 7 })])

    expect(picked.measured).toBeNull()
    expect(picked.foreign).toBe(1)
  })

  it("keeps the first of two rows for one revision and says it dropped one", () => {
    const picked = pageViewsFor(WHERE, [views(4, 5), views(400, 500)])

    expect(picked.measured?.opened).toBe(4)
    expect(picked.duplicated).toBe(1)
  })
})

describe("the audience a door row and a funnel row belong to", () => {
  /**
   * A page served in two forms answers one funnel question twice, over two
   * populations (0263, 0284). Before the audience was part of the matching,
   * the second answer was the first one handed in twice and the other form's
   * door row was picked by whichever came first in the caller's list.
   */
  const inAudience = <R extends { readonly audienceId: typeof SKIERS }>(
    audienceId: typeof SKIERS,
    row: R
  ): R => ({ ...row, audienceId })

  const SKIER_PAGE = pageReadingOf(
    { treeId: TREE, schemaVersion: TREE_SCHEMA_VERSION, revision: 1, root: PAGE },
    [],
    NOTHING_DECLARED,
    SKIERS
  )

  it("picks the door row of the audience the reading is of", () => {
    const picked = pageViewsFor(SKIER_PAGE, [
      inAudience(RIDERS, views(400, 400)),
      inAudience(SKIERS, views(4, 5)),
    ])

    expect(picked.measured?.opened).toBe(4)
    expect(picked.otherAudience).toBe(1)
    expect(picked.duplicated).toBe(0)
    expect(picked.foreign).toBe(0)
  })

  /**
   * The undercount 0299 fixed. A deployment-wide asking took whichever form's
   * row came first in the caller's array and reported the other form's
   * arrivals as a row handed in twice — 400 views published where 404 arrived,
   * with the loss counted as a duplicate nobody reads as an undercount, which
   * is the same fault 0297 found in the region map beside it.
   */
  it("adds every form's arrivals where the asking names no audience", () => {
    const picked = pageViewsFor(WHERE, [inAudience(RIDERS, views(400, 400)), views(4, 5)])

    expect(picked.measured?.opened).toBe(404)
    expect(picked.measured?.appearances).toBe(405)
    expect(picked.otherAudience).toBe(0)
    expect(picked.duplicated).toBe(0)
  })

  it("names the forms it added and names no audience of its own", () => {
    const picked = pageViewsFor(WHERE, [inAudience(RIDERS, views(400, 400)), views(4, 5)])

    expect(picked.measured?.audiences).toEqual([DEFAULT_AUDIENCE_ID, RIDERS])
    expect(picked.measured?.audienceId).toBeNull()
  })

  /**
   * One name on the rows is not one population behind them, and the asking is
   * what a reading is of (0297 clause 3, 0299). A window holding one form today
   * is not a reading of that form.
   */
  it("names the one form in it without claiming to be a reading of it", () => {
    const picked = pageViewsFor(WHERE, [views(4, 5)])

    expect(picked.measured?.audiences).toEqual([DEFAULT_AUDIENCE_ID])
    expect(picked.measured?.audienceId).toBeNull()
  })

  it("is a reading of the form the asking named, and says so", () => {
    const picked = pageViewsFor(SKIER_PAGE, [
      inAudience(RIDERS, views(400, 400)),
      inAudience(SKIERS, views(4, 5)),
    ])

    expect(picked.measured?.audienceId).toBe(SKIERS)
    expect(picked.measured?.audiences).toEqual([SKIERS])
  })

  /**
   * The case that makes the sum safe to take. A store keeps one door row per
   * revision per audience, so two rows of one form can only come from a caller
   * concatenating two reads of running totals — and adding those would double
   * arrivals permanently (0158).
   */
  it("counts each form's door once however many times the window is handed in", () => {
    const window = [inAudience(RIDERS, views(400, 400)), views(4, 5)]
    const picked = pageViewsFor(WHERE, [...window, ...window])

    expect(picked.measured?.opened).toBe(404)
    expect(picked.measured?.appearances).toBe(405)
    expect(picked.duplicated).toBe(2)
  })

  it("reads one form's funnel answer and counts the other form's apart from it", () => {
    const reach = funnelReachOf(
      SKIER_PAGE,
      [inAudience(SKIERS, funnel("a", "b", 40, 10)), inAudience(RIDERS, funnel("a", "b", 90, 90))],
      [inAudience(SKIERS, views(100, 100)), inAudience(RIDERS, views(900, 900))]
    )

    expect(reach.pairs).toHaveLength(1)
    expect(reach.pairs[0]?.reached).toBe(40)
    expect(reach.otherAudiencePairs).toBe(1)
    expect(reach.duplicatedPairs).toBe(0)
    expect(reach.foreignPairs).toBe(0)
    expect(reach.opened).toBe(100)
  })

  /**
   * The guard that has to survive the scoping: within one audience, one pair
   * handed in twice is still one pair, which 0158 makes permanent if it is
   * ever added instead.
   */
  it("still drops one audience's second row for a pair it already answered", () => {
    const reach = funnelReachOf(
      SKIER_PAGE,
      [inAudience(SKIERS, funnel("a", "b", 40, 10)), inAudience(SKIERS, funnel("a", "b", 40, 10))],
      [inAudience(SKIERS, views(100, 100))]
    )

    expect(reach.pairs).toHaveLength(1)
    expect(reach.duplicatedPairs).toBe(1)
    expect(reach.otherAudiencePairs).toBe(0)
  })

  /**
   * Carried rather than consumed and dropped: a comparison of two readings
   * cannot refuse a pair of two populations unless each reading still says
   * which population it was of.
   */
  it("names the audience the reading was of, so a comparison can refuse a pair of two", () => {
    const reach = funnelReachOf(
      SKIER_PAGE,
      [inAudience(SKIERS, funnel("a", "b", 40, 10))],
      [inAudience(SKIERS, views(100, 100))]
    )

    expect(reach.audienceId).toBe(SKIERS)
  })

  it("names none where the reading named none, which is every window without the column", () => {
    expect(funnelReachOf(WHERE, [funnel("a", "b", 40, 10)], [views(100, 100)]).audienceId).toBeNull()
  })

  it("counts another revision's funnel row as foreign before it is anybody's audience", () => {
    const reach = funnelReachOf(
      SKIER_PAGE,
      [inAudience(RIDERS, funnel("a", "b", 9, 9, { treeId: TREE, revision: 7 }))],
      [inAudience(SKIERS, views(100, 100))]
    )

    expect(reach.foreignPairs).toBe(1)
    expect(reach.otherAudiencePairs).toBe(0)
  })
})

/**
 * The third reading in this subsystem to pick a page's rows out of a window by
 * a key that was missing the audience. The region map's buckets and the door's
 * arrivals were each corrected after publishing a real second form as a count
 * of rows handed in twice (0297); this is the same shape in the funnel,
 * and it is the one where the numerator and the denominator could come from
 * two different forms.
 */
describe("a window of two forms with none asked for", () => {
  const inAudience = <R extends { readonly audienceId: typeof SKIERS }>(
    audienceId: typeof SKIERS,
    row: R
  ): R => ({ ...row, audienceId })

  const tally = (audienceId: typeof SKIERS, node: string): StoredTally => ({
    audienceId,
    treeId: TREE,
    revision: 1,
    nodeId: nodeId(node),
    type: primitiveType("loom.section"),
    views: 10,
    reached: 10,
    engaged: 0,
    dwellMs: 0,
    activations: 0,
    opens: 0,
    closes: 0,
    completions: 0,
    updatedAt: AT,
  })

  /** A reading `pageReadingOf` read as neither, which is 0290 clause 3's state. */
  const MIXED_PAGE = pageReadingOf(
    { treeId: TREE, schemaVersion: TREE_SCHEMA_VERSION, revision: 1, root: PAGE },
    [tally(SKIERS, "a"), tally(RIDERS, "a")],
    NOTHING_DECLARED
  )

  it("is a reading of neither population, so no pair is read", () => {
    const reach = funnelReachOf(
      MIXED_PAGE,
      [inAudience(SKIERS, funnel("a", "b", 4, 2)), inAudience(RIDERS, funnel("a", "b", 400, 200))],
      [inAudience(SKIERS, views(100, 100)), inAudience(RIDERS, views(1000, 1000))]
    )

    expect(reach.pairs).toEqual([])
    expect(reach.audienceId).toBeNull()
    expect(reach.audiences).toEqual([RIDERS, SKIERS])
    expect(reach.otherAudiencePairs).toBe(2)
  })

  /**
   * The number that made the fault invisible. A second population's answer in
   * `duplicatedPairs` is the one figure in this reading nobody reads as an
   * undercount, and a count that was never added cannot be noticed (0158).
   */
  it("counts neither form's answer as the same question handed in twice", () => {
    const reach = funnelReachOf(
      MIXED_PAGE,
      [inAudience(SKIERS, funnel("a", "b", 4, 2)), inAudience(RIDERS, funnel("a", "b", 400, 200))],
      [inAudience(SKIERS, views(100, 100))]
    )

    expect(reach.duplicatedPairs).toBe(0)
  })

  /**
   * The sharpest version, and the reason this is not merely an undercount: the
   * funnel rows and the door rows are two arrays, each picked from by its own
   * first element, so one form's `reached` was published over the other form's
   * appearances. Forty in a hundred and four hundred in a thousand are both
   * forty per cent; the reading said four tenths of a per cent.
   */
  it("does not divide one form's reach by the other form's arrivals", () => {
    const reach = funnelReachOf(
      MIXED_PAGE,
      [inAudience(SKIERS, funnel("a", "b", 4, 2)), inAudience(RIDERS, funnel("a", "b", 400, 200))],
      [inAudience(RIDERS, views(1000, 1000)), inAudience(SKIERS, views(10, 10))]
    )

    expect(reach.pairs.map((pair) => pair.entry.share)).toEqual([])
  })

  /**
   * The ambiguity is of the window and not of one list in it. A caller holding
   * a reading of one form and funnel rows of two is as unable to say whose
   * answer it is as the reverse, and only the reverse was reachable through the
   * reading's own census.
   */
  it("is refused where the funnel rows name two forms and the reading named none", () => {
    const reach = funnelReachOf(
      WHERE,
      [inAudience(SKIERS, funnel("a", "b", 4, 2)), inAudience(RIDERS, funnel("a", "b", 400, 200))],
      [views(100, 100)]
    )

    expect(reach.pairs).toEqual([])
    expect(reach.audiences).toEqual([RIDERS, SKIERS])
    expect(reach.otherAudiencePairs).toBe(2)
    expect(reach.duplicatedPairs).toBe(0)
  })

  it("is refused where the reading names two forms and the funnel rows name one", () => {
    const reach = funnelReachOf(
      MIXED_PAGE,
      [inAudience(SKIERS, funnel("a", "b", 4, 2))],
      [inAudience(SKIERS, views(100, 100))]
    )

    expect(reach.pairs).toEqual([])
    expect(reach.otherAudiencePairs).toBe(1)
  })

  /**
   * The asking is what resolves it, and it resolves it whichever list the
   * second form is in. This is the behaviour 0290 clause 4 gave the three
   * joins, and it is unchanged.
   */
  it("reads one form where the reading names it, with the other counted apart", () => {
    const skiers = pageReadingOf(
      { treeId: TREE, schemaVersion: TREE_SCHEMA_VERSION, revision: 1, root: PAGE },
      [tally(SKIERS, "a"), tally(RIDERS, "a")],
      NOTHING_DECLARED,
      SKIERS
    )

    const reach = funnelReachOf(
      skiers,
      [inAudience(SKIERS, funnel("a", "b", 4, 2)), inAudience(RIDERS, funnel("a", "b", 400, 200))],
      [inAudience(SKIERS, views(10, 10)), inAudience(RIDERS, views(1000, 1000))]
    )

    expect(reach.pairs).toHaveLength(1)
    expect(reach.pairs[0]?.reached).toBe(4)
    expect(reach.opened).toBe(10)
    expect(reach.audienceId).toBe(SKIERS)
    expect(reach.otherAudiencePairs).toBe(1)
    expect(reach.duplicatedPairs).toBe(0)
  })

  /**
   * The guard that has to survive the refusal: one population handing in one
   * pair twice is still one pair, and adding the second would double a total
   * that is already one (0158).
   */
  it("still drops a second row for a pair one population already answered", () => {
    const reach = funnelReachOf(
      WHERE,
      [funnel("a", "b", 40, 10), funnel("a", "b", 40, 10)],
      [views(100, 100)]
    )

    expect(reach.pairs).toHaveLength(1)
    expect(reach.pairs[0]?.reached).toBe(40)
    expect(reach.duplicatedPairs).toBe(1)
    expect(reach.otherAudiencePairs).toBe(0)
  })

  it("names the one population a window of one form holds, with nothing asked for", () => {
    const reach = funnelReachOf(
      WHERE,
      [inAudience(SKIERS, funnel("a", "b", 40, 10))],
      [inAudience(SKIERS, views(100, 100))]
    )

    expect(reach.pairs).toHaveLength(1)
    expect(reach.audiences).toEqual([SKIERS])
    expect(reach.audienceId).toBeNull()
  })

  /**
   * `StoredFunnel` names an audience by construction, so a window of real rows
   * always names at least one and `[]` here means the revision had no funnel
   * row at all. The census is still the pair of fields a surface reads: one
   * member with nothing asked for is the ordinary deployment, and it is why
   * `audiences` alone is not the refusal.
   */
  it("names no population where the revision has no funnel row and the reading named none", () => {
    const reach = funnelReachOf(WHERE, [], [views(100, 100)])

    expect(reach.pairs).toEqual([])
    expect(reach.audiences).toEqual([])
    expect(reach.audienceId).toBeNull()
  })

  /**
   * The door's figures are not withheld, and that is deliberate: arrivals are
   * counted once per page view and add across forms (0297), so the
   * deployment-wide count of readers is the one figure a refused reading can
   * still give.
   */
  it("keeps the arrivals it was read against, which are the deployment's", () => {
    const reach = funnelReachOf(
      MIXED_PAGE,
      [inAudience(SKIERS, funnel("a", "b", 4, 2))],
      [inAudience(SKIERS, views(10, 10))]
    )

    expect(reach.opened).toBeGreaterThan(0)
  })

  it("counts another revision's row as foreign before it is anybody's audience", () => {
    const reach = funnelReachOf(
      MIXED_PAGE,
      [inAudience(RIDERS, funnel("a", "b", 9, 9, { treeId: TREE, revision: 7 }))],
      [inAudience(SKIERS, views(100, 100))]
    )

    expect(reach.foreignPairs).toBe(1)
    expect(reach.otherAudiencePairs).toBe(0)
    expect(reach.pairs).toEqual([])
  })
})

describe("inflationFor", () => {
  /**
   * The finding this closes is that every consumer writes the matching itself
   * and the matching fails quietly. So the case that matters is the one where a
   * window holds two pages with very different straddle rates.
   */
  it("gives each revision its own correction and never the other's", () => {
    const quiet = { treeId: TREE, revision: 1 } as const
    const busy = { treeId: TREE, revision: 2 } as const
    const rows = [views(100, 100, quiet), views(100, 150, busy)]

    expect(inflationFor(quiet, rows)).toBe(0)
    expect(inflationFor(busy, rows)).toBe(0.5)
  })

  it("is null where the revision has no row, rather than nought", () => {
    expect(inflationFor(WHERE, [])).toBeNull()
  })

  it("is null where nothing opened, because the question has no answer", () => {
    expect(inflationFor(WHERE, [views(0, 30)])).toBeNull()
  })
})

describe("END_STANDINGS", () => {
  it("has a line for every standing", () => {
    for (const standing of END_STANDINGS) expect(describeEndStanding(standing)).toBeTruthy()
  })
})

describe("the pair the revision no longer has", () => {
  /**
   * The finding this closes, as the two readings it could not tell apart. Both
   * rows say `reached 0, converted 0`; one is a band readers never scroll to
   * and the other is a question about a part the page has not had since a
   * change, and the remedies are opposite.
   */
  it("tells a stale question from a funnel nobody reached", () => {
    const reach = funnelReachOf(
      WHERE,
      [funnel("band", "form", 0, 0), funnel("gone", "form", 0, 0)],
      [views(100, 100)]
    )
    const unreached = reach.pairs.find((one) => one.pair.from.nodeId === nodeId("band"))
    const stale = reach.pairs.find((one) => one.pair.from.nodeId === nodeId("gone"))

    expect(unreached?.stale).toBe(false)
    expect(unreached?.ends).toStrictEqual({ from: "present", to: "present" })
    expect(unreached?.entry.share).toBe(0)
    expect(unreached?.lostBefore).toBe(1)
    expect(unreached?.worse).toBe("before")

    expect(stale?.stale).toBe(true)
    expect(stale?.ends).toStrictEqual({ from: "absent", to: "present" })
    expect(stale?.entry.share).toBeNull()
    expect(stale?.lostBefore).toBeNull()
    expect(stale?.worse).toBeNull()
  })

  it("withholds every figure that needed the missing first end, and keeps the counts", () => {
    const reach = funnelReachOf(WHERE, [funnel("gone", "form", 40, 10)], [views(100, 100)])
    const [only] = reach.pairs

    expect(only?.reached).toBe(40)
    expect(only?.converted).toBe(10)
    expect(only?.updatedAt).toBe(AT)

    expect(only?.rate).toBeNull()
    expect(only?.rateAtMost).toBeNull()
    expect(only?.entry.share).toBeNull()
    expect(only?.entry.atMost).toBeNull()
    expect(only?.conversion.share).toBeNull()
    expect(only?.lostBefore).toBeNull()
    expect(only?.lostBetween).toBeNull()
  })

  /**
   * The two ends fail differently, which is why the withholding is per figure.
   * Readers who reached the first end reached it whatever became of the second.
   */
  it("keeps the entry share where only the second end is gone", () => {
    const reach = funnelReachOf(WHERE, [funnel("band", "gone", 40, 0)], [views(100, 100)])
    const [only] = reach.pairs

    expect(only?.ends).toStrictEqual({ from: "present", to: "absent" })
    expect(only?.stale).toBe(true)
    expect(only?.entry.share).toBe(0.4)
    expect(only?.entry.readers).toBe(40)
    expect(only?.lostBefore).toBe(0.6)

    expect(only?.conversion.share).toBeNull()
    expect(only?.rate).toBeNull()
    expect(only?.rateAtMost).toBeNull()
    expect(only?.lostBetween).toBeNull()
    expect(only?.worse).toBeNull()
  })

  it("withholds the rate on a stale pair even though it needs no denominator", () => {
    /**
     * `rate` survives a silence, because two counts off one row divide into
     * each other without arrivals. It does not survive a missing end: there is
     * no question, rather than a question with no denominator.
     */
    const silenced = funnelReachOf(WHERE, [funnel("band", "form", 60, 15)], [])
    const gone = funnelReachOf(WHERE, [funnel("band", "gone", 60, 15)], [])

    expect(silenced.pairs[0]?.rate).toBe(0.25)
    expect(gone.pairs[0]?.rate).toBeNull()
  })

  it("reads an end against the revision it was handed, not the one the row names", () => {
    /**
     * The change that dissolves a pair: revision 2 of the same tree without the
     * band. The counters are filed under the revision being asked about either
     * way, which is what makes the tree the only thing that can say.
     */
    const without = readingOf(element("root", "loom.stack", [element("deep", "loom.section")]), 2)
    const reach = funnelReachOf(
      without,
      [funnel("band", "form", 0, 0, { treeId: TREE, revision: 2 })],
      [views(100, 100, { treeId: TREE, revision: 2 })]
    )

    expect(reach.pairs[0]?.ends).toStrictEqual({ from: "absent", to: "absent" })
    expect(reach.stalePairs).toBe(1)
  })

  it("calls an end naming a text node absent, because no signal can ever name one", () => {
    const withText = readingOf(element("root", "loom.stack", [text("legal", "All rights")]))
    const reach = funnelReachOf(withText, [funnel("legal", "root", 0, 0)], [views(10, 10)])

    expect(reach.pairs[0]?.ends.from).toBe("absent")
  })

  it("counts the stale pairs once for a window read twice", () => {
    /** The double-count case every counter here is held to (0158). */
    const once = funnelReachOf(WHERE, [funnel("gone", "form", 0, 0)], [views(100, 100)])
    const twice = funnelReachOf(
      WHERE,
      [funnel("gone", "form", 0, 0), funnel("gone", "form", 0, 0)],
      [views(100, 100)]
    )

    expect(once.stalePairs).toBe(1)
    expect(twice.stalePairs).toBe(1)
    expect(twice.duplicatedPairs).toBe(1)
  })

  it("is nought on a page whose every pair still names something", () => {
    const reach = funnelReachOf(
      WHERE,
      [funnel("band", "form", 60, 15), funnel("root", "form", 100, 20)],
      [views(100, 100)]
    )

    expect(reach.stalePairs).toBe(0)
    expect(reach.orphanedPairs).toBe(0)
    expect(reach.pairs.every((one) => !one.stale)).toBe(true)
  })

  describe("an end the tree has not got, with a count against it", () => {
    it("raises the orphan alarm for a count on a missing first end", () => {
      const reach = funnelReachOf(WHERE, [funnel("gone", "form", 40, 10)], [views(100, 100)])

      expect(reach.pairs[0]?.orphaned).toBe(true)
      expect(reach.orphanedPairs).toBe(1)
    })

    it("raises it for a conversion on a missing second end", () => {
      const reach = funnelReachOf(WHERE, [funnel("band", "gone", 40, 10)], [views(100, 100)])

      expect(reach.pairs[0]?.orphaned).toBe(true)
    })

    it("does not raise it where the missing end counted nothing", () => {
      const reach = funnelReachOf(WHERE, [funnel("gone", "form", 0, 0)], [views(100, 100)])

      expect(reach.pairs[0]?.stale).toBe(true)
      expect(reach.pairs[0]?.orphaned).toBe(false)
      expect(reach.orphanedPairs).toBe(0)
    })

    it("is independent of a reach above the page views there were", () => {
      const both = funnelReachOf(WHERE, [funnel("gone", "form", 140, 90)], [views(100, 100)])

      expect(both.pairs[0]?.orphaned).toBe(true)
      expect(both.pairs[0]?.unreconciled).toBe(true)
    })

    it("counts an orphan once for a window read twice", () => {
      const twice = funnelReachOf(
        WHERE,
        [funnel("gone", "form", 40, 10), funnel("gone", "form", 40, 10)],
        [views(100, 100)]
      )

      expect(twice.orphanedPairs).toBe(1)
    })
  })

  /**
   * The tree says where the two ends sit, so the temptation is to call a pair
   * whose second end comes first a fault. A pair has no ordering beyond its two
   * ends (0146), and a reader who scrolls back up satisfies it honestly.
   */
  it("says nothing about a pair whose second end comes first in the page", () => {
    const forwards = funnelReachOf(WHERE, [funnel("a", "z", 40, 10)], [views(100, 100)])
    const backwards = funnelReachOf(WHERE, [funnel("z", "a", 40, 10)], [views(100, 100)])

    expect(backwards.pairs[0]?.ends).toStrictEqual({ from: "present", to: "present" })
    expect(backwards.pairs[0]?.stale).toBe(false)
    expect(backwards.pairs[0]?.conversion).toStrictEqual(forwards.pairs[0]?.conversion)
  })
})

describe("funnelReachOf", () => {
  it("puts a funnel as three shares of the readers who arrived", () => {
    const reach = funnelReachOf(WHERE, [funnel("band", "form", 60, 15)], [views(100, 100)])
    const [only] = reach.pairs

    expect(reach.silence).toBeNull()
    expect(reach.exact).toBe(true)
    expect(only?.rate).toBe(0.25)
    expect(only?.entry.share).toBe(0.6)
    expect(only?.conversion.share).toBe(0.15)
    expect(only?.lostBefore).toBe(0.4)
    expect(only?.lostBetween).toBe(0.45)
  })

  it("partitions the arrivals, so the three shares sum to one", () => {
    const reach = funnelReachOf(WHERE, [funnel("band", "form", 37, 11)], [views(80, 80)])
    const [only] = reach.pairs

    expect((only?.lostBefore ?? 0) + (only?.lostBetween ?? 0) + (only?.conversion.share ?? 0)).toBe(
      1
    )
  })

  it("names the stage that costs more readers, and neither when they are level", () => {
    const steep = funnelReachOf(WHERE, [funnel("band", "form", 20, 15)], [views(100, 100)])
    const shallow = funnelReachOf(WHERE, [funnel("band", "form", 95, 10)], [views(100, 100)])
    const level = funnelReachOf(WHERE, [funnel("band", "form", 50, 0)], [views(100, 100)])

    expect(steep.pairs[0]?.worse).toBe("before")
    expect(shallow.pairs[0]?.worse).toBe("between")
    expect(level.pairs[0]?.worse).toBeNull()
  })

  it("is the rate that hides the first loss, which is the reason for the shares", () => {
    /**
     * Two pairs with the same magnificent rate and two readers between them.
     * `rate` cannot tell them apart; the conversion share can.
     */
    const reach = funnelReachOf(
      WHERE,
      [funnel("deep", "form", 2, 2), funnel("band", "form", 90, 90)],
      [views(100, 100)]
    )
    const deep = reach.pairs.find((one) => one.pair.from.nodeId === nodeId("deep"))
    const band = reach.pairs.find((one) => one.pair.from.nodeId === nodeId("band"))

    expect(deep?.rate).toBe(1)
    expect(band?.rate).toBe(1)
    expect(deep?.conversion.share).toBe(0.02)
    expect(band?.conversion.share).toBe(0.9)
  })

  describe("the straddle, which leans down here and up everywhere else", () => {
    it("bounds the rate above where visits spanned two windows", () => {
      /**
       * Thirty appearances against twenty openings is a drift of ten, so up to
       * ten conversions could have been split across windows and lost. The
       * stored rate is a floor and the ceiling is the arithmetic that says so.
       */
      const reach = funnelReachOf(WHERE, [funnel("band", "form", 20, 4)], [views(20, 30)])
      const [only] = reach.pairs

      expect(reach.drift).toBe(10)
      expect(reach.exact).toBe(false)
      expect(only?.rate).toBe(0.2)
      // (4 + 10) / (20 - 10)
      expect(only?.rateAtMost).toBe(1)
    })

    it("closes the ceiling onto the rate where nobody straddled", () => {
      const reach = funnelReachOf(WHERE, [funnel("band", "form", 40, 10)], [views(100, 100)])

      expect(reach.exact).toBe(true)
      expect(reach.pairs[0]?.rateAtMost).toBe(reach.pairs[0]?.rate)
    })

    it("never recovers a conversion the row already counted", () => {
      /** Everything converted, so a drift has nothing left to give back. */
      const reach = funnelReachOf(WHERE, [funnel("band", "form", 30, 30)], [views(20, 30)])

      expect(reach.pairs[0]?.rate).toBe(1)
      expect(reach.pairs[0]?.rateAtMost).toBe(1)
    })

    it("keeps the ceiling at or above the rate across every short sequence", () => {
      for (let reached = 0; reached <= 12; reached += 1) {
        for (let converted = 0; converted <= reached; converted += 1) {
          for (let drift = 0; drift <= 12; drift += 1) {
            const reach = funnelReachOf(
              WHERE,
              [funnel("band", "form", reached, converted)],
              [views(20, 20 + drift)]
            )
            const [only] = reach.pairs

            if (only?.rate === null || only === undefined) continue

            expect(only.rateAtMost).not.toBeNull()
            expect(only.rateAtMost ?? 0).toBeGreaterThanOrEqual(only.rate ?? 0)
            expect(only.rateAtMost ?? 0).toBeLessThanOrEqual(1)
          }
        }
      }
    })
  })

  describe("the two denominators", () => {
    it("takes the estimate of the appearances and the ceiling of the openings", () => {
      const reach = funnelReachOf(WHERE, [funnel("band", "form", 30, 15)], [views(40, 50)])
      const [only] = reach.pairs

      expect(only?.conversion.share).toBe(0.3)
      expect(only?.conversion.atMost).toBe(0.375)
      expect(only?.conversion.readers).toBe(12)
      expect(only?.conversion.atMostReaders).toBe(15)
    })

    it("holds the ceiling at one where more reached than opened", () => {
      const reach = funnelReachOf(WHERE, [funnel("band", "form", 48, 48)], [views(40, 50)])

      expect(reach.pairs[0]?.entry.atMost).toBe(1)
      expect(reach.pairs[0]?.entry.atMostReaders).toBe(40)
    })

    it("withholds the headcount while an opening is pending", () => {
      const reach = funnelReachOf(WHERE, [funnel("band", "form", 20, 10)], [views(50, 40)])
      const [only] = reach.pairs

      expect(reach.pending).toBe(10)
      expect(only?.conversion.share).toBe(0.25)
      expect(only?.conversion.readers).toBeNull()
      expect(only?.entry.readers).toBeNull()
    })

    it("divides two whole numbers rather than multiplying the share back up", () => {
      /** Seven in a hundred, times a hundred, is not seven in a float. */
      const reach = funnelReachOf(WHERE, [funnel("band", "form", 7, 7)], [views(100, 100)])

      expect(reach.pairs[0]?.conversion.readers).toBe(7)
    })
  })

  describe("the silences", () => {
    it("says unmeasured where the revision has no page-view row", () => {
      const reach = funnelReachOf(WHERE, [funnel("band", "form", 60, 15)], [])

      expect(reach.silence).toBe("unmeasured")
      expect(reach.pairs[0]?.conversion.share).toBeNull()
      expect(reach.pairs[0]?.lostBefore).toBeNull()
      expect(reach.pairs[0]?.worse).toBeNull()
      expect(reach.pairs[0]?.rateAtMost).toBeNull()
    })

    it("still gives the rate under a silence, because it needs no denominator", () => {
      const reach = funnelReachOf(WHERE, [funnel("band", "form", 60, 15)], [])

      expect(reach.pairs[0]?.rate).toBe(0.25)
    })

    it("says unopened where nothing marked an opening and rollups counted anyway", () => {
      const reach = funnelReachOf(WHERE, [funnel("band", "form", 60, 15)], [views(0, 90)])

      expect(reach.silence).toBe("unopened")
      expect(reach.exact).toBe(false)
    })

    it("says uncounted where readers arrived and no window has been folded", () => {
      const reach = funnelReachOf(WHERE, [funnel("band", "form", 0, 0)], [views(90, 0)])

      expect(reach.silence).toBe("uncounted")
    })
  })

  describe("rows that do not belong to the question", () => {
    it("ignores funnels and page views for another revision, and counts them", () => {
      const other = { treeId: TREE, revision: 9 } as const
      const reach = funnelReachOf(
        WHERE,
        [funnel("band", "form", 60, 15), funnel("band", "form", 1, 1, other)],
        [views(100, 100), views(3, 3, other)]
      )

      expect(reach.pairs).toHaveLength(1)
      expect(reach.pairs[0]?.reached).toBe(60)
      expect(reach.foreignPairs).toBe(1)
      expect(reach.foreign).toBe(1)
    })

    it("keeps the first of two rows naming one pair rather than adding them", () => {
      const reach = funnelReachOf(
        WHERE,
        [funnel("band", "form", 60, 15), funnel("band", "form", 60, 15)],
        [views(100, 100)]
      )

      expect(reach.pairs).toHaveLength(1)
      expect(reach.pairs[0]?.reached).toBe(60)
      expect(reach.duplicatedPairs).toBe(1)
    })

    /**
     * The double-count case this lane tests every counter against (0158). Two
     * reads of the store concatenated must not report twice the readers.
     */
    it("reports the same shares for a window read once and read twice", () => {
      const once = funnelReachOf(WHERE, [funnel("band", "form", 60, 15)], [views(100, 100)])
      const twice = funnelReachOf(
        WHERE,
        [funnel("band", "form", 60, 15), funnel("band", "form", 60, 15)],
        [views(100, 100), views(100, 100)]
      )

      expect(twice.pairs[0]?.conversion).toStrictEqual(once.pairs[0]?.conversion)
      expect(twice.opened).toBe(once.opened)
      expect(twice.duplicated).toBe(1)
      expect(twice.duplicatedPairs).toBe(1)
    })

    it("tells two pairs apart by the kinds of their ends and not only their nodes", () => {
      const viewedThenDone = funnel("band", "form", 60, 15)
      const pressedThenDone: StoredFunnel = {
        ...viewedThenDone,
        pair: {
          from: { nodeId: nodeId("band"), kind: "activated" },
          to: viewedThenDone.pair.to,
        },
        reached: 20,
        converted: 10,
      }

      const reach = funnelReachOf(WHERE, [viewedThenDone, pressedThenDone], [views(100, 100)])

      expect(reach.pairs).toHaveLength(2)
      expect(reach.duplicatedPairs).toBe(0)
    })

    it("reconciles a funnel every reader met, where reach equals the appearances", () => {
      /**
       * The boundary, and the ordinary case at it: a `from` on the root is in
       * the viewport of every page view the rollups counted.
       */
      const reach = funnelReachOf(WHERE, [funnel("root", "form", 100, 20)], [views(100, 100)])
      const [only] = reach.pairs

      expect(only?.unreconciled).toBe(false)
      expect(only?.entry.share).toBe(1)
      expect(only?.lostBefore).toBe(0)
      expect(only?.worse).toBe("between")
    })

    it("reports a funnel whose reach exceeds the page views rather than drawing it", () => {
      const reach = funnelReachOf(WHERE, [funnel("band", "form", 140, 90)], [views(100, 100)])
      const [only] = reach.pairs

      expect(only?.unreconciled).toBe(true)
      expect(only?.conversion.share).toBeNull()
      expect(only?.lostBefore).toBeNull()
      expect(only?.reached).toBe(140)
      expect(only?.rate).toBe(90 / 140)
    })
  })

  it("orders the pairs by their ends so a refresh does not reorder a screen", () => {
    const rows = [funnel("c", "z", 1, 1), funnel("a", "z", 2, 2), funnel("b", "z", 3, 3)]
    const forwards = funnelReachOf(WHERE, rows, [views(10, 10)])
    const backwards = funnelReachOf(WHERE, [...rows].reverse(), [views(10, 10)])

    expect(forwards.pairs.map((one) => one.pair.from.nodeId)).toStrictEqual([
      nodeId("a"),
      nodeId("b"),
      nodeId("c"),
    ])
    expect(backwards.pairs.map((one) => one.pair.from.nodeId)).toStrictEqual(
      forwards.pairs.map((one) => one.pair.from.nodeId)
    )
  })

  it("has no answer for a pair nothing reached, rather than nought", () => {
    const reach = funnelReachOf(WHERE, [funnel("band", "form", 0, 0)], [views(100, 100)])

    expect(reach.pairs[0]?.rate).toBeNull()
    expect(reach.pairs[0]?.rateAtMost).toBeNull()
    expect(reach.pairs[0]?.entry.share).toBe(0)
    expect(reach.pairs[0]?.worse).toBe("before")
  })

  it("carries the page-view arithmetic so a surface need not pair two readings up", () => {
    const reach = funnelReachOf(WHERE, [], [views(40, 50)])

    expect(reach).toMatchObject({
      treeId: TREE,
      revision: 1,
      opened: 40,
      appearances: 50,
      drift: 10,
      pending: 0,
      inflation: 0.25,
      updatedAt: AT,
      pairs: [],
    })
  })
})

describe("the stages as a closed set", () => {
  it("has a line for every member", () => {
    for (const stage of FUNNEL_STAGES) expect(describeFunnelStage(stage)).not.toBe("")

    expect(FUNNEL_STAGES).toHaveLength(2)
  })
})

/**
 * A door read whole over two forms, where the arithmetic is the part that can
 * be got wrong without anything failing (0299).
 *
 * Each of these is a figure that comes out right when it is summed per row and
 * wrong when it is taken from the two sums — which is the rule
 * `pageViewReadingOf` already states for revisions, holding for forms of one
 * revision for the same reason.
 */
describe("the arithmetic of a door summed over two forms", () => {
  const inAudience = (audienceId: typeof SKIERS, row: StoredPageViews): StoredPageViews => ({
    ...row,
    audienceId,
  })

  /**
   * The netting this subsystem must never do. One form is mid-collection and
   * the other has straddles; subtracting in the aggregate makes the page look
   * exactly measured, which is the one thing neither form is.
   */
  it("keeps a form's pending openings and another form's straddles apart", () => {
    const picked = pageViewsFor(WHERE, [
      inAudience(SKIERS, views(10, 4)),
      inAudience(RIDERS, views(4, 10)),
    ])

    expect(picked.measured?.opened).toBe(14)
    expect(picked.measured?.appearances).toBe(14)
    expect(picked.measured?.pending).toBe(6)
    expect(picked.measured?.drift).toBe(6)
  })

  /** A ratio is recomputed from the sums and never averaged over the forms. */
  it("takes inflation from the summed drift and the summed openings", () => {
    const picked = pageViewsFor(WHERE, [
      inAudience(SKIERS, views(100, 200)),
      inAudience(RIDERS, views(300, 300)),
    ])

    expect(picked.measured?.drift).toBe(100)
    expect(picked.measured?.inflation).toBe(0.25)
    expect(inflationFor(WHERE, [
      inAudience(SKIERS, views(100, 200)),
      inAudience(RIDERS, views(300, 300)),
    ])).toBe(0.25)
  })

  it("says the number last moved when the busiest form last moved it", () => {
    const picked = pageViewsFor(WHERE, [
      { ...inAudience(SKIERS, views(10, 10)), updatedAt: "2026-10-01T00:00:00.000Z" },
      { ...inAudience(RIDERS, views(10, 10)), updatedAt: "2026-10-05T09:00:00.000Z" },
    ])

    expect(picked.measured?.updatedAt).toBe("2026-10-05T09:00:00.000Z")
  })

  /**
   * The fold a reading waits on is the oldest one under it, so that a fold
   * which ran a minute ago on a busy form cannot vouch for a form whose
   * openings have been waiting a day.
   */
  it("waits on the oldest fold of the forms with openings pending", () => {
    const picked = pageViewsFor(WHERE, [
      { ...inAudience(SKIERS, views(10, 4)), foldedAt: "2026-10-01T00:00:00.000Z" },
      { ...inAudience(RIDERS, views(10, 4)), foldedAt: "2026-10-05T09:00:00.000Z" },
    ])

    expect(picked.measured?.foldedAt).toBe("2026-10-01T00:00:00.000Z")
  })

  /**
   * And a quiet form cannot invent a stall. Nothing is waiting on the fold that
   * has not run in days, because that form's openings are all folded.
   */
  it("ignores the old fold of a form with nothing pending", () => {
    const picked = pageViewsFor(WHERE, [
      { ...inAudience(SKIERS, views(10, 10)), foldedAt: "2026-10-01T00:00:00.000Z" },
      { ...inAudience(RIDERS, views(10, 4)), foldedAt: "2026-10-05T09:00:00.000Z" },
    ])

    expect(picked.measured?.pending).toBe(6)
    expect(picked.measured?.foldedAt).toBe("2026-10-05T09:00:00.000Z")
  })

  it("attests no fold where neither form's row says anything", () => {
    const picked = pageViewsFor(WHERE, [inAudience(SKIERS, views(10, 4)), views(4, 10)])

    expect(picked.measured?.foldedAt).toBeUndefined()
  })

  /** An instant nothing can read attests no fold (0274), so it is not the oldest. */
  it("skips a fold instant that does not parse", () => {
    const picked = pageViewsFor(WHERE, [
      { ...inAudience(SKIERS, views(10, 4)), foldedAt: "whenever" },
      { ...inAudience(RIDERS, views(10, 4)), foldedAt: "2026-10-05T09:00:00.000Z" },
    ])

    expect(picked.measured?.foldedAt).toBe("2026-10-05T09:00:00.000Z")
  })
})
