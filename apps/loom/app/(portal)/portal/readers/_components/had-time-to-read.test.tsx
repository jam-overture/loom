import { render } from "@testing-library/react"
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
  type ReaderTally,
} from "@jam-overture/loom/signals"

import { pacingOf, type PagePacing } from "@/app/(portal)/_lib/pacing"
import { namesInTree } from "@/app/(portal)/_lib/part-name"
import { stoppingOf, type PageStopping } from "@/app/(portal)/_lib/stopping"
import { runtimeWordsIn } from "@/app/(portal)/_test/plain-language"
import { recordOf, surfaceOf } from "@/app/(portal)/_test/rendered"

import { HadTimeToRead } from "./had-time-to-read"

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

const words = (count: number): string => Array.from({ length: count }, () => "word").join(" ")

const takes = (count: number): number => (count / READING_WORDS_PER_MINUTE) * 60_000

/** Three bands, the middle one long enough that racing past it is measurable. */
const PAGE: LoomTree = {
  schemaVersion: 1,
  treeId: TREE,
  revision: 4,
  root: element("n_page", "loom.page", [
    element("n_hero", "loom.card", [text("n_herow", "Autumn arrivals")]),
    element("n_price", "loom.card", [text("n_pricew", words(100))]),
    element("n_ask", "loom.card", [text("n_askw", "Questions")]),
  ]),
}

const DECLARED = { copyFor: () => undefined, typesWithRole: () => [] }

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

const pacingFor = (counters: readonly ReaderTally[]): PagePacing =>
  pacingOf(
    readingPaceOf(pageReadingOf(PAGE, counters, DECLARED), { inflation: 0.05 }),
    namesInTree(PAGE)
  )

const stoppingFor = (counters: readonly ReaderTally[]): PageStopping =>
  stoppingOf(readingProgressOf(pageReadingOf(PAGE, counters, DECLARED)), namesInTree(PAGE))

/** Raced through, and the same part is where people stop going. */
const AGREEING = [
  tally("n_page", { views: 40, reached: 40, dwellMs: 40 * takes(20) }),
  tally("n_hero", { views: 40, reached: 40, dwellMs: 40 * takes(1) }),
  tally("n_price", { views: 40, reached: 40, dwellMs: 40 * takes(20) }),
  tally("n_ask", { views: 40, reached: 4, dwellMs: 4 * takes(1) }),
]

const sectionFor = (counters: readonly ReaderTally[], stopping?: PageStopping) =>
  render(<HadTimeToRead pacing={pacingFor(counters)} stopping={stopping} />)

