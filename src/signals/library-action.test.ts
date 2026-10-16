import { describe, expect, it } from "vitest"

import { DEFAULT_AUDIENCE_ID } from "../audience/audience.js"
import type { TreeId } from "../ids.js"
import type { JsonObject } from "../json.js"
import {
  nodeId,
  OTHER_TREE,
  primitiveType,
  TREE,
} from "../testing/reader-signal-contract.js"
import type { ElementNode, LoomNode } from "../tree/node.js"
import { TREE_SCHEMA_VERSION, type LoomTree } from "../tree/tree.js"

import {
  describeKindActionSilence,
  KIND_ACTION_SILENCES,
  kindKeyOf,
  libraryActionOf,
  libraryReachOf,
  libraryReadingOf,
  pageActionOf,
  pageReadingOf,
  type KindAction,
  type PartDeclarations,
  type ReaderTally,
  type StoredPageViews,
} from "./index.js"

/**
 * Built on real readings and real door rows, because those are what the function
 * takes.
 *
 * The straddle is simulated the way a deployment produces one — by scaling a
 * page's `appearances` and every distinct count against it by the same factor,
 * which is what a rollup window shorter than a visit does. So the tests that
 * say the figure cannot be moved by it are testing the arithmetic rather than
 * restating it.
 */

const BODY_IS_COPY: PartDeclarations = {
  copyFor: (type) => (type === "loom.section" ? ["body"] : undefined),
  typesWithRole: () => [],
}

const CARDS_HEAD: PartDeclarations = {
  copyFor: (type) => (type === "loom.section" ? ["body"] : undefined),
  typesWithRole: (role) =>
    role === "heading" ? [primitiveType("loom.card")] : [],
}

const element = (
  name: string,
  type: string,
  props: JsonObject = {},
  children: readonly LoomNode[] = [],
): ElementNode => ({
  kind: "element",
  id: nodeId(name),
  type: primitiveType(type),
  props,
  children,
})

const treeOf = (
  root: ElementNode,
  revision = 1,
  treeId: TreeId = TREE,
): LoomTree => ({
  treeId,
  schemaVersion: TREE_SCHEMA_VERSION,
  revision,
  root,
})

const tally = (
  name: string,
  counts: Partial<ReaderTally> = {},
  { revision = 1, treeId = TREE }: { revision?: number; treeId?: TreeId } = {},
): ReaderTally => ({
  treeId,
  revision,
  nodeId: nodeId(name),
  type: primitiveType("loom.card"),
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
  updatedAt: "2026-10-12T00:00:00.000Z",
  ...counts,
})

const words = (count: number): string =>
  Array.from({ length: count }, () => "word").join(" ")

/**
 * A card with a button and a band in it, and a pull quote beside it.
 *
 * `loom.card` is the one kind on this page with an inside; the button, the band
 * and the quote are leaves, which is what makes them the control group for every
 * structural rule here.
 */
const page = ({
  revision = 1,
  treeId = TREE,
}: { revision?: number; treeId?: TreeId } = {}) =>
  treeOf(
    element("page", "loom.stack", {}, [
      element("card", "loom.card", {}, [
        element("blurb", "loom.section", { body: words(10) }),
        element("cta", "loom.button"),
      ]),
      element("quote", "loom.quote", { body: "a line somebody wrote" }),
    ]),
    revision,
    treeId,
  )

const readingOf = (
  tree: LoomTree,
  counters: readonly ReaderTally[],
  declarations: PartDeclarations = BODY_IS_COPY,
) => pageReadingOf(tree, counters, declarations)

const typeRow = (
  library: { readonly byType: readonly KindAction[] },
  type: string,
): KindAction | undefined =>
  library.byType.find((of) => of.kind.by === "type" && of.kind.type === type)

const roleRow = (
  library: { readonly byRole: readonly KindAction[] },
  role: string | null,
): KindAction | undefined =>
  library.byRole.find((of) => of.kind.by === "role" && of.kind.role === role)

/** One page, one card, a hundred readers who met it and thirty who acted in it. */
const ONE_PAGE = () =>
  libraryActionOf(
    [
      readingOf(page(), [
        tally("page", { views: 100, reached: 100, engaged: 30 }),
        tally("card", {
          views: 100,
          reached: 100,
          engaged: 30,
          activations: 0,
        }),
        tally("cta", { views: 100, reached: 100, activations: 44 }),
      ]),
    ],
    [row({ opened: 100, appearances: 100 })],
  )

