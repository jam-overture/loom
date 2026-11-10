import { describe, expect, it } from "vitest"

import type { AudienceId } from "../audience/audience.js"
import type { TreeId } from "../ids.js"
import type { JsonObject } from "../json.js"
import type { PrimitiveRole } from "../role.js"
import {
  nodeId,
  OTHER_TREE,
  primitiveType,
  RIDERS,
  SKIERS,
  TREE,
} from "../testing/reader-signal-contract.js"
import type { ElementNode, LoomNode, SlotNode, TextNode } from "../tree/node.js"
import { TREE_SCHEMA_VERSION, type LoomTree } from "../tree/tree.js"

import {
  deploymentUnreadOf,
  describeUnreadStanding,
  largestUnreachedIn,
  pageFrontierOf,
  pageReadingOf,
  UNREAD_STANDINGS,
  worstPlacesIn,
  type PageFrontier,
  type PartDeclarations,
  type ReaderTally,
} from "./index.js"

/**
 * The order is a pure function of the frontier readings, so the fixtures are
 * trees and windows of counters: nothing here reaches a store, a clock, a
 * registry or a browser.
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

const text = (name: string, value: string): TextNode => ({
  kind: "text",
  id: nodeId(name),
  value,
})

const slot = (name: string, children: readonly LoomNode[]): SlotNode => ({
  kind: "slot",
  id: nodeId(name),
  name: "children" as SlotNode["name"],
  children,
})

const treeOf = (root: ElementNode, treeId: TreeId = TREE, revision = 1): LoomTree => ({
  treeId,
  schemaVersion: TREE_SCHEMA_VERSION,
  revision,
  root,
})

const declaring = (
  copy: Readonly<Record<string, readonly string[]>>,
  roles: Readonly<Partial<Record<PrimitiveRole, readonly string[]>>> = {}
): PartDeclarations => ({
  copyFor: (type) => copy[type],
  typesWithRole: (role) => (roles[role] ?? []).map((type) => primitiveType(type)),
})

const DECLARED = declaring(
  {
    "loom.stack": [],
    "loom.section": [],
    "loom.heading": ["value"],
    "loom.button": ["label"],
  },
  { heading: ["loom.heading"] }
)

const tally = (
  name: string,
  type: string,
  counters: Partial<ReaderTally> & { readonly audienceId?: AudienceId } = {}
): ReaderTally & { readonly audienceId?: AudienceId } => ({
  treeId: TREE,
  revision: 1,
  nodeId: nodeId(name),
  type: primitiveType(type),
  views: 0,
  reached: 0,
  engaged: 0,
  dwellMs: 0,
  activations: 0,
  opens: 0,
  closes: 0,
  completions: 0,
  ...counters,
})

const reached = (
  name: string,
  type: string,
  views: number,
  counters: Partial<ReaderTally> & { readonly audienceId?: AudienceId } = {}
): ReaderTally & { readonly audienceId?: AudienceId } =>
  tally(name, type, { views, reached: views, ...counters })

/**
 * **One unread band, four parts behind it.** A heading, a pricing band three
 * parts deep behind a slot, an about band with a heading in it, and a footer:
 * nine parts.
 */
const BAND_PAGE = element("page", "loom.stack", {}, [
  element("hero", "loom.heading", { value: "Winter range" }),
  element("pricing", "loom.section", {}, [
    slot("pricingslot", [
      element("row", "loom.section", {}, [
        element("price", "loom.heading", { value: "From 240" }),
        element("buy", "loom.button", { label: "Buy a pass" }),
      ]),
    ]),
  ]),
  element("about", "loom.section", {}, [
    element("blurb", "loom.heading", { value: "Who we are" }),
  ]),
  element("footer", "loom.section", {}, [text("legal", "All rights reserved")]),
])

/** The root, the heading and the about band were reached, and nothing else was. */
const BAND_WINDOW: readonly (ReaderTally & { readonly audienceId?: AudienceId })[] = [
  reached("page", "loom.stack", 12),
  reached("hero", "loom.heading", 11),
  reached("about", "loom.section", 7),
]

/**
 * **Eight unread leaves at the top level, one part behind each.** Ten parts, and
 * more unread parts in more places than the band page has — which is the whole
 * comparison this order exists to get the right way round.
 */
const LEAF_PAGE = element("page", "loom.stack", {}, [
  element("hero", "loom.heading", { value: "Notes" }),
  ...Array.from({ length: 8 }, (_, nth) =>
    element(`note${nth}`, "loom.heading", { value: `Footnote ${nth}` })
  ),
])

