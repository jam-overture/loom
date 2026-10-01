import { describe, expect, it } from "vitest"

import {
  buildElement,
  findNode,
  sequentialIdFactory,
  walkTree,
  type DeltaId,
  type LoomTree,
  type NodeId,
  type ProposalId,
  type TreeDelta,
  type TreeId,
  type TreeOperation,
} from "@jam-overture/loom"

import type { DecorationLookup } from "@jam-overture/loom/react"

import { legendFor, proposedDrawing, proposedHref, MARK_ORDER, type Mark } from "./proposed-view"
import { seedTree } from "./seed"
import { runtimeWordsIn } from "../_test/plain-language"

const deltaOf = (
  tree: LoomTree,
  operations: readonly TreeOperation[],
  baseRevision = tree.revision
): TreeDelta => ({
  deltaId: "d_1" as DeltaId,
  treeId: tree.treeId,
  baseRevision,
  operations,
})

/** The outlined card the seed puts third in the page, and the heading inside it. */
const seedCard = (tree: LoomTree): NodeId => {
  const card = tree.root.children[2]
  if (card?.kind !== "element") throw new Error("the seed changed shape")

  return card.id
}

const seedHeading = (tree: LoomTree): NodeId => {
  const heading = tree.root.children[0]
  if (heading?.kind !== "element") throw new Error("the seed changed shape")

  return heading.id
}

/** The words inside the seed's heading, and inside its first paragraph. */
const firstWords = (tree: LoomTree): NodeId => {
  const heading = tree.root.children[0]
  const words = heading?.kind === "element" ? heading.children[0] : undefined
  if (words?.kind !== "text") throw new Error("the seed changed shape")

  return words.id
}

const secondWords = (tree: LoomTree): NodeId => {
  const prose = tree.root.children[1]
  const words = prose?.kind === "element" ? prose.children[0] : undefined
  if (words?.kind !== "text") throw new Error("the seed changed shape")

  return words.id
}

const arriving = () =>
  buildElement(sequentialIdFactory("new"), { type: "loom.prose", props: {}, children: [] })

/**
 * What this deployment's own audit says about its primitives, stood in for.
 *
 * `everything` is the ordinary case — every registered primitive decorates — and
 * the one case that matters is the other: a page whose parts this host draws with
 * nothing to point at is a page no ring can be put on, whatever the change does.
 */
const everything: DecorationLookup = () => true
const nothing: DecorationLookup = () => false

const drawn = (
  tree: LoomTree,
  operations: readonly TreeOperation[],
  baseRevision?: number,
  decorates: DecorationLookup = everything
) => {
  const drawing = proposedDrawing(tree, deltaOf(tree, operations, baseRevision), decorates)
  if (drawing.kind !== "drawn") throw new Error(`expected a drawing, got ${drawing.kind}`)

  return drawing
}

const kindOf = (marks: readonly Mark[], nodeId: NodeId): string | undefined =>
  marks.find((mark) => mark.nodeId === nodeId)?.kind

