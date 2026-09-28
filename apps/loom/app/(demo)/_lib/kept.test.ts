import { describe, expect, it } from "vitest"

import {
  proposalIdSchema,
  randomIdFactory,
  systemClock,
  findNode,
  type LoomTree,
} from "@jam-overture/loom"
import { commitIntent, confirmHeld, revertRevision } from "@jam-overture/loom/write"

import { partTheRecordKept } from "./kept"
import { settingsOf } from "./plain-change"
import { DEMO_LEADING_PRESET, presetById, presetInterpreter } from "./presets"
import { recordFromEvents, type ChangeRecord } from "./record"
import { demoRegistry } from "./registry"
import { beginDemoWrite, demoSession, type DemoSession } from "./session"

/**
 * What a landed change is still holding, read over the real write path.
 *
 * **Nothing here is a fixture of an inverse**, and that is the whole shape of
 * this file. The claim being tested is that the content a removal destroyed
 * survives on the record and can be drawn from it — so a hand-written
 * `inverse: [{ op: "insert", node: … }]` would be this lane testing a value it
 * had just made up. Every record below is produced by asking a preset, being
 * held by the Gate, and answering yes, exactly as a visitor does.
 *
 * No key is needed and none is used: a preset is a deterministic interpreter
 * (0057), which is why the demo's best moment is checkable in CI at all.
 */

const SETTINGS = settingsOf(demoRegistry)

const sessionFor = async (name: string): Promise<DemoSession> =>
  demoSession(`kept-${name}-${Math.random()}`)

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

  const record = recordFromEvents(write.narrated(), undefined, { before: head, settings: SETTINGS })
  if (!record) throw new Error("the runtime narrated nothing")

  return record
}

/** Yes, on a held change — the second of the demo's three presses. */
const allow = async (session: DemoSession, held: ChangeRecord): Promise<ChangeRecord> => {
  const proposalId = held.heldProposalId
  if (!proposalId) throw new Error("nothing was held")

  const write = beginDemoWrite(session)
  await confirmHeld(write.path, {
    proposalId: proposalIdSchema.parse(proposalId),
    actor: "a demo visitor",
  })

  const record = recordFromEvents(write.narrated(), held)
  if (!record) throw new Error("the runtime narrated nothing")

  return record
}

/** The one press this unit exists so a stranger does not have to make. */
const putBack = async (session: DemoSession, revision: number): Promise<void> => {
  const write = beginDemoWrite(session)
  const outcome = await revertRevision(write.path, {
    treeId: session.seed.treeId,
    revision,
    seed: session.seed,
    origin: "user-instruction",
    actor: "a demo visitor",
  })

  if (outcome.kind !== "held") return

  const undo = recordFromEvents(write.narrated())
  const proposalId = undo?.heldProposalId
  if (!proposalId) throw new Error("the undo was held with no proposal")

  const second = beginDemoWrite(session)
  await confirmHeld(second.path, {
    proposalId: proposalIdSchema.parse(proposalId),
    actor: "a demo visitor",
  })
}

/** The demo's leading press, taken all the way to a landed change. */
const landedRemoval = async (name: string) => {
  const session = await sessionFor(name)
  const record = await allow(session, await ask(session, DEMO_LEADING_PRESET))

  return { session, record, tree: await headOf(session) }
}

