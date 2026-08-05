import { describe, expect, it } from "vitest"

import { sequentialIdFactory, treeIdSchema } from "../ids.js"
import { err, ok } from "../result.js"
import type { Clock, RuntimeEvent } from "../runtime/events.js"
import { buildIntent, buildProposal, FIXED_INSTANT } from "../testing/doubles.js"
import { buildElement } from "../tree/builders.js"
import { createTree } from "../tree/tree.js"

import { episodesOf } from "./episode.js"
import { recordOf, type TelemetryRecord } from "./event.js"
import type { RecordedTelemetry, TelemetryError, TelemetryJournal } from "./journal.js"
import { memoryTelemetryJournal } from "./memory.js"
import {
  applyRetention,
  describeRetention,
  horizonOf,
  MIN_RETENTION_MS,
  retentionPlanOf,
  retentionPolicySchema,
  type RetentionPolicy,
} from "./retention.js"

const DAY = 24 * 60 * 60 * 1000
const NOW = "2026-08-04T12:00:00.000Z"

const daysBefore = (days: number): string => new Date(Date.parse(NOW) - days * DAY).toISOString()

const thirtyDays: RetentionPolicy = { maxAgeMs: 30 * DAY }

/** How the plan sees the world: a horizon, and records either side of it. */
const HORIZON = daysBefore(30)

type Shape = "committed" | "held" | "open" | "orphan"

/**
 * A whole episode, narrated through `recordOf` so these tests exercise the same
 * narrowing a host writes through. The shape is what the fold will resolve it
 * to, which is the only thing retention asks about an episode.
 */
const episode = (namespace: string, shape: Shape): readonly TelemetryRecord[] => {
  const ids = sequentialIdFactory(namespace)
  const tree = createTree(buildElement(ids, { type: "loom.page" }), ids)
  const intent = buildIntent(ids, { treeId: tree.treeId, baseRevision: 0 })
  const proposal = buildProposal(ids, {
    intentId: intent.intentId,
    delta: {
      deltaId: ids.deltaId(),
      treeId: tree.treeId,
      baseRevision: 0,
      operations: [
        {
          op: "insert",
          parentId: tree.root.id,
          index: 0,
          node: buildElement(ids, { type: "loom.card" }),
        },
      ],
    },
  })

  const envelope = (event: RuntimeEvent): TelemetryRecord =>
    recordOf({ treeId: tree.treeId, occurredAt: FIXED_INSTANT, event })

  /** Names a proposal nothing in the journal ever proposed. */
  if (shape === "orphan") {
    return [envelope({ type: "change-committed", proposalId: proposal.proposalId, revision: 1 })]
  }

  const opening = [
    envelope({ type: "intent-received", intent }),
    envelope({ type: "change-proposed", proposal }),
  ]

  if (shape === "open") return opening

  if (shape === "held") {
    return [...opening, envelope({ type: "proposal-held", proposalId: proposal.proposalId })]
  }

  return [
    ...opening,
    envelope({
      type: "disposition-decided",
      proposalId: proposal.proposalId,
      disposition: {
        kind: "accepted",
        reason: { code: "within-policy", detail: "low stakes, reversible" },
        stakes: "low",
        reversible: true,
        confidence: 0.9,
        policyId: "default",
      },
    }),
    envelope({ type: "change-committed", proposalId: proposal.proposalId, revision: 1 }),
  ]
}

/** Positions and arrival stamps, assigned in the order the journal would. */
const journalOf = (
  chapters: readonly { readonly shape: Shape; readonly recordedAt: string; readonly namespace: string }[]
): readonly RecordedTelemetry[] => {
  let seq = 0

  return chapters.flatMap((chapter) =>
    episode(chapter.namespace, chapter.shape).map((record) => ({
      ...record,
      seq: (seq += 1),
      recordedAt: chapter.recordedAt,
    }))
  )
}

const old = (namespace: string, shape: Shape) => ({ namespace, shape, recordedAt: daysBefore(40) })
const recent = (namespace: string, shape: Shape) => ({ namespace, shape, recordedAt: daysBefore(1) })

const survivors = (
  records: readonly RecordedTelemetry[],
  before: number | null
): readonly RecordedTelemetry[] => records.filter((record) => before === null || record.seq >= before)

describe("retentionPolicySchema", () => {
  it("accepts a policy at the floor", () => {
    expect(retentionPolicySchema.safeParse({ maxAgeMs: MIN_RETENTION_MS }).success).toBe(true)
  })

  /** The units mistake the floor exists for: days written where milliseconds were wanted. */
  it("refuses a policy that would empty the journal on the next run", () => {
    expect(retentionPolicySchema.safeParse({ maxAgeMs: 7 }).success).toBe(false)
    expect(retentionPolicySchema.safeParse({ maxAgeMs: 0 }).success).toBe(false)
    expect(retentionPolicySchema.safeParse({ maxAgeMs: -DAY }).success).toBe(false)
  })
})

