import { describe, expect, it } from "vitest"

import {
  nodeIdSchema,
  primitiveTypeSchema,
  treeIdSchema,
  type ElementNode,
  type LoomNode,
  type LoomTree,
} from "@jam-overture/loom"
import {
  ACTION_STANDINGS,
  pageActionOf,
  pageReachOf,
  pageReadingOf,
  type ReaderTally,
  type StoredPageViews,
} from "@jam-overture/loom/signals"

import { runtimeWordsIn } from "../_test/plain-language"

import { arrivalsOf, type PageArrivals } from "./arrivals"
import {
  actionsHaveNowhereToGo,
  didAnything,
  doingOf,
  mostOpenedLine,
  mostPressedLine,
  nothingPressed,
  nothingWasIgnored,
  whatTheyIgnored,
  whereTheSharesWent,
  whereTheyActed,
  type PageDoing,
} from "./doing"
import { namesInTree } from "./part-name"
import { readingOf } from "./vocabulary"

const nodeId = (id: string) => nodeIdSchema.parse(id)
const type = (value: string) => primitiveTypeSchema.parse(value)

const TREE = treeIdSchema.parse("t_seed1")

const text = (id: string, value: string): LoomNode => ({ kind: "text", id: nodeId(id), value })

const element = (
  id: string,
  primitive: string,
  children: readonly LoomNode[] = []
): ElementNode => ({
  kind: "element",
  id: nodeId(id),
  type: type(primitive),
  props: {},
  children,
})

/**
 * A page of three regions, each with something inside it, and a control of its
 * own in the middle one.
 *
 * The shape matters to every test below: `n_hero`, `n_band` and `n_foot` bear
 * element parts, so a share of readers is a measurement of them. `n_buy` is a
 * button with nothing inside it, so its nought is a filing rule — it is the
 * part the whole of this module's honesty is about.
 */
const PAGE: LoomTree = {
  schemaVersion: 1,
  treeId: TREE,
  revision: 4,
  root: element("n_page", "loom.page", [
    element("n_hero", "loom.card", [
      element("n_herowords", "loom.prose", [text("n_herotext", "Autumn arrivals")]),
    ]),
    element("n_band", "loom.card", [
      element("n_bandwords", "loom.prose", [text("n_bandtext", "What it costs")]),
      element("n_buy", "loom.button", [text("n_buytext", "Buy it")]),
    ]),
    element("n_foot", "loom.card", [
      element("n_footwords", "loom.prose", [text("n_foottext", "The small print")]),
    ]),
  ]),
}

const DECLARED = { copyFor: () => undefined, typesWithRole: () => [] }

/**
 * A row, with the registered type as a plain string: the brand is what may be
 * *read* as one and a fixture is writing one, so the parse happens here rather
 * than at nine call sites.
 */
const tally = (
  id: string,
  counters: Partial<Omit<ReaderTally, "type">> & { readonly type?: string } = {}
): ReaderTally => ({
  treeId: counters.treeId ?? TREE,
  revision: counters.revision ?? 4,
  nodeId: nodeId(id),
  type: type(counters.type ?? "loom.card"),
  views: counters.views ?? 0,
  reached: counters.reached ?? 0,
  engaged: counters.engaged ?? 0,
  dwellMs: counters.dwellMs ?? 0,
  activations: counters.activations ?? 0,
  opens: counters.opens ?? 0,
  closes: counters.closes ?? 0,
  completions: counters.completions ?? 0,
})

const door = (row: Partial<StoredPageViews> = {}): StoredPageViews => ({
  treeId: row.treeId ?? TREE,
  revision: row.revision ?? 4,
  opened: row.opened ?? 0,
  appearances: row.appearances ?? 0,
  updatedAt: row.updatedAt ?? "2026-10-08T09:00:00.000Z",
})

const doing = (tallies: readonly ReaderTally[]): PageDoing =>
  doingOf(pageActionOf(pageReadingOf(PAGE, tallies, DECLARED)), namesInTree(PAGE))

