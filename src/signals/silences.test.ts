import { describe, expect, it } from "vitest"

import { DEFAULT_AUDIENCE_ID } from "../audience/audience.js"
import type { JsonObject } from "../json.js"
import { nodeId, OTHER_TREE, primitiveType, TREE } from "../testing/reader-signal-contract.js"
import type { ElementNode, LoomNode } from "../tree/node.js"
import { TREE_SCHEMA_VERSION, type LoomTree } from "../tree/tree.js"

import {
  ACTION_CHANGE_SILENCES,
  CHANGE_SILENCES,
  COPY_CHANGE_SILENCES,
  COPY_SILENCES,
  copyChangeOf,
  copyReadingOf,
  DEPLOYMENT_SILENCES,
  describeSilenceCondition,
  describeSilenceSubject,
  distinctSilences,
  KIND_ACTION_SILENCES,
  KIND_CHANGE_SILENCES,
  KIND_COPY_CHANGE_SILENCES,
  KIND_REACH_CHANGE_SILENCES,
  KIND_WORD_REACH_CHANGE_SILENCES,
  KIND_REACH_SILENCES,
  KIND_SILENCES,
  libraryActionOf,
  libraryChangeOf,
  libraryCopyChangeOf,
  libraryReachOf,
  libraryReadingOf,
  meaningOfActionChangeSilence,
  meaningOfChangeSilence,
  meaningOfCopyChangeSilence,
  meaningOfCopySilence,
  meaningOfDeploymentSilence,
  meaningOfKindActionSilence,
  meaningOfKindChangeSilence,
  meaningOfKindCopyChangeSilence,
  meaningOfKindReachChangeSilence,
  meaningOfKindWordReachChangeSilence,
  meaningOfKindReachSilence,
  meaningOfKindSilence,
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
  audienceId: DEFAULT_AUDIENCE_ID,
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
  ...ACTION_CHANGE_SILENCES.map(meaningOfActionChangeSilence),
  ...CHANGE_SILENCES.map(meaningOfChangeSilence),
  ...COPY_SILENCES.map(meaningOfCopySilence),
  ...COPY_CHANGE_SILENCES.map(meaningOfCopyChangeSilence),
  ...DEPLOYMENT_SILENCES.map(meaningOfDeploymentSilence),
  ...KIND_SILENCES.map(meaningOfKindSilence),
  ...KIND_ACTION_SILENCES.map(meaningOfKindActionSilence),
  ...KIND_CHANGE_SILENCES.map(meaningOfKindChangeSilence),
  ...KIND_COPY_CHANGE_SILENCES.map(meaningOfKindCopyChangeSilence),
  ...KIND_REACH_SILENCES.map(meaningOfKindReachSilence),
  ...KIND_REACH_CHANGE_SILENCES.map(meaningOfKindReachChangeSilence),
  ...KIND_WORD_REACH_CHANGE_SILENCES.map(meaningOfKindWordReachChangeSilence),
  ...PACE_SILENCES.map(meaningOfPaceSilence),
  ...PACE_CHANGE_SILENCES.map(meaningOfPaceChangeSilence),
  ...REACH_SILENCES.map(meaningOfReachSilence),
]

