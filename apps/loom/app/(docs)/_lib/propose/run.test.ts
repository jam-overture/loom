import { sequentialIdFactory, type LoomTree } from "@jam-overture/loom"
import { describe, expect, it } from "vitest"

import { docsExamples } from "../examples/catalogue"

import { docsGatePolicy, DOCS_POLICY_ID } from "./policy"
import { availableDocsPresets, DOCS_PRESETS, docsPresetById } from "./presets"
import {
  answerDocsHold,
  askDocsChange,
  DOCS_READER,
  docsChangeNamespace,
  readDocsLog,
  treeAfter,
  undoDocsRevision,
  type DocsChange,
} from "./run"
import { openDocsSession, type DocsSession } from "./session"

/**
 * What the propose-a-change box promises, held to it.
 *
 * §4c settles that every example has a working box beside it, and "working"
 * here means something specific: the change a reader asks for goes through the
 * runtime's own pipeline and the verdict on the page is the Gate's, not a
 * caption. So these tests assert the *verdicts*, and they assert them from the
 * same functions the component calls — a page that showed "requires
 * confirmation" beside a change the Gate accepts would be the worst kind of
 * documentation, and there is no way to notice that by looking at it.
 *
 * Since the site gained a store, they assert one thing more: that what reaches
 * the **log** is what the Gate allowed and nothing else. A refusal a reader can
 * see and a refusal the record forgot are different failures, and only the
 * second is invisible.
 */

/** One example, opened on a store, with a step counter that reads like a session. */
type Harness = {
  readonly exampleId: string
  readonly session: DocsSession
  readonly seed: LoomTree
  step: number
}

const open = async (exampleId: string): Promise<Harness> => {
  const example = docsExamples.get(exampleId)
  if (example === undefined) throw new Error(`no example is registered as "${exampleId}"`)

  const seed = example.build()

  return { exampleId, session: await openDocsSession(seed), seed, step: 1 }
}

const head = async (harness: Harness): Promise<LoomTree> => {
  const found = await harness.session.store.head(harness.session.treeId)
  if (!found.ok) throw new Error(found.error.code)

  return found.value
}

const ask = async (harness: Harness, presetId: string): Promise<DocsChange> => {
  const preset = docsPresetById(presetId)
  if (preset === undefined) throw new Error(`no preset is registered as "${presetId}"`)

  return askDocsChange({
    session: harness.session,
    exampleId: harness.exampleId,
    tree: await head(harness),
    preset,
    step: harness.step++,
  })
}

const undo = (harness: Harness, revision: number): Promise<DocsChange> =>
  undoDocsRevision({
    session: harness.session,
    exampleId: harness.exampleId,
    revision,
    step: harness.step++,
  })

describe("the documentation's Gate policy", () => {
  it("names itself, so a disposition can say what judged it", () => {
    expect(docsGatePolicy.policyId).toBe(DOCS_POLICY_ID)
  })

  it("protects the primitive the pages say it protects", () => {
    expect(docsGatePolicy.protectedPrimitiveTypes).toContain("loom.heading")
  })

  /**
   * The point of deriving it. A hand-written map would still contain
   * `loom.card` on the day the library gave a second primitive an `href`, and
   * nothing would say so.
   */
  it("derives its interactive vocabulary from what the primitives declared", () => {
    expect(docsGatePolicy.interactiveTypes["loom.action"]).toBe("always")
    expect(docsGatePolicy.interactiveTypes["loom.card"]).toEqual({ whenProps: ["href"] })
  })
})

