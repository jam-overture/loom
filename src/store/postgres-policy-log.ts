import { and, asc, desc, eq, gt, lt } from "drizzle-orm"

import { cursorPosition, pageEnds } from "../paging.js"
import { err, ok, type Result } from "../result.js"
import { policyShapeOf } from "../runtime/policy-fingerprint.js"
import {
  clampPolicyRevisionLimit,
  parsePolicyRevision,
  policyProvenanceOf,
  recordOutcomeOf,
  type PolicyLog,
  type PolicyLogError,
  type PolicyProvenance,
  type PolicyRecorded,
  type PolicyRevision,
  type PolicyRevisionPage,
} from "../runtime/policy-log.js"

import type { LoomDatabase } from "./database.js"
import { isUniqueViolation, unavailable } from "./driver.js"
import { loomPolicyRevisions } from "./schema.js"

/**
 * The policy's own log, backed by Postgres (0022).
 *
 * The counterpart `memoryPolicyLog` was always going to need, and for a sharper
 * reason than the hold store's: a policy log that lived in a process would be
 * reset by every deployment, which is precisely when a policy is most likely to
 * have changed. A `Map` cannot record the one event this log exists to record.
 *
 * **There is no transaction here, and that is the point of the composite primary
 * key.** The write reads the head, computes the next revision and inserts it; two
 * writers racing at the same head both compute `N + 1` and the database refuses
 * the second. `loom_revisions` gets its ordering guarantee the same way, and
 * `store.ts` says so. A `SELECT … FOR UPDATE` could not have served here anyway:
 * the first revision of a policy has no row to lock.
 *
 * A refused insert is reported as `out-of-date` against the head as it is *now*,
 * which is the truth the caller needs rather than the one it raced against.
 */

/**
 * A row on the way out, checked rather than cast.
 *
 * `policy` was written by whatever version of the code was running then, and a
 * policy revision is among the longest-lived documents in the system: a log kept
 * across a year of deployments is exactly what makes a calibration window
 * legible, which is the whole reason to keep one.
 */
const toRevision = (
  row: typeof loomPolicyRevisions.$inferSelect
): Result<PolicyRevision, PolicyLogError> =>
  parsePolicyRevision({
    policyId: row.policyId,
    revision: row.revision,
    fingerprint: row.fingerprint,
    policy: row.policy,
    actor: row.actor,
    recordedAt: row.recordedAt,
    ...(row.note === null ? {} : { note: row.note }),
  })

/**
 * `null` and an absent key are one thing on the way back in and two things in
 * the type, which is what `toRevision` spreads around: a `text` column with no
 * value reads as `null`, and `exactOptionalPropertyTypes` distinguishes that
 * from a key the shape does not have.
 */
const newest = async (
  db: LoomDatabase,
  policyId: string
): Promise<Result<PolicyRevision | undefined, PolicyLogError>> => {
  const rows = await db
    .select()
    .from(loomPolicyRevisions)
    .where(eq(loomPolicyRevisions.policyId, policyId))
    .orderBy(desc(loomPolicyRevisions.revision))
    .limit(1)

  const row = rows[0]
  if (row === undefined) return ok(undefined)

  return toRevision(row)
}

