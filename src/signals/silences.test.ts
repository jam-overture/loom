import { describe, expect, it } from "vitest"

import type { JsonObject } from "../json.js"
import { nodeId, OTHER_TREE, primitiveType, TREE } from "../testing/reader-signal-contract.js"
import type { ElementNode, LoomNode } from "../tree/node.js"
import { TREE_SCHEMA_VERSION, type LoomTree } from "../tree/tree.js"

import {
  CHANGE_SILENCES,
  COPY_CHANGE_SILENCES,
  COPY_SILENCES,
  copyChangeOf,
  copyReadingOf,
  DEPLOYMENT_SILENCES,
  describeSilenceCondition,
  describeSilenceSubject,
  distinctSilences,
  meaningOfChangeSilence,
  meaningOfCopyChangeSilence,
  meaningOfCopySilence,
  meaningOfDeploymentSilence,
  meaningOfPaceChangeSilence,
  meaningOfPaceSilence,
  meaningOfReachSilence,
  PACE_CHANGE_SILENCES,
  PACE_SILENCES,
  pageReachOf,
  pageReadingOf,
  readingChangeOf,
  readingPaceOf,
  REACH_SILENCES,
  relateSilences,
  SILENCE_CONDITIONS,
  SILENCE_SUBJECTS,
  SILENCE_VOCABULARIES,
  SUBJECT_OF_VOCABULARY,
  type PartDeclarations,
  type ReaderTally,
  type SilenceCondition,
  type SilenceMeaning,
  type SilenceVocabulary,
  type StoredPageViews,
} from "./index.js"

