import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "vitest"

import {
  boldPalette,
  editorialPalette,
  proposalIdSchema,
  randomIdFactory,
  systemClock,
  type LoomTree,
  type NodeId,
} from "@jam-overture/loom"
import { commitIntent, confirmHeld, revertRevision } from "@jam-overture/loom/write"

import { markedPage, MARKED_AWAITING, MARKED_MANY } from "./marked"
import { demoPageTree } from "./page-tree"
import { settingsOf } from "./plain-change"
import { presetById, presetInterpreter } from "./presets"
import { recordFromEvents, type ChangeRecord } from "./record"
import { demoRegistry } from "./registry"
import { beginDemoWrite, demoSession, type DemoSession } from "./session"
import {
  MAX_SPOTS,
  SPOT_COLORS,
  spotlightCss,
  spotlightsAcross,
  spotlightsFor,
  spotlitChanges,
  type Spotlight,
} from "./spotlight"
import type { TouchedNode } from "./touched"
import { isUndo } from "./undo"

/**
 * Where the mark lands, proved against the page a visitor actually sees.
 *
 * Every case below goes through the same write path the browser does: a preset
 * is interpreted, assessed, gated, and applied or held, and the mark is then
 * resolved against whatever tree that left on the stage. Nothing here asserts
 * against a fixture delta, because the interesting failures are the ones where
 * the delta is right and the mark points at the wrong thing — a removal marked
 * on a band that is still there, or an insert marked on a node that does not
 * exist yet.
 */

/** Node ids are branded, and a fixture is the one place they are written by hand. */
const id = (value: string): NodeId => value as NodeId

const sessionFor = async (name: string): Promise<DemoSession> =>
  demoSession(`spot-${name}-${Math.random()}`)

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

const answer = async (session: DemoSession, held: ChangeRecord): Promise<ChangeRecord> => {
  const proposalId = held.heldProposalId
  if (!proposalId) throw new Error("nothing was held")

  const write = beginDemoWrite(session)
  await confirmHeld(write.path, {
    proposalId: proposalIdSchema.parse(proposalId),
    actor: "a demo visitor",
  })

  const record = recordFromEvents(write.narrated(), held)
  if (!record) throw new Error("the answer narrated nothing")

  return record
}

/**
 * Ask to put a revision back, exactly as the card's button does.
 *
 * Through `revertRevision` rather than through a fixture, because the whole
 * point of the cases below is that an undo's delta is an *ordinary* delta — the
 * inverse of a remove is an insert — and a hand-written record would let the
 * test agree with the code about something the runtime decides.
 */
const undo = async (session: DemoSession, revision: number): Promise<ChangeRecord> => {
  const write = beginDemoWrite(session)

  await revertRevision(write.path, {
    treeId: session.seed.treeId,
    revision,
    seed: session.seed,
    origin: "user-instruction",
    actor: "a demo visitor",
  })

  const record = recordFromEvents(write.narrated())
  if (!record) throw new Error("the undo narrated nothing")

  return record
}

/**
 * The mark for a change, read against the tree that change left behind.
 *
 * `isUndo` is passed here for the same reason `page.tsx` passes it: it is the
 * only thing on the record that says an insert is a node coming *back*, and a
 * helper that dropped it would test a page nobody is looking at.
 */
const marksFor = async (session: DemoSession, record: ChangeRecord): Promise<readonly Spotlight[]> => {
  const tree = await headOf(session)

  return spotlightsAcross(
    tree,
    spotlitChanges([record], tree).map((one) => ({
      touched: one.record.touched,
      tone: one.tone,
      restoring: isUndo(one.record),
    }))
  ).flat()
}

const typeOf = (tree: LoomTree, nodeId: string): string => {
  const child = tree.root.children.find((node) => node.id === nodeId)

  return child?.kind === "element" ? child.type : "not a band of this page"
}

