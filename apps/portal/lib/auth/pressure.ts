import type { AttemptSurvey } from "./attempts"
import { assess, type ThrottlePolicy } from "./throttle"

/**
 * How much guessing this deployment is currently absorbing, as a pure function
 * of what the log holds.
 *
 * The throttle has always been able to answer "is this caller locked out" one
 * caller at a time, at the moment they knock. Nobody could ask the other
 * question — "is anybody being locked out at all" — because a lockout is
 * computed and never recorded (day 32's gap, and the operator half of the
 * question raised on #45). This module is that answer, and it is deliberately
 * arithmetic rather than a new thing to store: the numbers are derived from the
 * same rows the throttle already keeps, by the same `assess` the sign-in path
 * runs, so an operator's page cannot disagree with the form.
 *
 * No clock and no IO, like `throttle.ts` beside it. `now` is handed in.
 */

export type SignInPressure = {
  /** Subjects carrying at least one failure the throttle has not forgotten. */
  readonly subjects: number
  readonly failures: number
  /** How many of those are serving a lockout at `now`. */
  readonly locked: number
  /**
   * Whether `locked` is the whole count or a floor. A survey is capped, and a
   * page that reported a floor as a total would understate the one number an
   * operator is looking at it for.
   */
  readonly lockedIsExact: boolean
  /** The longest wait still owed by any counted subject, or zero. */
  readonly longestWaitMs: number
  readonly earliestFailureAt: number | null
  readonly latestFailureAt: number | null
  /** How many records the two numbers above were computed over. */
  readonly counted: number
}

/**
 * Whether the survey's cap can have hidden a lockout.
 *
 * Records arrive newest first, so a cap drops the oldest — and a record can only
 * still be serving a lockout if its last failure is inside the longest lockout
 * the policy can impose. If the oldest record that *did* arrive is already past
 * that horizon, everything dropped is older still and none of it can be locked,
 * so the count is exact despite the truncation.
 *
 * This matters in the case that matters: a burst large enough to fill the cap is
 * exactly when an operator most needs the number to be a number.
 */
const capCanHideALockout = (
  survey: AttemptSurvey,
  now: number,
  policy: ThrottlePolicy
): boolean => {
  if (survey.records.length >= survey.subjects) return false

  const oldestSeen = survey.records[survey.records.length - 1]

  return oldestSeen === undefined || oldestSeen.lastFailureAt > now - policy.maxLockoutMs
}

export const readPressure = (
  survey: AttemptSurvey,
  now: number,
  policy: ThrottlePolicy
): SignInPressure => {
  const verdicts = survey.records.map((record) => assess(record, now, policy))
  const waits = verdicts.map((verdict) => (verdict.code === "locked" ? verdict.retryAfterMs : 0))

  return {
    subjects: survey.subjects,
    failures: survey.failures,
    locked: waits.filter((wait) => wait > 0).length,
    lockedIsExact: !capCanHideALockout(survey, now, policy),
    longestWaitMs: waits.reduce((longest, wait) => Math.max(longest, wait), 0),
    earliestFailureAt: survey.earliestFailureAt,
    latestFailureAt: survey.latestFailureAt,
    counted: survey.records.length,
  }
}

/**
 * Enough rows that a real burst is counted exactly, few enough that the page
 * cannot be made expensive by a caller rotating addresses. The sweep bounds the
 * table over time; this bounds one read of it.
 */
export const SURVEY_LIMIT = 500
