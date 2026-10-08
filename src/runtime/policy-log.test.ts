import { describe, expect, it } from "vitest"

import { policyFingerprintOf } from "./policy-fingerprint.js"
import {
  clampPolicyRevisionLimit,
  DEFAULT_POLICY_REVISION_LIMIT,
  describePolicyLogError,
  MAX_POLICY_REVISION_LIMIT,
  memoryPolicyLog,
  parsePolicyRevision,
  policyHistoryOf,
  policyProvenanceOf,
  recordOutcomeOf,
  type PolicyLogError,
  type PolicyRevision,
} from "./policy-log.js"
import { gatePolicySchema, type GatePolicy } from "./policy.js"

const policyNamed = (policyId: string, overrides: Record<string, unknown> = {}): GatePolicy =>
  gatePolicySchema.parse({ policyId, ...overrides })

const revisionOf = (
  revision: number,
  policy: GatePolicy,
  overrides: Partial<PolicyRevision> = {}
): PolicyRevision => ({
  policyId: policy.policyId,
  revision,
  fingerprint: policyFingerprintOf(policy),
  policy,
  actor: "dana",
  recordedAt: "2026-10-08T09:00:00.000Z",
  ...overrides,
})

describe("policyHistoryOf", () => {
  it("has nothing to say about one revision, because there is no pair", () => {
    expect(policyHistoryOf([revisionOf(1, policyNamed("house"))])).toEqual([])
  })

  it("has nothing to say about no revisions", () => {
    expect(policyHistoryOf([])).toEqual([])
  })

  it("folds a run into the edits between its revisions", () => {
    const open = policyNamed("house")
    const strict = policyNamed("house", { minimumConfidence: 0.9 })
    const strictAndWide = policyNamed("house", { minimumConfidence: 0.9, breadthThreshold: 20 })

    const history = policyHistoryOf([
      revisionOf(1, open),
      revisionOf(2, strict, { actor: "sam" }),
      revisionOf(3, strictAndWide, { actor: "ash" }),
    ])

    expect(history).toHaveLength(2)
    expect(history[0]?.from.revision).toBe(1)
    expect(history[0]?.to.revision).toBe(2)
    expect(history[0]?.to.actor).toBe("sam")
    expect(history[0]?.change.direction).toBe("stricter")
    expect(history[1]?.change.direction).toBe("looser")
    expect(history[1]?.change.fields.map((field) => field.field)).toEqual(["breadthThreshold"])
  })

  it("sorts before folding, so a page handed back out of order still reads correctly", () => {
    const open = policyNamed("house")
    const strict = policyNamed("house", { minimumConfidence: 0.9 })

    const history = policyHistoryOf([revisionOf(2, strict), revisionOf(1, open)])

    expect(history).toHaveLength(1)
    expect(history[0]?.from.revision).toBe(1)
  })

  /**
   * The property that keeps a history honest when a caller filters one. A
   * comparison across a gap would describe a single edit nobody made, folding
   * several together and attributing the lot to whoever made the last.
   */
  it("skips a gap rather than comparing across it", () => {
    const open = policyNamed("house")
    const strict = policyNamed("house", { minimumConfidence: 0.9 })
    const wide = policyNamed("house", { minimumConfidence: 0.9, breadthThreshold: 20 })

    const history = policyHistoryOf([revisionOf(1, open), revisionOf(3, wide), revisionOf(4, strict)])

    expect(history.map((edit) => [edit.from.revision, edit.to.revision])).toEqual([[3, 4]])
  })

  it("reports an edit that changed nothing the Gate consults as changing nothing", () => {
    const open = policyNamed("house")
    const history = policyHistoryOf([revisionOf(1, open), revisionOf(2, open)])

    expect(history[0]?.change.changed).toBe(false)
  })

  it("reads a rename as a rename and not as a rule change", () => {
    const was = policyNamed("house", { minimumConfidence: 0.9 })
    const renamed = policyNamed("house-v2", { minimumConfidence: 0.9 })

    const history = policyHistoryOf([revisionOf(1, was), revisionOf(2, renamed)])

    expect(history[0]?.change.renamed).toBe(true)
    expect(history[0]?.change.fields.map((field) => field.field)).toEqual(["policyId"])
  })
})

