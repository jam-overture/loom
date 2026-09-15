import { describe, expect, it } from "vitest"

import { proposalIdSchema, randomIdFactory, systemClock, type LoomTree } from "@loom/runtime"
import { commitIntent, confirmHeld, discardHeld, revertRevision } from "@loom/runtime/write"

import { answerNote } from "./answer"
import { movedOn } from "./moved"
import { settingsOf } from "./plain-change"
import { DEMO_LEADING_PRESET, presetById, presetInterpreter } from "./presets"
import { recordFromEvents, type ChangeRecord } from "./record"
import { demoRegistry } from "./registry"
import { beginDemoWrite, demoPolicy, demoSession, type DemoSession } from "./session"
import { askedLine } from "./undo"

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

/**
 * The registry's closed choices, read once, exactly as `actions.ts` reads them.
 */
const SETTINGS = settingsOf(demoRegistry)

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

  /*
   * The head read *before* the write is handed in, which is the whole of what
   * `actions.ts` does and the only reason a landed change can be described at
   * all. Threaded through this helper rather than asserted in one test, so every
   * case below runs the path the server action runs.
   */
  const record = recordFromEvents(write.narrated(), undefined, {
    before: head,
    settings: SETTINGS,
  })
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

  /**
   * The press that makes the change true must not be the press that stops the
   * card describing it.
   *
   * The plain reading a held card shows is computed per render against the tree
   * on the stage, so the moment the change lands it becomes impossible to
   * compute — the delta has already been applied there, and resolving it
   * reports a change that did nothing. The record's own copy is frozen at
   * assessment; this is the fold that could drop it, because answering a hold
   * narrates no assessment and arrives with no tree in hand.
   */
  it("keeps the record's account of what the change does when the visitor says yes", async () => {
    const session = await sessionFor("did-survives-confirm")
    const held = await ask(session, "band")
    const proposalId = held.heldProposalId
    if (!proposalId) throw new Error("nothing was held")

    expect(held.did?.length).toBeGreaterThan(0)

    const write = beginDemoWrite(session)
    await confirmHeld(write.path, {
      proposalId: proposalIdSchema.parse(proposalId),
      actor: "a demo visitor",
    })

    /* No tree handed in, exactly as `answerHeld` hands none. */
    const record = recordFromEvents(write.narrated(), held)

    expect(record?.outcome).toBe("applied")
    expect(record?.did).toEqual(held.did)
  })

  /**
   * The end of the demo's argument, asserted through the real write path rather
   * than off a fixture.
   *
   * Two changes both end `applied` on this policy, and only one of them was
   * ever put to the visitor. The card can only tell them apart if the pipeline
   * hands it a record that does — so this asserts the two ends of that: an
   * unasked change carries no answer at all, and an answered one carries the
   * words the rail prints about it.
   *
   * It is here rather than only beside `answerNote` because the property that
   * rots is not the function, it is the *supply*. Change how a confirmation is
   * narrated, or stop passing an actor to `confirmHeld`, and `answer.test.ts`
   * still passes on its fixture while the demo silently goes back to reporting
   * a change the visitor allowed as one Loom made alone.
   */
  it("hands the rail an answer to print, and only where somebody was asked", async () => {
    const session = await sessionFor("answer-note")

    const unasked = await ask(session, "palette")
    expect(unasked.outcome).toBe("applied")
    expect(answerNote(unasked)).toBeUndefined()

    const held = await ask(session, "band")
    const proposalId = held.heldProposalId
    if (!proposalId) throw new Error("nothing was held")

    const write = beginDemoWrite(session)
    await confirmHeld(write.path, {
      proposalId: proposalIdSchema.parse(proposalId),
      actor: "a demo visitor",
    })
    const answered = recordFromEvents(write.narrated(), held)
    if (!answered) throw new Error("the runtime narrated nothing")

    expect(answered.outcome).toBe("applied")
    expect(answerNote(answered)?.label).toBe("You said yes")
    expect(answerNote(answered)?.technical).toBe("confirmed by a demo visitor")
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

/**
 * What the record says the change *was*, as opposed to what it was asked to be.
 *
 * Every other line on a landed card is about the decision — the badge, the two
 * axes, the rule, the ceiling, the answer note. Not one of them says what the
 * change did to the page. That was invisible while the plain reading sat on the
 * card before the press, and it was never true for a change the Gate applies on
 * its own: those cards are landed from the first render and carried the ask, the
 * verdict, and nothing in between.
 */
describe("the record of a change that has landed", () => {
  it("says what an unattended change did, in the past tense", async () => {
    const session = await sessionFor("did-unattended")
    const record = await ask(session, "backdrop")

    expect(record.outcome).toBe("applied")
    expect(record.heldProposalId).toBeUndefined()

    const sentences = (record.did ?? []).map((line) => line.sentence)

    expect(sentences.length).toBeGreaterThan(0)
    expect(sentences.join(" ")).toContain("looks changed")
  })

  /**
   * The words are the page's, and they are the reason this is worth freezing
   * rather than recomputing: every one of them names a node the change removed,
   * so the tree that could answer for them is the one the change replaced.
   */
  it("quotes what a removal took off, from the tree the change was judged against", async () => {
    const session = await sessionFor("did-removal")
    const record = await ask(session, DEMO_LEADING_PRESET)

    const line = (record.did ?? [])[0]

    expect(line?.sentence).toContain("came off the page")
    expect(line?.words).toContain("3,400")
  })

  /**
   * The tense is the assertion. The same delta read live off the stage is what
   * the held card shows, and the two readings must not be the same string —
   * a landed change described as one about to happen is the defect this fixes,
   * turned around.
   */
  it("reads in a different tense from the reading the held card shows", async () => {
    const session = await sessionFor("did-tense")
    const record = await ask(session, DEMO_LEADING_PRESET)

    const sentence = (record.did ?? [])[0]?.sentence ?? ""

    expect(sentence).toContain("came off")
    expect(sentence).not.toContain("comes off")
  })

  /**
   * An ask that never produced a delta has nothing to describe, and must not
   * invent a sentence saying so. Absent, not empty prose.
   */
  it("says nothing about a change that never happened", async () => {
    const session = await sessionFor("did-absent")
    const record = recordFromEvents([
      {
        treeId: session.seed.treeId,
        occurredAt: "2026-09-14T00:00:00.000Z",
        event: {
          type: "intent-received",
          intent: {
            intentId: randomIdFactory.intentId(),
            treeId: session.seed.treeId,
            baseRevision: 0,
            origin: "user-instruction",
            actor: "a demo visitor",
            utterance: "Something the interpreter never answered.",
            observedAt: "2026-09-14T00:00:00.000Z",
          },
        },
      },
    ])

    expect(record?.did).toBeUndefined()
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
   * The demo's payoff, narrated as a return rather than as an arrival.
   *
   * An undo's operations are ordinary inserts and removes (0032), so a record
   * describing one from the delta alone says *this went onto the page* over
   * three figures the visitor has just watched come back. `restoring` is the
   * one thing only the call site knows, and this asserts it is actually
   * supplied — the property that rots here is the supply, not the table.
   */
  it("says the record put something back, rather than that something arrived", async () => {
    const session = await sessionFor("undo-restoring")
    const held = await ask(session, DEMO_LEADING_PRESET)
    const proposalId = held.heldProposalId
    if (!proposalId) throw new Error("nothing was held")

    const yes = beginDemoWrite(session)
    await confirmHeld(yes.path, {
      proposalId: proposalIdSchema.parse(proposalId),
      actor: "a demo visitor",
    })

    const landed = await headOf(session)
    const write = beginDemoWrite(session)

    await revertRevision(write.path, {
      treeId: session.seed.treeId,
      revision: landed.revision,
      seed: session.seed,
      origin: "user-instruction",
      actor: "a demo visitor",
    })

    const record = recordFromEvents(write.narrated(), undefined, {
      before: landed,
      settings: SETTINGS,
      restoring: true,
    })

    const line = (record?.did ?? [])[0]

    expect(line?.sentence).toContain("went back on the page")
    expect(line?.sentence).not.toContain("nothing already on it")
    /** The same three figures, quoted from the subtree that came back. */
    expect(line?.words).toContain("3,400")
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

  /**
   * The demo's third press, end to end, and the two things the surface says
   * about it.
   *
   * A visitor presses the leading ask, is held, allows it, and then presses the
   * one control the payoff card offers. What they get is *another hold* — the
   * undo of a restructure is a restructure — so the page does not move and the
   * caution under the button is describing the ordinary case rather than an
   * edge one. If a policy retune ever let this through, the caution would be
   * hedging about something that cannot happen and would be worth removing.
   *
   * And the record it produces is the one `askedLine` substitutes for, which is
   * the property that rots: `undo.test.ts` holds the substitution against a
   * fixture, and a `revertRevision` that stopped stamping its own interpreter
   * would leave that passing while the card went back to quoting
   * `Undo revision 1.` at a stranger.
   */
  it("is held on the demo's leading ask, and hands the rail an undo it can name", async () => {
    const session = await sessionFor("undo-of-the-lead")
    const held = await ask(session, DEMO_LEADING_PRESET)
    const proposalId = held.heldProposalId
    if (!proposalId) throw new Error("the leading preset was not held")

    const allowing = beginDemoWrite(session)
    await confirmHeld(allowing.path, {
      proposalId: proposalIdSchema.parse(proposalId),
      actor: "a demo visitor",
    })

    const write = beginDemoWrite(session)
    const outcome = await revertRevision(write.path, {
      treeId: session.seed.treeId,
      revision: 1,
      seed: session.seed,
      origin: "user-instruction",
      actor: "a demo visitor",
    })

    expect(outcome.kind).toBe("held")
    /** The press moved nothing, which is exactly what the caution promises. */
    expect((await headOf(session)).revision).toBe(1)

    const record = recordFromEvents(write.narrated())
    if (!record) throw new Error("the runtime narrated nothing")

    expect(record.utterance).toBe("Undo revision 1.")
    expect(askedLine(record)).toEqual({ plain: "Put it back.", technical: "Undo revision 1." })
  })
})

describe("the demo's policy", () => {
  it("is named, and stricter than the default about what may apply unattended", () => {
    expect(demoPolicy.policyId).toBe("demo")
    expect(demoPolicy.autoApplyCeiling["user-instruction"]).toBe("low")
  })
})

/**
 * Two questions open at once, and what answering one does to the other.
 *
 * This is the demo's most reachable dead end and it needs no ingenuity to find:
 * five buttons, no instruction to answer one at a time, and a stranger who
 * presses two of them. Both are held. Answering either moves the revision, and a
 * hold names the revision it was judged against — so the second is dead the
 * instant the first lands.
 *
 * The runtime is unambiguous about it (`confirmHeld`: *"it is not stale pending
 * a retry, it is dead"*) and it had never reached the screen. The card went on
 * saying **Waiting on you**, the page went on ringing its band in the colour of
 * an open question, and pressing *Apply this change* spent the offer and
 * answered with `applied, then not written: revision-conflict` in the smallest
 * type on the card.
 *
 * The end-to-end test is here rather than in `moved.test.ts` because the claim
 * is about the runtime as much as about the surface: it is that `baseRevision`
 * really does go stale in exactly the case the surface now watches for, and that
 * confirming one afterwards really does fail. A unit test of the predicate alone
 * would keep passing if either half stopped being true.
 */
describe("a second ask held while the first is still waiting", () => {
  const holdsOf = async (session: DemoSession) => {
    const head = await headOf(session)
    const found = await session.holds.forTree(head.treeId)
    if (!found.ok) throw new Error(`no holds: ${found.error.code}`)

    return { head, held: found.value }
  }

  it("goes dead the moment the first one is answered, and the surface can tell", async () => {
    const session = await sessionFor("two-holds")
    const first = await ask(session, "trim")
    const second = await ask(session, "band")

    expect(first.outcome).toBe("awaiting-you")
    expect(second.outcome).toBe("awaiting-you")

    /** Both were judged against the same page, so neither is stale yet. */
    const before = await holdsOf(session)
    expect(before.head.revision).toBe(0)
    for (const hold of before.held) expect(movedOn(hold.baseRevision, before.head.revision)).toBeUndefined()

    const allowing = beginDemoWrite(session)
    await confirmHeld(allowing.path, {
      proposalId: proposalIdSchema.parse(second.heldProposalId ?? ""),
      actor: "a demo visitor",
    })

    /** One landed; the other is now aimed at a page that no longer exists. */
    const after = await holdsOf(session)
    expect(after.head.revision).toBe(1)
    expect(after.held).toHaveLength(1)

    const note = movedOn(after.held[0]!.baseRevision, after.head.revision)
    expect(note?.at).toBe(0)
    expect(note?.now).toBe(1)
  })

  /**
   * And confirming it anyway — a second tab, or a press that crosses another —
   * produces the record the card now reads honestly: no hold, `did-not-apply`,
   * and the conflict kept in full.
   */
  it("cannot be applied afterwards, and stops claiming to be waiting when it is tried", async () => {
    const session = await sessionFor("two-holds-answered-late")
    const first = await ask(session, "trim")
    const second = await ask(session, "band")

    const allowing = beginDemoWrite(session)
    await confirmHeld(allowing.path, {
      proposalId: proposalIdSchema.parse(second.heldProposalId ?? ""),
      actor: "a demo visitor",
    })

    const late = beginDemoWrite(session)
    const outcome = await confirmHeld(late.path, {
      proposalId: proposalIdSchema.parse(first.heldProposalId ?? ""),
      actor: "a demo visitor",
    })

    expect(outcome.kind).toBe("not-written")

    const record = recordFromEvents(late.narrated(), first)
    expect(record?.heldProposalId).toBeUndefined()
    expect(record?.outcome).toBe("did-not-apply")
    expect(record?.failure).toContain("revision-conflict")

    /** Nothing moved: the page is still where the change that did land left it. */
    expect((await headOf(session)).revision).toBe(1)
  })
})