const withArrivals = (
  tallies: readonly ReaderTally[],
  rows: readonly StoredPageViews[]
): { readonly doing: PageDoing; readonly arrivals: PageArrivals } => {
  const joined = pageReadingOf(PAGE, tallies, DECLARED)
  const arrivals = arrivalsOf(pageReachOf(joined, rows), namesInTree(PAGE))

  return { doing: doingOf(pageActionOf(joined), namesInTree(PAGE), arrivals), arrivals }
}

/**
 * Forty visits. Twenty of them did something somewhere; twelve of those did it
 * in the middle band, which fourteen presses landed in; nobody touched the
 * footer, which nineteen of them read.
 */
const USED: readonly ReaderTally[] = [
  tally("n_page", { views: 40, reached: 40, engaged: 20 }),
  tally("n_hero", { views: 40, reached: 36, engaged: 3 }),
  tally("n_band", { views: 40, reached: 30, engaged: 12 }),
  tally("n_buy", { views: 40, reached: 28, activations: 14, type: "loom.button" }),
  tally("n_foot", { views: 40, reached: 19 }),
]

describe("the page as a whole, and the region that saw the most of it", () => {
  /**
   * **The root's own row, not the largest row.**
   *
   * The reading this replaced took the maximum `engaged` across the revision,
   * which is the root's on every healthy page and is a different number the
   * moment a part reports more than the root does — a state the counters can be
   * in for an hour after an upgrade. Every action is strictly inside the root
   * and the root is on screen in every visit that drew the page, so its row is
   * the one page-wide headcount this data supports.
   */
  it("reads the whole page's use off the root's own row", () => {
    expect(doing(USED).anyone?.nodeId).toBe("n_page")
    expect(doing(USED).anyone?.within).toBe(20)
    expect(doing(USED).anyone?.share).toBe(0.5)
  })

  it("names the most-used region, which is never the page itself", () => {
    const { mostUsed } = doing(USED)

    expect(mostUsed?.nodeId).toBe("n_band")
    expect(mostUsed?.within).toBe(12)
    expect(mostUsed?.reached).toBe(30)
  })

  /**
   * Ranked on the headcount rather than on the share, which is 0221's rule: a
   * band two readers in three used is a better ratio and smaller news than one
   * four hundred of them used. A share would put a region reached once and used
   * once above everything else on the page.
   */
  it("ranks a region on how many readers used it, not on the share of its own", () => {
    const { mostUsed } = doing([
      tally("n_page", { views: 40, reached: 40, engaged: 20 }),
      tally("n_hero", { views: 40, reached: 1, engaged: 1 }),
      tally("n_band", { views: 40, reached: 30, engaged: 12 }),
    ])

    expect(mostUsed?.nodeId).toBe("n_band")
  })

  /**
   * **A change from the reading this replaced, and it is deliberate.**
   *
   * `pageUse` withheld the region whenever its engagement equalled the page's,
   * on the argument that a part indistinguishable from the whole page is not
   * news about a part. It was identifying the page by the maximum, so it had
   * no choice. The root is now known structurally, and *everybody who did
   * anything on this page did it in the pricing band* is the strongest sentence
   * this section can say — so it is said, where it used to be a blank.
   */
  it("names a region every reader who did anything did it in, rather than withholding it", () => {
    const { mostUsed } = doing([
      tally("n_page", { views: 9, reached: 9, engaged: 4 }),
      tally("n_band", { views: 9, reached: 9, engaged: 4 }),
    ])

    expect(mostUsed?.nodeId).toBe("n_band")
  })

  /**
   * The tie breaks on reading order rather than on an identifier, which is both
   * a stabler answer and a visible one: a reader comparing two cards can see
   * which of two parts comes first on the page and cannot see which node id
   * sorts earlier.
   */
  it("breaks a tie on reading order, so the same counters name the same region twice", () => {
    const tallies = [
      tally("n_page", { views: 9, reached: 9, engaged: 5 }),
      tally("n_foot", { views: 9, reached: 4, engaged: 3 }),
      tally("n_hero", { views: 9, reached: 4, engaged: 3 }),
    ]

    expect(doing(tallies).mostUsed?.nodeId).toBe("n_hero")
    expect(doing([...tallies].reverse()).mostUsed?.nodeId).toBe("n_hero")
  })

  it("has nothing to say about a page nobody used", () => {
    const quiet = doing([
      tally("n_page", { views: 9, reached: 9, dwellMs: 900 }),
      tally("n_hero", { views: 9, reached: 9, dwellMs: 900 }),
    ])

    expect(quiet.mostUsed).toBeUndefined()
    expect(whereTheyActed(quiet)).toBeUndefined()
    expect(didAnything(quiet)).toContain("Nobody did anything on this page")
  })

  /**
   * A region is credited by what happened under it and by nothing else, so a
   * band nobody reported seeing, whose button somebody pressed, has a use and
   * no measured reach. That is a real state rather than a fault and it is said
   * in words instead of divided by.
   */
  it("offers no denominator for a region nobody reported on screen", () => {
    const line = whereTheyActed(
      doing([
        tally("n_page", { views: 9, reached: 9, engaged: 5 }),
        tally("n_band", { engaged: 4 }),
      ])
    )

    expect(readingOf(line!)).toContain("nothing reported whether it was ever on screen")
    expect(readingOf(line!)).not.toContain("of the 0 visits")
  })

  it("offers no denominator for a region used by more views than reported seeing it", () => {
    const line = whereTheyActed(
      doing([
        tally("n_page", { views: 9, reached: 9, engaged: 5 }),
        tally("n_band", { views: 9, reached: 2, engaged: 4 }),
      ])
    )

    expect(readingOf(line!)).toContain("nothing reported whether it was ever on screen")
  })
})