const LEAF_WINDOW: readonly (ReaderTally & { readonly audienceId?: AudienceId })[] = [
  { ...reached("page", "loom.stack", 30), treeId: OTHER_TREE },
  { ...reached("hero", "loom.heading", 28), treeId: OTHER_TREE },
]

const frontierOf = (
  root: ElementNode,
  tallies: readonly (ReaderTally & { readonly audienceId?: AudienceId })[],
  treeId: TreeId = TREE,
  revision = 1,
  audience?: AudienceId
): PageFrontier =>
  pageFrontierOf(pageReadingOf(treeOf(root, treeId, revision), tallies, DECLARED, audience))

const BAND = frontierOf(BAND_PAGE, BAND_WINDOW)
const LEAVES = frontierOf(LEAF_PAGE, LEAF_WINDOW, OTHER_TREE)

describe("deploymentUnreadOf", () => {
  /**
   * The reason the module exists. The leaf page has more unread parts (8 to 6)
   * in more places (8 to 3), and the band page is the one to go and look at,
   * because one fix there recovers four parts and one fix on the leaf page
   * recovers one.
   */
  it("orders by what one fix recovers and not by how much went unread", () => {
    const unread = deploymentUnreadOf([LEAVES, BAND])

    expect(LEAVES.unseen).toBeGreaterThan(BAND.unseen)
    expect(LEAVES.frontier.length).toBeGreaterThan(BAND.frontier.length)

    expect(unread.ranked.map((row) => row.treeId)).toEqual([TREE, OTHER_TREE])
    expect(unread.ranked.map((row) => row.costs)).toEqual([4, 1])
    expect(unread.worst?.treeId).toBe(TREE)
    expect(unread.worst?.at?.nodeId).toBe(nodeId("pricing"))
  })

  it("takes the page's worst place from largestUnreachedIn rather than choosing again", () => {
    const unread = deploymentUnreadOf([BAND, LEAVES])

    for (const row of unread.ranked) {
      expect(row.at).toEqual(largestUnreachedIn(row.reading, 1)[0])
      expect(row.costs).toBe(row.at?.unseen)
      expect(row.share).toBeCloseTo((row.at?.unseen ?? 0) / row.reading.parts)
    }
  })

  it("publishes the parts and the places side by side and adds neither into the other", () => {
    const unread = deploymentUnreadOf([BAND, LEAVES])

    expect(unread.unseen).toBe(14)
    expect(unread.places).toBe(11)
    expect(unread.standings.ranked).toBe(2)
    expect(unread.trees).toBe(2)
  })

  /**
   * The sums are over the ranked rows, so the figures a wrong pair produces are
   * on the row and in no total.
   */
  it("leaves a mismatched page's figures out of the sums and keeps its reading whole", () => {
    const mismatched = frontierOf(BAND_PAGE, [
      ...BAND_WINDOW,
      reached("ghost", "loom.heading", 4),
    ])

    expect(mismatched.orphaned).toBe(1)
    expect(mismatched.frontier.length).toBeGreaterThan(0)

    const unread = deploymentUnreadOf([mismatched, LEAVES])
    const row = unread.unranked.find((page) => page.treeId === TREE)

    expect(row?.standing).toBe("mismatched")
    expect(row?.at).toBeNull()
    expect(row?.costs).toBeNull()
    expect(row?.share).toBeNull()
    expect(row?.reading.frontier.length).toBeGreaterThan(0)

    expect(unread.ranked.map((page) => page.treeId)).toEqual([OTHER_TREE])
    expect(unread.unseen).toBe(LEAVES.unseen)
    expect(unread.places).toBe(LEAVES.frontier.length)
  })

  it("calls a page nobody opened unread and never whole", () => {
    const unopened = frontierOf(BAND_PAGE, [])

    expect(unopened.views).toBe(0)
    expect(unopened.frontier).toEqual([])

    const row = deploymentUnreadOf([unopened]).unranked[0]

    expect(row?.standing).toBe("unread")
    expect(row?.costs).toBeNull()
  })

  it("calls a page every part of which was reached whole", () => {
    const whole = frontierOf(BAND_PAGE, [
      reached("page", "loom.stack", 12),
      reached("hero", "loom.heading", 11),
      reached("pricing", "loom.section", 10),
      reached("row", "loom.section", 9),
      reached("price", "loom.heading", 9),
      reached("buy", "loom.button", 5),
      reached("about", "loom.section", 7),
      reached("blurb", "loom.heading", 6),
      reached("footer", "loom.section", 3),
    ])

    expect(whole.unseen).toBe(0)

    const unread = deploymentUnreadOf([whole])

    expect(unread.unranked[0]?.standing).toBe("whole")
    expect(unread.worst).toBeNull()
    expect(unread.places).toBe(0)
  })

  /**
   * A window read as neither of two forms has a view floor of nought while its
   * counters are full, so the comforting answer here is the same `unread` an
   * empty window earns — and it is the wrong one.
   */
  it("calls a window holding two forms unsplit rather than unread", () => {
    const mixed = frontierOf(BAND_PAGE, [
      reached("page", "loom.stack", 12, { audienceId: SKIERS }),
      reached("hero", "loom.heading", 11, { audienceId: RIDERS }),
    ])

    expect(mixed.views).toBe(0)
    expect(mixed.audiences).toEqual([RIDERS, SKIERS])

    expect(deploymentUnreadOf([mixed]).unranked[0]?.standing).toBe("unsplit")
  })

  /**
   * The finding this closes: a frontier that dropped the audience handed an
   * order two forms of one page it could not tell apart, and the second would
   * have been counted as the first handed in twice.
   */
  it("stands two forms of one page as two rows", () => {
    const window = [
      reached("page", "loom.stack", 12, { audienceId: SKIERS }),
      reached("hero", "loom.heading", 11, { audienceId: SKIERS }),
      reached("page", "loom.stack", 4, { audienceId: RIDERS }),
    ]

    const skiers = frontierOf(BAND_PAGE, window, TREE, 1, SKIERS)
    const riders = frontierOf(BAND_PAGE, window, TREE, 1, RIDERS)
    const unread = deploymentUnreadOf([skiers, riders])

    expect(skiers.audienceId).toBe(SKIERS)
    expect(riders.audienceId).toBe(RIDERS)
    expect(unread.duplicated).toBe(0)
    expect(unread.ranked.map((row) => row.audienceId)).toEqual([RIDERS, SKIERS])
    expect(unread.standings.ranked).toBe(2)
  })

  /** Counting one page twice is permanent, so the second reading is dropped and said. */
  it("counts a page handed in twice once", () => {
    const once = deploymentUnreadOf([BAND, LEAVES])
    const twice = deploymentUnreadOf([BAND, LEAVES, BAND, LEAVES])

    expect(twice.duplicated).toBe(2)
    expect(twice.ranked).toEqual(once.ranked)
    expect(twice.unseen).toBe(once.unseen)
    expect(twice.places).toBe(once.places)
    expect(twice.standings).toEqual(once.standings)
    expect(twice.trees).toBe(once.trees)
  })

  it("keeps the first of two readings of one page and not the last", () => {
    const thin = frontierOf(BAND_PAGE, [reached("page", "loom.stack", 1)])
    const unread = deploymentUnreadOf([BAND, thin])

    expect(unread.duplicated).toBe(1)
    expect(unread.ranked[0]?.reading).toBe(BAND)
  })

  it("stands two revisions of one tree as two rows, newest first", () => {
    const older = frontierOf(BAND_PAGE, BAND_WINDOW)
    const newer = frontierOf(
      BAND_PAGE,
      BAND_WINDOW.map((row) => ({ ...row, revision: 2 })),
      TREE,
      2
    )

    const unread = deploymentUnreadOf([older, newer])

    expect(unread.trees).toBe(1)
    expect(unread.standings.ranked).toBe(2)
    expect(unread.ranked.map((row) => row.revision)).toEqual([2, 1])
  })

  it("orders two pages of equal cost by the share of the page one place hides", () => {
    const small = element("page", "loom.stack", {}, [
      element("about", "loom.section", {}, [
        element("blurb", "loom.heading", { value: "Who we are" }),
      ]),
    ])

    const tight = frontierOf(
      small,
      [{ ...reached("page", "loom.stack", 5), treeId: OTHER_TREE }],
      OTHER_TREE
    )
    const loose = frontierOf(BAND_PAGE, [
      reached("page", "loom.stack", 12),
      reached("hero", "loom.heading", 11),
      reached("pricing", "loom.section", 10),
      reached("row", "loom.section", 9),
      reached("price", "loom.heading", 9),
      reached("buy", "loom.button", 5),
      reached("footer", "loom.section", 3),
    ])

    expect(tight.frontier[0]?.unseen).toBe(2)
    expect(loose.frontier[0]?.unseen).toBe(2)

    const unread = deploymentUnreadOf([loose, tight])

    expect(unread.ranked.map((row) => row.treeId)).toEqual([OTHER_TREE, TREE])
    expect(unread.ranked.map((row) => row.share)).toEqual([2 / 3, 2 / 9])
  })

  /**
   * A part that said nothing while a part inside it reported reach is a
   * primitive to fix in the library, so it is its own list — and a slice, so no
   * page is counted twice by it.
   */
  it("names a page that reports nothing below a reader as a slice of the rows", () => {
    const quiet = frontierOf(BAND_PAGE, [
      reached("page", "loom.stack", 12),
      reached("price", "loom.heading", 6),
    ])

    expect(quiet.notReporting).toEqual([nodeId("pricing"), nodeId("row")])

    const unread = deploymentUnreadOf([quiet, LEAVES])

    expect(unread.notReporting.map((row) => row.treeId)).toEqual([TREE])
    expect(unread.notReporting[0]).toBe(unread.ranked.find((row) => row.treeId === TREE))
    expect(unread.standings.ranked).toBe(2)
  })

  /**
   * And it is over every row, not over the ranked ones. A primitive that does
   * not report is a fault in the library whether or not the tree and the window
   * this page was read with belong together — and the page whose figures are
   * withheld is the one where nothing else would say so.
   */
  it("names a page that reports nothing below a reader even where the order withheld its figures", () => {
    const quiet = frontierOf(BAND_PAGE, [
      reached("page", "loom.stack", 12),
      reached("price", "loom.heading", 6),
      reached("ghost", "loom.heading", 4),
    ])

    expect(quiet.orphaned).toBe(1)
    expect(quiet.notReporting).toEqual([nodeId("pricing"), nodeId("row")])

    const unread = deploymentUnreadOf([quiet])

    expect(unread.ranked).toEqual([])
    expect(unread.notReporting.map((row) => row.standing)).toEqual(["mismatched"])
    expect(unread.notReporting[0]).toBe(unread.unranked[0])
  })

  it("counts every row in exactly one standing", () => {
    const unread = deploymentUnreadOf([
      BAND,
      LEAVES,
      frontierOf(BAND_PAGE, [], TREE, 3),
      frontierOf(BAND_PAGE, [...BAND_WINDOW, reached("ghost", "loom.heading", 4)], TREE, 4),
    ])

    const counted = UNREAD_STANDINGS.reduce(
      (total, standing) => total + unread.standings[standing],
      0
    )

    expect(counted).toBe(unread.ranked.length + unread.unranked.length)
    expect(counted).toBe(4)
  })

  it("says nothing about a deployment nobody handed it", () => {
    const unread = deploymentUnreadOf([])

    expect(unread.ranked).toEqual([])
    expect(unread.unranked).toEqual([])
    expect(unread.worst).toBeNull()
    expect(unread.places).toBe(0)
    expect(unread.unseen).toBe(0)
    expect(unread.trees).toBe(0)
    expect(unread.duplicated).toBe(0)
    expect(unread.notReporting).toEqual([])
  })
})

