import { describe, expect, it } from "vitest"

import { applyDelta, sequentialIdFactory, systemClock, type LoomTree, type TreeOperation } from "@loom/runtime"

import { DEMO_ALTERNATE_THEME, DEMO_THEME_NODE_PROP, demoPageTree } from "./page-tree"
import {
  availablePresets,
  DEMO_LEADING_PRESET,
  DEMO_PRESETS,
  presetById,
  presetInterpreter,
  PRESET_INTERPRETER,
} from "./presets"

/**
 * The presets, as planning functions.
 *
 * They are pure — a tree in, operations out — which is what lets the whole
 * scripted half of the demo be checked without a store, a request or a key.
 * What they must never do is produce operations that do not apply: a chip whose
 * only outcome is a diagnostic would be a demo of the runtime failing.
 */

const ids = sequentialIdFactory("test")

const planOf = (id: string, tree: LoomTree): readonly TreeOperation[] => {
  const preset = presetById(id)
  if (!preset) throw new Error(`no preset ${id}`)

  const operations = preset.plan(tree, ids)
  if (!operations) throw new Error(`preset ${id} planned nothing`)

  return operations
}

const applied = (tree: LoomTree, operations: readonly TreeOperation[]): LoomTree => {
  const result = applyDelta(tree, {
    deltaId: ids.deltaId(),
    treeId: tree.treeId,
    baseRevision: tree.revision,
    operations,
  })

  if (!result.ok) throw new Error(`the delta did not apply: ${result.error.code}`)

  return result.value
}

describe("every preset", () => {
  it("produces a delta that applies to the page it was planned against", () => {
    for (const preset of DEMO_PRESETS) {
      const tree = demoPageTree()
      const operations = preset.plan(tree, ids)

      expect(operations, preset.id).toBeDefined()
      expect(() => applied(tree, operations ?? []), preset.id).not.toThrow()
    }
  })

  it("says what it will do in words a person would have typed", () => {
    for (const preset of DEMO_PRESETS) {
      expect(preset.utterance.length, preset.id).toBeGreaterThan(10)
      expect(preset.rationale.length, preset.id).toBeGreaterThan(40)
    }
  })

  /** Between them they exercise all four delta operations, which is the point. */
  it("covers every operation the delta model has", () => {
    const tree = demoPageTree()
    const ops = new Set(DEMO_PRESETS.flatMap((preset) => (preset.plan(tree, ids) ?? []).map((op) => op.op)))

    expect([...ops].sort()).toEqual(["configure", "insert", "move", "remove"])
  })
})

describe("the preset that leads", () => {
  /**
   * The panel falls back to whatever is first in `offered` when the nominated
   * preset is not among them, so a lead the starting tree cannot honour would
   * not throw or render an empty slot — it would quietly promote the re-theme
   * and take the demo's best moment with it, on the arrival screen only, where
   * nobody would see a failing test.
   */
  it("is one this page can actually honour on arrival", () => {
    const tree = demoPageTree()

    expect(presetById(DEMO_LEADING_PRESET)).toBeDefined()
    expect(availablePresets(tree, ids)).toContain(DEMO_LEADING_PRESET)
  })
})

describe("the re-theme preset", () => {
  it("configures the root and nothing else", () => {
    const tree = demoPageTree()
    const [operation, ...rest] = planOf("palette", tree)

    expect(rest).toEqual([])
    expect(operation).toMatchObject({ op: "configure", nodeId: tree.root.id })
  })

  it("swaps to the other palette, and back again", () => {
    const first = applied(demoPageTree(), planOf("palette", demoPageTree()))

    expect(first.root.props[DEMO_THEME_NODE_PROP]).toEqual(DEMO_ALTERNATE_THEME)

    const second = applied(first, planOf("palette", first))

    expect(second.root.props[DEMO_THEME_NODE_PROP]).toEqual(demoPageTree().root.props[DEMO_THEME_NODE_PROP])
  })
})

