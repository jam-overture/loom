import { describe, expect, it } from "vitest"

import {
  buildElement,
  buildText,
  createTree,
  deltaIdSchema,
  nodeIdSchema,
  sequentialIdFactory,
  type LoomTree,
  type TreeDelta,
  type TreeOperation,
} from "@jam-overture/loom"
import type { CopyDeclarations } from "@jam-overture/loom/sdk"

import { runtimeWordsIn } from "../_test/plain-language"
import { describeProposalEffect } from "./proposal-effect"
import { readingOf } from "./vocabulary"
import { NO_STEPS, NOTHING_WOULD_CHANGE, triageAgainst, triageOf } from "./waiting-effect"

/** Every type here holds its words as children and shows none of its own. */
const DECLARED: CopyDeclarations = { copyFor: () => [] }

/**
 * A page with a heading and three cards, one of which holds four pieces — big
 * enough that deleting it and rewording the heading are visibly different news,
 * which is the whole thing this module exists to put on a queue row.
 */
const pageTree = (): LoomTree => {
  const ids = sequentialIdFactory("p")

  return createTree(
    buildElement(ids, {
      type: "loom.page",
      props: {},
      children: [
        buildElement(ids, {
          type: "loom.heading",
          props: { level: 1 },
          children: [buildText(ids, "Ship faster")],
        }),
        buildElement(ids, {
          type: "loom.card",
          props: { tone: "quiet" },
          children: [
            buildElement(ids, {
              type: "loom.heading",
              props: { level: 2 },
              children: [buildText(ids, "Prices")],
            }),
            buildElement(ids, {
              type: "loom.prose",
              props: {},
              children: [buildText(ids, "Free for personal projects.")],
            }),
          ],
        }),
        buildElement(ids, { type: "loom.card", props: {}, children: [] }),
      ],
    }),
    ids
  )
}

/** The ids `sequentialIdFactory` mints, a child before its parent. */
const HEADING_TEXT = nodeIdSchema.parse("n_p1")
const PRICES_CARD = nodeIdSchema.parse("n_p7")
const EMPTY_CARD = nodeIdSchema.parse("n_p8")
const PAGE = nodeIdSchema.parse("n_p9")

const deltaOf = (tree: LoomTree, operations: readonly TreeOperation[]): TreeDelta => ({
  deltaId: deltaIdSchema.parse("d_1"),
  treeId: tree.treeId,
  baseRevision: tree.revision,
  operations,
})

const triageFor = (tree: LoomTree, operations: readonly TreeOperation[]) =>
  triageOf(describeProposalEffect(tree, deltaOf(tree, operations), DECLARED))

const removeCard: TreeOperation = { op: "remove", nodeId: PRICES_CARD }
const removeEmptyCard: TreeOperation = { op: "remove", nodeId: EMPTY_CARD }
const rewordHeading: TreeOperation = {
  op: "configure",
  nodeId: HEADING_TEXT,
  set: { value: "Ship safer" },
  unset: [],
}

