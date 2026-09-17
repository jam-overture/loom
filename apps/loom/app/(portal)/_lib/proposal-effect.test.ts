import { describe, expect, it } from "vitest"

import {
  buildElement,
  buildText,
  createTree,
  deltaIdSchema,
  nodeIdSchema,
  primitiveTypeSchema,
  sequentialIdFactory,
  type LoomTree,
  type TreeDelta,
  type TreeOperation,
} from "@loom/runtime"
import type { CopyDeclarations } from "@loom/runtime/sdk"

import { describeProposalEffect as describeAgainst, formatValue } from "./proposal-effect"

/**
 * Declarations for the three types this file's tree is built from, all of which
 * hold their words as children and show none of their own — which is what the
 * portal's own four primitives declare, and what keeps the reading's third
 * answer out of every assertion that is not about it.
 *
 * Wrapped rather than threaded through twenty-seven call sites, because every
 * one of those sites is a test about a verb, a path or a count and would read
 * worse for carrying a registry it does not care about. The tests that *are*
 * about the declarations call `describeAgainst` directly with their own, which
 * is the point of `CopyDeclarations` being an interface a fixture can satisfy.
 */
const DECLARED: CopyDeclarations = { copyFor: () => [] }

/** Nothing has declared anything — the state of most of the starter library today. */
const UNDECLARED: CopyDeclarations = { copyFor: () => undefined }

const describeProposalEffect = (tree: LoomTree, delta: TreeDelta) =>
  describeAgainst(tree, delta, DECLARED)

/**
 * One page, three bands, with a heading whose words are worth recognising. Ids
 * are sequential so a test can name a node without holding the tree open.
 */
const pageTree = (): LoomTree => {
  const ids = sequentialIdFactory("p")

  return createTree(
    buildElement(ids, {
      type: "loom.page",
      props: { theme: "quiet" },
      children: [
        buildElement(ids, {
          type: "loom.heading",
          props: { level: 1, tone: "loud" },
          children: [buildText(ids, "Ship faster")],
        }),
        buildElement(ids, {
          type: "loom.card",
          props: {},
          children: [buildText(ids, "Talk to us")],
        }),
        buildElement(ids, { type: "loom.card", props: {}, children: [] }),
      ],
    }),
    ids
  )
}

/** The ids `sequentialIdFactory` mints, in the order the builders run: a child before its parent. */
const HEADING_TEXT = nodeIdSchema.parse("n_p1")
const HEADING = nodeIdSchema.parse("n_p2")
const FIRST_CARD = nodeIdSchema.parse("n_p4")
const SECOND_CARD = nodeIdSchema.parse("n_p5")
const PAGE = nodeIdSchema.parse("n_p6")

const deltaOf = (tree: LoomTree, operations: readonly TreeOperation[]): TreeDelta => ({
  deltaId: deltaIdSchema.parse("d_1"),
  treeId: tree.treeId,
  baseRevision: tree.revision,
  operations,
})

describe("formatValue", () => {
  it("quotes a string, so an empty one is not mistaken for a cleared key", () => {
    expect(formatValue("")).toBe(`""`)
  })

  it("collapses and cuts a long string rather than filling the pane with it", () => {
    const formatted = formatValue(`a  sentence\nthat runs ${"x".repeat(100)}`)

    expect(formatted.startsWith(`"a sentence that runs`)).toBe(true)
    expect(formatted.endsWith(`…"`)).toBe(true)
  })

  it("renders the scalars as themselves", () => {
    expect([formatValue(3), formatValue(true), formatValue(null)]).toEqual(["3", "true", "null"])
  })
})

