import { describe, expect, it } from "vitest"

import type { JsonObject } from "../json.js"
import { PRIMITIVE_ROLES, type PrimitiveRole } from "../role.js"
import { nodeId, primitiveType, TREE } from "../testing/reader-signal-contract.js"
import type { ElementNode, LoomNode, SlotNode } from "../tree/node.js"
import { TREE_SCHEMA_VERSION, type LoomTree } from "../tree/tree.js"

import {
  copyReadingOf,
  COPY_SILENCES,
  describeCopySilence,
  pageReadingOf,
  type CopyReading,
  type PartDeclarations,
  type ReaderTally,
} from "./index.js"

/**
 * Built on the reading rather than on counters, because that is what the
 * function takes: a tree, a window's rows and what the library has declared go
 * in one end, and how much of what the page says got read comes out of the
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

const slot = (name: string, children: readonly LoomNode[]): SlotNode => ({
  kind: "slot",
  id: nodeId(name),
  name: "children" as SlotNode["name"],
  children,
})

const treeOf = (root: ElementNode, revision = 1): LoomTree => ({
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

/** Nobody has declared anything, which is what a word in a prop being invisible looks like. */
const NOTHING_DECLARED: PartDeclarations = {
  copyFor: () => undefined,
  typesWithRole: () => [],
}

/** A half-declared library, which is what every real one is on the way to 0223. */
const DECLARED_FOR = (types: readonly string[]): PartDeclarations => ({
  copyFor: (type) => (types.includes(type) ? ["body"] : undefined),
  typesWithRole: () => [],
})

/** One role declared over one type, so a role row has something in it. */
const ROLE_FOR = (role: PrimitiveRole, types: readonly string[]): PartDeclarations => ({
  copyFor: () => ["body"],
  typesWithRole: (asked) => (asked === role ? types.map(primitiveType) : []),
})

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

/** `n` words, which is nearly the only thing about the string this module reads. */
const words = (count: number): string => Array.from({ length: count }, () => "word").join(" ")

const copyOf = (
  tree: LoomTree,
  counters: readonly ReaderTally[],
  declarations: PartDeclarations = BODY_IS_COPY
) => copyReadingOf(pageReadingOf(tree, counters, declarations))

const passageIn = (reading: CopyReading, name: string) =>
  reading.passages.find((passage) => passage.nodeId === nodeId(name))

const roleRow = (reading: CopyReading, role: PrimitiveRole | null) =>
  reading.roles.find((row) => row.role === role)

/**
 * Two bands under a root that says nothing itself: ten words and thirty.
 *
 * Forty words on the page, and every case below is built against that total.
 */
const PAGE = element("page", "loom.stack", {}, [
  element("intro", "loom.section", { body: words(10) }),
  element("pricing", "loom.section", { body: words(30) }),
])