describe("the structural presets", () => {
  it("removes the stat grid and everything in it", () => {
    const tree = demoPageTree()
    const after = applied(tree, planOf("trim", tree))
    const types = JSON.stringify(after.root)

    expect(types).not.toContain("loom.stat-grid")
    expect(types).not.toContain("loom.stat")
  })

  it("stops offering the removal once there is nothing left to remove", () => {
    const tree = demoPageTree()
    const after = applied(tree, planOf("trim", tree))

    expect(availablePresets(tree, ids)).toContain("trim")
    expect(availablePresets(after, ids)).not.toContain("trim")
  })

  it("moves the quote without changing its id", () => {
    const tree = demoPageTree()
    const before = JSON.stringify(tree.root.children.find((child) => child.kind === "element" && child.type === "loom.quote"))
    const after = applied(tree, planOf("promote", tree))
    const moved = after.root.children[1]

    expect(moved?.kind).toBe("element")
    expect(JSON.stringify(moved)).toBe(before)
  })

  it("stops offering the move once the quote is already there", () => {
    const tree = demoPageTree()
    const after = applied(tree, planOf("promote", tree))

    expect(availablePresets(after, ids)).not.toContain("promote")
  })

  it("inserts a band without disturbing anything already on the page", () => {
    const tree = demoPageTree()
    const after = applied(tree, planOf("band", tree))

    expect(after.root.children).toHaveLength(tree.root.children.length + 1)
    expect(JSON.stringify(after.root.children[0])).toBe(JSON.stringify(tree.root.children[0]))
  })
})

describe("a preset as an interpreter", () => {
  const preset = presetById("palette")

  it("proposes against the tree it is handed, not the one the chip was drawn from", async () => {
    if (!preset) throw new Error("missing preset")

    const tree = demoPageTree()
    const moved = applied(tree, planOf("band", tree))
    const interpreter = presetInterpreter(preset, ids, systemClock)

    const proposed = await interpreter.interpret(
      {
        intentId: ids.intentId(),
        treeId: moved.treeId,
        baseRevision: moved.revision,
        origin: "user-instruction",
        utterance: preset.utterance,
        observedAt: systemClock.now(),
      },
      moved
    )

    expect(proposed.ok).toBe(true)
    if (proposed.ok) expect(proposed.value.delta.baseRevision).toBe(moved.revision)
  })

  /**
   * A computed delta is not a guess, and provenance has to say so — otherwise
   * calibration reads a preset's certainty as a model's perfect record (0031).
   */
  it("attributes itself to the runtime, at a confidence it has actually earned", async () => {
    if (!preset) throw new Error("missing preset")

    const tree = demoPageTree()
    const proposed = await presetInterpreter(preset, ids, systemClock).interpret(
      {
        intentId: ids.intentId(),
        treeId: tree.treeId,
        baseRevision: 0,
        origin: "user-instruction",
        actor: "a demo visitor",
        utterance: preset.utterance,
        observedAt: systemClock.now(),
      },
      tree
    )

    expect(proposed.ok).toBe(true)
    if (!proposed.ok) return

    expect(proposed.value.provenance.authoredBy).toBe("runtime")
    expect(proposed.value.provenance.confidence).toBe(1)
    expect(proposed.value.provenance.interpreter).toBe(PRESET_INTERPRETER)
    expect(proposed.value.provenance.actor).toBe("a demo visitor")
  })

  it("declines rather than proposing nothing when the page gives it nothing to do", async () => {
    const promote = presetById("promote")
    if (!promote) throw new Error("missing preset")

    const tree = demoPageTree()
    const alreadyThere = applied(tree, planOf("promote", tree))

    const proposed = await presetInterpreter(promote, ids, systemClock).interpret(
      {
        intentId: ids.intentId(),
        treeId: alreadyThere.treeId,
        baseRevision: alreadyThere.revision,
        origin: "user-instruction",
        utterance: promote.utterance,
        observedAt: systemClock.now(),
      },
      alreadyThere
    )

    expect(proposed.ok).toBe(false)
    if (!proposed.ok) expect(proposed.error.code).toBe("refused")
  })
})
