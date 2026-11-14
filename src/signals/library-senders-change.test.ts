import { describe, expect, it } from "vitest"

import type { TreeId } from "../ids.js"
import type { JsonObject } from "../json.js"
import { PRIMITIVE_ROLES } from "../role.js"
import { nodeId, OTHER_TREE, primitiveType, TREE } from "../testing/reader-signal-contract.js"
import type { ElementNode, LoomNode } from "../tree/node.js"
import { TREE_SCHEMA_VERSION, type LoomTree } from "../tree/tree.js"

import {
  describeSenderFixSilence,
  describeSenderMovement,
  librarySendersChangeOf,
  librarySendersOf,
  pageReadingOf,
  SENDER_FIX_SILENCES,
  SENDER_MOVEMENTS,
  SILENCED_EXAMPLES,
  type KindSenderChange,
  type LibrarySendersChange,
  type PageReading,
  type PartDeclarations,
  type ReaderTally,
} from "./index.js"

/**
 * Built on real readings, like the census this compares two of: a tree and a
 * window's counters go in one end and a verdict about a component's senders
 * comes out of the other, so no fixture can assert a state the pipeline could
 * not produce.
 *
 * The subject is the defect 0382 named — a part that said nothing with a reader
 * below it — so every page here is built to hold one or to be plainly free of
 * one, and never by accident.
 */

const NO_DECLARATIONS: PartDeclarations = {
  copyFor: () => undefined,
  typesWithRole: () => [],
}

/** A registry in which the band is the thing that plays a heading. */
const BANDS_HEAD: PartDeclarations = {
  copyFor: () => undefined,
  typesWithRole: (role) => (role === "heading" ? [primitiveType("loom.band")] : []),
}

