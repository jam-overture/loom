import nextEnv from "@next/env"
import { sql } from "drizzle-orm"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

import {
  collectReaderSignals,
  describeCollection,
  readerSignalWindowSchema,
} from "@jam-overture/loom/signals"
import { postgresReaderSignalJournal, postgresReaderTallyStore } from "@jam-overture/loom/signals/postgres"

import { resolveConnectionString } from "../app/(portal)/_lib/connection"

/**
 * Counts the reader-signal buffer into the durable tallies and drops what it
 * counted.
 *
 * A script rather than something the app does, for `telemetry-prune.ts`'s
 * reasons and one that is sharper here: this is the **only** thing that empties
 * the buffer, and the buffer is the largest table a deployment with signals
 * switched on will have. Not scheduling it does not merely let a journal grow —
 * nothing is counted at all, and the portal's numbers stay at zero while the
 * batches pile up.
 *
 * Safe to run repeatedly and safe to interrupt. It is incremental: a buffer far
 * behind is caught up over several runs, and a run that finds more waiting says
 * so.
 *
 * **Not safe to run twice at once, and that is what the advisory lock below is
 * for.** Two collectors reading the same ripe prefix would both roll it up and
 * both apply, and applying is additive — so the counters would be doubled and
 * the buffer would be emptied once, leaving nothing that could say it happened.
 * The runtime cannot prevent this because serialising is the caller's to do; a
 * cron that overruns its own interval is the ordinary way it would arise.
 */
const { loadEnvConfig } = nextEnv

loadEnvConfig(process.cwd())

/**
 * One hour, which is the runtime's own default and is repeated here only so the
 * message below can name it. It is the age a batch reaches before it is counted
 * and dropped, and it is one number for three facts (0158): how long a page view
 * is given to finish, how long a view key lives, and how far the tallies lag the
 * buffer.
 */
const DEFAULT_WINDOW_MS = 60 * 60 * 1000

const configured = readerSignalWindowSchema.safeParse({
  windowMs: Number(process.env.LOOM_SIGNAL_WINDOW_MS ?? DEFAULT_WINDOW_MS),
})

if (!configured.success) {
  console.error(
    `LOOM_SIGNAL_WINDOW_MS is not a usable window: ${
      configured.error.issues[0]?.message ?? "invalid"
    }\nBelow one minute every page view straddles a boundary, so the view counts stop meaning anything.`
  )
  process.exit(1)
}

const connectionString = resolveConnectionString()

if (connectionString === undefined) {
  console.error(
    "signals:collect needs DATABASE_URL (or POSTGRES_URL).\n" +
      "Without one the buffer is in memory and there is nothing durable to count."
  )
  process.exit(1)
}

const client = postgres(connectionString, { prepare: false, max: 1 })

/**
 * A session-level advisory lock, held for as long as the one connection lives
 * and released when it closes — including when this process is killed, which a
 * lock table of our own would not manage.
 */
const LOCK_KEY = 8_090_146_158

try {
  const db = drizzle(client)
  const [held] = await db.execute<{ locked: boolean }>(
    sql`SELECT pg_try_advisory_lock(${LOCK_KEY}) AS locked`
  )

  /** Another collector has the window. Not a failure — the work is being done. */
  if (held?.locked !== true) {
    console.log("loom: another collection is already running, so this one did nothing")
    process.exit(0)
  }

  const outcome = await collectReaderSignals(
    postgresReaderSignalJournal(db),
    postgresReaderTallyStore(db),
    configured.data
  )

  console.log(`loom: ${describeCollection(outcome)}`)

  /**
   * `counted-not-forgotten` fails the job as loudly as the two that changed
   * nothing, and for a worse reason: the counters took the window and the buffer
   * still holds it, so the next run counts it again. The line above names the
   * position to prune below.
   */
  if (outcome.outcome !== "collected" && outcome.outcome !== "nothing-ripe") process.exit(1)
} finally {
  await client.end()
}