describe("the part a landed change is still holding", () => {
  /**
   * The unit's whole reason, and the finding it closes: *the demo shows a
   * stranger the change and the record, and the inverse is the one third of
   * the claim sixty seconds does not reach.* The band is off the page and it
   * is on the card.
   */
  it("draws the band the change took off, from the record rather than the tree", async () => {
    const { record, tree } = await landedRemoval("draws")
    const part = partTheRecordKept(tree, record)

    expect(record.outcome).toBe("applied")
    expect(part).toBeDefined()
    expect(part?.tree.root.type).toBe("loom.stat-grid")
    expect(part?.lead).toBe("This is what came off the page. The record is still holding it.")
  })

  /**
   * **And the page does not have it**, which is the property that makes the
   * excerpt evidence instead of decoration. Every other preview on this
   * surface is a second rendering of something still on the stage; this one is
   * the only place the content exists.
   */
  it("draws a node the page no longer has anywhere on it", async () => {
    const { record, tree } = await landedRemoval("gone")
    const part = partTheRecordKept(tree, record)

    expect(part).toBeDefined()
    expect(findNode(tree.root, part!.tree.root.id)).toBeNull()
  })

  /**
   * The figures themselves, not a count of them. The card's own sentence is
   * *"The 4 pieces it takes off the page are kept"* and this is the check that
   * the four pieces are what gets drawn — a subtree with its children, rather
   * than an empty shell carrying the right type.
   */
  it("carries the whole subtree, which is what makes the count true", async () => {
    const { record, tree } = await landedRemoval("subtree")
    const part = partTheRecordKept(tree, record)

    expect(part?.tree.root.kind).toBe("element")
    expect(part?.tree.root.kind === "element" && part.tree.root.children.length).toBeGreaterThan(0)
    expect(JSON.stringify(part?.tree.root)).toContain("3,400")
  })

  /**
   * **The moment, which is the assertion this file carries for the
   * stylesheet.** `globals.css` hangs the wide-screen `display: none` off
   * `--question` and the window height off `--ask`; a kept excerpt handed
   * either would be hidden at 1280×900 or windowed at the question's 13rem,
   * with nothing else going red. That is the sixth row of `rail.ts`'s table,
   * and it was measured on the run before this one rather than imagined.
   */
  it("says it is kept, which is the rule that draws it on a wide screen", async () => {
    const { record, tree } = await landedRemoval("moment")

    expect(partTheRecordKept(tree, record)?.where).toBe("kept")
  })

  /**
   * **It goes away when the visitor spends it, with nothing told to clear.**
   *
   * An undo puts the nodes back with the ids they had (0032), so the tree can
   * find them and `partFromOperations` refuses. That refusal is the whole of
   * the withdrawal: no flag, no second gate, and no way for the card to end up
   * holding out a band that is three inches away on the stage.
   */
  it("stops drawing once the undo has put the band back", async () => {
    const { session, record, tree } = await landedRemoval("spent")
    const bandId = partTheRecordKept(tree, record)?.tree.root.id
    const revision = record.revision?.produced

    expect(bandId).toBeDefined()
    expect(revision).toBeDefined()

    await putBack(session, revision!)

    const after = await headOf(session)

    /** The band is on the page again, with the id it had — and so the excerpt goes. */
    expect(after.revision).toBeGreaterThan(tree.revision)
    expect(findNode(after.root, bandId!)).not.toBeNull()
    expect(partTheRecordKept(after, record)).toBeUndefined()
  })

  /**
   * A change still waiting on an answer has taken nothing off the page. Its
   * card already shows the band, in the conditional, above the two buttons
   * deciding it — and a second copy captioned *came off the page* would be the
   * card contradicting itself across one press.
   */
  it("shows nothing for a change the Gate is still holding", async () => {
    const session = await sessionFor("held")
    const record = await ask(session, DEMO_LEADING_PRESET)

    expect(record.outcome).toBe("awaiting-you")
    expect(partTheRecordKept(await headOf(session), record)).toBeUndefined()
  })

  /**
   * **And still nothing when the page has lost the band some other way**,
   * which is the only state in which the outcome is doing any work — and the
   * defect matrix is what said so: restore `outcome !== "applied"` and the
   * case above goes on passing, because a hold nobody has answered leaves the
   * band exactly where it is and `partFromOperations` refuses a node the page
   * still has.
   *
   * `moved.ts` is the state this is about: a hold whose page moved under it.
   * The Gate weighed a removal, the visitor left it open, something else took
   * the band off, and the record is still `awaiting-you` with an inverse
   * describing a node this tree does not have. Drawn, it would say *this is
   * what came off the page* on the one card whose whole subject is a change
   * that never happened.
   *
   * The record is the real one with its outcome put back, which is the shape a
   * hold has. Nothing about the inverse is invented — that is the point of
   * every other case in this file and it is the point of this one.
   */
  it("shows nothing for a change that is still waiting on a page that has lost the band", async () => {
    const { record, tree } = await landedRemoval("stale-hold")

    expect(partTheRecordKept(tree, record)).toBeDefined()

    const waiting: ChangeRecord = { ...record, outcome: "awaiting-you", heldProposalId: "p_1" }

    expect(partTheRecordKept(tree, waiting)).toBeUndefined()
  })

  /**
   * And nothing for the changes whose inverse names something still on the
   * page. A re-theme's inverse is one configure against the root, a move's is
   * a move, and an added band's is a remove — in all three the subject is on
   * the stage, so an excerpt of it says nothing the page is not already
   * saying.
   */
  it("shows nothing for a change that removed nothing", async () => {
    for (const presetId of ["palette", "backdrop"]) {
      const session = await sessionFor(presetId)
      const record = await ask(session, presetId)

      expect(record.outcome, presetId).toBe("applied")
      expect(partTheRecordKept(await headOf(session), record), presetId).toBeUndefined()
    }
  })

  /**
   * The insert and the move, taken all the way to the page for the same
   * reason: both leave their subject on the stage, and the refusal has to
   * survive the operation being an insert's *inverse* rather than an insert.
   */
  it("shows nothing for a change that added or moved something", async () => {
    for (const presetId of ["band", "promote"]) {
      const session = await sessionFor(presetId)
      const record = await allow(session, await ask(session, presetId))

      expect(record.outcome, presetId).toBe("applied")
      expect(partTheRecordKept(await headOf(session), record), presetId).toBeUndefined()
    }
  })

  /**
   * An ask that never reached assessment has no inverse to have kept anything
   * in — the same condition `weighedOf` is absent under, and the card must not
   * invent an excerpt for it any more than it invents a verdict.
   */
  it("shows nothing for a record that never reached assessment", async () => {
    const { record, tree } = await landedRemoval("unassessed")
    const { reversibility: _dropped, ...without } = record

    expect(partTheRecordKept(tree, without)).toBeUndefined()
  })
})