describe("proposedDrawing", () => {
  /**
   * The whole point of the module, asserted as *a different page* rather than as
   * a field on an object. A fold that returned the tree it was handed would
   * satisfy every shape check written about it and draw two identical pictures,
   * which is the failure a screen with a before and an after cannot survive.
   */
  it("gives back the page the change would produce, and it is not the page it was handed", () => {
    const tree = seedTree()
    const drawing = drawn(tree, [{ op: "remove", nodeId: seedCard(tree) }])

    expect(findNode(tree.root, seedCard(tree))).not.toBeNull()
    expect(findNode(drawing.after.root, seedCard(tree))).toBeNull()
    expect(drawing.after.revision).toBe(tree.revision + 1)
  })

  it("counts a change that adds a part as one part arriving, on the page it would be on", () => {
    const tree = seedTree()
    const node = arriving()
    const drawing = drawn(tree, [
      { op: "insert", parentId: tree.root.id, index: 1, node },
    ])

    expect(kindOf(drawing.would, node.id)).toBe("arriving")
    /** Not on the page as it stands, so there is nothing there to outline. */
    expect(kindOf(drawing.now, node.id)).toBeUndefined()
    expect(findNode(drawing.after.root, node.id)).not.toBeNull()
  })

  it("marks a part that is taken away on the page it is still on, and nowhere else", () => {
    const tree = seedTree()
    const card = seedCard(tree)
    const drawing = drawn(tree, [{ op: "remove", nodeId: card }])

    expect(kindOf(drawing.now, card)).toBe("going")
    expect(kindOf(drawing.would, card)).toBeUndefined()
  })

  it("marks a part whose settings change on both pages, because it is on both", () => {
    const tree = seedTree()
    const card = seedCard(tree)
    const drawing = drawn(tree, [
      { op: "configure", nodeId: card, set: { variant: "outlined" }, unset: [] },
    ])

    expect(kindOf(drawing.now, card)).toBe("changed")
    expect(kindOf(drawing.would, card)).toBe("changed")
  })

  it("marks a part that moves on both pages", () => {
    const tree = seedTree()
    const heading = seedHeading(tree)
    const drawing = drawn(tree, [
      { op: "move", nodeId: heading, parentId: tree.root.id, index: 2 },
    ])

    expect(kindOf(drawing.now, heading)).toBe("moved")
    expect(kindOf(drawing.would, heading)).toBe("moved")
  })

  /**
   * The rule that stops one part being two pieces of news. A change may set a
   * value on a part and then delete it, and *changed* beside *taken away* on one
   * band is a reviewer being told something that is not true of it — it is not
   * going to be changed, it is going to be gone.
   */
  it("keeps the strongest mark when one change does two things to one part", () => {
    const tree = seedTree()
    const card = seedCard(tree)
    const drawing = drawn(tree, [
      { op: "configure", nodeId: card, set: { variant: "outlined" }, unset: [] },
      { op: "remove", nodeId: card },
    ])

    expect(kindOf(drawing.now, card)).toBe("going")
    expect(drawing.now.filter((mark) => mark.nodeId === card)).toHaveLength(1)
    expect(drawing.legend.map((entry) => entry.kind)).toEqual(["going"])
  })

  it("calls a part that is added and then configured new, rather than changed", () => {
    const tree = seedTree()
    const node = arriving()
    const drawing = drawn(tree, [
      { op: "insert", parentId: tree.root.id, index: 1, node },
      { op: "configure", nodeId: node.id, set: { tone: "quiet" }, unset: [] },
    ])

    expect(kindOf(drawing.would, node.id)).toBe("arriving")
    expect(drawing.legend.map((entry) => entry.kind)).toEqual(["arriving"])
  })

  /**
   * A mark is never put on a page the part is not on. The case that makes this
   * more than a tautology: a part added and then removed by one change is on
   * neither picture, and a filter written per *kind* rather than per *presence*
   * would have outlined it on the before.
   */
  it("puts no mark on either page for a part a change adds and then takes away", () => {
    const tree = seedTree()
    const node = arriving()
    const drawing = drawn(tree, [
      { op: "insert", parentId: tree.root.id, index: 1, node },
      { op: "remove", nodeId: node.id },
    ])

    expect(kindOf(drawing.now, node.id)).toBeUndefined()
    expect(kindOf(drawing.would, node.id)).toBeUndefined()
    /** The legend still counts it, because the change still does it. */
    expect(drawing.legend.map((entry) => entry.kind)).toEqual(["going"])
  })

  /**
   * The load-bearing refusal. `applyOperation` is published, so this module could
   * have walked the steps that land and skipped the rest — and the page that came
   * back would be one nobody will ever be served under either answer, because a
   * change is applied whole or not at all.
   */
  it("draws nothing at all when the page has moved on since the change was weighed", () => {
    const tree = seedTree()
    const drawing = proposedDrawing(
      tree,
      deltaOf(tree, [{ op: "remove", nodeId: seedCard(tree) }], tree.revision + 3),
      everything
    )

    expect(drawing.kind).toBe("cannot-draw")
  })

  it("draws nothing when one step of a change names a part that is not on the page", () => {
    const tree = seedTree()
    const drawing = proposedDrawing(
      tree,
      deltaOf(tree, [
        { op: "configure", nodeId: seedCard(tree), set: { variant: "plain" }, unset: [] },
        { op: "remove", nodeId: "n_gone" as NodeId },
      ]),
      everything
    )

    expect(drawing.kind).toBe("cannot-draw")
  })

  /**
   * And the half that matters more than the refusal: a change with one bad step
   * must not come back as a page with the good step applied. Measured by looking
   * at the tree rather than at the tag, because the tag is what a caller reads and
   * the tree is what a reader would be shown.
   */
  it("never hands back a page with only the steps that would have worked", () => {
    const tree = seedTree()
    const card = seedCard(tree)
    const drawing = proposedDrawing(
      tree,
      deltaOf(tree, [
        { op: "remove", nodeId: card },
        { op: "remove", nodeId: "n_gone" as NodeId },
      ]),
      everything
    )

    expect(drawing).not.toHaveProperty("after")
    expect(findNode(tree.root, card)).not.toBeNull()
  })

  it("says why in the runtime's own words, for the record under the notice", () => {
    const tree = seedTree()
    const drawing = proposedDrawing(
      tree,
      deltaOf(tree, [{ op: "remove", nodeId: seedCard(tree) }], tree.revision + 1),
      everything
    )

    if (drawing.kind !== "cannot-draw") throw new Error("expected a refusal")

    expect(drawing.detail).not.toBe("")
    expect(runtimeWordsIn(drawing.detail)).toContain("revision")
  })

  /**
   * The rule that keeps the outlines honest, and the case that made it necessary:
   * a change to a page's words. The writing inside a part has an id and can be
   * added and taken away like anything else, and it reaches the page as
   * characters inside somebody else's box — so there is no element to ring, and a
   * legend reading *taken away · one part* over a picture with nothing outlined
   * on it sends a reviewer hunting. It is left off the pictures and said instead.
   */
  it("puts no ring on the writing inside a part, and says so rather than leaving a gap", () => {
    const tree = seedTree()
    const words = firstWords(tree)
    const drawing = drawn(tree, [{ op: "remove", nodeId: words }])

    expect(drawing.now).toEqual([])
    expect(drawing.would).toEqual([])
    expect(drawing.legend.map((entry) => entry.parts)).toEqual([1])
    expect(drawing.notOutlined).toContain("no ring to look for")
  })

  it("says nothing about rings on a change every part of which has one", () => {
    const tree = seedTree()
    const drawing = drawn(tree, [{ op: "remove", nodeId: seedCard(tree) }])

    expect(drawing.now).toHaveLength(1)
    expect(drawing.notOutlined).toBeNull()
  })

  /**
   * The part a mark is about may be on neither picture — added and taken away by
   * one change — and the sentence still has to be right about what it was. The
   * proposal is the only surviving account of it, which is the mirror of a
   * removal.
   */
  it("finds a part that is on neither page, in the change that carries it", () => {
    const tree = seedTree()
    const node = arriving()
    const drawing = drawn(tree, [
      { op: "insert", parentId: tree.root.id, index: 1, node },
      { op: "remove", nodeId: node.id },
    ])

    /** An element, so nothing is claimed about rings — it simply is not drawn. */
    expect(drawing.notOutlined).toBeNull()
  })

  it("says how many when more than one part of a change is writing", () => {
    const tree = seedTree()
    const drawing = drawn(tree, [
      { op: "remove", nodeId: firstWords(tree) },
      { op: "remove", nodeId: secondWords(tree) },
    ])

    expect(drawing.notOutlined).toContain("2 of these are writing")
  })

  /**
   * The other half of the same rule, and the one only this deployment's own audit
   * knows: a registered primitive that ignores `loom.editable` (0012) leaves no
   * handle in the page, so a change to it is real and unringable. Filtering on
   * *is this an element* would have promised a ring here and drawn none.
   */
  it("puts no ring on a part this deployment draws nothing to point at, and says so", () => {
    const tree = seedTree()
    const drawing = drawn(tree, [{ op: "remove", nodeId: seedCard(tree) }], undefined, nothing)

    expect(drawing.now).toEqual([])
    expect(drawing.notOutlined).toContain("without anything to point at")
  })

  /**
   * And it never rings the ancestor instead. `addressNode` offers one — which is
   * right for a click, because a reader pointing at a word means the paragraph —
   * and wrong for a mark: ringing the paragraph because its words are changing
   * says the paragraph is changing. A ring in the wrong place is worse than none,
   * because it is believed.
   */
  it("never moves a ring up to the part that contains the one being changed", () => {
    const tree = seedTree()
    const heading = seedHeading(tree)
    const drawing = drawn(tree, [{ op: "remove", nodeId: firstWords(tree) }])

    expect(drawing.now).toEqual([])
    expect(drawing.now.map((mark) => mark.nodeId)).not.toContain(heading)
  })

  it("says it without the runtime's vocabulary", () => {
    const tree = seedTree()
    const drawing = drawn(tree, [{ op: "remove", nodeId: firstWords(tree) }])

    expect(runtimeWordsIn(drawing.notOutlined ?? "")).toEqual([])
  })

  /**
   * A change of several steps produces one mark per part it is about and nothing
   * per part it is not — which on a page of this size is the difference between
   * *look here* and *look at everything*.
   */
  it("leaves every part the change does not name unmarked", () => {
    const tree = seedTree()
    const card = seedCard(tree)
    const drawing = drawn(tree, [
      { op: "configure", nodeId: card, set: { variant: "outlined" }, unset: [] },
    ])
    const parts = [...walkTree(tree.root)].length

    expect(parts).toBeGreaterThan(4)
    expect(drawing.now).toHaveLength(1)
    expect(drawing.would).toHaveLength(1)
  })
})

