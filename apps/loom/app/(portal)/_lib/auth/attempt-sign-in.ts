import type { AttemptLog } from "./attempts"
import { assess, forgetBefore, type ThrottlePolicy } from "./throttle"

/**
 * One sign-in attempt, from "may they try" to "what happened".
 *
 * Everything that decides the outcome is here, and everything that makes it a
 * *web* sign-in — the cookie, the headers, the account store — is in
 * `identity.ts`. So the order of operations, which is the part with security
 * consequences, is testable against a real log and a fake credential check.
 *
 * The order:
 *
 * 1. **Ask the log first.** A locked-out caller never reaches the lookup, so a
 *    lockout costs them the oracle as well as the time — and costs the database
 *    the query. Checking afterwards would leave the accounts table answering
 *    questions this portal has refused to answer.
 * 2. **Compare.** `verify` is the only thing here that knows what a valid key
 *    is, and it is handed in rather than imported — this module cannot be made
 *    to leak a credential it has no way to read.
 * 3. **Forgive on success, penalise on failure**, and re-judge the record the
 *    failure just wrote so the attempt that crosses the threshold is told it has,
 *    rather than being refused for a reason it will not discover until its next
 *    try.
 */

export type SignInOutcome =
  | { readonly code: "accepted"; readonly actor: string }
  | { readonly code: "rejected" }
  | { readonly code: "locked"; readonly retryAfterMs: number }
  /** The log could not answer. Nobody signs in — see 0034. */
  | { readonly code: "unavailable"; readonly detail: string }

export type Attempt = {
  readonly subject: string
  readonly now: number
}

/**
 * Whether a presented key belongs to somebody, as an actor id or `null`.
 *
 * It was synchronous and total while a roster lived in memory. An account is a
 * row now (0285), so the lookup can be slow and can fail — and the failure is
 * reported rather than folded into `null`, because *the accounts table could
 * not answer* and *that key belongs to nobody* are the same sentence only to a
 * caller who is already in.
 */
export type VerifyKey = () => Promise<
  { readonly ok: true; readonly actor: string | null } | { readonly ok: false; readonly detail: string }
>

export const attemptSignIn = async (
  log: AttemptLog,
  policy: ThrottlePolicy,
  attempt: Attempt,
  verify: VerifyKey
): Promise<SignInOutcome> => {
  const cutoff = forgetBefore(attempt.now, policy)

  const known = await log.recall(attempt.subject, cutoff)
  if (!known.ok) return { code: "unavailable", detail: known.error.detail }

  const standing = assess(known.value, attempt.now, policy)
  if (standing.code === "locked") return { code: "locked", retryAfterMs: standing.retryAfterMs }

  const verified = await verify()

  /**
   * **A store that cannot answer is not a failed attempt.**
   *
   * Penalising here would turn an unreachable database into a lockout: every
   * caller who tried during the outage would arrive afterwards with failures
   * counted against them for something they did not do. Nobody signs in — 0034
   * — and nobody is charged for it either.
   */
  if (!verified.ok) return { code: "unavailable", detail: verified.detail }

  const actor = verified.actor

  if (actor !== null) {
    /**
     * A failure to forget is not a failure to sign in. The key was right, the
     * caller has an account, and refusing them because a row could not be
     * deleted would turn a housekeeping error into a lockout — the record simply
     * expires on its own instead.
     */
    await log.forgive(attempt.subject)

    return { code: "accepted", actor }
  }

  const counted = await log.penalise(attempt.subject, attempt.now, cutoff)
  if (!counted.ok) return { code: "unavailable", detail: counted.error.detail }

  const now = assess(counted.value, attempt.now, policy)

  return now.code === "locked"
    ? { code: "locked", retryAfterMs: now.retryAfterMs }
    : { code: "rejected" }
}
