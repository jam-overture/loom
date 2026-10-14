import { readWithin, unavailable } from "@/app/_lib/app/bounded-store"

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

const custody: AttemptLog = (carrier[CARRIER_KEY] ??=
  portalDatabase === undefined ? memoryAttemptLog() : postgresAttemptLog(portalDatabase))

/**
 * The throttle, read with a budget.
 *
 * `AttemptLog` is this lane's own type rather than the framework's, so it is
 * wrapped here beside where it is composed rather than in
 * `_lib/app/bounded-store.ts` — which exports the rule (`readWithin`) and not a
 * factory per type it cannot see.
 *
 * Both reads take the budget, and the one that matters is `recall`. It sits in
 * front of the key comparison on a form anyone on the internet can reach
 * (`attempt-sign-in.ts` reads the log **before** comparing), so a database that
 * does not answer used to mean a sign-in button that never came back — which is
 * what the maintainer was looking at on 12 October. It now fails in a second and
 * a half and says why.
 *
 * **It still fails closed**, and that is deliberately unchanged here: whether an
 * unreachable throttle should let somebody in is a policy question filed for the
 * maintainer, not something to decide inside a timeout wrapper.
 *
 * `penalise` and `forgive` are writes and pass straight through. Giving up on
 * `penalise` would silently stop counting failures, which is the one thing this
 * table exists to do.
 */
export const boundedAttemptLog = (log: AttemptLog, budgetMs?: number): AttemptLog => ({
  penalise: (subject, now, cutoff) => log.penalise(subject, now, cutoff),
  forgive: (subject) => log.forgive(subject),
  recall: (subject, cutoff) =>
    readWithin(() => log.recall(subject, cutoff), unavailable, budgetMs),
  survey: (cutoff, limit) => readWithin(() => log.survey(cutoff, limit), unavailable, budgetMs),
})

export const portalAttemptLog: AttemptLog = boundedAttemptLog(custody)

/**
 * Whether the counting outlives this process — and, on a serverless host,
 * whether it is shared across instances at all. `/portal/sign-ins` states it rather
 * than implying it: a page reporting "nobody is locked out" over a per-instance
 * map is reporting on one instance's memory, and an operator has to be told
 * which of the two they are reading.
 */
export const attemptLogIsDurable = portalDatabase !== undefined