describe("what the readers who met a kind of part did inside it", () => {
  it("answers the share of the readers who met it that acted inside it", () => {
    const card = typeRow(ONE_PAGE(), "loom.card")

    expect(card?.placements).toBe(1)
    expect(card?.insides).toBe(1)
    expect(card?.leaves).toBe(0)
    expect(card?.verdicts).toBe(1)
    expect(card?.weighed).toBe(1)
    expect(card?.met).toBe(100)
    expect(card?.acted).toBe(30)
    expect(card?.ignored).toBe(70)
    expect(card?.share).toBe(0.3)
    expect(card?.onDoorScale).toBe(true)
    expect(card?.settled).toBe(true)
    expect(card?.silence).toBeNull()
  })

  /**
   * The *places* half of the row, which is the pairing care 0257 and 0256
   * already needed once: a kind acted in on one page of nine is not the same
   * sentence as a kind three readers in ten act in, and they can differ by an
   * order of magnitude.
   */
  it("publishes a standing for every placement, including the leaves whose share is withheld", () => {
    const library = ONE_PAGE()
    const card = typeRow(library, "loom.card")
    const quote = typeRow(library, "loom.quote")

    expect(card?.standings).toEqual({ acted: 1, untouched: 0, unknown: 0 })
    expect(quote?.standings).toEqual({ acted: 0, untouched: 0, unknown: 1 })
    expect(
      library.standings.acted +
        library.standings.untouched +
        library.standings.unknown,
    ).toBe(library.placements)
    expect(library.insides + library.leaves).toBe(library.placements)
  })

  /**
   * The rule everything structural here follows from, and the reason it is the
   * *first* thing ruled out: a leaf's nought is a filing rule (0167, 0242) and no
   * window changes that.
   */
  it("withholds a kind that is a leaf everywhere, and says so as a fact about the page's shape", () => {
    const library = ONE_PAGE()
    const button = typeRow(library, "loom.button")

    expect(button?.placements).toBe(1)
    expect(button?.insides).toBe(0)
    expect(button?.leaves).toBe(1)
    expect(button?.silence).toBe("unenterable")
    expect(button?.share).toBeNull()
    expect(button?.met).toBeNull()
    expect(describeKindActionSilence("unenterable")).toContain(
      "nothing a reader could act in",
    )
  })

  /**
   * A kind is not a node, so the same type bears parts in one place and not in
   * another. The share is over the places where the question exists and the
   * count of the others travels with it.
   */
  it("answers a kind over the places it has an inside, and says how many it stood in where it had none", () => {
    const tree = treeOf(
      element("page", "loom.stack", {}, [
        element("full", "loom.card", {}, [element("cta", "loom.button")]),
        element("bare", "loom.card"),
      ]),
    )
    const card = typeRow(
      libraryActionOf(
        [
          readingOf(tree, [
            tally("page", { views: 50, reached: 50, engaged: 20 }),
            tally("full", { views: 50, reached: 50, engaged: 20 }),
            tally("bare", { views: 50, reached: 50 }),
          ]),
          ,
        ].flatMap((of) => (of === undefined ? [] : [of])),
        [row({ opened: 50, appearances: 50 })],
      ),
      "loom.card",
    )

    expect(card?.placements).toBe(2)
    expect(card?.insides).toBe(1)
    expect(card?.leaves).toBe(1)
    expect(card?.met).toBe(50)
    expect(card?.acted).toBe(20)
    expect(card?.share).toBe(0.4)
  })

  /**
   * The whole of what the door buys, in one assertion: the figure is the same at
   * a fourfold straddle, and the arithmetic anybody writes first is not.
   *
   * Two pages, the same card. The first is read by sixty of a hundred arrivals
   * and acted in by thirty of them; the second by forty, four of whom act. The
   * sound answer weighs each page by its own arrivals: 34 of 100. The refused
   * design adds the raw counts, and when the first page's rollup window is
   * shortened to a quarter of a visit its counts quadruple and it takes the mean
   * with it.
   */
  it("gives the same share at a fourfold straddle, where adding the raw counts does not", () => {
    const pages = (factor: number) => [
      readingOf(page(), [
        tally("page", {
          views: 100 * factor,
          reached: 100 * factor,
          engaged: 30 * factor,
        }),
        tally("card", {
          views: 100 * factor,
          reached: 60 * factor,
          engaged: 30 * factor,
        }),
      ]),
      readingOf(page({ treeId: OTHER_TREE }), [
        tally(
          "page",
          { views: 100, reached: 100, engaged: 4 },
          { treeId: OTHER_TREE },
        ),
        tally(
          "card",
          { views: 100, reached: 40, engaged: 4 },
          { treeId: OTHER_TREE },
        ),
      ]),
    ]
    const rows = (factor: number) => [
      row({ opened: 100, appearances: 100 * factor }),
      row({ treeId: OTHER_TREE, opened: 100, appearances: 100 }),
    ]

    const plain = typeRow(libraryActionOf(pages(1), rows(1)), "loom.card")
    const straddled = typeRow(libraryActionOf(pages(4), rows(4)), "loom.card")

    expect(plain?.met).toBe(100)
    expect(plain?.acted).toBe(34)
    expect(plain?.share).toBe(0.34)
    expect(straddled?.share).toBe(0.34)
    expect(straddled?.met).toBe(100)
    expect(straddled?.weighed).toBe(2)

    /** The refused design, published as a number rather than as a paragraph. */
    const added = (120 + 4) / (240 + 40)

    expect(added).toBeCloseTo(0.443, 3)
    expect(straddled?.share).not.toBeCloseTo(added, 2)
  })

  /** The straddle is measured and not bounded, and it biases nothing here. */
  it("reports the straddle it corrected for, once per weighing page", () => {
    const card = typeRow(
      libraryActionOf(
        [
          readingOf(page(), [
            tally("page", { views: 400, reached: 400, engaged: 120 }),
            tally("card", { views: 400, reached: 240, engaged: 120 }),
          ]),
        ],
        [row({ opened: 100, appearances: 400 })],
      ),
      "loom.card",
    )

    expect(card?.drift).toBe(300)
    expect(card?.pending).toBe(0)
    expect(card?.share).toBe(0.5)
    expect(card?.settled).toBe(true)
  })

  it("says the weights are not final while openings are waiting to be folded", () => {
    const card = typeRow(
      libraryActionOf(
        [
          readingOf(page(), [
            tally("page", { views: 40, reached: 40, engaged: 10 }),
            tally("card", { views: 40, reached: 40, engaged: 10 }),
          ]),
        ],
        [row({ opened: 100, appearances: 40 })],
      ),
      "loom.card",
    )

    expect(card?.pending).toBe(60)
    expect(card?.share).toBe(0.25)
    expect(card?.settled).toBe(false)
  })
})

