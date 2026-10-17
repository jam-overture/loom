import { describe, expect, it } from "vitest"

import { DEFAULT_AUDIENCE_ID } from "../audience/audience.js"
import type { TreeId } from "../ids.js"
import type { JsonObject } from "../json.js"
import { nodeId, OTHER_TREE, primitiveType, RIDERS, SKIERS, TREE } from "../testing/reader-signal-contract.js"
import type { ElementNode, LoomNode } from "../tree/node.js"
import { TREE_SCHEMA_VERSION, type LoomTree } from "../tree/tree.js"

import {
  copyChangeOf,
  describeKindWordReachChangeSilence,
  describeKindWordReachMovement,
  KIND_WORD_REACH_CHANGE_SILENCES,
  KIND_WORD_REACH_MOVEMENTS,
  libraryCopyChangeOf,
  libraryWordReachChangeOf,
  pageReadingOf,
  type KindWordReachChange,
  type LibraryWindow,
  type PageReading,
  type PartDeclarations,
  type ReaderTally,
  type StoredPageViews,
} from "./index.js"

/**
 * Built on real readings and real door rows on both sides, because that is what
 * the function takes: two windows of a library, each with the page-view rows
 * that put its pages on one scale.
 *
 * The three cases the arithmetic exists for are built literally rather than
 * described — a kind standing twice on one page, two pages swapping their
 * traffic with every reader reading exactly as before, and a rollup window that
 * folds one page three times — so the assertions that say the figure survives
 * them are testing the arithmetic rather than restating it.
 *
 * The word counts are fixed and small on purpose: every passage below says four
 * words, so a figure in words per reader is four times a share of readers and
 * can be read off the fixture by hand.
 */

/** Four words, which is what every passage in this file says. */
const WORDS = 4

/** Everything but the wrapper declares its `body` as copy, so no passage is a floor. */
const BODY_IS_COPY: PartDeclarations = {
  copyFor: (type) => (type === "loom.stack" ? undefined : ["body"]),
  typesWithRole: () => [],
}

/**
 * The quote declares nothing, so it says four words it cannot count and nought
 * it can: the commonest floor there is, and the one a trigger counted in words
 * would miss.
 */
const QUOTE_SAYS_NOTHING: PartDeclarations = {
  copyFor: (type) => (type === "loom.section" ? ["body"] : undefined),
  typesWithRole: () => [],
}

/**
 * The quote declares a second prop that holds a number, so it says four words
 * it can count and an unknown quantity it cannot.
 *
 * A floor with a non-nought mass behind it, which is what distinguishes
 * *withheld because there is nothing* from *withheld because the sign cannot be
 * trusted*.
 */
const QUOTE_HIDES_SOMETHING: PartDeclarations = {
  copyFor: (type) => (type === "loom.quote" ? ["body", "count"] : ["body"]),
  typesWithRole: () => [],
}

/**
 * Two types playing one part, which is the only way a recast place can be held
 * still: the role vocabulary has one member today (0114), so `heading` is what a
 * test that needs two types of one role has to use.
 */