describe("marking a change on the page", () => {
  /**
   * The most persuasive moment this surface has: Loom is asking about *that*
   * band, and the band says so itself rather than being described in the rail.
   */
  it("marks the band a held removal is asking about, in the waiting color", async () => {
    const session = await sessionFor("trim-held")
    const record = await ask(session, "trim")
    const marks = await marksFor(session, record)

    expect(record.outcome).toBe("awaiting-you")
    expect(marks).toHaveLength(1)
    expect(marks[0]?.tone).toBe("awaiting")
    expect(marks[0]?.label).toBe("This would be removed")
    expect(marks[0]?.placement).toBe("inside")
    /** The band is the subject, so this is the one mark of the four that rings. */
    expect(marks[0]?.subject).toBe("node")
    expect(typeOf(await headOf(session), marks[0]!.nodeId)).toBe("loom.stat-grid")
  })

  /**
   * And once it applies there is nothing left to point at, so the mark moves to
   * the gap. A chip reading "removed" on a band still standing would be the
   * largest lie this surface could tell.
   */
  it("marks the gap once the removal lands, not a band that is still there", async () => {
    const session = await sessionFor("trim-applied")
    const record = await answer(session, await ask(session, "trim"))
    const tree = await headOf(session)
    const marks = await marksFor(session, record)

    expect(record.outcome).toBe("applied")
    expect(marks[0]?.tone).toBe("applied")
    expect(marks[0]?.label).toBe("Something was removed here")
    expect(typeOf(tree, marks[0]!.nodeId)).not.toBe("loom.stat-grid")
    /** The band that now stands where the numbers were. */
    expect(tree.root.children.some((node) => node.id === marks[0]?.nodeId)).toBe(true)
    /**
     * And the gap is the space that band moved up into, which is above it. This
     * is the assertion the chip's position is drawn from: the neighbour is the
     * band *below* the gap, so a mark placed `inside` it — or below it — would
     * be pointing at a stretch of page where nothing was taken away.
     */
    expect(marks[0]?.placement).toBe("above")
    /**
     * And the band it is drawn on is not what the mark is about, so it is not
     * ringed. This is the assertion the payoff screenshot is of: a green ring
     * around the testimonial said the quote had been removed, three inches under
     * a card saying the numbers had.
     */
    expect(marks[0]?.subject).toBe("place")
  })

  it("marks where a held insert would go, and the node itself once it exists", async () => {
    const session = await sessionFor("band")
    const held = await ask(session, "band")
    const before = await marksFor(session, held)

    expect(before[0]?.label).toBe("Something new would go here")
    expect(before[0]?.tone).toBe("awaiting")
    /** The band it would be inserted before, so the space it would fill is above it. */
    expect(before[0]?.placement).toBe("above")
    expect(before[0]?.subject).toBe("place")

    const applied = await answer(session, held)
    const after = await marksFor(session, applied)

    expect(after[0]?.label).toBe("New — just added")
    expect(after[0]?.placement).toBe("inside")
    expect(after[0]?.subject).toBe("node")
    expect(typeOf(await headOf(session), after[0]!.nodeId)).toBe("loom.section")
  })

  /**
   * The last frame of the demo's own sixty seconds, and it used to say the
   * opposite of the card beside it.
   *
   * A visitor takes the numbers off, allows it, and presses *Put it back*. The
   * inverse of a `remove` is an `insert` (0032), so every label reached the
   * `added` branch: the held undo was marked **Something new would go here** and
   * the restored band was marked **New — just added** — over three figures the
   * visitor had watched come off that exact spot two presses earlier, on a card
   * whose own rationale reads *"undoing this restores every node with the id it
   * had"*.
   *
   * *The same nodes come back, not new ones* is what separates this from a
   * rewind. It is the whole argument, it is the last thing anybody sees, and the
   * page was denying it.
   */
  it("says a held undo would put the band back, rather than add a new one", async () => {
    const session = await sessionFor("undo-held")
    const applied = await answer(session, await ask(session, "trim"))
    const revision = applied.revision?.produced
    if (revision === undefined) throw new Error("the change produced no revision")

    const held = await undo(session, revision)
    const marks = await marksFor(session, held)

    expect(held.outcome).toBe("awaiting-you")
    expect(marks[0]?.tone).toBe("awaiting")
    expect(marks[0]?.label).toBe("What was here would come back")
    /** The gap the numbers left, which is above the band that moved up into it. */
    expect(marks[0]?.placement).toBe("above")
  })

  it("marks the restored band as the one that was there, not as something new", async () => {
    const session = await sessionFor("undo-applied")
    const first = await answer(session, await ask(session, "trim"))
    const revision = first.revision?.produced
    if (revision === undefined) throw new Error("the change produced no revision")

    const restored = await answer(session, await undo(session, revision))
    const marks = await marksFor(session, restored)

    expect(restored.outcome).toBe("applied")
    expect(marks[0]?.tone).toBe("applied")
    expect(marks[0]?.label).toBe("Back — exactly as it was")
    expect(marks[0]?.placement).toBe("inside")

    /**
     * And the label is a fact rather than a kinder word for the same thing: the
     * band carrying it is the node that was removed, with the id it had when the
     * visitor arrived. If this ever stops holding, the mark is the lie and this
     * test is how it is caught.
     */
    const before = demoPageTree()
    const original = before.root.children.find(
      (node) => node.kind === "element" && node.type === "loom.stat-grid"
    )
    expect(marks[0]?.nodeId).toBe(original?.id)
    expect(typeOf(await headOf(session), marks[0]!.nodeId)).toBe("loom.stat-grid")
  })

  /**
   * The other direction, which is why the restoring labels are a table of their
   * own rather than a prefix on the ordinary ones. Undoing an *insert* takes
   * something off — and what a visitor needs told is not that a band was
   * removed, but that the one they just added has gone again.
   */
  it("says an undone insert has gone back off, rather than reporting a removal", async () => {
    const session = await sessionFor("undo-insert")
    const added = await answer(session, await ask(session, "band"))
    const revision = added.revision?.produced
    if (revision === undefined) throw new Error("the change produced no revision")

    const held = await undo(session, revision)
    expect((await marksFor(session, held))[0]?.label).toBe("This would go back off")

    const gone = await answer(session, held)
    const marks = await marksFor(session, gone)

    expect(gone.outcome).toBe("applied")
    expect(marks[0]?.label).toBe("What was added here has gone")
  })

  /**
   * And nothing else moved. An ordinary change is the overwhelming majority of
   * what this surface marks, and a restoring label leaking onto one would be the
   * same defect pointing the other way.
   */
  it("leaves an ordinary change's words alone", async () => {
    const session = await sessionFor("ordinary")
    const record = await ask(session, "trim")

    expect(isUndo(record)).toBe(false)
    expect((await marksFor(session, record))[0]?.label).toBe("This would be removed")
  })

  /**
   * The other side of the same seam, and the only case where the gap is not
   * above its neighbour: nothing stands at the position a last child left, so
   * the nearest band is the one before it and the chip belongs under that.
   *
   * No preset reaches this — both act in the middle of the page — but a visitor
   * typing their own ask can, and a chip that always drew above its neighbour
   * would point at the wrong seam by the height of a whole band.
   */
  /**
   * The one place a gap has no room of its own. Above the first band is the top
   * of the stage — unreachable by scrolling, and inside a primitive that may clip
   * its own overflow — so the chip goes back where it can be read. Imprecise and
   * legible beats exact and invisible, and the label still says "here" rather
   * than "this".
   */
  it("keeps the chip in the corner when the gap is above the first band", () => {
    const tree = demoPageTree()
    const first = tree.root.children.find((node) => node.kind === "element")
    if (first === undefined) throw new Error("the demo page has no bands")

    const marks = spotlightsFor(
      tree,
      [{ kind: "added", nodeId: id("not-yet"), parentId: tree.root.id, index: 0 }],
      "awaiting"
    )

    expect(marks[0]?.nodeId).toBe(first.id)
    expect(marks[0]?.placement).toBe("inside")
    expect(marks[0]?.label).toBe("Something new would go here")
  })

  it("marks under the last band when the gap is at the end of the page", () => {
    const tree = demoPageTree()
    const bands = tree.root.children.filter((node) => node.kind === "element")
    const last = bands.at(-1)
    if (last === undefined) throw new Error("the demo page has no bands")

    const marks = spotlightsFor(
      tree,
      [{ kind: "removed", nodeId: id("gone"), parentId: tree.root.id, index: bands.length }],
      "applied"
    )

    expect(marks).toHaveLength(1)
    expect(marks[0]?.nodeId).toBe(last.id)
    expect(marks[0]?.placement).toBe("below")
    expect(marks[0]?.label).toBe("Something was removed here")
  })

  /**
   * A move near the root is a restructure, so the Gate holds it — which means
   * the same node is marked twice in a visitor's session, in two colors, saying
   * two different things about the same band. That pair is the demo's whole
   * argument in one gesture, so both halves are asserted here.
   */
  it("marks a moved node before and after the visitor answers", async () => {
    const session = await sessionFor("promote")
    const held = await ask(session, "promote")
    const before = await marksFor(session, held)

    expect(before[0]?.label).toBe("This would move")
    expect(typeOf(await headOf(session), before[0]!.nodeId)).toBe("loom.quote")

    const after = await marksFor(session, await answer(session, held))

    expect(after[0]?.label).toBe("Moved here")
    expect(typeOf(await headOf(session), after[0]!.nodeId)).toBe("loom.quote")
  })

  it("marks a configured node as changed", async () => {
    const session = await sessionFor("backdrop")
    const record = await ask(session, "backdrop")
    const marks = await marksFor(session, record)

    expect(marks[0]?.label).toBe("Just changed")
    expect(typeOf(await headOf(session), marks[0]!.nodeId)).toBe("loom.hero")
  })

  /**
   * The re-theme is the one change with nothing to point at, and that is the
   * right answer rather than a gap: it configures the page root, so a mark would
   * ring the whole stage and say "everything" — which is exactly what the page
   * turning over says already, and better.
   */
  it("marks nothing when the change is to the page itself", async () => {
    const session = await sessionFor("palette")
    const record = await ask(session, "palette")

    expect(record.outcome).toBe("applied")
    expect(record.touched.map((one) => one.kind)).toEqual(["changed"])
    expect(await marksFor(session, record)).toEqual([])
  })
})