const element = (
  name: string,
  type: string,
  children: readonly LoomNode[] = [],
  props: JsonObject = {}
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

/** A reader reached it, which is what makes a part `read`. */
const reached = (name: string, tree: LoomTree): ReaderTally =>
  tally(name, { views: 4, reached: 4 }, tree)

/** It reported something that was not a view, which is what makes a part `unknown`. */
const acted = (name: string, tree: LoomTree): ReaderTally =>
  tally(name, { views: 4, reached: 0, activations: 2 }, tree)

/**
 * A stack holding a band holding a heading: something that can be silent, with
 * something under it that can witness it.
 */
const page = ({ revision = 1, treeId = TREE }: { revision?: number; treeId?: TreeId } = {}) =>
  treeOf(
    element("page", "loom.stack", [
      element("band", "loom.band", [element("heading", "loom.section")]),
    ]),
    revision,
    treeId
  )

const readingOf = (
  tree: LoomTree,
  counters: readonly ReaderTally[],
  declarations: PartDeclarations = NO_DECLARATIONS
): PageReading => pageReadingOf(tree, counters, declarations)

/** The band is silent: the heading below it reported reach and the band said nothing. */
const silentBand = (tree: LoomTree): PageReading =>
  readingOf(tree, [reached("page", tree), reached("heading", tree)])

/** Every part of the page reported itself. */
const soundPage = (tree: LoomTree): PageReading =>
  readingOf(tree, [reached("page", tree), reached("band", tree), reached("heading", tree)])

const typeRow = (change: LibrarySendersChange, type: string): KindSenderChange | undefined =>
  change.byType.find((row) => row.kind.by === "type" && row.kind.type === type)

const roleRow = (change: LibrarySendersChange, role: string | null): KindSenderChange | undefined =>
  change.byRole.find((row) => row.kind.by === "role" && row.kind.role === role)

describe("what fixing a silent component was worth", () => {
  it("counts the places a fix recovered, and names the component it was", () => {
    const tree = page()
    const other = page({ treeId: OTHER_TREE })
    const change = librarySendersChangeOf(
      [silentBand(tree), silentBand(other)],
      [soundPage(tree), soundPage(other)]
    )

    expect(typeRow(change, "loom.band")).toMatchObject({
      checkable: 2,
      comparable: 2,
      repaired: 2,
      wentSilent: 0,
      keptSilent: 0,
      keptReporting: 0,
      silentShareWas: 1,
      silentShareNow: 0,
      movement: "repaired",
      silence: null,
      repairedTrees: 2,
    })
    expect(change.repaired).toBe(2)
    expect(change.mostRepaired?.kind).toEqual({ by: "type", type: primitiveType("loom.band") })
    expect(change.mostSilenced).toBeNull()
  })

  it("counts the places a release silenced, which a census of the later window cannot see", () => {
    const tree = page()
    const change = librarySendersChangeOf([soundPage(tree)], [silentBand(tree)])

    expect(typeRow(change, "loom.band")).toMatchObject({
      repaired: 0,
      wentSilent: 1,
      silentShareWas: 0,
      silentShareNow: 1,
      movement: "regressed",
      silencedTrees: 1,
      silencedExamples: [nodeId("band")],
    })
    expect(change.wentSilent).toBe(1)
    expect(change.mostSilenced?.kind).toEqual({ by: "type", type: primitiveType("loom.band") })
    expect(librarySendersOf([silentBand(tree)]).silent).toBe(1)
  })

  it("says a component nothing reached is still silent rather than held", () => {
    const tree = page()
    const change = librarySendersChangeOf([silentBand(tree)], [silentBand(tree)])

    expect(typeRow(change, "loom.band")).toMatchObject({
      comparable: 1,
      keptSilent: 1,
      keptReporting: 0,
      movement: "still-silent",
    })
  })

  it("holds a component whose senders worked all along, and asks nobody to do anything", () => {
    const tree = page()
    const change = librarySendersChangeOf([soundPage(tree)], [soundPage(tree)])

    expect(typeRow(change, "loom.band")).toMatchObject({
      comparable: 1,
      keptReporting: 1,
      silentShareWas: 0,
      silentShareNow: 0,
      movement: "held",
    })
  })

  it("holds two places trading places, with both counts published", () => {
    const tree = treeOf(
      element("page", "loom.stack", [
        element("one", "loom.band", [element("a", "loom.section")]),
        element("two", "loom.band", [element("b", "loom.section")]),
      ])
    )
    const change = librarySendersChangeOf(
      [readingOf(tree, [reached("page", tree), reached("one", tree), reached("a", tree), reached("b", tree)])],
      [readingOf(tree, [reached("page", tree), reached("two", tree), reached("a", tree), reached("b", tree)])]
    )

    expect(typeRow(change, "loom.band")).toMatchObject({
      comparable: 2,
      repaired: 1,
      wentSilent: 1,
      movement: "held",
      silentShareWas: 0.5,
      silentShareNow: 0.5,
    })
  })
})

describe("the population is the places the defect could be seen on in both windows", () => {
  /**
   * The mutation this kills is the one that would have been easy to ship: a
   * denominator of the places checkable **now**. The band was under nobody in
   * the earlier window, so it had no state to be silent in; counting it today
   * would publish a repair for a window that merely got busier.
   */
  it("refuses a place nothing was under in the earlier window, however busy the later one is", () => {
    const tree = page()
    const change = librarySendersChangeOf(
      [readingOf(tree, [reached("page", tree)])],
      [soundPage(tree)]
    )

    expect(typeRow(change, "loom.band")).toMatchObject({
      places: 1,
      checkableWas: 0,
      checkableNow: 1,
      checkable: 0,
      comparable: 0,
      repaired: 0,
      silentShareWas: null,
      silentShareNow: null,
      movement: "unknown",
      silence: "uncheckable",
    })
    expect(change.repaired).toBe(0)
  })

  it("refuses a place the later window stopped being able to check", () => {
    const tree = page()
    const change = librarySendersChangeOf(
      [soundPage(tree)],
      [readingOf(tree, [reached("page", tree)])]
    )

    expect(typeRow(change, "loom.band")).toMatchObject({
      checkableWas: 1,
      checkableNow: 0,
      checkable: 0,
      silence: "uncheckable",
    })
  })

  it("keeps a leaf out of the population in both windows", () => {
    const tree = page()
    const change = librarySendersChangeOf([soundPage(tree)], [soundPage(tree)])

    expect(typeRow(change, "loom.section")).toMatchObject({
      places: 1,
      checkableWas: 0,
      checkableNow: 0,
      checkable: 0,
      silence: "uncheckable",
    })
  })

  it("divides by the places checkable in both and never by the places the kind stands", () => {
    const tree = treeOf(
      element("page", "loom.stack", [
        element("one", "loom.band", [element("a", "loom.section")]),
        element("two", "loom.band"),
        element("three", "loom.band"),
      ])
    )
    const before = readingOf(tree, [reached("page", tree), reached("a", tree)])
    const after = readingOf(tree, [reached("page", tree), reached("one", tree), reached("a", tree)])
    const row = typeRow(librarySendersChangeOf([before], [after]), "loom.band")

    expect(row).toMatchObject({ places: 3, checkable: 1, comparable: 1, repaired: 1 })
    expect(row?.silentShareWas).toBe(1)
    expect(row?.silentShareWas).not.toBe(1 / 3)
  })
})

describe("an unclaimed side makes the transition unclaimable", () => {
  it("claims no repair where the earlier window reported something that was not a view", () => {
    const tree = page()
    const change = librarySendersChangeOf(
      [readingOf(tree, [reached("page", tree), acted("band", tree), reached("heading", tree)])],
      [soundPage(tree)]
    )

    expect(typeRow(change, "loom.band")).toMatchObject({
      checkable: 1,
      indeterminate: 1,
      comparable: 0,
      repaired: 0,
      silentShareWas: null,
      movement: "unknown",
      silence: "unclaimable",
    })
    expect(change.indeterminate).toBe(1)
    expect(change.repaired).toBe(0)
  })

  it("claims no regression where the later window reported something that was not a view", () => {
    const tree = page()
    const change = librarySendersChangeOf(
      [soundPage(tree)],
      [readingOf(tree, [reached("page", tree), acted("band", tree), reached("heading", tree)])]
    )

    expect(typeRow(change, "loom.band")).toMatchObject({
      indeterminate: 1,
      comparable: 0,
      wentSilent: 0,
      silence: "unclaimable",
    })
  })

  it("compares the places that are claimed beside the ones that are not", () => {
    const tree = treeOf(
      element("page", "loom.stack", [
        element("one", "loom.band", [element("a", "loom.section")]),
        element("two", "loom.band", [element("b", "loom.section")]),
      ])
    )
    const before = readingOf(tree, [
      reached("page", tree),
      acted("one", tree),
      reached("a", tree),
      reached("b", tree),
    ])
    const after = readingOf(tree, [
      reached("page", tree),
      acted("one", tree),
      reached("two", tree),
      reached("a", tree),
      reached("b", tree),
    ])

    expect(typeRow(librarySendersChangeOf([before], [after]), "loom.band")).toMatchObject({
      checkable: 2,
      indeterminate: 1,
      comparable: 1,
      repaired: 1,
      movement: "repaired",
      silence: null,
    })
  })
})

describe("the places are held still before anything is read", () => {
  it("counts a page only the later window holds as gained and in no transition", () => {
    const tree = page()
    const other = page({ treeId: OTHER_TREE })
    const change = librarySendersChangeOf([silentBand(tree)], [silentBand(tree), soundPage(other)])

    expect(change.pagesGained).toBe(1)
    expect(change.pagesLost).toBe(0)
    expect(typeRow(change, "loom.band")).toMatchObject({
      places: 1,
      gained: 1,
      lost: 0,
      comparable: 1,
      keptSilent: 1,
      repaired: 0,
    })
  })

  it("counts a page only the earlier window holds as lost and in no transition", () => {
    const tree = page()
    const other = page({ treeId: OTHER_TREE })
    const change = librarySendersChangeOf([silentBand(tree), silentBand(other)], [soundPage(tree)])

    expect(change.pagesLost).toBe(1)
    expect(typeRow(change, "loom.band")).toMatchObject({ places: 1, lost: 1, repaired: 1 })
  })

  it("says a kind whose every place moved is unpaired rather than unread", () => {
    const before = treeOf(element("page", "loom.stack", [element("old", "loom.band", [element("a", "loom.section")])]))
    const after = treeOf(
      element("page", "loom.stack", [element("new", "loom.band", [element("b", "loom.section")])]),
      2
    )
    const change = librarySendersChangeOf(
      [readingOf(before, [reached("page", before), reached("a", before)])],
      [readingOf(after, [reached("page", after), reached("b", after)])]
    )

    expect(typeRow(change, "loom.band")).toMatchObject({
      places: 0,
      gained: 1,
      lost: 1,
      silence: "unpaired",
      movement: "unknown",
    })
    expect(change.republished).toBe(1)
  })

  it("reads a node whose type changed as a place one kind left and another took", () => {
    const before = treeOf(
      element("page", "loom.stack", [element("part", "loom.band", [element("a", "loom.section")])])
    )
    const after = treeOf(
      element("page", "loom.stack", [element("part", "loom.card", [element("a", "loom.section")])]),
      2
    )
    const change = librarySendersChangeOf(
      [readingOf(before, [reached("page", before), reached("a", before)])],
      [readingOf(after, [reached("page", after), reached("part", after), reached("a", after)])]
    )

    expect(change.recast).toBe(1)
    expect(typeRow(change, "loom.band")).toMatchObject({ places: 0, lost: 1, silence: "unpaired" })
    expect(typeRow(change, "loom.card")).toMatchObject({ places: 0, gained: 1 })
    /** The role rows hold it still: to a reader it is the same place, still standing. */
    expect(roleRow(change, null)).toMatchObject({ repaired: 1 })
  })

  it("refuses to hold a place still in the role rows where the two windows disagree about its role", () => {
    const tree = page()
    const change = librarySendersChangeOf(
      [readingOf(tree, [reached("page", tree), reached("heading", tree)], BANDS_HEAD)],
      [readingOf(tree, [reached("page", tree), reached("band", tree), reached("heading", tree)])]
    )

    /** The type row still holds it: the node is a band on both sides. */
    expect(typeRow(change, "loom.band")).toMatchObject({ places: 1, repaired: 1 })
    /** The role rows do not, because the place plays a different part on each side. */
    expect(roleRow(change, "heading")).toMatchObject({ places: 0, lost: 1, silence: "unpaired" })
    expect(roleRow(change, null)).toMatchObject({ gained: 1, repaired: 0 })
    expect(change.roleDisagreed).toEqual([primitiveType("loom.band")])
  })

  it("says a role nothing in the library plays is unplaced rather than leaving the row out", () => {
    const tree = page()
    const change = librarySendersChangeOf([silentBand(tree)], [soundPage(tree)])

    expect(change.byRole).toHaveLength(PRIMITIVE_ROLES.length + 1)
    expect(roleRow(change, "heading")).toMatchObject({
      places: 0,
      silence: "unplaced",
      movement: "unknown",
    })
  })

  it("excludes a form held at two revisions in one window and names it", () => {
    const tree = page()
    const change = librarySendersChangeOf(
      [silentBand(tree), silentBand(page({ revision: 2 }))],
      [soundPage(tree)]
    )

    expect(change.ambiguous).toHaveLength(1)
    expect(change.pages).toBe(0)
    expect(change.repaired).toBe(0)
  })
})

describe("a page handed in twice is folded once", () => {
  it("reports the drop and changes no figure", () => {
    const tree = page()
    const other = page({ treeId: OTHER_TREE })
    const once = librarySendersChangeOf(
      [silentBand(tree), silentBand(other)],
      [soundPage(tree), soundPage(other)]
    )
    const twice = librarySendersChangeOf(
      [silentBand(tree), silentBand(other), silentBand(tree)],
      [soundPage(tree), soundPage(other), soundPage(other)]
    )

    expect(twice.duplicated).toBe(2)
    expect(once.duplicated).toBe(0)

    for (const figure of [
      "pages",
      "placements",
      "checkable",
      "comparable",
      "repaired",
      "wentSilent",
      "keptSilent",
      "keptReporting",
      "indeterminate",
      "viewsWas",
      "viewsNow",
    ] as const) {
      expect(twice[figure]).toBe(once[figure])
    }

    expect(typeRow(twice, "loom.band")).toMatchObject({ repaired: 2, repairedTrees: 2 })
  })
})

describe("two readings of one window reproduce the census", () => {
  /**
   * The guard against the two spellings of 0382's rule drifting apart. Every
   * placement is paired, so the comparison's population is the census's
   * witnessed placements and its `keptSilent` is the census's `silent`, term for
   * term.
   */
  it("agrees with it term for term", () => {
    const tree = page()
    const other = treeOf(
      element("page", "loom.stack", [
        element("one", "loom.band", [element("a", "loom.section")]),
        element("two", "loom.band", [element("b", "loom.section")]),
      ]),
      1,
      OTHER_TREE
    )
    const readings = [
      silentBand(tree),
      readingOf(other, [
        reached("page", other),
        acted("one", other),
        reached("a", other),
        reached("b", other),
      ]),
    ]
    const census = librarySendersOf(readings)
    const change = librarySendersChangeOf(readings, readings)

    expect(change.checkable).toBe(census.witnessed)
    expect(change.keptSilent).toBe(census.silent)
    expect(change.indeterminate).toBe(census.indeterminate)
    expect(change.repaired).toBe(0)
    expect(change.wentSilent).toBe(0)
    expect(change.placements).toBe(census.placements)

    for (const row of change.byType) {
      const same = census.byType.find((other) => other.kind.by === "type" && row.kind.by === "type" && other.kind.type === row.kind.type)

      expect(row.keptSilent).toBe(same?.silent)
      expect(row.checkable).toBe(same?.witnessed)
    }
  })
})

describe("the rows a surface reads", () => {
  it("adds the four transitions to the comparable places, and those to the checkable ones", () => {
    const tree = page()
    const other = page({ treeId: OTHER_TREE })
    const change = librarySendersChangeOf(
      [silentBand(tree), readingOf(other, [reached("page", other), acted("band", other), reached("heading", other)])],
      [soundPage(tree), soundPage(other)]
    )

    for (const row of [...change.byType, ...change.byRole]) {
      expect(row.repaired + row.wentSilent + row.keptSilent + row.keptReporting).toBe(row.comparable)
      expect(row.comparable + row.indeterminate).toBe(row.checkable)
      expect(row.checkable).toBeLessThanOrEqual(Math.min(row.checkableWas, row.checkableNow))
    }
  })

  it("counts the pages a fix recovered a component on, and not the places", () => {
    const tree = treeOf(
      element("page", "loom.stack", [
        element("one", "loom.band", [element("a", "loom.section")]),
        element("two", "loom.band", [element("b", "loom.section")]),
      ])
    )
    const before = readingOf(tree, [reached("page", tree), reached("a", tree), reached("b", tree)])
    const after = readingOf(tree, [
      reached("page", tree),
      reached("one", tree),
      reached("two", tree),
      reached("a", tree),
      reached("b", tree),
    ])

    /** Two places repaired, one page to look at: the figure the fault cannot give. */
    expect(typeRow(librarySendersChangeOf([before], [after]), "loom.band")).toMatchObject({
      repaired: 2,
      repairedTrees: 1,
    })
  })

  it("ranks by the places gone silent and never by the share", () => {
    const tree = treeOf(
      element("page", "loom.stack", [
        element("one", "loom.band", [element("a", "loom.section")]),
        element("two", "loom.band", [element("b", "loom.section")]),
        element("three", "loom.band", [element("c", "loom.section")]),
        element("four", "loom.band", [element("d", "loom.section")]),
        element("five", "loom.card", [element("e", "loom.section")]),
      ])
    )
    const leaves = ["a", "b", "c", "d", "e"].map((name) => reached(name, tree))
    const before = readingOf(tree, [
      reached("page", tree),
      ...["one", "two", "three", "four", "five"].map((name) => reached(name, tree)),
      ...leaves,
    ])
    const after = readingOf(tree, [
      reached("page", tree),
      ...["three", "four"].map((name) => reached(name, tree)),
      ...leaves,
    ])
    const change = librarySendersChangeOf([before], [after])

    /**
     * The band lost two of its four places and the card its one and only, so
     * the card has the worse **share** and the band is the component to fix.
     */
    expect(typeRow(change, "loom.band")).toMatchObject({ wentSilent: 2, silentShareNow: 0.5 })
    expect(typeRow(change, "loom.card")).toMatchObject({ wentSilent: 1, silentShareNow: 1 })
    expect(change.byType[0]?.kind).toEqual({ by: "type", type: primitiveType("loom.band") })
    expect(change.mostSilenced?.wentSilent).toBe(2)
  })

  it("caps the newly silent examples", () => {
    const tree = treeOf(
      element(
        "page",
        "loom.stack",
        Array.from({ length: SILENCED_EXAMPLES + 2 }, (_, at) =>
          element(`band${at}`, "loom.band", [element(`leaf${at}`, "loom.section")])
        )
      )
    )
    const leaves = Array.from({ length: SILENCED_EXAMPLES + 2 }, (_, at) =>
      reached(`leaf${at}`, tree)
    )
    const bands = Array.from({ length: SILENCED_EXAMPLES + 2 }, (_, at) =>
      reached(`band${at}`, tree)
    )
    const change = librarySendersChangeOf(
      [readingOf(tree, [reached("page", tree), ...bands, ...leaves])],
      [readingOf(tree, [reached("page", tree), ...leaves])]
    )

    expect(typeRow(change, "loom.band")?.wentSilent).toBe(SILENCED_EXAMPLES + 2)
    expect(typeRow(change, "loom.band")?.silencedExamples).toHaveLength(SILENCED_EXAMPLES)
  })

  it("carries both windows' page views, because every transition is confounded by them", () => {
    const tree = page()
    const change = librarySendersChangeOf([silentBand(tree)], [soundPage(tree)])

    expect(change.viewsWas).toBe(4)
    expect(change.viewsNow).toBe(4)
  })

  it("says every movement and every silence in words", () => {
    for (const movement of SENDER_MOVEMENTS) expect(describeSenderMovement(movement)).not.toBe("")
    for (const silence of SENDER_FIX_SILENCES) expect(describeSenderFixSilence(silence)).not.toBe("")
  })

  it("reverses every movement when the two sides are held backwards", () => {
    const tree = page()
    const forwards = librarySendersChangeOf([silentBand(tree)], [soundPage(tree)])
    const backwards = librarySendersChangeOf([soundPage(tree)], [silentBand(tree)])

    expect(typeRow(forwards, "loom.band")?.movement).toBe("repaired")
    expect(typeRow(backwards, "loom.band")?.movement).toBe("regressed")
    expect(backwards.wentSilent).toBe(forwards.repaired)
  })
})
