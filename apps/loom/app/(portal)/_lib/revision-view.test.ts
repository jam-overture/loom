import { describe, expect, it } from "vitest"

import {
  intentIdSchema,
  nodeIdSchema,
  type DeltaId,
  type IntentOrigin,
  type ProposalId,
  type TreeDelta,
  type TreeId,
} from "@jam-overture/loom"
import type { IntentEpisode } from "@jam-overture/loom/telemetry"
import type { StoredRevision } from "@jam-overture/loom/store"

import { describeAsk } from "./episode-view"
import { changesOf, revisionView, surenessOf, whoAllowed, whoAsked } from "./revision-view"
import { readingOf } from "./vocabulary"

const treeId = "t_1" as TreeId
const nodeId = (id: string) => nodeIdSchema.parse(id)
const APPLIED_AT = "2026-08-09T12:00:00.000Z"

const entry = (extra: {
  readonly actor?: string
  readonly answeredBy?: string
  readonly origin?: IntentOrigin
  readonly authoredBy?: "model" | "runtime"
  readonly confidence?: number
  readonly operations?: TreeDelta["operations"]
} = {}): StoredRevision => ({
  treeId,
  revision: 4,
  proposalId: "p_7" as ProposalId,
  delta: {
    deltaId: "d_1" as DeltaId,
    treeId,
    baseRevision: 3,
    operations: extra.operations ?? [{ op: "remove", nodeId: nodeId("n_gone") }],
  },
  provenance: {
    origin: extra.origin ?? "user-instruction",
    ...(extra.actor === undefined ? {} : { actor: extra.actor }),
    interpreter: "scripted",
    authoredBy: extra.authoredBy ?? "model",
    confidence: extra.confidence ?? 0.8,
    interpretedAt: APPLIED_AT,
  },
  appliedAt: APPLIED_AT,
  ...(extra.answeredBy === undefined ? {} : { answeredBy: extra.answeredBy }),
})

describe("whoAsked", () => {
  it("names the person when the host recorded one", () => {
    expect(whoAsked(entry({ actor: "ana@loom.local" }))).toBe("ana@loom.local asked for this.")
  })

  /**
   * `asked by system-signal` was the old line: a field name and a runtime enum
   * member, standing in for a sentence about who wanted the change.
   */
  it("names the act when there is nobody to name", () => {
    expect(whoAsked(entry({ origin: "system-signal" }))).toBe(
      "Your site asked for this by itself."
    )
    expect(whoAsked(entry({ origin: "scheduled-adaptation" }))).toBe(
      "A schedule asked for this."
    )
  })

  /**
   * The full stop is part of the sentence and not part of the table's label —
   * the same rule Activity follows, and for the reason a 24 August screenshot
   * found: a label set beside another sentence reads as a dropped word without
   * one.
   */
  it("ends every reading with a full stop, because another sentence follows it", () => {
    const origins: readonly IntentOrigin[] = [
      "user-instruction",
      "developer",
      "system-signal",
      "scheduled-adaptation",
    ]

    for (const origin of origins) expect(whoAsked(entry({ origin }))).toMatch(/\.$/u)
    expect(whoAsked(entry({ actor: "ana" }))).toMatch(/\.$/u)
  })
})

describe("whoAllowed", () => {
  it("names the approver when the log knows one", () => {
    expect(whoAllowed(entry({ answeredBy: "bob@loom.local" }))).toBe(
      "bob@loom.local said yes to it."
    )
  })

  /**
   * 0029. A revision with no `answeredBy` is either a change nobody had to
   * approve or one a host approved without naming anybody, and the revision
   * cannot tell those apart. `Allowed by nobody` stated one of the two as fact;
   * so would a friendlier "nobody had to approve this", which is the form the
   * same mistake takes during a plain-language pass.
   */
  it("says nothing at all when the log does not know", () => {
    expect(whoAllowed(entry())).toBeUndefined()
  })
})

