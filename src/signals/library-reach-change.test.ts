import { describe, expect, it } from "vitest"

import { DEFAULT_AUDIENCE_ID } from "../audience/audience.js"
import type { TreeId } from "../ids.js"
import type { JsonObject } from "../json.js"
import { nodeId, OTHER_TREE, primitiveType, TREE } from "../testing/reader-signal-contract.js"
import type { ElementNode, LoomNode } from "../tree/node.js"
import { TREE_SCHEMA_VERSION, type LoomTree } from "../tree/tree.js"

import {
  describeKindReachChangeSilence,
  describeKindReachMovement,
  describeReaderShareCause,
  describeReadingSide,
  KIND_REACH_CHANGE_SILENCES,
  KIND_REACH_MOVEMENTS,
  libraryChangeOf,
  libraryReachChangeOf,
  libraryReachOf,
  pageReadingOf,
  READER_SHARE_CAUSES,
  READING_SIDES,
  type KindReachChange,
  type LibraryWindow,
  type PartDeclarations,
  type ReaderTally,
  type StoredPageViews,
} from "./index.js"

/**
 * Built on real readings and real door rows on both sides, because that is what
 * the function takes: two windows of a library, each with the page-view rows
 * that put its pages on one scale.
 *
 * The two cases the arithmetic exists for are built literally rather than
 * described — two pages swapping their traffic with every reader reading exactly
 * as before, and a rollup window that inflates one window's counts and not the
 * other's — so the assertions that say the figure survives them are testing the
 * arithmetic rather than restating it.
 */

const BODY_IS_COPY: PartDeclarations = {
  copyFor: (type) => (type === "loom.section" ? ["body"] : undefined),
  typesWithRole: () => [],
}

/**
 * Two types playing one part, which is the only way a recast place can be held
 * still: the role vocabulary has one member today (0114), so `heading` is what a
 * test that needs two types of one role has to use.
 */
const QUOTES_ARE_HEADINGS: PartDeclarations = {
  copyFor: (type) => (type === "loom.section" ? ["body"] : undefined),
  typesWithRole: (role) =>
    role === "heading"
      ? [primitiveType("loom.quote"), primitiveType("loom.testimonial")]
      : [],
}

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

const treeOf = (root: ElementNode, revision = 1, treeId: TreeId = TREE): LoomTree => ({
  treeId,
  schemaVersion: TREE_SCHEMA_VERSION,
  revision,
  root,
})

const tally = (
  name: string,
  counts: Partial<ReaderTally>,
  tree: LoomTree
): ReaderTally => ({
  treeId: tree.treeId,
  revision: tree.revision,
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
  ...counts,
})

const row = (counts: Partial<StoredPageViews> = {}): StoredPageViews => ({
  audienceId: DEFAULT_AUDIENCE_ID,
  treeId: TREE,
  revision: 1,
  opened: 0,
  appearances: 0,
  updatedAt: "2026-10-14T00:00:00.000Z",
  ...counts,
})

/** A page whose one band of interest is a quote, which is the kind every case below is about. */
const page = ({
  revision = 1,
  treeId = TREE,
  quote = "loom.quote",
}: { revision?: number; treeId?: TreeId; quote?: string } = {}): LoomTree =>
  treeOf(
    element("page", "loom.stack", {}, [
      element("intro", "loom.section", { body: "a line somebody wrote" }),
      element("quote", quote, { body: "what a reader said" }),
    ]),
    revision,
    treeId
  )

/**
 * One page of one window: the door's two numbers, the page views the root
 * reports, and the reach of the quote — or nothing at all for it, which is the
 * only way a place reads `skipped` rather than `unknown` (0212).
 */
const read = (
  tree: LoomTree,
  {
    opened,
    appearances,
    reached,
    declarations = BODY_IS_COPY,
  }: {
    opened: number
    appearances: number
    reached: number | null
    declarations?: PartDeclarations
  }
): { readonly reading: ReturnType<typeof pageReadingOf>; readonly row: StoredPageViews } => ({
  reading: pageReadingOf(
    tree,
    [
      tally("page", { views: appearances, reached: appearances }, tree),
      ...(reached === null ? [] : [tally("quote", { views: appearances, reached }, tree)]),
    ],
    declarations
  ),
  row: row({ treeId: tree.treeId, revision: tree.revision, opened, appearances }),
})