describe("horizonOf", () => {
  it("puts the horizon one policy-age behind now", () => {
    expect(horizonOf(thirtyDays, NOW)).toBe(daysBefore(30))
  })

  it("reads an unusable instant as no horizon rather than as the epoch", () => {
    expect(horizonOf(thirtyDays, "half past four")).toBeNull()
  })
})

describe("retentionPlanOf", () => {
  it("forgets nothing when there is nothing", () => {
    expect(retentionPlanOf([], HORIZON)).toEqual({
      before: null,
      forgets: 0,
      keptUnsettled: 0,
      keptBehind: 0,
      unsettledEpisodes: 0,
    })
  })

  it("forgets nothing when every record is younger than the horizon", () => {
    const records = journalOf([recent("a", "committed"), recent("b", "committed")])

    expect(retentionPlanOf(records, HORIZON).before).toBeNull()
  })

  it("forgets a settled episode that is entirely older than the horizon", () => {
    const records = journalOf([old("a", "committed")])
    const plan = retentionPlanOf(records, HORIZON)

    expect(plan.forgets).toBe(4)
    expect(plan.before).toBe(5)
    expect(plan.unsettledEpisodes).toBe(0)
  })

  /** The cut lands at the first young record, never past it. */
  it("stops at the horizon rather than at the end of what it was given", () => {
    const records = journalOf([old("a", "committed"), recent("b", "committed")])
    const plan = retentionPlanOf(records, HORIZON)

    expect(plan.forgets).toBe(4)
    expect(plan.before).toBe(5)
    expect(survivors(records, plan.before)).toHaveLength(4)
  })

  it("keeps a held episode however old it is", () => {
    const records = journalOf([old("a", "held")])
    const plan = retentionPlanOf(records, HORIZON)

    expect(plan).toEqual({
      before: null,
      forgets: 0,
      keptUnsettled: 3,
      keptBehind: 0,
      unsettledEpisodes: 1,
    })
  })

  it("keeps an episode the window never saw finish", () => {
    expect(retentionPlanOf(journalOf([old("a", "open")]), HORIZON).before).toBeNull()
  })

  /**
   * The straddle: proposed before the horizon, committed after it. The old half
   * resolves as `open`, so the whole episode stays and the commit keeps the
   * proposal it belongs to.
   */
  it("keeps an episode whose story crosses the horizon", () => {
    const opening = journalOf([old("a", "open")])
    const records = [
      ...opening,
      ...journalOf([recent("a", "committed")])
        .slice(2)
        .map((record, index) => ({ ...record, seq: opening.length + index + 1 })),
    ]

    const plan = retentionPlanOf(records, HORIZON)

    expect(plan.before).toBeNull()
    expect(episodesOf(survivors(records, plan.before)).unattributed).toEqual([])
  })

  it("forgets a settled episode that sits in front of an unsettled one", () => {
    const records = journalOf([old("a", "committed"), old("b", "held")])
    const plan = retentionPlanOf(records, HORIZON)

    expect(plan.forgets).toBe(4)
    expect(plan.before).toBe(5)
    expect(plan.keptUnsettled).toBe(3)
    expect(plan.keptBehind).toBe(0)
  })

  /**
   * The price of the prefix rule, and the reason it is reported separately: a
   * settled episode old enough to go stays because an unfinished one is in
   * front of it.
   */
  it("keeps a settled episode stranded behind an unsettled one, and counts it", () => {
    const records = journalOf([old("a", "held"), old("b", "committed")])
    const plan = retentionPlanOf(records, HORIZON)

    expect(plan.before).toBeNull()
    expect(plan.keptUnsettled).toBe(3)
    expect(plan.keptBehind).toBe(4)
    expect(plan.unsettledEpisodes).toBe(1)
  })

  /** Already an orphan: nothing earlier exists to attribute it to, so keeping it preserves nothing. */
  it("forgets a record whose proposal the journal never saw proposed", () => {
    const records = journalOf([old("a", "orphan"), old("b", "held")])
    const plan = retentionPlanOf(records, HORIZON)

    expect(plan.forgets).toBe(1)
    expect(episodesOf(records).unattributed).toHaveLength(1)
  })

  /**
   * The property the whole module exists for, asserted against the fold rather
   * than against counts: whatever survives a prune still reads as whole
   * episodes.
   */
  it("never leaves a record whose episode it forgot", () => {
    const records = journalOf([
      old("a", "committed"),
      old("b", "held"),
      old("c", "committed"),
      recent("d", "committed"),
    ])

    const plan = retentionPlanOf(records, HORIZON)
    const fold = episodesOf(survivors(records, plan.before))

    expect(plan.forgets).toBeGreaterThan(0)
    expect(fold.unattributed).toEqual([])
    expect(fold.episodes.map((entry) => entry.resolution.kind)).toEqual([
      "awaiting-answer",
      "committed",
      "committed",
    ])
  })

  /** Idempotent as a decision, not only as a deletion. */
  it("plans nothing more against what its own plan left behind", () => {
    const records = journalOf([old("a", "committed"), old("b", "held")])
    const first = retentionPlanOf(records, HORIZON)

    expect(retentionPlanOf(survivors(records, first.before), HORIZON).before).toBeNull()
  })
})

