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
} from "@loom/runtime"
import { commitIntent, confirmHeld } from "@loom/runtime/write"

import { demoPageTree } from "./page-tree"
import { presetById, presetInterpreter } from "./presets"
import { recordFromEvents, type ChangeRecord } from "./record"
import { beginDemoWrite, demoSession, type DemoSession } from "./session"
import {
  MAX_SPOTS,
  SPOT_COLOURS,
  spotlightCss,
  spotlightsFor,
  spotlitChange,
  type Spotlight,
} from "./spotlight"
import type { TouchedNode } from "./touched"

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

/** The mark for a change, read against the tree that change left behind. */
const marksFor = async (session: DemoSession, record: ChangeRecord): Promise<readonly Spotlight[]> => {
  const tree = await headOf(session)
  const spotlit = spotlitChange([record], tree)

  return spotlit ? spotlightsFor(tree, spotlit.record.touched, spotlit.tone) : []
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
  it("marks the band a held removal is asking about, in the waiting colour", async () => {
    const session = await sessionFor("trim-held")
    const record = await ask(session, "trim")
    const marks = await marksFor(session, record)

    expect(record.outcome).toBe("awaiting-you")
    expect(marks).toHaveLength(1)
    expect(marks[0]?.tone).toBe("awaiting")
    expect(marks[0]?.label).toBe("This would be removed")
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
  })

  it("marks where a held insert would go, and the node itself once it exists", async () => {
    const session = await sessionFor("band")
    const held = await ask(session, "band")
    const before = await marksFor(session, held)

    expect(before[0]?.label).toBe("Something new would go here")
    expect(before[0]?.tone).toBe("awaiting")

    const applied = await answer(session, held)
    const after = await marksFor(session, applied)

    expect(after[0]?.label).toBe("New — just added")
    expect(typeOf(await headOf(session), after[0]!.nodeId)).toBe("loom.section")
  })

  /**
   * A move near the root is a restructure, so the Gate holds it — which means
   * the same node is marked twice in a visitor's session, in two colours, saying
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

  const waiting: ChangeRecord = {
    recordId: "i_held",
    askedAt: "2026-08-22T00:00:00.000Z",
    utterance: "something else",
    origin: "user-instruction",
    outcome: "awaiting-you",
    heldProposalId: "p_1",
    repaired: false,
    touched: [],
  }

  const at = (revision: number): LoomTree => ({ ...demoPageTree(), revision })

  it("prefers the change that is asking the visitor for an answer", () => {
    expect(spotlitChange([applied(2), waiting], at(2))?.record.recordId).toBe("i_held")
  })

  /**
   * Not "the newest record": answering a hold completes the record where it was
   * asked rather than adding one, so a rail read newest-first would mark an
   * older change at the moment the visitor is watching a newer one land.
   */
  it("otherwise marks whichever change produced the revision now on the stage", () => {
    expect(spotlitChange([applied(1), applied(2)], at(2))?.record.recordId).toBe("i_2")
    expect(spotlitChange([applied(1), applied(2)], at(1))?.record.recordId).toBe("i_1")
  })

  it("marks nothing for a change that never reached the page", () => {
    const { revision: _, ...refused } = { ...applied(1), outcome: "refused" as const }

    expect(spotlitChange([applied(1)], at(2))).toBeUndefined()
    expect(spotlitChange([refused], at(0))).toBeUndefined()
    expect(spotlitChange([], at(0))).toBeUndefined()
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
    if (!parsed?.[1]) throw new Error(`${hex} is not a six-digit hex colour`)

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
   * The colour is the entire mechanism: a visitor is never told what the marks
   * mean, they see one colour on the badge, on the dot in the rail and on the
   * ring on the page, and read it in a glance. If a run retunes the badge and
   * not the ring, that teaching quietly stops working and nothing else notices.
   */
  it("wears the same two colours the record's own badges do", () => {
    expect(SPOT_COLOURS.applied.fill).toBe(tokenValue("--outcome-applied-text"))
    expect(SPOT_COLOURS.awaiting.fill).toBe(tokenValue("--outcome-awaiting-text"))
  })

  it.each([["applied"], ["awaiting"]] as const)("keeps the %s chip legible", (tone) => {
    expect(contrast(SPOT_COLOURS[tone].fill, SPOT_COLOURS[tone].ink)).toBeGreaterThanOrEqual(4.5)
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

    expect(contrast(SPOT_COLOURS[tone].edge, canvasOf(palette))).toBeGreaterThanOrEqual(3)
  })

  it("keys the rule on the attribute edit mode already puts on the node", () => {
    const rules = spotlightCss([{ nodeId: id("demo-n7"), tone: "applied", label: "Just changed" }])

    expect(rules).toContain('[data-loom-node="demo-n7"]')
    expect(rules).toContain('content: "Just changed"')
    expect(rules).toContain(SPOT_COLOURS.applied.edge)
  })

  /**
   * `outline` and never `border`: a border occupies space, so the mark would
   * move the page it is describing — and a visitor comparing before and after
   * would be shown a shift the change did not make.
   */
  it("draws with an outline, so marking a band does not move it", () => {
    const rules = spotlightCss([{ nodeId: id("n_1"), tone: "applied", label: "Just changed" }])

    expect(rules).toMatch(/outline:\s*2px solid/)
    expect(rules).not.toMatch(/^\s*border:/m)
  })

  it("escapes a label so a quotation mark cannot end the rule early", () => {
    const rules = spotlightCss([{ nodeId: id('a"b'), tone: "awaiting", label: 'say "no"' }])

    expect(rules).toContain('content: "say \\"no\\""')
    expect(rules).toContain('[data-loom-node="a\\"b"]')
  })

  it("is nothing at all when there is nothing to mark", () => {
    expect(spotlightCss([])).toBe("")
  })
})
