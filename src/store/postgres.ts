import { and, asc, desc, eq, gt, lt } from "drizzle-orm"
import { z } from "zod"

import { proposalIdSchema, treeIdSchema, type TreeId } from "../ids.js"
import { cursorPosition, pageEnds } from "../paging.js"
import { provenanceSchema } from "../runtime/proposal.js"
import { treeDeltaSchema } from "../tree/delta.js"
import { err, ok, type Result } from "../result.js"
import { applyDelta } from "../tree/apply.js"
import { parseTree, type LoomTree } from "../tree/tree.js"

import type { LoomDatabase } from "./database.js"
import { isUniqueViolation, unavailable } from "./driver.js"
import type { StoreError } from "./errors.js"
import { loomRevisions, loomTrees } from "./schema.js"
import {
  anchorBound,
  anchorResumes,
  clampListingLimit,
  clampRevisionLimit,
  type AppendRequest,
  type ListRequest,
  type RevisionPage,
  type RevisionReadRequest,
  type StoredRevision,
  type TreeListPage,
  type TreeStore,
} from "./store.js"

export * from "./database.js"
export * from "./migrate.js"
export * from "./postgres-holds.js"
export * from "./schema.js"

/**
 * The store, backed by Postgres (0022).
 *
 * Nothing here is Supabase-specific — it is plain SQL through Drizzle, which is
 * why it is named for the database rather than the host. Supabase is where it
 * runs; it is not what it talks to.
 *
 * The handle is injected rather than constructed. Choosing a driver, a pooler and
 * a connection lifetime belongs to the host, and injecting it is also what lets
 * the tests run this exact code against an embedded Postgres.
 */

/**
 * Rows come back as `unknown` and are parsed, never cast. A document written by
 * an older schema version must not reach the renderer unvalidated — storage is a
 * boundary like any other, and it is the one boundary where the data outlives the
 * code that wrote it.
 */
const parseStored = (document: unknown, treeId: TreeId): Result<LoomTree, StoreError> => {
  const parsed = parseTree(document)

  return parsed.ok
    ? ok(parsed.value)
    : err<StoreError>({
        code: "unavailable",
        detail: `stored tree ${treeId} did not parse: ${parsed.error.code}`,
      })
}

/**
 * A log row, validated on the way out. The delta and the provenance were stored
 * as JSON by whatever version of the code was running at the time, so reading
 * them back is the same boundary `parseTree` guards — and the log is the one
 * place where the data is guaranteed to outlive the code that wrote it.
 */
const storedRevisionSchema = z.object({
  treeId: treeIdSchema,
  revision: z.number().int().nonnegative(),
  proposalId: proposalIdSchema,
  delta: treeDeltaSchema,
  provenance: provenanceSchema,
  appliedAt: z.string().datetime(),
  /** Null on every row written before the column existed (0029), and on every change nobody had to allow. */
  answeredBy: z.string().nullable().optional(),
})

/**
 * A null column and an absent key have to produce the same entry, or a revision
 * nobody approved would compare unequal between this store and the in-memory
 * one — and the contract suite both are checked against would be measuring the
 * backing store rather than the behaviour.
 */
const toStoredRevision = (row: z.infer<typeof storedRevisionSchema>): StoredRevision => {
  const { answeredBy, ...rest } = row

  /**
   * Zod infers an optional field as `T | undefined`, and
   * `exactOptionalPropertyTypes` distinguishes that from an absent key — so a
   * parsed `Provenance` needs asserting even though it validated. The assertion
   * is about the shape of optionality, never about whether the data is valid:
   * the schema above established that.
   */
  const entry = rest as Omit<StoredRevision, "answeredBy">

  return answeredBy === null || answeredBy === undefined ? entry : { ...entry, answeredBy }
}

