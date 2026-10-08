import { describe, expect, it } from "vitest"

import {
  applyOperation,
  sequentialIdFactory,
  withRoot,
  type JsonValue,
  type LoomTree,
  type TreeDelta,
  type TreeOperation,
} from "@jam-overture/loom"

import { demoPageTree } from "./page-tree"
import { presetById } from "./presets"
import {
  reversesTheLastChange,
  settingsMoved,
  wouldPutTheLastChangeBack,
  type SettingMove,
} from "./put-back"

/**
 * Whether a change put a setting back where the change before it moved it from.
 *
 * Driven against the real page and the real presets rather than a fixture,
 * because the claim is not that the function compares two objects — it is that
 * **pressing the demo's own toggle twice is read as going back**. A fixture
 * would pass while the surface went on printing one sentence twice, which is the
 * defect this exists for.
 *
 * The hand-built deltas below are the cases the presets cannot reach: a prop
 * cleared, two configures inside one delta, a half-reversal. They are fixtures
 * on purpose — the point of each is a shape the demo's five buttons do not
 * produce and a model's free text one day might.
 */

const ids = sequentialIdFactory("putback")

const planOf = (id: string, tree: LoomTree): readonly TreeOperation[] => {
  const preset = presetById(id)
  if (!preset) throw new Error(`no preset ${id}`)

  const operations = preset.plan(tree, ids)
  if (!operations) throw new Error(`preset ${id} planned nothing`)

  return operations
}

const deltaOf = (tree: LoomTree, operations: readonly TreeOperation[]): TreeDelta => ({
  deltaId: ids.deltaId(),
  treeId: tree.treeId,
  baseRevision: tree.revision,
  operations,
})

/** The tree the next ask is planned against, which is the one the last one left. */
const after = (tree: LoomTree, operations: readonly TreeOperation[]): LoomTree =>
  operations.reduce((current, operation) => {
    const next = applyOperation(current.root, operation)
    if (!next.ok) throw new Error(`did not apply: ${next.error.code}`)
    if (next.value.kind !== "element") throw new Error("the root stopped being an element")

    return withRoot(current, next.value)
  }, tree)

/** Any prop the page's root actually carries, so the cases below are about the
 * real page rather than about a key invented for them. */
const aPropOf = (tree: LoomTree): readonly [string, JsonValue] => {
  const entry = Object.entries(tree.root.props)[0]
  if (entry === undefined) throw new Error("the page's root carries no props")

  return entry
}

/** One press of a preset: what it moved, and the tree it left behind. */
const press = (
  tree: LoomTree,
  id: string
): { readonly moves: readonly SettingMove[]; readonly tree: LoomTree } => {
  const operations = planOf(id, tree)

  return { moves: settingsMoved(tree, deltaOf(tree, operations)), tree: after(tree, operations) }
}

describe("what a change moved, read against the tree it was planned against", () => {
  it("reports the re-theme as one prop on the root, with the value it came from", () => {
    const tree = demoPageTree()
    const [move, ...rest] = settingsMoved(tree, deltaOf(tree, planOf("palette", tree)))

    expect(rest).toEqual([])
    expect(move?.nodeId).toBe(tree.root.id)
    expect(move?.from).toBeDefined()
    expect(move?.to).toBeDefined()
    expect(move?.from).not.toEqual(move?.to)
  })

  /**
   * The operation a visitor's other button makes, on a node that is not the
   * root — so the reading is not quietly about the page's theme alone.
   */
  it("reports the repaint as one prop on the band it names", () => {
    const tree = demoPageTree()
    const [move] = settingsMoved(tree, deltaOf(tree, planOf("backdrop", tree)))

    expect(move?.nodeId).not.toBe(tree.root.id)
    expect(move?.from).not.toEqual(move?.to)
  })

  /**
   * A change that says what the page already says moved nothing, and this is
   * what stops it being the thing a later change is said to have reversed: two
   * no-op configures would otherwise be each other's perfect opposite.
   */
  it("says nothing moved when a configure sets what is already there", () => {
    const tree = demoPageTree()
    const [key, value] = aPropOf(tree)

    expect(
      settingsMoved(
        tree,
        deltaOf(tree, [{ op: "configure", nodeId: tree.root.id, set: { [key]: value }, unset: [] }])
      )
    ).toEqual([])
  })

  it("reports a cleared prop as a move with no value to go to", () => {
    const tree = demoPageTree()
    const [key] = aPropOf(tree)

    const [move] = settingsMoved(
      tree,
      deltaOf(tree, [{ op: "configure", nodeId: tree.root.id, set: {}, unset: [key] }])
    )

    expect(move?.key).toBe(key)
    expect(move?.from).toBeDefined()
    expect(move !== undefined && "to" in move).toBe(false)
  })

  /**
   * Two configures on one node inside one delta, which is legal and is why the
   * walk carries the tree forward. Read against the original tree both times,
   * the second move's `from` would be the value the first one had already
   * replaced — and a reversal check built on that would be answering about a
   * tree that never existed.
   */
  it("reads a second configure against what the first one left", () => {
    const tree = demoPageTree()
    const moves = settingsMoved(
      tree,
      deltaOf(tree, [
        { op: "configure", nodeId: tree.root.id, set: { "demo.note": "one" }, unset: [] },
        { op: "configure", nodeId: tree.root.id, set: { "demo.note": "two" }, unset: [] },
      ])
    )

    expect(moves.map((move) => move.to)).toEqual(["one", "two"])
    expect(moves[1]?.from).toBe("one")
  })

  /** An operation that moves no setting contributes nothing, so a removal can
   * never be read as having put a setting back. */
  it("reports nothing for a change that moves no setting", () => {
    const tree = demoPageTree()

    expect(settingsMoved(tree, deltaOf(tree, planOf("trim", tree)))).toEqual([])
  })
})

