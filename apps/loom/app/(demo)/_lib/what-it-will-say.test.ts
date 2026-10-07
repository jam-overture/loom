import { describe, expect, it } from "vitest"

import {
  applyOperation,
  randomIdFactory,
  systemClock,
  withRoot,
  type CompositionOutcome,
  type StakeLevel,
} from "@jam-overture/loom"

import { STAKES } from "@/app/(portal)/_lib/vocabulary"

import { demoPageTree } from "./page-tree"
import { DEMO_LEADING_PRESET, DEMO_PRESETS, presetById } from "./presets"
import { settingsMoved } from "./put-back"
import {
  asksThatPutItBack,
  whatEachWillSay,
  whatItWillSay,
  willSayOf,
} from "./what-it-will-say"

/**
 * What the first screen says will happen, and whether it can be wrong.
 *
 * Two halves, deliberately split. `willSayOf` is a pure function over an
 * outcome and is tested with fabricated ones, so the *words* can be pinned
 * without a pipeline; `whatItWillSay` runs the real one against the real tree,
 * so the *verdict* can be pinned without reading any words.
 *
 * The third property — that this verdict is the one the press actually
 * produces — is `pipeline.test.ts`'s, because only that file has the write
 * path to compare against. It is the property the whole module rests on and it
 * is asserted where both sides of it exist rather than mocked here.
 */

/**
 * An outcome with only the field this module reads on it.
 *
 * Cast rather than built, and that is the honest shape: `willSayOf` takes one
 * level off the assessment and nothing else, so a fixture carrying a whole
 * proposal and a whole analysis would be claiming this function depends on
 * them. What it does depend on is asserted against the real pipeline below.
 */
const outcome = (
  kind: "applied" | "awaiting-confirmation" | "rejected",
  level: StakeLevel = "medium"
): CompositionOutcome =>
  ({ kind, assessment: { stakes: { level, factors: [] } } }) as unknown as CompositionOutcome

describe("willSayOf", () => {
  it("tells a visitor the press raises a question when the Gate will hold it", () => {
    const said = willSayOf(outcome("awaiting-confirmation"))

    expect(said?.lead).toBe("Pressing this raises a question, not a change.")
    expect(said?.moves).toBe(false)
  })

  /**
   * The row that matters most for a stranger, because it is the one that stops
   * the first press reading as a broken button. `DEMO_LEADING_PRESET` is held
   * by the demo's policy, so this is the sentence the arrival screen ships.
   */
  it("says the page will not move before Loom has asked", () => {
    const said = willSayOf(outcome("awaiting-confirmation"))

    expect(said?.detail).toContain("asks you before the page moves")
  })

  it("tells a visitor the page moves at once when the Gate will apply it", () => {
    const said = willSayOf(outcome("applied", "low"))

    expect(said?.lead).toBe("Pressing this changes the page straight away.")
    expect(said?.moves).toBe(true)
    expect(said?.detail).toContain("without stopping to ask")
  })

  it("says nothing will move when the Gate will refuse it", () => {
    const said = willSayOf(outcome("rejected", "critical"))

    expect(said?.lead).toBe("Loom will not make this change.")
    expect(said?.moves).toBe(false)
  })

  /**
   * And each of the three gets its **own** standing, which is the half of the
   * verdict a row and a count read instead of the sentence.
   *
   * Asserted separately from the sentences because it is a separate failure:
   * a standing that collapses two outcomes into one leaves every sentence on
   * the screen correct and makes the arithmetic over them wrong. The refusal
   * is the row that matters here — nothing on the shipped preset table reaches
   * it against the starting page, so a defect in that one branch is invisible
   * to every other test in this lane.
   */
  it("gives each of the three answers a standing of its own", () => {
    expect(willSayOf(outcome("awaiting-confirmation", "medium"))?.standing).toBe("asks-you")
    expect(willSayOf(outcome("applied", "low"))?.standing).toBe("on-its-own")
    expect(willSayOf(outcome("rejected", "critical"))?.standing).toBe("refuses")
  })

  /**
   * The level is the portal's word for it and not a fourth wording of one
   * scale. A visitor told *Some risk* here, the same visitor told *Some risk*
   * on the card one press later, and a reviewer told it in the queue are
   * looking at one product.
   */
  it("names the level in the shared table's words", () => {
    for (const level of ["low", "medium", "high", "critical"] as const satisfies readonly StakeLevel[]) {
      expect(willSayOf(outcome("awaiting-confirmation", level))?.detail).toContain(
        STAKES[level].label
      )
    }
  })

  /**
   * An ask that never reached the Gate has no verdict, and a panel inventing
   * one would be the surface answering a question the runtime never asked.
   * This is also what restores the fuller sentence above the button.
   */
  it("says nothing about an ask that never reached a verdict", () => {
    expect(
      willSayOf({ kind: "not-interpreted", error: { code: "refused", detail: "nothing to do" } })
    ).toBeUndefined()
    expect(
      willSayOf({
        kind: "not-applicable",
        proposal: {},
        error: { code: "node-not-found" },
      } as unknown as CompositionOutcome)
    ).toBeUndefined()
  })

  /**
   * Forward tense, on every string, which is the one thing this module must be
   * and the one thing every plain-language table it could have borrowed is
   * not: `RULE_SENTENCES` is written for a decision already taken, and
   * `within-policy` reads "so it went ahead on its own" — a false statement
   * about a button nobody has pressed.
   */
  it("speaks about a press that has not happened", () => {
    for (const kind of ["applied", "awaiting-confirmation", "rejected"] as const) {
      const said = willSayOf(outcome(kind))
      expect(`${said?.lead} ${said?.detail}`).not.toMatch(/\bwent\b|\bwas\b|\bdid it\b/)
    }
  })
})