describe("which change the page is about", () => {
  const applied = (revision: number): ChangeRecord => ({
    recordId: `i_${revision}`,
    askedAt: "2026-08-22T00:00:00.000Z",
    utterance: "something",
    origin: "user-instruction",
    outcome: "applied",
    revision: { produced: revision, replaced: revision - 1 },
    repaired: false,
    touched: [],
  })

  const held = (name: string): ChangeRecord => ({
    recordId: name,
    askedAt: "2026-08-22T00:00:00.000Z",
    utterance: "something else",
    origin: "user-instruction",
    outcome: "awaiting-you",
    heldProposalId: `p_${name}`,
    repaired: false,
    touched: [],
  })

  const waiting = held("i_held")

  const at = (revision: number): LoomTree => ({ ...demoPageTree(), revision })

  const ids = (spotlit: ReturnType<typeof spotlitChanges>): readonly string[] =>
    spotlit.map((one) => one.record.recordId)

  it("prefers the change that is asking the visitor for an answer", () => {
    expect(ids(spotlitChanges([applied(2), waiting], at(2)))).toEqual(["i_held"])
  })

  /**
   * The state this unit exists for, and the reason it is a list at all.
   *
   * A stranger is given five buttons and nothing telling them to answer one at a
   * time, so two asks held at once is a state they reach by doing the obvious
   * thing twice. Both cards said **Waiting on you**, both carried **Apply this
   * change** — and the page drew one mark, which the newest silently won.
   */
  it("marks every question still waiting, not just the newest", () => {
    expect(ids(spotlitChanges([held("i_b"), held("i_a")], at(0)))).toEqual(["i_b", "i_a"])
  })

  /**
   * And never in two colors at once. *"Two marks in two colors on one page is a
   * quiz rather than an explanation"* is the rule this list had to be reconciled
   * with, and it survives intact: green says *this landed* and amber says *this
   * is waiting*, and a page showing both asks a stranger to hold two ideas at
   * once. Two amber marks ask them to hold one idea, twice.
   */
  it("never mixes a landed change in with the questions", () => {
    const spotlit = spotlitChanges([held("i_b"), applied(2), held("i_a")], at(2))

    expect(ids(spotlit)).toEqual(["i_b", "i_a"])
    expect(spotlit.every((one) => one.tone === "awaiting")).toBe(true)
  })

  /**
   * Not "the newest record": answering a hold completes the record where it was
   * asked rather than adding one, so a rail read newest-first would mark an
   * older change at the moment the visitor is watching a newer one land.
   */
  it("otherwise marks whichever change produced the revision now on the stage", () => {
    expect(ids(spotlitChanges([applied(1), applied(2)], at(2)))).toEqual(["i_2"])
    expect(ids(spotlitChanges([applied(1), applied(2)], at(1)))).toEqual(["i_1"])
  })

  it("marks nothing for a change that never reached the page", () => {
    const { revision: _, ...refused } = { ...applied(1), outcome: "refused" as const }

    expect(spotlitChanges([applied(1)], at(2))).toEqual([])
    expect(spotlitChanges([refused], at(0))).toEqual([])
    expect(spotlitChanges([], at(0))).toEqual([])
  })

  /**
   * The one case where a hold is not marked, and it is the one that was drawing
   * the most misleading frame this surface can draw.
   *
   * Answering either of two holds kills the other where it stands
   * (`_lib/moved.ts`). The page went on ringing the dead one's band in amber and
   * labelling it *This would be removed*, which is this surface's color for a
   * question it is still asking. It is not asking, and no answer will land it.
   */
  it("does not mark a hold the page has moved past", () => {
    expect(spotlitChanges([waiting], at(2), new Set(["i_held"]))).toEqual([])
  })

  /** And the mark falls through to the change that really is on the stage. */
  it("marks the change on the stage instead of a hold that can never land", () => {
    const spotlit = spotlitChanges([waiting, applied(2)], at(2), new Set(["i_held"]))

    expect(ids(spotlit)).toEqual(["i_2"])
    expect(spotlit[0]?.tone).toBe("applied")
  })

  /** A hold that can still land is still the thing the visitor is being asked about. */
  it("still prefers a hold the page has not moved past", () => {
    expect(ids(spotlitChanges([applied(2), waiting], at(2), new Set(["i_other"])))).toEqual([
      "i_held",
    ])
  })

  /** And a dead one drops out of a list the live one stays in. */
  it("keeps the live question and drops the dead one", () => {
    expect(ids(spotlitChanges([held("i_dead"), held("i_live")], at(2), new Set(["i_dead"])))).toEqual(
      ["i_live"]
    )
  })
})