describe("the legend", () => {
  it("names only the kinds a change actually does", () => {
    const tree = seedTree()
    const node = arriving()
    const drawing = drawn(tree, [
      { op: "insert", parentId: tree.root.id, index: 1, node },
      { op: "configure", nodeId: seedCard(tree), set: { variant: "plain" }, unset: [] },
    ])

    expect(drawing.legend.map((entry) => entry.kind)).toEqual(["arriving", "changed"])
  })

  /**
   * Ordered by what a reviewer needs to have seen first rather than by the order
   * the steps happen to be written in. A deletion is the answer that cannot be
   * taken back, and it leads.
   */
  it("reads in one fixed order whatever order the steps are written in", () => {
    const tree = seedTree()
    const node = arriving()
    const drawing = drawn(tree, [
      { op: "move", nodeId: seedHeading(tree), parentId: tree.root.id, index: 1 },
      { op: "insert", parentId: tree.root.id, index: 0, node },
      { op: "remove", nodeId: seedCard(tree) },
    ])

    expect(drawing.legend.map((entry) => entry.kind)).toEqual(["going", "arriving", "moved"])
    expect(MARK_ORDER.slice(0, 2)).toEqual(["going", "arriving"])
  })

  /**
   * Counted once for the change rather than once per picture. A part that is
   * taken away is on one of the two pages, and a legend counting the marks it
   * placed would say *one taken away* beside the before and *none* beside the
   * after — arithmetic about pictures where a reader wanted news about a change.
   */
  it("counts parts from the change, not from either picture", () => {
    const first = arriving()
    const second = arriving()
    const legend = legendFor([
      { nodeId: first.id, kind: "arriving" },
      { nodeId: second.id, kind: "arriving" },
    ])

    expect(legend).toHaveLength(1)
    expect(legend[0]?.parts).toBe(2)
  })

  it("says nothing at all about a change with no steps in it", () => {
    expect(legendFor([])).toEqual([])
  })

  /**
   * The governing principle, on the four sentences this module puts on a screen.
   * The runtime's own word for each travels beside them, which is what the
   * disclosure under the pictures prints — so nothing is removed by saying it
   * plainly.
   */
  it("says what each colour means without using the runtime's vocabulary", () => {
    const legend = legendFor(MARK_ORDER.map((kind, index) => ({ nodeId: `n_${index}` as NodeId, kind })))

    expect(legend).toHaveLength(MARK_ORDER.length)

    for (const entry of legend) {
      expect(runtimeWordsIn(`${entry.label}. ${entry.meaning}`)).toEqual([])
      expect(entry.technical).not.toBe("")
    }
  })

  /** Every kind is spoken for, so a fifth operation cannot arrive unlabelled. */
  it("has a word for every kind of mark there is", () => {
    expect(new Set(MARK_ORDER).size).toBe(MARK_ORDER.length)
    expect(MARK_ORDER).toHaveLength(4)
  })
})

describe("proposedHref", () => {
  it("addresses one change on one page", () => {
    expect(proposedHref("t_1" as TreeId, "p_9" as ProposalId)).toBe(
      "/portal/pages/t_1/proposed/p_9"
    )
  })
})