describe("whatItWillSay", () => {
  /**
   * The real pipeline, the real tree, the real policy, no model and no store.
   * The demo's leading ask is chosen because the Gate holds it
   * (`DEMO_LEADING_PRESET`, and `pipeline.test.ts` pins that), so the arrival
   * screen's claim about it is the claim this surface is built on.
   */
  it("reaches a real verdict on the leading ask with no key and no session", async () => {
    const said = await whatItWillSay(
      demoPageTree(),
      DEMO_LEADING_PRESET,
      randomIdFactory,
      systemClock
    )

    expect(said?.moves).toBe(false)
    expect(said?.lead).toBe("Pressing this raises a question, not a change.")
  })

  /** Every preset the table offers reaches a verdict against the starting tree. */
  it("reaches a verdict on every preset the starting page can honour", async () => {
    for (const preset of DEMO_PRESETS) {
      if (preset.plan(demoPageTree(), randomIdFactory) === undefined) continue

      const said = await whatItWillSay(demoPageTree(), preset.id, randomIdFactory, systemClock)
      expect(said, preset.id).toBeDefined()
    }
  })

  /**
   * And the re-theme is the other half of the claim: not every ask waits for
   * you. It is the preset `session.ts` tuned the policy to let through, so a
   * surface that only ever printed *this one will wait* would be telling a
   * stranger half the governance model.
   */
  it("says a change the policy lets through moves the page at once", async () => {
    const said = await whatItWillSay(demoPageTree(), "palette", randomIdFactory, systemClock)

    expect(said?.moves).toBe(true)
    expect(said?.lead).toBe("Pressing this changes the page straight away.")
  })

  /** No ask, no verdict — so the page may hand it `rail.leading?.preset` raw. */
  it("says nothing when there is no leading ask", async () => {
    expect(
      await whatItWillSay(demoPageTree(), undefined, randomIdFactory, systemClock)
    ).toBeUndefined()
  })

  /**
   * It is a read. The tree it was handed is the tree it leaves behind — the
   * `applied` branch of `composeChange` computes a new one and this module
   * drops it, which is the whole reason a verdict may be reached on a render.
   */
  it("leaves the tree it was handed exactly as it found it", async () => {
    const tree = demoPageTree()
    const before = JSON.stringify(tree)

    await whatItWillSay(tree, "palette", randomIdFactory, systemClock)

    expect(JSON.stringify(tree)).toBe(before)
    expect(tree.revision).toBe(demoPageTree().revision)
  })

  /** An id that is not a preset is not a crash and not a sentence. */
  it("says nothing about an ask it does not have", async () => {
    expect(presetById("not-a-preset")).toBeUndefined()
    expect(
      await whatItWillSay(
        demoPageTree(),
        "not-a-preset" as never,
        randomIdFactory,
        systemClock
      )
    ).toBeUndefined()
  })
})

