import { describe, expect, it } from "vitest"

import type { TreeId } from "../ids.js"
import type { JsonObject } from "../json.js"
import { nodeId, OTHER_TREE, primitiveType, RIDERS, SKIERS, TREE } from "../testing/reader-signal-contract.js"
import type { ElementNode, LoomNode } from "../tree/node.js"
import { TREE_SCHEMA_VERSION, type LoomTree } from "../tree/tree.js"

import {
  describeKindCopyChangeSilence,
  describeKindWordMovement,
  KIND_COPY_CHANGE_SILENCES,
  KIND_WORD_MOVEMENTS,
  libraryChangeOf,
  libraryCopyChangeOf,
  libraryReadingOf,
  pageReadingOf,
  type KindCopyChange,
  type LibraryCopyChange,
  type PageReading,
  type PartDeclarations,
  type ReaderTally,
} from "./index.js"

/**
 * Built on real readings rather than on hand-written rows, for the reason the
 * comparison of places it stands beside is: what is being tested is a reading
 * of what a deployment actually holds, so two trees and two windows of counters
 * go in one end of the pipeline and a kind of part's words before and after
 * come out of the other.
 */

const BODY_IS_COPY: PartDeclarations = {
  copyFor: (type) => (type === "loom.section" ? ["body"] : undefined),
  typesWithRole: () => [],
}

/** A declaration that leaves a section short of a word it can see nothing of (0122). */
const BODY_AND_A_NUMBER: PartDeclarations = {
  copyFor: (type) => (type === "loom.section" ? ["body", "count"] : undefined),
  typesWithRole: () => [],
}

/**
 * One declaration for both types, so that a node recast from one to the other
 * says the same words on both sides — which is the case a recast has to be
 * tested in and not the case where the declaration moved under it as well.
 */
const BODY_EVERYWHERE: PartDeclarations = {
  copyFor: () => ["body"],
  typesWithRole: () => [],
}