/**
 * The difference this reading has from the reach reading of the same kinds, and
 * the one thing that is new in it.
 */
describe("the door as a weight and nothing else", () => {
  /**
   * A kind borne by one page is that page's own sound figure, which 0256 has to
   * withhold and this does not: both terms are reaches off the same rows, so the
   * page's scale cancels before the figure is taken.
   */
  it("answers a kind borne by one page with no door row at all, where a share of arrivals is withheld", () => {
    const reading = readingOf(page(), [
      tally("page", { views: 100, reached: 100, engaged: 30 }),
      tally("card", { views: 100, reached: 100, engaged: 30 }),
    ])
    const card = typeRow(libraryActionOf([reading], []), "loom.card")
    const reach = libraryReachOf([reading], []).byType.find(
      (of) => of.kind.by === "type" && of.kind.type === "loom.card",
    )

    expect(card?.share).toBe(0.3)
    expect(card?.onDoorScale).toBe(false)
    expect(card?.met).toBeNull()
    expect(card?.acted).toBeNull()
    expect(card?.ignored).toBeNull()
    expect(card?.silence).toBeNull()
    expect(card?.weighed).toBe(1)

    expect(reach?.share).toBeNull()
    expect(reach?.silence).toBe("unscaled")
  })

  /** The same page at a fourfold straddle, with no door row to correct it by. */
  it("gives the scale-free share the same answer at a fourfold straddle, because the scale cancels", () => {
    const share = (factor: number) =>
      typeRow(
        libraryActionOf(
          [
            readingOf(page(), [
              tally("page", {
                views: 100 * factor,
                reached: 100 * factor,
                engaged: 30 * factor,
              }),
              tally("card", {
                views: 100 * factor,
                reached: 100 * factor,
                engaged: 30 * factor,
              }),
            ]),
          ],
          [],
        ),
        "loom.card",
      )?.share

    expect(share(1)).toBe(0.3)
    expect(share(4)).toBe(0.3)
  })

  /**
   * 0256's refusal, unchanged and for its reason: a weighted mean over the pages
   * that could be priced is a figure whose denominator nobody named.
   */
  it("withholds a kind borne by two pages when one of them cannot be scaled", () => {
    const library = libraryActionOf(
      [
        readingOf(page(), [
          tally("page", { views: 100, reached: 100, engaged: 30 }),
          tally("card", { views: 100, reached: 100, engaged: 30 }),
        ]),
        readingOf(page({ treeId: OTHER_TREE }), [
          tally(
            "page",
            { views: 10, reached: 10, engaged: 9 },
            { treeId: OTHER_TREE },
          ),
          tally(
            "card",
            { views: 10, reached: 10, engaged: 9 },
            { treeId: OTHER_TREE },
          ),
        ]),
      ],
      [row({ opened: 100, appearances: 100 })],
    )
    const card = typeRow(library, "loom.card")

    expect(card?.weighed).toBe(2)
    expect(card?.share).toBeNull()
    expect(card?.silence).toBe("unscaled")
    expect(library.unscaled).toEqual([
      { treeId: OTHER_TREE, revision: 1, silence: "unmeasured" },
    ])
    expect(library.scaled).toBe(1)
  })

  /**
   * The other consequence of the door being only a weight: a page that
   * contributed no reach contributes nothing to either term whatever its scale
   * is, so it needs none.
   */
  it("answers a kind standing on an unscalable page that nobody reached", () => {
    const library = libraryActionOf(
      [
        readingOf(page(), [
          tally("page", { views: 100, reached: 100, engaged: 30 }),
          tally("card", { views: 100, reached: 100, engaged: 30 }),
        ]),
        readingOf(page({ treeId: OTHER_TREE }), [
          tally("page", { views: 10, reached: 10 }, { treeId: OTHER_TREE }),
          tally("card", { views: 10, reached: 0 }, { treeId: OTHER_TREE }),
        ]),
      ],
      [row({ opened: 100, appearances: 100 })],
    )
    const card = typeRow(library, "loom.card")

    expect(card?.pages).toBe(2)
    expect(card?.weighed).toBe(1)
    expect(card?.unmet).toBe(1)
    expect(card?.share).toBe(0.3)
    expect(card?.onDoorScale).toBe(true)
    expect(card?.met).toBe(100)
  })

  it("names the state of the door that caused a withheld row, per state", () => {
    const withRow = (counts: Partial<StoredPageViews>) =>
      typeRow(
        libraryActionOf(
          [
            readingOf(page(), [
              tally("page", { views: 100, reached: 100, engaged: 30 }),
              tally("card", { views: 100, reached: 100, engaged: 30 }),
            ]),
            readingOf(page({ treeId: OTHER_TREE }), [
              tally(
                "page",
                { views: 10, reached: 10, engaged: 2 },
                { treeId: OTHER_TREE },
              ),
              tally(
                "card",
                { views: 10, reached: 10, engaged: 2 },
                { treeId: OTHER_TREE },
              ),
            ]),
          ],
          [
            row({ opened: 100, appearances: 100 }),
            row({ treeId: OTHER_TREE, ...counts }),
          ],
        ),
        "loom.card",
      )?.silence

    expect(withRow({ opened: 0, appearances: 10 })).toBe("unopened")
    expect(withRow({ opened: 10, appearances: 0 })).toBe("uncounted")
    expect(withRow({ opened: 10, appearances: 10 })).toBeNull()
  })
})

