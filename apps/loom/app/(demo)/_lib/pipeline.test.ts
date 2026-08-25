import { describe, expect, it } from "vitest"

import { proposalIdSchema, randomIdFactory, systemClock, type LoomTree } from "@loom/runtime"
import { commitIntent, confirmHeld, discardHeld, revertRevision } from "@loom/runtime/write"

import { DEMO_LEADING_PRESET, presetById, presetInterpreter } from "./presets"
import { recordFromEvents, type ChangeRecord } from "./record"
import { beginDemoWrite, demoPolicy, demoSession, type DemoSession } from "./session"

/**
 * The demo, end to end, with nothing stubbed but the browser.
 *
 * This is the test the whole surface exists to make possible: §1–§6 run against
 * a page that was not written to pass its own tests. Every preset is interpreted,
 * assessed, gated, applied or held, logged, and — where it landed — undone, over
 * the same write path the portal uses.
 *
 * No key is needed and none is used. The presets are deterministic by design, so
 * the demo's guarantees are checkable in CI rather than only in front of a
 * person.
 */

const sessionFor = async (name: string): Promise<DemoSession> => demoSession(`test-${name}-${Math.random()}`)

const headOf = async (session: DemoSession): Promise<LoomTree> => {
  const head = await session.store.head(session.seed.treeId)
  if (!head.ok) throw new Error(`no head: ${head.error.code}`)

  return head.value
}

const ask = async (session: DemoSession, presetId: string): Promise<ChangeRecord> => {
  const preset = presetById(presetId)
  if (!preset) throw new Error(`no preset ${presetId}`)

  const head = await headOf(session)
  const write = beginDemoWrite(session, presetInterpreter(preset, randomIdFactory, systemClock))

  await commitIntent(write.path, {
    intentId: randomIdFactory.intentId(),
    treeId: session.seed.treeId,
    baseRevision: head.revision,
    origin: "user-instruction",
    actor: "a demo visitor",
    utterance: preset.utterance,
    observedAt: systemClock.now(),
  })

  const record = recordFromEvents(write.narrated())
  if (!record) throw new Error("the runtime narrated nothing")

  return record
}

describe("a preset asked for through the demo's write path", () => {
  it("re-themes the page on its own, and says which rule let it", async () => {
    const session = await sessionFor("palette")
    const record = await ask(session, "palette")

    expect(record.outcome).toBe("applied")
    expect(record.disposition?.kind).toBe("accepted")
    expect(record.disposition?.ruleCode).toBe("within-policy")
    expect(record.disposition?.policyId).toBe("demo")
    expect(record.revision).toEqual({ produced: 1, replaced: 0 })
    expect((await headOf(session)).revision).toBe(1)
  })

  /**
   * The demo's policy exists for this: under the shipped default every change
   * here would auto-apply and the hold would never be seen. A restructure waits
   * for the visitor, and the record says which ceiling it was measured against.
   */
  it("holds a restructure for the visitor rather than applying it", async () => {
    const session = await sessionFor("band")
    const record = await ask(session, "band")

    expect(record.outcome).toBe("awaiting-you")
    expect(record.disposition?.kind).toBe("requires-confirmation")
    expect(record.disposition?.ruleCode).toBe("stakes-above-ceiling")
    expect(record.heldProposalId).toBeDefined()
    expect((await headOf(session)).revision).toBe(0)
  })

  /**
   * The property the whole surface's ranking rests on, and the one that would
   * rot without a word of warning.
   *
   * The panel's primary control is `DEMO_LEADING_PRESET` and it is nominated
   * *because* the Gate holds it: the first press is meant to produce "Loom will
   * not make this change until you say yes", which is the sentence this demo
   * exists to put in front of a stranger. Nothing about that survives a policy
   * retune on its own. Raise `user-instruction`'s auto-apply ceiling back to
   * the shipped default and every existing test still passes, the demo still
   * works, the page still changes — and the first press silently stops meeting
   * the Gate at all, which is the exact state this run was opened to fix.
   *
   * So the nomination is asserted against the real policy, over the real write
   * path, rather than trusted to the comment that explains it.
   */
  it("holds the preset the panel leads with, which is why it leads", async () => {
    const session = await sessionFor("leading")
    const record = await ask(session, DEMO_LEADING_PRESET)

    expect(record.outcome).toBe("awaiting-you")
    expect(record.disposition?.kind).toBe("requires-confirmation")
    expect(record.heldProposalId).toBeDefined()
    /** Held means held: the page a visitor is looking at has not moved. */
    expect((await headOf(session)).revision).toBe(0)
  })

  it("carries the whole removed subtree in the inverse, so undo can put it back", async () => {
    const session = await sessionFor("trim")
    const record = await ask(session, "trim")

    expect(record.reversibility?.reversible).toBe(true)
    expect(record.reversibility?.retainedNodeCount).toBeGreaterThan(3)
    expect(record.reversibility?.inverseOperations.some((op) => op.startsWith("insert"))).toBe(true)
    expect(record.stakes?.factors.map((factor) => factor.code)).toContain("large-removal")
  })

  it("reports every field the demo puts on screen, for every preset", async () => {
    for (const presetId of ["palette", "backdrop", "band", "trim", "promote"]) {
      const session = await sessionFor(presetId)
      const record = await ask(session, presetId)

      expect(record.interpretation?.interpreter, presetId).toBe("loom/demo-preset")
      expect(record.interpretation?.operations.length, presetId).toBeGreaterThan(0)
      expect(record.stakes?.level, presetId).toBeDefined()
      expect(record.reversibility?.inverseOperations.length, presetId).toBeGreaterThan(0)
      expect(record.disposition?.policyFingerprint, presetId).toBeDefined()
      expect(record.actor, presetId).toBe("a demo visitor")
    }
  })
})