describe("the region readers reach and never touch", () => {
  /**
   * **The sentence this screen could not say.** Every usage figure on it was a
   * presence — what was pressed, what was opened, which region saw the most of
   * it — so a band readers scrolled past without touching appeared as a part
   * with time on screen and three zeroes beside it.
   */
  it("names the region most readers reached and did nothing in", () => {
    const { mostIgnored } = doing(USED)

    expect(mostIgnored?.nodeId).toBe("n_foot")
    expect(mostIgnored?.standing).toBe("untouched")
    expect(readingOf(whatTheyIgnored(doing(USED))!)).toContain("19 visits")
  })

  /**
   * **The one claim that needs a structural fact rather than a counter.**
   *
   * `n_buy` is a button: a press is filed against it and credited to the
   * regions it happened inside, so its `engaged` is 0 for ever whether or not
   * anybody pressed it. Calling that untouched would report fourteen presses as
   * a part nobody touched, which is a filing rule misread as a finding about
   * readers.
   */
  it("never calls a part with nothing inside it untouched, however little happened", () => {
    const parts = doing(USED).parts
    const buy = parts.find((part) => part.nodeId === "n_buy")

    expect(buy?.bearsParts).toBe(false)
    expect(buy?.uses).toBe(14)
    /*
     * `acted` because fourteen presses are against it and that is a use of its
     * own. What is withheld is the **share**, which is the figure a filing rule
     * cannot support — and the standing it must never take is `untouched`,
     * which is what the loop below holds over every leaf on the page.
     */
    expect(buy?.standing).toBe("acted")
    expect(buy?.share).toBeUndefined()

    const quiet = doing([
      tally("n_page", { views: 9, reached: 9, engaged: 4 }),
      tally("n_buy", { views: 9, reached: 9, type: "loom.button" }),
    ]).parts.find((part) => part.nodeId === "n_buy")

    expect(quiet?.standing).toBe("unknown")
    expect(quiet?.share).toBeUndefined()

    for (const part of parts) if (!part.bearsParts) expect(part.standing).not.toBe("untouched")
  })

  /**
   * The page as a whole is excluded for the reason every ranking on this card
   * excludes it: it contains every part it would outrank. A page nobody did
   * anything on is a sentence the lead already says.
   */
  it("never names the page itself as the region readers ignore", () => {
    const quiet = doing([
      tally("n_page", { views: 9, reached: 9 }),
      tally("n_hero", { views: 9, reached: 9 }),
    ])

    expect(quiet.mostIgnored?.nodeId).not.toBe("n_page")
  })

  /**
   * Good news, said rather than shown as an absence — the reason the `settled`
   * tone exists. A missing line here reads as a section that failed to render.
   */
  it("says so out loud when every region readers reached was used by somebody", () => {
    const all = doing([
      tally("n_page", { views: 9, reached: 9, engaged: 5 }),
      tally("n_hero", { views: 9, reached: 9, engaged: 4 }),
    ])

    expect(all.standings.untouched).toBe(0)
    expect(whatTheyIgnored(all)).toBeUndefined()
    expect(nothingWasIgnored(all)).toContain("readers reach and never touch")
  })

  it("has no good news for a page nobody did anything on, because the lead says it", () => {
    expect(nothingWasIgnored(doing([tally("n_page", { views: 9, reached: 9 })]))).toBeUndefined()
  })
})

