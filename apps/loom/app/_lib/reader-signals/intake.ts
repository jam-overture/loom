import { err, ok } from "@jam-overture/loom"
import type { LoomDatabase } from "@jam-overture/loom/postgres"
import {
  createIntakeGate,
  DEFAULT_INTAKE_POLICY,
  memoryReaderRegionStore,
  memoryReaderSignalJournal,
  memoryReaderTallyStore,
  type ReaderRegionStore,
  type ReaderSignalJournal,
  type ReaderTallyStore,
} from "@jam-overture/loom/signals"
import {
  postgresReaderRegionStore,
  postgresReaderSignalJournal,
  postgresReaderTallyStore,
} from "@jam-overture/loom/signals/postgres"
import { describeApplicationStoreError, type ApplicationId } from "@jam-overture/loom/store"

import { portalDatabase } from "@/app/(portal)/_lib/database"
import { appApplications } from "@/app/_lib/app/store"

import type { Senders } from "./attribution"
import { appIngestKeys } from "./key-store"
import type { IngestKeyStore } from "./keys"
import type { Filing, Intake } from "./receive"
import { readIntakeSettings } from "./settings"
import { subjectOf } from "./subject"

/**
 * This deployment's intake, built once.
 *
 * Postgres when one is configured and memory when not — the same two supported
 * states as the store, the telemetry journal and the attempt log, on the same
 * handle. Memory is right for `pnpm dev`, where one process holds the buffer
 * for as long as you are looking at it, and wrong for serverless, where a batch
 * lands on the instance that took it and `signals:collect` reads a database
 * neither of them wrote to. The status endpoint reports which, because the two
 * are indistinguishable from the portal's screen.
 *
 * `portalDatabase` is reached from outside the portal's route group on purpose:
 * it is one handle for the process, and a second client opened here would
 * double this deployment's connection count to write to the same database. The
 * `db:push` and `signals:collect` scripts already cross the same way, for the
 * same reason. What the file decides is a deployment's, not a portal's.
 *
 * Memoised on a global carrier for `attempt-log.ts`'s reason, which is sharper
 * here: the gate **is** the rate limit, and a module re-evaluated between
 * requests would hand out a fresh, empty counter — a limiter that forgets on
 * every reload is not a limiter.
 *
 * Constructing it is cheap. postgres.js does not connect until the first query,
 * so nothing here reaches the network at import time, which is what lets
 * `next build` evaluate this route module while collecting page data.
 */
const CARRIER_KEY = Symbol.for("loom.app.reader-signals")

type Carrier = { [CARRIER_KEY]?: Intake }

const carrier = globalThis as unknown as Carrier

/**
 * One application's stores, in full: what the door files into and what a
 * screen reads back out of.
 *
 * The door is handed a `Filing`, which is these narrowed to the methods it
 * moves; the project's *Signals* screen is handed a `Readings`. Both come from
 * here so that they are **the same stores** — in memory that is the whole
 * point, since two constructions would be two maps and a screen reading the
 * second would show nothing the door had filed into the first.
 */
type Kept = {
  readonly journal: ReaderSignalJournal
  readonly regions: ReaderRegionStore
  readonly tallies: ReaderTallyStore
}

/**
 * On the handle the store and the journal already use.
 *
 * The region buckets are a durable counter rather than a window, so in memory
 * they are a map the next cold start has never heard of — the status endpoint
 * already says whether anything here outlives the process. The page-view
 * counter is the tallies store rather than a store of its own: the other side
 * of the same row is written by `signals:collect`, and a column nothing writes
 * is a column nobody can subtract.
 */
const postgresKept =
  (db: LoomDatabase) =>
  (application: ApplicationId): Kept => ({
    journal: postgresReaderSignalJournal(db, { application }),
    regions: postgresReaderRegionStore(db, { application }),
    tallies: postgresReaderTallyStore(db, { application }),
  })

/**
 * The memory stores take no scope, so the scoping is a map: one set of stores
 * per application, kept for the life of the process like the single set this
 * replaced. A process that served two applications from one buffer would be
 * the mixing this unit exists to prevent, one layer further down.
 */
const memoryKept = (): ((application: ApplicationId) => Kept) => {
  const kept = new Map<ApplicationId, Kept>()

  return (application) => {
    const held = kept.get(application)
    if (held !== undefined) return held

    const made: Kept = {
      journal: memoryReaderSignalJournal(),
      regions: memoryReaderRegionStore(),
      tallies: memoryReaderTallyStore(),
    }
    kept.set(application, made)

    return made
  }
}

const KEPT_KEY = Symbol.for("loom.app.reader-signals.kept")

/** Memoised for the gate's reason below: a re-evaluated module would be an empty map. */
const keptFor: (application: ApplicationId) => Kept = ((
  globalThis as unknown as { [KEPT_KEY]?: (application: ApplicationId) => Kept }
)[KEPT_KEY] ??= portalDatabase === undefined ? memoryKept() : postgresKept(portalDatabase))

/** The door's view: the buffer and the two counters it moves, and nothing it could read a tally through. */
const filingFor = (application: ApplicationId): Filing => {
  const kept = keptFor(application)

  return { journal: kept.journal, regions: kept.regions, openings: kept.tallies }
}

/** What a screen reads for one application: what is waiting, and what has been counted. */
export type Readings = {
  readonly journal: ReaderSignalJournal
  readonly tallies: ReaderTallyStore
}

/**
 * One application's readings, from the stores its deliveries are filed into.
 * Unbounded, like everything else here; the screen bounds its own reads.
 */
export const readingsFor = (application: ApplicationId): Readings => {
  const kept = keptFor(application)

  return { journal: kept.journal, tallies: kept.tallies }
}

/**
 * A key, to the application it names as the store holds it.
 *
 * Two reads rather than a join, because the keys are this deployment's table
 * and the applications are the runtime's, and a join would be this file
 * knowing the runtime's column names. The application read is the bounded
 * handle every screen uses, so a database that has stopped answering costs a
 * sender the budget rather than the request.
 */
const sendersOf = (keys: IngestKeyStore): Senders => ({
  applicationWithKey: async (key) => {
    const named = await keys.applicationWithKey(key)

    if (!named.ok) return named
    if (named.value === null) return ok(null)

    const application = await appApplications.get(named.value)

    if (application.ok) return ok(application.value)

    /** A key naming an application that is not there names nobody. */
    return application.error.code === "not-found"
      ? ok(null)
      : err({ detail: describeApplicationStoreError(application.error) })
  },
})

const build = (): Intake => {
  const settings = readIntakeSettings()

  return {
    settings,
    senders: sendersOf(appIngestKeys),
    filingFor,
    /**
     * The runtime's own numbers, with nothing in the environment able to widen
     * them. A deployment that needs different limits is a finding and a
     * decision, not a variable somebody sets in a hurry on the afternoon the
     * table starts growing.
     */
    gate: createIntakeGate(DEFAULT_INTAKE_POLICY),
    durable: portalDatabase !== undefined,
    subjectOf: (request) => subjectOf(request, settings.hops),
    now: () => Date.now(),
  }
}

export const appIntake: Intake = (carrier[CARRIER_KEY] ??= build())
