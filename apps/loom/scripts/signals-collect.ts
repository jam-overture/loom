import nextEnv from "@next/env"
import { sql } from "drizzle-orm"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

import {
  collectReaderSignals,
  describeCollection,
  describeExpiry,
  describeRetentionPromise,
  expireReaderEvents,
  retentionPromiseOf,
} from "@jam-overture/loom/signals"
import { postgresApplicationStore } from "@jam-overture/loom/postgres"
import { postgresReaderSignalJournal, postgresReaderTallyStore } from "@jam-overture/loom/signals/postgres"
import { DEFAULT_APPLICATION_ID, describeApplicationStoreError } from "@jam-overture/loom/store"

import { resolveConnectionString } from "../app/_lib/app/connection"
import { deploymentNoticeOf } from "../app/_lib/reader-signals/notice"
import {
  describeCollectionWindow,
  describeKeptWindow,
  describeSweepSchedule,
  readIntakeSettings,
} from "../app/_lib/reader-signals/settings"

/**
 * Counts the reader-signal buffer into the durable tallies, and deletes the
 * deliveries this deployment no longer keeps.
 *
 * A script rather than something the app does, for `telemetry-prune.ts`'s
 * reasons and one that is sharper here: this is the **only** thing that counts
 * or deletes anything in the largest table a deployment with signals switched
 * on will have. Not scheduling it does not merely let a journal grow — nothing
 * is counted at all, and the portal's numbers stay at zero while the batches
 * pile up.
 *
 * **Two sweeps in one run, counting first** (0350). A delivery is counted once
 * it is ripe and deleted once it is past the window this deployment keeps
 * events for — thirty days by default, so that an operator can look at the
 * deliveries behind a counter (0349) — and nothing may delete a delivery no
 * fold has counted. Counting first is therefore what lets one run's own fold
 * make its own window deletable rather than waiting for the next run; it is
 * also the order the ceiling published to readers assumes.
 *
 * Safe to run repeatedly and safe to interrupt. It is incremental: a buffer far
 * behind is caught up over several runs, and a run that finds more waiting says
 * so.
 *
 * **Not safe to run twice at once, and that is what the advisory lock below is
 * for.** Two collectors reading the same ripe prefix would both roll it up and
 * both apply, and applying is additive — so the counters would be doubled and
 * the prefix marked once, leaving nothing that could say it happened.
 * The runtime cannot prevent this because serialising is the caller's to do; a
 * cron that overruns its own interval is the ordinary way it would arise.
 */
const { loadEnvConfig } = nextEnv

loadEnvConfig(process.cwd())

/**
 * This deployment's whole intake configuration, read once.
 *
 * **Read where the rest of this deployment's intake settings are read** (0317).
 * This script used to spell an hour out again and parse the environment itself,
 * so the package's copy of the default was the one with the reasoning attached
 * and this one was the copy a deployment's batches were actually swept on.
 *
 * All of it rather than the two settings a sweep acts on, because the run now
 * judges its own evidence against the notice this deployment publishes (0321),
 * and `deploymentNoticeOf` is what builds that notice. A second assembly of it
 * here would be a second ceiling, which is the fault above in another file.
 */
const settings = readIntakeSettings()

/**
 * The age a batch reaches before it is counted — one number for two facts
 * (0158): how long a page view is given to finish, and how far the tallies lag
 * the buffer. **It stopped being the third** on 5 November: how long a view key
 * lives is now the kept window below (0350).
 */
const sweepWindow = settings.window

/** The age a counted delivery reaches before it is deleted (0349, 0350). */
const keptWindow = settings.kept

/**
 * A window that cannot be read stops the sweep rather than falling back to the
 * default. An operator who typed a day meant a day: sweeping on an hour instead
 * would change what their counters mean and how long a delivery lives, which is
 * a number their readers are told, and it would do it silently.
 */
if (sweepWindow.state === "unusable") {
  console.error(
    `loom: ${describeCollectionWindow(sweepWindow)}\n` +
      "Below one minute every page view straddles a boundary, so the view counts stop meaning anything."
  )
  process.exit(1)
}

console.log(`loom: ${describeCollectionWindow(sweepWindow)}`)

/**
 * An unreadable kept window stops the **deletion** and nothing else, which is
 * why this is a line rather than an exit.
 *
 * The collection window above refuses the whole run because sweeping on the
 * wrong window would silently change what a deployment's counters mean. This
 * one cannot: expiry writes no counter, so the worst an unreadable value does
 * is keep deliveries while the notice publishes a ceiling over the default —
 * and the fix for that is the operator's, who needs the run to go on counting
 * in the meantime.
 */
