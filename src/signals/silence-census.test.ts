import { describe, expect, it } from "vitest"

import { DEFAULT_AUDIENCE_ID } from "../audience/audience.js"
import { OTHER_TREE, RIDERS, SKIERS, TREE } from "../testing/reader-signal-contract.js"

import {
  formKeyOf,
  meaningOfChangeSilence,
  meaningOfCopyChangeSilence,
  meaningOfCopySilence,
  meaningOfDeploymentSilence,
  meaningOfKindSilence,
  meaningOfPaceSilence,
  meaningOfReachSilence,
  relateSilences,
  silenceCensusOf,
  type PageForm,
  type ReadingSilence,
} from "./index.js"

/**
 * What a window could not answer, and what each reason cost it.
 *
 * The vocabulary and the relation are tested where they live. What is pinned
 * here is the arithmetic over them: that one state is one condition about one
 * subject and nothing more, that a page is counted once however many of its
 * readings report a state, and that the two groupings partition the readings
 * they were handed rather than each holding a copy.
 */

const form = (treeId = TREE, audienceId = DEFAULT_AUDIENCE_ID): PageForm => ({
  treeId,
  audienceId,
})

const PRICING = form()
const DOCS = form(OTHER_TREE)

/** A reading that answered, which is what most of a healthy window hands over. */
const answered = (of: PageForm | null = PRICING): ReadingSilence => ({ meaning: null, form: of })

describe("what a window could not answer", () => {
  it("has nothing to report about a window whose every reading answered", () => {
    const census = silenceCensusOf([answered(), answered(), answered(DOCS)])

    expect(census.readings).toBe(3)
    expect(census.silent).toBe(0)
    expect(census.answered).toBe(3)
    expect(census.states).toEqual([])
    expect(census.byForm.map((row) => row.silent)).toEqual([0, 0])
  })

  it("is empty rather than refused when it is handed nothing", () => {
    expect(silenceCensusOf([])).toEqual({
      readings: 0,
      silent: 0,
      answered: 0,
      states: [],
      byForm: [],
      wide: { readings: 0, silent: 0, states: [] },
    })
  })

  it("names the condition and the subject a state is, and keeps the first vocabulary", () => {
    const census = silenceCensusOf([
      { meaning: meaningOfCopySilence("unmeasured"), form: PRICING },
      { meaning: meaningOfReachSilence("unmeasured"), form: PRICING },
    ])

    expect(census.states).toHaveLength(2)
    expect(census.states[0]?.condition).toBe("no-view-reported")
    expect(census.states[0]?.subject).toBe("page")
    expect(census.states[0]?.vocabulary).toBe("copy")
    expect(census.states[1]?.condition).toBe("no-arrivals-counted")
    expect(census.states[1]?.vocabulary).toBe("reach")
  })

  it("collapses two spellings of one state and keeps every vocabulary that said it", () => {
    const census = silenceCensusOf([
      { meaning: meaningOfChangeSilence("nothing-measured"), form: PRICING },
      { meaning: meaningOfCopyChangeSilence("nothing-measured"), form: PRICING },
    ])

    expect(census.states).toHaveLength(1)
    expect(census.states[0]?.vocabulary).toBe("change")
    expect(census.states[0]?.vocabularies).toEqual(["change", "copy-change"])
    expect(census.states[0]?.readings).toBe(2)
  })

  /**
   * The costlier error of the two, and the one 0240 exists for: the same
   * condition said of a page and of a comparison is two sentences.
   */
  it("keeps one condition about two subjects as two states", () => {
    const census = silenceCensusOf([
      { meaning: meaningOfCopySilence("unmeasured"), form: PRICING },
      { meaning: meaningOfChangeSilence("nothing-measured"), form: PRICING },
    ])

    expect(census.states).toHaveLength(2)
    expect(relateSilences(census.states[0]!, census.states[1]!)).toBe("one-reason")
  })

  it("gives the states back in the order the readings were handed over", () => {
    const census = silenceCensusOf([
      { meaning: meaningOfReachSilence("uncounted"), form: PRICING },
      answered(),
      { meaning: meaningOfCopySilence("wordless"), form: PRICING },
      { meaning: meaningOfReachSilence("uncounted"), form: DOCS },
      { meaning: meaningOfPaceSilence("unreached"), form: DOCS },
    ])

    expect(census.states.map((state) => state.condition)).toEqual([
      "no-window-folded",
      "says-nothing",
      "no-view-reported",
    ])
  })

  /** No two states of one census may report one state, which is the grouping key's whole job. */
  it("leaves no two states that relateSilences would call one", () => {
    const census = silenceCensusOf([
      { meaning: meaningOfCopySilence("unmeasured"), form: PRICING },
      { meaning: meaningOfReachSilence("unmeasured"), form: DOCS },
      { meaning: meaningOfChangeSilence("nothing-measured"), form: PRICING },
      { meaning: meaningOfCopyChangeSilence("nothing-measured"), form: DOCS },
      { meaning: meaningOfKindSilence("unplaced"), form: null },
    ])

    for (const one of census.states) {
      for (const other of census.states) {
        if (one === other) continue
        expect(relateSilences(one, other)).not.toBe("one-state")
      }
    }
  })
})