describe("describeProposalEffect", () => {
  /**
   * The point of the whole module. `configure p_3: value` is what the delta
   * says; what a reviewer needs is the sentence that is there now.
   */
  it("shows the value a reconfigure would replace, not only the one it writes", () => {
    const tree = pageTree()
    const effect = describeProposalEffect(
      tree,
      deltaOf(tree, [{ op: "configure", nodeId: HEADING_TEXT, set: { value: "Ship safer" }, unset: [] }])
    )

    expect(effect.operations[0]?.changes).toEqual([
      { key: "value", before: `"Ship faster"`, after: `"Ship safer"`, inert: false },
    ])
  })

  it("distinguishes a key that is not set from one being cleared", () => {
    const tree = pageTree()
    const effect = describeProposalEffect(
      tree,
      deltaOf(tree, [
        { op: "configure", nodeId: HEADING, set: { align: "center" }, unset: ["tone"] },
      ])
    )

    expect(effect.operations[0]?.changes).toEqual([
      { key: "align", before: null, after: `"center"`, inert: false },
      { key: "tone", before: `"loud"`, after: null, inert: false },
    ])
  })

  /**
   * A proposal that writes the value already there is not a small change, it is
   * no change — and a reviewer who confirms it learns nothing about the Gate
   * from the result.
   */
  it("names an operation that would write the value already there as inert", () => {
    const tree = pageTree()
    const effect = describeProposalEffect(
      tree,
      deltaOf(tree, [
        { op: "configure", nodeId: HEADING, set: { level: 1 }, unset: ["missing-key"] },
      ])
    )

    expect(effect.operations[0]?.inert).toBe(true)
    expect(effect.operations[0]?.detail).toBe("2 values, 2 already set this way")
    expect(effect.inertCount).toBe(1)
  })

  it("counts a partly inert reconfigure as a change, and says how much of it is one", () => {
    const tree = pageTree()
    const effect = describeProposalEffect(
      tree,
      deltaOf(tree, [{ op: "configure", nodeId: HEADING, set: { level: 1, tone: "quiet" }, unset: [] }])
    )

    expect(effect.operations[0]?.inert).toBe(false)
    expect(effect.operations[0]?.detail).toBe("2 values, 1 already set this way")
    expect(effect.inertCount).toBe(0)
  })

  /** A removal names one id and takes a subtree. The count is the part misjudged. */
  it("says how much a removal takes with it, and what it says", () => {
    const tree = pageTree()
    const effect = describeProposalEffect(tree, deltaOf(tree, [{ op: "remove", nodeId: HEADING }]))

    expect(effect.operations[0]).toMatchObject({
      verb: "delete",
      subject: { name: "the heading “Ship faster”", nodeId: HEADING },
      label: "loom.heading",
      place: ["loom.page"],
      placeNames: ["the page"],
      detail: "and 1 node under it",
      text: ["Ship faster"],
      carries: 2,
    })
  })

  it("says plainly when a removal takes nothing but itself", () => {
    const tree = pageTree()
    const effect = describeProposalEffect(
      tree,
      deltaOf(tree, [{ op: "remove", nodeId: SECOND_CARD }])
    )

    expect(effect.operations[0]?.detail).toBe("a single node, with nothing under it")
  })

  /** "at 1" is a coordinate. "before the card" is somewhere a reader can picture. */
  it("places an insert by its neighbour rather than by its index", () => {
    const tree = pageTree()
    const effect = describeProposalEffect(
      tree,
      deltaOf(tree, [
        {
          op: "insert",
          parentId: PAGE,
          index: 1,
          node: {
            kind: "element",
            id: nodeIdSchema.parse("n_new1"),
            type: primitiveTypeSchema.parse("loom.card"),
            props: {},
            children: [{ kind: "text", id: nodeIdSchema.parse("n_new2"), value: "New band" }],
          },
        },
      ])
    )

    expect(effect.operations[0]).toMatchObject({
      verb: "add",
      /**
       * Named from the delta, not from the tree. `n_new1` is not on the page —
       * it is what the proposal would put there — so nothing but the proposal
       * itself can say that what is arriving is a card that reads *New band*.
       */
      subject: { name: "the card “New band”", nodeId: "n_new1" },
      label: "loom.card",
      place: ["loom.page"],
      placeNames: ["the page"],
      detail: "into loom.page, before loom.card, bringing 2 nodes",
      text: ["New band"],
      carries: 2,
    })
  })

  it("says an insert past the last child lands at the end", () => {
    const tree = pageTree()
    const effect = describeProposalEffect(
      tree,
      deltaOf(tree, [
        {
          op: "insert",
          parentId: PAGE,
          index: 3,
          node: { kind: "text", id: nodeIdSchema.parse("n_tail1"), value: "Footnote" },
        },
      ])
    )

    expect(effect.operations[0]?.detail).toBe("at the end of loom.page")
  })

  it("says where a move came from as well as where it goes", () => {
    const tree = pageTree()
    const effect = describeProposalEffect(
      tree,
      deltaOf(tree, [{ op: "move", nodeId: HEADING_TEXT, parentId: FIRST_CARD, index: 0 }])
    )

    expect(effect.operations[0]?.detail).toBe(
      "out of loom.heading and into loom.card, at position 0"
    )
  })

  /**
   * `index` is read against the child list the node has already left, so moving
   * a node to its own index puts it back exactly where it was.
   */
  it("names a move that changes nothing as inert", () => {
    const tree = pageTree()
    const effect = describeProposalEffect(
      tree,
      deltaOf(tree, [{ op: "move", nodeId: FIRST_CARD, parentId: PAGE, index: 1 }])
    )

    expect(effect.operations[0]).toMatchObject({
      detail: "within loom.page, position 1 → 1",
      inert: true,
    })
  })

  /**
   * `detail` above composes the same facts into one string, which is exactly the
   * shape a plain sentence cannot be built from without parsing it back apart.
   * These are the pieces `effect-view` words a sentence out of, so they are
   * asserted against a real tree rather than against a fixture that could agree
   * with the view module and disagree with the page.
   */
  describe("the pieces a sentence is built from", () => {
    it("names the part an insert lands in and the one it lands above", () => {
      const tree = pageTree()
      const effect = describeProposalEffect(
        tree,
        deltaOf(tree, [
          {
            op: "insert",
            parentId: PAGE,
            index: 1,
            node: { kind: "text", id: nodeIdSchema.parse("n_ins1"), value: "New band" },
          },
        ])
      )

      expect(effect.operations[0]).toMatchObject({
        op: "insert",
        into: "the page",
        before: "the card",
        from: null,
      })
    })

    it("names nothing to land above when an insert lands at the end", () => {
      const tree = pageTree()
      const effect = describeProposalEffect(
        tree,
        deltaOf(tree, [
          {
            op: "insert",
            parentId: PAGE,
            index: 3,
            node: { kind: "text", id: nodeIdSchema.parse("n_tail3"), value: "Footnote" },
          },
        ])
      )

      expect(effect.operations[0]).toMatchObject({ into: "the page", before: null })
    })

    it("names both ends of a move that leaves where it was", () => {
      const tree = pageTree()
      const effect = describeProposalEffect(
        tree,
        deltaOf(tree, [{ op: "move", nodeId: HEADING_TEXT, parentId: FIRST_CARD, index: 0 }])
      )

      expect(effect.operations[0]).toMatchObject({
        op: "move",
        from: "the heading",
        into: "the card",
      })
    })

    /**
     * A reorder inside one parent has no elsewhere to name, and saying "out of
     * the page and into the page" would read as a change of address that is not
     * happening.
     */
    it("names no origin for a move that stays where it is", () => {
      const tree = pageTree()
      const effect = describeProposalEffect(
        tree,
        deltaOf(tree, [{ op: "move", nodeId: FIRST_CARD, parentId: PAGE, index: 2 }])
      )

      expect(effect.operations[0]).toMatchObject({ from: null, into: "the page" })
    })

    it("names no destination when the part an insert would go inside is gone", () => {
      const tree = pageTree()
      const effect = describeProposalEffect(
        tree,
        deltaOf(tree, [
          {
            op: "insert",
            parentId: nodeIdSchema.parse("n_absent"),
            index: 0,
            node: { kind: "text", id: nodeIdSchema.parse("n_ins2"), value: "Nowhere" },
          },
        ])
      )

      expect(effect.operations[0]).toMatchObject({ into: null, before: null, missing: true })
    })

    /**
     * The delta model's own name, carried through beside the display verb. A
     * plain reading is chosen by what an operation *is*, and choosing it by the
     * verb would make rewording the verb silently change the sentence.
     */
    it("carries the operation's own name beside the portal's verb", () => {
      const tree = pageTree()
      const effect = describeProposalEffect(
        tree,
        deltaOf(tree, [{ op: "remove", nodeId: FIRST_CARD }])
      )

      expect(effect.operations[0]).toMatchObject({ op: "remove", verb: "delete" })
    })
  })

  /**
   * Who names a part, and what they are allowed to say about it.
   *
   * The review queue was the last screen in this portal calling every part
   * `loom.card`. `/portal/history` had been saying *the card “Autumn arrivals”*
   * since 10 September, so two screens of one portal named one part two ways —
   * and the worse of the two was the screen with the buttons on it.
   */
  describe("naming the parts a sentence is about", () => {
    /**
     * **The only account of what a proposal would add is the proposal itself.**
     *
     * The node is not on the page — that is the whole of what an insert
     * proposes — so no walk of the tree can say what is arriving. It is the
     * mirror of a removal, whose only surviving account is its inverse, and
     * between the two of them there is no moment in a change's life that the
     * portal cannot name. Nothing in the repository holds either: the tree was
     * never markup in a file.
     */
    it("names what an insert would add from the delta, because the page has never held it", () => {
      const tree = pageTree()
      const effect = describeProposalEffect(
        tree,
        deltaOf(tree, [
          {
            op: "insert",
            parentId: PAGE,
            index: 0,
            node: {
              kind: "element",
              id: nodeIdSchema.parse("n_unseen"),
              type: primitiveTypeSchema.parse("acme.price-tag"),
              props: {},
              children: [{ kind: "text", id: nodeIdSchema.parse("n_unseen2"), value: "£42" }],
            },
          },
        ])
      )

      /** `acme.price-tag` is registered nowhere here. The noun is read, not looked up. */
      expect(effect.operations[0]?.subject).toEqual({
        name: "the price tag “£42”",
        nodeId: "n_unseen",
      })
      expect(effect.operations[0]?.label).toBe("acme.price-tag")
    })

    /**
     * A place is named by what it is, and the page is the case that proves why.
     *
     * Naming it the way a subject is named walks its whole subtree for words,
     * so an insert into this fixture's page would land *inside the page “Ship
     * faster Talk to us”* — a container described by its contents, in the one
     * clause that was supposed to be an address.
     */
    it("names the place a change lands in by what it is, not by what is inside it", () => {
      const tree = pageTree()
      const effect = describeProposalEffect(
        tree,
        deltaOf(tree, [
          {
            op: "insert",
            parentId: PAGE,
            index: 0,
            node: { kind: "text", id: nodeIdSchema.parse("n_ins9"), value: "New" },
          },
        ])
      )

      expect(effect.operations[0]?.into).toBe("the page")
      expect(effect.operations[0]?.into).not.toContain("Ship faster")
      expect(effect.operations[0]?.placeNames).toEqual(["the page"])
    })

    /**
     * Both readings of one path, and the point is that there are two. The
     * breadcrumb a reviewer reads is in the voice of the sentence above it; the
     * labels it replaced are carried for the record rather than dropped.
     */
    it("carries the path in both vocabularies, so naming one takes nothing from the other", () => {
      const tree = pageTree()
      const effect = describeProposalEffect(
        tree,
        deltaOf(tree, [{ op: "remove", nodeId: HEADING_TEXT }])
      )

      expect(effect.operations[0]?.placeNames).toEqual(["the page", "the heading"])
      expect(effect.operations[0]?.place).toEqual(["loom.page", "loom.heading"])
    })

    /**
     * The fallback, unchanged and load-bearing: where no node can be found the
     * subject is the identifier itself rather than a phrase standing in for it.
     * `part-name.ts` holds the argument — *"this part `n_p99`"* spends a
     * reader's attention on a word that adds nothing and hands them the id
     * anyway — and it is why no sentence here reads worse than it did before
     * names existed.
     */
    it("leaves a part it cannot find as the bare id it has always been", () => {
      const tree = pageTree()
      const effect = describeProposalEffect(
        tree,
        deltaOf(tree, [{ op: "remove", nodeId: nodeIdSchema.parse("n_p99") }])
      )

      expect(effect.operations[0]?.subject).toBe("n_p99")
      expect(effect.operations[0]?.label).toBe("n_p99")
      expect(effect.operations[0]?.placeNames).toEqual([])
    })
  })

  /**
   * The reviewer needs this *before* they press apply. A hold answered against a
   * tree that has moved is refused by the runtime, and a queue that only says so
   * afterwards has spent the reviewer's decision on nothing.
   */
  it("says the proposal no longer applies, and why, when the node it names is gone", () => {
    const tree = pageTree()
    const effect = describeProposalEffect(
      tree,
      deltaOf(tree, [
        { op: "configure", nodeId: nodeIdSchema.parse("n_p99"), set: { tone: "quiet" }, unset: [] },
      ])
    )

    expect(effect.applies).toBe(false)
    expect(effect.obstacle).toBe("No node n_p99 in this tree.")
    expect(effect.operations[0]).toMatchObject({ missing: true, detail: "this tree has no such node" })
  })

  it("reports a proposal judged against an older revision as stale, in the runtime's words", () => {
    const tree = pageTree()
    const effect = describeProposalEffect(tree, {
      ...deltaOf(tree, [{ op: "remove", nodeId: SECOND_CARD }]),
      baseRevision: tree.revision - 1,
    })

    expect(effect).toMatchObject({
      stale: true,
      applies: false,
      baseRevision: tree.revision - 1,
      treeRevision: tree.revision,
    })
    expect(effect.obstacle).toContain("revision")
  })

  it("holds a proposal that still applies to be applicable and current", () => {
    const tree = pageTree()
    const effect = describeProposalEffect(
      tree,
      deltaOf(tree, [{ op: "configure", nodeId: HEADING, set: { tone: "quiet" }, unset: [] }])
    )

    expect(effect).toMatchObject({ applies: true, obstacle: null, stale: false, inertCount: 0 })
  })

  /**
   * Each operation observes the ones before it (0001), so a description that
   * read every operation against the original tree would misreport the second
   * half of any delta that builds on its own work.
   */
  it("describes each operation against the tree the ones before it left", () => {
    const tree = pageTree()
    const inserted = nodeIdSchema.parse("n_late1")
    const effect = describeProposalEffect(
      tree,
      deltaOf(tree, [
        {
          op: "insert",
          parentId: FIRST_CARD,
          index: 0,
          node: { kind: "element", id: inserted, type: primitiveTypeSchema.parse("loom.heading"), props: { tone: "loud" }, children: [] },
        },
        { op: "configure", nodeId: inserted, set: { tone: "quiet" }, unset: [] },
      ])
    )

    expect(effect.applies).toBe(true)
    expect(effect.operations[1]).toMatchObject({
      subject: { name: "the heading", nodeId: inserted },
      label: "loom.heading",
      place: ["loom.page", "loom.card"],
      placeNames: ["the page", "the card"],
      missing: false,
      changes: [{ key: "tone", before: `"loud"`, after: `"quiet"`, inert: false }],
    })
  })

  /**
   * The operation that fails is the one the reviewer most needs to see, and the
   * ones after it are what the change was *for*. Stopping the walk at the
   * failure would hide both.
   */
  it("keeps describing after an operation that cannot be applied", () => {
    const tree = pageTree()
    const effect = describeProposalEffect(
      tree,
      deltaOf(tree, [
        { op: "remove", nodeId: nodeIdSchema.parse("n_p99") },
        { op: "configure", nodeId: HEADING, set: { tone: "quiet" }, unset: [] },
      ])
    )

    expect(effect.applies).toBe(false)
    expect(effect.operations).toHaveLength(2)
    expect(effect.operations[1]).toMatchObject({
      subject: { name: "the heading “Ship faster”", nodeId: HEADING },
      missing: false,
    })
  })
})