describe("policyProvenanceOf", () => {
  it("names one revision when one matched", () => {
    const policy = policyNamed("house")
    const found = policyProvenanceOf("house", policyFingerprintOf(policy), [revisionOf(1, policy)], [])

    expect(found.outcome).toBe("recorded")
  })

  it("refuses to choose between two, oldest first", () => {
    const policy = policyNamed("house")
    const found = policyProvenanceOf(
      "house",
      policyFingerprintOf(policy),
      [revisionOf(3, policy), revisionOf(1, policy)],
      []
    )

    expect(found.outcome).toBe("ambiguous")
    expect(found.outcome === "ambiguous" && found.revisions.map((entry) => entry.revision)).toEqual([
      1, 3,
    ])
  })

  it("deduplicates and sorts the shapes it reports for a miss", () => {
    const found = policyProvenanceOf("house", "aaaaaaaa:bb", [], ["cccccccc", "aaaaaaaa", "cccccccc"])

    expect(found.outcome === "unrecorded" && found.heldShapes).toEqual(["aaaaaaaa", "cccccccc"])
  })
})

describe("recordOutcomeOf", () => {
  it("calls the first recording first", () => {
    const outcome = recordOutcomeOf(
      { policy: policyNamed("house"), actor: "dana", recordedAt: "2026-10-08T09:00:00.000Z" },
      undefined
    )

    expect(outcome.ok && outcome.value.outcome).toBe("first")
    expect(outcome.ok && outcome.value.revision.revision).toBe(1)
  })

  /**
   * Both conditions are needed and neither is redundant: the fingerprint
   * excludes the name, so content alone would read a rename as unchanged, and
   * the name alone would read every edit under one name as unchanged.
   */
  it("calls a rename an edit, although the fingerprint did not move", () => {
    const was = policyNamed("house", { minimumConfidence: 0.9 })
    const renamed = policyNamed("house-v2", { minimumConfidence: 0.9 })

    expect(policyFingerprintOf(was)).toBe(policyFingerprintOf(renamed))

    const outcome = recordOutcomeOf(
      { policy: renamed, actor: "dana", recordedAt: "2026-10-08T09:00:00.000Z" },
      revisionOf(1, was)
    )

    expect(outcome.ok && outcome.value.outcome).toBe("changed")
  })

  it("refuses an actor that is not a name", () => {
    const outcome = recordOutcomeOf(
      { policy: policyNamed("house"), actor: "", recordedAt: "2026-10-08T09:00:00.000Z" },
      undefined
    )

    expect(outcome.ok).toBe(false)
    expect(!outcome.ok && outcome.error.code).toBe("unreadable")
    expect(!outcome.ok && outcome.error.code === "unreadable" && outcome.error.detail).toContain(
      "actor"
    )
  })

  it("refuses an instant that is not one", () => {
    const outcome = recordOutcomeOf(
      { policy: policyNamed("house"), actor: "dana", recordedAt: "last Tuesday" },
      undefined
    )

    expect(!outcome.ok && outcome.error.code).toBe("unreadable")
  })

  it("stamps the fingerprint of the policy it was given, so the column cannot lie", () => {
    const policy = policyNamed("house", { breadthThreshold: 20 })
    const outcome = recordOutcomeOf(
      { policy, actor: "dana", recordedAt: "2026-10-08T09:00:00.000Z" },
      revisionOf(1, policyNamed("house"))
    )

    expect(outcome.ok && outcome.value.revision.fingerprint).toBe(policyFingerprintOf(policy))
  })
})