describe("whether a change put the last one back", () => {
  /** The defect, in the two presses that produce it. */
  it("reads the second press of a toggle as going back, and the first as not", () => {
    const first = press(demoPageTree(), "palette")
    const second = press(first.tree, "palette")

    expect(reversesTheLastChange(first.moves, undefined)).toBe(false)
    expect(reversesTheLastChange(second.moves, first.moves)).toBe(true)
  })

  /** The same claim for the toggle on a band rather than on the whole page. */
  it("reads the second repaint as going back", () => {
    const first = press(demoPageTree(), "backdrop")
    const second = press(first.tree, "backdrop")

    expect(reversesTheLastChange(second.moves, first.moves)).toBe(true)
  })

  /**
   * The case that looks like a false positive and is not: the third press
   * reverses the second exactly, and the second was the last thing that happened
   * to the page.
   */
  it("reads a third press as going back too, because it reverses the second", () => {
    const first = press(demoPageTree(), "palette")
    const second = press(first.tree, "palette")
    const third = press(second.tree, "palette")

    expect(reversesTheLastChange(third.moves, second.moves)).toBe(true)
  })

  /**
   * **The overclaim this is built to refuse.** The third press reverses the last
   * thing done to the *palette*, and the page is still carrying a repainted
   * band — so *“the whole page went back to how it looked”* would be a sentence
   * a stranger could see was false.
   */
  it("is not going back when something else moved the page in between", () => {
    const palette = press(demoPageTree(), "palette")
    const backdrop = press(palette.tree, "backdrop")
    const again = press(backdrop.tree, "palette")

    expect(reversesTheLastChange(again.moves, backdrop.moves)).toBe(false)
  })

  it("is not going back when the last change was to a different setting", () => {
    const palette = press(demoPageTree(), "palette")
    const backdrop = press(palette.tree, "backdrop")

    expect(reversesTheLastChange(backdrop.moves, palette.moves)).toBe(false)
  })

  /**
   * A change that moved no setting at all — a removal, an insert, a move — is
   * not something a later configure can have put back, and an empty list says so
   * rather than being stepped over.
   */
  it("is not going back when the change before it moved no setting", () => {
    const first = press(demoPageTree(), "palette")
    const second = press(first.tree, "palette")

    expect(reversesTheLastChange(second.moves, [])).toBe(false)
  })

  /**
   * A change that reverses one setting and moves another somewhere new has not
   * put anything back, and this is the direction this surface can least afford
   * to be wrong in.
   */
  it("is not going back when only some of what it moved goes back", () => {
    const tree = demoPageTree()
    const earlier: readonly SettingMove[] = [
      { nodeId: tree.root.id, key: "demo.a", from: "was", to: "is" },
    ]
    const moves: readonly SettingMove[] = [
      { nodeId: tree.root.id, key: "demo.a", from: "is", to: "was" },
      { nodeId: tree.root.id, key: "demo.b", to: "new" },
    ]

    expect(reversesTheLastChange(moves, earlier)).toBe(false)
  })

  /**
   * And the same thing from the other side, which is the case only counting both
   * lists catches: the change before this one moved two settings, and this one
   * reverses one of them. Every move it made is a perfect reverse, and the page
   * is still carrying the other half of what came before.
   */
  it("is not going back when it reverses only part of what came before", () => {
    const tree = demoPageTree()
    const earlier: readonly SettingMove[] = [
      { nodeId: tree.root.id, key: "demo.a", from: "was", to: "is" },
      { nodeId: tree.root.id, key: "demo.b", from: "was", to: "is" },
    ]
    const moves: readonly SettingMove[] = [
      { nodeId: tree.root.id, key: "demo.a", from: "is", to: "was" },
    ]

    expect(reversesTheLastChange(moves, earlier)).toBe(false)
  })

  /**
   * A prop that was never there and a prop holding `null` are two different
   * facts, and `null` is a value `JsonValue` allows — so a change clearing one
   * must not read as the reverse of a change setting the other.
   */
  it("tells a cleared prop apart from one set to null", () => {
    const tree = demoPageTree()
    const earlier: readonly SettingMove[] = [{ nodeId: tree.root.id, key: "demo.a", to: null }]
    const clearing: readonly SettingMove[] = [{ nodeId: tree.root.id, key: "demo.a", from: null }]

    expect(reversesTheLastChange(clearing, earlier)).toBe(true)

    const wrong: readonly SettingMove[] = [
      { nodeId: tree.root.id, key: "demo.a", from: null, to: null },
    ]

    expect(reversesTheLastChange(wrong, earlier)).toBe(false)
  })

  it("is never going back when the change moved no setting at all", () => {
    const first = press(demoPageTree(), "palette")

    expect(reversesTheLastChange([], first.moves)).toBe(false)
  })
})