/**
 * What a change would take off the page, in the words that are on it.
 *
 * `Loom demo` filed on 1 September that this module's reading walked text
 * children and kept only those, and that
 * [0052](../../../../../decisions/0052-a-repeated-item-is-a-node-and-a-fixed-field-is-a-prop.md)
 * makes that the wrong half of the tree: a fixed field stays a setting, so a
 * band of headline figures has no text children at all and a proposal to delete
 * it reported *no words*. These are the three answers the reading has now, and
 * the third is the one that did not exist before — a part nobody has spoken
 * for is neither words nor the absence of them.
 */
describe("the words an operation carries", () => {
  const STAT = primitiveTypeSchema.parse("loom.stat")

  /** A band of three figures, each carrying every word it prints as a setting. */
  const statTree = (): LoomTree => {
    const ids = sequentialIdFactory("s")

    return createTree(
      buildElement(ids, {
        type: "loom.stat-grid",
        props: { columns: 3, align: "centre" },
        children: [
          buildElement(ids, {
            type: "loom.stat",
            props: { value: "3,400", label: "appointments", caption: "last year", tone: "loud" },
            children: [],
          }),
          buildElement(ids, {
            type: "loom.stat",
            props: { value: "12", label: "clinicians", caption: "on call", tone: "loud" },
            children: [],
          }),
        ],
      }),
      ids
    )
  }

  const GRID = nodeIdSchema.parse("n_s3")

  /** The author's answer: three of a stat's four settings are words, `tone` is not. */
  const STATS_DECLARED: CopyDeclarations = {
    copyFor: (type) => (type === STAT ? ["value", "label", "caption"] : []),
  }

  it("reads the words a part holds in its settings, not only its text children", () => {
    const tree = statTree()
    const effect = describeAgainst(
      tree,
      deltaOf(tree, [{ op: "remove", nodeId: GRID }]),
      STATS_DECLARED
    )

    expect(effect.operations[0]?.text).toEqual(["3,400", "appointments", "last year"])
    expect(effect.operations[0]?.unreadable).toEqual([])
  })

  /**
   * The cut said out loud. Six words previewed as three is an account of a
   * deletion with three words missing and no way for the reader to tell.
   */
  it("counts every word it found, not only the ones it previews", () => {
    const tree = statTree()
    const effect = describeAgainst(
      tree,
      deltaOf(tree, [{ op: "remove", nodeId: GRID }]),
      STATS_DECLARED
    )

    expect(effect.operations[0]?.text).toHaveLength(3)
    expect(effect.operations[0]?.textTotal).toBe(6)
  })

  /**
   * The defect, stated as the test that would have caught it. This is what the
   * starter library looks like today: nothing has declared, so the old reading
   * reported an empty list and the card said nothing at all.
   */
  it("says it cannot read a part's words rather than reporting none", () => {
    const tree = statTree()
    const effect = describeAgainst(
      tree,
      deltaOf(tree, [{ op: "remove", nodeId: GRID }]),
      UNDECLARED
    )

    expect(effect.operations[0]?.text).toEqual([])
    expect(effect.operations[0]?.textTotal).toBe(0)
    expect(effect.operations[0]?.unreadable).toEqual([
      { type: "loom.stat-grid", parts: 1, settings: ["align"] },
      { type: "loom.stat", parts: 2, settings: ["value", "label", "caption", "tone"] },
    ])
  })

  /**
   * Grouped by type, because that is the level both readers act at: a person is
   * told how many parts, and whoever maintains the primitives is told which one
   * to declare. Two stats saying the same thing twice would be the same fact
   * printed twice and the same fix named twice.
   */
  it("groups the parts it cannot read by type, and counts them", () => {
    const tree = statTree()
    const effect = describeAgainst(
      tree,
      deltaOf(tree, [{ op: "remove", nodeId: GRID }]),
      { copyFor: (type) => (type === STAT ? undefined : []) }
    )

    expect(effect.operations[0]?.unreadable).toEqual([
      { type: "loom.stat", parts: 2, settings: ["value", "label", "caption", "tone"] },
    ])
  })

  /**
   * `[]` is believed and absence is not (0122). A primitive that has said it
   * shows no words of its own must not be reported as a silence, or every
   * arrangement in a library would raise the caveat and the caveat would stop
   * meaning anything.
   */
  it("believes a part that declared it shows no words of its own", () => {
    const tree = statTree()
    const effect = describeAgainst(
      tree,
      deltaOf(tree, [{ op: "remove", nodeId: GRID }]),
      { copyFor: () => [] }
    )

    expect(effect.operations[0]).toMatchObject({ text: [], textTotal: 0, unreadable: [] })
  })

  /** An insert has no node on the page yet, so the only account of it is the delta's. */
  it("reads an arriving part's words out of the proposal", () => {
    const tree = statTree()
    const effect = describeAgainst(
      tree,
      deltaOf(tree, [
        {
          op: "insert",
          parentId: GRID,
          index: 0,
          node: {
            kind: "element",
            id: nodeIdSchema.parse("n_arriving"),
            type: STAT,
            props: { value: "980", label: "referrals" },
            children: [],
          },
        },
      ]),
      STATS_DECLARED
    )

    expect(effect.operations[0]).toMatchObject({
      verb: "add",
      text: ["980", "referrals"],
      textTotal: 2,
      unreadable: [],
    })
  })

  /**
   * A move carries the same words to a different place. Reporting them as
   * arriving would be a change of address read as a change of content — and
   * there is nothing that could go unread either, which is why the second
   * field is empty rather than unknown.
   */
  it("reports no words either way for a move", () => {
    const tree = statTree()
    const effect = describeAgainst(
      tree,
      deltaOf(tree, [{ op: "move", nodeId: nodeIdSchema.parse("n_s1"), parentId: GRID, index: 1 }]),
      UNDECLARED
    )

    expect(effect.operations[0]).toMatchObject({ text: [], textTotal: 0, unreadable: [] })
  })
})