describe("triageOf", () => {
  /**
   * The reason the module exists, stated as the difference a row has to carry.
   * A queue that shows both of these and reads the same on each has sorted
   * nothing for the person looking at it.
   */
  it("tells a deletion of a whole section apart from a reworded heading", () => {
    const tree = pageTree()
    const deletion = readingOf(triageFor(tree, [removeCard]).steps[0]!)
    const rewording = readingOf(triageFor(tree, [rewordHeading]).steps[0]!)

    expect(deletion).toContain("Deletes")
    expect(deletion).toContain("pieces inside it")
    expect(rewording).toContain("Changes")
    expect(rewording).not.toContain("pieces")
  })

  /**
   * The names are the whole of the plain-language claim. A row saying
   * `remove n_p8` is the runtime talking, and that is what this screen had.
   */
  it("names the part a step is about rather than printing its type", () => {
    const step = triageFor(pageTree(), [removeCard]).steps[0]!

    expect(typeof step.subject).not.toBe("string")
    expect(readingOf(step)).toContain("the card")
  })

  /**
   * The rule the whole surface is arranged under, checked on the sentences a
   * reader meets without asking for them. The id is exempt for the reason the
   * 22 August rule gives — identity is not technical detail — and it is what
   * `PlainSentence` sets in monospace rather than part of the prose.
   */
  it("says the steps in a person's words", () => {
    const steps = triageFor(pageTree(), [removeCard, rewordHeading]).steps

    for (const step of steps) {
      expect(runtimeWordsIn(`${step.before}${step.after}`)).toEqual([])
    }
  })

  describe("the preview cut", () => {
    /**
     * Two steps is the row, and a row that shows two of five without saying so
     * is an account with three steps missing and no way to tell. It is the same
     * rule the review queue applies to the words a deletion takes away.
     */
    it("counts the steps it does not show", () => {
      const triage = triageFor(pageTree(), [removeCard, removeEmptyCard, rewordHeading])

      expect(triage.steps).toHaveLength(2)
      expect(triage.more).toBe("and 1 more step")
    })

    it("says nothing extra when the preview is all of them", () => {
      expect(triageFor(pageTree(), [removeCard]).more).toBeNull()
    })

    it("pluralises the count it withholds", () => {
      const triage = triageFor(pageTree(), [
        removeCard,
        removeEmptyCard,
        rewordHeading,
        { op: "configure", nodeId: PAGE, set: { theme: "loud" }, unset: [] },
      ])

      expect(triage.more).toBe("and 2 more steps")
    })

    /**
     * The cut decides how tall a row is and must not decide what a reader may
     * find out. Every step is in the record under it, including the ones the
     * preview dropped.
     */
    it("keeps every step in the technical record, not only the previewed ones", () => {
      const triage = triageFor(pageTree(), [removeCard, removeEmptyCard, rewordHeading])

      expect(triage.technical).toHaveLength(3)
      expect(triage.technical.every((step) => step.length > 0)).toBe(true)
    })
  })

  describe("how it stands", () => {
    /**
     * The most actionable thing a queue row can say, and the one that saves the
     * reader the trip: a change worked out against a page that has since moved
     * is turned down and asked for again, and they can know that from here.
     */
    it("says a change was worked out on an older version of the page", () => {
      const tree = pageTree()
      const stale = { ...deltaOf(tree, [rewordHeading]), baseRevision: tree.revision - 1 }
      const triage = triageOf(describeProposalEffect(tree, stale, DECLARED))

      expect(triage.standing?.label).toBe("This was worked out on an older version of this page.")
    })

    it("says a change that writes what is already there would change nothing", () => {
      const triage = triageFor(pageTree(), [
        { op: "configure", nodeId: HEADING_TEXT, set: { value: "Ship faster" }, unset: [] },
      ])

      expect(triage.standing).toEqual(NOTHING_WOULD_CHANGE)
    })

    /**
     * Whole-proposal only. `inertNote` also reports *some* steps being inert,
     * which is detail for the screen with the page on it and a caveat about a
     * change the reader cannot see on a row.
     */
    it("stays quiet when only one step of several is inert", () => {
      const triage = triageFor(pageTree(), [
        { op: "configure", nodeId: HEADING_TEXT, set: { value: "Ship faster" }, unset: [] },
        rewordHeading,
      ])

      expect(triage.standing).toBeNull()
    })

    /**
     * They suggest opposite actions and only one of them is available: a stale
     * change cannot be said yes to at all, so it is the one that is reported.
     */
    it("reports the obstacle rather than the inertness when a change has both", () => {
      const tree = pageTree()
      const inert: TreeOperation = {
        op: "configure",
        nodeId: HEADING_TEXT,
        set: { value: "Ship faster" },
        unset: [],
      }
      const stale = { ...deltaOf(tree, [inert]), baseRevision: tree.revision - 1 }
      const triage = triageOf(describeProposalEffect(tree, stale, DECLARED))

      expect(triage.standing).not.toEqual(NOTHING_WOULD_CHANGE)
      expect(triage.standing?.technical).not.toBe("every operation inert")
    })

    it("says so rather than rendering a silence when a change asks for nothing", () => {
      const triage = triageFor(pageTree(), [])

      expect(triage.standing).toEqual(NO_STEPS)
      expect(triage.steps).toEqual([])
    })

    it("stands at nothing on the ordinary waiting change", () => {
      expect(triageFor(pageTree(), [rewordHeading]).standing).toBeNull()
    })

    /** Every one of these is read unasked, so the rule covers them too. */
    it("says how it stands in a person's words, with the record beside it", () => {
      for (const word of [NO_STEPS, NOTHING_WOULD_CHANGE]) {
        expect(runtimeWordsIn(`${word.label} ${word.meaning}`)).toEqual([])
        expect(word.technical.length).toBeGreaterThan(0)
      }
    })
  })
})

describe("triageAgainst", () => {
  /**
   * A page that would not read is not a change with no steps. Those render
   * identically and are opposite facts, so the absence travels as one rather
   * than as an empty reading the card would have no way to recognise.
   */
  it("answers undefined for a page that could not be read", () => {
    const tree = pageTree()

    expect(triageAgainst(undefined, deltaOf(tree, [removeCard]), DECLARED)).toBeUndefined()
  })

  it("reads the same as the tree it is given", () => {
    const tree = pageTree()
    const delta = deltaOf(tree, [removeCard])

    expect(triageAgainst(tree, delta, DECLARED)).toEqual(
      triageOf(describeProposalEffect(tree, delta, DECLARED))
    )
  })
})