describe("presses and openings, which are occurrences and never readers", () => {
  it("names what was pressed most and what was opened most", () => {
    const busy = doing([
      tally("n_page", { views: 30, reached: 30, engaged: 9 }),
      tally("n_buy", { views: 30, reached: 20, activations: 14, type: "loom.button" }),
      tally("n_band", { views: 30, reached: 18, opens: 9, closes: 4 }),
    ])

    expect(busy.mostPressed?.nodeId).toBe("n_buy")
    expect(busy.mostOpened?.nodeId).toBe("n_band")
    expect(readingOf(mostPressedLine(busy)!)).toContain("pressed 14 times")
    expect(readingOf(mostOpenedLine(busy)!)).toContain("opened out 9 times")
    expect(nothingPressed(busy)).toBeUndefined()
  })

  it("counts one press as a press", () => {
    const once = doing([
      tally("n_page", { views: 2, reached: 2, engaged: 1 }),
      tally("n_buy", { views: 2, reached: 2, activations: 1, type: "loom.button" }),
    ])

    expect(readingOf(mostPressedLine(once)!)).toContain("pressed 1 time")
  })

  /**
   * Nothing pressed is a real answer and it is not the same answer as nobody
   * doing anything: a reader who followed a link did something and pressed
   * nothing.
   */
  it("says nobody pressed anything in words rather than printing a zero", () => {
    const read = doing([
      tally("n_page", { views: 4, reached: 4, engaged: 2 }),
      tally("n_hero", { views: 4, reached: 4, engaged: 1 }),
    ])

    expect(mostPressedLine(read)).toBeUndefined()
    expect(mostOpenedLine(read)).toBeUndefined()
    expect(nothingPressed(read)).toContain("looking at this page rather than using it")
    expect(didAnything(read)).not.toContain("Nobody")
  })

  /**
   * An intensity rather than a rate: a reader who presses twice is two
   * occurrences and one person. Above 1 it says each reader used the part more
   * than once, which is a reading and not an error.
   */
  it("carries an intensity above 1 through rather than capping it", () => {
    const keen = doing([
      tally("n_page", { views: 4, reached: 4, engaged: 4 }),
      tally("n_buy", { views: 4, reached: 4, activations: 10, type: "loom.button" }),
    ])

    expect(keen.parts.find((part) => part.nodeId === "n_buy")?.usesPerReader).toBe(2.5)
  })

  /**
   * `closes ÷ opens` above 1 is closings this page's own openings cannot
   * account for, which is a disclosure a revision renders already open. Capping
   * it would hide the one thing it can diagnose.
   */
  it("carries a part shut more often than it was opened through uncapped", () => {
    const shut = doing([
      tally("n_page", { views: 9, reached: 9, engaged: 5 }),
      tally("n_band", { views: 9, reached: 9, engaged: 5, opens: 2, closes: 7 }),
    ])

    expect(shut.parts.find((part) => part.nodeId === "n_band")?.shutAgain).toBe(3.5)
  })
})