export const postgresTreeStore = (db: LoomDatabase): TreeStore => {
  const readHead = async (treeId: TreeId): Promise<Result<LoomTree, StoreError>> => {
    const rows = await db
      .select({ document: loomTrees.document })
      .from(loomTrees)
      .where(eq(loomTrees.treeId, treeId))
      .limit(1)

    const row = rows[0]

    return row === undefined
      ? err<StoreError>({ code: "not-found", treeId })
      : parseStored(row.document, treeId)
  }

  return {
    create: async (tree) => {
      try {
        await db.insert(loomTrees).values({
          treeId: tree.treeId,
          revision: tree.revision,
          document: tree,
        })

        return ok(tree)
      } catch (cause) {
        return isUniqueViolation(cause)
          ? err<StoreError>({ code: "already-exists", treeId: tree.treeId })
          : err(unavailable(cause, `could not create ${tree.treeId}`))
      }
    },

    head: async (treeId) => {
      try {
        return await readHead(treeId)
      } catch (cause) {
        return err(unavailable(cause, `could not read ${treeId}`))
      }
    },

    revisions: async (treeId, request?: RevisionReadRequest) => {
      const limit = clampRevisionLimit(request?.limit)
      const direction = request?.direction ?? "newer"
      const at = request?.at

      /** An anchor and a cursor reach the query below as the same bound. */
      const from = at === undefined ? cursorPosition(request?.cursor) : anchorBound(at, direction)

      try {
        const present = await db
          .select({ treeId: loomTrees.treeId, revision: loomTrees.revision })
          .from(loomTrees)
          .where(eq(loomTrees.treeId, treeId))
          .limit(1)

        /** "No tree" and "a tree with no changes" are different answers. */
        const head = present[0]
        if (head === undefined) return err<StoreError>({ code: "not-found", treeId })

        /**
         * `older` scans descending so the newest page costs one seek on the
         * primary key rather than a walk from the start of the log, then the rows
         * are put back in applied order — the contract's promise that a page's
         * order never depends on which end it came from.
         */
        const rows = await db
          .select()
          .from(loomRevisions)
          .where(
            and(
              eq(loomRevisions.treeId, treeId),
              from === undefined
                ? undefined
                : direction === "older"
                  ? lt(loomRevisions.revision, from)
                  : gt(loomRevisions.revision, from)
            )
          )
          .orderBy(
            direction === "older" ? desc(loomRevisions.revision) : asc(loomRevisions.revision)
          )
          /** One extra row answers "is there another page" without a count. */
          .limit(limit + 1)

        const taken = rows.slice(0, limit)
        const parsed = z
          .array(storedRevisionSchema)
          .safeParse(direction === "older" ? taken.slice().reverse() : taken)

        if (!parsed.success) {
          return err<StoreError>({
            code: "unavailable",
            detail: `the log of ${treeId} did not parse: ${parsed.error.issues[0]?.path.join(".") ?? "unknown"}`,
          })
        }

        const page: readonly StoredRevision[] = parsed.data.map(toStoredRevision)

        return ok<RevisionPage>({
          revisions: page,
          ...pageEnds(page.map((stored) => stored.revision), direction, {
            beyond: rows.length > limit,
            resumed:
              at === undefined ? from !== undefined : anchorResumes(at, direction, head.revision),
          }),
        })
      } catch (cause) {
        return err(unavailable(cause, `could not read the history of ${treeId}`))
      }
    },

    list: async (request?: ListRequest) => {
      const limit = clampListingLimit(request?.limit)

      try {
        const rows = await db
          .select({ treeId: loomTrees.treeId, revision: loomTrees.revision })
          .from(loomTrees)
          .where(request?.cursor === undefined ? undefined : gt(loomTrees.treeId, request.cursor))
          .orderBy(asc(loomTrees.treeId))
          /** One extra row answers "is there another page" without a count. */
          .limit(limit + 1)

        const page = rows.slice(0, limit)
        const last = page[page.length - 1]

        const listing: TreeListPage = {
          trees: page.map((row) => ({
            treeId: treeIdSchema.parse(row.treeId),
            revision: row.revision,
          })),
          cursor: rows.length > limit && last !== undefined ? last.treeId : null,
        }

        return ok(listing)
      } catch (cause) {
        return err(unavailable(cause, "could not list trees"))
      }
    },

    /**
     * The one operation that must be atomic (0016). The log entry and the
     * snapshot advance land together or not at all, because a log entry without
     * its snapshot advance is exactly the divergence `auditSnapshot` exists to
     * detect — and a store must never manufacture the fault its own audit is
     * designed to catch.
     */
    append: async (treeId, request: AppendRequest) => {
      try {
        return await db.transaction(async (tx) => {
          const rows = await tx
            .select({ document: loomTrees.document })
            .from(loomTrees)
            .where(eq(loomTrees.treeId, treeId))
            .for("update")
            .limit(1)

          const row = rows[0]
          if (row === undefined) return err<StoreError>({ code: "not-found", treeId })

          const snapshot = parseStored(row.document, treeId)
          if (!snapshot.ok) return snapshot

          if (request.delta.baseRevision !== snapshot.value.revision) {
            return err<StoreError>({
              code: "revision-conflict",
              treeId,
              expected: request.delta.baseRevision,
              found: snapshot.value.revision,
            })
          }

          const applied = applyDelta(snapshot.value, request.delta)
          if (!applied.ok) {
            return err<StoreError>({ code: "delta-rejected", treeId, error: applied.error })
          }

          await tx.insert(loomRevisions).values({
            treeId,
            revision: applied.value.revision,
            proposalId: request.proposalId,
            delta: request.delta,
            provenance: request.provenance,
            appliedAt: request.appliedAt,
            answeredBy: request.answeredBy ?? null,
          })

          await tx
            .update(loomTrees)
            .set({ revision: applied.value.revision, document: applied.value })
            .where(and(eq(loomTrees.treeId, treeId), eq(loomTrees.revision, snapshot.value.revision)))

          return ok(applied.value)
        })
      } catch (cause) {
        /**
         * The composite primary key on the log is the last line of defence: two
         * writers that both passed the base-revision check cannot both commit,
         * and the loser arrives here rather than corrupting the sequence.
         */
        return isUniqueViolation(cause)
          ? err<StoreError>({
              code: "revision-conflict",
              treeId,
              expected: request.delta.baseRevision,
              found: request.delta.baseRevision + 1,
            })
          : err(unavailable(cause, `could not append to ${treeId}`))
      }
    },
  }
}