describe("the states this reading can be in and what it refuses to say", () => {
  /**
   * There is no nought share here, and that is not a gap: the denominator is the
   * readers who got there, so a kind nobody reached has none.
   */
  it("withholds a kind whose enterable places nobody reached, rather than calling it nought", () => {
    const card = typeRow(
      libraryActionOf(
        [
          readingOf(page(), [
            tally("page", { views: 100, reached: 100 }),
            tally("card", { views: 100, reached: 0 }),
          ]),
        ],
        [row({ opened: 100, appearances: 100 })],
      ),
      "loom.card",
    )

    expect(card?.verdicts).toBe(1)
    expect(card?.unmet).toBe(1)
    expect(card?.share).toBeNull()
    expect(card?.silence).toBe("unread")
  })

  it("keeps a placement no row named out of the terms, and counts it", () => {
    const card = typeRow(
      libraryActionOf(
        [readingOf(page(), [tally("page", { views: 100, reached: 100 })])],
        [row({ opened: 100, appearances: 100 })],
      ),
      "loom.card",
    )

    expect(card?.unknown).toBe(1)
    expect(card?.verdicts).toBe(0)
    expect(card?.silence).toBe("unread")
  })

  /**
   * The sender fault that otherwise looks like a page nobody touches. An
   * unwalked page puts reach into the denominator and nothing into the
   * numerator, so it is refused rather than blended.
   */
  it("withholds every kind on a page that holds actions and credits nobody, and names the page", () => {
    const library = libraryActionOf(
      [
        readingOf(page(), [
          tally("page", { views: 100, reached: 100 }),
          tally("card", { views: 100, reached: 100 }),
          tally("cta", { views: 100, reached: 100, activations: 70 }),
        ]),
      ],
      [row({ opened: 100, appearances: 100 })],
    )
    const card = typeRow(library, "loom.card")

    expect(card?.share).toBeNull()
    expect(card?.silence).toBe("unwalked")
    expect(library.unwalked).toEqual([{ treeId: TREE, revision: 1 }])
  })

  it("leaves a page nobody acted on out of the unwalked list, because nothing there is a filing rule", () => {
    const library = libraryActionOf(
      [
        readingOf(page(), [
          tally("page", { views: 100, reached: 100 }),
          tally("card", { views: 100, reached: 100 }),
        ]),
      ],
      [row({ opened: 100, appearances: 100 })],
    )
    const card = typeRow(library, "loom.card")

    expect(library.unwalked).toEqual([])
    expect(card?.share).toBe(0)
    expect(card?.ignored).toBe(100)
    expect(card?.standings).toEqual({ acted: 0, untouched: 1, unknown: 0 })
  })

  /**
   * One unwalked page poisons a mean across pages, which is why the refusal is
   * for the whole kind and not for that page's term.
   */
  it("withholds a kind where only one of its pages credits nobody", () => {
    const library = libraryActionOf(
      [
        readingOf(page(), [
          tally("page", { views: 100, reached: 100, engaged: 30 }),
          tally("card", { views: 100, reached: 100, engaged: 30 }),
        ]),
        readingOf(page({ treeId: OTHER_TREE }), [
          tally("page", { views: 100, reached: 100 }, { treeId: OTHER_TREE }),
          tally("card", { views: 100, reached: 100 }, { treeId: OTHER_TREE }),
          tally(
            "cta",
            { views: 100, reached: 100, activations: 9 },
            { treeId: OTHER_TREE },
          ),
        ]),
      ],
      [
        row({ opened: 100, appearances: 100 }),
        row({ treeId: OTHER_TREE, opened: 100, appearances: 100 }),
      ],
    )

    expect(typeRow(library, "loom.card")?.silence).toBe("unwalked")
    expect(library.unwalked).toEqual([{ treeId: OTHER_TREE, revision: 1 }])
  })

  it("has a sentence for every silence it can report, and never twice the same one", () => {
    const lines = KIND_ACTION_SILENCES.map(describeKindActionSilence)

    expect(KIND_ACTION_SILENCES).toEqual([
      "unread",
      "unplaced",
      "unscaled",
      "unopened",
      "uncounted",
      "unenterable",
      "unwalked",
    ])
    expect(new Set(lines).size).toBe(lines.length)
    expect(lines.every((line) => line.length > 0)).toBe(true)
  })

  /**
   * The alarm, and the one thing that can put the share above 1. Asserted as
   * *exactly where* rather than *somewhere*, over every row of the reading.
   */
  it("puts a share above 1 exactly where a placement credits more readers inside it than reached it", () => {
    const library = libraryActionOf(
      [
        readingOf(page(), [
          tally("page", { views: 100, reached: 100, engaged: 30 }),
          tally("card", { views: 100, reached: 40, engaged: 90 }),
        ]),
      ],
      [row({ opened: 100, appearances: 100 })],
    )

    for (const of of [...library.byType, ...library.byRole]) {
      if ((of.share ?? 0) > 1) expect(of.unreconciled).toBeGreaterThan(0)
    }

    expect(typeRow(library, "loom.card")?.share).toBe(2.25)
    expect(typeRow(library, "loom.card")?.unreconciled).toBe(1)
    expect(typeRow(library, "loom.card")?.settled).toBe(false)

    /**
     * The alarm outlives the symptom, which is the half worth pinning: the row
     * that adds the card to the page's root is dragged back under 1 and still
     * says a placement in it is impossible.
     */
    expect(roleRow(library, null)?.share).toBeLessThan(1)
    expect(roleRow(library, null)?.unreconciled).toBe(1)
    expect(roleRow(library, null)?.settled).toBe(false)
  })

  /**
   * The published keys, pinned, so that a figure added later has to argue with
   * this test rather than appear beside the others.
   */
  it("publishes these figures and no others", () => {
    const library = ONE_PAGE()
    const card = typeRow(library, "loom.card")

    expect(Object.keys(library).sort()).toEqual([
      "arrivals",
      "byRole",
      "byType",
      "duplicated",
      "duplicatedRows",
      "insides",
      "leaves",
      "mostIgnored",
      "pages",
      "placements",
      "roleDisagreed",
      "scaled",
      "standings",
      "trees",
      "unranked",
      "unscaled",
      "unwalked",
    ])
    expect(Object.keys(card ?? {}).sort()).toEqual([
      "acted",
      "drift",
      "ignored",
      "insides",
      "kind",
      "leaves",
      "met",
      "onDoorScale",
      "pages",
      "pending",
      "placements",
      "role",
      "roots",
      "settled",
      "share",
      "silence",
      "standings",
      "unknown",
      "unmet",
      "unreconciled",
      "verdicts",
      "weighed",
    ])
  })
})