describe("how many marks one change may draw", () => {
  it("stops at three, because ringing everything says nothing", () => {
    const tree = demoPageTree()
    const touched: readonly TouchedNode[] = tree.root.children
      .filter((node) => node.kind === "element")
      .map((node) => ({ kind: "changed", nodeId: node.id }))

    expect(touched.length).toBeGreaterThan(MAX_SPOTS)
    expect(spotlightsFor(tree, touched, "applied")).toHaveLength(MAX_SPOTS)
  })

  it("marks one node once, however many operations named it", () => {
    const tree = demoPageTree()
    const band = tree.root.children.find((node) => node.kind === "element")
    if (band === undefined) throw new Error("the demo page has no bands")

    const twice: readonly TouchedNode[] = [
      { kind: "changed", nodeId: band.id },
      { kind: "moved", nodeId: band.id, parentId: tree.root.id, index: 0 },
    ]

    expect(spotlightsFor(tree, twice, "applied")).toHaveLength(1)
  })

  it("marks nothing for a node this tree has never heard of", () => {
    expect(spotlightsFor(demoPageTree(), [{ kind: "changed", nodeId: id("nowhere") }], "applied")).toEqual([])
  })

  /**
   * And the cap is the *page's*, which is the whole reason two changes cannot be
   * marked by calling the one-change function twice.
   *
   * Three is the point past which a marked page stops saying *this changed* and
   * starts saying *everything changed*. Two changes obeying that cap separately
   * draw six marks and break it together, each of them faultless.
   */
  it("spends one budget of three across every change on the page", () => {
    const tree = demoPageTree()
    const bands = tree.root.children.filter((node) => node.kind === "element")
    const half = Math.ceil(bands.length / 2)

    const drawn = spotlightsAcross(tree, [
      {
        touched: bands.slice(0, half).map((node) => ({ kind: "changed" as const, nodeId: node.id })),
        tone: "awaiting",
        restoring: false,
      },
      {
        touched: bands.slice(half).map((node) => ({ kind: "changed" as const, nodeId: node.id })),
        tone: "awaiting",
        restoring: false,
      },
    ])

    expect(bands.length).toBeGreaterThan(MAX_SPOTS)
    expect(drawn.flat()).toHaveLength(MAX_SPOTS)
  })

  /**
   * And it is spent in rounds, which is the property a straight `slice` of a
   * concatenated list would not have: a change with nine configures in it would
   * take the whole budget and leave the question beside it unmarked — the exact
   * failure this unit is fixing, reached by a different road.
   */
  it("gives every change a mark before it gives any change a second", () => {
    const tree = demoPageTree()
    const bands = tree.root.children.filter((node) => node.kind === "element")
    const greedy = bands.map((node) => ({ kind: "changed" as const, nodeId: node.id }))
    const modest = bands.slice(-1).map((node) => ({ kind: "changed" as const, nodeId: node.id }))

    const drawn = spotlightsAcross(tree, [
      { touched: greedy, tone: "awaiting", restoring: false },
      { touched: modest, tone: "awaiting", restoring: false },
    ])

    expect(greedy.length).toBeGreaterThanOrEqual(MAX_SPOTS)
    expect(drawn[1]).toHaveLength(1)
    expect(drawn[0]?.length).toBe(MAX_SPOTS - 1)
  })

  /**
   * Two changes about the same band get one mark between them, and the second is
   * told it has none rather than being given the first one's.
   *
   * A card wears its own mark's words (`_lib/marked.ts`), so a change credited
   * with a mark the page is not drawing for it would point a visitor at somebody
   * else's ring.
   */
  it("gives one band to one change, and says so", () => {
    const tree = demoPageTree()
    const band = tree.root.children.find((node) => node.kind === "element")
    if (band === undefined) throw new Error("the demo page has no bands")

    const both = [{ kind: "changed" as const, nodeId: band.id }]
    const drawn = spotlightsAcross(tree, [
      { touched: both, tone: "awaiting", restoring: false },
      { touched: both, tone: "awaiting", restoring: false },
    ])

    expect(drawn[0]).toHaveLength(1)
    expect(drawn[1]).toEqual([])
  })
})

