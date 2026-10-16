import { describe, expect, it } from "vitest"

import { DEFAULT_AUDIENCE_ID } from "../audience/audience.js"
import type { TreeId } from "../ids.js"
import type { JsonObject } from "../json.js"
import { nodeId, OTHER_TREE, primitiveType, TREE } from "../testing/reader-signal-contract.js"
import type { ElementNode, LoomNode } from "../tree/node.js"
import { TREE_SCHEMA_VERSION, type LoomTree } from "../tree/tree.js"

import {
  describeKindReachSilence,
  KIND_REACH_SILENCES,
  kindKeyOf,
  libraryReachOf,
  libraryReadingOf,
  pageReadingOf,
  type KindReach,
  type PartDeclarations,
  type ReaderTally,
  type StoredPageViews,
} from "./index.js"

/**
 * Built on real readings and real door rows, because those are what the
 * function takes: a tree, a window's counters and the two numbers the door and
 * the rollups wrote go in one end, and a kind of part's share of the readers
 * who met it comes out of the other.
 *
 * The straddle is simulated the way a deployment produces one — by scaling a
 * page's `appearances` and every `reached` against it by the same factor, which
 * is what a rollup window shorter than a visit does — so the tests that say the
 * figure cannot be moved by it are testing the arithmetic rather than restating
 * it.
 */

const BODY_IS_COPY: PartDeclarations = {
  copyFor: (type) => (type === "loom.section" ? ["body"] : undefined),
  typesWithRole: () => [],
}

const SECTIONS_HEAD: PartDeclarations = {
  copyFor: (type) => (type === "loom.section" ? ["body"] : undefined),
  typesWithRole: (role) => (role === "heading" ? [primitiveType("loom.section")] : []),
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
  counts: Partial<ReaderTally> = {},
  tree: LoomTree = treeOf(element("page", "loom.stack"))
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
  updatedAt: "2026-10-11T00:00:00.000Z",
  ...counts,
})

const words = (count: number): string => Array.from({ length: count }, () => "word").join(" ")

/** A band and a pull quote, which is the shape most pages below are a variation of. */
const page = (
  { revision = 1, treeId = TREE }: { revision?: number; treeId?: TreeId } = {}
): LoomTree =>
  treeOf(
    element("page", "loom.stack", {}, [
      element("intro", "loom.section", { body: words(10) }),
      element("quote", "loom.quote", { body: "a line somebody wrote" }),
    ]),
    revision,
    treeId
  )

const readingOf = (
  tree: LoomTree,
  counters: readonly ReaderTally[],
  declarations: PartDeclarations = BODY_IS_COPY
) => pageReadingOf(tree, counters, declarations)

const typeRow = (
  library: { readonly byType: readonly KindReach[] },
  type: string
): KindReach | undefined =>
  library.byType.find((of) => of.kind.by === "type" && of.kind.type === type)

const roleRow = (
  library: { readonly byRole: readonly KindReach[] },
  role: string | null
): KindReach | undefined =>
  library.byRole.find((of) => of.kind.by === "role" && of.kind.role === role)