describe("the counts, and the five shapes a double count takes", () => {
  it("drops a reading handed in twice and leaves the kind's row unchanged", () => {
    const reading = readingOf(page(), [
      tally("page", { views: 100, reached: 100, engaged: 30 }),
      tally("card", { views: 100, reached: 100, engaged: 30 }),
    ])
    const rows = [row({ opened: 100, appearances: 100 })]
    const once = libraryActionOf([reading], rows)
    const twice = libraryActionOf([reading, reading], rows)

    expect(twice.duplicated).toBe(1)
    expect(twice.pages).toBe(1)
    expect(typeRow(twice, "loom.card")).toEqual(typeRow(once, "loom.card"))
  })

  it("ignores a door row handed in twice, so a page's weight is not doubled", () => {
    const reading = readingOf(page(), [
      tally("page", { views: 100, reached: 100, engaged: 30 }),
      tally("card", { views: 100, reached: 100, engaged: 30 }),
    ])
    const once = libraryActionOf(
      [reading],
      [row({ opened: 100, appearances: 100 })],
    )
    const twice = libraryActionOf(
      [reading],
      [
        row({ opened: 100, appearances: 100 }),
        row({ opened: 100, appearances: 100 }),
      ],
    )

    expect(twice.duplicatedRows).toBe(1)
    expect(twice.arrivals).toBe(once.arrivals)
    expect(typeRow(twice, "loom.card")?.share).toBe(
      typeRow(once, "loom.card")?.share,
    )
    expect(typeRow(twice, "loom.card")?.met).toBe(100)
  })

  it("keeps two revisions of one tree apart from one reading handed in twice", () => {
    const library = libraryActionOf(
      [
        readingOf(page(), [
          tally("page", { views: 100, reached: 100, engaged: 30 }),
          tally("card", { views: 100, reached: 100, engaged: 30 }),
        ]),
        readingOf(page({ revision: 2 }), [
          tally(
            "page",
            { views: 100, reached: 100, engaged: 60 },
            { revision: 2 },
          ),
          tally(
            "card",
            { views: 100, reached: 100, engaged: 60 },
            { revision: 2 },
          ),
        ]),
      ],
      [
        row({ opened: 100, appearances: 100 }),
        row({ revision: 2, opened: 100, appearances: 100 }),
      ],
    )
    const card = typeRow(library, "loom.card")

    expect(library.duplicated).toBe(0)
    expect(library.pages).toBe(2)
    expect(library.trees).toBe(1)
    expect(card?.pages).toBe(2)
    expect(card?.weighed).toBe(2)
    expect(card?.share).toBe(0.45)
  })

  /**
   * The two numbers that look like each other: a page bearing three placements
   * of one kind contributes three (page view, place) pairs to that kind and one
   * page view to the reading's arrivals.
   */
  it("counts a page's readers once per place a kind stands there, and once in the arrivals", () => {
    const tree = treeOf(
      element("page", "loom.stack", {}, [
        element("one", "loom.card", {}, [element("a", "loom.button")]),
        element("two", "loom.card", {}, [element("b", "loom.button")]),
        element("three", "loom.card", {}, [element("c", "loom.button")]),
      ]),
    )
    const library = libraryActionOf(
      [
        readingOf(tree, [
          tally("page", { views: 100, reached: 100, engaged: 30 }),
          tally("one", { views: 100, reached: 100, engaged: 30 }),
          tally("two", { views: 100, reached: 100, engaged: 10 }),
          tally("three", { views: 100, reached: 100, engaged: 20 }),
        ]),
      ],
      [row({ opened: 100, appearances: 100 })],
    )
    const card = typeRow(library, "loom.card")

    expect(card?.met).toBe(300)
    expect(card?.acted).toBe(60)
    expect(card?.share).toBe(0.2)
    expect(library.arrivals).toBe(100)
  })

  /** A kind standing inside itself is two placements, which is what a placement means. */
  it("counts a kind standing inside itself at both depths", () => {
    const tree = treeOf(
      element("page", "loom.stack", {}, [
        element("outer", "loom.card", {}, [
          element("inner", "loom.card", {}, [element("cta", "loom.button")]),
        ]),
      ]),
    )
    const card = typeRow(
      libraryActionOf(
        [
          readingOf(tree, [
            tally("page", { views: 100, reached: 100, engaged: 50 }),
            tally("outer", { views: 100, reached: 100, engaged: 50 }),
            tally("inner", { views: 100, reached: 80, engaged: 40 }),
          ]),
        ],
        [row({ opened: 100, appearances: 100 })],
      ),
      "loom.card",
    )

    expect(card?.placements).toBe(2)
    expect(card?.insides).toBe(2)
    expect(card?.met).toBe(180)
    expect(card?.acted).toBe(90)
    expect(card?.share).toBe(0.5)
  })

  it("counts arrivals once per page and never once per placement", () => {
    const library = libraryActionOf(
      [
        readingOf(page(), [
          tally("page", { views: 40, reached: 40, engaged: 10 }),
        ]),
        readingOf(page({ treeId: OTHER_TREE }), [
          tally(
            "page",
            { views: 9, reached: 9, engaged: 1 },
            { treeId: OTHER_TREE },
          ),
        ]),
      ],
      [
        row({ opened: 40, appearances: 40 }),
        row({ treeId: OTHER_TREE, opened: 9, appearances: 9 }),
      ],
    )

    expect(library.arrivals).toBe(49)
    expect(library.pages).toBe(2)
    expect(library.trees).toBe(2)
  })
})

