import { asc, eq, sql } from "drizzle-orm"

import { err, ok, type Result } from "../result.js"
import {
  clampHoldLimit,
  holdCursor,
  holdCursorPosition,
  parseHeldProposal,
  type HeldProposal,
  type HoldError,
  type HoldPage,
  type HoldStore,
} from "../write/held.js"

import type { LoomDatabase } from "./database.js"
import { isUniqueViolation, unavailable } from "./driver.js"
import { loomHolds } from "./schema.js"

/**
 * Custody of held proposals, backed by Postgres (0022).
 *
 * The counterpart `memoryHoldStore` was always going to need. A hold has to
 * survive the request that produced it, because the human who answers it arrives
 * later — and on the serverless hosts §3 targets, the process that produced it is
 * usually gone before they get there. A `Map` keeps that promise on a long-lived
 * server and cannot keep it anywhere else.
 *
 * Like the tree store, the handle is injected: choosing a driver, a pooler and a
 * connection lifetime belongs to the host, and injecting it is what lets the
 * tests run this exact code against an embedded Postgres.
 */

/**
 * A row on the way out, checked rather than cast.
 *
 * The three JSON columns were written by whatever version of the code was
 * running at the time, and a hold is the shape most likely to outlive its
 * writer: it is created by one deployment and answered by whichever one is
 * serving when the reviewer returns.
 */
const toHeld = (row: typeof loomHolds.$inferSelect): Result<HeldProposal, HoldError> =>
  parseHeldProposal({
    proposalId: row.proposalId,
    treeId: row.treeId,
    baseRevision: row.baseRevision,
    intent: row.intent,
    proposal: row.proposal,
    disposition: row.disposition,
    heldAt: row.heldAt,
  })

/**
 * `compareHolds`, in the one place it has to be restated rather than called:
 * ordering happens in the statement so an index can serve it, and the contract
 * suite is what holds this and the in-memory comparator to the same answer.
 */
const HOLD_ORDER = [asc(loomHolds.heldAt), asc(loomHolds.proposalId)] as const

/**
 * One unreadable row fails the whole listing rather than being skipped. A queue
 * that quietly omits a change nobody can parse is a queue that says nothing is
 * waiting when something is — and the reviewer has no way to find out otherwise.
 */
const parseAll = (
  rows: readonly (typeof loomHolds.$inferSelect)[]
): Result<readonly HeldProposal[], HoldError> => {
  const held: HeldProposal[] = []

  for (const row of rows) {
    const parsed = toHeld(row)
    if (!parsed.ok) return parsed

    held.push(parsed.value)
  }

  return ok(held)
}

export const postgresHoldStore = (db: LoomDatabase): HoldStore => ({
  hold: async (held) => {
    try {
      await db.insert(loomHolds).values({
        proposalId: held.proposalId,
        treeId: held.treeId,
        baseRevision: held.baseRevision,
        intent: held.intent,
        proposal: held.proposal,
        disposition: held.disposition,
        heldAt: held.heldAt,
      })

      return ok(held)
    } catch (cause) {
      /**
       * The primary key on `proposal_id` is what makes "already held" a fact the
       * database establishes rather than a check this code races against. Two
       * requests holding the same proposal cannot both win, and the loser arrives
       * here rather than overwriting a hold somebody may already be reading.
       */
      return isUniqueViolation(cause)
        ? err<HoldError>({ code: "already-held", proposalId: held.proposalId })
        : err(unavailable(cause, `could not hold ${held.proposalId}`))
    }
  },

  get: async (proposalId) => {
    try {
      const rows = await db.select().from(loomHolds).where(eq(loomHolds.proposalId, proposalId)).limit(1)

      const row = rows[0]

      return row === undefined ? err<HoldError>({ code: "not-held", proposalId }) : toHeld(row)
    } catch (cause) {
      return err(unavailable(cause, `could not read the hold on ${proposalId}`))
    }
  },

  forTree: async (treeId) => {
    try {
      const rows = await db
        .select()
        .from(loomHolds)
        .where(eq(loomHolds.treeId, treeId))
        .orderBy(...HOLD_ORDER)

      return parseAll(rows)
    } catch (cause) {
      return err(unavailable(cause, `could not list what is held against ${treeId}`))
    }
  },

  waiting: async (request) => {
    const limit = clampHoldLimit(request?.limit)
    const from = holdCursorPosition(request?.cursor)

    try {
      const rows = await db
        .select()
        .from(loomHolds)
        /**
         * A row-value comparison, which is `compareHolds` said in SQL: Postgres
         * compares the tuple left to right, so this is "later than that instant,
         * or the same instant under a later id" without writing that out as
         * three predicates one of which will eventually be wrong.
         */
        .where(
          from === undefined
            ? undefined
            : sql`(${loomHolds.heldAt}, ${loomHolds.proposalId}) > (${from.heldAt}, ${from.proposalId})`
        )
        .orderBy(...HOLD_ORDER)
        /** One extra row answers "is there another page" without a count. */
        .limit(limit + 1)

      const parsed = parseAll(rows.slice(0, limit))
      if (!parsed.ok) return parsed

      const last = parsed.value.at(-1)

      return ok<HoldPage>({
        held: parsed.value,
        cursor: rows.length > limit && last !== undefined ? holdCursor(last) : null,
      })
    } catch (cause) {
      return err(unavailable(cause, "could not list what is held"))
    }
  },

  /**
   * One statement, because `release` is a take rather than a read.
   *
   * `DELETE … RETURNING` is what makes answering happen exactly once a property
   * of the database instead of a rule this code has to be trusted to follow: a
   * select-then-delete would let two reviewers confirming at the same moment both
   * come away holding the same change, and both apply it. The in-memory store
   * gets that from being single-threaded; here it has to come from the statement.
   */
  release: async (proposalId) => {
    try {
      const rows = await db.delete(loomHolds).where(eq(loomHolds.proposalId, proposalId)).returning()

      const row = rows[0]

      return row === undefined ? err<HoldError>({ code: "not-held", proposalId }) : toHeld(row)
    } catch (cause) {
      return err(unavailable(cause, `could not release ${proposalId}`))
    }
  },
})
