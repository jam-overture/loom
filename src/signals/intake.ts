/**
 * Who may post a batch, and how often.
 *
 * `ingest.ts` is the doorway a batch comes through and it asks one question:
 * *is this a reader signal batch*. This module asks the other one, which no
 * other part of Loom has ever had to ask — **is this deployment willing to pay
 * for the answer.**
 *
 * Every other write in this runtime is made by a deployment's own server. A
 * reader-signal batch is written by any browser that can reach the URL, and the
 * table it lands in is the largest one a deployment with signals switched on
 * will have. So the door needs arithmetic, and the arithmetic needs to be
 * somewhere it can be read and tested without a request, a clock or a database
 * — which is here, exactly as `throttle.ts` is that for the sign-in form.
 *
 * **No HTTP in this file.** Which status code each refusal deserves is the
 * route handler's, for `ingest.ts`'s reason: the handler that serves this is a
 * surface's, not the framework's.
 *
 * **What a subject is, is the caller's to decide, and it may not be an
 * identity.** This module takes an opaque string and counts against it. 0146
 * refuses anything that identifies a reader, and a limiter that had to be told
 * who somebody is would be the loophole in it — so the contract is a key, and
 * the caller is expected to hand over something that stops being meaningful the
 * moment the counter holding it does.
 */

/**
 * A subject the gate could not make room for.
 *
 * The counter is bounded, so at some number of distinct callers it stops
 * distinguishing them, and the question is what it does then. Falling open
 * would mean a limiter any attacker with enough addresses can switch off, which
 * is worse than none because the deployment believes it has one. Refusing
 * everybody takes the site down over a crowd.
 *
 * So they share a count, which is `subject.ts`'s answer to the same question
 * and the direction to be wrong in: stricter than counting them separately,
 * and it costs nothing to a deployment that never fills the map.
 */
export const CROWDED_SUBJECT = "crowded"

export type IntakePolicy = {
  /** The largest delivery the door will read, in bytes. */
  readonly maxBytes: number
  /** Deliveries one subject may make inside a window. */
  readonly deliveries: number
  readonly windowMs: number
  /** How many subjects the counter distinguishes before {@link CROWDED_SUBJECT}. */
  readonly subjects: number
}

/**
 * `sendBeacon` is specified to refuse a body over 64 KB, so a delivery larger
 * than that did not come from a beacon — which makes the ceiling a statement
 * about the sender rather than a number somebody liked. `fetch` has no such
 * limit and the fallback path is held to the same one deliberately.
 *
 * A broadcaster flushes every five seconds, so one page view is twelve
 * deliveries a minute. A hundred and twenty is eight of those at once — more
 * tabs than a reader has open on one site, and enough headroom for a queue
 * draining after an outage, which is the case `MAX_BATCHES_PER_DELIVERY` exists
 * to allow rather than to punish.
 *
 * Ten thousand subjects is about a megabyte of counters and far past the point
 * where the traffic is an attack rather than an audience.
 */
export const DEFAULT_INTAKE_POLICY: IntakePolicy = {
  maxBytes: 64 * 1024,
  deliveries: 120,
  windowMs: 60 * 1000,
  subjects: 10_000,
}

/**
 * What the gate remembers about one subject: a fixed window and a count inside
 * it. Two numbers and no identity, for `AttemptRecord`'s reason.
 *
 * A fixed window rather than a sliding one or a bucket, because the thing being
 * protected is a table's growth rate over minutes and every refinement costs
 * per-subject state that has to be held in memory for every caller. A caller
 * who times their deliveries across a window boundary gets two windows' worth
 * in a moment; at these numbers that is 240 deliveries and not a problem worth
 * a data structure.
 */
export type IntakeCount = {
  readonly deliveries: number
  readonly windowStartedAt: number
}

/**
 * `too-large` carries the count as `admitted` does, because it spent one: a
 * caller whose body was refused has still had their delivery read far enough to
 * refuse it. `too-often` carries none — the count that refused them is already
 * what there is to remember.
 */
export type IntakeVerdict =
  | { readonly code: "admitted"; readonly count: IntakeCount }
  | {
      readonly code: "too-large"
      readonly count: IntakeCount
      readonly limit: number
      readonly given: number
    }
  | { readonly code: "too-often"; readonly limit: number; readonly retryAfterMs: number }

