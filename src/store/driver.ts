/**
 * The two things every Postgres-backed store has to do with a driver's error.
 *
 * Shared rather than repeated, because both are answers to questions about the
 * *driver* rather than about the store using it: what Postgres calls a duplicate
 * key, and how much of a thrown thing is safe to put in a message. A second copy
 * would be a second chance to get the `cause` walk subtly wrong, and the failure
 * mode of getting it wrong is silent — a collision reported as an outage.
 */

const UNIQUE_VIOLATION = "23505"

/**
 * Postgres reports a primary-key collision as SQLSTATE 23505, but Drizzle wraps
 * the driver's error, so the code sits somewhere down the `cause` chain rather
 * than on the error that was thrown. Walking the chain is what makes this work
 * across drivers instead of against whichever one was tested first.
 */
export const isUniqueViolation = (cause: unknown): boolean => {
  for (let current = cause, depth = 0; current !== null && current !== undefined && depth < 8; depth++) {
    if (typeof current !== "object") return false
    if ((current as { code?: unknown }).code === UNIQUE_VIOLATION) return true

    current = (current as { cause?: unknown }).cause
  }

  return false
}

/**
 * An outage, said in terms of what was being attempted.
 *
 * Generic in the error type because `StoreError` and `HoldError` are separate
 * taxonomies that happen to agree on this one member, and they should stay
 * separate: they are refusals of different things, and a store that could return
 * either would be a store whose callers have to handle both.
 */
export const unavailable = (
  cause: unknown,
  detail: string
): { readonly code: "unavailable"; readonly detail: string } => ({
  code: "unavailable",
  detail: `${detail}: ${cause instanceof Error ? cause.message : String(cause)}`,
})
