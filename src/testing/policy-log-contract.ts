import { beforeEach, describe, expect, it } from "vitest"

import {
  MAX_POLICY_REVISION_LIMIT,
  policyFingerprintOf,
  policyShapeOf,
  type PolicyLog,
  type PolicyRevision,
  type RecordPolicyRequest,
} from "../runtime/index.js"
import { gatePolicySchema, type GatePolicy } from "../runtime/policy.js"

import { FIXED_INSTANT } from "./doubles.js"

/**
 * One suite, run against every `PolicyLog`.
 *
 * The same argument as `store-contract.ts` and `journal-contract.ts`: the
 * promises are not in the type. That a policy's revisions are dense and
 * ascending, that recording what is already current appends nothing, that a
 * digest naming two revisions is reported as naming two — a host discovering any
 * of those from a production incident is the seam being offered without the
 * thing that makes it safe to take.
 *
 * The outcome rules themselves live in `recordOutcomeOf`, shared by both
 * implementations, so this suite is checking that a backend *applies* them: that
 * it finds the right head, writes when told to and not when not, and reads back
 * what it wrote.
 */

export const policyNamed = (policyId: string, overrides: Record<string, unknown> = {}): GatePolicy =>
  gatePolicySchema.parse({ policyId, ...overrides })

/**
 * A recording, with the two fields a caller always has to supply already filled
 * in. `actor` is required by the type and is spelled out in every fixture rather
 * than defaulted somewhere a test could forget it.
 */
export const recordingOf = (
  policy: GatePolicy,
  overrides: Partial<RecordPolicyRequest> = {}
): RecordPolicyRequest => ({
  policy,
  actor: "dana@example.com",
  recordedAt: FIXED_INSTANT,
  ...overrides,
})

const expectRevision = (
  result: Awaited<ReturnType<PolicyLog["current"]>>
): PolicyRevision => {
  expect(result.ok, result.ok ? "" : JSON.stringify(result.error)).toBe(true)
  if (!result.ok) throw new Error("unreachable")

  return result.value
}