describe("HadTimeToRead", () => {
  it("leads with the page's own time against its own words", () => {
    const { container } = sectionFor(AGREEING)

    expect(surfaceOf(container)).toContain("Readers spent about 5 seconds on this page")
  })

  /**
   * The paragraph that exists because of a photograph: the two sections above
   * this one can say *every part came onto somebody's screen* directly over
   * *nobody had time to read any of it*, and both are true. A reader who takes
   * the first as an answer to the second reads the pair as a contradiction.
   */
  it("says what it is not, so it does not read as a contradiction of the sections above", () => {
    const { container } = sectionFor(AGREEING)
    const shown = surfaceOf(container)

    expect(shown).toContain("on screen")
    expect(shown).toContain("long enough to")
  })

  it("names the part the most words went past unread in, with both times", () => {
    const shown = surfaceOf(sectionFor(AGREEING).container)

    expect(shown).toContain("Readers had about")
    expect(shown).toContain("for 5 seconds, and its words take about 25 seconds")
  })

  /**
   * The sentence this screen exists to be able to say. It is drawn only when the
   * two readings name the identical part, so this is the case that proves the
   * component draws it at all.
   */
  it("says so when the drop-off reading points at the same part", () => {
    const shown = surfaceOf(sectionFor(AGREEING, stoppingFor(AGREEING)).container)

    expect(shown).toContain("Two separate readings point at the same part")
    expect(shown).toContain("the strongest thing this page has to tell you")
  })

  /**
   * And never repeats itself. Both sentences end by naming one part as the thing
   * to change, and drawing them together names it twice in three lines.
   */
  it("drops the shortening advice when the agreement has already given it", () => {
    const agreeing = surfaceOf(sectionFor(AGREEING, stoppingFor(AGREEING)).container)
    const alone = surfaceOf(sectionFor(AGREEING).container)

    expect(agreeing).not.toContain("worth shortening")
    expect(alone).toContain("worth shortening")
  })

  /**
   * Caution one, and the only one of the four that can embarrass a surface.
   * Dwell is time on screen, so the tall thing at the foot of a page lingers by
   * construction — *people stayed longest here* would be engagement printed off
   * a number that cannot support it.
   */
  it("never draws time on screen as engagement", () => {
    const { container } = sectionFor([
      tally("n_page", { views: 10, reached: 10, dwellMs: 10 * takes(2_000) }),
      tally("n_price", { views: 10, reached: 10, dwellMs: 10 * takes(1_000) }),
    ])
    const shown = surfaceOf(container)

    expect(shown).toContain("a question rather than an answer")
    expect(shown).not.toMatch(/engage/i)
    expect(shown).not.toMatch(/longest/i)
    expect(shown).not.toMatch(/most read/i)
  })

  /**
   * `paced` is the weakest claim here and *readers read this* is not a thing
   * anybody acts on. A green row per part would be a dashboard telling somebody
   * their page is fine on the strength of the three biased numbers.
   */
  it("never puts a part that had time enough above the disclosure", () => {
    const { container } = sectionFor([
      tally("n_page", { views: 10, reached: 10, dwellMs: 10 * takes(110) }),
      tally("n_price", { views: 10, reached: 10, dwellMs: 10 * takes(105) }),
    ])

    expect(surfaceOf(container)).not.toContain("There was time for it")
    expect(recordOf(container)).toContain("paced")
  })

  /**
   * Good news is said rather than shown as an absence, which is the rule that
   * made `settled` a tone.
   */
  it("says a page nobody raced through is one, rather than drawing nothing", () => {
    const { container } = sectionFor([
      tally("n_page", { views: 10, reached: 10, dwellMs: 10 * takes(110) }),
      tally("n_price", { views: 10, reached: 10, dwellMs: 10 * takes(105) }),
    ])

    expect(surfaceOf(container)).toContain("No part of this page went past people too fast")
  })

  it("says nothing was counted rather than drawing an unvisited page as read", () => {
    const shown = surfaceOf(sectionFor([]).container)

    expect(shown).toContain("No visit has reported anything")
    expect(shown).not.toContain("No part of this page went past people too fast")
  })

  it("says which correction it applied, in the record", () => {
    expect(recordOf(sectionFor(AGREEING).container)).toContain("0.050")
  })

  /** Nothing is ever removed — every part, both times and the ratio are one click down. */
  it("keeps every part and every figure behind the disclosure", () => {
    const record = recordOf(sectionFor(AGREEING).container)

    for (const id of ["n_page", "n_hero", "n_price", "n_ask"]) expect(record).toContain(id)

    expect(record).toContain("the page itself")
    expect(record).toContain("words passed")
    expect(record).toContain(String(READING_WORDS_PER_MINUTE))
  })

  /**
   * The property, rather than taste: no sentence shown unasked holds a word from
   * the runtime's vocabulary, and the technical reading beside it does.
   */
  it("says none of the runtime's words unasked, and the runtime's own names one click down", () => {
    const { container } = sectionFor(AGREEING, stoppingFor(AGREEING))
    const shown = surfaceOf(container)

    expect([shown, runtimeWordsIn(shown, ["id"])]).toEqual([shown, []])
    expect(recordOf(container)).toContain("skimmed")
  })

  it("offers nothing to press, because a reading is not a control", () => {
    const { container } = sectionFor(AGREEING)

    expect(container.querySelector("button")).toBeNull()
    expect(container.querySelector("form")).toBeNull()
  })
})