describe("actions that arrived with nowhere to put them", () => {
  /**
   * The page holds presses and credits a reader inside nothing. Every share
   * would be a nought, every region would read as untouched, and the counters
   * look perfectly healthy — so the symptom is *my readers use nothing* and the
   * cause is in the sending.
   */
  it("adds up the presses, openings and submissions no part heard about", () => {
    const lost = doing([
      tally("n_buy", { views: 6, reached: 5, activations: 7, type: "loom.button" }),
      tally("n_band", { views: 6, reached: 4, opens: 2, closes: 1, completions: 1 }),
    ])

    expect(lost.unwalked).toBe(true)
    expect(actionsHaveNowhereToGo(lost)).toContain("11 presses, openings and submissions")
    expect(actionsHaveNowhereToGo(lost)).toContain("not one of them said which part")
  })

  /**
   * It counts submissions, where the reading it replaced counted three of the
   * four counters. A deployment whose only actions are completed forms was in
   * this state and was told nothing.
   */
  it("counts a submission as an action with nowhere to go", () => {
    const lost = doing([tally("n_band", { views: 6, reached: 4, completions: 3 })])

    expect(lost.unwalked).toBe(true)
    expect(actionsHaveNowhereToGo(lost)).toContain("3 presses, openings and submissions")
  })

  /**
   * Every region up to the root is credited, so one placed press anywhere makes
   * this impossible. A nought is then the readers rather than the sender.
   */
  it("says nothing when a single action was placed", () => {
    const placed = doing([
      tally("n_page", { views: 6, reached: 6, engaged: 1 }),
      tally("n_buy", { views: 6, reached: 5, activations: 7, type: "loom.button" }),
    ])

    expect(placed.unwalked).toBe(false)
    expect(actionsHaveNowhereToGo(placed)).toBeUndefined()
  })

  it("says nothing about a page nobody used, which is not the same news", () => {
    expect(actionsHaveNowhereToGo(doing([tally("n_page", { views: 6, reached: 6 })]))).toBeUndefined()
  })

  /**
   * The pair is the only reason a reader can tell an unused page from an
   * unreported one, so no reading may be both at once.
   */
  it("is never both this and a use of the page, on any reading", () => {
    for (const reading of [
      doing([tally("n_buy", { views: 2, reached: 2, activations: 1, type: "loom.button" })]),
      doing([tally("n_page", { views: 2, reached: 2, engaged: 1 })]),
      doing([tally("n_page", { views: 2, reached: 2 })]),
    ]) {
      const both = [
        actionsHaveNowhereToGo(reading),
        reading.anyone?.within === undefined || reading.anyone.within === 0 ? undefined : "used",
      ]

      expect(both.filter((said) => said !== undefined).length).toBeLessThan(2)
    }
  })

  /**
   * A page that cannot say where anything happened must not be told that nobody
   * pressed anything either — that would be a claim about readers drawn from a
   * fault in the sending.
   */
  it("withholds every other claim about doing while it holds", () => {
    const lost = doing([
      tally("n_buy", { views: 6, reached: 5, activations: 7, type: "loom.button" }),
    ])

    expect(nothingPressed(lost)).toBeUndefined()
    expect(nothingWasIgnored(lost)).toBeUndefined()
  })
})

