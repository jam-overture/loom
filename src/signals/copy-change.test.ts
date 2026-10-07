import { describe, expect, it } from "vitest"

import type { JsonObject } from "../json.js"
import { nodeId, OTHER_TREE, primitiveType, TREE } from "../testing/reader-signal-contract.js"
import type { ElementNode, LoomNode } from "../tree/node.js"
import { TREE_SCHEMA_VERSION, type LoomTree } from "../tree/tree.js"

import {
  copyChangeOf,
  COPY_CHANGE_SILENCES,
  describeCopyChangeSilence,
  describePassageMovement,
  pageReadingOf,
  PASSAGE_MOVEMENTS,
  type ComparedPassage,
  type CopyChange,
  type PartDeclarations,
  type PassageMovement,
  type ReaderTally,
} from "./index.js"

/**
 * Built on two readings rather than on two copy readings, because that is what
 * the function takes: two trees, two windows of rows and what the library has
 * declared go in one end, and what the change did to the words comes out of the
 * other.
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

const text = (name: string, value: string): LoomNode => ({
  kind: "text",
  id: nodeId(name),
  value,
})

const treeOf = (root: ElementNode, revision: number): LoomTree => ({
  treeId: TREE,
  schemaVersion: TREE_SCHEMA_VERSION,
  revision,
  root,
})

/** Every type declares `body` as copy, which is the library of 0223 in miniature. */
const BODY_IS_COPY: PartDeclarations = {
  copyFor: () => ["body"],
  typesWithRole: () => [],
}

/** Nobody has declared anything, so every string prop a part holds is a floor. */
const NOTHING_DECLARED: PartDeclarations = {
  copyFor: () => undefined,
  typesWithRole: () => [],
}

/** A half-declared library, which is what every real one is on the way to 0223. */
const DECLARED_FOR = (types: readonly string[]): PartDeclarations => ({
  copyFor: (type) => (types.includes(type) ? ["body"] : undefined),
  typesWithRole: () => [],
})