const clockAt = (instant: string): Clock => ({ now: () => instant })

const journalWith = async (
  chapters: readonly { readonly shape: Shape; readonly recordedAt: string; readonly namespace: string }[]
): Promise<TelemetryJournal> => {
  /** Time moves between writes, which is the only way a journal ever gets old. */
  let reading = ""
  const journal = memoryTelemetryJournal({ now: () => reading })

  for (const chapter of chapters) {
    reading = chapter.recordedAt
    await journal.record(episode(chapter.namespace, chapter.shape))
  }

  return journal
}

const seqsOf = async (journal: TelemetryJournal): Promise<readonly number[]> => {
  const page = await journal.read({ limit: 1000 })

  return page.ok ? page.value.records.map((record) => record.seq) : []
}

describe("applyRetention", () => {
  it("forgets what is older than the horizon and leaves the rest", async () => {
    const journal = await journalWith([old("a", "committed"), recent("b", "committed")])

    const outcome = await applyRetention(journal, { policy: thirtyDays, clock: clockAt(NOW) })

    expect(outcome).toMatchObject({ outcome: "forgot", removed: 4 })
    expect(await seqsOf(journal)).toEqual([5, 6, 7, 8])
  })

  it("reports nothing to forget when the journal is all young", async () => {
    const journal = await journalWith([recent("a", "committed")])

    expect(await applyRetention(journal, { policy: thirtyDays, clock: clockAt(NOW) })).toMatchObject(
      { outcome: "nothing-to-forget" }
    )
    expect(await seqsOf(journal)).toHaveLength(4)
  })

  it("leaves an old held proposal alone, because someone still owes it an answer", async () => {
    const journal = await journalWith([old("a", "held")])

    const outcome = await applyRetention(journal, { policy: thirtyDays, clock: clockAt(NOW) })

    expect(outcome).toEqual({
      outcome: "nothing-to-forget",
      plan: {
        before: null,
        forgets: 0,
        keptUnsettled: 3,
        keptBehind: 0,
        unsettledEpisodes: 1,
      },
    })
  })

  it("forgets nothing more on a second run", async () => {
    const journal = await journalWith([old("a", "committed"), recent("b", "committed")])
    await applyRetention(journal, { policy: thirtyDays, clock: clockAt(NOW) })

    const again = await applyRetention(journal, { policy: thirtyDays, clock: clockAt(NOW) })

    expect(again).toMatchObject({ outcome: "nothing-to-forget" })
    expect(await seqsOf(journal)).toHaveLength(4)
  })

  /** Incremental by design: a journal far behind is caught up over several runs. */
  it("forgets only as far as its scan reached, and catches up on the next run", async () => {
    const journal = await journalWith([
      old("a", "committed"),
      old("b", "committed"),
      old("c", "committed"),
    ])

    const first = await applyRetention(journal, {
      policy: thirtyDays,
      clock: clockAt(NOW),
      scanLimit: 4,
    })

    expect(first).toMatchObject({ outcome: "forgot", removed: 4 })
    expect(await seqsOf(journal)).toHaveLength(8)

    const second = await applyRetention(journal, { policy: thirtyDays, clock: clockAt(NOW) })

    expect(second).toMatchObject({ outcome: "forgot", removed: 8 })
    expect(await seqsOf(journal)).toEqual([])
  })

  it("refuses a policy below the floor without reading the journal", async () => {
    const journal = await journalWith([old("a", "committed")])

    const outcome = await applyRetention(journal, {
      policy: { maxAgeMs: 1 },
      clock: clockAt(NOW),
    })

    expect(outcome.outcome).toBe("refused")
    expect(await seqsOf(journal)).toHaveLength(4)
  })

  it("refuses a clock it cannot read", async () => {
    const journal = await journalWith([old("a", "committed")])

    const outcome = await applyRetention(journal, {
      policy: thirtyDays,
      clock: clockAt("not an instant"),
    })

    expect(outcome).toEqual({ outcome: "refused", reason: 'the clock read "not an instant"' })
    expect(await seqsOf(journal)).toHaveLength(4)
  })

  const unavailable: TelemetryError = { code: "unavailable", detail: "the database went away" }

  it("reports a journal it could not read, rather than forgetting on a guess", async () => {
    const journal: TelemetryJournal = {
      record: () => Promise.resolve(ok(undefined)),
      read: () => Promise.resolve(err(unavailable)),
      forget: () => Promise.resolve(ok({ removed: 0 })),
    }

    expect(await applyRetention(journal, { policy: thirtyDays, clock: clockAt(NOW) })).toEqual({
      outcome: "unavailable",
      error: unavailable,
    })
  })

  it("reports a deletion that failed", async () => {
    const backing = await journalWith([old("a", "committed")])
    const journal: TelemetryJournal = {
      record: backing.record,
      read: backing.read,
      forget: () => Promise.resolve(err(unavailable)),
    }

    expect(await applyRetention(journal, { policy: thirtyDays, clock: clockAt(NOW) })).toEqual({
      outcome: "unavailable",
      error: unavailable,
    })
  })

  it("uses the system clock when none is given", async () => {
    const journal = await journalWith([old("a", "committed")])

    expect(await applyRetention(journal, { policy: thirtyDays })).toMatchObject({
      outcome: "forgot",
      removed: 4,
    })
  })
})