export const describePolicyLogContract = (
  name: string,
  build: () => PolicyLog | Promise<PolicyLog>
): void => {
  describe(`${name} — PolicyLog contract`, () => {
    let log: PolicyLog

    beforeEach(async () => {
      log = await build()
    })

    describe("recording", () => {
      it("calls the first recording first, with no change to describe", async () => {
        const recorded = await log.record(recordingOf(policyNamed("house")))

        expect(recorded.ok).toBe(true)
        if (!recorded.ok) return

        expect(recorded.value.outcome).toBe("first")
        expect(recorded.value.revision.revision).toBe(1)
        expect(recorded.value.revision.policyId).toBe("house")
        expect(recorded.value.revision.actor).toBe("dana@example.com")
      })

      it("stamps the fingerprint of the policy it recorded", async () => {
        const policy = policyNamed("house", { minimumConfidence: 0.9 })
        const recorded = await log.record(recordingOf(policy))

        expect(recorded.ok && recorded.value.revision.fingerprint).toBe(
          policyFingerprintOf(policy)
        )
      })

      it("numbers revisions densely from one", async () => {
        await log.record(recordingOf(policyNamed("house")))
        await log.record(recordingOf(policyNamed("house", { breadthThreshold: 9 })))
        await log.record(recordingOf(policyNamed("house", { breadthThreshold: 10 })))

        const page = await log.revisions("house")

        expect(page.ok && page.value.revisions.map((entry) => entry.revision)).toEqual([1, 2, 3])
      })

      it("describes an edit as a change, with the revision it replaced", async () => {
        await log.record(recordingOf(policyNamed("house")))
        const recorded = await log.record(
          recordingOf(policyNamed("house", { minimumConfidence: 0.9 }), { actor: "sam" })
        )

        expect(recorded.ok).toBe(true)
        if (!recorded.ok || recorded.value.outcome !== "changed") {
          expect.fail(`expected a change, got ${recorded.ok ? recorded.value.outcome : "an error"}`)
        }

        expect(recorded.value.from.revision).toBe(1)
        expect(recorded.value.revision.revision).toBe(2)
        expect(recorded.value.revision.actor).toBe("sam")
        expect(recorded.value.change.direction).toBe("stricter")
        expect(recorded.value.change.fields.map((field) => field.field)).toEqual([
          "minimumConfidence",
        ])
      })

      /**
       * The property that stops a deployment writing a revision per boot, and the
       * reason the outcome is three-valued rather than a revision.
       */
      it("appends nothing when the head already says this, and hands back the head", async () => {
        const first = await log.record(recordingOf(policyNamed("house")))
        const again = await log.record(recordingOf(policyNamed("house"), { actor: "someone else" }))

        expect(again.ok).toBe(true)
        if (!again.ok) return

        expect(again.value.outcome).toBe("unchanged")
        expect(again.value.revision.revision).toBe(1)
        expect(again.value.revision.actor).toBe("dana@example.com")
        expect(first.ok && first.value.revision.recordedAt).toBe(again.value.revision.recordedAt)

        const page = await log.revisions("house")
        expect(page.ok && page.value.revisions).toHaveLength(1)
      })

      /**
       * Idempotence is against the head and never against history: going back to
       * an earlier policy is a decision somebody made at a time, and a log that
       * swallowed it would lose the revert.
       */
      it("records a return to an earlier policy as its own revision", async () => {
        const open = policyNamed("house")
        await log.record(recordingOf(open))
        await log.record(recordingOf(policyNamed("house", { minimumConfidence: 0.9 })))
        const back = await log.record(recordingOf(open, { actor: "sam" }))

        expect(back.ok && back.value.outcome).toBe("changed")
        expect(back.ok && back.value.revision.revision).toBe(3)

        const page = await log.revisions("house")
        expect(page.ok && page.value.revisions.map((entry) => entry.revision)).toEqual([1, 2, 3])
      })

      /** A rename is an edit, which is what a host is asked to do (0033). */
      it("records a rename, although the rules are byte for byte the same", async () => {
        await log.record(recordingOf(policyNamed("house", { minimumConfidence: 0.9 })))
        const renamed = await log.record(
          recordingOf(policyNamed("house-v2", { minimumConfidence: 0.9 }))
        )

        expect(renamed.ok && renamed.value.outcome).toBe("first")
        expect(renamed.ok && renamed.value.revision.revision).toBe(1)
      })

      it("keeps a note when one was given, and omits the key when none was", async () => {
        const noted = await log.record(
          recordingOf(policyNamed("house"), { note: "after the October incident" })
        )
        await log.record(recordingOf(policyNamed("house", { breadthThreshold: 9 })))

        expect(noted.ok && noted.value.revision.note).toBe("after the October incident")

        const page = await log.revisions("house")
        expect(page.ok && page.value.revisions[1] && "note" in page.value.revisions[1]).toBe(false)
      })

      it("reads a policy back whole, with every knob it was recorded with", async () => {
        const policy = policyNamed("house", {
          protectedPrimitiveTypes: ["loom.card"],
          interactiveTypes: { "loom.link": { whenProps: ["href"] } },
          removalThresholds: { medium: 4, high: 16 },
          autoApplyCeiling: { developer: "critical" },
          refusalFloor: "high",
        })

        await log.record(recordingOf(policy))
        const head = expectRevision(await log.current("house"))

        expect(head.policy).toEqual(policy)
      })
    })

    describe("recording against an expected revision", () => {
      it("accepts the recording when the head is the one the caller expected", async () => {
        await log.record(recordingOf(policyNamed("house")))
        const next = await log.record(
          recordingOf(policyNamed("house", { breadthThreshold: 9 }), { expectedRevision: 1 })
        )

        expect(next.ok && next.value.revision.revision).toBe(2)
      })

      it("accepts zero as the caller saying nothing is recorded yet", async () => {
        const first = await log.record(recordingOf(policyNamed("house"), { expectedRevision: 0 }))

        expect(first.ok && first.value.outcome).toBe("first")
      })

      it("refuses and writes nothing when somebody recorded in between", async () => {
        await log.record(recordingOf(policyNamed("house")))
        await log.record(recordingOf(policyNamed("house", { breadthThreshold: 9 })))

        const stale = await log.record(
          recordingOf(policyNamed("house", { breadthThreshold: 20 }), { expectedRevision: 1 })
        )

        expect(stale.ok).toBe(false)
        if (stale.ok) return

        expect(stale.error).toEqual({
          code: "out-of-date",
          policyId: "house",
          expected: 1,
          current: 2,
        })

        const page = await log.revisions("house")
        expect(page.ok && page.value.revisions).toHaveLength(2)
      })

      it("refuses a first recording that expected a head", async () => {
        const stale = await log.record(recordingOf(policyNamed("house"), { expectedRevision: 1 }))

        expect(stale.ok).toBe(false)
        expect(!stale.ok && stale.error.code).toBe("out-of-date")
      })
    })

    describe("reading the head", () => {
      it("says so when nothing was ever recorded under the name", async () => {
        const missing = await log.current("never-written")

        expect(missing.ok).toBe(false)
        expect(!missing.ok && missing.error).toEqual({
          code: "no-such-policy",
          policyId: "never-written",
        })
      })

      it("answers with the newest revision", async () => {
        await log.record(recordingOf(policyNamed("house")))
        await log.record(recordingOf(policyNamed("house", { minimumConfidence: 0.9 })))

        const head = expectRevision(await log.current("house"))

        expect(head.revision).toBe(2)
        expect(head.policy.minimumConfidence).toBe(0.9)
      })

      it("keeps two names apart", async () => {
        await log.record(recordingOf(policyNamed("house")))
        await log.record(recordingOf(policyNamed("tenant-a", { breadthThreshold: 2 })))
        await log.record(recordingOf(policyNamed("tenant-a", { breadthThreshold: 3 })))

        expect(expectRevision(await log.current("house")).revision).toBe(1)
        expect(expectRevision(await log.current("tenant-a")).revision).toBe(2)
      })
    })

    describe("paging a history", () => {
      const twelve = async (target: PolicyLog): Promise<void> => {
        await target.record(recordingOf(policyNamed("house")))

        for (let threshold = 9; threshold <= 19; threshold += 1) {
          await target.record(recordingOf(policyNamed("house", { breadthThreshold: threshold })))
        }
      }

      it("says so when nothing was ever recorded under the name", async () => {
        const missing = await log.revisions("never-written")

        expect(!missing.ok && missing.error.code).toBe("no-such-policy")
      })

      it("pages from the oldest end by default", async () => {
        await twelve(log)
        const page = await log.revisions("house", { limit: 5 })

        expect(page.ok && page.value.revisions.map((entry) => entry.revision)).toEqual([
          1, 2, 3, 4, 5,
        ])
        expect(page.ok && page.value.older).toBeNull()
        expect(page.ok && page.value.newer).not.toBeNull()
      })

      it("pages from the newest end when asked, and still answers ascending", async () => {
        await twelve(log)
        const page = await log.revisions("house", { direction: "older", limit: 5 })

        expect(page.ok && page.value.revisions.map((entry) => entry.revision)).toEqual([
          8, 9, 10, 11, 12,
        ])
        expect(page.ok && page.value.newer).toBeNull()
        expect(page.ok && page.value.older).not.toBeNull()
      })

      it("walks the whole log in either direction, with no gap and no repeat", async () => {
        await twelve(log)

        for (const direction of ["newer", "older"] as const) {
          const seen: number[] = []
          let cursor: string | undefined

          for (let page = 0; page < 10; page += 1) {
            const read = await log.revisions("house", {
              direction,
              limit: 5,
              ...(cursor === undefined ? {} : { cursor }),
            })

            expect(read.ok).toBe(true)
            if (!read.ok) return

            seen.push(...read.value.revisions.map((entry) => entry.revision))

            const next = direction === "newer" ? read.value.newer : read.value.older
            if (next === null) break

            cursor = next
          }

          expect(seen.slice().sort((left, right) => left - right)).toEqual(
            Array.from({ length: 12 }, (_, index) => index + 1)
          )
          expect(new Set(seen).size).toBe(12)
        }
      })

      it("honours a limit", async () => {
        await twelve(log)
        const page = await log.revisions("house", { limit: 3 })

        expect(page.ok && page.value.revisions.map((entry) => entry.revision)).toEqual([1, 2, 3])
      })

      /**
       * The ceiling is weakly observable here and strongly observable in
       * `policy-log.test.ts`, which drives a log past it: a suite that has to run
       * against Postgres cannot afford to record a hundred and one revisions, and
       * a suite that never exceeds the ceiling cannot see it. Both
       * implementations clamp through `clampPolicyRevisionLimit`, which is tested
       * on its own; this holds the call sites to using it at all.
       */
      it("clamps a limit nobody should be able to ask for", async () => {
        await twelve(log)
        const page = await log.revisions("house", { limit: 10_000 })

        expect(page.ok && page.value.revisions.length).toBeLessThanOrEqual(
          MAX_POLICY_REVISION_LIMIT
        )
      })

      it("starts from the end the direction begins at when a cursor is nonsense", async () => {
        await twelve(log)
        const page = await log.revisions("house", { cursor: "not-a-position", limit: 3 })

        expect(page.ok && page.value.revisions.map((entry) => entry.revision)).toEqual([1, 2, 3])
      })
    })

    describe("the fingerprint join", () => {
      it("finds the revision a judgment ran under", async () => {
        const open = policyNamed("house")
        const strict = policyNamed("house", { minimumConfidence: 0.9 })

        await log.record(recordingOf(open))
        await log.record(recordingOf(strict))

        const found = await log.judgedUnder("house", policyFingerprintOf(open))

        expect(found.ok).toBe(true)
        if (!found.ok || found.value.outcome !== "recorded") {
          expect.fail(`expected one match, got ${found.ok ? found.value.outcome : "an error"}`)
        }

        expect(found.value.revision.revision).toBe(1)
        expect(found.value.revision.policy).toEqual(open)
      })

      /**
       * The outcome a single-answer signature would have got wrong. A policy
       * taken to B and back to A has two revisions with one digest — correctly,
       * they are the same rules — and nothing can say which of them a judgment
       * ran under.
       */
      it("refuses to choose when a policy was changed and changed back", async () => {
        const open = policyNamed("house")

        await log.record(recordingOf(open))
        await log.record(recordingOf(policyNamed("house", { minimumConfidence: 0.9 })))
        await log.record(recordingOf(open))

        const found = await log.judgedUnder("house", policyFingerprintOf(open))

        expect(found.ok).toBe(true)
        if (!found.ok || found.value.outcome !== "ambiguous") {
          expect.fail(`expected ambiguity, got ${found.ok ? found.value.outcome : "an error"}`)
        }

        expect(found.value.revisions.map((entry) => entry.revision)).toEqual([1, 3])
      })

      it("reports a judgment whose policy was never recorded, and says what is held", async () => {
        const recorded = policyNamed("house")
        await log.record(recordingOf(recorded))

        const elsewhere = policyFingerprintOf(policyNamed("house", { breadthThreshold: 99 }))
        const found = await log.judgedUnder("house", elsewhere)

        expect(found.ok).toBe(true)
        if (!found.ok || found.value.outcome !== "unrecorded") {
          expect.fail(`expected unrecorded, got ${found.ok ? found.value.outcome : "an error"}`)
        }

        expect(found.value.fingerprint).toBe(elsewhere)
        expect(found.value.heldShapes).toEqual([
          policyShapeOf(policyFingerprintOf(recorded)),
        ])
      })

      /**
       * An empty `heldShapes` is the fact that separates *nothing was recorded
       * under this name* from *everything recorded here came from another build*,
       * and it is a reading rather than an error: a judgment that ran under an
       * unlogged policy is exactly the case this field exists to describe.
       */
      it("answers for a name with nothing in it rather than failing", async () => {
        const found = await log.judgedUnder("never-written", "abcdef12:0123456789abcdef")

        expect(found.ok).toBe(true)
        if (!found.ok || found.value.outcome !== "unrecorded") {
          expect.fail("expected unrecorded")
        }

        expect(found.value.heldShapes).toEqual([])
      })

      it("does not reach into another policy's revisions", async () => {
        const shared = policyNamed("tenant-a", { breadthThreshold: 9 })
        await log.record(recordingOf(policyNamed("house")))
        await log.record(recordingOf(shared))

        const found = await log.judgedUnder("house", policyFingerprintOf(shared))

        expect(found.ok && found.value.outcome).toBe("unrecorded")
      })
    })
  })
}