describe("a kind of part against the readers who met it", () => {
  /**
   * The whole reason this unit exists beside the census: a kind read in the one
   * busy place and skipped in the quiet one is a read share of a half as a
   * share of places, and most of the readers who met it read it.
   */
  it("weighs each place by the readers its own page had, which a share of places does not", () => {
    const busy = page({ treeId: TREE })
    const quiet = page({ treeId: OTHER_TREE })

    const reach = libraryReachOf(
      [
        readingOf(busy, [
          tally("page", { views: 900, reached: 900 }, busy),
          tally("quote", { views: 900, reached: 900 }, busy),
        ]),
        readingOf(quiet, [tally("page", { views: 3, reached: 3 }, quiet)]),
      ],
      [
        row({ treeId: TREE, opened: 900, appearances: 900 }),
        row({ treeId: OTHER_TREE, opened: 3, appearances: 3 }),
      ]
    )

    const quote = typeRow(reach, "loom.quote")
    const census = libraryReadingOf([
      readingOf(busy, [
        tally("page", { views: 900, reached: 900 }, busy),
        tally("quote", { views: 900, reached: 900 }, busy),
      ]),
      readingOf(quiet, [tally("page", { views: 3, reached: 3 }, quiet)]),
    ])
    const places = census.byType.find(
      (of) => of.kind.by === "type" && of.kind.type === "loom.quote"
    )

    expect(places?.readShare).toBe(0.5)
    expect(quote?.share).toBeCloseTo(900 / 903, 10)
    expect(quote?.counted).toBe(903)
    expect(quote?.met).toBe(900)
    expect(quote?.missed).toBe(3)
  })

  it("pairs with the census of the same readings on the published key, kind for kind", () => {
    const readings = [readingOf(page(), [tally("page", { views: 4, reached: 4 }, page())])]
    const reach = libraryReachOf(readings, [row({ opened: 4, appearances: 4 })])
    const census = libraryReadingOf(readings)

    expect(reach.byType.map((of) => kindKeyOf(of.kind)).sort()).toEqual(
      census.byType.map((of) => kindKeyOf(of.kind)).sort()
    )
    expect(reach.byRole.map((of) => kindKeyOf(of.kind)).sort()).toEqual(
      census.byRole.map((of) => kindKeyOf(of.kind)).sort()
    )
    expect(reach.placements).toBe(census.placements)
  })

  /**
   * The design in one assertion. A rollup window shorter than a visit inflates
   * a page's appearances and every reach against it by the same factor, and
   * that factor is each page's own — so weighting by appearances would move the
   * answer and weighting at the door's scale cannot.
   */
  it("cannot be moved by a rollup window that inflates one page's counts and not another's", () => {
    const busy = page({ treeId: TREE })
    const quiet = page({ treeId: OTHER_TREE })

    const reachOf = (straddle: number) =>
      libraryReachOf(
        [
          readingOf(busy, [
            tally("page", { views: 100 * straddle, reached: 100 * straddle }, busy),
            tally("quote", { views: 100 * straddle, reached: 40 * straddle }, busy),
          ]),
          readingOf(quiet, [
            tally("page", { views: 100, reached: 100 }, quiet),
            tally("quote", { views: 100, reached: 90 }, quiet),
          ]),
        ],
        [
          row({ treeId: TREE, opened: 100, appearances: 100 * straddle }),
          row({ treeId: OTHER_TREE, opened: 100, appearances: 100 }),
        ]
      )

    const once = typeRow(reachOf(1), "loom.quote")
    const fourfold = typeRow(reachOf(4), "loom.quote")

    expect(once?.share).toBeCloseTo(0.65, 10)
    expect(fourfold?.share).toBeCloseTo(0.65, 10)
    expect(fourfold?.counted).toBe(200)
    expect(fourfold?.drift).toBe(300)

    /** The figure the refused design would have given, for the record. */
    const weightedByAppearances = (40 * 4 + 90) / (100 * 4 + 100)

    expect(weightedByAppearances).toBeCloseTo(0.5, 10)
  })

  it("takes each page's own straddle rate off that page's own row and never the window's aggregate", () => {
    const first = page({ treeId: TREE })
    const second = page({ treeId: OTHER_TREE })

    const reach = libraryReachOf(
      [
        readingOf(first, [
          tally("page", { views: 40, reached: 40 }, first),
          tally("quote", { views: 40, reached: 20 }, first),
        ]),
        readingOf(second, [
          tally("page", { views: 10, reached: 10 }, second),
          tally("quote", { views: 10, reached: 10 }, second),
        ]),
      ],
      [
        row({ treeId: TREE, opened: 10, appearances: 40 }),
        row({ treeId: OTHER_TREE, opened: 10, appearances: 10 }),
      ]
    )

    const quote = typeRow(reach, "loom.quote")

    /** Half of the first page's ten readers, all ten of the second's. */
    expect(quote?.met).toBeCloseTo(5 + 10, 10)
    expect(quote?.counted).toBe(20)
    expect(quote?.share).toBeCloseTo(0.75, 10)
  })

  it("publishes the two denominators and the identity between them", () => {
    const reach = libraryReachOf(
      [
        readingOf(page(), [
          tally("page", { views: 30, reached: 30 }, page()),
          tally("quote", { views: 30, reached: 12 }, page()),
        ]),
      ],
      [row({ opened: 50, appearances: 30 })]
    )

    for (const of of [...reach.byType, ...reach.byRole]) {
      if (of.openings === null || of.counted === null) continue

      expect(of.openings).toBe(of.counted + of.pending)
    }

    const quote = typeRow(reach, "loom.quote")

    expect(quote?.openings).toBe(50)
    expect(quote?.counted).toBe(30)
    expect(quote?.pending).toBe(20)
    expect(quote?.drift).toBe(0)
  })

  it("takes the weight as the smaller of two whole numbers rather than as a division of floats", () => {
    const reach = libraryReachOf(
      [readingOf(page(), [tally("page", { views: 7, reached: 7 }, page())])],
      [row({ opened: 3, appearances: 7 })]
    )

    const stack = typeRow(reach, "loom.stack")

    expect(stack?.counted).toBe(3)
    expect(Number.isInteger(stack?.counted)).toBe(true)
    expect(stack?.met).toBeCloseTo(3, 10)
    expect(stack?.share).toBeCloseTo(1, 10)
  })

  it("bounds the share against the exact openings and never above one", () => {
    const reach = libraryReachOf(
      [
        readingOf(page(), [
          tally("page", { views: 40, reached: 40 }, page()),
          tally("quote", { views: 40, reached: 30 }, page()),
        ]),
      ],
      [row({ opened: 20, appearances: 40 })]
    )

    const stack = typeRow(reach, "loom.stack")
    const quote = typeRow(reach, "loom.quote")

    expect(stack?.atMost).toBe(1)
    expect(stack?.atMostMet).toBe(20)
    expect(quote?.atMostMet).toBe(20)
    expect(quote?.atMost).toBe(1)
    expect(quote?.share).toBeCloseTo(0.75, 10)
  })

  it("may put the estimate above the ceiling while openings are pending, which the pending figure explains", () => {
    const reach = libraryReachOf(
      [
        readingOf(page(), [
          tally("page", { views: 10, reached: 10 }, page()),
          tally("quote", { views: 10, reached: 9 }, page()),
        ]),
      ],
      [row({ opened: 100, appearances: 10 })]
    )

    const quote = typeRow(reach, "loom.quote")

    expect(quote?.share).toBeCloseTo(0.9, 10)
    expect(quote?.atMost).toBeCloseTo(0.09, 10)
    expect(quote?.pending).toBe(90)
    expect(quote?.exact).toBe(false)
  })

  it("calls a kind exact where nobody straddled and nothing is pending, and the two figures then agree", () => {
    const reach = libraryReachOf(
      [
        readingOf(page(), [
          tally("page", { views: 8, reached: 8 }, page()),
          tally("quote", { views: 8, reached: 6 }, page()),
        ]),
      ],
      [row({ opened: 8, appearances: 8 })]
    )

    const quote = typeRow(reach, "loom.quote")

    expect(quote?.exact).toBe(true)
    expect(quote?.share).toBe(0.75)
    expect(quote?.atMost).toBe(0.75)
    expect(quote?.drift).toBe(0)
    expect(quote?.pending).toBe(0)
  })

  /**
   * The direction a census of a quiet deployment must never be wrong in: a
   * placement nothing could speak for is not a placement nobody reached.
   */
  it("leaves a placement nothing could be said about out of both terms", () => {
    const tree = page()
    const reach = libraryReachOf(
      [
        readingOf(tree, [
          tally("page", { views: 10, reached: 10 }, tree),
          tally("quote", { views: 10, reached: 0 }, tree),
        ]),
      ],
      [row({ opened: 10, appearances: 10 })]
    )

    const quote = typeRow(reach, "loom.quote")

    expect(quote?.placements).toBe(1)
    expect(quote?.unknown).toBe(1)
    expect(quote?.verdicts).toBe(0)
    expect(quote?.silence).toBe("unread")
    expect(quote?.share).toBeNull()
    expect(quote?.counted).toBeNull()
  })

  it("counts a placement nobody reached as met by nobody, which is a measurement and not a silence", () => {
    const tree = page()
    const reach = libraryReachOf(
      [readingOf(tree, [tally("page", { views: 10, reached: 10 }, tree)])],
      [row({ opened: 10, appearances: 10 })]
    )

    const quote = typeRow(reach, "loom.quote")

    expect(quote?.verdicts).toBe(1)
    expect(quote?.silence).toBeNull()
    expect(quote?.share).toBe(0)
    expect(quote?.met).toBe(0)
    expect(quote?.missed).toBe(10)
  })

  describe("a page the door cannot scale", () => {
    it("withholds the whole kind rather than giving a share over the places it could price", () => {
      const priced = page({ treeId: TREE })
      const unpriced = page({ treeId: OTHER_TREE })

      const reach = libraryReachOf(
        [
          readingOf(priced, [
            tally("page", { views: 50, reached: 50 }, priced),
            tally("quote", { views: 50, reached: 45 }, priced),
          ]),
          readingOf(unpriced, [
            tally("page", { views: 4, reached: 4 }, unpriced),
            tally("quote", { views: 4, reached: 1 }, unpriced),
          ]),
        ],
        [row({ treeId: TREE, opened: 50, appearances: 50 })]
      )

      expect(typeRow(reach, "loom.quote")?.silence).toBe("unscaled")
      expect(typeRow(reach, "loom.quote")?.share).toBeNull()
      expect(typeRow(reach, "loom.quote")?.verdicts).toBe(2)
      expect(reach.scaled).toBe(1)
      expect(reach.unscaled).toEqual([
        { treeId: OTHER_TREE, revision: 1, silence: "unmeasured" },
      ])
    })

    it("names the page in the vocabulary a page's own reading publishes, not in its own", () => {
      const tree = page()
      const reach = libraryReachOf(
        [readingOf(tree, [tally("page", { views: 9, reached: 9 }, tree)])],
        [row({ opened: 0, appearances: 9 })]
      )

      expect(reach.unscaled).toEqual([{ treeId: TREE, revision: 1, silence: "unopened" }])
      expect(typeRow(reach, "loom.stack")?.silence).toBe("unopened")
    })

    it("tells a row the rollups have not reached from a row nothing opened", () => {
      const tree = page()
      const reach = libraryReachOf(
        [readingOf(tree, [tally("page", { views: 9, reached: 9 }, tree)])],
        [row({ opened: 12, appearances: 0 })]
      )

      expect(reach.unscaled).toEqual([{ treeId: TREE, revision: 1, silence: "uncounted" }])
      expect(typeRow(reach, "loom.stack")?.silence).toBe("uncounted")
      expect(reach.arrivals).toBe(12)
    })

    it("leaves a page nobody read off the list, because its readers are not what could not be counted", () => {
      const reach = libraryReachOf([readingOf(page(), [])], [])

      expect(reach.unscaled).toEqual([])
      expect(reach.scaled).toBe(0)
      expect(typeRow(reach, "loom.stack")?.silence).toBe("unread")
    })

    it("prefers nothing read over nothing priced, because the door has nothing to scale either way", () => {
      const tree = page()
      const reach = libraryReachOf(
        [readingOf(tree, [tally("page", { views: 5, reached: 5 }, tree)])],
        []
      )

      expect(typeRow(reach, "loom.stack")?.silence).toBe("unscaled")
      expect(typeRow(reach, "loom.quote")?.silence).toBe("unscaled")
    })
  })

  describe("the vocabulary of reasons", () => {
    it("says nothing of the kind where the library holds none of it", () => {
      const nothingHeads = treeOf(
        element("page", "loom.stack", {}, [element("quote", "loom.quote", { body: "a line" })])
      )

      const reach = libraryReachOf(
        [
          readingOf(
            nothingHeads,
            [tally("page", { views: 2, reached: 2 }, nothingHeads)],
            SECTIONS_HEAD
          ),
        ],
        [row({ opened: 2, appearances: 2 })]
      )

      const heading = roleRow(reach, "heading")

      expect(heading?.placements).toBe(0)
      expect(heading?.silence).toBe("unplaced")
      expect(heading?.share).toBeNull()
    })

    it("describes every reason, never twice the same way, and keeps a record number out of the prose", () => {
      const lines = KIND_REACH_SILENCES.map(describeKindReachSilence)

      expect(lines.every((line) => line.length > 0)).toBe(true)
      expect(new Set(lines).size).toBe(KIND_REACH_SILENCES.length)

      for (const line of lines) expect(line).not.toMatch(/\b0\d{3}\b/)
    })
  })

  describe("the four shapes of a double count", () => {
    it("drops a reading of a revision it already has, and says how many", () => {
      const tree = page()
      const reading = readingOf(tree, [
        tally("page", { views: 10, reached: 10 }, tree),
        tally("quote", { views: 10, reached: 5 }, tree),
      ])
      const rows = [row({ opened: 10, appearances: 10 })]

      const once = libraryReachOf([reading], rows)
      const twice = libraryReachOf([reading, reading], rows)

      expect(twice.duplicated).toBe(1)
      expect(twice.pages).toBe(1)
      expect(twice.arrivals).toBe(10)
      expect(typeRow(twice, "loom.quote")).toEqual(typeRow(once, "loom.quote"))
    })

    it("ignores a door row it already has, so arrivals do not double and no share halves", () => {
      const tree = page()
      const reading = readingOf(tree, [
        tally("page", { views: 10, reached: 10 }, tree),
        tally("quote", { views: 10, reached: 5 }, tree),
      ])

      const once = libraryReachOf([reading], [row({ opened: 10, appearances: 10 })])
      const twice = libraryReachOf(
        [reading],
        [row({ opened: 10, appearances: 10 }), row({ opened: 10, appearances: 10 })]
      )

      expect(twice.duplicatedRows).toBe(1)
      expect(twice.arrivals).toBe(10)
      expect(typeRow(twice, "loom.quote")?.share).toBe(typeRow(once, "loom.quote")?.share)
      expect(typeRow(twice, "loom.quote")?.counted).toBe(10)
    })

    it("keeps two revisions of one tree as two pages with two doors", () => {
      const first = page({ revision: 1 })
      const second = page({ revision: 2 })

      const reach = libraryReachOf(
        [
          readingOf(first, [
            tally("page", { views: 10, reached: 10 }, first),
            tally("quote", { views: 10, reached: 10 }, first),
          ]),
          readingOf(second, [
            tally("page", { views: 10, reached: 10 }, second),
            tally("quote", { views: 10, reached: 0 }, second),
          ]),
        ],
        [
          row({ revision: 1, opened: 10, appearances: 10 }),
          row({ revision: 2, opened: 10, appearances: 10 }),
        ]
      )

      expect(reach.pages).toBe(2)
      expect(reach.trees).toBe(1)
      expect(reach.duplicated).toBe(0)
      expect(reach.arrivals).toBe(20)
      expect(typeRow(reach, "loom.quote")?.placements).toBe(2)
      expect(typeRow(reach, "loom.quote")?.unknown).toBe(1)
      expect(typeRow(reach, "loom.quote")?.counted).toBe(10)
    })

    /**
     * The unit is the placement, so a page bearing three places a kind stands
     * is three of them in that kind's denominator — and the page's readers are
     * counted once in the reading's own arrivals. Both are deliberate and both
     * are here, because the two numbers look like each other.
     */
    it("counts a page's readers once per place a kind stands on it, and once in the reading's arrivals", () => {
      const tree = treeOf(
        element("page", "loom.stack", {}, [
          element("one", "loom.quote", { body: "a" }),
          element("two", "loom.quote", { body: "b" }),
          element("three", "loom.quote", { body: "c" }),
        ])
      )

      const reach = libraryReachOf(
        [
          readingOf(tree, [
            tally("page", { views: 10, reached: 10 }, tree),
            tally("one", { views: 10, reached: 10 }, tree),
            tally("two", { views: 10, reached: 5 }, tree),
          ]),
        ],
        [row({ opened: 10, appearances: 10 })]
      )

      const quote = typeRow(reach, "loom.quote")

      expect(quote?.placements).toBe(3)
      expect(quote?.verdicts).toBe(3)
      expect(quote?.counted).toBe(30)
      expect(quote?.openings).toBe(30)
      expect(quote?.met).toBe(15)
      expect(reach.arrivals).toBe(10)
    })

    it("counts a kind standing inside itself at both depths, which is what a placement means", () => {
      const tree = treeOf(
        element("page", "loom.stack", {}, [
          element("outer", "loom.section", { body: words(4) }, [
            element("inner", "loom.section", { body: words(4) }),
          ]),
        ])
      )

      const reach = libraryReachOf(
        [
          readingOf(tree, [
            tally("page", { views: 10, reached: 10 }, tree),
            tally("outer", { views: 10, reached: 10 }, tree),
            tally("inner", { views: 10, reached: 4 }, tree),
          ]),
        ],
        [row({ opened: 10, appearances: 10 })]
      )

      const section = typeRow(reach, "loom.section")

      expect(section?.placements).toBe(2)
      expect(section?.counted).toBe(20)
      expect(section?.met).toBe(14)
      expect(section?.share).toBeCloseTo(0.7, 10)
    })
  })

  describe("what the reading leads with", () => {
    it("names the type that loses the most readers, by count and not by share", () => {
      const busy = treeOf(
        element("page", "loom.stack", {}, [element("quote", "loom.quote", { body: "a line" })]),
        1,
        TREE
      )
      const quiet = treeOf(
        element("page", "loom.stack", {}, [element("aside", "loom.aside", { body: "another" })]),
        1,
        OTHER_TREE
      )

      const reach = libraryReachOf(
        [
          readingOf(busy, [
            tally("page", { views: 1000, reached: 1000 }, busy),
            tally("quote", { views: 1000, reached: 600 }, busy),
          ]),
          readingOf(quiet, [tally("page", { views: 3, reached: 3 }, quiet)]),
        ],
        [
          row({ treeId: TREE, opened: 1000, appearances: 1000 }),
          row({ treeId: OTHER_TREE, opened: 3, appearances: 3 }),
        ]
      )

      /** The worse rate is the aside's nought; the worse problem is the quote's four hundred. */
      expect(typeRow(reach, "loom.aside")?.share).toBe(0)
      expect(typeRow(reach, "loom.quote")?.share).toBeCloseTo(0.6, 10)
      expect(reach.mostMissed?.kind).toEqual({ by: "type", type: primitiveType("loom.quote") })
      expect(reach.mostMissed?.missed).toBe(400)
    })

    it("has no type to lead with where nothing anywhere was missed", () => {
      const tree = page()
      const reach = libraryReachOf(
        [
          readingOf(tree, [
            tally("page", { views: 6, reached: 6 }, tree),
            tally("intro", { views: 6, reached: 6 }, tree),
            tally("quote", { views: 6, reached: 6 }, tree),
          ]),
        ],
        [row({ opened: 6, appearances: 6 })]
      )

      expect(reach.mostMissed).toBeNull()
      expect(typeRow(reach, "loom.quote")?.share).toBe(1)
    })

    it("sorts a kind with no share after one whose share is nought", () => {
      const first = page({ treeId: TREE })
      const second = treeOf(
        element("page", "loom.stack", {}, [element("aside", "loom.aside", { body: "x" })]),
        1,
        OTHER_TREE
      )

      const reach = libraryReachOf(
        [
          readingOf(first, [tally("page", { views: 10, reached: 10 }, first)]),
          readingOf(second, [tally("page", { views: 10, reached: 10 }, second)]),
        ],
        [row({ treeId: TREE, opened: 10, appearances: 10 })]
      )

      const order = reach.byType.map((of) => (of.kind.by === "type" ? of.kind.type : ""))

      expect(typeRow(reach, "loom.quote")?.share).toBe(0)
      expect(typeRow(reach, "loom.aside")?.silence).toBe("unscaled")
      expect(order.indexOf(primitiveType("loom.quote"))).toBeLessThan(
        order.indexOf(primitiveType("loom.aside"))
      )
    })

    /**
     * A share over every kind at once would be a share over every placement in
     * the deployment, where a page built from forty parts weighs forty times
     * one built from a band — a denominator that is an artefact of how finely
     * the pages were written. The published keys are pinned so that adding one
     * is a decision.
     */
    it("publishes no reading-wide share and no reading-wide reach", () => {
      const tree = page()
      const reach = libraryReachOf(
        [readingOf(tree, [tally("page", { views: 10, reached: 10 }, tree)])],
        [row({ opened: 10, appearances: 10 })]
      )

      expect(Object.keys(reach).sort()).toEqual([
        "arrivals",
        "byRole",
        "byType",
        "duplicated",
        "duplicatedRows",
        "mostMissed",
        "pages",
        "placements",
        "roleDisagreed",
        "scaled",
        "trees",
        "unscaled",
      ])
    })
  })

  describe("the rows a reading cannot make sound", () => {
    it("puts a share above one exactly where a placement reports more reach than its page had", () => {
      const tree = page()
      const reach = libraryReachOf(
        [
          readingOf(tree, [
            tally("page", { views: 10, reached: 10 }, tree),
            tally("quote", { views: 10, reached: 40 }, tree),
          ]),
        ],
        [row({ opened: 10, appearances: 10 })]
      )

      const quote = typeRow(reach, "loom.quote")
      const stack = typeRow(reach, "loom.stack")

      expect(quote?.unreconciled).toBe(1)
      expect(quote?.share).toBeGreaterThan(1)
      expect(quote?.atMost).toBe(1)
      expect(quote?.exact).toBe(false)
      expect(stack?.unreconciled).toBe(0)

      for (const of of [...reach.byType, ...reach.byRole]) {
        if (of.share === null) continue

        expect(of.share > 1).toBe(of.unreconciled > 0)
      }
    })

    it("names a type two readings disagree about the role of, where the first answer stands", () => {
      const first = page({ treeId: TREE })
      const second = page({ treeId: OTHER_TREE })

      const reach = libraryReachOf(
        [
          readingOf(first, [tally("page", { views: 3, reached: 3 }, first)], SECTIONS_HEAD),
          readingOf(second, [tally("page", { views: 3, reached: 3 }, second)], BODY_IS_COPY),
        ],
        [
          row({ treeId: TREE, opened: 3, appearances: 3 }),
          row({ treeId: OTHER_TREE, opened: 3, appearances: 3 }),
        ]
      )

      expect(reach.roleDisagreed).toEqual([primitiveType("loom.section")])
      expect(typeRow(reach, "loom.section")?.role).toBe("heading")
    })

    it("ignores a door row for a page it was not handed", () => {
      const tree = page()
      const reach = libraryReachOf(
        [readingOf(tree, [tally("page", { views: 10, reached: 10 }, tree)])],
        [
          row({ opened: 10, appearances: 10 }),
          row({ treeId: OTHER_TREE, opened: 9000, appearances: 9000 }),
        ]
      )

      expect(reach.arrivals).toBe(10)
      expect(reach.duplicatedRows).toBe(0)
      expect(typeRow(reach, "loom.stack")?.counted).toBe(10)
    })
  })

  it("gives every role in the vocabulary a row, and the row for a type that declared none", () => {
    const reach = libraryReachOf(
      [readingOf(page(), [tally("page", { views: 2, reached: 2 }, page())], SECTIONS_HEAD)],
      [row({ opened: 2, appearances: 2 })]
    )

    expect(roleRow(reach, "heading")).toBeDefined()
    expect(roleRow(reach, null)).toBeDefined()
    expect(reach.byRole.every((of) => of.role === null)).toBe(true)
  })

  it("reads nothing at all out of no readings", () => {
    const reach = libraryReachOf([], [row({ opened: 10, appearances: 10 })])

    expect(reach.byType).toEqual([])
    expect(reach.pages).toBe(0)
    expect(reach.arrivals).toBe(0)
    expect(reach.unscaled).toEqual([])
    expect(reach.byRole.every((of) => of.silence === "unplaced")).toBe(true)
  })
})
