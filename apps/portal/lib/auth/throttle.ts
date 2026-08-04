/**
 * How much guessing this portal will tolerate, as a pure function of what has
 * already been tried.
 *
 * 0027 shipped the roster with the gap named in its own consequences: "there is
 * no rate limit on sign-in. The key is long and compared in constant time, but
 * nothing slows down an attacker guessing." This is the arithmetic half of
 * closing it — no clock, no storage, no request. Everything that decides
 * *whether* an attempt is allowed lives here and is tested without a database;
 * `attempts.ts` only remembers what this module counts.
 *
 * The window and the lockout are separate on purpose. The window is how long a
 * failure is held against you; the lockout is how long you wait once enough of
 * them have accumulated. Collapsing them into one number would mean either
 * forgiving an attacker quickly or punishing a mistyped key for an hour.
 */

export type ThrottlePolicy = {
  /** Failures tolerated inside the window before the next one locks. */
  readonly threshold: number
  /** How long a failure is remembered. */
  readonly windowMs: number
  /** The wait imposed by the failure that crosses the threshold. */
  readonly lockoutMs: number
  /** The ceiling the doubling stops at. */
  readonly maxLockoutMs: number
}

/**
 * What is known about one subject's recent failures. Deliberately three numbers
 * and no identity: `attempts.ts` keys these by a digest, and nothing downstream
 * of here can tell one caller from another.
 */
export type AttemptRecord = {
  readonly failures: number
  readonly firstFailureAt: number
  readonly lastFailureAt: number
}

export type ThrottleVerdict =
  | { readonly code: "allowed" }
  | { readonly code: "locked"; readonly until: number; readonly retryAfterMs: number }

/**
 * Five failures is more than a reviewer pasting the wrong line out of a password
 * manager and far fewer than a search of any real key space. The first lockout
 * is a minute — long enough to end automated guessing at any useful rate, short
 * enough that the reviewer who caused it does not go looking for an operator.
 *
 * Doubling to a fifteen-minute ceiling means an attacker who patiently waits out
 * every lockout gets roughly forty guesses a day against a 24-character key, and
 * a reviewer who eventually finds the right key never waits more than a quarter
 * of an hour.
 */
export const DEFAULT_THROTTLE_POLICY: ThrottlePolicy = {
  threshold: 5,
  windowMs: 60 * 60 * 1000,
  lockoutMs: 60 * 1000,
  maxLockoutMs: 15 * 60 * 1000,
}

/**
 * The wait owed by a subject with this many failures, or zero if they are still
 * under the threshold.
 *
 * `2 ** n` overflows to `Infinity` long before it overflows anything else, and
 * `Math.min` answers `maxLockoutMs` for it, so a subject with a preposterous
 * failure count is capped rather than undefined.
 */
export const lockoutFor = (failures: number, policy: ThrottlePolicy): number =>
  failures < policy.threshold
    ? 0
    : Math.min(policy.lockoutMs * 2 ** (failures - policy.threshold), policy.maxLockoutMs)

/**
 * The instant before which a failure no longer counts.
 *
 * A single number that depends on the policy and the clock but *not* on the
 * record it will be compared against. That is what lets the same cutoff be
 * handed to a SQL statement as a parameter: the database decides whether a row
 * is stale by comparing one column to one number, and every rule about what
 * staleness means stays in this file.
 *
 * It reaches back past the longest possible lockout as well as past the window,
 * so a subject cannot be forgotten while still serving one. Without that, a
 * policy whose ceiling exceeded its window would release a lockout early by
 * losing the record that imposed it.
 */
export const forgetBefore = (now: number, policy: ThrottlePolicy): number =>
  now - Math.max(policy.windowMs, policy.maxLockoutMs)

const ALLOWED: ThrottleVerdict = { code: "allowed" }

/**
 * Whether this subject may present a key at all.
 *
 * Called *before* the key is compared, so a locked-out caller learns nothing
 * about the roster while they wait — and the comparison they would have paid
 * for never runs.
 */
export const assess = (
  record: AttemptRecord | null,
  now: number,
  policy: ThrottlePolicy
): ThrottleVerdict => {
  if (record === null || record.lastFailureAt < forgetBefore(now, policy)) return ALLOWED

  const lockout = lockoutFor(record.failures, policy)

  /**
   * Answered before the arithmetic rather than falling out of it. A record under
   * the threshold owes nothing, and `lastFailureAt + 0` is a moment that can sit
   * in the future — two instances whose clocks disagree by a second is enough —
   * which would otherwise read as a lockout of a second nobody imposed.
   */
  if (lockout === 0) return ALLOWED

  const until = record.lastFailureAt + lockout

  return now < until ? { code: "locked", until, retryAfterMs: until - now } : ALLOWED
}

/**
 * The record a failure leaves behind.
 *
 * A remembered record escalates rather than restarting, which is the property
 * that matters: waiting out a lockout and trying again earns the *next* wait,
 * not the first one. Only genuine silence for a whole window resets the count.
 *
 * Takes the cutoff rather than the policy, unlike `assess` above. That is not
 * tidiness — it is the seam. `AttemptLog` hands this same number to a SQL
 * statement, and a `penalise` that needed a policy object would be a `penalise`
 * the database could not implement.
 */
export const afterFailure = (
  record: AttemptRecord | null,
  now: number,
  cutoff: number
): AttemptRecord => {
  const carried = record !== null && record.lastFailureAt >= cutoff ? record : null

  return {
    failures: (carried?.failures ?? 0) + 1,
    firstFailureAt: carried?.firstFailureAt ?? now,
    lastFailureAt: now,
  }
}

const MINUTE_MS = 60 * 1000

/**
 * Rounded up, and never "0 seconds": a wait reported as elapsed invites a retry
 * that is refused again, which reads as a portal that is broken rather than one
 * that is counting.
 */
export const describeWait = (retryAfterMs: number): string => {
  if (retryAfterMs >= MINUTE_MS) {
    const minutes = Math.ceil(retryAfterMs / MINUTE_MS)

    return `${minutes} minute${minutes === 1 ? "" : "s"}`
  }

  const seconds = Math.max(1, Math.ceil(retryAfterMs / 1000))

  return `${seconds} second${seconds === 1 ? "" : "s"}`
}
