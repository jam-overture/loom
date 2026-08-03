import type { AttemptLog } from "./attempts"
import { assess, forgetBefore, type ThrottlePolicy } from "./throttle"

/**
 * One sign-in attempt, from "may they try" to "what happened".
 *
 * Everything that decides the outcome is here, and everything that makes it a
 * *web* sign-in — the cookie, the headers, the roster in the environment — is
 * in `identity.ts`. So the order of operations, which is the part with security
 * consequences, is testable against a real log and a fake credential check.
 *
 * The order:
 *
 * 1. **Ask the log first.** A locked-out caller never reaches the comparison, so
 *    a lockout costs them the oracle as well as the time. Checking afterwards
 *    would leave the roster answering questions it has refused to answer.
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
 * Synchronous and total: it is a comparison against a roster already in memory,
 * and giving it room to fail would give this module a second failure mode that
 * looks like a rejection.
 */
export type VerifyKey = () => string | null

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

  const actor = verify()

  if (actor !== null) {
    /**
     * A failure to forget is not a failure to sign in. The key was right, the
     * caller is on the roster, and refusing them because a row could not be
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