describe("a change the Gate is happy with", () => {
  it("is committed, and the tree it returns has one more revision", async () => {
    const harness = await open("first-tree")
    const before = await head(harness)
    const change = await ask(harness, "add-a-sentence")

    expect(change.outcome.kind).toBe("committed")
    expect(treeAfter(before, change).revision).toBe(before.revision + 1)
  })

  /**
   * The half `composeChange` alone could not do. The tree on the page is the
   * store's, and the store agrees with it (0017's "the log is the one that is
   * right", checked rather than trusted).
   */
  it("reaches the store, so the head a reader sees is the one that was written", async () => {
    const harness = await open("first-tree")
    const change = await ask(harness, "add-a-sentence")

    if (change.outcome.kind !== "committed") throw new Error(change.outcome.kind)

    expect((await head(harness)).revision).toBe(1)
    expect(change.outcome.tree).toEqual(await head(harness))
  })

  it("says which policy judged it and who authored the proposal", async () => {
    const harness = await open("first-tree")
    const change = await ask(harness, "retheme")

    if (change.outcome.kind !== "committed") throw new Error(change.outcome.kind)

    expect(change.outcome.disposition.policyId).toBe(DOCS_POLICY_ID)
    expect(change.outcome.proposal.provenance.authoredBy).toBe("runtime")
  })

  /**
   * The claim the site makes about themes, checked rather than asserted in
   * prose: re-theming is one node, one prop, and the whole page moves.
   */
  it("re-themes the page by configuring exactly one node", async () => {
    const harness = await open("first-tree")
    const change = await ask(harness, "retheme")

    if (change.assessment === undefined) throw new Error("nothing was assessed")

    const { analysis } = change.assessment

    expect(analysis.configuredNodeCount).toBe(1)
    expect(analysis.insertedNodeCount + analysis.removedNodeCount + analysis.movedNodeCount).toBe(0)
  })

  it("carries the inverse the runtime would undo it with", async () => {
    const harness = await open("first-tree")
    const change = await ask(harness, "add-a-sentence")

    if (change.outcome.kind !== "committed") throw new Error(change.outcome.kind)

    expect(change.outcome.inverse.operations.length).toBeGreaterThan(0)
  })
})

describe("the log a change leaves behind", () => {
  it("records the asker, the interpreter and the shape of what was done", async () => {
    const harness = await open("first-tree")

    await ask(harness, "add-a-sentence")

    const [entry] = await readDocsLog(harness.session)
    if (entry === undefined) throw new Error("the log is empty")

    expect(entry.revision).toBe(1)
    expect(entry.verbs).toEqual(["insert"])
    expect(entry.stored.provenance.actor).toBe(DOCS_READER)
    expect(entry.stored.provenance.interpreter).toBe("loom/docs-preset")
  })

  it("reads newest first, because that is the end a reader is looking at", async () => {
    const harness = await open("first-tree")

    await ask(harness, "add-a-sentence")
    await ask(harness, "retheme")

    expect((await readDocsLog(harness.session)).map((entry) => entry.revision)).toEqual([2, 1])
  })

  /**
   * The property that makes the log worth showing. A refused change is visible
   * to the reader who asked for it and absent from the record, because nothing
   * happened — which is the difference between a log and a transcript.
   */
  it("has nothing in it after a refusal", async () => {
    const harness = await open("first-tree")
    const change = await ask(harness, "remove-the-heading")

    expect(change.outcome.kind).toBe("refused")
    expect(await readDocsLog(harness.session)).toEqual([])
    expect((await head(harness)).revision).toBe(0)
  })

  /** Nor after a hold, which is a change nobody has answered yet. */
  it("has nothing in it while a change is held", async () => {
    const harness = await open("first-tree")
    const change = await ask(harness, "demote-the-heading")

    expect(change.outcome.kind).toBe("held")
    expect(await readDocsLog(harness.session)).toEqual([])
  })
})