describe("the policy log's own failures", () => {
  it("says every error in a sentence a reader can act on", () => {
    const errors: readonly PolicyLogError[] = [
      { code: "no-such-policy", policyId: "house" },
      { code: "out-of-date", policyId: "house", expected: 1, current: 4 },
      { code: "unavailable", detail: "connection reset" },
      { code: "unreadable", detail: "policy.minimumConfidence" },
    ]

    for (const error of errors) {
      expect(describePolicyLogError(error)).not.toBe("")
    }

    expect(describePolicyLogError({ code: "out-of-date", policyId: "house", expected: 1, current: 4 })).toContain(
      "revision 4, not 1"
    )
  })

  it("reports a row that is not a revision as unreadable, naming the field", () => {
    const parsed = parsePolicyRevision({ policyId: "house", revision: 0 })

    expect(parsed.ok).toBe(false)
    expect(!parsed.ok && parsed.error.code).toBe("unreadable")
  })

  it("reads a revision that is a revision", () => {
    const policy = policyNamed("house")
    const parsed = parsePolicyRevision(revisionOf(1, policy))

    expect(parsed.ok && parsed.value.policy).toEqual(policy)
  })

  it("clamps a limit, both ways", () => {
    expect(clampPolicyRevisionLimit(undefined)).toBe(DEFAULT_POLICY_REVISION_LIMIT)
    expect(clampPolicyRevisionLimit(10_000)).toBe(MAX_POLICY_REVISION_LIMIT)
    expect(clampPolicyRevisionLimit(5)).toBe(5)
  })

  /**
   * The ceiling, driven past rather than asserted about the clamp alone. The
   * contract suite cannot do this — it runs against Postgres, where a hundred
   * and one recordings is a minute of test time — so the call site is held here
   * and both implementations share the clamp.
   */
  it("will not hand back more than the ceiling, however much is asked for", async () => {
    const log = memoryPolicyLog()

    for (let threshold = 1; threshold <= MAX_POLICY_REVISION_LIMIT + 1; threshold += 1) {
      await log.record({
        policy: policyNamed("house", { breadthThreshold: threshold }),
        actor: "dana",
        recordedAt: "2026-10-08T09:00:00.000Z",
      })
    }

    const page = await log.revisions("house", { limit: 10_000 })

    expect(page.ok && page.value.revisions).toHaveLength(MAX_POLICY_REVISION_LIMIT)
    expect(page.ok && page.value.newer).not.toBeNull()
  })
})

/**
 * The seam's one promise that is not in the contract suite, because it is about
 * what the log is *for* rather than about what a backend does: a judgment and
 * the policy text it ran under, joined by the digest the judgment carries.
 */
describe("joining a judgment to the rules it ran under", () => {
  it("answers the question a Disposition's fingerprint could only ask", async () => {
    const log = memoryPolicyLog()
    const open = policyNamed("house")
    const strict = policyNamed("house", { minimumConfidence: 0.9 })

    await log.record({ policy: open, actor: "dana", recordedAt: "2026-10-01T09:00:00.000Z" })
    await log.record({ policy: strict, actor: "sam", recordedAt: "2026-10-05T09:00:00.000Z" })

    /** What a record written before the edit carries, and all it carries. */
    const disposition = { policyId: "house", policyFingerprint: policyFingerprintOf(open) }

    const found = await log.judgedUnder(disposition.policyId, disposition.policyFingerprint)

    expect(found.ok && found.value.outcome).toBe("recorded")
    if (!found.ok || found.value.outcome !== "recorded") return

    const head = await log.current("house")
    expect(head.ok).toBe(true)
    if (!head.ok) return

    const since = policyHistoryOf([found.value.revision, head.value])

    expect(since[0]?.change.direction).toBe("stricter")
    expect(since[0]?.to.actor).toBe("sam")
    expect(since[0]?.to.recordedAt).toBe("2026-10-05T09:00:00.000Z")
  })
})