describe("what a reason cost", () => {
  /**
   * The double-count case this lane requires. A state's readings and the pages
   * it cost are different numbers, and the way this would be wrong is reporting
   * one page nine times because nine of its readings said one thing.
   */
  it("counts a page once however many of its readings report one state", () => {
    const census = silenceCensusOf([
      { meaning: meaningOfCopySilence("unmeasured"), form: PRICING },
      { meaning: meaningOfCopySilence("unmeasured"), form: PRICING },
      { meaning: meaningOfCopySilence("unmeasured"), form: PRICING },
    ])

    expect(census.states[0]?.readings).toBe(3)
    expect(census.states[0]?.forms).toHaveLength(1)
    expect(census.states[0]?.forms[0]).toEqual(PRICING)
  })

  it("counts two pages as two, and the readings as readings", () => {
    const census = silenceCensusOf([
      { meaning: meaningOfCopySilence("unmeasured"), form: PRICING },
      { meaning: meaningOfCopySilence("unmeasured"), form: DOCS },
      { meaning: meaningOfCopySilence("unmeasured"), form: DOCS },
    ])

    expect(census.states[0]?.readings).toBe(3)
    expect(census.states[0]?.forms.map((of) => of.treeId)).toEqual([TREE, OTHER_TREE])
  })

  /**
   * Two forms of one page are two readerships and not one page handed in twice,
   * which is what `formKeyOf` is published for (0290, 0293). A census keyed by
   * the tree would report one page here.
   */
  it("counts two forms of one page as two pages", () => {
    const census = silenceCensusOf([
      { meaning: meaningOfCopySilence("unmeasured"), form: form(TREE, SKIERS) },
      { meaning: meaningOfCopySilence("unmeasured"), form: form(TREE, RIDERS) },
    ])

    expect(census.states[0]?.forms).toHaveLength(2)
    expect(new Set(census.states[0]?.forms.map(formKeyOf)).size).toBe(2)
  })

  it("names a reading of no one page as wide rather than attributing it to a page", () => {
    const census = silenceCensusOf([
      { meaning: meaningOfKindSilence("unplaced"), form: null },
      { meaning: meaningOfKindSilence("unplaced") },
      { meaning: meaningOfDeploymentSilence("unscaled"), form: PRICING },
    ])

    expect(census.states[0]?.wide).toBe(2)
    expect(census.states[0]?.forms).toEqual([])
    expect(census.states[1]?.wide).toBe(0)
    expect(census.wide).toEqual({
      readings: 2,
      silent: 2,
      states: [meaningOfKindSilence("unplaced")],
    })
    expect(census.byForm.map((row) => row.form)).toEqual([PRICING])
  })

  it("puts the pages of a state in form order whatever order they arrived in", () => {
    const census = silenceCensusOf([
      { meaning: meaningOfCopySilence("unmeasured"), form: DOCS },
      { meaning: meaningOfCopySilence("unmeasured"), form: PRICING },
    ])

    expect(census.states[0]?.forms.map((of) => of.treeId)).toEqual([TREE, OTHER_TREE])
  })
})