export const describeIntakeVerdict = (verdict: IntakeVerdict): string => {
  if (verdict.code === "admitted") return "admitted"

  if (verdict.code === "too-large") {
    return `a delivery may be ${verdict.limit} bytes and this one was ${verdict.given}`
  }

  return `a sender may deliver ${verdict.limit} times a window and this one has; ${verdict.retryAfterMs}ms left`
}

const freshWindow = (now: number): IntakeCount => ({ deliveries: 1, windowStartedAt: now })

/**
 * Whether this delivery is allowed, given what the subject has already sent.
 *
 * Pure: no clock, no map, no request. `now` and the byte count are handed in,
 * and the answer is a verdict and the count to remember.
 *
 * **The rate is decided before the size.** A caller already over their budget
 * is told so rather than told their body was too big, because the first is the
 * one they can act on and the second would restart their guessing. And an
 * oversized delivery still **spends budget** — a refusal that cost the sender
 * nothing is an endpoint that can be hammered for free.
 *
 * A `now` or a `bytes` that is not a finite number is treated as a fresh window
 * and an unmeasurable body rather than trusted into the arithmetic: both arrive
 * from outside — one from a clock, one from a header a caller wrote.
 */
export const admit = (
  count: IntakeCount | null,
  bytes: number,
  now: number,
  policy: IntakePolicy
): IntakeVerdict => {
  const at = Number.isFinite(now) ? now : 0
  const expired = count === null || at - count.windowStartedAt >= policy.windowMs || at < count.windowStartedAt

  if (!expired && count.deliveries >= policy.deliveries) {
    return {
      code: "too-often",
      limit: policy.deliveries,
      retryAfterMs: Math.max(0, count.windowStartedAt + policy.windowMs - at),
    }
  }

  const spent: IntakeCount = expired
    ? freshWindow(at)
    : { deliveries: count.deliveries + 1, windowStartedAt: count.windowStartedAt }

  /**
   * An unmeasurable body is refused rather than admitted. The only caller that
   * cannot say how large its delivery is, is one that chose not to.
   */
  const given = Number.isFinite(bytes) && bytes >= 0 ? bytes : Number.POSITIVE_INFINITY

  if (given > policy.maxBytes) {
    return { code: "too-large", count: spent, limit: policy.maxBytes, given }
  }

  return { code: "admitted", count: spent }
}

export type IntakeGate = {
  /**
   * The policy this gate counts by.
   *
   * Carried on the gate rather than left beside it, because a caller holding
   * both had two copies that could disagree — and the one that decides is
   * whichever the gate was built with, silently. A door has one policy.
   */
  readonly policy: IntakePolicy
  readonly admit: (subject: string, bytes: number, now: number) => IntakeVerdict
  /** How many subjects are being counted. For a status endpoint, not for a decision. */
  readonly subjects: () => number
}

/**
 * The counter that `admit` decides against.
 *
 * Its state is held inside the closure and changed in place, which is
 * `createSignalLedger`'s arrangement and is here for the same reason: one
 * process's private accumulator, reached by nothing else, constant time per
 * call.
 *
 * **It is memory, and memory on a serverless host is per instance.** A
 * deployment running eight instances tolerates roughly eight times the rate
 * this policy names. That is the same caveat `attempt-log.ts` states about the
 * sign-in throttle, and the answer is the same: a durable counter would mean a
 * database write to decide whether to allow a database write, which is the
 * cost this exists to bound. What must not happen is the limit silently
 * ceasing to apply, and a bounded map that shares a count when it is full is
 * how that is avoided.
 */
export const createIntakeGate = (policy: IntakePolicy = DEFAULT_INTAKE_POLICY): IntakeGate => {
  const counts = new Map<string, IntakeCount>()

  /** Windows that have closed hold nothing anybody is owed, so they are the first to go. */
  const sweep = (now: number): void => {
    for (const [key, count] of counts) {
      if (now - count.windowStartedAt >= policy.windowMs) counts.delete(key)
    }
  }

  const keyFor = (subject: string, now: number): string => {
    if (counts.has(subject) || counts.size < policy.subjects) return subject

    sweep(now)

    return counts.size < policy.subjects ? subject : CROWDED_SUBJECT
  }

  return {
    policy,
    admit: (subject, bytes, now) => {
      const key = keyFor(subject, now)
      const verdict = admit(counts.get(key) ?? null, bytes, now, policy)

      if (verdict.code !== "too-often") counts.set(key, verdict.count)

      return verdict
    },
    subjects: () => counts.size,
  }
}