describe("what the reading leads with", () => {
  /**
   * 0221's ranking rule, spelled once and tested where it would be got wrong: a
   * kind two readers in three ignore is a worse rate and a smaller problem than
   * one four hundred of them ignore.
   */
  it("leads with the kind the most readers met and did nothing inside, and not with the worst rate", () => {
    const tree = treeOf(
      element("page", "loom.stack", {}, [
        element("big", "loom.card", {}, [element("a", "loom.button")]),
        element("small", "loom.hero", {}, [element("b", "loom.button")]),
      ]),
    )
    const library = libraryActionOf(
      [
        readingOf(tree, [
          tally("page", { views: 1000, reached: 1000, engaged: 500 }),
          tally("big", { views: 1000, reached: 1000, engaged: 600 }),
          tally("small", { views: 1000, reached: 3, engaged: 0 }),
        ]),
      ],
      [row({ opened: 1000, appearances: 1000 })],
    )

    expect(typeRow(library, "loom.card")?.share).toBe(0.6)
    expect(typeRow(library, "loom.hero")?.share).toBe(0)
    expect(typeRow(library, "loom.card")?.ignored).toBe(400)
    expect(typeRow(library, "loom.hero")?.ignored).toBe(3)
    expect(library.mostIgnored?.kind).toEqual({
      by: "type",
      type: "loom.card",
    })
    expect(library.byType.map((of) => of.kind)).toEqual([
      { by: "type", type: "loom.stack" },
      { by: "type", type: "loom.card" },
      { by: "type", type: "loom.hero" },
      { by: "type", type: "loom.button" },
    ])
  })

  it("leads with nothing where no kind was met and ignored", () => {
    const library = libraryActionOf([readingOf(page(), [])], [])

    expect(library.mostIgnored).toBeNull()
    expect(library.unranked).toBe(0)
  })

  /**
   * A ranking that silently skipped rows is the kind of omission a surface
   * presents as a complete answer, so the rows it could not see are a number.
   */
  it("says how many rows have a share the ranking cannot see", () => {
    const library = libraryActionOf(
      [
        readingOf(page(), [
          tally("page", { views: 100, reached: 100, engaged: 30 }),
          tally("card", { views: 100, reached: 100, engaged: 30 }),
        ]),
      ],
      [],
    )

    expect(typeRow(library, "loom.card")?.share).toBe(0.3)
    expect(typeRow(library, "loom.card")?.ignored).toBeNull()
    expect(library.mostIgnored).toBeNull()
    expect(library.unranked).toBe(1)
  })

  it("names the placements that are a page's root, because a root's figure is the page's own", () => {
    const library = ONE_PAGE()
    const stack = typeRow(library, "loom.stack")
    const card = typeRow(library, "loom.card")

    expect(stack?.roots).toBe(1)
    expect(card?.roots).toBe(0)
    expect(stack?.share).toBe(0.3)
    expect(
      pageActionOf(
        readingOf(page(), [
          tally("page", { views: 100, reached: 100, engaged: 30 }),
          tally("card", { views: 100, reached: 100, engaged: 30 }),
          tally("cta", { views: 100, reached: 100, activations: 44 }),
        ]),
      ).whole?.share,
    ).toBe(0.3)
  })
})