console.log(`loom: ${describeKeptWindow(keptWindow)}`)

/**
 * This script **is** the sweep, so it is the right place to say whether anybody
 * was told how often it runs.
 *
 * It never refuses on it: an unstated schedule costs a sentence on a privacy
 * page and nothing a run does (0320). Printed because the operator reading this
 * output is the one person who knows what the cron interval actually is.
 */
console.log(`loom: ${describeSweepSchedule(settings.sweep)}`)

/**
 * The retention this deployment publishes to its readers, taken off the notice
 * itself rather than rebuilt from the two settings behind it.
 *
 * It is the ceiling each run below is judged against, and the only reason that
 * judgement means anything is that it is the same value a reader is shown
 * (0321): a sweep that derived its own would be able to clear a promise nobody
 * made.
 */
const { bufferMs, keptMs, sweep } = deploymentNoticeOf(settings)

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

  /**
   * **Every application's buffer, one at a time** (0298). A delivery is filed
   * under the application its key names, and a handle is scoped to one, so a
   * collector that counted only the deployment's own would leave every
   * customer's batches in the largest table there is, uncounted, for ever.
   *
   * Closed applications included: closing stops new batches at the door, and
   * the ones that arrived before it are still owed a count. The deployment's
   * own is added whether or not `db:push` has seeded its row, because the
   * reader tables default to it and its buffer exists either way.
   */
  const listed = await postgresApplicationStore(db).list({ closed: "all" })

  if (!listed.ok) {
    console.error(`loom: ${describeApplicationStoreError(listed.error)}`)
    process.exit(1)
  }

  const applications = [
    ...new Set([DEFAULT_APPLICATION_ID, ...listed.value.map((one) => one.applicationId)]),
  ]

  let failed = 0

  for (const application of applications) {
    const outcome = await collectReaderSignals(
      postgresReaderSignalJournal(db, { application }),
      postgresReaderTallyStore(db, { application }),
      { windowMs: sweepWindow.windowMs }
    )

    console.log(`loom: ${application}: ${describeCollection(outcome)}`)

    /**
     * The deletion, after the count and over the same application's table.
     *
     * It is skipped where the window could not be read, which is the one state
     * in which deleting would be guessing: `expireReaderEvents` would refuse on
     * the value anyway, and this says so in the operator's words rather than in
     * a refusal nobody asked for.
     */
    const expiry =
      keptWindow.state === "unusable"
        ? undefined
        : await expireReaderEvents(postgresReaderSignalJournal(db, { application }), {
            keptMs: keptWindow.keptMs,
          })

    if (expiry !== undefined) console.log(`loom: ${application}: ${describeExpiry(expiry)}`)

    /**
     * Whether this run's own evidence agrees with what its readers are told.
     *
     * **Judged on the expiry run, because the ceiling is about deletion** (0350):
     * the fold's own figure says how far behind counting is, which is the stall
     * check's question, not this one. A run that could not read its kept window
     * has no evidence at all, which is what `unavailable` says here — the
     * reading's `unread`, and the honest answer rather than *kept*.
     *
     * Printed per application because each has its own table, and never a
     * reason to fail the job: a ceiling that is not being kept is the
     * operator's to fix by sweeping more often or by stating the interval they
     * sweep on, and a run that exited here would stop the sweep that is the
     * remedy.
     */
    const promise = retentionPromiseOf(
      expiry ?? {
        outcome: "unavailable",
        error: { code: "unavailable", detail: describeKeptWindow(keptWindow) },
      },
      { bufferMs, keptMs, sweep }
    )

    console.log(`loom: ${application}: ${describeRetentionPromise(promise)}`)

    /**
     * `counted-not-recorded` fails the job as loudly as the two that changed
     * nothing, and for a worse reason: the counters took the window and nothing
     * marked it, so the next run counts it again. The line above names the
     * position to mark below. One application failing does not stop the others
     * being counted — their windows are ripening regardless.
     */
    if (outcome.outcome !== "collected" && outcome.outcome !== "nothing-ripe") failed += 1

    /**
     * A failed deletion fails the job too, and for the reason the notice makes
     * it one: the deliveries are still there and readers were told they were
     * gone. `nothing-expired` is not a failure — it is the ordinary answer on
     * a deployment inside its window.
     */
    if (expiry !== undefined && expiry.outcome !== "expired" && expiry.outcome !== "nothing-expired") {
      failed += 1
    }
  }

  if (failed > 0) process.exit(1)
} finally {
  await client.end()
}