describe("copyReadingOf", () => {
  it("says how much of what a page says readers reached, and which words nobody saw", () => {
    const reading = copyOf(treeOf(PAGE), [
      tally("page", { views: 4, reached: 4 }),
      tally("intro", { views: 4, reached: 4 }),
    ])

    expect(reading.words).toBe(40)
    expect(reading.wordsByStanding).toEqual({ read: 10, skipped: 30, unknown: 0 })
    expect(reading.share).toBe(0.25)
    expect(reading.unseen.map((passage) => passage.nodeId)).toEqual([nodeId("pricing")])
    expect(reading.unseen[0]?.words).toBe(30)
  })

  it("carries the words themselves, so a passage nobody saw can be quoted back", () => {
    const reading = copyOf(
      treeOf(
        element("page", "loom.stack", {}, [
          element("intro", "loom.section", { body: "the first thing" }),
          element("pricing", "loom.section", { body: "nobody got here" }),
        ])
      ),
      [tally("page", { views: 2, reached: 2 }), tally("intro", { views: 2, reached: 2 })]
    )

    expect(reading.unseen[0]?.text).toEqual(["nobody got here"])
    expect(passageIn(reading, "intro")?.text).toEqual(["the first thing"])
  })

  /**
   * The property the page-wide total rests on, and the one 0230 refused for the
   * nesting figure. A band and the paragraph inside it both say words, and the
   * page's total is each said once.
   */
  it("counts a nested part's words once, in its own passage and not its parent's", () => {
    const reading = copyOf(
      treeOf(
        element("page", "loom.stack", { body: words(5) }, [
          element("band", "loom.section", { body: words(10) }, [
            element("heading", "loom.heading", { body: words(20) }),
          ]),
        ])
      ),
      [tally("page", { views: 1, reached: 1 })]
    )

    expect(passageIn(reading, "band")?.words).toBe(10)
    expect(passageIn(reading, "heading")?.words).toBe(20)
    expect(reading.words).toBe(35)
    expect(
      reading.passages.reduce((total, passage) => total + passage.words, 0)
    ).toBe(reading.words)
  })

  it("adds a word to exactly one standing, so the three partition the page", () => {
    const reading = copyOf(treeOf(PAGE), [
      tally("page", { views: 4, reached: 4 }),
      tally("intro", { views: 4, reached: 0 }),
    ])

    const { read, skipped, unknown } = reading.wordsByStanding

    expect(read + skipped + unknown).toBe(reading.words)
    expect(unknown).toBe(10)
    expect(skipped).toBe(30)
  })

  it("keeps the words of a part nothing can speak for out of the unseen list", () => {
    const reading = copyOf(treeOf(PAGE), [
      tally("page", { views: 4, reached: 4 }),
      tally("intro", { views: 4, reached: 0 }),
    ])

    expect(reading.unseen.map((passage) => passage.nodeId)).toEqual([nodeId("pricing")])
    expect(reading.wordsByStanding.unknown).toBe(10)
  })

  it("calls nothing skipped in a window that held no views", () => {
    const reading = copyOf(treeOf(PAGE), [])

    expect(reading.views).toBe(0)
    expect(reading.wordsByStanding).toEqual({ read: 0, skipped: 0, unknown: 40 })
    expect(reading.unseen).toEqual([])
    expect(reading.share).toBe(0)
    expect(reading.typical).toBeNull()
    expect(reading.silence).toBe("unmeasured")
  })

  it("ranks the words nobody saw by how many they are, then by reading order", () => {
    const reading = copyOf(
      treeOf(
        element("page", "loom.stack", {}, [
          element("first", "loom.section", { body: words(5) }),
          element("longest", "loom.section", { body: words(40) }),
          element("second", "loom.section", { body: words(5) }),
        ])
      ),
      [tally("page", { views: 3, reached: 3 })]
    )

    expect(reading.unseen.map((passage) => passage.nodeId)).toEqual([
      nodeId("longest"),
      nodeId("first"),
      nodeId("second"),
    ])
  })

  it("leaves a part that says nothing out of the passages and counts it", () => {
    const reading = copyOf(
      treeOf(
        element("page", "loom.stack", {}, [
          element("rule", "loom.divider"),
          element("intro", "loom.section", { body: words(10) }),
        ])
      ),
      [tally("page", { views: 1, reached: 1 })]
    )

    expect(reading.passages.map((passage) => passage.nodeId)).toEqual([nodeId("intro")])
    expect(reading.silent).toBe(2)
    expect(reading.words).toBe(10)
  })

  it("keeps a part whose words it cannot see, because that is not a part saying nothing", () => {
    const reading = copyOf(
      treeOf(element("page", "loom.stack", {}, [element("intro", "loom.section", { body: "a" })])),
      [tally("page", { views: 1, reached: 1 })],
      NOTHING_DECLARED
    )

    expect(passageIn(reading, "intro")?.floored).toBe(true)
    expect(passageIn(reading, "intro")?.words).toBe(0)
    expect(reading.silent).toBe(1)
  })

  it("reads the words handed through a slot as the element above it", () => {
    const reading = copyOf(
      treeOf(
        element("page", "loom.stack", {}, [
          element("band", "loom.section", {}, [slot("children", [text("said", words(12))])]),
        ])
      ),
      [tally("page", { views: 1, reached: 1 }), tally("band", { views: 1, reached: 1 })]
    )

    expect(passageIn(reading, "band")?.words).toBe(12)
    expect(reading.words).toBe(12)
    expect(reading.share).toBe(1)
  })

  describe("the share and the typical reader's figure", () => {
    it("says a quarter of the words reached the average reader where every reader saw a quarter", () => {
      const reading = copyOf(treeOf(PAGE), [
        tally("page", { views: 4, reached: 4 }),
        tally("intro", { views: 4, reached: 4 }),
      ])

      expect(reading.typical).toBe(10)
      expect(reading.share).toBe(0.25)
    })

    /**
     * The two sentences the module exists to keep apart. Every word was reached
     * by somebody and the average reader got to a fifth of them.
     */
    it("separates the words somebody reached from the words the typical reader did", () => {
      const reading = copyOf(treeOf(PAGE), [
        tally("page", { views: 10, reached: 10 }),
        tally("intro", { views: 10, reached: 10 }),
        tally("pricing", { views: 10, reached: 1 }),
      ])

      expect(reading.share).toBe(1)
      expect(reading.typical).toBe((10 * 10 + 1 * 30) / 10)
    })

    it("cannot report a typical reader reaching more words than the page says", () => {
      const reading = copyOf(treeOf(PAGE), [
        tally("page", { views: 6, reached: 6 }),
        tally("intro", { views: 6, reached: 6 }),
        tally("pricing", { views: 6, reached: 6 }),
      ])

      expect(reading.typical).toBe(40)
      expect(reading.typical).toBeLessThanOrEqual(reading.words)
    })

    /**
     * The case the silence exists for, and it is the worst-looking one: every
     * word this reading can see was read, so the share is a perfect 1, and the
     * thirty words nobody saw are in a part whose type declared nothing. The
     * share says what it can and the per-reader figure declines.
     */
    it("withholds the figure where some part's words are a floor, and says so", () => {
      const reading = copyOf(
        treeOf(
          element("page", "loom.stack", { body: words(10) }, [
            element("pricing", "loom.undeclared", { body: words(30) }),
          ])
        ),
        [tally("page", { views: 4, reached: 4 })],
        DECLARED_FOR(["loom.stack"])
      )

      expect(reading.words).toBe(10)
      expect(reading.share).toBe(1)
      expect(reading.floored).toEqual({ read: 0, skipped: 1, unknown: 0 })
      expect(reading.typical).toBeNull()
      expect(reading.silence).toBe("floored")
    })

    it("counts the floored passages by standing, because that is the direction a share is wrong in", () => {
      const reading = copyOf(
        treeOf(
          element("page", "loom.stack", { body: words(1) }, [
            element("intro", "loom.undeclared", { body: words(10) }),
            element("pricing", "loom.undeclared", { body: words(30) }),
          ])
        ),
        [tally("page", { views: 4, reached: 4 }), tally("intro", { views: 4, reached: 4 })],
        DECLARED_FOR(["loom.stack"])
      )

      expect(reading.floored).toEqual({ read: 1, skipped: 1, unknown: 0 })
    })

    it("withholds the figure from a page that says nothing", () => {
      const reading = copyOf(
        treeOf(element("page", "loom.stack", {}, [element("rule", "loom.divider")])),
        [tally("page", { views: 3, reached: 3 })]
      )

      expect(reading.words).toBe(0)
      expect(reading.share).toBeNull()
      expect(reading.typical).toBeNull()
      expect(reading.silence).toBe("wordless")
    })

    /**
     * The one case where the order of the two reasons is visible, and both of
     * them are true. *The page says nothing* is the one that will still be true
     * tomorrow when readers arrive, and it is the one a deployment can do
     * something about, so it is the one reported.
     */
    it("says a page that was never opened and says nothing is wordless, not unmeasured", () => {
      const reading = copyOf(
        treeOf(element("page", "loom.stack", {}, [element("rule", "loom.divider")])),
        []
      )

      expect(reading.views).toBe(0)
      expect(reading.words).toBe(0)
      expect(reading.silence).toBe("wordless")
    })

    /**
     * The alarm, and the one state here a rollup cannot produce: `reached` is
     * never above a row's own `views`, and the page's figure is the largest
     * `views` there was.
     */
    it("refuses the figure where a part reports more readers than the page has views", () => {
      const reading = copyOf(treeOf(PAGE), [
        tally("page", { views: 2, reached: 2 }),
        tally("intro", { views: 2, reached: 9 }),
      ])

      expect(reading.views).toBe(2)
      expect(reading.typical).toBeNull()
      expect(reading.silence).toBe("inconsistent")
    })

    it("reports the figure and no silence where nothing is in the way", () => {
      const reading = copyOf(treeOf(PAGE), [
        tally("page", { views: 4, reached: 4 }),
        tally("intro", { views: 4, reached: 2 }),
      ])

      expect(reading.silence).toBeNull()
      expect(reading.typical).toBe(5)
    })
  })

  describe("roles", () => {
    it("adds a role's words across its parts, because own words partition the page", () => {
      const reading = copyOf(
        treeOf(
          element("page", "loom.stack", {}, [
            element("one", "loom.heading", { body: words(4) }),
            element("two", "loom.heading", { body: words(6) }),
            element("body", "loom.section", { body: words(30) }),
          ])
        ),
        [
          tally("page", { views: 5, reached: 5 }),
          tally("one", { views: 5, reached: 5 }),
          tally("two", { views: 5, reached: 0 }),
        ],
        ROLE_FOR("heading", ["loom.heading"])
      )

      const headings = roleRow(reading, "heading")

      expect(headings?.passages).toBe(2)
      expect(headings?.words).toBe(10)
      expect(headings?.wordsByStanding).toEqual({ read: 4, skipped: 0, unknown: 6 })
      expect(headings?.share).toBe(0.4)
    })

    /**
     * A band of one role inside another of the same role is where a subtree
     * figure would charge the inner words twice. Own words cannot.
     */
    it("counts a role's nested part once", () => {
      const reading = copyOf(
        treeOf(
          element("page", "loom.stack", {}, [
            element("outer", "loom.section", { body: words(10) }, [
              element("inner", "loom.section", { body: words(20) }),
            ]),
          ])
        ),
        [tally("page", { views: 1, reached: 1 })],
        ROLE_FOR("heading", ["loom.section"])
      )

      expect(roleRow(reading, "heading")?.words).toBe(30)
      expect(
        reading.roles.reduce((total, row) => total + row.words, 0)
      ).toBe(reading.words)
    })

    it("holds a row for every role in the vocabulary and one for the parts that declared none", () => {
      const reading = copyOf(treeOf(PAGE), [tally("page", { views: 1, reached: 1 })])

      expect(reading.roles.map((row) => row.role)).toEqual([...PRIMITIVE_ROLES, null])
      expect(roleRow(reading, null)?.words).toBe(40)
      expect(roleRow(reading, null)?.share).toBe(0)
    })

    it("says nothing rather than nought for a role that says no words", () => {
      const reading = copyOf(treeOf(PAGE), [tally("page", { views: 1, reached: 1 })])

      expect(roleRow(reading, "heading")?.words).toBe(0)
      expect(roleRow(reading, "heading")?.share).toBeNull()
    })
  })

  it("carries the reading's tree, revision and view floor through unchanged", () => {
    const reading = copyOf(treeOf(PAGE, 7), [tally("page", { revision: 7, views: 9, reached: 9 })])

    expect(reading.treeId).toBe(TREE)
    expect(reading.revision).toBe(7)
    expect(reading.views).toBe(9)
  })

  it("names the readers of the part each passage is on", () => {
    const reading = copyOf(treeOf(PAGE), [
      tally("page", { views: 8, reached: 8 }),
      tally("intro", { views: 8, reached: 3 }),
    ])

    expect(passageIn(reading, "intro")?.readers).toBe(3)
    expect(passageIn(reading, "pricing")?.readers).toBe(0)
  })
})

describe("describeCopySilence", () => {
  it("has a line for every silence", () => {
    for (const silence of COPY_SILENCES) {
      expect(describeCopySilence(silence)).not.toBe("")
    }
  })
})