describe("whatEachWillSay", () => {
  const ALL = DEMO_PRESETS.map((preset) => preset.id)

  /**
   * The whole panel, answered, with no key, no store and no session — which is
   * the property that lets the arrival screen state a split at all. A demo that
   * only demonstrates when a key is present is not a demo.
   */
  it("reaches a verdict on every ask the panel is offering", async () => {
    const says = await whatEachWillSay(demoPageTree(), ALL, randomIdFactory, systemClock)

    expect(Object.keys(says).sort()).toEqual([...ALL].sort())
    for (const id of ALL) expect(says[id]?.standing, id).toBeDefined()
  })

  /**
   * And the answers are not all the same, which is the only reason any of this
   * is worth printing. If every ask got the same verdict the sentence above the
   * button would be a claim again.
   */
  it("gives the starting page two answers it goes ahead with and three it stops for", async () => {
    const says = await whatEachWillSay(demoPageTree(), ALL, randomIdFactory, systemClock)
    const standings = Object.values(says).map((said) => said.standing)

    expect(standings.filter((standing) => standing === "on-its-own")).toHaveLength(2)
    expect(standings.filter((standing) => standing === "asks-you")).toHaveLength(3)
  })

  /** It answers what it is handed and invents nothing about what it is not. */
  it("answers only the asks on offer", async () => {
    const says = await whatEachWillSay(
      demoPageTree(),
      ["palette", "trim"],
      randomIdFactory,
      systemClock
    )

    expect(Object.keys(says).sort()).toEqual(["palette", "trim"])
  })

  it("says nothing at all when nothing is on offer", async () => {
    expect(await whatEachWillSay(demoPageTree(), [], randomIdFactory, systemClock)).toEqual({})
  })

  /**
   * Five runs of the Gate on one render, and the tree they were run against is
   * handed on untouched. `composeChange` computes a tree in the applied branch
   * and this module drops it — once per ask now rather than once per render,
   * which is the part of this change worth pinning rather than trusting.
   */
  it("leaves the tree exactly as it found it, after answering all five", async () => {
    const tree = demoPageTree()
    const before = JSON.stringify(tree)

    await whatEachWillSay(tree, ALL, randomIdFactory, systemClock)

    expect(JSON.stringify(tree)).toBe(before)
  })
})

/**
 * The direction, which is the one thing about an offered ask that the preset
 * table cannot know — it is a fact about what the visitor has already done.
 *
 * Driven through `whatEachWillSay` against a tree a press has really moved,
 * because the claim is about the **panel after a press**, which is the screen
 * the defect lives on: both unattended presets are toggles, so an applied one
 * is applicable again in the other direction and returns to the list wearing
 * the promise it shipped with.
 */
describe("whether a press would put the last change back", () => {
  const ALL = DEMO_PRESETS.map((preset) => preset.id)

  const pressed = (id: "palette" | "backdrop" | "band") => {
    const tree = demoPageTree()
    const preset = presetById(id)
    const operations = preset?.plan(tree, randomIdFactory)
    if (!operations) throw new Error(`preset ${id} planned nothing`)

    return {
      moves: settingsMoved(tree, {
        deltaId: randomIdFactory.deltaId(),
        treeId: tree.treeId,
        baseRevision: tree.revision,
        operations,
      }),
      tree: operations.reduce((current, operation) => {
        const next = applyOperation(current.root, operation)
        if (!next.ok || next.value.kind !== "element") throw new Error("did not apply")

        return withRoot(current, next.value)
      }, tree),
    }
  }

  /** Nothing has happened, so nothing can be put back. */
  it("says no of every ask on the arrival screen", async () => {
    const says = await whatEachWillSay(demoPageTree(), ALL, randomIdFactory, systemClock)

    expect(Object.values(says).every((said) => said.putsBack === false)).toBe(true)
  })

  /**
   * The screen the defect is on: one press of the palette, and the panel
   * offering the same row again. Exactly one of the five is the way back, and
   * it is the one that was just pressed.
   */
  it("marks the toggle that was just pressed, and only it", async () => {
    const after = pressed("palette")
    const says = await whatEachWillSay(
      after.tree,
      ALL,
      randomIdFactory,
      systemClock,
      after.moves
    )

    expect(says.palette?.putsBack).toBe(true)
    expect(asksThatPutItBack(says)).toEqual(new Set(["palette"]))
  })

  /**
   * And the verdict beside it is untouched, which is the restraint the row
   * depends on: the Gate weighs a press that puts something back exactly as it
   * weighs any other, so the chip keeps saying what the Gate said and only the
   * promise moves.
   */
  it("leaves the Gate's own answer exactly as it was", async () => {
    const after = pressed("palette")
    const says = await whatEachWillSay(
      after.tree,
      ALL,
      randomIdFactory,
      systemClock,
      after.moves
    )

    expect(says.palette?.standing).toBe("on-its-own")
    expect(says.palette?.moves).toBe(true)
    expect(says.palette?.lead).toBe("Pressing this changes the page straight away.")
  })

  /**
   * A history nobody handed in is the arrival screen's answer rather than a
   * missing check — which is what keeps `page.tsx` honest: the records are the
   * only source of it, and forgetting to pass them reads as *nothing happened*
   * rather than as *everything is new*.
   */
  it("says no when the history is not handed in at all", async () => {
    const after = pressed("palette")
    const says = await whatEachWillSay(after.tree, ALL, randomIdFactory, systemClock)

    expect(says.palette?.putsBack).toBe(false)
  })
})