const windowOf = (
  pages: readonly { readonly reading: ReturnType<typeof pageReadingOf>; readonly row: StoredPageViews }[]
): LibraryWindow => ({
  readings: pages.map((of) => of.reading),
  rows: pages.map((of) => of.row),
})

const typeRow = (
  change: { readonly byType: readonly KindReachChange[] },
  type: string
): KindReachChange | undefined =>
  change.byType.find((of) => of.kind.by === "type" && of.kind.type === type)

const roleRow = (
  change: { readonly byRole: readonly KindReachChange[] },
  role: string | null
): KindReachChange | undefined =>
  change.byRole.find((of) => of.kind.by === "role" && of.kind.role === role)


describe("a kind of part against the readers who met it, before and after", () => {
  /**
   * The reason this unit exists beside the places comparison. The quote stands
   * in one place, it was read in that place and it is read in it still, so a
   * share of places says `held` and has nothing else available to say — while
   * three readers in ten who met it and did not read it now do.
   */
  it("answers where a comparison of places is silent, because the place never changed hands", () => {
    const tree = page()
    const was = read(tree, { opened: 100, appearances: 100, reached: 40 })
    const now = read(tree, { opened: 100, appearances: 100, reached: 70 })

    const readers = libraryReachChangeOf(windowOf([was]), windowOf([now]))
    const places = libraryChangeOf([was.reading], [now.reading])
    const quote = typeRow(readers, "loom.quote")

    expect(
      places.byType.find((of) => of.kind.by === "type" && of.kind.type === "loom.quote")?.movement
    ).toBe("held")
    expect(quote?.movement).toBe("taken-up")
    expect(quote?.shareWas).toBe(0.4)
    expect(quote?.shareNow).toBe(0.7)
    expect(quote?.shift).toBeCloseTo(0.3, 10)
    expect(quote?.readersMoved).toBeCloseTo(30, 10)
    expect(quote?.cause).toBe("readers")
    expect(quote?.weightMoved).toBe(0)
    expect(quote?.exact).toBe(true)
  })

  /**
   * The number this reading and §24's share the arithmetic of, asserted exactly
   * rather than closely: a surface drawing one window's share beside this
   * comparison's `shareNow` is drawing the same number, and it would not be if
   * the terms were multiplied and divided in two orders.
   */
  it("gives the later window the share a single window's reading gives it, to the last bit", () => {
    const busy = page({ treeId: TREE })
    const quiet = page({ treeId: OTHER_TREE })
    const side = [
      read(busy, { opened: 97, appearances: 97, reached: 41 }),
      read(quiet, { opened: 13, appearances: 13, reached: 7 }),
    ]
    const window = windowOf(side)

    const change = libraryReachChangeOf(window, window)
    const one = libraryReachOf(window.readings, window.rows)

    expect(typeRow(change, "loom.quote")?.shareNow).toBe(
      one.byType.find((of) => of.kind.by === "type" && of.kind.type === "loom.quote")?.share
    )
    expect(typeRow(change, "loom.quote")?.metNow).toBe(
      one.byType.find((of) => of.kind.by === "type" && of.kind.type === "loom.quote")?.met
    )
  })

  /**
   * The movement stated at the later window's scale, which is the figure the
   * reading ranks by: a tenth gained among a thousand readers is a bigger fact
   * than a tenth gained among ten, and the scale that says so is the one the
   * kind has **now**.
   */
  it("states the movement in the readers it is worth now, and not in the readers it had", () => {
    const tree = page()

    const change = libraryReachChangeOf(
      windowOf([read(tree, { opened: 100, appearances: 100, reached: 40 })]),
      windowOf([read(tree, { opened: 200, appearances: 200, reached: 140 })])
    )

    const quote = typeRow(change, "loom.quote")

    expect(quote?.countedWas).toBe(100)
    expect(quote?.countedNow).toBe(200)
    expect(quote?.shift).toBeCloseTo(0.3, 10)
    expect(quote?.readersMoved).toBeCloseTo(60, 10)
    expect(change.arrivalsWas).toBe(100)
    expect(change.arrivalsNow).toBe(200)
  })

  /**
   * The case the whole design is for: two pages swap their traffic, every place
   * is read exactly as well as it was, and the weighted figure falls by half its
   * range. The counterfactual that holds the traffic still returns the earlier
   * share **exactly**, which is what makes `pages` a verdict rather than a guess.
   */
  it("says the pages moved and not the readers, where the traffic swapped and no place changed", () => {
    const here = page({ treeId: TREE })
    const there = page({ treeId: OTHER_TREE })

    const change = libraryReachChangeOf(
      windowOf([
        read(here, { opened: 10, appearances: 10, reached: 2 }),
        read(there, { opened: 90, appearances: 90, reached: 72 }),
      ]),
      windowOf([
        read(here, { opened: 90, appearances: 90, reached: 18 }),
        read(there, { opened: 10, appearances: 10, reached: 8 }),
      ])
    )

    const quote = typeRow(change, "loom.quote")

    expect(quote?.shareWas).toBeCloseTo(0.74, 10)
    expect(quote?.shareNow).toBeCloseTo(0.26, 10)
    expect(quote?.movement).toBe("abandoned")
    expect(quote?.ifTrafficHeld).toBeCloseTo(0.74, 10)
    expect(quote?.ifReadingHeld).toBeCloseTo(0.26, 10)
    expect(quote?.cause).toBe("pages")
    expect(quote?.weightMoved).toBeCloseTo(0.8, 10)
    expect(quote?.comparable).toBe(2)
    expect(quote?.pages).toBe(2)
  })

  /**
   * The interaction, which is why no additive split is published: the traffic
   * moved toward the page whose reading moved, so neither factor alone carries
   * the movement and the two together do.
   */
  it("attributes a movement to the two together where traffic moved toward what changed", () => {
    const here = page({ treeId: TREE })
    const there = page({ treeId: OTHER_TREE })

    const change = libraryReachChangeOf(
      windowOf([
        read(here, { opened: 10, appearances: 10, reached: null }),
        read(there, { opened: 90, appearances: 90, reached: 45 }),
      ]),
      windowOf([
        read(here, { opened: 90, appearances: 90, reached: 90 }),
        read(there, { opened: 10, appearances: 10, reached: 3 }),
      ])
    )

    const quote = typeRow(change, "loom.quote")

    expect(quote?.shareWas).toBeCloseTo(0.45, 10)
    expect(quote?.shareNow).toBeCloseTo(0.93, 10)
    expect(quote?.ifTrafficHeld).toBeCloseTo(0.37, 10)
    expect(quote?.ifReadingHeld).toBeCloseTo(0.05, 10)
    expect(quote?.cause).toBe("together")
    expect(quote?.movement).toBe("taken-up")
  })

  /**
   * Both factors pointing the same way, which is the ordinary case and the one
   * that must not be reported as either factor alone.
   */
  it("attributes a movement to either where the readers and the pages both carry it", () => {
    const here = page({ treeId: TREE })
    const there = page({ treeId: OTHER_TREE })

    const change = libraryReachChangeOf(
      windowOf([
        read(here, { opened: 50, appearances: 50, reached: 5 }),
        read(there, { opened: 50, appearances: 50, reached: 15 }),
      ]),
      windowOf([
        read(here, { opened: 10, appearances: 10, reached: 4 }),
        read(there, { opened: 90, appearances: 90, reached: 45 }),
      ])
    )

    const quote = typeRow(change, "loom.quote")

    expect(quote?.shareWas).toBeCloseTo(0.2, 10)
    expect(quote?.shareNow).toBeCloseTo(0.49, 10)
    expect(quote?.ifTrafficHeld).toBeCloseTo(0.45, 10)
    expect(quote?.ifReadingHeld).toBeCloseTo(0.28, 10)
    expect(quote?.cause).toBe("either")
    expect(quote?.movement).toBe("taken-up")
  })

  /**
   * The two decompositions of one movement, and the fact that they differ. Both
   * add up exactly, which is why publishing one as *how much of this was
   * traffic* would be publishing a number the other contradicts.
   */
  it("adds up both ways and the two ways disagree, which is why neither is published", () => {
    const here = page({ treeId: TREE })
    const there = page({ treeId: OTHER_TREE })

    const change = libraryReachChangeOf(
      windowOf([
        read(here, { opened: 10, appearances: 10, reached: null }),
        read(there, { opened: 90, appearances: 90, reached: 45 }),
      ]),
      windowOf([
        read(here, { opened: 90, appearances: 90, reached: 90 }),
        read(there, { opened: 10, appearances: 10, reached: 3 }),
      ])
    )

    const quote = typeRow(change, "loom.quote")
    const shareWas = quote?.shareWas ?? 0
    const shareNow = quote?.shareNow ?? 0
    const readersFirst = (quote?.ifTrafficHeld ?? 0) - shareWas
    const pagesFirst = (quote?.ifReadingHeld ?? 0) - shareWas

    expect(readersFirst + (shareNow - (quote?.ifTrafficHeld ?? 0))).toBeCloseTo(
      quote?.shift ?? 0,
      10
    )
    expect(pagesFirst + (shareNow - (quote?.ifReadingHeld ?? 0))).toBeCloseTo(
      quote?.shift ?? 0,
      10
    )
    expect(readersFirst).not.toBeCloseTo(pagesFirst, 5)
  })

  /**
   * The straddle 0147 names, simulated the way a deployment produces one: a
   * rollup window shorter than a visit scales a page's appearances and every
   * reach against it by the same factor. It is in both terms of that page's own
   * share, so it divides out there — and it is **each window's own**, so a
   * comparison that did not put every term on its door's scale would move.
   */
  it("cannot be moved by a rollup window that inflates one window's counts and not the other's", () => {
    const tree = page()
    const shareOf = (straddle: number) =>
      libraryReachChangeOf(
        windowOf([read(tree, { opened: 100, appearances: 100, reached: 40 })]),
        windowOf([
          read(tree, {
            opened: 100,
            appearances: 100 * straddle,
            reached: 70 * straddle,
          }),
        ])
      )

    const honest = typeRow(shareOf(1), "loom.quote")
    const inflated = typeRow(shareOf(3), "loom.quote")

    expect(honest?.shareNow).toBeCloseTo(0.7, 10)
    expect(inflated?.shareNow).toBeCloseTo(0.7, 10)
    expect(inflated?.shift).toBeCloseTo(honest?.shift ?? 0, 10)
    expect(inflated?.cause).toBe("readers")
    expect(inflated?.driftNow).toBe(200)
    expect(inflated?.exact).toBe(false)
  })

  /**
   * The correction 0250 made before an order over pages could mean anything,
   * holding across two windows: a page whose rollup window is shorter than its
   * visits reports inflated appearances, and weighting by those would weigh the
   * page readers linger on most heavily. Here it would invent a movement of a
   * quarter of the range out of a straddle in one window — every reader having
   * read exactly as they did.
   */
  it("weighs a straddling page by what the door counted, so a short window invents no movement", () => {
    const busy = page({ treeId: TREE })
    const quiet = page({ treeId: OTHER_TREE })
    const sideOf = (straddle: number) =>
      windowOf([
        read(busy, {
          opened: 100,
          appearances: 100 * straddle,
          reached: 100 * straddle,
        }),
        read(quiet, { opened: 100, appearances: 100, reached: null }),
      ])

    const change = libraryReachChangeOf(sideOf(3), sideOf(1))
    const quote = typeRow(change, "loom.quote")

    expect(quote?.shareWas).toBe(0.5)
    expect(quote?.shareNow).toBe(0.5)
    expect(quote?.countedWas).toBe(200)
    expect(quote?.countedNow).toBe(200)
    expect(quote?.shift).toBe(0)
    expect(quote?.movement).toBe("held")
    expect(quote?.driftWas).toBe(200)
    expect(quote?.weightMoved).toBe(0)
  })

  /**
   * One window held against itself, which is the identity case and the only
   * place `held` is reachable without a float landing exactly.
   */
  it("reports a window held against itself as held everywhere, with nothing moved", () => {
    const tree = page()
    const one = windowOf([read(tree, { opened: 40, appearances: 40, reached: 12 })])

    const change = libraryReachChangeOf(one, one)
    const quote = typeRow(change, "loom.quote")

    expect(quote?.shift).toBe(0)
    expect(quote?.movement).toBe("held")
    expect(quote?.cause).toBe(null)
    expect(quote?.weightMoved).toBe(0)
    expect(quote?.readersMoved).toBe(0)
    expect(change.gained).toBe(0)
    expect(change.lost).toBe(0)
    expect(change.republished).toBe(0)
  })

  /**
   * The double count 0158 exists for, in the two shapes a caller can produce it:
   * a reading handed in twice, and a door row handed in twice. Either one would
   * double a page's weight and so halve or double every share taken against it,
   * and this reading is weighted by exactly those numbers.
   */
  it("counts a page once when a caller hands in its reading twice or its row twice", () => {
    const tree = page()
    const was = read(tree, { opened: 100, appearances: 100, reached: 40 })
    const now = read(tree, { opened: 100, appearances: 100, reached: 70 })
    const once = libraryReachChangeOf(windowOf([was]), windowOf([now]))

    const readingTwice = libraryReachChangeOf(
      windowOf([was]),
      { readings: [now.reading, now.reading], rows: [now.row] }
    )
    const rowTwice = libraryReachChangeOf(windowOf([was]), {
      readings: [now.reading],
      rows: [now.row, now.row],
    })

    expect(readingTwice.duplicated).toBe(1)
    expect(rowTwice.duplicatedRows).toBe(1)

    for (const twice of [readingTwice, rowTwice]) {
      expect(typeRow(twice, "loom.quote")?.countedNow).toBe(
        typeRow(once, "loom.quote")?.countedNow
      )
      expect(typeRow(twice, "loom.quote")?.shareNow).toBe(typeRow(once, "loom.quote")?.shareNow)
      expect(twice.arrivalsNow).toBe(once.arrivalsNow)
      expect(twice.pages).toBe(1)
    }
  })

  /**
   * 0256's refusal, at a comparison: a kind standing on one page the door cannot
   * scale has no share at all rather than a share over the pages that could be
   * scaled, and the page that caused it is published with the **side** it is on.
   */
  it("withholds the whole kind where one page cannot be scaled, and says which window", () => {
    const here = page({ treeId: TREE })
    const there = page({ treeId: OTHER_TREE })
    const scalable = read(there, { opened: 50, appearances: 50, reached: 25 })

    const change = libraryReachChangeOf(
      {
        readings: [
          read(here, { opened: 10, appearances: 10, reached: 2 }).reading,
          scalable.reading,
        ],
        rows: [scalable.row],
      },
      windowOf([
        read(here, { opened: 10, appearances: 10, reached: 8 }),
        read(there, { opened: 50, appearances: 50, reached: 40 }),
      ])
    )

    const quote = typeRow(change, "loom.quote")

    expect(quote?.silence).toBe("unscaled")
    expect(quote?.shareWas).toBe(null)
    expect(quote?.shareNow).toBe(null)
    expect(quote?.movement).toBe("unknown")
    expect(quote?.comparable).toBe(2)
    expect(change.scaled).toBe(1)
    expect(change.unscaled).toEqual([
      { treeId: TREE, revision: 1, against: 1, side: "was", silence: "unmeasured" },
    ])
    expect(describeReadingSide(change.unscaled[0]?.side ?? "now")).toContain("earlier")
  })

  it("tells the two door states a row can be in apart, on the side each is on", () => {
    const tree = page()
    const unopened = libraryReachChangeOf(
      windowOf([read(tree, { opened: 10, appearances: 10, reached: 4 })]),
      {
        readings: [read(tree, { opened: 10, appearances: 10, reached: 8 }).reading],
        rows: [row({ opened: 0, appearances: 10 })],
      }
    )
    const uncounted = libraryReachChangeOf(
      windowOf([read(tree, { opened: 10, appearances: 10, reached: 4 })]),
      {
        readings: [read(tree, { opened: 10, appearances: 10, reached: 8 }).reading],
        rows: [row({ opened: 10, appearances: 0 })],
      }
    )

    expect(typeRow(unopened, "loom.quote")?.silence).toBe("unopened")
    expect(unopened.unscaled.map((of) => of.side)).toEqual(["now"])
    expect(typeRow(uncounted, "loom.quote")?.silence).toBe("uncounted")
    expect(uncounted.unscaled.map((of) => of.silence)).toEqual(["uncounted"])
  })

  /**
   * A standing of `unknown` is *nothing can be said* and never *nobody read it*
   * (0212), so a place one window cannot speak for is in neither term — and a
   * kind with no other place has no comparison rather than a nought.
   */
  it("leaves a place one window cannot speak for out of both terms", () => {
    const tree = page()
    const quiet = pageReadingOf(tree, [], BODY_IS_COPY)

    const change = libraryReachChangeOf(
      { readings: [quiet], rows: [row({ opened: 10, appearances: 10 })] },
      windowOf([read(tree, { opened: 10, appearances: 10, reached: 8 })])
    )

    const quote = typeRow(change, "loom.quote")

    expect(quote?.places).toBe(1)
    expect(quote?.comparable).toBe(0)
    expect(quote?.silence).toBe("unread")
    expect(quote?.movement).toBe("unknown")
  })

  it("calls a kind whose places all moved unpaired, and a role nothing plays unplaced", () => {
    const was = read(page({ treeId: TREE }), { opened: 10, appearances: 10, reached: 5 })
    const now = read(page({ treeId: OTHER_TREE }), { opened: 10, appearances: 10, reached: 5 })

    const change = libraryReachChangeOf(windowOf([was]), windowOf([now]))

    expect(typeRow(change, "loom.quote")?.silence).toBe("unpaired")
    expect(typeRow(change, "loom.quote")?.gained).toBe(1)
    expect(typeRow(change, "loom.quote")?.lost).toBe(1)
    expect(roleRow(change, "heading")?.silence).toBe("unplaced")
    expect(change.pagesGained).toBe(1)
    expect(change.pagesLost).toBe(1)
    expect(change.pages).toBe(0)
  })

  /**
   * Nobody reached it in either window, which is an instruction rather than the
   * absence of one — and is deliberately not `held` at a share of nought.
   */
  it("keeps a kind nobody reached in either window apart from one that held", () => {
    const tree = page()

    const change = libraryReachChangeOf(
      windowOf([read(tree, { opened: 10, appearances: 10, reached: null })]),
      windowOf([read(tree, { opened: 10, appearances: 10, reached: null })])
    )

    const quote = typeRow(change, "loom.quote")

    expect(quote?.movement).toBe("still-unread")
    expect(quote?.shareWas).toBe(0)
    expect(quote?.shareNow).toBe(0)
    expect(quote?.cause).toBe(null)
  })

  /**
   * The ranking rule this subsystem uses everywhere (0221, 0257): a kind
   * abandoned by two readers out of three is a worse rate and a smaller problem
   * than one abandoned by two hundred out of a thousand.
   */
  it("ranks the kind to look at first by the readers it lost and not by the share", () => {
    const small = treeOf(
      element("small", "loom.stack", {}, [element("quote", "loom.quote", {})]),
      1,
      TREE
    )
    const large = treeOf(
      element("large", "loom.stack", {}, [element("badge", "loom.badge", {})]),
      1,
      OTHER_TREE
    )
    const sideOf = (quote: number, badge: number) => ({
      readings: [
        pageReadingOf(
          small,
          [
            tally("small", { views: 3, reached: 3 }, small),
            tally("quote", { views: 3, reached: quote }, small),
          ],
          BODY_IS_COPY
        ),
        pageReadingOf(
          large,
          [
            tally("large", { views: 1000, reached: 1000 }, large),
            tally("badge", { views: 1000, reached: badge }, large),
          ],
          BODY_IS_COPY
        ),
      ],
      rows: [
        row({ treeId: TREE, opened: 3, appearances: 3 }),
        row({ treeId: OTHER_TREE, opened: 1000, appearances: 1000 }),
      ],
    })

    const change = libraryReachChangeOf(sideOf(3, 800), sideOf(1, 600))

    expect(change.mostAbandoned?.kind).toEqual({ by: "type", type: "loom.badge" })
    expect(change.mostAbandoned?.readersMoved).toBeCloseTo(-200, 10)
    expect(typeRow(change, "loom.quote")?.shift).toBeCloseTo(-2 / 3, 10)
    expect(change.byType[0]?.kind).toEqual({ by: "type", type: "loom.badge" })
  })

  it("names the kind that gained the most readers by the same rule", () => {
    const tree = page()
    const change = libraryReachChangeOf(
      windowOf([read(tree, { opened: 100, appearances: 100, reached: 10 })]),
      windowOf([read(tree, { opened: 100, appearances: 100, reached: 60 })])
    )

    expect(change.mostTakenUp?.kind).toEqual({ by: "type", type: "loom.quote" })
    expect(change.mostTakenUp?.readersMoved).toBeCloseTo(50, 10)
    expect(change.mostAbandoned).toBe(null)
  })

  /**
   * 0266's two keys, which answer differently about one change on purpose: a
   * node recast into another type is a place one type left and another took,
   * while the role rows hold it still wherever the two types play the same part.
   */
  it("holds a recast place still in the role row and not in the type rows", () => {
    const was = page({ quote: "loom.quote" })
    const now = page({ quote: "loom.testimonial" })

    const change = libraryReachChangeOf(
      windowOf([
        read(was, {
          opened: 100,
          appearances: 100,
          reached: 40,
          declarations: QUOTES_ARE_HEADINGS,
        }),
      ]),
      windowOf([
        read(now, {
          opened: 100,
          appearances: 100,
          reached: 70,
          declarations: QUOTES_ARE_HEADINGS,
        }),
      ])
    )

    expect(change.recast).toBe(1)
    expect(typeRow(change, "loom.quote")?.silence).toBe("unpaired")
    expect(typeRow(change, "loom.testimonial")?.silence).toBe("unpaired")
    expect(roleRow(change, "heading")?.shareWas).toBe(0.4)
    expect(roleRow(change, "heading")?.shareNow).toBe(0.7)
    expect(roleRow(change, "heading")?.movement).toBe("taken-up")
  })

  it("excludes a tree read at two revisions in one window and names it", () => {
    const first = page({ revision: 1 })
    const second = page({ revision: 2 })

    const change = libraryReachChangeOf(
      {
        readings: [
          read(first, { opened: 10, appearances: 10, reached: 4 }).reading,
          read(second, { opened: 10, appearances: 10, reached: 4 }).reading,
        ],
        rows: [
          row({ revision: 1, opened: 10, appearances: 10 }),
          row({ revision: 2, opened: 10, appearances: 10 }),
        ],
      },
      windowOf([read(second, { opened: 10, appearances: 10, reached: 8 })])
    )

    expect(change.ambiguous).toEqual([TREE])
    expect(change.pages).toBe(0)
    expect(change.placements).toBe(0)
    expect(change.arrivalsWas).toBe(0)
    /* A type row stands only where a part of that type does, so there is none at all. */
    expect(typeRow(change, "loom.quote")).toBeUndefined()
  })

  /**
   * The published surface, asserted as a list for the reason 0266's is: the two
   * things this reading refuses are refusals a field would quietly undo — a
   * ceiling on either side, which does not bound a difference, and an additive
   * split of the movement, which is order-dependent.
   */
  it("publishes neither a ceiling nor an additive split, and no total over the kinds", () => {
    const tree = page()
    const change = libraryReachChangeOf(
      windowOf([read(tree, { opened: 10, appearances: 10, reached: 4 })]),
      windowOf([read(tree, { opened: 10, appearances: 10, reached: 8 })])
    )

    expect(Object.keys(change).sort()).toEqual([
      "ambiguous",
      "arrivalsNow",
      "arrivalsWas",
      "byRole",
      "byType",
      "duplicated",
      "duplicatedRows",
      "gained",
      "lost",
      "mostAbandoned",
      "mostTakenUp",
      "pages",
      "pagesGained",
      "pagesLost",
      "placements",
      "recast",
      "republished",
      "roleDisagreed",
      "scaled",
      "unscaled",
    ])
    expect(Object.keys(change.byType[0] ?? {}).sort()).toEqual([
      "cause",
      "comparable",
      "countedNow",
      "countedWas",
      "driftNow",
      "driftWas",
      "exact",
      "gained",
      "ifReadingHeld",
      "ifTrafficHeld",
      "kind",
      "lost",
      "metNow",
      "metWas",
      "movement",
      "pages",
      "pendingNow",
      "pendingWas",
      "places",
      "readersMoved",
      "role",
      "shareNow",
      "shareWas",
      "shift",
      "silence",
      "unreconciled",
      "weightMoved",
    ])
  })

  it("answers nothing at all about two empty windows, without reporting a fault", () => {
    const change = libraryReachChangeOf({ readings: [], rows: [] }, { readings: [], rows: [] })

    expect(change.pages).toBe(0)
    expect(change.byType).toEqual([])
    expect(change.ambiguous).toEqual([])
    expect(change.duplicated).toBe(0)
    expect(change.unscaled).toEqual([])
    expect(change.byRole.every((of) => of.silence === "unplaced")).toBe(true)
  })

  /**
   * A revision that moved under a paired page is still a comparison — a
   * placement is paired by node — and the reading says so, because *your readers
   * behave differently* and *you changed your pages* are two findings.
   */
  it("compares a page whose revision moved and reports that it did", () => {
    const was = page({ revision: 1 })
    const now = page({ revision: 2 })

    const change = libraryReachChangeOf(
      windowOf([read(was, { opened: 100, appearances: 100, reached: 40 })]),
      windowOf([read(now, { opened: 100, appearances: 100, reached: 70 })])
    )

    expect(change.republished).toBe(1)
    expect(change.pages).toBe(1)
    expect(typeRow(change, "loom.quote")?.shift).toBeCloseTo(0.3, 10)
  })

  /**
   * The alarm 0256 raises and this reading inherits: more reach than the page
   * had appearances is a reading nothing produces, and it is the one thing that
   * can put a share above 1.
   */
  it("raises a place reporting more reach than its page had views, on either side", () => {
    const tree = page()

    const change = libraryReachChangeOf(
      windowOf([read(tree, { opened: 10, appearances: 10, reached: 4 })]),
      windowOf([read(tree, { opened: 10, appearances: 10, reached: 40 })])
    )

    const quote = typeRow(change, "loom.quote")

    expect(quote?.unreconciled).toBe(1)
    expect(quote?.exact).toBe(false)
    expect(quote?.shareNow).toBeGreaterThan(1)
  })

  it("counts openings waiting to be folded on the side they are waiting on", () => {
    const tree = page()

    const change = libraryReachChangeOf(
      windowOf([read(tree, { opened: 10, appearances: 10, reached: 4 })]),
      {
        readings: [read(tree, { opened: 10, appearances: 10, reached: 6 }).reading],
        rows: [row({ opened: 25, appearances: 10 })],
      }
    )

    const quote = typeRow(change, "loom.quote")

    expect(quote?.pendingNow).toBe(15)
    expect(quote?.pendingWas).toBe(0)
    expect(quote?.countedNow).toBe(10)
    expect(quote?.exact).toBe(false)
    expect(change.arrivalsNow).toBe(25)
  })

  it("publishes a sentence for every silence, movement, cause and side", () => {
    for (const silence of KIND_REACH_CHANGE_SILENCES) {
      expect(describeKindReachChangeSilence(silence).length).toBeGreaterThan(0)
    }
    for (const movement of KIND_REACH_MOVEMENTS) {
      expect(describeKindReachMovement(movement).length).toBeGreaterThan(0)
    }
    for (const cause of READER_SHARE_CAUSES) {
      expect(describeReaderShareCause(cause).length).toBeGreaterThan(0)
    }

    expect(new Set(KIND_REACH_CHANGE_SILENCES.map(describeKindReachChangeSilence)).size).toBe(
      KIND_REACH_CHANGE_SILENCES.length
    )
    expect(READING_SIDES.map(describeReadingSide)).toEqual([
      "the earlier window",
      "the later window",
    ])
  })
})
