import { asc, eq, sql } from "drizzle-orm"

import { err, ok, type Result } from "../result.js"
import {
  clampHoldLimit,
  describeHoldError,
  holdCursor,
  holdCursorPosition,
  holdPosition,
  parseHeldProposal,
  type HeldProposal,
  type HoldError,
  type HoldListing,
  type HoldPage,
  type HoldPosition,
  type HoldStore,
  type UnreadableHold,
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
 * Splits a page of rows into the holds it read and the rows it could not.
 *
 * The rule is 0175's and it turns on the two columns the index orders by. A row
 * whose position parses can always be named and always be paged past, so it is
 * skipped and reported: the change it was hiding is one row, and every other
 * change against that page stays on the queue where a reviewer can answer it.
 *
 * A row whose *position* does not parse is a different fault and fails the
 * whole listing. Skipping it would mean minting a cursor from something that is
 * not a position — a value the next request cannot read, which starts it again
 * at the beginning and pages forever. There is no honest way to step over a row
 * the ordering cannot place, so the listing says so instead.
 */
const parseAll = (
  rows: readonly (typeof loomHolds.$inferSelect)[]
): Result<HoldListing, HoldError> => {
  const held: HeldProposal[] = []
  const unreadable: UnreadableHold[] = []

  for (const row of rows) {
    const position = holdPosition(row)
    if (position === undefined)
      return err<HoldError>({
        code: "unreadable",
        detail: `a stored hold could not be placed in the queue: ${row.proposalId} held at ${row.heldAt}`,
      })

    const parsed = toHeld(row)
    if (parsed.ok) held.push(parsed.value)
    else unreadable.push({ ...position, detail: describeHoldError(parsed.error) })
  }

  return ok<HoldListing>({ held, unreadable })
}

/**
 * The position a page resumes from: the last row the window read, readable or
 * not.
 *
 * Taking it from the last *parsed* hold is the bug that skipping would
 * otherwise introduce, and it is worse than the behaviour it replaces. A page
 * whose final rows were all unreadable would resume before them and report them
 * again forever; a page whose rows were *all* unreadable would have no last
 * hold at all, so the cursor would come back `null` and every hold after them
 * would drop off the queue — the whole fault this change exists to remove,
 * moved one page along.
 */
const pageEnd = (rows: readonly (typeof loomHolds.$inferSelect)[]): HoldPosition | undefined => {
  const last = rows.at(-1)

  return last === undefined ? undefined : holdPosition(last)
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

      const inPage = rows.slice(0, limit)
      const parsed = parseAll(inPage)
      if (!parsed.ok) return parsed

      const last = pageEnd(inPage)

      return ok<HoldPage>({
        ...parsed.value,
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