/**
 * Two halves, and the second is what keeps the first honest.
 *
 * The mapping is a table, and a test of a table against itself proves only that
 * it was typed twice. So the properties come first — every member mapped, every
 * condition reached, every subject the one its reading publishes — and then the
 * five readings are driven into each silence they can report, so that the table
 * is asserted against what the subsystem actually says rather than against what
 * this file remembers of it.
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

const treeOf = (root: ElementNode, revision = 1): LoomTree => ({
  treeId: TREE,
  schemaVersion: TREE_SCHEMA_VERSION,
  revision,
  root,
})

const ANOTHER_PAGE: LoomTree = {
  ...treeOf(element("page", "loom.stack")),
  treeId: OTHER_TREE,
}

const BODY_IS_COPY: PartDeclarations = {
  copyFor: () => ["body"],
  typesWithRole: () => [],
}

const NOTHING_DECLARED: PartDeclarations = {
  copyFor: () => undefined,
  typesWithRole: () => [],
}

const tally = (name: string, counters: Partial<ReaderTally> = {}): ReaderTally => ({
  treeId: TREE,
  revision: 1,
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
  ...counters,
})

const row = (counts: Partial<StoredPageViews> = {}): StoredPageViews => ({
  treeId: TREE,
  revision: 1,
  opened: 0,
  appearances: 0,
  updatedAt: "2026-10-07T00:00:00.000Z",
  ...counts,
})

const words = (count: number): string => Array.from({ length: count }, () => "word").join(" ")

const PAGE = element("page", "loom.stack", {}, [
  element("intro", "loom.section", { body: words(10) }),
  element("pricing", "loom.section", { body: words(30) }),
])

const readingOf = (
  tree: LoomTree,
  counters: readonly ReaderTally[],
  declarations: PartDeclarations = BODY_IS_COPY
) => pageReadingOf(tree, counters, declarations)

const EVERY_MEANING: readonly SilenceMeaning[] = [
  ...CHANGE_SILENCES.map(meaningOfChangeSilence),
  ...COPY_SILENCES.map(meaningOfCopySilence),
  ...COPY_CHANGE_SILENCES.map(meaningOfCopyChangeSilence),
  ...DEPLOYMENT_SILENCES.map(meaningOfDeploymentSilence),
  ...PACE_SILENCES.map(meaningOfPaceSilence),
  ...PACE_CHANGE_SILENCES.map(meaningOfPaceChangeSilence),
  ...REACH_SILENCES.map(meaningOfReachSilence),
]

describe("what a reading means when it says nothing", () => {
  it("maps every member of every set, with no condition from outside the published list", () => {
    expect(EVERY_MEANING).toHaveLength(
      CHANGE_SILENCES.length +
        COPY_SILENCES.length +
        COPY_CHANGE_SILENCES.length +
        DEPLOYMENT_SILENCES.length +
        PACE_SILENCES.length +
        PACE_CHANGE_SILENCES.length +
        REACH_SILENCES.length
    )

    for (const meaning of EVERY_MEANING) {
      expect(SILENCE_CONDITIONS).toContain(meaning.condition)
      expect(SILENCE_SUBJECTS).toContain(meaning.subject)
      expect(SILENCE_VOCABULARIES).toContain(meaning.vocabulary)
    }
  })

  /**
   * The other side of the same guard, from the direction a new set arrives
   * from. The sixth and the seventh each mapped onto conditions that were
   * already published, which is the evidence that these are states of the world
   * rather than a list of the names five modules happened to use — and a set
   * that arrives with a condition nobody else reports is the thing worth
   * noticing. The seventh is the stronger case: its reading is of a deployment
   * and not of a page, a part or a pair.
   */
  it("maps each set added after the fifth onto conditions the earlier ones already reported", () => {
    const later: readonly [SilenceVocabulary, readonly SilenceCondition[]][] = [
      ["pace-change", PACE_CHANGE_SILENCES.map((of) => meaningOfPaceChangeSilence(of).condition)],
      ["deployment", DEPLOYMENT_SILENCES.map((of) => meaningOfDeploymentSilence(of).condition)],
    ]

    for (const [vocabulary, conditions] of later) {
      const others = new Set<SilenceCondition>(
        EVERY_MEANING.filter((meaning) => meaning.vocabulary !== vocabulary).map(
          (meaning) => meaning.condition
        )
      )

      for (const condition of conditions) expect(others).toContain(condition)
    }
  })

  /**
   * The guard against a condition nobody reports, which is the dead-code case
   * this vocabulary could acquire quietly: a member renamed in its own set
   * leaves the condition it used to map to published and unreachable.
   */
  it("publishes no condition that no silence reports", () => {
    const reported = new Set<SilenceCondition>(EVERY_MEANING.map((meaning) => meaning.condition))

    expect([...SILENCE_CONDITIONS].filter((condition) => !reported.has(condition))).toEqual([])
  })

  it("gives every silence of one reading the subject that reading publishes", () => {
    for (const meaning of EVERY_MEANING) {
      expect(meaning.subject).toBe(SUBJECT_OF_VOCABULARY[meaning.vocabulary])
    }

    expect(SILENCE_VOCABULARIES.map((vocabulary) => SUBJECT_OF_VOCABULARY[vocabulary])).toEqual([
      "comparison",
      "page",
      "comparison",
      "page",
      "part",
      "comparison",
      "page",
    ])
  })

  it("describes every condition and every subject, and never twice the same way", () => {
    const conditions = SILENCE_CONDITIONS.map(describeSilenceCondition)
    const subjects = SILENCE_SUBJECTS.map(describeSilenceSubject)

    expect(conditions.every((line) => line.length > 0)).toBe(true)
    expect(new Set(conditions).size).toBe(SILENCE_CONDITIONS.length)
    expect(new Set(subjects).size).toBe(SILENCE_SUBJECTS.length)
  })

  it("keeps a decision number out of the prose, because these lines are read by people", () => {
    for (const line of SILENCE_CONDITIONS.map(describeSilenceCondition)) {
      expect(line).not.toMatch(/\b0\d{3}\b/)
    }
  })
})