describe("a change that touches what this deployment protects", () => {
  it("is held for a person rather than applied", async () => {
    const harness = await open("first-tree")
    const change = await ask(harness, "demote-the-heading")

    expect(change.outcome.kind).toBe("held")

    if (change.outcome.kind !== "held") return

    expect(change.outcome.held.disposition.reason.code).toBe("stakes-above-ceiling")
    expect(change.assessment?.stakes.factors.map((factor) => factor.code)).toContain(
      "protected-type-touched"
    )
  })

  it("applies when the reader answers the hold", async () => {
    const harness = await open("first-tree")
    const change = await ask(harness, "demote-the-heading")
    const answered = await answerDocsHold({
      session: harness.session,
      exampleId: harness.exampleId,
      change,
    })

    expect(answered.outcome.kind).toBe("committed")
    expect((await head(harness)).revision).toBe(1)
  })

  /**
   * 0029, on the page. Who asked and who allowed are two different people in
   * the general case, and a log that recorded only the first would make every
   * confirmed change look like somebody waving through their own request.
   */
  it("records who allowed it separately from who asked", async () => {
    const harness = await open("first-tree")
    const change = await ask(harness, "demote-the-heading")

    await answerDocsHold({ session: harness.session, exampleId: harness.exampleId, change })

    const [entry] = await readDocsLog(harness.session)
    if (entry === undefined) throw new Error("the log is empty")

    expect(entry.stored.answeredBy).toBe(DOCS_READER)
    expect(entry.stored.provenance.actor).toBe(DOCS_READER)
  })

  /** A change nobody had to allow carries no approver, and is never back-filled. */
  it("leaves the approver off a change the Gate accepted outright", async () => {
    const harness = await open("first-tree")

    await ask(harness, "add-a-sentence")

    const [entry] = await readDocsLog(harness.session)

    expect(entry?.stored.answeredBy).toBeUndefined()
  })

  /**
   * Both halves of the run are kept, because the page shows the reader what
   * they answered as well as what happened next.
   */
  it("keeps the events from before the hold as well as after it", async () => {
    const harness = await open("first-tree")
    const change = await ask(harness, "demote-the-heading")
    const answered = await answerDocsHold({
      session: harness.session,
      exampleId: harness.exampleId,
      change,
    })

    expect(answered.events.length).toBeGreaterThan(change.events.length)
  })

  /** Custody ends on the first answer, so a second press cannot apply it twice. */
  it("cannot be answered twice", async () => {
    const harness = await open("first-tree")
    const change = await ask(harness, "demote-the-heading")

    await answerDocsHold({ session: harness.session, exampleId: harness.exampleId, change })

    const again = await answerDocsHold({
      session: harness.session,
      exampleId: harness.exampleId,
      change,
    })

    expect(again.outcome.kind).toBe("not-answerable")
    expect((await head(harness)).revision).toBe(1)
  })
})

describe("a change the Gate refuses outright", () => {
  it("refuses to destroy a protected primitive, and says why", async () => {
    const harness = await open("first-tree")
    const change = await ask(harness, "remove-the-heading")

    expect(change.outcome.kind).toBe("refused")

    if (change.outcome.kind !== "refused") return

    expect(change.outcome.disposition.reason.code).toBe("stakes-at-refusal-floor")
    expect(change.assessment?.stakes.factors.map((factor) => factor.code)).toContain(
      "protected-type-removed"
    )
  })

  /**
   * The interesting refusal: the operation names the card and the damage is at
   * the button three nodes below it. Nothing but the resulting tree shows it.
   */
  it("refuses a configure that would leave a target inside a target", async () => {
    const harness = await open("a-card-and-a-control")
    const change = await ask(harness, "link-the-card")

    expect(change.outcome.kind).toBe("refused")

    if (change.assessment === undefined) throw new Error("nothing was assessed")

    const { analysis, stakes } = change.assessment

    expect(analysis.configuredNodeCount).toBe(1)
    expect(analysis.nestedTargets.length).toBe(1)
    expect(stakes.factors.map((factor) => factor.code)).toContain("nested-target")
  })

  it("leaves the tree exactly as it was", async () => {
    const harness = await open("first-tree")
    const before = await head(harness)
    const change = await ask(harness, "remove-the-heading")

    expect(treeAfter(before, change)).toBe(before)
  })
})

describe("undo, which is a proposal like any other", () => {
  it("puts the page back and advances the revision rather than rewinding it", async () => {
    const harness = await open("first-tree")

    await ask(harness, "add-a-sentence")

    const undone = await undo(harness, 1)

    expect(undone.outcome.kind).toBe("committed")

    const after = await head(harness)

    expect(after.revision).toBe(2)
    expect(after.root).toEqual(harness.seed.root)
  })

  /** The whole of 0032: nothing takes a private route, so the undo is in the log too. */
  it("appends itself to the log, planned by the revert interpreter", async () => {
    const harness = await open("first-tree")

    await ask(harness, "add-a-sentence")
    await undo(harness, 1)

    const [newest] = await readDocsLog(harness.session)

    expect(newest?.revision).toBe(2)
    expect(newest?.stored.provenance.interpreter).toBe("loom/revert")
    expect(newest?.stored.provenance.authoredBy).toBe("runtime")
  })

  it("is itself undoable, which is what makes it a change rather than an escape", async () => {
    const harness = await open("first-tree")

    await ask(harness, "add-a-sentence")
    await undo(harness, 1)
    await undo(harness, 2)

    const after = await head(harness)

    expect(after.revision).toBe(3)
    expect(after.root.children.length).toBe(harness.seed.root.children.length + 1)
  })

  /**
   * 0035. Undoing a revision something later built on is offered, not refused —
   * and the plan says what it would write over, so the box can say so before a
   * reader presses it.
   */
  it("declares the later work it would write over", async () => {
    const harness = await open("first-tree")

    await ask(harness, "add-a-sentence")
    await ask(harness, "reorder-the-page")

    const [, oldest] = await readDocsLog(harness.session)

    if (oldest?.undo.outcome !== "revertable") throw new Error("revision 1 should be revertable")

    expect(oldest.undo.discards.map((work) => work.revision)).toEqual([2])
  })

  it("offers a clean undo of the newest revision with nothing discarded", async () => {
    const harness = await open("first-tree")

    await ask(harness, "add-a-sentence")
    await ask(harness, "reorder-the-page")

    const [newest] = await readDocsLog(harness.session)

    if (newest?.undo.outcome !== "revertable") throw new Error("revision 2 should be revertable")

    expect(newest.undo.discards).toEqual([])
  })

  it("cannot undo a revision the log does not have", async () => {
    const harness = await open("first-tree")
    const undone = await undo(harness, 7)

    expect(undone.outcome.kind).toBe("not-revertable")
  })
})

