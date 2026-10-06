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
  pageReadingOf,
  readingPaceOf,
  readingProgressOf,
  READING_WORDS_PER_MINUTE,
  type PaceOptions,
  type PartDeclarations,
  type ReaderTally,
} from "@jam-overture/loom/signals"

import { runtimeWordsIn } from "../_test/plain-language"
import {
  alsoWhereTheyStop,
  everybodyHadTime,
  lingeringQuestion,
  pacingOf,
  pacingSummary,
  partsCount,
  partsThatSkim,
  plainSeconds,
  skimSentence,
  wordsNotCounted,
  worthShortening,
  type PagePacing,
} from "./pacing"
import { namesInTree } from "./part-name"
import { stoppingOf } from "./stopping"
import { readingOf } from "./vocabulary"

const nodeId = (id: string) => nodeIdSchema.parse(id)
const type = (value: string) => primitiveTypeSchema.parse(value)

const TREE = treeIdSchema.parse("t_1")

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

const treeOf = (root: ElementNode, revision = 1): LoomTree => ({
  schemaVersion: 1,
  treeId: TREE,
  revision,
  root,
})

/** `n` words, which is the only thing about the string this reading reads. */
const words = (count: number): string => Array.from({ length: count }, () => "word").join(" ")

/** What `count` words take a reader at the published rate. */
const takes = (count: number): number => (count / READING_WORDS_PER_MINUTE) * 60_000

/**
 * Nothing is declared, so a part's words are the text nodes under it.
 *
 * Which is the shape every other test in this lane uses and the one that keeps
 * the fixtures readable: a band's name and a band's words are the same quote.
 */
const DECLARED: PartDeclarations = { copyFor: () => undefined, typesWithRole: () => [] }

