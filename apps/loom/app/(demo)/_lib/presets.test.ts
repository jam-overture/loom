import { describe, expect, it } from "vitest"

import { applyDelta, sequentialIdFactory, systemClock, type LoomTree, type TreeOperation } from "@jam-overture/loom"

import { DEMO_ALTERNATE_THEME, DEMO_THEME_NODE_PROP, demoPageTree } from "./page-tree"
import type { ChangeRecord } from "./record"
import {
  askedWith,
  availablePresets,
  DEMO_LEADING_PRESET,
  DEMO_OPENING_PRESET,
  DEMO_PRESETS,
  leadingAsk,
  offeredPresets,
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

  /**
   * And the same of the one the demo opens with, where the fallback would be
   * even quieter: a `DEMO_OPENING_PRESET` the starting tree cannot honour
   * promotes whatever is first in the table onto the green button of the one
   * screen every visitor sees, with nothing failing.
   */
  it("opens with one this page can honour too", () => {
    const tree = demoPageTree()

    expect(presetById(DEMO_OPENING_PRESET)).toBeDefined()
    expect(availablePresets(tree, ids)).toContain(DEMO_OPENING_PRESET)
  })

  /**
   * **The opening press changes the page a visitor is looking at**, which is
   * the property the order was chosen for and the one the id alone does not
   * carry. Its single operation configures the root, so every primitive under
   * it repaints at once and none of the change is below the fold — and it is
   * also why `partTheAskWouldTouch` draws no excerpt under the green button on
   * arrival (`before-the-press.ts` says so, and `before-the-press.test.ts`
   * holds it).
   */
  it("opens with a change to the page itself rather than to a part of it", () => {
    const tree = demoPageTree()
    const operations = presetById(DEMO_OPENING_PRESET)?.plan(tree, ids)

    expect(operations).toBeDefined()
    for (const operation of operations ?? []) {
      expect("nodeId" in operation ? operation.nodeId : undefined).toBe(tree.root.id)
    }
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

/**
 * Which button an ask came from, kept because nothing else can give it back.
 *
 * The runtime is handed `preset.utterance` — a sentence a person would have
 * typed, deliberately — so the log has no idea a button produced it. Recovering
 * it by matching the utterance against this table afterwards would be the
 * surface pattern-matching a string to get back something it knew and dropped,
 * which is the move `undo.ts` refuses for the same reason.
 */
describe("stamping a record with the suggestion it came from", () => {
  const RECORD: ChangeRecord = {
    recordId: "i_1",
    askedAt: "2026-09-06T00:00:00.000Z",
    utterance: "Take the numbers band off the page.",
    origin: "user-instruction",
    outcome: "awaiting-you",
    repaired: false,
    touched: [],
  }

  it("names the preset and changes nothing else", () => {
    expect(askedWith(RECORD, "trim")).toEqual({ ...RECORD, presetId: "trim" })
  })

  /** And the id it stamps is one this table can still find, which is what the
   * ask-again form posts back. */
  it("stamps an id the table can resolve", () => {
    for (const preset of DEMO_PRESETS) {
      expect(presetById(askedWith(RECORD, preset.id).presetId ?? "")).toBe(preset)
    }
  })
})

/**
 * Which ask gets the green button, out of the ones this tree can honour.
 *
 * **The nomination moved out of `ask-panel.tsx` and this is why it is worth a
 * table of its own.** Two callers need the same answer now — the panel, to put
 * a button in the primary slot, and the rail, to show a stranger the part of
 * the page that button would touch — and a panel previewing one ask while
 * offering another is a defect no render test can see, because each half is
 * correct about itself.
 */
describe("the ask that leads", () => {
  const ALL = DEMO_PRESETS.map((preset) => preset.id)

  /**
   * The arrival screen, which is the half of the nomination this run added.
   *
   * A stranger's first press has to move the page, because the claim this
   * surface is making is that the page really changes and nothing on the
   * screen has yet shown it. `presets.ts` carries the argument and the
   * measurement it overturned.
   */
  it("opens with the ask that moves the page, before anything of the visitor's has", () => {
    expect(leadingAsk(ALL, false)?.id).toBe(DEMO_OPENING_PRESET)
  })

  /**
   * And the handover, which is the other half: once the visitor has watched a
   * press turn the page over, the green button goes to the one the Gate holds
   * — the claim the demo is actually about, read now as a refusal rather than
   * as a button that did nothing.
   */
  it("hands the green button to the Gate's ask once a change of theirs has landed", () => {
    expect(leadingAsk(ALL, true)?.id).toBe(DEMO_LEADING_PRESET)
  })

  /**
   * The two nominations are different presets, and that is the whole of what
   * makes the demo a sequence rather than one button pressed twice.
   *
   * Asserted rather than assumed because the collapse is deliberate and
   * cheap: setting `DEMO_OPENING_PRESET` to `DEMO_LEADING_PRESET` restores
   * exactly the single lead this replaced, and a run that takes that option
   * should fail here and say so rather than leave two records arguing for an
   * order the code no longer has.
   */
  it("nominates two different asks, which is what makes it a sequence", () => {
    expect(DEMO_OPENING_PRESET).not.toBe(DEMO_LEADING_PRESET)
  })

  /**
   * A tree that has already lost its stat grid still has four asks, and a
   * stranger still needs one of them to be the obvious first move. Falling back
   * to nothing would leave an arrival screen with four equal grey buttons,
   * which is the state this panel was rebuilt out of.
   */
  it("falls back to the first of the table rather than to nothing", () => {
    const without = ALL.filter((id) => id !== DEMO_LEADING_PRESET)

    expect(leadingAsk(without, true)).toBeDefined()
    expect(leadingAsk(without, true)?.id).toBe(offeredPresets(without)[0]?.id)
  })

  /** And the same fallback on the arrival screen, where the other one is spent. */
  it("falls back on arrival too, rather than opening with nothing", () => {
    const without = ALL.filter((id) => id !== DEMO_OPENING_PRESET)

    expect(leadingAsk(without, false)?.id).toBe(offeredPresets(without)[0]?.id)
  })

  /** It is always one of the asks on offer, which is the join every caller makes. */
  it("never nominates an ask the tree cannot honour", () => {
    for (const id of ALL) {
      expect(leadingAsk([id], false)?.id).toBe(id)
      expect(leadingAsk([id], true)?.id).toBe(id)
    }

    expect(leadingAsk([], false)).toBeUndefined()
    expect(leadingAsk([], true)).toBeUndefined()
  })

  /** The order the panel lists them in is the table's, not `available`'s. */
  it("keeps the table's order when it filters", () => {
    const shuffled = [...ALL].reverse()

    expect(offeredPresets(shuffled).map((preset) => preset.id)).toEqual(ALL)
  })
})
