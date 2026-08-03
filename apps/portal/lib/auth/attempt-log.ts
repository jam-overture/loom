import { portalDatabase } from "../database"

import { memoryAttemptLog, type AttemptLog } from "./attempts"
import { postgresAttemptLog } from "./attempts-postgres"

/**
 * The attempt log this deployment uses: Postgres when one is configured, memory
 * when not — the same choice `store.ts` makes, from the same handle.
 *
 * Both are supported states, and the difference is worth naming. On memory the
 * throttle counts per instance, so a serverless deployment with no database
 * throttles a caller roughly as many times more slowly as it has instances warm.
 * That is not a fallback anybody should run a public portal on, and it is not
 * one this file can refuse either: a portal with no database has no durable log
 * to keep its trees in, so the deployment is already understood to be
 * ephemeral.
 *
 * What it must not do is silently *stop* throttling. That is why the seam is
 * fallible and why an error from either implementation refuses the attempt
 * (0034) rather than waving it through.
 *
 * Memoised on a global carrier for the reason `store.ts` is: a module
 * re-evaluated between requests would otherwise hand out a fresh, empty map, and
 * a throttle that forgets on every reload is not a throttle.
 */
const CARRIER_KEY = Symbol.for("loom.portal.attempts")

type Carrier = { [CARRIER_KEY]?: AttemptLog }

const carrier = globalThis as unknown as Carrier

export const portalAttemptLog: AttemptLog = (carrier[CARRIER_KEY] ??=
  portalDatabase === undefined ? memoryAttemptLog() : postgresAttemptLog(portalDatabase))
