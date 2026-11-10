/** Postgres's `undefined_column`, wherever the driver or the query builder wraps it. */
const UNDEFINED_COLUMN = "42703"

/**
 * Whether a query failed because a column is not there yet: one added after
 * its table went live, on a deployment where `pnpm db:push` has not run since.
 * A store reads around that rather than fail a screen over it. Pure.
 */
export const isMissingColumn = (cause: unknown): boolean =>
  typeof cause === "object" &&
  cause !== null &&
  (("code" in cause && cause.code === UNDEFINED_COLUMN) ||
    ("cause" in cause && isMissingColumn(cause.cause)))