/**
 * The two questions a stranger reaches by pressing twice, driven through the
 * write path the browser uses rather than through fixtures.
 *
 * The presets are the two the Gate holds, which is not a coincidence to be
 * asserted around: `trim` is the demo's lead precisely because it is held, and
 * `band` is the other structural one. If a policy retune ever let either through
 * this fails, which is the right place to find out.
 */
describe("two questions open at once", () => {
  const marksAcross = async (
    session: DemoSession,
    records: readonly ChangeRecord[]
  ): Promise<readonly (readonly Spotlight[])[]> => {
    const tree = await headOf(session)

    return spotlightsAcross(
      tree,
      spotlitChanges(records, tree).map((one) => ({
        touched: one.record.touched,
        tone: one.tone,
        restoring: isUndo(one.record),
      }))
    )
  }

  it("marks both, in each change's own words", async () => {
    const session = await sessionFor("two-holds")
    const first = await ask(session, "trim")
    const second = await ask(session, "band")

    expect(first.outcome).toBe("awaiting-you")
    expect(second.outcome).toBe("awaiting-you")

    /** Newest first, as the rail lists them. */
    const drawn = await marksAcross(session, [second, first])

    expect(drawn.flat()).toHaveLength(2)
    expect(drawn[0]?.[0]?.label).toBe("Something new would go here")
    expect(drawn[1]?.[0]?.label).toBe("This would be removed")
    expect(drawn.flat().every((spot) => spot.tone === "awaiting")).toBe(true)
  })

  /**
   * And the rail stops saying *this*.
   *
   * The old line — *"The page is marked where **this** would happen, if you say
   * yes"* — had two referents and chose neither, and the card that won the mark
   * was decided by an ordering rule the screen never states.
   */
  it("stops pointing at “this” once there is more than one of them", async () => {
    const session = await sessionFor("two-holds-line")
    const first = await ask(session, "trim")
    const second = await ask(session, "band")
    const drawn = await marksAcross(session, [second, first])

    const one = markedPage([{ recordId: second.recordId, spots: drawn[0] ?? [] }])
    const two = markedPage([
      { recordId: second.recordId, spots: drawn[0] ?? [] },
      { recordId: first.recordId, spots: drawn[1] ?? [] },
    ])

    expect(one.line).toBe(MARKED_AWAITING)
    expect(one.words.size).toBe(0)

    expect(two.line).toBe(MARKED_MANY)
    expect(two.words.get(second.recordId)).toBe("Something new would go here")
    expect(two.words.get(first.recordId)).toBe("This would be removed")
  })
})