describe("a figure in people, and the one gate in front of it", () => {
  /**
   * The share is `engaged ÷ reached` — two distinct view counts off one row, so
   * the straddle over-count is on both sides of the division and very nearly
   * cancels. Applied back to the exact arrivals it is a count of people, which
   * is the figure a sentence says.
   */
  it("says a headcount in people where the card has an exact denominator", () => {
    const { doing: said, arrivals } = withArrivals(USED, [door({ opened: 32, appearances: 40 })])

    expect(arrivals.arrived).toBe(32)
    expect(said.readers).toBe(16)
    expect(didAnything(said, arrivals)).toBe(
      "About 16 of the 32 readers who arrived did something on this page — pressed something, followed a link, or opened something out."
    )
  })

  /**
   * **One gate, stated once, in front of every people-figure on the card.**
   *
   * `arrivals.ts` decides when a share may be applied to the arrival count, and
   * this reading asks rather than deciding again. Two spellings of that rule is
   * how a card comes to put a count of people on one section while another
   * withholds it, both right about what they could see.
   */
  it("falls back to visits under every state the arrivals cannot carry a count in", () => {
    for (const rows of [
      [] as readonly StoredPageViews[],
      [door({ opened: 0, appearances: 40 })],
      [door({ opened: 32, appearances: 0 })],
    ]) {
      const { doing: said, arrivals } = withArrivals(USED, rows)

      expect(said.readers).toBeUndefined()
      expect(didAnything(said, arrivals)).toContain("of the 40 visits")
    }
  })

  it("falls back to visits while an arrival is still waiting to be counted", () => {
    const { doing: said, arrivals } = withArrivals(
      [
        tally("n_page", { views: 10, reached: 10, engaged: 5 }),
        tally("n_band", { views: 10, reached: 8, engaged: 4 }),
      ],
      [door({ opened: 20, appearances: 10 })]
    )

    expect(arrivals.pending).toBeGreaterThan(0)
    expect(said.readers).toBeUndefined()
    expect(didAnything(said, arrivals)).toContain("visits")
  })

  /**
   * **The defect a photograph found and no test could have.**
   *
   * The first draft gave every part a people-figure the same way: the part's
   * share multiplied by the page's arrivals. The card then said *about 98 of
   * the 320 readers did something on this page* and, four lines below, *about
   * 239 of the 320 readers used something in the card* — 74% of the readers of
   * one card multiplied by the readership of the page. Both sentences were
   * right about the division they made and the property that broke is between
   * them, which is the shape this lane filed on 7 October and is now its second
   * instance.
   *
   * The rule, held here over every part of a page: **no figure under the
   * page-wide headcount may exceed it.**
   */
  it("never says more people did something in one part than did anything at all", () => {
    const { doing: said, arrivals } = withArrivals(USED, [door({ opened: 32, appearances: 40 })])
    const surface = [
      didAnything(said, arrivals),
      readingOf(whereTheyActed(said)!),
      readingOf(whatTheyIgnored(said, arrivals)!),
    ].join(" ")

    for (const [, figure] of surface.matchAll(/about (\d+) of the/gu)) {
      expect([surface, Number(figure)]).toEqual([surface, expect.any(Number)])
      expect(Number(figure)).toBeLessThanOrEqual(arrivals.arrived)
    }

    expect(readingOf(whereTheyActed(said)!)).not.toContain("of the 32 readers")
    expect(readingOf(whereTheyActed(said)!)).toContain("visits that got that far")
  })

  /**
   * Reach in people is a figure this card already draws, in the section whose
   * whole subject is which denominator these figures are against. Working it
   * out a second way here is how two sections come to disagree about one part.
   */
  it("takes the ignored region's reach in people from the arrivals' own row", () => {
    const { doing: said, arrivals } = withArrivals(USED, [door({ opened: 32, appearances: 40 })])
    const line = readingOf(whatTheyIgnored(said, arrivals)!)
    const row = arrivals.parts.find((part) => part.nodeId === "n_foot")

    expect(line).toContain(`about ${Math.round(row!.readers!)} of the 32 readers`)
  })
})