describe("what a reading means when it says nothing", () => {
  it("maps every member of every set, with no condition from outside the published list", () => {
    expect(EVERY_MEANING).toHaveLength(
      ACTION_CHANGE_SILENCES.length +
        CHANGE_SILENCES.length +
        COPY_SILENCES.length +
        COPY_CHANGE_SILENCES.length +
        DEPLOYMENT_SILENCES.length +
        KIND_SILENCES.length +
        KIND_ACTION_SILENCES.length +
        KIND_CHANGE_SILENCES.length +
        KIND_COPY_CHANGE_SILENCES.length +
        KIND_REACH_SILENCES.length +
        KIND_REACH_CHANGE_SILENCES.length +
        KIND_WORD_REACH_CHANGE_SILENCES.length +
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
   * The other side of the same guard, from the direction a new set arrives from,
   * and it now asserts in **both** directions rather than one.
   *
   * The sixth and the seventh mapped entirely onto conditions already published,
   * which was the evidence that these are states of the world rather than a list
   * of the names five modules happened to use. The eighth brought exactly one of
   * its own, and *which* is the fact worth holding: a nought that is a filing
   * rule rather than an absence (0242, 0251) is a state nothing before a reading
   * of what readers did could be in.
   *
   * So each later set declares what it adds, and the test fails if a set adds a
   * condition it did not declare **or** declares one it does not add. The
   * original assertion is the `[]` rows; an eleventh set bringing a condition
   * silently is still what this catches.
   *
   * **Each set is held against the sets that came before it and not against
   * every other one**, which is what its own name has always said and what it
   * now does. The two are the same assertion until a later set reuses an
   * earlier one's condition — the tenth reuses the ninth's `nothing-of-the-kind`
   * — and at that moment the all-others form would delete the ninth's
   * declaration and report that nothing had ever brought it, which is the one
   * fact this test exists to keep.
   */
  it("declares, for each set added after the fifth, which conditions it brought that no earlier set reported", () => {
    const later: readonly [SilenceVocabulary, readonly SilenceCondition[], readonly SilenceCondition[]][] =
      [
        [
          "pace-change",
          PACE_CHANGE_SILENCES.map((of) => meaningOfPaceChangeSilence(of).condition),
          [],
        ],
        ["deployment", DEPLOYMENT_SILENCES.map((of) => meaningOfDeploymentSilence(of).condition), []],
        [
          "action-change",
          ACTION_CHANGE_SILENCES.map((of) => meaningOfActionChangeSilence(of).condition),
          ["no-action-credited"],
        ],
        [
          "library",
          KIND_SILENCES.map((of) => meaningOfKindSilence(of).condition),
          ["nothing-of-the-kind"],
        ],
        [
          "library-reach",
          KIND_REACH_SILENCES.map((of) => meaningOfKindReachSilence(of).condition),
          [],
        ],
        [
          "library-action",
          KIND_ACTION_SILENCES.map((of) => meaningOfKindActionSilence(of).condition),
          ["nothing-inside"],
        ],
        [
          "library-change",
          KIND_CHANGE_SILENCES.map((of) => meaningOfKindChangeSilence(of).condition),
          [],
        ],
        [
          "library-copy-change",
          KIND_COPY_CHANGE_SILENCES.map((of) => meaningOfKindCopyChangeSilence(of).condition),
          [],
        ],
        [
          "library-reach-change",
          KIND_REACH_CHANGE_SILENCES.map((of) => meaningOfKindReachChangeSilence(of).condition),
          [],
        ],
        [
          "library-word-reach-change",
          KIND_WORD_REACH_CHANGE_SILENCES.map(
            (of) => meaningOfKindWordReachChangeSilence(of).condition
          ),
          [],
        ],
      ]

    /** The five sets that were there before any of the above, in arrival order. */
    const FIRST_FIVE: readonly SilenceVocabulary[] = ["change", "copy", "copy-change", "pace", "reach"]

    const earlier = new Set<SilenceCondition>(
      EVERY_MEANING.filter((meaning) => FIRST_FIVE.includes(meaning.vocabulary)).map(
        (meaning) => meaning.condition
      )
    )

    for (const [vocabulary, conditions, declared] of later) {
      expect([...new Set(conditions.filter((condition) => !earlier.has(condition)))]).toEqual(
        declared
      )
      expect(SILENCE_VOCABULARIES).toContain(vocabulary)

      for (const condition of conditions) earlier.add(condition)
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
      "comparison",
      "page",
      "comparison",
      "page",
      "kind",
      "kind",
      "kind",
      "kind",
      "kind",
      "kind",
      "kind",
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

  /**
   * The third nought, which 0282 had to keep apart from the other two. A page
   * nobody opened, a page whose rows report no reach, and a window that credits
   * no press to a reader are three different senders half-working, and a
   * deployment handed the wrong one looks in the wrong place.
   */
  it("says that a page reporting no reach is not a page nobody read", () => {
    const unspoken = meaningOfCopySilence("unspoken")
    const empty = meaningOfCopySilence("unmeasured")

    expect(unspoken.condition).toBe("no-reach-reported")
    expect(empty.condition).toBe("no-view-reported")
    expect(relateSilences(unspoken, empty)).toBe("unrelated")
  })

  it("keeps it apart from the other nought that is not a measurement", () => {
    const unspoken = meaningOfCopySilence("unspoken")
    const unwalked = meaningOfActionChangeSilence("unwalked")

    expect(unwalked.condition).toBe("no-action-credited")
    expect(relateSilences(unspoken, unwalked)).toBe("unrelated")
  })

  /**
   * And the same state said of a page and of a pair is one reason at two
   * subjects, which is the relation this module exists to publish.
   */
  it("relates a page's missing reach to the pair's as one reason at two subjects", () => {
    expect(
      relateSilences(meaningOfCopySilence("unspoken"), meaningOfCopyChangeSilence("unspoken"))
    ).toBe("one-reason")
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

  it("maps a kind of part no view reported to nothing having been seen, of that kind", () => {
    const library = libraryReadingOf([readingOf(treeOf(PAGE), [])])
    const section = library.byType.find(
      (row) => row.kind.by === "type" && row.kind.type === "loom.section"
    )

    expect(section?.silence).toBe("unread")
    expect(meaningOfKindSilence("unread").condition).toBe("no-view-reported")
    expect(meaningOfKindSilence("unread").subject).toBe("kind")
  })

  /**
   * The condition the ninth set brought, and the reason it could: the row is
   * there because the vocabulary has the member, not because the library has
   * one of them.
   */
  it("maps a role nothing in the library plays to there being none of the kind", () => {
    const library = libraryReadingOf([
      readingOf(treeOf(PAGE), [tally("page", { views: 4, reached: 4 })]),
    ])
    const heading = library.byRole.find(
      (row) => row.kind.by === "role" && row.kind.role === "heading"
    )

    expect(heading?.placements).toBe(0)
    expect(heading?.silence).toBe("unplaced")
    expect(meaningOfKindSilence("unplaced").condition).toBe("nothing-of-the-kind")
  })

  /**
   * The tenth set, which brought no condition of its own: a kind's share of the
   * readers who met it is withheld for the states of the **door**, and those
   * were all named the first time a share of readers was taken of anything.
   */
  it("maps a kind standing on a page with no door row to no arrivals counted, of that kind", () => {
    const reading = readingOf(treeOf(PAGE), [tally("page", { views: 9, reached: 9 })])
    const reach = libraryReachOf([reading], [])
    const section = reach.byType.find(
      (row) => row.kind.by === "type" && row.kind.type === "loom.section"
    )

    expect(section?.silence).toBe("unscaled")
    expect(meaningOfKindReachSilence("unscaled").condition).toBe("no-arrivals-counted")
    expect(meaningOfKindReachSilence("unscaled").subject).toBe("kind")
  })

  /**
   * The limit on reuse, which is the thing the tenth set is evidence for: one
   * state of the world, published twice because the two readings are about
   * different things. A funnel could reuse a reach silence outright because a
   * funnel is asked of a page; a census of the library cannot, and a surface
   * drawing both must print two sentences rather than collapsing them.
   */
  it("keeps a kind the door cannot scale and a page the door cannot scale as one reason and not one state", () => {
    const reading = readingOf(treeOf(PAGE), [tally("page", { views: 9, reached: 9 })])
    const reach = libraryReachOf([reading], [])
    const page = pageReachOf(reading, [])

    expect(page.silence).toBe("unmeasured")
    expect(reach.unscaled).toEqual([{ treeId: TREE, revision: 1, silence: "unmeasured" }])
    expect(
      relateSilences(
        meaningOfKindReachSilence("unscaled"),
        meaningOfReachSilence(page.silence ?? "unmeasured")
      )
    ).toBe("one-reason")
    expect(
      distinctSilences([
        meaningOfKindReachSilence("unscaled"),
        meaningOfReachSilence("unmeasured"),
      ])
    ).toHaveLength(2)
  })

  /**
   * The condition the eleventh set brought, and what makes it the first of its
   * kind: nothing about the window, the rows or the vocabulary is involved. Both
   * bands are leaves on the page they stand on, so no reader could have acted
   * inside one — which would be exactly as true of a deployment everybody had
   * read.
   */
  it("maps a kind of part with no inside anywhere to there being nothing inside it, of that kind", () => {
    const reading = readingOf(treeOf(PAGE), [tally("page", { views: 9, reached: 9 })])
    const action = libraryActionOf([reading], [])
    const section = action.byType.find(
      (row) => row.kind.by === "type" && row.kind.type === "loom.section"
    )

    expect(section?.placements).toBe(2)
    expect(section?.insides).toBe(0)
    expect(section?.silence).toBe("unenterable")
    expect(meaningOfKindActionSilence("unenterable").condition).toBe("nothing-inside")
    expect(meaningOfKindActionSilence("unenterable").subject).toBe("kind")
  })

  /**
   * The affirmative use of the tenth set's limit. Two readings of a kind, the
   * same state of the door, the same subject — so one sentence serves both and a
   * surface drawing the pair must not print two.
   */
  it("keeps a kind the door cannot scale as one state across the two readings asked of a kind", () => {
    expect(
      relateSilences(meaningOfKindActionSilence("unscaled"), meaningOfKindReachSilence("unscaled"))
    ).toBe("one-state")
    expect(
      distinctSilences([
        meaningOfKindActionSilence("unscaled"),
        meaningOfKindReachSilence("unscaled"),
      ])
    ).toHaveLength(1)
    expect(
      relateSilences(meaningOfKindActionSilence("unscaled"), meaningOfReachSilence("unmeasured"))
    ).toBe("one-reason")
  })

  /**
   * The eleventh set's other addition, which brought no condition: a page
   * holding actions and crediting nobody is the state the eighth set named, said
   * of a kind rather than of a comparison.
   */
  it("keeps a kind whose pages credit nobody and a comparison of two such windows as one reason", () => {
    expect(meaningOfKindActionSilence("unwalked").condition).toBe("no-action-credited")
    expect(
      relateSilences(
        meaningOfKindActionSilence("unwalked"),
        meaningOfActionChangeSilence("unwalked")
      )
    ).toBe("one-reason")
  })

  /**
   * The twelfth set, and the one place 0240's claim looked most likely to break:
   * a comparison whose subject is not the pair. Every reason this reading gives
   * is about one kind of part, so the subject is the kind and not the two
   * windows — which is the claim holding rather than an exception to it.
   */
  it("maps a kind whose places all moved to the change having carried nothing, of that kind", () => {
    const here = readingOf(treeOf(PAGE), [tally("page", { views: 9, reached: 9 })])
    const elsewhere = readingOf({ ...treeOf(PAGE), treeId: OTHER_TREE }, [
      tally("page", { views: 9, reached: 9, treeId: OTHER_TREE }),
    ])
    const change = libraryChangeOf([here], [elsewhere])
    const section = change.byType.find(
      (row) => row.kind.by === "type" && row.kind.type === "loom.section"
    )

    expect(section?.places).toBe(0)
    expect(section?.silence).toBe("unpaired")
    expect(meaningOfKindChangeSilence("unpaired").condition).toBe("nothing-carried")
    expect(meaningOfKindChangeSilence("unpaired").subject).toBe("kind")
    expect(
      relateSilences(
        meaningOfKindChangeSilence("unpaired"),
        meaningOfCopyChangeSilence("dissolved")
      )
    ).toBe("one-reason")
  })

  /**
   * The other half of the same set, which brings nothing: a kind nothing reported
   * a view of is the census's own state, said of two windows instead of one.
   */
  it("keeps a kind unread in a census and unread across two windows as one state", () => {
    expect(
      relateSilences(meaningOfKindChangeSilence("unread"), meaningOfKindSilence("unread"))
    ).toBe("one-state")
    expect(
      relateSilences(meaningOfKindChangeSilence("unplaced"), meaningOfKindSilence("unplaced"))
    ).toBe("one-state")
    expect(
      relateSilences(meaningOfKindChangeSilence("unread"), meaningOfChangeSilence("nothing-measured"))
    ).toBe("one-reason")
  })

  /**
   * The pair this set exists to hold apart, and the one a surface would get
   * wrong: both rows have no share, and the instructions they carry are
   * opposite.
   */
  it("keeps a kind nobody read and a kind nothing is, as two states", () => {
    const library = libraryReadingOf([readingOf(treeOf(PAGE), [])])
    const section = library.byType.find(
      (row) => row.kind.by === "type" && row.kind.type === "loom.section"
    )
    const heading = library.byRole.find(
      (row) => row.kind.by === "role" && row.kind.role === "heading"
    )

    expect(
      distinctSilences([
        section?.silence ? meaningOfKindSilence(section.silence) : null,
        heading?.silence ? meaningOfKindSilence(heading.silence) : null,
      ])
    ).toHaveLength(2)
  })
  /**
   * The thirteenth set, and the first assembled out of three: the census's
   * `unplaced`, the places comparison's `unpaired`, and the two states a change
   * to one page's words already reports of that page.
   */
  it("maps a kind whose words were all rewritten to the change having carried nothing, of that kind", () => {
    const before = treeOf(PAGE)
    const after = treeOf(
      element("page", "loom.stack", {}, [
        element("intro", "loom.section", { body: words(11) }),
        element("pricing", "loom.section", { body: words(31) }),
      ]),
      2
    )
    const change = libraryCopyChangeOf(
      [readingOf(before, [tally("page", { views: 9, reached: 9 })])],
      [readingOf(after, [tally("page", { views: 9, reached: 9, revision: 2 })])]
    )
    const section = change.byType.find(
      (row) => row.kind.by === "type" && row.kind.type === "loom.section"
    )

    expect(section?.rewritten).toBe(2)
    expect(section?.silence).toBe("unpaired")
    expect(meaningOfKindCopyChangeSilence("unpaired").condition).toBe("nothing-carried")
    expect(meaningOfKindCopyChangeSilence("unpaired").subject).toBe("kind")
    expect(
      relateSilences(
        meaningOfKindCopyChangeSilence("unpaired"),
        meaningOfKindChangeSilence("unpaired")
      )
    ).toBe("one-state")
  })

  /**
   * The pair that makes the thirteenth set worth the entry rather than a reuse:
   * a floor is the same state of the world said of a page's words and of a
   * kind's, which is `one-reason` and never `one-state` — and it is the only
   * member of any set here whose reading withholds one figure and publishes the
   * rest.
   */
  it("keeps a floor on one page's words and a floor on a kind's words as one reason", () => {
    /* A declared prop holding something that is not a string, which is a word owed and not given (0122). */
    const declarations: PartDeclarations = {
      copyFor: () => ["body", "count"],
      typesWithRole: () => [],
    }
    const tree = treeOf(
      element("page", "loom.stack", {}, [
        element("intro", "loom.section", { body: words(10), count: 3 }),
      ])
    )
    const change = libraryCopyChangeOf(
      [readingOf(tree, [tally("page", { views: 9, reached: 9 })], declarations)],
      [
        readingOf(
          tree,
          [
            tally("page", { views: 9, reached: 9 }),
            tally("intro", { views: 9, reached: 9 }),
          ],
          declarations
        ),
      ]
    )
    const section = change.byType.find(
      (row) => row.kind.by === "type" && row.kind.type === "loom.section"
    )

    expect(meaningOfKindCopyChangeSilence("floored").condition).toBe("words-a-floor")
    expect(
      relateSilences(
        meaningOfKindCopyChangeSilence("floored"),
        meaningOfCopyChangeSilence("floored")
      )
    ).toBe("one-reason")
    expect(
      relateSilences(meaningOfKindCopyChangeSilence("floored"), meaningOfCopySilence("floored"))
    ).toBe("one-reason")
    /* The row is there, its shares are there, and only the subtraction is gone. */
    expect(section?.silence).toBe("floored")
    expect(section?.words.change).toBeNull()
    expect(section?.words.readShareNow).toBe(1)
  })
})