describe("the mark's stylesheet", () => {
  const css = readFileSync(fileURLToPath(new URL("../globals.css", import.meta.url)), "utf8")

  const tokenValue = (token: string): string => {
    const value = new RegExp(`${token}:\\s*([^;]+);`).exec(css)?.[1]?.trim()
    if (value === undefined) throw new Error(`the demo's stylesheet declares no ${token}`)

    return value
  }

  const luminance = (hex: string): number => {
    const parsed = /^#([0-9a-f]{6})$/i.exec(hex.trim())
    if (!parsed?.[1]) throw new Error(`${hex} is not a six-digit hex color`)

    const channels = [0, 2, 4].map((offset) => {
      const part = Number.parseInt(parsed[1]!.slice(offset, offset + 2), 16) / 255

      return part <= 0.03928 ? part / 12.92 : ((part + 0.055) / 1.055) ** 2.4
    })

    return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!
  }

  const contrast = (a: string, b: string): number => {
    const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x)

    return (light! + 0.05) / (dark! + 0.05)
  }

  /**
   * The color is the entire mechanism: a visitor is never told what the marks
   * mean, they see one color on the badge, on the dot in the rail and on the
   * ring on the page, and read it in a glance. If a run retunes the badge and
   * not the ring, that teaching quietly stops working and nothing else notices.
   */
  it("wears the same two colors the record's own badges do", () => {
    expect(SPOT_COLORS.applied.fill).toBe(tokenValue("--outcome-applied-text"))
    expect(SPOT_COLORS.awaiting.fill).toBe(tokenValue("--outcome-awaiting-text"))
  })

  it.each([["applied"], ["awaiting"]] as const)("keeps the %s chip legible", (tone) => {
    expect(contrast(SPOT_COLORS[tone].fill, SPOT_COLORS[tone].ink)).toBeGreaterThanOrEqual(4.5)
  })

  /**
   * The mark is drawn *inside* the stage, and the stage is whatever palette the
   * tree is wearing — which the demo's own first button changes. `editorial` is
   * near-white and `bold` is near-black, so a ring tuned for one of them is
   * invisible on the other after a single click. Read from the registry rather
   * than written here, so a palette that moves fails this rather than the eye.
   */
  const canvasOf = (palette: typeof editorialPalette): string => {
    const canvas = palette.slots["bg-canvas"]
    if (canvas === undefined) throw new Error(`${palette.id} has no bg-canvas`)

    return canvas
  }

  it.each([
    ["applied", editorialPalette.id],
    ["applied", boldPalette.id],
    ["awaiting", editorialPalette.id],
    ["awaiting", boldPalette.id],
  ] as const)("keeps the %s ring visible on the %s stage", (tone, paletteId) => {
    const palette = paletteId === boldPalette.id ? boldPalette : editorialPalette

    expect(contrast(SPOT_COLORS[tone].edge, canvasOf(palette))).toBeGreaterThanOrEqual(3)
  })

  it("keys the rule on the attribute edit mode already puts on the node", () => {
    const rules = spotlightCss([
      {
        nodeId: id("demo-n7"),
        tone: "applied",
        label: "Just changed",
        placement: "inside",
        subject: "node",
      },
    ])

    expect(rules).toContain('[data-loom-node="demo-n7"]')
    expect(rules).toContain('content: "Just changed"')
    expect(rules).toContain(SPOT_COLORS.applied.edge)
  })

  /**
   * The mark's position, which is the difference between pointing at a band and
   * pointing at the space beside it.
   *
   * Asserted as geometry rather than as a string of CSS: `bottom: 100%` puts the
   * mark's lower edge on the band's top edge, so it is drawn in the gap above;
   * `top: 100%` puts it under the band; and the corner case keeps the chip
   * inside, where a clipping primitive cannot cut it in half.
   */
  const markRule = (spot: Spotlight): string => {
    const after = spotlightCss([spot]).split("::after")[1]
    if (after === undefined) throw new Error("the mark drew nothing")

    return after
  }

  const place = (placement: "inside" | "above" | "below"): Spotlight => ({
    nodeId: id("n_1"),
    tone: "applied",
    label: "Something was removed here",
    placement,
    subject: "place",
  })

  const onTheNode: Spotlight = {
    nodeId: id("n_1"),
    tone: "applied",
    label: "Just changed",
    placement: "inside",
    subject: "node",
  }

  it("draws a mark on a band inside its own corner", () => {
    expect(markRule(onTheNode)).toContain("inset: 6px 6px auto auto;")
  })

  /**
   * And a mark on a gap spans it. The seam is as wide as the page's content
   * column, so the bar is too — `right: 0` rather than `right: 6px` is the whole
   * difference between a chip beside a band and a bar across the space where a
   * band was.
   */
  it("draws a mark on a gap across the gap, clear of the band beside it", () => {
    expect(markRule(place("above"))).toContain("inset: auto 0 100% 0;")
    expect(markRule(place("above"))).toContain("margin: 0 0 10px 0;")

    expect(markRule(place("below"))).toContain("inset: 100% 0 auto 0;")
    expect(markRule(place("below"))).toContain("margin: 10px 0 0 0;")
  })

  /**
   * **The defect this whole distinction exists for.**
   *
   * A `place` mark is borrowed onto a band that did not change — the label has
   * said so since the first version of this file, in the word *here*. For one
   * run the geometry did not: the same ring was drawn either way, so the demo's
   * payoff moment ended on a green ring around a patient's testimonial that is
   * plainly still on the page, under a chip reading *Something was removed
   * here*.
   *
   * A ring is a claim about the thing inside it. Only a mark whose subject is
   * the node may draw one.
   */
  it("rings a band it is about, and never one it has only borrowed", () => {
    for (const spot of [place("above"), place("below"), place("inside")]) {
      const node = spotlightCss([spot]).split("::after")[0] ?? ""

      expect(node).not.toContain("outline")
      expect(node).toContain("position: relative;")
    }

    expect(spotlightCss([onTheNode]).split("::after")[0]).toMatch(/outline:\s*2px solid/)
  })

  /**
   * `border-radius` on the node exists to round the outline. Left on an unringed
   * band it rounds corners the page never asked to have rounded — the mark
   * changing the page it is describing, which is the one thing `outline` was
   * chosen over `border` to avoid.
   */
  it("rounds nothing on a band it does not ring", () => {
    expect(spotlightCss([place("above")]).split("::after")[0]).not.toContain("border-radius")
    expect(spotlightCss([onTheNode]).split("::after")[0]).toContain("border-radius: 4px;")
  })

  /**
   * A bar under a band overlaps the band that follows it, and that band paints
   * later. Without this the mark disappears behind any section carrying a ground
   * of its own — which on this page is every other one.
   */
  it("lifts a band carrying a bar beneath it above the band that follows", () => {
    const below = spotlightCss([{ ...place("below"), label: "gone" }])
    const above = spotlightCss([{ ...place("above"), label: "gone" }])

    expect(below.split("::after")[0]).toContain("z-index: 1;")
    expect(above.split("::after")[0]).not.toContain("z-index: 1;")
  })

  /**
   * `outline` and never `border`: a border occupies space, so the mark would
   * move the page it is describing — and a visitor comparing before and after
   * would be shown a shift the change did not make.
   */
  it("draws with an outline, so marking a band does not move it", () => {
    const rules = spotlightCss([onTheNode])

    expect(rules).toMatch(/outline:\s*2px solid/)
    expect(rules).not.toMatch(/^\s*border:/m)
  })

  it("escapes a label so a quotation mark cannot end the rule early", () => {
    const rules = spotlightCss([
      {
        nodeId: id('a"b'),
        tone: "awaiting",
        label: 'say "no"',
        placement: "inside",
        subject: "node",
      },
    ])

    expect(rules).toContain('content: "say \\"no\\""')
    expect(rules).toContain('[data-loom-node="a\\"b"]')
  })

  it("is nothing at all when there is nothing to mark", () => {
    expect(spotlightCss([])).toBe("")
  })
})