describe("the three readings of one library", () => {
  it("keys its rows the way the census and the reach reading do, so the three pair", () => {
    const reading = readingOf(
      page(),
      [
        tally("page", { views: 100, reached: 100, engaged: 30 }),
        tally("card", { views: 100, reached: 100, engaged: 30 }),
      ],
      CARDS_HEAD,
    )
    const rows = [row({ opened: 100, appearances: 100 })]
    const action = libraryActionOf([reading], rows)
    const census = libraryReadingOf([reading])
    const reach = libraryReachOf([reading], rows)

    expect(action.byType.map((of) => kindKeyOf(of.kind)).sort()).toEqual(
      census.byType.map((of) => kindKeyOf(of.kind)).sort(),
    )
    expect(action.byRole.map((of) => kindKeyOf(of.kind)).sort()).toEqual(
      reach.byRole.map((of) => kindKeyOf(of.kind)).sort(),
    )
    expect(action.placements).toBe(census.placements)
    expect(action.placements).toBe(reach.placements)
  })

  it("gives every role in the vocabulary a row, and the one for types that declared none", () => {
    const action = libraryActionOf(
      [
        readingOf(
          page(),
          [
            tally("page", { views: 100, reached: 100, engaged: 30 }),
            tally("card", { views: 100, reached: 100, engaged: 30 }),
          ],
          CARDS_HEAD,
        ),
      ],
      [row({ opened: 100, appearances: 100 })],
    )

    expect(roleRow(action, "heading")?.placements).toBe(1)
    expect(roleRow(action, "heading")?.share).toBe(0.3)
    expect(roleRow(action, null)?.placements).toBeGreaterThan(0)
    expect(roleRow(action, "heading")?.role).toBeNull()
  })

  /**
   * Two readings joined against two registries and concatenated: the type plays
   * one part (0114), so a disagreement is two libraries read as one and every
   * role row is then about neither.
   */
  it("raises a type whose readings disagreed about the role it plays", () => {
    const counters = (treeId: TreeId) => [
      tally("page", { views: 100, reached: 100, engaged: 30 }, { treeId }),
      tally("card", { views: 100, reached: 100, engaged: 30 }, { treeId }),
    ]
    const action = libraryActionOf(
      [
        readingOf(page(), counters(TREE), CARDS_HEAD),
        readingOf(
          page({ treeId: OTHER_TREE }),
          counters(OTHER_TREE),
          BODY_IS_COPY,
        ),
      ],
      [
        row({ opened: 100, appearances: 100 }),
        row({ treeId: OTHER_TREE, opened: 100, appearances: 100 }),
      ],
    )

    expect(action.roleDisagreed).toEqual([primitiveType("loom.card")])
  })

  it("is empty-handed rather than wrong when it is handed nothing", () => {
    const action = libraryActionOf([], [])

    expect(action.pages).toBe(0)
    expect(action.placements).toBe(0)
    expect(action.arrivals).toBe(0)
    expect(action.byType).toEqual([])
    expect(action.byRole.every((of) => of.silence === "unplaced")).toBe(true)
    expect(action.mostIgnored).toBeNull()
  })
})
