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
import type { StoreError } from "./errors.js"
import { loomRevisions, loomTrees } from "./schema.js"
import {
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
})

const UNIQUE_VIOLATION = "23505"

/**
 * Postgres reports a primary-key collision as SQLSTATE 23505, but Drizzle wraps
 * the driver's error, so the code sits somewhere down the `cause` chain rather
 * than on the error that was thrown. Walking the chain is what makes this work
 * across drivers instead of against whichever one was tested first.
 */
const isUniqueViolation = (cause: unknown): boolean => {
  for (let current = cause, depth = 0; current !== null && current !== undefined && depth < 8; depth++) {
    if (typeof current !== "object") return false
    if ((current as { code?: unknown }).code === UNIQUE_VIOLATION) return true

    current = (current as { cause?: unknown }).cause
  }

  return false
}

const failure = (cause: unknown, detail: string): StoreError => ({
  code: "unavailable",
  detail: `${detail}: ${cause instanceof Error ? cause.message : String(cause)}`,
})

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
          : err(failure(cause, `could not create ${tree.treeId}`))
      }
    },

    head: async (treeId) => {
      try {
        return await readHead(treeId)
      } catch (cause) {
        return err(failure(cause, `could not read ${treeId}`))
      }
    },

    revisions: async (treeId, request?: RevisionReadRequest) => {
      const limit = clampRevisionLimit(request?.limit)
      const from = cursorPosition(request?.cursor)
      const direction = request?.direction ?? "newer"

      try {
        const present = await db
          .select({ treeId: loomTrees.treeId })
          .from(loomTrees)
          .where(eq(loomTrees.treeId, treeId))
          .limit(1)

        /** "No tree" and "a tree with no changes" are different answers. */
        if (present[0] === undefined) return err<StoreError>({ code: "not-found", treeId })

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

        const page = parsed.data as readonly StoredRevision[]

        return ok<RevisionPage>({
          revisions: page,
          ...pageEnds(page.map((stored) => stored.revision), direction, {
            beyond: rows.length > limit,
            resumed: from !== undefined,
          }),
        })
      } catch (cause) {
        return err(failure(cause, `could not read the history of ${treeId}`))
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
        return err(failure(cause, "could not list trees"))
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
          : err(failure(cause, `could not append to ${treeId}`))
      }
    },
  }
}