describe("the two overlaps this mapping exists to state", () => {
  /**
   * The finding of 7 October, in one assertion: a window with no page views is
   * `nothing-measured` to one set and `unmeasured` to another.
   */
  it("says that two spellings of an empty window report one condition", () => {
    const change = meaningOfChangeSilence("nothing-measured")
    const copy = meaningOfCopySilence("unmeasured")

    expect(change.condition).toBe("no-view-reported")
    expect(copy.condition).toBe(change.condition)
  })

  /**
   * And it refuses to call them one state, which is the half a renaming would
   * have got wrong. A comparison names no side, so *one of the two windows was
   * empty* cannot be drawn over the page somebody is looking at.
   */
  it("holds them apart by subject, because a comparison names neither side", () => {
    expect(
      relateSilences(meaningOfChangeSilence("nothing-measured"), meaningOfCopySilence("unmeasured"))
    ).toBe("one-reason")
  })

  /** The sharper half: one spelling, two states, read off two different rows. */
  it("says that one spelling of `unmeasured` reports two unrelated conditions", () => {
    const copy = meaningOfCopySilence("unmeasured")
    const reach = meaningOfReachSilence("unmeasured")

    expect(copy.condition).toBe("no-view-reported")
    expect(reach.condition).toBe("no-arrivals-counted")
    expect(relateSilences(copy, reach)).toBe("unrelated")
  })

  it("relates a page's floor to a part's floor as one reason at two subjects", () => {
    expect(
      relateSilences(meaningOfCopySilence("floored"), meaningOfPaceSilence("unreadable"))
    ).toBe("one-reason")
  })

  it("relates the two comparisons' `different-trees` as one state, since both are of the pair", () => {
    expect(
      relateSilences(
        meaningOfChangeSilence("different-trees"),
        meaningOfCopyChangeSilence("different-trees")
      )
    ).toBe("one-state")
  })

  it("is reflexive and symmetric over every member of every set", () => {
    for (const one of EVERY_MEANING) {
      expect(relateSilences(one, one)).toBe("one-state")

      for (const other of EVERY_MEANING) {
        expect(relateSilences(one, other)).toBe(relateSilences(other, one))
      }
    }
  })

  it("ignores which reading spelled it, which is the whole of what it is for", () => {
    const change = meaningOfChangeSilence("different-trees")
    const copyChange = meaningOfCopyChangeSilence("different-trees")

    expect(change.vocabulary).not.toBe(copyChange.vocabulary)
    expect(relateSilences(change, copyChange)).toBe("one-state")
  })
})

describe("the states a card is actually in", () => {
  it("drops the nulls a healthy deployment hands it", () => {
    expect(distinctSilences([null, null, null])).toEqual([])
    expect(distinctSilences([null, meaningOfCopySilence("wordless"), null])).toEqual([
      meaningOfCopySilence("wordless"),
    ])
  })

  /**
   * The double-count case this lane requires, in the one form it takes here: two
   * readings reporting one state would otherwise be printed twice, in two
   * voices, about the same thing.
   */
  it("counts one state once, however many readings spelled it", () => {
    expect(
      distinctSilences([
        meaningOfChangeSilence("nothing-measured"),
        meaningOfCopyChangeSilence("nothing-measured"),
      ])
    ).toEqual([meaningOfChangeSilence("nothing-measured")])
  })

  it("keeps the first reading's vocabulary, so its own sentence can still be printed", () => {
    const [kept] = distinctSilences([
      meaningOfCopyChangeSilence("different-trees"),
      meaningOfChangeSilence("different-trees"),
    ])

    expect(kept?.vocabulary).toBe("copy-change")
  })

  /** The opposite error, and the costlier one: collapsing two states into one line. */
  it("keeps one condition about two subjects as two states", () => {
    expect(
      distinctSilences([
        meaningOfCopySilence("unmeasured"),
        meaningOfChangeSilence("nothing-measured"),
      ])
    ).toHaveLength(2)

    expect(
      distinctSilences([meaningOfCopySilence("floored"), meaningOfPaceSilence("unreadable")])
    ).toHaveLength(2)
  })

  it("keeps one spelling of two conditions as two states", () => {
    expect(
      distinctSilences([meaningOfCopySilence("unmeasured"), meaningOfReachSilence("unmeasured")])
    ).toHaveLength(2)
  })

  it("gives them back in the order the readings were handed over", () => {
    const given = [
      meaningOfReachSilence("uncounted"),
      null,
      meaningOfCopySilence("wordless"),
      meaningOfReachSilence("uncounted"),
      meaningOfPaceSilence("unreached"),
    ]

    expect(distinctSilences(given).map((meaning) => meaning.condition)).toEqual([
      "no-window-folded",
      "says-nothing",
      "no-view-reported",
    ])
  })

  it("collapses nothing on a card whose readings are all silent for different reasons", () => {
    const given = [
      meaningOfCopySilence("inconsistent"),
      meaningOfReachSilence("unopened"),
      meaningOfCopyChangeSilence("dissolved"),
      meaningOfPaceSilence("wordless"),
    ]

    expect(distinctSilences(given)).toHaveLength(given.length)
  })
})