describe("what a page answered", () => {
  it("gives a page's silences a denominator, which is why an answered reading is handed over", () => {
    const census = silenceCensusOf([
      { meaning: meaningOfCopySilence("unmeasured"), form: PRICING },
      { meaning: meaningOfReachSilence("unmeasured"), form: PRICING },
      answered(),
      { meaning: meaningOfCopySilence("unmeasured"), form: DOCS },
      answered(DOCS),
      answered(DOCS),
    ])

    const [pricing, docs] = census.byForm

    expect(pricing?.form).toEqual(PRICING)
    expect(pricing?.readings).toBe(3)
    expect(pricing?.silent).toBe(2)
    expect(pricing?.states).toHaveLength(2)

    expect(docs?.readings).toBe(3)
    expect(docs?.silent).toBe(1)
    expect(docs?.states).toEqual([meaningOfCopySilence("unmeasured")])
  })

  it("collapses a page's two spellings of one state, as the window's states do", () => {
    const [row] = silenceCensusOf([
      { meaning: meaningOfChangeSilence("nothing-measured"), form: PRICING },
      { meaning: meaningOfCopyChangeSilence("nothing-measured"), form: PRICING },
    ]).byForm

    expect(row?.silent).toBe(2)
    expect(row?.states).toEqual([meaningOfChangeSilence("nothing-measured")])
  })

  it("puts the pages in form order whatever order they arrived in", () => {
    const census = silenceCensusOf([answered(DOCS), answered(PRICING)])

    expect(census.byForm.map((row) => row.form.treeId)).toEqual([TREE, OTHER_TREE])
  })
})

describe("the identities it publishes rather than describes", () => {
  const window: readonly ReadingSilence[] = [
    { meaning: meaningOfCopySilence("unmeasured"), form: PRICING },
    { meaning: meaningOfReachSilence("unmeasured"), form: PRICING },
    { meaning: meaningOfCopySilence("unmeasured"), form: PRICING },
    answered(),
    { meaning: meaningOfChangeSilence("nothing-measured"), form: DOCS },
    answered(DOCS),
    { meaning: meaningOfKindSilence("unread"), form: null },
    { meaning: meaningOfKindSilence("unplaced") },
  ]

  it("splits every reading into silent or answered", () => {
    const census = silenceCensusOf(window)

    expect(census.readings).toBe(window.length)
    expect(census.silent + census.answered).toBe(census.readings)
    expect(census.silent).toBe(6)
  })

  /**
   * The partition that makes the states addable at all: every silent reading is
   * in exactly one state, so their readings sum to the silent count. The pages
   * do not sum to anything, which is why no such total is published.
   */
  it("puts every silent reading in exactly one state", () => {
    const census = silenceCensusOf(window)

    expect(census.states.reduce((total, state) => total + state.readings, 0)).toBe(census.silent)
  })

  it("holds every reading in exactly one group, counting the wide ones apart", () => {
    const census = silenceCensusOf(window)
    const byForm = census.byForm.reduce(
      (totals, row) => ({
        readings: totals.readings + row.readings,
        silent: totals.silent + row.silent,
      }),
      { readings: 0, silent: 0 }
    )

    expect(byForm.readings + census.wide.readings).toBe(census.readings)
    expect(byForm.silent + census.wide.silent).toBe(census.silent)
  })

  it("accounts for each state's readings as its pages' and its wide ones", () => {
    for (const state of silenceCensusOf(window).states) {
      expect(state.readings).toBeGreaterThanOrEqual(state.forms.length + state.wide)
    }
  })
})