describe("an ask written against a page that has moved", () => {
  /**
   * The check `commitIntent` does before spending anything: an intent naming a
   * revision head has passed is refused where it stands, rather than producing
   * a delta destined to be inapplicable.
   */
  it("is refused by the write path, and the tree is untouched", async () => {
    const harness = await open("first-tree")
    const stale = await head(harness)

    await ask(harness, "add-a-sentence")

    const preset = docsPresetById("add-a-sentence")
    if (preset === undefined) throw new Error("missing preset")

    const change = await askDocsChange({
      session: harness.session,
      exampleId: harness.exampleId,
      tree: stale,
      preset,
      step: 9,
    })

    expect(change.outcome.kind).toBe("not-written")
    expect((await head(harness)).revision).toBe(1)
  })
})

describe("a preset with nothing to do", () => {
  /**
   * Never offered rather than offered and declining. A button whose only
   * outcome is "nothing changed" teaches a reader that the Gate is arbitrary.
   */
  it("is not among the chips a tree is offered", async () => {
    const harness = await open("first-tree")
    const offered = availableDocsPresets(harness.seed, sequentialIdFactory("probe"))

    expect(offered).not.toContain("link-the-card")
    expect(offered).toContain("add-a-sentence")
  })

  it("is offered on the tree that gives it something to do", async () => {
    const harness = await open("a-card-and-a-control")
    const offered = availableDocsPresets(harness.seed, sequentialIdFactory("probe"))

    expect(offered).toContain("link-the-card")
  })
})

describe("the ids a change mints", () => {
  it("cannot collide with the ids the example already used", () => {
    expect(docsChangeNamespace("first-tree", 1)).toBe("firsttreec1")
    expect(docsChangeNamespace("a-container-and-its-children", 2)).toBe("acontainerandits" + "c2")
  })

  it("fits the id grammar, which is stricter than it looks", () => {
    for (const example of docsExamples.values()) {
      for (const step of [1, 9, 99]) {
        expect(`n_${docsChangeNamespace(example.id, step)}1`).toMatch(/^n_[0-9a-z]{1,32}$/)
      }
    }
  })
})

describe("every preset", () => {
  it("plans against at least one documented example", () => {
    for (const preset of DOCS_PRESETS) {
      const planned = [...docsExamples.values()].some(
        (example) => (preset.plan(example.build(), sequentialIdFactory("probe")) ?? []).length > 0
      )

      expect(planned, `no example gives "${preset.id}" anything to do`).toBe(true)
    }
  })

  /**
   * The property that separates this from a script beside the runtime: the
   * second click is planned against the page as it is, not as it was.
   */
  it("re-plans against the tree it is handed", async () => {
    const harness = await open("first-tree")

    await ask(harness, "add-a-sentence")

    const before = await head(harness)
    const second = await ask(harness, "add-a-sentence")

    if (second.outcome.kind !== "committed") throw new Error(second.outcome.kind)

    expect(second.outcome.proposal.delta.baseRevision).toBe(before.revision)
    expect(second.outcome.tree.root.children.length).toBe(before.root.children.length + 1)
  })
})
