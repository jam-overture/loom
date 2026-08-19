/**
 * How many model calls a public demo may make.
 *
 * The demo is reachable without signing in, and free text goes to a paid API on
 * the maintainer's key. An unbounded button on a public URL is a bill somebody
 * else writes, so the budget is part of the surface rather than something to add
 * after the first bad week.
 *
 * A token bucket rather than a fixed count, because the failure being prevented
 * is a burst and the behaviour wanted afterwards is recovery: a demo that spent
 * its allowance on Tuesday should work again on Wednesday without a deploy.
 *
 * Pure — state in, state out — so the policy is testable without a clock, a
 * request, or a key. The caller owns where the state lives.
 */

export type Bucket = {
  readonly tokens: number
  readonly refilledAt: number
}

export type BucketLimits = {
  readonly capacity: number
  /** How long one token takes to come back, in milliseconds. */
  readonly refillMs: number
}

export const fullBucket = (limits: BucketLimits, now: number): Bucket => ({
  tokens: limits.capacity,
  refilledAt: now,
})

const refilled = (bucket: Bucket, limits: BucketLimits, now: number): Bucket => {
  const elapsed = Math.max(now - bucket.refilledAt, 0)
  const earned = Math.floor(elapsed / limits.refillMs)

  if (earned === 0) return bucket

  return {
    tokens: Math.min(bucket.tokens + earned, limits.capacity),
    refilledAt: bucket.refilledAt + earned * limits.refillMs,
  }
}

export type Spend = {
  readonly allowed: boolean
  readonly bucket: Bucket
  /** When the next token arrives, for a surface that would rather say so. */
  readonly nextTokenAt: number
}

export const spendToken = (bucket: Bucket, limits: BucketLimits, now: number): Spend => {
  const current = refilled(bucket, limits, now)

  if (current.tokens <= 0) {
    return { allowed: false, bucket: current, nextTokenAt: current.refilledAt + limits.refillMs }
  }

  const spent = { tokens: current.tokens - 1, refilledAt: current.refilledAt }

  return { allowed: true, bucket: spent, nextTokenAt: spent.refilledAt + limits.refillMs }
}

/** One visitor's allowance: enough to explore, not enough to mine. */
export const PER_SESSION_MODEL_CALLS: BucketLimits = { capacity: 8, refillMs: 60_000 }

/** And the instance's, so minting sessions is not a way around the first one. */
export const PER_INSTANCE_MODEL_CALLS: BucketLimits = { capacity: 60, refillMs: 60_000 }
