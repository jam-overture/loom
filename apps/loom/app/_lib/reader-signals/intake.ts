import {
  createIntakeGate,
  DEFAULT_INTAKE_POLICY,
  memoryReaderSignalJournal,
} from "@loom/runtime/signals"
import { postgresReaderSignalJournal } from "@loom/runtime/signals/postgres"

import { portalDatabase } from "@/app/(portal)/_lib/database"

import type { Intake } from "./receive"
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

const build = (): Intake => {
  const settings = readIntakeSettings()

  return {
    settings,
    journal:
      portalDatabase === undefined
        ? memoryReaderSignalJournal()
        : postgresReaderSignalJournal(portalDatabase),
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