const SECTIONS_HEAD: PartDeclarations = {
  copyFor: (type) => (type === "loom.section" ? ["body"] : undefined),
  typesWithRole: (role) => (role === "heading" ? [primitiveType("loom.section")] : []),
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

/** Distinct words, so that a rewrite is a different sentence and not a shorter one. */
const words = (count: number, as = "word"): string =>
  Array.from({ length: count }, (_, at) => `${as}${at}`).join(" ")

/** Two sections, ten words and thirty, which is the shape every page below varies. */
const page = ({
  revision = 1,
  treeId = TREE,
  intro = words(10),
  pricing = words(30),
}: {
  revision?: number
  treeId?: TreeId
  intro?: string
  pricing?: string
} = {}): LoomTree =>
  treeOf(
    element("page", "loom.stack", {}, [
      element("intro", "loom.section", { body: intro }),
      element("pricing", "loom.section", { body: pricing }),
    ]),
    revision,
    treeId
  )

/**
 * One window of one page: the parts named were reached, the rest were not, and
 * the root always was — which is what gives the page its views and so makes
 * every other part's silence a skip rather than an unknown (`parts.ts`).
 */
const read = (
  tree: LoomTree,
  reached: readonly string[],
  {
    views = 10,
    declarations = BODY_IS_COPY,
  }: { views?: number; declarations?: PartDeclarations } = {}
): PageReading =>
  pageReadingOf(
    tree,
    [
      tally("page", { views, reached: views }, tree),
      ...reached.map((name) => tally(name, { views, reached: views }, tree)),
    ],
    declarations
  )

/**
 * One form of one page: the same window as {@link read}, with the audience the
 * store keeps the rows under (0284) and the reading scoped to it.
 */
const inAudience = (
  audienceId: typeof SKIERS,
  tree: LoomTree,
  reached: readonly string[],
  views = 10
): PageReading =>
  pageReadingOf(
    tree,
    [
      { ...tally("page", { views, reached: views }, tree), audienceId },
      ...reached.map((name) => ({ ...tally(name, { views, reached: views }, tree), audienceId })),
    ],
    BODY_IS_COPY,
    audienceId
  )

/** A window that measured nothing of a page, which is what makes every standing unknown. */
const unmeasured = (tree: LoomTree, declarations: PartDeclarations = BODY_IS_COPY): PageReading =>
  pageReadingOf(tree, [], declarations)

const typeRow = (change: LibraryCopyChange, type: string): KindCopyChange | undefined =>
  change.byType.find((row) => row.kind.by === "type" && row.kind.type === type)

const roleRow = (change: LibraryCopyChange, role: string | null): KindCopyChange | undefined =>
  change.byRole.find((row) => row.kind.by === "role" && row.kind.role === role)

describe("what a change did to the words a kind of part says", () => {
  /**
   * The sentence this module exists for: an author changed a component, and the
   * words it kept are read now.
   */
  it("reads the words a kind kept as the mass that was skipped and is read now", () => {
    const tree = page()

    const change = libraryCopyChangeOf([read(tree, ["intro"])], [read(tree, ["intro", "pricing"])])
    const sections = typeRow(change, "loom.section")

    expect(sections?.placements).toBe(2)
    expect(sections?.words.carried).toBe(40)
    expect(sections?.words.comparable).toBe(40)
    expect(sections?.words.keptRead).toBe(10)
    expect(sections?.words.tookUp).toBe(30)
    expect(sections?.words.fellAway).toBe(0)
    expect(sections?.words.readShareWas).toBe(0.25)
    expect(sections?.words.readShareNow).toBe(1)
    expect(sections?.words.change).toBe(30)
    expect(sections?.movement).toBe("taken-up")
    expect(change.mostTakenUp?.kind).toEqual({ by: "type", type: "loom.section" })
    expect(change.mostAbandoned).toBeNull()
  })

  it("reads a kind abandoned as the mass that was read and is skipped now", () => {
    const tree = page()

    const change = libraryCopyChangeOf([read(tree, ["intro", "pricing"])], [read(tree, ["intro"])])
    const sections = typeRow(change, "loom.section")

    expect(sections?.words.fellAway).toBe(30)
    expect(sections?.words.tookUp).toBe(0)
    expect(sections?.words.change).toBe(-30)
    expect(sections?.movement).toBe("abandoned")
    expect(change.mostAbandoned?.kind).toEqual({ by: "type", type: "loom.section" })
  })

  /**
   * The whole method in one assertion. The figure a person subtracting two
   * censuses would get is published beside the figure this module gives,
   * because the two are different numbers: the censuses are taken over two
   * different texts, and this is taken over the text both of them say.
   */
  it("takes both shares over the words both windows say, and not over each window's own", () => {
    const before = page()
    const after = page({ revision: 2, pricing: words(30, "new") })

    const was = [read(before, ["intro", "pricing"])]
    const now = [read(after, ["intro", "pricing"])]
    const change = libraryCopyChangeOf(was, now)
    const sections = typeRow(change, "loom.section")

    /* Two censuses, which is what a screen showing one window twice would hold. */
    const censusWas = libraryReadingOf(was).byType.find(
      (row) => row.kind.by === "type" && row.kind.type === "loom.section"
    )
    const censusNow = libraryReadingOf(now).byType.find(
      (row) => row.kind.by === "type" && row.kind.type === "loom.section"
    )

    expect(censusWas?.wordShare).toBe(1)
    expect(censusNow?.wordShare).toBe(1)

    /* Both censuses count forty words. The comparison counts the ten that are the same words. */
    expect(censusWas?.words).toBe(40)
    expect(sections?.words.carried).toBe(10)
    expect(sections?.rewritten).toBe(1)
    expect(sections?.rewrittenWords).toEqual({ was: 30, now: 30 })
    expect(change.republished).toBe(1)
  })

  /**
   * What the rewriting is published for. A band nine tenths rewritten has a
   * carried share about the tenth it kept, and the two numbers beside each other
   * are the only way a surface can say so.
   */
  it("keeps a rewritten placement out of every word total and counts it beside them", () => {
    const before = page({ intro: words(10), pricing: words(90) })
    const after = page({ revision: 2, intro: words(10), pricing: words(90, "new") })

    const change = libraryCopyChangeOf(
      [read(before, ["intro"])],
      [read(after, ["intro", "pricing"])]
    )
    const sections = typeRow(change, "loom.section")

    expect(sections?.placements).toBe(1)
    expect(sections?.words.carried).toBe(10)
    expect(sections?.words.keptRead).toBe(10)
    expect(sections?.rewritten).toBe(1)
    expect(sections?.rewrittenWords).toEqual({ was: 90, now: 90 })
    expect(sections?.words.readShareNow).toBe(1)
    /* Nothing of the ninety words is in the share, in either direction. */
    expect(sections?.words.carried).not.toBe(100)
    expect(sections?.gained).toBe(0)
    expect(sections?.lost).toBe(0)
  })

  it("is the difference of the two shares exactly, because the two have one denominator", () => {
    const tree = page()

    const change = libraryCopyChangeOf([read(tree, ["intro"])], [read(tree, ["pricing"])])
    const sections = typeRow(change, "loom.section")
    const was = sections?.words.readShareWas ?? 0
    const now = sections?.words.readShareNow ?? 0

    expect(now - was).toBeCloseTo((sections?.words.change ?? 0) / (sections?.words.comparable ?? 1), 12)
  })

  describe("the floor, which costs the signed figure and nothing else", () => {
    /**
     * The line 0239 drew, at the scale of a library: a single placement's
     * movement survives a floor and a signed sum over placements does not.
     */
    it("withholds the subtraction, keeps both shares, and names the floor", () => {
      const tree = treeOf(
        element("page", "loom.stack", {}, [
          element("intro", "loom.section", { body: words(5), count: 3 }),
          element("pricing", "loom.section", { body: words(20) }),
        ])
      )

      const change = libraryCopyChangeOf(
        [read(tree, ["pricing"], { declarations: BODY_AND_A_NUMBER })],
        [read(tree, ["intro"], { declarations: BODY_AND_A_NUMBER })]
      )
      const sections = typeRow(change, "loom.section")

      expect(sections?.flooredPlacements).toBe(1)
      expect(sections?.words.floored).toBe(5)
      expect(sections?.words.change).toBeNull()
      expect(sections?.movement).toBe("unknown")
      expect(sections?.silence).toBe("floored")
      /* Everything the floor cannot flip stays, including both masses. */
      expect(sections?.words.tookUp).toBe(5)
      expect(sections?.words.fellAway).toBe(20)
      expect(sections?.words.readShareWas).toBe(0.8)
      expect(sections?.words.readShareNow).toBe(0.2)
    })

    /**
     * The floor a trigger counted in words cannot see, which is the commonest
     * one there is: a part whose declared prop holds something that is not a
     * string and which says no visible word at all. Its placement hides every
     * word it has, so the signed figure is in exactly as much doubt as it is
     * for a floor with words behind it — and a row that read the floor off the
     * word total would publish *abandoned* with a hundred unseen words able to
     * reverse it.
     */
    it("names the floor where the floored placement says no visible word at all", () => {
      const tree = treeOf(
        element("page", "loom.stack", {}, [
          element("intro", "loom.section", { body: words(20) }),
          element("badge", "loom.section", { count: 3 }),
        ])
      )

      const change = libraryCopyChangeOf(
        [read(tree, ["intro"], { declarations: BODY_AND_A_NUMBER })],
        [read(tree, [], { declarations: BODY_AND_A_NUMBER })]
      )
      const sections = typeRow(change, "loom.section")

      expect(sections?.flooredPlacements).toBe(1)
      expect(sections?.words.floored).toBe(0)
      expect(sections?.silence).toBe("floored")
      expect(sections?.words.change).toBeNull()
      expect(sections?.movement).toBe("unknown")
      /* The masses that are certain stand, which is what the floor does not reach. */
      expect(sections?.words.fellAway).toBe(20)
      expect(change.words.change).toBeNull()
    })

    /**
     * Why it has to be withheld rather than published with a caveat: the
     * counted masses here say *abandoned* and the five floored words are five
     * words the reading can see of a part that may say a hundred. No figure
     * here can tell those two libraries apart, and the places comparison can
     * answer both of them — which is what the row's silence points at.
     */
    it("leaves the places answer standing, which a floor cannot reach", () => {
      const tree = treeOf(
        element("page", "loom.stack", {}, [
          element("intro", "loom.section", { body: words(5), count: 3 }),
          element("pricing", "loom.section", { body: words(20) }),
        ])
      )
      const was = [read(tree, ["pricing"], { declarations: BODY_AND_A_NUMBER })]
      const now = [read(tree, ["intro"], { declarations: BODY_AND_A_NUMBER })]

      const places = libraryChangeOf(was, now).byType.find(
        (row) => row.kind.by === "type" && row.kind.type === "loom.section"
      )

      expect(places?.tookUp).toBe(1)
      expect(places?.fellAway).toBe(1)
      expect(places?.movement).toBe("held")
      expect(places?.silence).toBeNull()
      expect(typeRow(libraryCopyChangeOf(was, now), "loom.section")?.words.change).toBeNull()
    })

    it("withholds the whole library's subtraction on the same rule, and nothing else of it", () => {
      const tree = treeOf(
        element("page", "loom.stack", {}, [
          element("intro", "loom.section", { body: words(5), count: 3 }),
        ])
      )

      const change = libraryCopyChangeOf(
        [read(tree, [], { declarations: BODY_AND_A_NUMBER })],
        [read(tree, ["intro"], { declarations: BODY_AND_A_NUMBER })]
      )

      expect(change.words.floored).toBe(5)
      expect(change.words.change).toBeNull()
      expect(change.words.tookUp).toBe(5)
      expect(change.words.readShareNow).toBe(1)
    })
  })

  describe("the silences, which are five reasons and not one", () => {
    it("says a role nothing in the library plays is unplaced", () => {
      const tree = page()
      const change = libraryCopyChangeOf([read(tree, ["intro"])], [read(tree, ["intro"])])

      expect(roleRow(change, "heading")?.silence).toBe("unplaced")
      expect(roleRow(change, "heading")?.placements).toBe(0)
      expect(roleRow(change, null)?.silence).not.toBe("unplaced")
    })

    it("says a kind whose every word was rewritten kept nothing to compare", () => {
      const before = page()
      const after = page({ revision: 2, intro: words(10, "new"), pricing: words(30, "new") })

      const change = libraryCopyChangeOf([read(before, ["intro"])], [read(after, ["intro"])])
      const sections = typeRow(change, "loom.section")

      expect(sections?.placements).toBe(0)
      expect(sections?.rewritten).toBe(2)
      expect(sections?.silence).toBe("unpaired")
      expect(sections?.movement).toBe("unknown")
      expect(sections?.words.readShareNow).toBeNull()
    })

    /**
     * A placement is kept where it says something on one side or **hides**
     * something on one side (0122), so a row can hold places whose visible
     * words are none. That is a floor and not an absence, and `wordless` is the
     * one answer that says so.
     */
    it("says a kind that keeps only places it can see no words of is wordless", () => {
      const tree = treeOf(
        element("page", "loom.stack", {}, [
          element("quote", "loom.quote", { body: "a line somebody wrote" }),
        ])
      )

      const change = libraryCopyChangeOf([read(tree, ["quote"])], [read(tree, ["quote"])])
      const quotes = typeRow(change, "loom.quote")

      expect(quotes?.placements).toBe(1)
      expect(quotes?.flooredPlacements).toBe(1)
      expect(quotes?.words.carried).toBe(0)
      expect(quotes?.silence).toBe("wordless")
    })

    it("says a kind whose carried words one window cannot speak for is unread", () => {
      const tree = page()

      const change = libraryCopyChangeOf([read(tree, ["intro"])], [unmeasured(tree)])
      const sections = typeRow(change, "loom.section")

      expect(sections?.words.carried).toBe(40)
      expect(sections?.words.unspoken).toBe(40)
      expect(sections?.words.comparable).toBe(0)
      expect(sections?.words.readShareWas).toBeNull()
      expect(sections?.silence).toBe("unread")
    })

    it("describes every silence and every movement, and never twice the same way", () => {
      const silences = KIND_COPY_CHANGE_SILENCES.map(describeKindCopyChangeSilence)
      const movements = KIND_WORD_MOVEMENTS.map(describeKindWordMovement)

      expect(silences.every((line) => line.length > 0)).toBe(true)
      expect(new Set(silences).size).toBe(KIND_COPY_CHANGE_SILENCES.length)
      expect(new Set(movements).size).toBe(KIND_WORD_MOVEMENTS.length)
    })

    it("keeps a kind nobody read apart from a kind that kept no word", () => {
      const tree = page()
      const quiet = libraryCopyChangeOf([read(tree, [])], [read(tree, [])])

      expect(typeRow(quiet, "loom.section")?.movement).toBe("still-unread")
      expect(typeRow(quiet, "loom.section")?.silence).toBeNull()
    })
  })

  describe("the two keys, which answer differently about one change", () => {
    it("reads a recast node as words one type lost and another took, and holds it still by role", () => {
      const before = treeOf(
        element("page", "loom.stack", {}, [element("band", "loom.section", { body: words(12) })])
      )
      const after = treeOf(
        element("page", "loom.stack", {}, [element("band", "loom.quote", { body: words(12) })]),
        2
      )

      const change = libraryCopyChangeOf(
        [read(before, ["band"], { declarations: BODY_EVERYWHERE })],
        [read(after, ["band"], { declarations: BODY_EVERYWHERE })]
      )

      expect(change.recast).toBe(1)
      expect(typeRow(change, "loom.section")?.placements).toBe(0)
      expect(typeRow(change, "loom.section")?.wordsLost).toBe(12)
      expect(typeRow(change, "loom.section")?.wordsLostRead).toBe(12)
      expect(typeRow(change, "loom.quote")?.wordsGained).toBe(12)
      expect(typeRow(change, "loom.quote")?.wordsGainedRead).toBe(12)
      /* To a reader it is the same place still standing, and the role row says so. */
      expect(roleRow(change, null)?.placements).toBe(1)
      expect(roleRow(change, null)?.words.carried).toBe(12)
    })

    it("disagrees about the role of a type the two windows join differently, and says so", () => {
      const tree = page()

      const change = libraryCopyChangeOf(
        [read(tree, ["intro"])],
        [read(tree, ["intro"], { declarations: SECTIONS_HEAD })]
      )

      expect(change.roleDisagreed).toEqual([primitiveType("loom.section")])
    })
  })

  describe("the whole library, which is the one total a reading of a library has", () => {
    /**
     * What words buy and places cannot. A figure over every kind at once counts
     * a page once per element node and is refused everywhere else (0257); a
     * part's own words partition its page exactly once, so these rows add.
     */
    it("adds the type rows to the library's own carried words, counting no word twice", () => {
      const first = page()
      const second = page({ treeId: OTHER_TREE })

      const change = libraryCopyChangeOf(
        [read(first, ["intro"]), read(second, ["pricing"])],
        [read(first, ["intro", "pricing"]), read(second, ["pricing"])]
      )
      const carried = change.byType.reduce((total, row) => total + row.words.carried, 0)
      const read30 = change.byType.reduce((total, row) => total + row.words.keptRead, 0)

      expect(change.words.carried).toBe(80)
      expect(carried).toBe(80)
      expect(read30).toBe(change.words.keptRead)
      expect(change.pages).toBe(2)
    })

    it("adds the role rows to the same total where nothing was recast", () => {
      const tree = page()
      const change = libraryCopyChangeOf([read(tree, ["intro"])], [read(tree, ["intro"])])

      expect(change.byRole.reduce((total, row) => total + row.words.carried, 0)).toBe(
        change.words.carried
      )
    })

    /**
     * And the one case where the two keys cannot both be the total, which is why
     * the total follows the types: a recast node is a place one type left and
     * another took, and the same node is a place still standing to a reader.
     */
    it("follows the types where a recast makes the two keys disagree", () => {
      const before = treeOf(
        element("page", "loom.stack", {}, [element("band", "loom.section", { body: words(12) })])
      )
      const after = treeOf(
        element("page", "loom.stack", {}, [element("band", "loom.quote", { body: words(12) })]),
        2
      )

      const change = libraryCopyChangeOf(
        [read(before, ["band"], { declarations: BODY_EVERYWHERE })],
        [read(after, ["band"], { declarations: BODY_EVERYWHERE })]
      )

      expect(change.words.carried).toBe(0)
      expect(change.byType.reduce((total, row) => total + row.words.carried, 0)).toBe(0)
      expect(change.byRole.reduce((total, row) => total + row.words.carried, 0)).toBe(12)
    })

    it("publishes both windows' view floors, which every transition here is confounded by", () => {
      const tree = page()

      const change = libraryCopyChangeOf(
        [read(tree, ["intro"], { views: 4 })],
        [read(tree, ["intro", "pricing"], { views: 40 })]
      )

      expect(change.viewsWas).toBe(4)
      expect(change.viewsNow).toBe(40)
    })
  })

  describe("the places that changed hands", () => {
    it("counts the words of a page the library gained, and the mass of them read", () => {
      const first = page()
      const second = page({ treeId: OTHER_TREE })

      const change = libraryCopyChangeOf(
        [read(first, ["intro"])],
        [read(first, ["intro"]), read(second, ["intro"])]
      )
      const sections = typeRow(change, "loom.section")

      expect(change.pagesGained).toBe(1)
      expect(sections?.gained).toBe(2)
      expect(sections?.wordsGained).toBe(40)
      expect(sections?.wordsGainedRead).toBe(10)
      expect(change.wordsGained).toBe(40)
      expect(change.wordsGainedRead).toBe(10)
    })

    /** The sentence that says a change was right, which is the half worth having on its own. */
    it("counts the words a change took away and the mass of them nobody had reached", () => {
      const before = page()
      const after = treeOf(
        element("page", "loom.stack", {}, [element("intro", "loom.section", { body: words(10) })]),
        2
      )

      const change = libraryCopyChangeOf([read(before, ["intro"])], [read(after, ["intro"])])
      const sections = typeRow(change, "loom.section")

      expect(sections?.lost).toBe(1)
      expect(sections?.wordsLost).toBe(30)
      expect(sections?.wordsLostRead).toBe(0)
      expect(change.wordsLost).toBe(30)
      expect(change.pagesLost).toBe(0)
    })
  })

  /**
   * The kind to look at first is the one whose words lost their reading, and not
   * the one with the worst rate: a label that lost its only word is a perfect
   * rate and a smaller problem than a band that lost two hundred (0221, 0257).
   */
  it("leads with the mass of words that fell away rather than with the worse share", () => {
    const tree = treeOf(
      element("page", "loom.stack", {}, [
        element("label", "loom.badge-text", { body: words(4) }),
        element("band", "loom.section", { body: words(200) }),
      ])
    )
    const declarations: PartDeclarations = {
      copyFor: () => ["body"],
      typesWithRole: () => [],
    }

    const change = libraryCopyChangeOf(
      [read(tree, ["label", "band"], { declarations })],
      [read(tree, [], { declarations })]
    )

    expect(typeRow(change, "loom.badge-text")?.words.readShareNow).toBe(0)
    expect(typeRow(change, "loom.section")?.words.readShareNow).toBe(0)
    expect(change.mostAbandoned?.kind).toEqual({ by: "type", type: "loom.section" })
    expect(change.mostAbandoned?.words.fellAway).toBe(200)
  })

  it("reverses every movement where the caller holds the two windows backwards", () => {
    const tree = page()
    const quiet = read(tree, ["intro"])
    const busy = read(tree, ["intro", "pricing"])

    expect(typeRow(libraryCopyChangeOf([quiet], [busy]), "loom.section")?.words.change).toBe(30)
    expect(typeRow(libraryCopyChangeOf([busy], [quiet]), "loom.section")?.words.change).toBe(-30)
  })

  /**
   * 0158's rule is that counting a window and forgetting it are one operation,
   * so every count here is tested against the case where it would double.
   */
  describe("the double counts, which are the five shapes a word can be counted twice in", () => {
    it("drops a reading handed in twice and leaves every figure where it was", () => {
      const tree = page()
      const once = libraryCopyChangeOf([read(tree, ["intro"])], [read(tree, ["intro", "pricing"])])
      const twice = libraryCopyChangeOf(
        [read(tree, ["intro"]), read(tree, ["intro"])],
        [read(tree, ["intro", "pricing"])]
      )

      expect(twice.duplicated).toBe(1)
      expect(once.duplicated).toBe(0)
      expect(typeRow(twice, "loom.section")).toEqual(typeRow(once, "loom.section"))
      expect(twice.words).toEqual(once.words)
    })

    /**
     * This module spelled the pairing itself until 0293 — a second copy of a
     * rule published with a comment saying why there should not be one — and
     * both copies keyed a paired page by its tree, so two forms of a page
     * (0263) were one key and the second form's words were dropped as the
     * first's handed in twice.
     */
    it("pairs two forms of one page as two pages, and reports no double count", () => {
      const tree = page()
      const change = libraryCopyChangeOf(
        [inAudience(SKIERS, tree, ["intro"]), inAudience(RIDERS, tree, ["intro"])],
        [
          inAudience(SKIERS, tree, ["intro", "pricing"]),
          inAudience(RIDERS, tree, ["intro", "pricing"]),
        ]
      )

      expect(change.duplicated).toBe(0)
      expect(change.ambiguous).toEqual([])
      expect(change.pages).toBe(2)
      expect(typeRow(change, "loom.section")?.placements).toBe(4)
      expect(typeRow(change, "loom.section")?.words.carried).toBe(80)
    })

    /** The other side of the narrowing: the same form twice is still a double count. */
    it("still drops one form handed in twice, with the other form standing", () => {
      const tree = page()
      const change = libraryCopyChangeOf(
        [
          inAudience(SKIERS, tree, ["intro"]),
          inAudience(SKIERS, tree, ["intro"]),
          inAudience(RIDERS, tree, ["intro"]),
        ],
        [
          inAudience(SKIERS, tree, ["intro", "pricing"]),
          inAudience(RIDERS, tree, ["intro", "pricing"]),
        ]
      )

      expect(change.duplicated).toBe(1)
      expect(change.pages).toBe(2)
      expect(typeRow(change, "loom.section")?.placements).toBe(4)
      expect(typeRow(change, "loom.section")?.words.carried).toBe(80)
    })

    /**
     * A form held at two revisions says nothing about the other form, which a
     * list of trees could not express: before 0293 both were excluded from
     * every row and every total, and the exclusion named a page rather than the
     * form of it that was ambiguous.
     */
    it("excludes the ambiguous form alone and names which form it was", () => {
      const tree = page()
      const change = libraryCopyChangeOf(
        [
          inAudience(SKIERS, tree, ["intro"]),
          inAudience(SKIERS, page({ revision: 2 }), ["intro"]),
          inAudience(RIDERS, tree, ["intro"]),
        ],
        [inAudience(RIDERS, tree, ["intro", "pricing"])]
      )

      expect(change.ambiguous).toEqual([{ treeId: TREE, audienceId: SKIERS }])
      expect(change.pages).toBe(1)
      expect(typeRow(change, "loom.section")?.placements).toBe(2)
    })

    it("excludes a form held at two revisions in one window and names it", () => {
      const tree = page()
      const change = libraryCopyChangeOf(
        [read(tree, ["intro"]), read(page({ revision: 2 }), ["intro"])],
        [read(page({ revision: 2 }), ["intro"])]
      )

      expect(change.ambiguous).toEqual([{ treeId: TREE, audienceId: null }])
      expect(change.pages).toBe(0)
      expect(change.words.carried).toBe(0)
      expect(change.duplicated).toBe(0)
    })

    it("counts a page bearing three placements of one kind three times in the kind and once in the library", () => {
      const tree = treeOf(
        element("page", "loom.stack", {}, [
          element("one", "loom.section", { body: words(5) }),
          element("two", "loom.section", { body: words(6) }),
          element("three", "loom.section", { body: words(7) }),
        ])
      )

      const change = libraryCopyChangeOf([read(tree, ["one"])], [read(tree, ["one", "two"])])
      const sections = typeRow(change, "loom.section")

      expect(sections?.placements).toBe(3)
      expect(sections?.words.carried).toBe(18)
      expect(change.words.carried).toBe(18)
      expect(change.placements).toBe(3)
    })

    /**
     * A kind standing inside itself, which is the thing it is rather than
     * something to guard against: a part's words are its own and never its
     * subtree's, so the two depths are two different sentences (0212).
     */
    it("counts a kind standing inside itself at both depths and neither one twice", () => {
      const tree = treeOf(
        element("page", "loom.stack", {}, [
          element("outer", "loom.section", { body: words(8) }, [
            element("inner", "loom.section", { body: words(3) }),
          ]),
        ])
      )

      const change = libraryCopyChangeOf([read(tree, ["outer"])], [read(tree, ["outer", "inner"])])
      const sections = typeRow(change, "loom.section")

      expect(sections?.placements).toBe(2)
      expect(sections?.words.carried).toBe(11)
      expect(sections?.words.keptRead).toBe(8)
      expect(sections?.words.tookUp).toBe(3)
    })

    it("counts a rewritten placement once in the rewriting and not at all in the carried words", () => {
      const before = page()
      const after = page({ revision: 2, pricing: words(30, "new") })

      const change = libraryCopyChangeOf(
        [read(before, ["intro", "pricing"])],
        [read(after, ["intro", "pricing"])]
      )

      expect(change.rewritten).toBe(1)
      expect(change.words.carried).toBe(10)
      expect(change.placements).toBe(1)
      expect(change.gained).toBe(0)
      expect(change.lost).toBe(0)
    })
  })
})