/**
 * The same question asked of a press nobody has made, which is what the ask
 * list needs and what the card could never give it.
 *
 * Driven through the demo's own presets against the demo's own page, for the
 * reason the suite above is: the claim is that **pressing the toggle a second
 * time is read as going back before it is pressed**, and a fixture would pass
 * while the panel went on offering the visitor their own undo as a new change.
 */
describe("whether a press would put the last change back", () => {
  it("reads the second press of a toggle as going back, before it happens", () => {
    const first = press(demoPageTree(), "palette")
    const plan = planOf("palette", first.tree)

    expect(wouldPutTheLastChangeBack(first.tree, deltaOf(first.tree, plan), first.moves)).toBe(true)
  })

  /**
   * And the first press is not, which is the assertion that keeps the arrival
   * screen's five promises exactly as they were written.
   */
  it("reads the first press of a toggle as going on", () => {
    const tree = demoPageTree()

    expect(
      wouldPutTheLastChangeBack(tree, deltaOf(tree, planOf("palette", tree)), undefined)
    ).toBe(false)
  })

  /**
   * A different toggle is not the way back, and this is the case a reading
   * written against *any* earlier change would get wrong: pressing the band
   * after the palette reverses nothing, and the page is still carrying both.
   */
  it("is not going back when the press moves a different setting", () => {
    const first = press(demoPageTree(), "palette")
    const plan = planOf("backdrop", first.tree)

    expect(wouldPutTheLastChangeBack(first.tree, deltaOf(first.tree, plan), first.moves)).toBe(
      false
    )
  })

  /**
   * And the removal path is untouched, which is the half of this surface that
   * never had the defect: *Take the numbers off* moves no setting, so nothing
   * pressed after it has put it back — the record's own **Put it back** is the
   * only thing that can, and it says so.
   */
  it("is not going back when the last change moved no setting", () => {
    const first = press(demoPageTree(), "trim")
    const plan = planOf("palette", first.tree)

    expect(wouldPutTheLastChangeBack(first.tree, deltaOf(first.tree, plan), first.moves)).toBe(
      false
    )
  })

  /**
   * No delta, no claim. An ask that reached no proposal has nothing to read a
   * direction off, and the silence is the one `willSayOf` already keeps about
   * the verdict itself.
   */
  it("claims nothing for an ask that reached no proposal", () => {
    const first = press(demoPageTree(), "palette")

    expect(wouldPutTheLastChangeBack(first.tree, undefined, first.moves)).toBe(false)
  })
})