const tally = (name: string, revision: number, counters: Partial<ReaderTally> = {}): ReaderTally => ({
  treeId: TREE,
  revision,
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

/** `n` words, which is nearly the only thing about the string these modules read. */
const words = (count: number): string => Array.from({ length: count }, () => "word").join(" ")

/** A page whose root says nothing itself, so every passage below is a band's own. */
const pageOf = (revision: number, bands: readonly ElementNode[]): LoomTree =>
  treeOf(element("page", "loom.stack", {}, bands), revision)

const band = (name: string, count: number): ElementNode =>
  element(name, "loom.section", { body: words(count) })

const changeOf = (
  was: { tree: LoomTree; counters: readonly ReaderTally[] },
  now: { tree: LoomTree; counters: readonly ReaderTally[] },
  declarations: PartDeclarations = BODY_IS_COPY
): CopyChange =>
  copyChangeOf(
    pageReadingOf(was.tree, was.counters, declarations),
    pageReadingOf(now.tree, now.counters, declarations)
  )

const passage = (change: CopyChange, name: string): ComparedPassage | undefined =>
  change.compared.find((compared) => compared.nodeId === nodeId(name))

/**
 * Three bands of ten, thirty and twenty words under a root that says nothing.
 *
 * Sixty words on the page, and the same three nodes saying the same three
 * things on both sides — so every reader figure below is about reading alone.
 */
const THREE_BANDS = [band("intro", 10), band("pricing", 30), band("footer", 20)]

/** Four readers, one of whom got past the intro. */
const WAS = {
  tree: pageOf(1, THREE_BANDS),
  counters: [tally("page", 1, { views: 4, reached: 4 }), tally("intro", 1, { views: 4, reached: 2 })],
}

/** Four readers, all of whom read the intro and three of whom reached the pricing band. */
const NOW = {
  tree: pageOf(2, THREE_BANDS),
  counters: [
    tally("page", 2, { views: 4, reached: 4 }),
    tally("intro", 2, { views: 4, reached: 4 }),
    tally("pricing", 2, { views: 4, reached: 3 }),
  ],
}

const sum = (counted: Readonly<Record<string, number>>): number =>
  Object.values(counted).reduce((total, one) => total + one, 0)

describe("copyChangeOf", () => {
  describe("what it answers", () => {
    it("says which words nobody reached before and somebody reaches now", () => {
      const change = changeOf(WAS, NOW)

      expect(change.silence).toBeNull()
      expect(change.wrote.carried).toBe(60)
      expect(change.passagesByMovement).toEqual({
        held: 1,
        gained: 1,
        lost: 0,
        unread: 1,
        unknown: 0,
      })
      expect(change.wordsByMovement).toEqual({
        held: 10,
        gained: 30,
        lost: 0,
        unread: 20,
        unknown: 0,
      })
      expect(passage(change, "pricing")?.movement).toBe("gained")
      expect(passage(change, "footer")?.movement).toBe("unread")
    })

    it("weights a passage's reach by its words, so the gain is a count of words", () => {
      const change = changeOf(WAS, NOW)
      const pricing = passage(change, "pricing")

      expect(pricing?.was.reach).toBe(0)
      expect(pricing?.now.reach).toBe(0.75)
      /** Thirty words, three readers in four, from none of them. */
      expect(pricing?.gain).toBe(22.5)
      /** Ten words, two more readers in four. */
      expect(passage(change, "intro")?.gain).toBe(5)
      /** Nobody either side, so no reader got a word more. */
      expect(passage(change, "footer")?.gain).toBe(0)
    })

    it("totals the gains into the words the average reader newly got to", () => {
      const change = changeOf(WAS, NOW)

      expect(change.typical).toEqual({ was: 5, now: 32.5, change: 27.5 })
      expect(change.typical?.change).toBeCloseTo(
        change.compared.reduce((total, one) => total + (one.gain ?? 0), 0),
        10
      )
    })

    it("measures each side against its own readers, so twenty-five times the traffic is not a change", () => {
      const change = changeOf(
        {
          tree: pageOf(1, THREE_BANDS),
          counters: [
            tally("page", 1, { views: 4, reached: 4 }),
            tally("intro", 1, { views: 4, reached: 2 }),
          ],
        },
        {
          tree: pageOf(2, THREE_BANDS),
          counters: [
            tally("page", 2, { views: 100, reached: 100 }),
            tally("intro", 2, { views: 100, reached: 50 }),
            tally("footer", 2, { views: 100, reached: 40 }),
          ],
        }
      )

      expect(change.readings.was.views).toBe(4)
      expect(change.readings.now.views).toBe(100)
      /** Half the readers reached the intro on both sides, of four and of a hundred. */
      expect(passage(change, "intro")?.was.reach).toBe(0.5)
      expect(passage(change, "intro")?.now.reach).toBe(0.5)
      expect(passage(change, "intro")?.gain).toBe(0)
      /** Twenty words, two in five readers, from none. */
      expect(passage(change, "footer")?.gain).toBe(8)
      expect(change.typical).toEqual({ was: 5, now: 13, change: 8 })
    })

    it("keeps the earlier of two equal gains, which is the first in the later page", () => {
      const two = [band("first", 10), band("second", 10)]
      const change = changeOf(
        { tree: pageOf(1, two), counters: [tally("page", 1, { views: 2, reached: 2 })] },
        {
          tree: pageOf(2, two),
          counters: [
            tally("page", 2, { views: 2, reached: 2 }),
            tally("first", 2, { views: 2, reached: 1 }),
            tally("second", 2, { views: 2, reached: 1 }),
          ],
        }
      )

      expect(change.mostGained?.gain).toBe(5)
      expect(change.mostLost).toBeNull()
      expect(change.mostGained?.nodeId).toBe(nodeId("first"))
    })

    it("names the passage the change put most words in front of a reader", () => {
      const change = changeOf(WAS, NOW)

      expect(change.mostGained?.nodeId).toBe(nodeId("pricing"))
      expect(change.mostLost).toBeNull()
    })

    it("lists the words the change did not fix, longest first", () => {
      const quiet = {
        tree: pageOf(2, [band("intro", 10), band("short", 5), band("long", 40)]),
        counters: [tally("page", 2, { views: 4, reached: 4 }), tally("intro", 2, { views: 4, reached: 4 })],
      }
      const before = {
        tree: pageOf(1, [band("intro", 10), band("short", 5), band("long", 40)]),
        counters: [tally("page", 1, { views: 4, reached: 4 }), tally("intro", 1, { views: 4, reached: 2 })],
      }

      const change = changeOf(before, quiet)

      expect(change.stillUnseen.map((one) => one.nodeId)).toEqual([nodeId("long"), nodeId("short")])
      expect(change.stillUnseen.map((one) => one.words)).toEqual([40, 5])
    })

    it("answers this week against last week when the tree is held still", () => {
      const change = changeOf(
        { tree: pageOf(1, THREE_BANDS), counters: WAS.counters },
        {
          tree: pageOf(1, THREE_BANDS),
          counters: NOW.counters.map((row) => ({ ...row, revision: 1 })),
        }
      )

      expect(change.revisions).toEqual({ was: 1, now: 1 })
      expect(change.wrote).toMatchObject({ added: 0, removed: 0, reworded: { was: 0, now: 0 } })
      expect(change.wrote.carried).toBe(60)
      expect(change.typical?.change).toBe(27.5)
    })

    it("reverses every sign when the two readings are handed over backwards", () => {
      const forwards = changeOf(WAS, NOW)
      const backwards = changeOf(NOW, WAS)

      expect(backwards.silence).toBeNull()
      expect(backwards.typical?.change).toBe(-(forwards.typical?.change ?? 0))
      expect(backwards.mostLost?.nodeId).toBe(nodeId("pricing"))
      expect(backwards.mostGained).toBeNull()
      expect(backwards.passagesByMovement.lost).toBe(1)
      expect(backwards.passagesByMovement.gained).toBe(0)
    })
  })

  describe("the census of what the change wrote", () => {
    it("tells the words the change added from the words it left alone", () => {
      const change = changeOf(WAS, {
        tree: pageOf(2, [...THREE_BANDS, band("faq", 25)]),
        counters: [...NOW.counters, tally("faq", 2, { views: 4, reached: 1 })],
      })

      expect(change.words).toEqual({ was: 60, now: 85, change: 25 })
      expect(change.wrote.added).toBe(25)
      expect(change.wrote.addedByStanding).toEqual({ read: 25, skipped: 0, unknown: 0 })
      expect(change.added.map((one) => one.nodeId)).toEqual([nodeId("faq")])
      expect(change.wrote.carried).toBe(60)
    })

    it("says whether the words a change took away were ones anybody had reached", () => {
      const change = changeOf(
        {
          tree: pageOf(1, [band("intro", 10), band("dead", 50)]),
          counters: [
            tally("page", 1, { views: 9, reached: 9 }),
            tally("intro", 1, { views: 9, reached: 9 }),
          ],
        },
        {
          tree: pageOf(2, [band("intro", 10)]),
          counters: [
            tally("page", 2, { views: 9, reached: 9 }),
            tally("intro", 2, { views: 9, reached: 9 }),
          ],
        }
      )

      expect(change.wrote.removed).toBe(50)
      expect(change.wrote.removedByStanding).toEqual({ read: 0, skipped: 50, unknown: 0 })
      expect(change.removed.map((one) => one.nodeId)).toEqual([nodeId("dead")])
    })

    it("partitions each side's words across carried, written and reworded, exactly once", () => {
      const change = changeOf(
        {
          tree: pageOf(1, [band("intro", 10), band("pitch", 30), band("dead", 50)]),
          counters: [tally("page", 1, { views: 3, reached: 3 }), tally("intro", 1, { views: 3, reached: 3 })],
        },
        {
          tree: pageOf(2, [band("intro", 10), band("pitch", 12), band("faq", 25)]),
          counters: [tally("page", 2, { views: 3, reached: 3 }), tally("intro", 2, { views: 3, reached: 3 })],
        }
      )

      expect(change.wrote.carried + change.wrote.removed + change.wrote.reworded.was).toBe(
        change.words.was
      )
      expect(change.wrote.carried + change.wrote.added + change.wrote.reworded.now).toBe(
        change.words.now
      )
    })

    it("keeps a reworded passage rather than dropping it, with both word counts", () => {
      const change = changeOf(WAS, {
        tree: pageOf(2, [band("intro", 10), band("pricing", 12), band("footer", 20)]),
        counters: NOW.counters,
      })

      expect(passage(change, "pricing")).toBeUndefined()
      expect(change.reworded.map((one) => one.nodeId)).toEqual([nodeId("pricing")])
      expect(change.reworded[0]?.words).toEqual({ was: 30, now: 12 })
      /** The standings are still each side's own, so the movement is still readable. */
      expect(change.reworded[0]?.movement).toBe("gained")
      expect(change.reworded[0]?.now.reach).toBe(0.75)
    })

    it("calls a part that said nothing and now says something reworded, not added", () => {
      const change = changeOf(
        {
          tree: pageOf(1, [band("intro", 10), element("pricing", "loom.section")]),
          counters: [tally("page", 1, { views: 2, reached: 2 }), tally("intro", 1, { views: 2, reached: 2 })],
        },
        {
          tree: pageOf(2, [band("intro", 10), band("pricing", 30)]),
          counters: [tally("page", 2, { views: 2, reached: 2 }), tally("intro", 2, { views: 2, reached: 2 })],
        }
      )

      expect(change.added).toEqual([])
      expect(change.reworded.map((one) => one.nodeId)).toEqual([nodeId("pricing")])
      expect(change.reworded[0]?.words).toEqual({ was: 0, now: 30 })
    })

    it("leaves a part that says nothing on either side out of every list", () => {
      const change = changeOf(
        {
          tree: pageOf(1, [band("intro", 10), element("rule", "loom.divider")]),
          counters: [tally("page", 1, { views: 2, reached: 2 }), tally("intro", 1, { views: 2, reached: 2 })],
        },
        {
          tree: pageOf(2, [band("intro", 10), element("rule", "loom.divider")]),
          counters: [tally("page", 2, { views: 2, reached: 2 }), tally("intro", 2, { views: 2, reached: 2 })],
        }
      )

      expect(change.compared.map((one) => one.nodeId)).toEqual([nodeId("intro")])
      expect(change.reworded).toEqual([])
    })

    it("compares a passage the change moved, where a pair of siblings could not have been", () => {
      const change = changeOf(
        {
          tree: pageOf(1, [band("intro", 10), element("aside", "loom.stack", {}, [band("note", 15)])]),
          counters: [
            tally("page", 1, { views: 5, reached: 5 }),
            tally("intro", 1, { views: 5, reached: 5 }),
          ],
        },
        {
          tree: pageOf(2, [band("note", 15), band("intro", 10), element("aside", "loom.stack")]),
          counters: [
            tally("page", 2, { views: 5, reached: 5 }),
            tally("intro", 2, { views: 5, reached: 5 }),
            tally("note", 2, { views: 5, reached: 4 }),
          ],
        }
      )

      expect(change.wrote).toMatchObject({ added: 0, removed: 0, reworded: { was: 0, now: 0 } })
      expect(passage(change, "note")?.movement).toBe("gained")
      expect(passage(change, "note")?.gain).toBe(12)
    })

    it("orders the carried passages by the later page and the removed ones by the earlier", () => {
      const change = changeOf(
        {
          tree: pageOf(1, [band("intro", 10), band("gonefirst", 5), band("pricing", 30), band("gonelast", 5)]),
          counters: [tally("page", 1, { views: 2, reached: 2 })],
        },
        {
          tree: pageOf(2, [band("pricing", 30), band("intro", 10)]),
          counters: [tally("page", 2, { views: 2, reached: 2 })],
        }
      )

      expect(change.compared.map((one) => one.nodeId)).toEqual([nodeId("pricing"), nodeId("intro")])
      expect(change.removed.map((one) => one.nodeId)).toEqual([
        nodeId("gonefirst"),
        nodeId("gonelast"),
      ])
    })
  })

  describe("what it refuses to add up twice", () => {
    it("credits a reader with a nested part's words once and not once per level", () => {
      const nested = (revision: number): LoomTree =>
        treeOf(
          element("page", "loom.stack", {}, [
            element("band", "loom.section", { body: words(10) }, [
              element("line", "loom.text", { body: words(5) }),
            ]),
          ]),
          revision
        )

      const change = changeOf(
        {
          tree: nested(1),
          counters: [tally("page", 1, { views: 4, reached: 4 })],
        },
        {
          tree: nested(2),
          counters: [
            tally("page", 2, { views: 4, reached: 4 }),
            tally("band", 2, { views: 4, reached: 4 }),
            tally("line", 2, { views: 4, reached: 4 }),
          ],
        }
      )

      expect(change.wrote.carried).toBe(15)
      /**
       * Every reader reached both the band and the line it contains. A reading
       * that charged the band its subtree's words — which is what `pace.ts`
       * deliberately does, and why 0230 refuses a page total of them — would make
       * this 20 against a page of 15.
       */
      expect(change.typical?.now).toBe(15)
      expect(change.typical?.now).toBeLessThanOrEqual(change.wrote.carried)
    })

    it("counts each carried passage in exactly one movement, by words and by passage", () => {
      const change = changeOf(WAS, NOW)

      expect(sum(change.wordsByMovement)).toBe(change.wrote.carried)
      expect(sum(change.passagesByMovement)).toBe(change.compared.length)
    })

    it("counts a passage in one list only, however the change touched it", () => {
      const change = changeOf(
        {
          tree: pageOf(1, [band("intro", 10), band("pitch", 30), band("dead", 50)]),
          counters: [tally("page", 1, { views: 3, reached: 3 })],
        },
        {
          tree: pageOf(2, [band("intro", 10), band("pitch", 12), band("faq", 25)]),
          counters: [tally("page", 2, { views: 3, reached: 3 })],
        }
      )

      const named = [
        ...change.compared.map((one) => one.nodeId),
        ...change.reworded.map((one) => one.nodeId),
        ...change.added.map((one) => one.nodeId),
        ...change.removed.map((one) => one.nodeId),
      ]

      expect(new Set(named).size).toBe(named.length)
    })
  })

  describe("what it withholds, and what it keeps anyway", () => {
    it("answers nothing about two different pages, not even their words", () => {
      const change = copyChangeOf(
        pageReadingOf(WAS.tree, WAS.counters, BODY_IS_COPY),
        pageReadingOf({ ...pageOf(2, THREE_BANDS), treeId: OTHER_TREE }, [], BODY_IS_COPY)
      )

      expect(change.silence).toBe("different-trees")
      expect(change.wrote).toEqual({
        carried: 0,
        added: 0,
        addedByStanding: { read: 0, skipped: 0, unknown: 0 },
        removed: 0,
        removedByStanding: { read: 0, skipped: 0, unknown: 0 },
        reworded: { was: 0, now: 0 },
      })
      expect(change.compared).toEqual([])
      expect(change.typical).toBeNull()
      /** Each side's own reading is still true of itself and is still carried. */
      expect(change.readings.was.words).toBe(60)
    })

    it("still says what the change wrote when one window held no page views", () => {
      const change = changeOf(
        { tree: pageOf(1, [band("intro", 10), band("dead", 50)]), counters: [] },
        { tree: pageOf(2, [band("intro", 10), band("faq", 25)]), counters: NOW.counters }
      )

      expect(change.silence).toBe("nothing-measured")
      expect(change.words).toEqual({ was: 60, now: 35, change: -25 })
      expect(change.wrote.removed).toBe(50)
      expect(change.wrote.added).toBe(25)
      expect(change.wrote.carried).toBe(10)
      /** Every standing on the unmeasured side is unknown, so nothing is compared. */
      expect(change.passagesByMovement.unknown).toBe(1)
      expect(passage(change, "intro")?.was.reach).toBeNull()
      expect(passage(change, "intro")?.gain).toBeNull()
      expect(change.typical).toBeNull()
      expect(change.stillUnseen).toEqual([])
    })

    it("says so when neither revision says anything", () => {
      const change = changeOf(
        { tree: pageOf(1, [element("rule", "loom.divider")]), counters: [tally("page", 1, { views: 2 })] },
        { tree: pageOf(2, [element("rule", "loom.divider")]), counters: [tally("page", 2, { views: 2 })] }
      )

      expect(change.silence).toBe("wordless")
      expect(change.typical).toBeNull()
    })

    it("says so when the change left no word of the page as it was", () => {
      const change = changeOf(
        {
          tree: pageOf(1, [band("intro", 10)]),
          counters: [tally("page", 1, { views: 2, reached: 2 }), tally("intro", 1, { views: 2, reached: 2 })],
        },
        {
          tree: pageOf(2, [band("faq", 25)]),
          counters: [tally("page", 2, { views: 2, reached: 2 }), tally("faq", 2, { views: 2, reached: 1 })],
        }
      )

      expect(change.silence).toBe("dissolved")
      expect(change.wrote.carried).toBe(0)
      /** The census answers in full, which is the whole of what can be said. */
      expect(change.wrote.removedByStanding).toEqual({ read: 10, skipped: 0, unknown: 0 })
      expect(change.wrote.addedByStanding).toEqual({ read: 25, skipped: 0, unknown: 0 })
      expect(change.typical).toBeNull()
    })

    it("withholds the page total under a floor and keeps each passage's own gain", () => {
      /**
       * `loom.aside` declares nothing, so its `caption` is a word nobody can see
       * (0122) while the ten words handed into it are plain text and visible.
       */
      const floored = (revision: number): LoomTree =>
        pageOf(revision, [
          element("intro", "loom.aside", { caption: words(5) }, [text("introtext", words(10))]),
          band("pricing", 30),
        ])

      const change = changeOf(
        {
          tree: floored(1),
          counters: [tally("page", 1, { views: 4, reached: 4 }), tally("intro", 1, { views: 4, reached: 1 })],
        },
        {
          tree: floored(2),
          counters: [tally("page", 2, { views: 4, reached: 4 }), tally("intro", 2, { views: 4, reached: 3 })],
        },
        DECLARED_FOR(["loom.section"])
      )

      expect(change.silence).toBe("floored")
      expect(change.floored).toBe(1)
      expect(change.typical).toBeNull()
      /**
       * The same words are on both sides, so an understated count scales the
       * gain toward zero and cannot flip its sign. Ten visible words of a
       * passage that may say fifteen, two more readers in four.
       */
      expect(passage(change, "intro")?.floored).toBe(true)
      expect(passage(change, "intro")?.gain).toBe(5)
      expect(passage(change, "intro")?.movement).toBe("held")
      /** The passage counts survive the floor outright. */
      expect(change.passagesByMovement.held).toBe(1)
    })

    it("counts the words a floor hides as a floor, not as a rewording", () => {
      const change = changeOf(
        {
          tree: pageOf(1, [band("intro", 10)]),
          counters: [tally("page", 1, { views: 2, reached: 2 }), tally("intro", 1, { views: 2, reached: 2 })],
        },
        {
          tree: pageOf(2, [band("intro", 10)]),
          counters: [tally("page", 2, { views: 2, reached: 2 }), tally("intro", 2, { views: 2, reached: 2 })],
        },
        NOTHING_DECLARED
      )

      /** Nobody declared `body`, so the ten words are invisible on both sides. */
      expect(change.wrote.carried).toBe(0)
      expect(change.reworded).toEqual([])
      expect(change.compared.map((one) => one.nodeId)).toEqual([nodeId("intro")])
      expect(change.compared[0]?.floored).toBe(true)
      expect(change.silence).toBe("wordless")
    })

    it("names a reading that reports more readers than the page has views, and does not clamp it", () => {
      const change = changeOf(WAS, {
        tree: pageOf(2, THREE_BANDS),
        counters: [
          tally("page", 2, { views: 4, reached: 4 }),
          tally("intro", 2, { views: 4, reached: 9 }),
        ],
      })

      expect(change.silence).toBe("inconsistent")
      expect(passage(change, "intro")?.now.reach).toBe(2.25)
      expect(change.typical).toBeNull()
      /** The per-passage figures stay drawable, because the fault is what they show. */
      expect(passage(change, "intro")?.gain).toBe(17.5)
    })

    it("prefers the state of the deployment over the state of the question", () => {
      /** A total rewrite of a page nobody opened reports the window, not the rewrite. */
      const change = changeOf(
        { tree: pageOf(1, [band("intro", 10)]), counters: [] },
        { tree: pageOf(2, [band("faq", 25)]), counters: [] }
      )

      expect(change.silence).toBe("nothing-measured")
    })
  })

  describe("the closed sets", () => {
    it("describes every silence", () => {
      expect(COPY_CHANGE_SILENCES).toHaveLength(6)
      for (const silence of COPY_CHANGE_SILENCES) {
        expect(describeCopyChangeSilence(silence)).toMatch(/\S/)
      }
      expect(new Set(COPY_CHANGE_SILENCES.map(describeCopyChangeSilence)).size).toBe(
        COPY_CHANGE_SILENCES.length
      )
    })

    it("describes every movement", () => {
      expect(PASSAGE_MOVEMENTS).toHaveLength(5)
      for (const movement of PASSAGE_MOVEMENTS) {
        expect(describePassageMovement(movement)).toMatch(/\S/)
      }
      expect(new Set(PASSAGE_MOVEMENTS.map(describePassageMovement)).size).toBe(
        PASSAGE_MOVEMENTS.length
      )
    })

    it("reaches every movement from a reading somebody could have", () => {
      const seen = new Set<PassageMovement>()
      const four = [band("held", 10), band("gained", 10), band("lost", 10), band("unread", 10)]

      const measured = changeOf(
        {
          tree: pageOf(1, four),
          counters: [
            tally("page", 1, { views: 4, reached: 4 }),
            tally("held", 1, { views: 4, reached: 4 }),
            tally("lost", 1, { views: 4, reached: 2 }),
          ],
        },
        {
          tree: pageOf(2, four),
          counters: [
            tally("page", 2, { views: 4, reached: 4 }),
            tally("held", 2, { views: 4, reached: 4 }),
            tally("gained", 2, { views: 4, reached: 1 }),
          ],
        }
      )

      for (const one of measured.compared) seen.add(one.movement)

      const unmeasured = changeOf(
        { tree: pageOf(1, four), counters: [] },
        { tree: pageOf(2, four), counters: [] }
      )

      for (const one of unmeasured.compared) seen.add(one.movement)

      expect([...PASSAGE_MOVEMENTS].every((movement) => seen.has(movement))).toBe(true)
    })
  })
})