describe("surenessOf", () => {
  it("attributes the confidence to the model that graded itself", () => {
    expect(surenessOf(entry({ confidence: 0.95 }))).toBe("The AI says it is very sure.")
    expect(surenessOf(entry({ confidence: 0.4 }))).toBe("The AI says it is unsure.")
  })

  /**
   * An undo is a delta the runtime computed, and only a model grades itself
   * (0007) — which is exactly why calibration reads `authoredBy` rather than
   * recognising an interpreter name (0031). This screen is the only one an undo
   * appears on, so it is the only one that could make this mistake.
   */
  it("does not put a self-grade in the AI's mouth for a change the runtime wrote", () => {
    const said = surenessOf(entry({ authoredBy: "runtime", confidence: 1 }))

    expect(said).not.toContain("The AI says")
    expect(said).toContain("worked this change out from the record")
    /* Two "itself"s in one line read as a stutter; a screenshot found it. */
    expect(said).not.toContain("itself")
  })
})

describe("changesOf", () => {
  it("reads every operation in the delta's own order", () => {
    const view = changesOf(
      entry({
        operations: [
          { op: "configure", nodeId: nodeId("n_head"), set: { title: "Hi" }, unset: [] },
          { op: "remove", nodeId: nodeId("n_gone") },
        ],
      })
    )

    expect(view.map(readingOf)).toEqual([
      "Changed n_head's title.",
      "Deleted n_gone and everything inside it.",
    ])
  })

  /** A delta with no operations is a real entry; an empty list is not a blank. */
  it("reads an empty delta as no sentences rather than as one empty one", () => {
    expect(changesOf(entry({ operations: [] }))).toEqual([])
  })
})

describe("revisionView", () => {
  it("assembles the four readings a row prints", () => {
    const view = revisionView(entry({ actor: "ana", answeredBy: "bob" }))

    expect(view.who).toBe("ana asked for this.")
    expect(view.allowed).toBe("bob said yes to it.")
    expect(view.sure).toBe("The AI says it is fairly sure.")
    expect(view.changes.map(readingOf)).toEqual([
      "Deleted n_gone and everything inside it.",
    ])
  })

  /**
   * The three sentences are set side by side by `RevisionRow`, so the paragraph
   * they make is the thing that has to read. Asserted here as well as in the
   * component, because this is where a reworded table would break it and the
   * component test would then be asserting a sentence nobody wrote.
   */
  it("makes a paragraph when its sentences are joined with single spaces", () => {
    const view = revisionView(entry({ actor: "ana", answeredBy: "bob" }))

    expect([view.who, view.allowed, view.sure].join(" ")).toBe(
      "ana asked for this. bob said yes to it. The AI says it is fairly sure."
    )
  })
})

/**
 * The agreement that matters, and the one nothing could see while each screen
 * held its own words.
 *
 * History and Activity describe the same act from two sides — Activity from the
 * ask, History from what the ask became — and a reader moves between them by
 * following a revision link. On 24 August the two screens were found calling one
 * turned-down change `discarded`, grey, on one and "You said no", red, on the
 * other; this is the same class of defect caught before it ships rather than
 * after.
 */
describe("History and Activity agree about who asked", () => {
  const episode = (origin: IntentOrigin, actor?: string): IntentEpisode => ({
    intentId: intentIdSchema.parse("i_1"),
    treeId,
    startedAt: APPLIED_AT,
    intent: {
      intentId: intentIdSchema.parse("i_1"),
      origin,
      ...(actor === undefined ? {} : { actor }),
      baseRevision: 3,
      utteranceLength: 12,
      observedAt: APPLIED_AT,
    },
    proposals: [],
    resolution: { kind: "committed", proposalId: "p_7" as ProposalId, revision: 4 },
  })

  it("words a named asker identically on both screens", () => {
    expect(whoAsked(entry({ actor: "ana@loom.local" }))).toBe(
      describeAsk(episode("user-instruction", "ana@loom.local")).who
    )
  })

  it("words an unnamed asker identically on both screens, for every origin", () => {
    const origins: readonly IntentOrigin[] = [
      "user-instruction",
      "developer",
      "system-signal",
      "scheduled-adaptation",
    ]

    for (const origin of origins) {
      expect(whoAsked(entry({ origin }))).toBe(describeAsk(episode(origin)).who)
    }
  })
})