/**
 * The half that keeps the table honest.
 *
 * Each reading is driven into a state it really reports, and the silence it
 * really returns is mapped. A member renamed, re-pointed or dropped in its own
 * module fails here rather than leaving a mapping that compiles and lies.
 */
describe("the mapping, against what the readings actually say", () => {
  it("maps a copy reading of a window with no views to nothing having been seen", () => {
    const reading = copyReadingOf(readingOf(treeOf(PAGE), []))

    expect(reading.silence).toBe("unmeasured")
    expect(meaningOfCopySilence("unmeasured").condition).toBe("no-view-reported")
  })

  it("maps a share of readers with no door row to no arrivals having been counted", () => {
    const reach = pageReachOf(
      readingOf(treeOf(PAGE), [tally("page", { views: 4, reached: 4 })]),
      []
    )

    expect(reach.silence).toBe("unmeasured")
    expect(meaningOfReachSilence("unmeasured").condition).toBe("no-arrivals-counted")
  })

  /**
   * The two together, which is the pair a surface meets: one window, counters
   * full of readers, no row at the door. One reading says `unmeasured` because
   * nobody arrived as far as it can tell and the other says `unmeasured`
   * because the row is missing — and only one of those is true here.
   */
  it("tells the two `unmeasured`s apart on one reading of one window", () => {
    const reading = readingOf(treeOf(PAGE), [
      tally("page", { views: 4, reached: 4 }),
      tally("intro", { views: 4, reached: 4 }),
    ])

    const copy = copyReadingOf(reading)
    const reach = pageReachOf(reading, [])

    expect(copy.silence).toBeNull()
    expect(reach.silence).toBe("unmeasured")
    expect(
      distinctSilences([
        copy.silence && meaningOfCopySilence(copy.silence),
        reach.silence && meaningOfReachSilence(reach.silence),
      ])
    ).toEqual([meaningOfReachSilence("unmeasured")])
  })

  it("maps a door row with appearances and no openings to no openings marked", () => {
    const reach = pageReachOf(readingOf(treeOf(PAGE), [tally("page", { views: 4, reached: 4 })]), [
      row({ appearances: 4 }),
    ])

    expect(reach.silence).toBe("unopened")
    expect(meaningOfReachSilence("unopened").condition).toBe("no-openings-marked")
  })

  it("maps a door row with openings and no folded window to no window folded", () => {
    const reach = pageReachOf(readingOf(treeOf(PAGE), [tally("page", { views: 4, reached: 4 })]), [
      row({ opened: 9 }),
    ])

    expect(reach.silence).toBe("uncounted")
    expect(meaningOfReachSilence("uncounted").condition).toBe("no-window-folded")
  })

  it("maps a comparison of two trees to the readings being of two pages", () => {
    const change = readingChangeOf(readingOf(treeOf(PAGE), []), readingOf(ANOTHER_PAGE, []))

    expect(change.silence).toBe("different-trees")
    expect(meaningOfChangeSilence("different-trees").condition).toBe("two-pages")
  })

  it("maps a comparison with one empty window to nothing having been seen, of the pair", () => {
    const change = readingChangeOf(
      readingOf(treeOf(PAGE), []),
      readingOf(treeOf(PAGE, 2), [tally("page", { views: 4, reached: 4 })])
    )

    expect(change.silence).toBe("nothing-measured")
    expect(meaningOfChangeSilence("nothing-measured").subject).toBe("comparison")
  })

  it("maps a change that left no word of the page as it was to nothing carried", () => {
    const was = element("page", "loom.stack", {}, [
      element("intro", "loom.section", { body: words(10) }),
    ])
    const now = element("page", "loom.stack", {}, [
      element("intro", "loom.section", { body: "wholly different text here" }),
    ])

    const change = copyChangeOf(
      readingOf(treeOf(was), [tally("page", { views: 4, reached: 4 })]),
      readingOf(treeOf(now, 2), [{ ...tally("page", { views: 4, reached: 4 }), revision: 2 }])
    )

    expect(change.silence).toBe("dissolved")
    expect(meaningOfCopyChangeSilence("dissolved").condition).toBe("nothing-carried")
  })

  it("maps a part whose words nobody declared to its words being a floor", () => {
    const pace = readingPaceOf(
      readingOf(
        treeOf(PAGE),
        [tally("intro", { views: 4, reached: 4, dwellMs: 60_000 })],
        NOTHING_DECLARED
      )
    )

    const intro = pace.parts.find((part) => part.nodeId === nodeId("intro"))

    expect(intro?.silence).toBe("unreadable")
    expect(meaningOfPaceSilence("unreadable").condition).toBe("words-a-floor")
  })

  it("maps a part no view reported to nothing having been seen, of that part", () => {
    const pace = readingPaceOf(
      readingOf(treeOf(PAGE), [tally("intro", { views: 4, reached: 4, dwellMs: 60_000 })])
    )

    const pricing = pace.parts.find((part) => part.nodeId === nodeId("pricing"))

    expect(pricing?.silence).toBe("unreached")
    expect(meaningOfPaceSilence("unreached").subject).toBe("part")
  })

  it("maps a part that says nothing to its saying nothing", () => {
    const pace = readingPaceOf(
      readingOf(treeOf(element("page", "loom.stack", {}, [element("rule", "loom.rule")])), [
        tally("page", { views: 4, reached: 4, dwellMs: 60_000 }),
        tally("rule", { views: 4, reached: 4, dwellMs: 60_000 }),
      ])
    )

    const rule = pace.parts.find((part) => part.nodeId === nodeId("rule"))

    expect(rule?.silence).toBe("wordless")
    expect(meaningOfPaceSilence("wordless").condition).toBe("says-nothing")
  })

  it("maps a page that says nothing to its saying nothing", () => {
    const reading = copyReadingOf(
      readingOf(treeOf(element("page", "loom.stack", {}, [element("rule", "loom.rule")])), [
        tally("page", { views: 4, reached: 4 }),
      ])
    )

    expect(reading.silence).toBe("wordless")
    expect(meaningOfCopySilence("wordless").condition).toBe("says-nothing")
  })

  it("maps a part reporting more readers than views to readers above views", () => {
    const reading = copyReadingOf(
      readingOf(treeOf(PAGE), [tally("intro", { views: 1, reached: 9 })])
    )

    expect(reading.silence).toBe("inconsistent")
    expect(meaningOfCopySilence("inconsistent").condition).toBe("readers-above-views")
  })

  it("maps a page whose words are a floor to its words being a floor", () => {
    const reading = copyReadingOf(
      readingOf(
        treeOf(
          element("page", "loom.stack", {}, [
            element("intro", "loom.section", { body: words(10) }),
            element("pricing", "loom.other", { body: words(30) }),
          ])
        ),
        [tally("page", { views: 4, reached: 4 })],
        {
          copyFor: (type) => (type === "loom.section" ? ["body"] : undefined),
          typesWithRole: () => [],
        }
      )
    )

    expect(reading.silence).toBe("floored")
    expect(meaningOfCopySilence("floored").condition).toBe("words-a-floor")
  })
})