describe("worstPlacesIn", () => {
  it("orders every place across the deployment by what each accounts for", () => {
    const unread = deploymentUnreadOf([LEAVES, BAND])
    const places = worstPlacesIn(unread)

    expect(places.length).toBe(unread.places)
    expect(places[0]?.at.nodeId).toBe(nodeId("pricing"))
    expect(places[0]?.treeId).toBe(TREE)
    expect(places[0]?.at).toBe(unread.worst?.at)
    expect(places.map((place) => place.at.unseen)).toEqual([4, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1])
  })

  it("keeps the page order and then the page's own reading order on a tie", () => {
    const places = worstPlacesIn(deploymentUnreadOf([LEAVES, BAND]))
    const ties = places.filter((place) => place.at.unseen === 1)

    expect(ties.map((place) => place.treeId)).toEqual([
      TREE,
      TREE,
      OTHER_TREE,
      OTHER_TREE,
      OTHER_TREE,
      OTHER_TREE,
      OTHER_TREE,
      OTHER_TREE,
      OTHER_TREE,
      OTHER_TREE,
    ])
    expect(ties.slice(0, 2).map((place) => place.at.nodeId)).toEqual([
      nodeId("blurb"),
      nodeId("footer"),
    ])
  })

  it("takes a limit", () => {
    expect(worstPlacesIn(deploymentUnreadOf([BAND, LEAVES]), 2).map((place) => place.at.unseen))
      .toEqual([4, 1])
  })

  it("leaves out the places of a page the order did not rank", () => {
    const mismatched = frontierOf(BAND_PAGE, [
      ...BAND_WINDOW,
      reached("ghost", "loom.heading", 4),
    ])

    const places = worstPlacesIn(deploymentUnreadOf([mismatched]))

    expect(mismatched.frontier.length).toBe(3)
    expect(places).toEqual([])
  })
})

describe("describeUnreadStanding", () => {
  it("has a line for every member and no two alike", () => {
    const lines = UNREAD_STANDINGS.map(describeUnreadStanding)

    expect(new Set(lines).size).toBe(UNREAD_STANDINGS.length)
    for (const line of lines) expect(line.length).toBeGreaterThan(0)
  })
})