export const postgresPolicyLog = (db: LoomDatabase): PolicyLog => ({
  record: async (request) => {
    const policyId = request.policy.policyId

    try {
      const head = await newest(db, policyId)
      if (!head.ok) return head

      const outcome = recordOutcomeOf(request, head.value)
      if (!outcome.ok || outcome.value.outcome === "unchanged") return outcome

      const revision = outcome.value.revision

      await db.insert(loomPolicyRevisions).values({
        policyId: revision.policyId,
        revision: revision.revision,
        fingerprint: revision.fingerprint,
        policy: revision.policy,
        actor: revision.actor,
        recordedAt: revision.recordedAt,
        note: revision.note ?? null,
      })

      return ok<PolicyRecorded>(outcome.value)
    } catch (cause) {
      /**
       * Somebody else recorded between the read and the insert. The caller is
       * told the revision that is current now rather than the one it computed,
       * because re-reading is what it has to do next and the number it raced
       * against is of no use to it.
       */
      if (isUniqueViolation(cause)) {
        const current = await newest(db, policyId).catch(() => undefined)

        return err<PolicyLogError>({
          code: "out-of-date",
          policyId,
          expected: request.expectedRevision ?? 0,
          current:
            current !== undefined && current.ok && current.value !== undefined
              ? current.value.revision
              : 0,
        })
      }

      return err(unavailable(cause, `could not record a revision of ${policyId}`))
    }
  },

  current: async (policyId) => {
    try {
      const head = await newest(db, policyId)
      if (!head.ok) return head

      return head.value === undefined
        ? err<PolicyLogError>({ code: "no-such-policy", policyId })
        : ok(head.value)
    } catch (cause) {
      return err(unavailable(cause, `could not read the policy ${policyId}`))
    }
  },

  revisions: async (policyId, request) => {
    const direction = request?.direction ?? "newer"
    const limit = clampPolicyRevisionLimit(request?.limit)
    const from = cursorPosition(request?.cursor)

    try {
      /**
       * "No policy" and "a policy at some revision" are different answers, and
       * the head read is what separates them — a page that came back empty
       * because the cursor was at the end is not a name nobody has recorded.
       */
      const head = await newest(db, policyId)
      if (!head.ok) return head
      if (head.value === undefined) return err<PolicyLogError>({ code: "no-such-policy", policyId })

      /**
       * `older` scans descending so the newest page costs one seek on the
       * primary key rather than a walk from the start, then the rows are put
       * back in ascending order — the contract's promise that a page's order
       * never depends on which end it came from.
       */
      const rows = await db
        .select()
        .from(loomPolicyRevisions)
        .where(
          and(
            eq(loomPolicyRevisions.policyId, policyId),
            from === undefined
              ? undefined
              : direction === "older"
                ? lt(loomPolicyRevisions.revision, from)
                : gt(loomPolicyRevisions.revision, from)
          )
        )
        .orderBy(
          direction === "older"
            ? desc(loomPolicyRevisions.revision)
            : asc(loomPolicyRevisions.revision)
        )
        /** One extra row answers "is there another page" without a count. */
        .limit(limit + 1)

      const taken = direction === "older" ? rows.slice(0, limit).reverse() : rows.slice(0, limit)
      const revisions: PolicyRevision[] = []

      for (const row of taken) {
        const parsed = toRevision(row)
        if (!parsed.ok) return parsed

        revisions.push(parsed.value)
      }

      return ok<PolicyRevisionPage>({
        revisions,
        ...pageEnds(
          revisions.map((entry) => entry.revision),
          direction,
          { beyond: rows.length > limit, resumed: from !== undefined }
        ),
      })
    } catch (cause) {
      return err(unavailable(cause, `could not read the history of ${policyId}`))
    }
  },

  /**
   * The seek the fingerprint column exists for. Two statements rather than one:
   * the matches come off the index, and the shapes are only read when nothing
   * matched — so the ordinary answer costs one indexed read and the explanation
   * of a miss costs a second that a hit never pays for.
   */
  judgedUnder: async (policyId, fingerprint) => {
    try {
      const matched = await db
        .select()
        .from(loomPolicyRevisions)
        .where(
          and(
            eq(loomPolicyRevisions.policyId, policyId),
            eq(loomPolicyRevisions.fingerprint, fingerprint)
          )
        )
        .orderBy(asc(loomPolicyRevisions.revision))

      const matches: PolicyRevision[] = []

      for (const row of matched) {
        const parsed = toRevision(row)
        if (!parsed.ok) return parsed

        matches.push(parsed.value)
      }

      if (matches.length > 0) return ok(policyProvenanceOf(policyId, fingerprint, matches, []))

      const held = await db
        .selectDistinct({ fingerprint: loomPolicyRevisions.fingerprint })
        .from(loomPolicyRevisions)
        .where(eq(loomPolicyRevisions.policyId, policyId))

      return ok<PolicyProvenance>(
        policyProvenanceOf(
          policyId,
          fingerprint,
          [],
          held.map((row) => policyShapeOf(row.fingerprint))
        )
      )
    } catch (cause) {
      return err(unavailable(cause, `could not resolve a policy fingerprint for ${policyId}`))
    }
  },
})