/**
 * What the gap says it is missing, which is the demo's payoff frame.
 *
 * Press the one control this surface invites, say yes, and a visitor is carried
 * to the place the change happened — where, for a removal, there is nothing to
 * look at. The mark there read *"Something was removed here"*: a sentence about
 * an absence, over an absence, on a band the visitor had seen for two seconds
 * and most likely not at all. These assert the words.
 *
 * Through the server action's own reading of the tree (`AssessedAgainst`),
 * because the words come off the subtree the *assessment* carried and the whole
 * defect this closes is that the fold which produces the applied card is a
 * second assessment with no tree in it.
 */
describe("the words a mark names when there is nothing left to point at", () => {
  const settings = settingsOf(demoRegistry)

  const askWith = async (session: DemoSession, presetId: string): Promise<ChangeRecord> => {
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

    const record = recordFromEvents(write.narrated(), undefined, {
      before: head,
      settings,
      earlier: [],
    })
    if (!record) throw new Error("the runtime narrated nothing")

    return record
  }

  it("quotes what came off the page, in the gap it came off", async () => {
    const session = await sessionFor("gap-words")
    const held = await askWith(session, "trim")
    const applied = await answer(session, held)
    const marks = await marksFor(session, applied)

    expect(marks[0]?.subject).toBe("place")
    expect(marks[0]?.label).toBe("Something was removed here: “3,400” “24” “92%”")
  })

  /**
   * The assertion the defect actually needed. Confirming a hold narrates a
   * fresh assessment with no tree in hand, and it used to recompute `touched`
   * over the top of the reading that had the words — so every fold that could
   * quote was a fold nobody was looking at, and the one on screen could not.
   */
  it("still has them after the answer, which is a second assessment with no tree", async () => {
    const session = await sessionFor("gap-survives")
    const held = await askWith(session, "trim")
    const applied = await answer(session, held)

    expect(applied.touched.find((one) => one.kind === "removed")?.words).toEqual({
      words: ["3,400", "24", "92%"],
      more: 0,
    })
  })

  /**
   * The same words the card is wearing three inches away, cut by the same
   * function — because a stranger reads the two in one glance and a mark that
   * had cut differently would be this surface contradicting itself about the
   * thing it had just done.
   */
  it("says exactly what the card beside it says", async () => {
    const session = await sessionFor("gap-agrees")
    const held = await askWith(session, "trim")
    const applied = await answer(session, held)
    const marks = await marksFor(session, applied)

    for (const word of applied.did?.[0]?.words ?? []) {
      expect(marks[0]?.label).toContain(`“${word}”`)
    }
  })

  /**
   * A mark on a node is drawn round the thing it is about, with every word of
   * it on the screen inside the ring. Quoting there would be reading a band
   * aloud to somebody looking straight at it.
   */
  it("says nothing extra while the band is still there to be seen", async () => {
    const session = await sessionFor("gap-held")
    const held = await askWith(session, "trim")
    const marks = await marksFor(session, held)

    expect(marks[0]?.subject).toBe("node")
    expect(marks[0]?.label).toBe("This would be removed")
  })

  /** A gap a change has not filled yet is the same case, pointed the other way. */
  it("quotes what would arrive, in the space it would arrive in", async () => {
    const session = await sessionFor("gap-insert")
    const held = await askWith(session, "band")
    const marks = await marksFor(session, held)

    expect(marks[0]?.subject).toBe("place")
    expect(marks[0]?.label).toMatch(/^Something new would go here: “/u)
  })

  /**
   * A mark whose words run past the column would widen the page it is
   * describing — the one thing every rule in this file is written to avoid — so
   * a bar wraps and only a chip in a corner is held to one line.
   */
  it("lets a bar in a gap wrap and holds a chip in a corner to one line", () => {
    const inTheGap: Spotlight = {
      nodeId: id("n_1"),
      tone: "applied",
      label: "Something was removed here: “3,400”",
      placement: "above",
      subject: "place",
    }
    const onTheBand: Spotlight = { ...inTheGap, placement: "inside", subject: "node" }

    expect(spotlightCss([inTheGap])).toContain("white-space: normal")
    expect(spotlightCss([onTheBand])).toContain("white-space: nowrap")
  })
})