const QUOTES_ARE_HEADINGS: PartDeclarations = {
  copyFor: (type) => (type === "loom.stack" ? undefined : ["body"]),
  typesWithRole: (role) =>
    role === "heading" ? [primitiveType("loom.quote"), primitiveType("loom.testimonial")] : [],
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

const tally = (name: string, counts: Partial<ReaderTally>, tree: LoomTree): ReaderTally => ({
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

/** An intro of four words and a quote of four, which is the page every case below is about. */
const page = ({
  revision = 1,
  treeId = TREE,
  quote = "loom.quote",
  says = "what a reader said",
  props = {},
}: {
  revision?: number
  treeId?: TreeId
  quote?: string
  says?: string
  props?: JsonObject
} = {}): LoomTree =>
  treeOf(
    element("page", "loom.stack", {}, [
      element("intro", "loom.section", { body: "a line somebody wrote" }),
      element("quote", quote, { body: says, ...props }),
    ]),
    revision,
    treeId
  )

/** The same page with the quote standing twice, which is how a weight per place is told from one per page. */
const twice = ({ treeId = TREE }: { treeId?: TreeId } = {}): LoomTree =>
  treeOf(
    element("page", "loom.stack", {}, [
      element("one", "loom.quote", { body: "what a reader said" }),
      element("two", "loom.quote", { body: "what another reader said" }),
    ]),
    1,
    treeId
  )

type Side = { readonly reading: PageReading; readonly row: StoredPageViews }

/**
 * One page of one window: the door's two numbers, and what each addressed node
 * reported.
 *
 * A node handed `null` gets no counter row at all, which is the only way a part
 * reads `skipped` rather than `unknown` (0212); a node handed `0` gets a row of
 * noughts, which is `unknown`.
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
    reached: Readonly<Record<string, number | null>>
    declarations?: PartDeclarations
  }
): Side => ({
  reading: pageReadingOf(
    tree,
    [
      tally("page", { views: appearances, reached: appearances }, tree),
      ...Object.entries(reached).flatMap(([name, count]) =>
        count === null ? [] : [tally(name, { views: appearances, reached: count }, tree)]
      ),
    ],
    declarations
  ),
  row: row({ treeId: tree.treeId, revision: tree.revision, opened, appearances }),
})

const windowOf = (pages: readonly Side[]): LibraryWindow => ({
  readings: pages.map((of) => of.reading),
  rows: pages.map((of) => of.row),
})

/**
 * One form of one page: the same window as {@link read}, with the audience the
 * store keeps both the counters and the door row under (0284), and the reading
 * scoped to it.
 */
const inAudience = (
  audienceId: typeof SKIERS,
  tree: LoomTree,
  {
    opened,
    appearances,
    reached,
  }: {
    opened: number
    appearances: number
    reached: Readonly<Record<string, number | null>>
  }
): Side => ({
  reading: pageReadingOf(
    tree,
    [
      { ...tally("page", { views: appearances, reached: appearances }, tree), audienceId },
      ...Object.entries(reached).flatMap(([name, count]) =>
        count === null
          ? []
          : [{ ...tally(name, { views: appearances, reached: count }, tree), audienceId }]
      ),
    ],
    BODY_IS_COPY,
    audienceId
  ),
  row: row({ audienceId, treeId: tree.treeId, revision: tree.revision, opened, appearances }),
})

const typeRow = (
  change: { readonly byType: readonly KindWordReachChange[] },
  type: string
): KindWordReachChange | undefined =>
  change.byType.find((of) => of.kind.by === "type" && of.kind.type === type)

const roleRow = (
  change: { readonly byRole: readonly KindWordReachChange[] },
  role: string | null
): KindWordReachChange | undefined =>
  change.byRole.find((of) => of.kind.by === "role" && of.kind.role === role)

describe("the words of a kind of part the typical reader reached, before and after", () => {
  /**
   * The reason this unit exists beside the three comparisons it is built on.
   * The quote stands in one place and says the same four words throughout, so a
   * comparison of places and a comparison of carried words both say the place
   * is read and the words are read — while the typical reader who met it got to
   * 1.6 of its words and gets to 2.8.
   */
  it("answers in words per reader where a share of words can only answer read or not", () => {
    const tree = page()
    const was = read(tree, { opened: 100, appearances: 100, reached: { intro: 100, quote: 40 } })
    const now = read(tree, { opened: 100, appearances: 100, reached: { intro: 100, quote: 70 } })

    const change = libraryWordReachChangeOf(windowOf([was]), windowOf([now]))
    const words = libraryCopyChangeOf([was.reading], [now.reading])
    const quote = typeRow(change, "loom.quote")

    expect(
      words.byType.find((of) => of.kind.by === "type" && of.kind.type === "loom.quote")?.movement
    ).toBe("held")
    expect(quote?.movement).toBe("taken-up")
    expect(quote?.words.typicalWas).toBeCloseTo(1.6, 10)
    expect(quote?.words.typicalNow).toBeCloseTo(2.8, 10)
    expect(quote?.words.shift).toBeCloseTo(1.2, 10)
    expect(quote?.words.wordsMoved).toBeCloseTo(120, 10)
    expect(quote?.cause).toBe("readers")
    expect(quote?.words.weightMoved).toBe(0)
    expect(quote?.words.exact).toBe(true)
  })

  /**
   * The identity this reading and a comparison of one page's words share, where
   * the two are the same question: one page, every passage spoken for, and a
   * door that folded every view exactly once. Asserted to the last bit rather
   * than closely, because a surface drawing the page figure beside the library
   * figure is drawing the same number.
   */
  it("gives one page the figure that page's own comparison gives it, to the last bit", () => {
    const tree = page()
    const was = read(tree, { opened: 100, appearances: 100, reached: { intro: 100, quote: 40 } })
    const now = read(tree, { opened: 100, appearances: 100, reached: { intro: 100, quote: 70 } })

    const change = libraryWordReachChangeOf(windowOf([was]), windowOf([now]))
    const one = copyChangeOf(was.reading, now.reading)

    expect(change.words.typicalWas).toBe(one.typical?.was)
    expect(change.words.typicalNow).toBe(one.typical?.now)
    expect(change.words.shift).toBe(one.typical?.change)
  })

  /**
   * The rule that makes this a second unit rather than a field on a share of
   * readers. The quote stands twice on one page and the reader who met the page
   * met both, so the mass is eight words and the weight is the page's hundred
   * — once. A weight added per place would halve it.
   */
  it("weights a page once however many times the kind stands on it", () => {
    const tree = twice()
    const side = read(tree, { opened: 100, appearances: 100, reached: { one: 50, two: 50 } })
    const window = windowOf([side])

    const change = libraryWordReachChangeOf(window, window)
    const quote = typeRow(change, "loom.quote")

    expect(quote?.places).toBe(2)
    expect(quote?.pages).toBe(1)
    expect(quote?.words.countedWas).toBe(100)
    expect(quote?.words.typicalWas).toBe(WORDS)
    expect(quote?.words.shift).toBe(0)
    expect(quote?.movement).toBe("held")
  })

  /**
   * The case the counterfactuals exist for, built literally: two pages swap
   * their traffic and every reader on every page reads exactly as before. A
   * single weighted figure falls from 2.96 words to 1.04 and nobody read
   * anything differently.
   */
  it("says the pages moved it, where two pages swapped their traffic and no reader changed", () => {
    const busy = page({ treeId: TREE })
    const quiet = page({ treeId: OTHER_TREE })
    const was = windowOf([
      read(busy, { opened: 900, appearances: 900, reached: { intro: 900, quote: 720 } }),
      read(quiet, { opened: 100, appearances: 100, reached: { intro: 100, quote: 20 } }),
    ])
    const now = windowOf([
      read(busy, { opened: 100, appearances: 100, reached: { intro: 100, quote: 80 } }),
      read(quiet, { opened: 900, appearances: 900, reached: { intro: 900, quote: 180 } }),
    ])

    const quote = typeRow(libraryWordReachChangeOf(was, now), "loom.quote")

    expect(quote?.words.typicalWas).toBeCloseTo(2.96, 10)
    expect(quote?.words.typicalNow).toBeCloseTo(1.04, 10)
    expect(quote?.movement).toBe("abandoned")
    expect(quote?.cause).toBe("pages")
    expect(quote?.words.ifTrafficHeld).toBeCloseTo(2.96, 10)
    expect(quote?.words.ifReadingHeld).toBeCloseTo(1.04, 10)
    expect(quote?.words.weightMoved).toBeCloseTo(0.8, 10)
  })

  /**
   * The door's whole purpose, and the mutation no fixture with
   * `appearances === opened` can catch. One page's window straddles threefold:
   * a hundred readers arrive, three hundred appearances are folded, and every
   * one of them reached the quote. Its rate is four words per reader and its
   * weight is a hundred page views — not three hundred — so the library figure
   * is 2 and not 3.
   */
  it("puts a page whose window straddles on the door's scale, in both the weight and the rate", () => {
    const straddling = page({ treeId: TREE })
    const plain = page({ treeId: OTHER_TREE })
    const side = [
      read(straddling, { opened: 100, appearances: 300, reached: { intro: 300, quote: 300 } }),
      read(plain, { opened: 100, appearances: 100, reached: { intro: 100, quote: null } }),
    ]
    const window = windowOf(side)

    const quote = typeRow(libraryWordReachChangeOf(window, window), "loom.quote")

    expect(quote?.words.countedWas).toBe(200)
    expect(quote?.words.typicalWas).toBe(2)
    expect(quote?.words.driftWas).toBe(200)
    expect(quote?.words.shift).toBe(0)
    expect(quote?.words.exact).toBe(false)
  })

  /**
   * A floor says nought visible words and hides all of them, which is what a
   * trigger counted in words would read as *this kind says nothing*. The row
   * reports the floor, publishes both levels as floors, and withholds every
   * figure a surface would subtract.
   */
  it("reports a floor rather than a silence where a kind says only what it hides", () => {
    const tree = page()
    const was = read(tree, {
      opened: 100,
      appearances: 100,
      reached: { intro: 100, quote: 40 },
      declarations: QUOTE_SAYS_NOTHING,
    })
    const now = read(tree, {
      opened: 100,
      appearances: 100,
      reached: { intro: 100, quote: 70 },
      declarations: QUOTE_SAYS_NOTHING,
    })

    const quote = typeRow(libraryWordReachChangeOf(windowOf([was]), windowOf([now])), "loom.quote")

    expect(quote?.silence).toBe("floored")
    expect(quote?.words.passages).toBe(1)
    expect(quote?.words.carried).toBe(0)
    expect(quote?.words.floored).toBe(1)
    expect(quote?.words.flooredWords).toBe(0)
    expect(quote?.words.typicalWas).toBe(0)
    expect(quote?.words.typicalNow).toBe(0)
    expect(quote?.words.shift).toBeNull()
    expect(quote?.words.wordsMoved).toBeNull()
    expect(quote?.words.ifTrafficHeld).toBeNull()
    expect(quote?.words.ifReadingHeld).toBeNull()
    expect(quote?.cause).toBeNull()
    expect(quote?.movement).toBe("unknown")
    expect(quote?.words.exact).toBe(false)
  })

  /**
   * The same rule where the mass is not nought: the quote declares a prop
   * holding a number, so four words are certain and an unknown quantity is not.
   * Both levels stand as floors and every difference goes — and the weights
   * stand whole, because there is no word in them.
   */
  it("publishes both levels and the weights under a floor, and withholds every difference", () => {
    const tree = page({ props: { count: 3 } })
    const was = read(tree, {
      opened: 100,
      appearances: 100,
      reached: { intro: 100, quote: 40 },
      declarations: QUOTE_HIDES_SOMETHING,
    })
    const now = read(tree, {
      opened: 100,
      appearances: 100,
      reached: { intro: 100, quote: 70 },
      declarations: QUOTE_HIDES_SOMETHING,
    })

    const quote = typeRow(libraryWordReachChangeOf(windowOf([was]), windowOf([now])), "loom.quote")

    expect(quote?.silence).toBe("floored")
    expect(quote?.words.floored).toBe(1)
    expect(quote?.words.flooredWords).toBe(WORDS)
    expect(quote?.words.typicalWas).toBeCloseTo(1.6, 10)
    expect(quote?.words.typicalNow).toBeCloseTo(2.8, 10)
    expect(quote?.words.shift).toBeNull()
    expect(quote?.words.weightMoved).toBe(0)
  })

  /**
   * A passage nothing can be said about is in no mass, on either side, and its
   * words are published where they can be seen rather than counted as nought.
   * A reader who pressed a band no view ever named is the case: calling that
   * nought words reached would understate the figure in the direction nobody
   * checks.
   */
  it("keeps a passage no window can speak for out of both masses", () => {
    const tree = page()
    const was = read(tree, { opened: 100, appearances: 100, reached: { intro: 100, quote: 0 } })
    const now = read(tree, { opened: 100, appearances: 100, reached: { intro: 100, quote: 70 } })

    const change = libraryWordReachChangeOf(windowOf([was]), windowOf([now]))
    const quote = typeRow(change, "loom.quote")

    expect(quote?.silence).toBe("unread")
    expect(quote?.words.passages).toBe(1)
    expect(quote?.words.spoken).toBe(0)
    expect(quote?.words.unspoken).toBe(WORDS)
    expect(quote?.words.typicalWas).toBeNull()
    expect(change.words.unspoken).toBe(WORDS)
    expect(change.words.comparable).toBe(WORDS)
  })

  /**
   * A rewritten passage has two word counts and a word-weighted figure needs
   * one, so it is counted and is in no mass. A kind whose every passage was
   * rewritten is `wordless`, which is a fact about the change.
   */
  it("counts a rewritten passage and puts it in no mass", () => {
    const before = page({ says: "what a reader said" })
    const after = page({ revision: 2, says: "what another reader told us" })
    const was = read(before, { opened: 100, appearances: 100, reached: { intro: 100, quote: 40 } })
    const now = read(after, { opened: 100, appearances: 100, reached: { intro: 100, quote: 70 } })

    const change = libraryWordReachChangeOf(windowOf([was]), windowOf([now]))
    const quote = typeRow(change, "loom.quote")

    expect(quote?.places).toBe(1)
    expect(quote?.rewritten).toBe(1)
    expect(quote?.words.passages).toBe(0)
    expect(quote?.silence).toBe("wordless")
    expect(quote?.movement).toBe("unknown")
    expect(change.rewritten).toBe(1)
    expect(change.republished).toBe(1)
  })

  /**
   * A page the door cannot scale takes the whole row with it, on the side it is
   * unscalable on — *of the pages we could price* is not a sentence a surface
   * prints — and the page is published once with the side and its own
   * vocabulary's reason.
   */
  it("withholds the figure where one side's door cannot scale a page, and names the side", () => {
    const tree = page()
    const was = read(tree, { opened: 100, appearances: 100, reached: { intro: 100, quote: 40 } })
    const now = read(tree, { opened: 100, appearances: 100, reached: { intro: 100, quote: 70 } })

    const change = libraryWordReachChangeOf(windowOf([was]), {
      readings: [now.reading],
      rows: [],
    })
    const quote = typeRow(change, "loom.quote")

    expect(quote?.silence).toBe("unscaled")
    expect(quote?.words.typicalWas).toBeNull()
    expect(quote?.words.spoken).toBe(1)
    /* The page is still one of this kind's, so a withheld row says how much is behind it. */
    expect(quote?.pages).toBe(1)
    expect(quote?.words.unreconciled).toBe(0)
    expect(change.scaled).toBe(0)
    expect(change.unscaled).toEqual([
      { treeId: TREE, revision: 1, audienceId: null, against: 1, side: "now", silence: "unmeasured" },
    ])
  })

  /**
   * The double count that is permanent once it is written down (0158), at both
   * seams a caller can hit: the same reading handed in twice, and the same door
   * row handed in twice. Neither moves a figure, and both are reported.
   */
  it("drops a reading handed in twice and a door row handed in twice, and says how many", () => {
    const tree = page()
    const once = read(tree, { opened: 100, appearances: 100, reached: { intro: 100, quote: 40 } })
    const plain = windowOf([once])
    const doubled: LibraryWindow = {
      readings: [once.reading, once.reading],
      rows: [once.row, once.row],
    }

    const straight = libraryWordReachChangeOf(plain, plain)
    const twice = libraryWordReachChangeOf(doubled, doubled)

    expect(twice.duplicated).toBe(2)
    expect(twice.duplicatedRows).toBe(2)
    expect(twice.arrivalsWas).toBe(straight.arrivalsWas)
    expect(typeRow(twice, "loom.quote")?.words.typicalWas).toBe(
      typeRow(straight, "loom.quote")?.words.typicalWas
    )
  })

  /**
   * The same pairing defect, at the reading whose figure is a mass rather than a
   * share. Two forms of a page share a tree and a revision, so before 0292 the
   * second form's mass was dropped as the first's handed in twice — and the
   * `pages` behind a withheld row counted the two as one.
   */
  it("pairs two forms of one page as two pages, each weighted by its own arrivals", () => {
    const tree = page()
    const change = libraryWordReachChangeOf(
      windowOf([
        inAudience(SKIERS, tree, {
          opened: 100,
          appearances: 100,
          reached: { intro: 100, quote: 40 },
        }),
        inAudience(RIDERS, tree, {
          opened: 10,
          appearances: 10,
          reached: { intro: 10, quote: 10 },
        }),
      ]),
      windowOf([
        inAudience(SKIERS, tree, {
          opened: 100,
          appearances: 100,
          reached: { intro: 100, quote: 70 },
        }),
        inAudience(RIDERS, tree, {
          opened: 10,
          appearances: 10,
          reached: { intro: 10, quote: 10 },
        }),
      ])
    )
    const quote = typeRow(change, "loom.quote")

    expect(change.duplicated).toBe(0)
    expect(change.ambiguous).toEqual([])
    expect(change.pages).toBe(2)
    expect(quote?.pages).toBe(2)
    expect(change.arrivalsWas).toBe(110)
    /**
     * The quote says four words. 40 of 100 skiers and 10 of 10 riders reached
     * it, so 50 readers of 110 arrivals got 4 words each, and the typical
     * reader of the kind reached 200 ÷ 110 of them; 70 and 10 make it 320 ÷ 110.
     */
    expect(quote?.words.typicalWas).toBeCloseTo(200 / 110, 10)
    expect(quote?.words.typicalNow).toBeCloseTo(320 / 110, 10)
  })

  /** The other side of the narrowing: one form handed in twice is still a double count. */
  it("still drops one form handed in twice, with the other form standing", () => {
    const tree = page()
    const skiers = inAudience(SKIERS, tree, {
      opened: 10,
      appearances: 10,
      reached: { intro: 10, quote: 4 },
    })
    const riders = inAudience(RIDERS, tree, {
      opened: 10,
      appearances: 10,
      reached: { intro: 10, quote: 4 },
    })
    const later = windowOf([skiers, riders])

    const change = libraryWordReachChangeOf(
      { readings: [skiers.reading, skiers.reading, riders.reading], rows: [skiers.row, riders.row] },
      later
    )

    expect(change.duplicated).toBe(1)
    expect(change.pages).toBe(2)
    expect(typeRow(change, "loom.quote")?.pages).toBe(2)
    expect(change.arrivalsWas).toBe(20)
  })

  /** The exclusion names the form, because a list of trees cannot say *one of these two*. */
  it("excludes the ambiguous form alone and names which form it was", () => {
    const tree = page()
    const second = page({ revision: 2 })
    const reached = { intro: 10, quote: 4 }
    const change = libraryWordReachChangeOf(
      {
        readings: [
          inAudience(SKIERS, tree, { opened: 10, appearances: 10, reached }).reading,
          inAudience(SKIERS, second, { opened: 10, appearances: 10, reached }).reading,
          inAudience(RIDERS, tree, { opened: 10, appearances: 10, reached }).reading,
        ],
        rows: [
          inAudience(SKIERS, tree, { opened: 10, appearances: 10, reached }).row,
          inAudience(RIDERS, tree, { opened: 10, appearances: 10, reached }).row,
        ],
      },
      windowOf([inAudience(RIDERS, tree, { opened: 10, appearances: 10, reached })])
    )

    expect(change.ambiguous).toEqual([{ treeId: TREE, audienceId: SKIERS }])
    expect(change.pages).toBe(1)
  })

  /**
   * One window handed in as both sides: every figure is identical, the
   * difference is exactly nought rather than nearly, and nothing is attributed
   * because nothing moved.
   */
  it("moves nothing where one window is handed in as both sides", () => {
    const busy = page({ treeId: TREE })
    const quiet = page({ treeId: OTHER_TREE })
    const window = windowOf([
      read(busy, { opened: 97, appearances: 97, reached: { intro: 97, quote: 41 } }),
      read(quiet, { opened: 13, appearances: 13, reached: { intro: 13, quote: 7 } }),
    ])

    const change = libraryWordReachChangeOf(window, window)

    for (const of of [...change.byType, ...change.byRole]) {
      if (of.silence !== null) continue

      expect(of.words.shift).toBe(0)
      expect(of.words.wordsMoved).toBe(0)
      expect(of.words.weightMoved).toBe(0)
      expect(of.cause).toBeNull()
      expect(["held", "still-unread"]).toContain(of.movement)
    }

    expect(change.words.shift).toBe(0)
    expect(change.gained).toBe(0)
    expect(change.lost).toBe(0)
  })

  /**
   * A node recast into another type is a place one type left and another took,
   * while the role rows hold it still wherever the two types play the same part
   * (0266). Its words are carried by neither type and by the role, and the
   * whole library carries them not at all.
   */
  it("holds a recast place still by role and not by type, and carries it in neither", () => {
    const before = page({ quote: "loom.quote" })
    const after = page({ revision: 2, quote: "loom.testimonial" })
    const was = read(before, {
      opened: 100,
      appearances: 100,
      reached: { intro: 100, quote: 40 },
      declarations: QUOTES_ARE_HEADINGS,
    })
    const now = read(after, {
      opened: 100,
      appearances: 100,
      reached: { intro: 100, quote: 70 },
      declarations: QUOTES_ARE_HEADINGS,
    })

    const change = libraryWordReachChangeOf(windowOf([was]), windowOf([now]))

    expect(change.recast).toBe(1)
    expect(typeRow(change, "loom.quote")?.lost).toBe(1)
    expect(typeRow(change, "loom.quote")?.words.passages).toBe(0)
    expect(typeRow(change, "loom.testimonial")?.gained).toBe(1)
    expect(roleRow(change, "heading")?.places).toBe(1)
    expect(roleRow(change, "heading")?.words.carried).toBe(WORDS)
    expect(roleRow(change, "heading")?.movement).toBe("taken-up")
    expect(change.words.carried).toBe(WORDS)
  })

  /**
   * The figure a comparison of readers cannot have. A page's words partition
   * across its parts exactly once (0212, 0235), so adding every kind's carried
   * words reads no sentence twice — which is true down each of the two keys
   * independently.
   */
  it("adds every kind's words to the library's own, once down each key", () => {
    const tree = page()
    const other = page({ treeId: OTHER_TREE })
    const window = windowOf([
      read(tree, { opened: 100, appearances: 100, reached: { intro: 100, quote: 40 } }),
      read(other, { opened: 50, appearances: 50, reached: { intro: 50, quote: 25 } }),
    ])

    const change = libraryWordReachChangeOf(window, window)
    const added = (rows: readonly KindWordReachChange[]): number =>
      rows.reduce((total, of) => total + of.words.carried, 0)

    expect(change.words.carried).toBe(4 * WORDS)
    expect(added(change.byType)).toBe(change.words.carried)
    expect(added(change.byRole)).toBe(change.words.carried)
  })

  /**
   * The ranking rule, which is reader-words and never the rate: a kind the
   * typical reader reads a little less of across a busy page is a bigger fact
   * than one they read a lot less of on a quiet one.
   */
  it("ranks by the reader-words a kind moved and not by how far its figure fell", () => {
    const busy = treeOf(
      element("page", "loom.stack", {}, [
        element("intro", "loom.section", { body: "a line somebody wrote" }),
      ]),
      1,
      TREE
    )
    const quiet = page({ treeId: OTHER_TREE })
    const was = windowOf([
      read(busy, { opened: 1000, appearances: 1000, reached: { intro: 900 } }),
      read(quiet, { opened: 10, appearances: 10, reached: { intro: 10, quote: 10 } }),
    ])
    const now = windowOf([
      read(busy, { opened: 1000, appearances: 1000, reached: { intro: 400 } }),
      read(quiet, { opened: 10, appearances: 10, reached: { intro: 10, quote: 0 } }),
    ])

    const change = libraryWordReachChangeOf(was, now)

    expect(change.mostAbandoned?.kind).toEqual({ by: "type", type: "loom.section" })
    expect(change.byType[0]?.kind).toEqual({ by: "type", type: "loom.section" })
  })

  /**
   * The movement is stated at the **later** window's scale, which no fixture
   * whose two windows are the same size can distinguish. The reading is
   * unchanged at 1.6 words and 2.8, and twice as many readers are there to feel
   * it: 240 reader-words and not 120.
   */
  it("states the movement at the later window's scale and not the earlier one's", () => {
    const tree = page()
    const was = read(tree, { opened: 100, appearances: 100, reached: { intro: 100, quote: 40 } })
    const now = read(tree, { opened: 200, appearances: 200, reached: { intro: 200, quote: 140 } })

    const quote = typeRow(libraryWordReachChangeOf(windowOf([was]), windowOf([now])), "loom.quote")

    expect(quote?.words.countedWas).toBe(100)
    expect(quote?.words.countedNow).toBe(200)
    expect(quote?.words.shift).toBeCloseTo(1.2, 10)
    expect(quote?.words.wordsMoved).toBeCloseTo(240, 10)
  })

  /**
   * A place whose **role** changed is held still by neither role, exactly as a
   * place whose type changed is held still by neither type (0266) — and the
   * two keys answer independently, so the type row holds it throughout.
   *
   * The two windows declare the same type differently, which is the state a
   * deployment is in for one deploy after a registry change and the reason the
   * later window's answer is the one published (0114).
   */
  it("holds a place whose role changed still by neither role, and by its type throughout", () => {
    const tree = page()
    const was = read(tree, {
      opened: 100,
      appearances: 100,
      reached: { intro: 100, quote: 40 },
      declarations: QUOTES_ARE_HEADINGS,
    })
    const now = read(tree, {
      opened: 100,
      appearances: 100,
      reached: { intro: 100, quote: 70 },
      declarations: BODY_IS_COPY,
    })

    const change = libraryWordReachChangeOf(windowOf([was]), windowOf([now]))

    expect(change.roleDisagreed).toEqual([primitiveType("loom.quote")])
    expect(roleRow(change, "heading")?.lost).toBe(1)
    expect(roleRow(change, "heading")?.places).toBe(0)
    expect(roleRow(change, "heading")?.words.carried).toBe(0)
    expect(roleRow(change, "heading")?.silence).toBe("unpaired")
    expect(roleRow(change, null)?.gained).toBe(1)
    /* The wrapper and the intro, which played no part before and play none now. */
    expect(roleRow(change, null)?.places).toBe(2)
    expect(roleRow(change, null)?.words.carried).toBe(WORDS)
    expect(typeRow(change, "loom.quote")?.places).toBe(1)
    expect(typeRow(change, "loom.quote")?.movement).toBe("taken-up")
  })

  /**
   * The labels are the caller's, which is the rule every comparison in this
   * subsystem follows: two sides held backwards are a comparison with every
   * movement reversed and never a refusal.
   */
  it("reverses the movement where a caller holds the two sides backwards", () => {
    const tree = page()
    const one = read(tree, { opened: 100, appearances: 100, reached: { intro: 100, quote: 40 } })
    const other = read(tree, { opened: 100, appearances: 100, reached: { intro: 100, quote: 70 } })

    const forwards = typeRow(libraryWordReachChangeOf(windowOf([one]), windowOf([other])), "loom.quote")
    const backwards = typeRow(libraryWordReachChangeOf(windowOf([other]), windowOf([one])), "loom.quote")

    expect(forwards?.movement).toBe("taken-up")
    expect(backwards?.movement).toBe("abandoned")
    expect(backwards?.words.shift).toBeCloseTo(-(forwards?.words.shift ?? 0), 10)
  })

  /**
   * A kind met everywhere and read nowhere, still read nowhere, is the one
   * state here that is an instruction — and it is kept apart from two figures
   * that merely agree.
   */
  it("tells a kind nobody has ever reached from one whose figure merely held", () => {
    const tree = page()
    const side = read(tree, {
      opened: 100,
      appearances: 100,
      reached: { intro: 100, quote: null },
    })
    const window = windowOf([side])

    const change = libraryWordReachChangeOf(window, window)

    expect(typeRow(change, "loom.quote")?.movement).toBe("still-unread")
    expect(typeRow(change, "loom.quote")?.words.typicalWas).toBe(0)
    expect(typeRow(change, "loom.section")?.movement).toBe("held")
  })

  /** A role nothing in the library plays is a fact about the library, not a missing row. */
  it("gives every role in the vocabulary a row, and says so where nothing plays it", () => {
    const tree = page()
    const window = windowOf([
      read(tree, { opened: 100, appearances: 100, reached: { intro: 100, quote: 40 } }),
    ])

    const change = libraryWordReachChangeOf(window, window)

    expect(roleRow(change, "heading")?.silence).toBe("unplaced")
    expect(roleRow(change, null)?.words.carried).toBe(2 * WORDS)
  })

  it("publishes a line for every silence and every movement it can report", () => {
    expect(KIND_WORD_REACH_CHANGE_SILENCES).toHaveLength(8)
    expect(KIND_WORD_REACH_MOVEMENTS).toHaveLength(5)

    for (const silence of KIND_WORD_REACH_CHANGE_SILENCES) {
      expect(describeKindWordReachChangeSilence(silence).length).toBeGreaterThan(0)
    }
    for (const movement of KIND_WORD_REACH_MOVEMENTS) {
      expect(describeKindWordReachMovement(movement).length).toBeGreaterThan(0)
    }
  })

  /** Nothing handed in at all is every role row `unplaced` and no type row. */
  it("answers two empty windows without inventing a kind", () => {
    const change = libraryWordReachChangeOf({ readings: [], rows: [] }, { readings: [], rows: [] })

    expect(change.byType).toEqual([])
    expect(change.byRole.every((of) => of.silence === "unplaced")).toBe(true)
    expect(change.words.typicalWas).toBeNull()
    expect(change.pages).toBe(0)
  })
})