describe("where the withheld shares went", () => {
  /**
   * What is withheld is still reported as a total (0214). A reader who sees
   * shares on four parts of a forty-part page is owed the sentence that
   * accounts for the rest, and the reason is a filing rule rather than anything
   * about their readers.
   */
  it("accounts for every part whose share is withheld structurally", () => {
    const said = doing(USED)
    const leaves = said.parts.filter((part) => !part.bearsParts).length

    expect(said.leaves).toBe(leaves)
    expect(whereTheSharesWent(said)).toContain(`${leaves} of this page's ${said.parts.length}`)
    expect(whereTheSharesWent(said)).toContain("there is no inside to a word")
    expect(whereTheSharesWent(said)).not.toContain("*")
  })

  it("counts every part in one of the three standings and in no two of them", () => {
    const said = doing(USED)
    const counted = ACTION_STANDINGS.reduce((total, name) => total + said.standings[name], 0)

    expect(counted).toBe(said.parts.length)
  })
})

describe("the words a person meets", () => {
  /**
   * The redirection of 18 August, held at the module that writes the sentences.
   * `engaged`, `activated`, `disclosed` and `unwalked` are the runtime's names
   * for what happened and no name at all for what a person did.
   */
  it("never puts the runtime's vocabulary in a sentence", () => {
    const { doing: said, arrivals } = withArrivals(USED, [door({ opened: 32, appearances: 40 })])
    const lost = doing([
      tally("n_buy", { views: 6, reached: 5, activations: 7, type: "loom.button" }),
    ])

    const sentences = [
      didAnything(said, arrivals),
      didAnything(lost),
      readingOf(whatTheyIgnored(said, arrivals)!),
      readingOf(whereTheyActed(said)!),
      readingOf(mostPressedLine(said)!),
      whereTheSharesWent(said),
      actionsHaveNowhereToGo(lost),
      nothingPressed(doing([tally("n_page", { views: 4, reached: 4, engaged: 2 })])),
      nothingWasIgnored(
        doing([
          tally("n_page", { views: 9, reached: 9, engaged: 5 }),
          tally("n_hero", { views: 9, reached: 9, engaged: 4 }),
        ])
      ),
    ]

    for (const sentence of sentences) {
      expect(sentence).toBeDefined()
      expect([sentence, runtimeWordsIn(sentence!)]).toEqual([sentence, []])
    }
  })

  /**
   * A count of people is rounded to a whole person and said with *about* in
   * front of it, because it is a share applied back to a count and not a
   * census. A fraction of a reader is the arithmetic showing through.
   */
  it("never prints a fraction of a person", () => {
    const { doing: said, arrivals } = withArrivals(USED, [door({ opened: 33, appearances: 40 })])

    expect(said.readers).not.toBe(Math.round(said.readers!))
    expect(didAnything(said, arrivals)).toContain("About 17 of the 33 readers")
    expect(didAnything(said, arrivals)).not.toMatch(/\d+\.\d/u)
  })

  /**
   * One visit is a visit. A screen that says `1 visits` is the first thing a
   * reader distrusts, and it distrusts the figures beside it afterwards.
   */
  it("counts one of anything as one of it", () => {
    const one = doing([
      tally("n_page", { views: 1, reached: 1, engaged: 1 }),
      tally("n_band", { views: 1, reached: 1, engaged: 1 }),
    ])

    expect(didAnything(one)).toContain("1 of the 1 visit ")
    expect(didAnything(one)).not.toContain("1 visits")
  })

  /**
   * A page whose root reported nothing has no headcount, and that is a third
   * answer rather than a nought: the first minutes of a window look exactly
   * like it.
   */
  it("says nothing can tell rather than nobody did, where the page has no row", () => {
    const silent = doing([tally("n_band", { views: 4, reached: 4, engaged: 2 })])

    expect(silent.anyone?.within).toBeUndefined()
    expect(silent.anyone?.standing).toBe("unknown")
    expect(didAnything(silent)).toContain("Nothing has counted whether anybody did anything")
    expect(didAnything(silent)).not.toContain("Nobody")
  })
})