const tally = (
  id: string,
  counters: Partial<Omit<ReaderTally, "type">> & { readonly type?: string } = {}
): ReaderTally => ({
  treeId: counters.treeId ?? TREE,
  revision: counters.revision ?? 1,
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

/**
 * Three bands under a page, the middle one long.
 *
 * `n_price` says a hundred words, which takes 25 seconds at the published rate
 * and is the number every case below is built against. The other two say a
 * phrase each, so they are named by what they say and timed against almost
 * nothing.
 */
const PAGE = treeOf(
  element("n_page", "loom.page", [
    element("n_hero", "loom.card", [text("n_herow", "Autumn arrivals")]),
    element("n_price", "loom.card", [text("n_pricew", words(100))]),
    element("n_ask", "loom.card", [text("n_askw", "Questions")]),
  ])
)

const pacingFor = (
  tree: LoomTree,
  counters: readonly ReaderTally[],
  options: PaceOptions = {}
): PagePacing => {
  const joined = pageReadingOf(tree, counters, DECLARED)

  return pacingOf(readingPaceOf(joined, options), namesInTree(tree))
}

const partIn = (pacing: PagePacing, id: string) =>
  pacing.parts.find((part) => part.nodeId === nodeId(id))

describe("plainSeconds", () => {
  it("names both ends rather than rounding them into the middle", () => {
    expect(plainSeconds(0)).toBe("no time at all")
    expect(plainSeconds(400)).toBe("under a second")
    expect(plainSeconds(1_000)).toBe("1 second")
    expect(plainSeconds(8_000)).toBe("8 seconds")
  })

  /** Ninety seconds is where a count of seconds stops being a length anybody pictures. */
  it("turns to whole minutes above a minute and a half", () => {
    expect(plainSeconds(89_000)).toBe("89 seconds")
    expect(plainSeconds(90_000)).toBe("2 minutes")
    expect(plainSeconds(61_000)).toBe("61 seconds")
    expect(plainSeconds(150_000)).toBe("3 minutes")
  })
})

describe("partsCount", () => {
  it("never prints a plural for one", () => {
    expect(partsCount(1)).toBe("1 part")
    expect(partsCount(4)).toBe("4 parts")
  })
})

describe("pacingOf", () => {
  /**
   * The defect this whole reading exists for: every part on screen, nobody
   * stopping anywhere, and nowhere near time enough for the words.
   */
  it("calls a band readers raced through hurried while every other reading calls the page read", () => {
    const pacing = pacingFor(PAGE, [
      tally("n_page", { views: 40, reached: 40, dwellMs: 40 * takes(20) }),
      tally("n_hero", { views: 40, reached: 40, dwellMs: 40 * takes(10) }),
      tally("n_price", { views: 40, reached: 40, dwellMs: 40 * takes(20) }),
      tally("n_ask", { views: 40, reached: 40, dwellMs: 40 * takes(10) }),
    ])

    expect(partIn(pacing, "n_price")?.standing).toBe("skimmed")
    expect(pacing.mostSkimmed?.nodeId).toBe(nodeId("n_price"))
  })

  it("names a part by what it says rather than by what it is", () => {
    const pacing = pacingFor(PAGE, [
      tally("n_price", { views: 40, reached: 40, dwellMs: 40 * takes(20) }),
    ])

    expect(pacing.mostSkimmed?.name.name).toContain("word")
    expect(pacing.mostSkimmed?.name.nodeId).toBe(nodeId("n_price"))
  })

  /**
   * The page contains every part, so by words passed it would win every ranking
   * it was entered in — which is why the runtime holds it out of one and why
   * this reading has to keep doing so after renaming everything.
   */
  it("keeps the page itself out of the ranking and still reports it as the headline", () => {
    const pacing = pacingFor(PAGE, [
      tally("n_page", { views: 40, reached: 40, dwellMs: 40 * takes(5) }),
      tally("n_price", { views: 40, reached: 40, dwellMs: 40 * takes(5) }),
    ])

    expect(pacing.whole?.nodeId).toBe(nodeId("n_page"))
    expect(pacing.whole?.standing).toBe("skimmed")
    expect(pacing.mostSkimmed?.nodeId).toBe(nodeId("n_price"))
    expect(partsThatSkim(pacing).map((part) => part.nodeId)).not.toContain(nodeId("n_page"))
  })

  it("carries the correction and the rate that were applied, so the screen can say which", () => {
    const pacing = pacingFor(
      PAGE,
      [tally("n_price", { views: 10, reached: 10, dwellMs: 10 * takes(100) })],
      { inflation: 0.1, wordsPerMinute: 300 }
    )

    expect(pacing.inflation).toBe(0.1)
    expect(pacing.wordsPerMinute).toBe(300)
  })

  /**
   * The correction is the one direction a safe verdict cannot afford to be wrong
   * in, so it has to actually move a part across the line rather than only be
   * reported.
   */
  it("lets the over-count correction pull a part back from hurried", () => {
    const counters = [tally("n_price", { views: 10, reached: 10, dwellMs: 10 * takes(49) })]

    expect(pacingFor(PAGE, counters)?.mostSkimmed?.nodeId).toBe(nodeId("n_price"))
    expect(pacingFor(PAGE, counters, { inflation: 0.2 }).mostSkimmed).toBeUndefined()
  })

  it("reports a part nobody reached as nobody having got to it, not as hurried", () => {
    const pacing = pacingFor(PAGE, [
      tally("n_hero", { views: 40, reached: 40, dwellMs: 40 * takes(2) }),
    ])

    expect(partIn(pacing, "n_price")?.standing).toBe("unknown")
    expect(partIn(pacing, "n_price")?.silence).toBe("unreached")
    expect(pacing.mostSkimmed).toBeUndefined()
  })

  it("collects the parts readers stayed far past the words on, and never calls them read", () => {
    const pacing = pacingFor(PAGE, [
      tally("n_price", { views: 10, reached: 10, dwellMs: 10 * takes(1_000) }),
    ])

    expect(pacing.lingering.map((part) => part.nodeId)).toContain(nodeId("n_price"))
    expect(partsThatSkim(pacing).map((part) => part.nodeId)).not.toContain(nodeId("n_price"))
  })
})

describe("the sentences a person reads", () => {
  const RACED = [
    tally("n_page", { views: 40, reached: 40, dwellMs: 40 * takes(20) }),
    tally("n_price", { views: 40, reached: 40, dwellMs: 40 * takes(20) }),
  ]

  it("opens with the page's own time against the page's own words", () => {
    const pacing = pacingFor(PAGE, RACED)

    expect(pacingSummary(pacing)).toBe(
      "Readers spent about 5 seconds on this page, and its words take about 26 seconds to read."
    )
  })

  it("says nothing was counted rather than drawing a page nobody visited as read", () => {
    expect(pacingSummary(pacingFor(PAGE, []))).toContain("No visit has reported anything")
  })

  it("states the two times and leaves the claim about anybody's head unmade", () => {
    const pacing = pacingFor(PAGE, RACED)

    expect(readingOf(skimSentence(pacing.mostSkimmed!))).toBe(
      "Readers had about the card “word word word word word word word word…” n_price for 5 seconds, and its words take about 25 seconds."
    )
  })

  /**
   * The opposite advice to `stopping.ts`'s, and deliberately: a fall is about
   * what did not carry a reader onward, so the thing to change is the part above
   * it. A skim is this part's own words against this part's own time.
   */
  it("points at the hurried part itself and not at the one above it", () => {
    const pacing = pacingFor(PAGE, RACED)

    expect(readingOf(worthShortening(pacing.mostSkimmed!))).toContain("worth shortening")
    expect(worthShortening(pacing.mostSkimmed!).subject).toEqual(pacing.mostSkimmed!.name)
  })

  it("says a page nobody raced through is a page nobody raced through", () => {
    const pacing = pacingFor(PAGE, [
      tally("n_price", { views: 10, reached: 10, dwellMs: 10 * takes(110) }),
    ])

    expect(everybodyHadTime(pacing)).toContain("No part of this page went past people too fast")
  })

  it("stays quiet about good news on a page nothing was counted for", () => {
    expect(everybodyHadTime(pacingFor(PAGE, []))).toBeUndefined()
  })

  it("stays quiet about good news when nothing could be compared at all", () => {
    const pacing = pacingFor(treeOf(element("n_page", "loom.page")), [
      tally("n_page", { views: 4, reached: 0, dwellMs: 0 }),
    ])

    expect(everybodyHadTime(pacing)).toBeUndefined()
  })

  /** Caution one, which is the only one of the four that can embarrass a surface. */
  it("asks about lingering rather than reporting it, and says both things it can mean", () => {
    const pacing = pacingFor(PAGE, [
      tally("n_price", { views: 10, reached: 10, dwellMs: 10 * takes(1_000) }),
    ])

    const asked = lingeringQuestion(pacing)!

    expect(asked).toContain("a question rather than an answer")
    expect(asked).toContain("hard going")
    expect(asked).toContain("on screen")
    expect(asked).not.toMatch(/engage/i)
    expect(asked).not.toMatch(/longest/i)
  })

  /**
   * A numeral opening a sentence reads as a row out of a table, and the
   * sentence after this one is the most carefully worded on the section.
   */
  it("spells one rather than opening a sentence with a numeral", () => {
    const pacing = pacingFor(PAGE, [
      tally("n_price", { views: 10, reached: 10, dwellMs: 10 * takes(1_000) }),
    ])

    expect(lingeringQuestion(pacing)).toMatch(/^On one part of this page,/u)
  })

  it("shows the parts whose words could not be counted, with the remedy in the sentence", () => {
    /*
     * A band whose words are in a property, under a library that has declared
     * nothing — which is what every real library is on the way to 0223, and the
     * state a deployment's own primitives are in today. Its words are a floor:
     * it says at least this much and nothing can see how much more.
     */
    const undeclared = treeOf(
      element("n_page", "loom.page", [
        {
          kind: "element",
          id: nodeId("n_price"),
          type: type("loom.card"),
          props: { heading: "What it costs" },
          children: [],
        },
      ])
    )

    const pacing = pacingOf(
      readingPaceOf(
        pageReadingOf(
          undeclared,
          [tally("n_price", { views: 4, reached: 4, dwellMs: 4 * takes(400) })],
          DECLARED
        )
      ),
      namesInTree(undeclared)
    )

    expect(pacing.silences.unreadable).toBeGreaterThan(0)
    expect(wordsNotCounted(pacing)).toMatch(/^One part of this page could not be timed,/u)
    expect(wordsNotCounted(pacing)).toContain("could not be timed")
    expect(wordsNotCounted(pacing)).toContain("has not said which of its text is words")
  })

  it("has nothing to say about uncounted words on a page whose words all counted", () => {
    expect(wordsNotCounted(pacingFor(PAGE, RACED))).toBeUndefined()
  })

  /**
   * Every sentence this module hands a screen, against the one list the lane
   * holds — the property that catches a rewrite leaving one runtime word behind.
   */
  it("says none of the runtime's words in anything shown unasked", () => {
    const pacing = pacingFor(PAGE, [
      tally("n_page", { views: 40, reached: 40, dwellMs: 40 * takes(20) }),
      tally("n_price", { views: 40, reached: 40, dwellMs: 40 * takes(20) }),
      tally("n_hero", { views: 40, reached: 40, dwellMs: 40 * takes(1_000) }),
    ])

    for (const sentence of [
      pacingSummary(pacing),
      lingeringQuestion(pacing),
      everybodyHadTime(pacing),
      wordsNotCounted(pacing),
      readingOf(skimSentence(pacing.mostSkimmed!)),
      readingOf(worthShortening(pacing.mostSkimmed!)),
    ]) {
      if (sentence === undefined) continue

      expect([sentence, runtimeWordsIn(sentence, ["id"])]).toEqual([sentence, []])
    }
  })
})

describe("alsoWhereTheyStop", () => {
  /**
   * Two readings on different arithmetic arriving at one part, which is the
   * sentence this screen exists to be able to say.
   *
   * `n_price` is raced through *and* is the part above the steepest fall: forty
   * visits reached it and four reached the band after it.
   */
  const AGREEING = [
    tally("n_page", { views: 40, reached: 40, dwellMs: 40 * takes(20) }),
    tally("n_hero", { views: 40, reached: 40, dwellMs: 40 * takes(1) }),
    tally("n_price", { views: 40, reached: 40, dwellMs: 40 * takes(20) }),
    tally("n_ask", { views: 40, reached: 4, dwellMs: 4 * takes(1) }),
  ]

  const stoppingFor = (counters: readonly ReaderTally[]) =>
    stoppingOf(readingProgressOf(pageReadingOf(PAGE, counters, DECLARED)), namesInTree(PAGE))

  it("draws the sentence when the worst skim and the sharpest fall are the same part", () => {
    const pacing = pacingFor(PAGE, AGREEING)
    const stopping = stoppingFor(AGREEING)

    expect(stopping.steepest?.after.nodeId).toBe(nodeId("n_price"))
    expect(pacing.mostSkimmed?.nodeId).toBe(nodeId("n_price"))

    const line = alsoWhereTheyStop(pacing, stopping)!

    expect(line.subject).toEqual(pacing.mostSkimmed!.name)
    expect(readingOf(line)).toContain("Two separate readings point at the same part")
  })

  /**
   * The only thing stopping one sentence reading as one finding when it is two.
   * Here the fall is after the first band and the skim is in the second.
   */
  it("says nothing when the two readings name different parts", () => {
    const apart = [
      tally("n_page", { views: 40, reached: 40, dwellMs: 40 * takes(20) }),
      tally("n_hero", { views: 40, reached: 40, dwellMs: 40 * takes(100) }),
      tally("n_price", { views: 40, reached: 4, dwellMs: 4 * takes(1) }),
      tally("n_ask", { views: 40, reached: 4, dwellMs: 4 * takes(100) }),
    ]

    const pacing = pacingFor(PAGE, apart)
    const stopping = stoppingFor(apart)

    expect(stopping.steepest?.after.nodeId).toBe(nodeId("n_hero"))
    expect(pacing.mostSkimmed?.nodeId).toBe(nodeId("n_price"))
    expect(alsoWhereTheyStop(pacing, stopping)).toBeUndefined()
  })

  it("says nothing where there is no drop-off reading to agree with", () => {
    expect(alsoWhereTheyStop(pacingFor(PAGE, AGREEING), undefined)).toBeUndefined()
  })
})