describe("answering a hold", () => {
  it("applies the change and replaces the record's verdict with the second look", async () => {
    const session = await sessionFor("confirm")
    const held = await ask(session, "band")
    const proposalId = held.heldProposalId
    if (!proposalId) throw new Error("nothing was held")

    const write = beginDemoWrite(session)
    const outcome = await confirmHeld(write.path, {
      proposalId: proposalIdSchema.parse(proposalId),
      actor: "a demo visitor",
    })
    const record = recordFromEvents(write.narrated(), held)

    expect(outcome.kind).toBe("committed")
    expect(record?.outcome).toBe("applied")
    expect(record?.revision).toEqual({ produced: 1, replaced: 0 })
    expect(record?.heldProposalId).toBeUndefined()
    expect(record?.answeredBy).toBe("a demo visitor")
    /** The same ask, completed — not a second entry in the rail. */
    expect(record?.recordId).toBe(held.recordId)
    expect(record?.utterance).toBe(held.utterance)
    expect((await headOf(session)).revision).toBe(1)
  })

  it("keeps the ask on the card when the visitor says no", async () => {
    const session = await sessionFor("discard-hold")
    const held = await ask(session, "trim")
    const proposalId = held.heldProposalId
    if (!proposalId) throw new Error("nothing was held")

    const write = beginDemoWrite(session)
    const discarded = await discardHeld(write.path, {
      proposalId: proposalIdSchema.parse(proposalId),
      actor: "a demo visitor",
    })
    const record = recordFromEvents(write.narrated(), held)

    expect(discarded.ok).toBe(true)
    expect(record?.outcome).toBe("discarded")
    expect(record?.heldProposalId).toBeUndefined()
    expect(record?.interpretation?.rationale).toBe(held.interpretation?.rationale)
    expect((await headOf(session)).revision).toBe(0)
  })
})

describe("undo", () => {
  it("is a change like any other, and puts the page back", async () => {
    const session = await sessionFor("undo")
    const applied = await ask(session, "palette")
    const revision = applied.revision?.produced
    if (revision === undefined) throw new Error("nothing was applied")

    const before = JSON.stringify(session.seed.root)
    const write = beginDemoWrite(session)

    const outcome = await revertRevision(write.path, {
      treeId: session.seed.treeId,
      revision,
      seed: session.seed,
      origin: "user-instruction",
      actor: "a demo visitor",
    })

    expect(outcome.kind).toBe("committed")

    const record = recordFromEvents(write.narrated())

    /** Appends a revision rather than rewinding to one: the log keeps both. */
    expect(record?.revision).toEqual({ produced: 2, replaced: 1 })
    expect(record?.interpretation?.interpreter).toBe("loom/revert")
    expect(record?.interpretation?.authoredBy).toBe("runtime")
    expect(JSON.stringify((await headOf(session)).root)).toBe(before)
  })

  /**
   * 0035: an undo whose target was built on afterwards is offered rather than
   * refused, and the Gate holds it because it writes over work in the log.
   */
  it("is held when it would write over later work", async () => {
    const session = await sessionFor("discard")
    const first = await ask(session, "palette")
    /** A second change to the *same* node, which is what makes the undo contested. */
    await ask(session, "palette")

    const revision = first.revision?.produced
    if (revision === undefined) throw new Error("nothing was applied")

    const write = beginDemoWrite(session)
    const outcome = await revertRevision(write.path, {
      treeId: session.seed.treeId,
      revision,
      seed: session.seed,
      origin: "user-instruction",
      actor: "a demo visitor",
    })

    expect(outcome.kind).toBe("held")

    const record = recordFromEvents(write.narrated())

    expect(record?.outcome).toBe("awaiting-you")
    expect(record?.disposition?.ruleCode).toBe("discards-later-work")
    expect(record?.stakes?.factors.map((factor) => factor.code)).toContain("discards-later-work")
    /** Nothing was written: the page is still where the second change left it. */
    expect((await headOf(session)).revision).toBe(2)
  })
})

describe("the demo's policy", () => {
  it("is named, and stricter than the default about what may apply unattended", () => {
    expect(demoPolicy.policyId).toBe("demo")
    expect(demoPolicy.autoApplyCeiling["user-instruction"]).toBe("low")
  })
})