describe("describeRetention", () => {
  it("says what went and what was held back", () => {
    expect(
      describeRetention({
        outcome: "forgot",
        removed: 12,
        plan: {
          before: 13,
          forgets: 12,
          keptUnsettled: 3,
          keptBehind: 4,
          unsettledEpisodes: 1,
        },
      })
    ).toBe("forgot 12 telemetry records, keeping 7 older records for 1 unfinished episode")
  })

  it("says nothing about holding back when nothing was", () => {
    expect(
      describeRetention({
        outcome: "nothing-to-forget",
        plan: { before: null, forgets: 0, keptUnsettled: 0, keptBehind: 0, unsettledEpisodes: 0 },
      })
    ).toBe("nothing to forget")
  })

  it("distinguishes a refusal from an outage", () => {
    expect(describeRetention({ outcome: "refused", reason: "too small" })).toContain("refused")
    expect(
      describeRetention({
        outcome: "unavailable",
        error: { code: "unavailable", detail: "no database" },
      })
    ).toContain("no database")
  })
})

describe("a journal that has been pruned", () => {
  it("still reads as whole episodes", async () => {
    const journal = await journalWith([
      old("a", "committed"),
      old("b", "held"),
      recent("c", "committed"),
    ])

    await applyRetention(journal, { policy: thirtyDays, clock: clockAt(NOW) })

    const page = await journal.read({ limit: 1000 })
    const fold = episodesOf(page.ok ? page.value.records : [])

    expect(fold.unattributed).toEqual([])
    expect(fold.episodes.map((entry) => entry.resolution.kind)).toEqual([
      "awaiting-answer",
      "committed",
    ])
  })

  it("hands out no position it has already forgotten", async () => {
    const journal = await journalWith([old("a", "committed")])
    await applyRetention(journal, { policy: thirtyDays, clock: clockAt(NOW) })

    await journal.record(episode("z", "committed"))

    expect((await seqsOf(journal))[0]).toBeGreaterThan(4)
  })
})

describe("treeId scoping is not what retention is about", () => {
  /**
   * A journal-wide position, deliberately. Retention is about how long the
   * journal holds anything, and a per-tree horizon would leave one tree's
   * records interleaved with another's below the same cut — which is a hole,
   * and holes are what the prefix rule exists to prevent.
   */
  it("forgets one tree's old records alongside another's", async () => {
    const journal = memoryTelemetryJournal(clockAt(daysBefore(40)))
    const treeId = treeIdSchema.parse("t_other")
    await journal.record(episode("a", "committed"))
    await journal.record([
      {
        treeId,
        occurredAt: FIXED_INSTANT,
        event: { type: "hold-confirmed", proposalId: sequentialIdFactory("q").proposalId() },
      },
    ])

    await applyRetention(journal, { policy: thirtyDays, clock: clockAt(NOW) })

    expect(await seqsOf(journal)).toEqual([])
  })
})
