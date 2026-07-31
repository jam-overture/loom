/**
 * Keyset paging, as a rule rather than a convention.
 *
 * Every listing in Loom is a page with an opaque cursor, and every one of them
 * clamps the limit it was asked for — otherwise a caller can ask a store for
 * everything it holds by omitting the limit or naming a large one. The bounds
 * differ by what is being listed; the clamping rule does not, so it is written
 * once here and the bounds are what each caller supplies.
 */

export type LimitBounds = {
  /** Used when the caller named no limit, or named one that is not a number. */
  readonly fallback: number
  readonly max: number
}

export const clampLimit = (limit: number | undefined, bounds: LimitBounds): number => {
  if (limit === undefined || !Number.isFinite(limit)) return bounds.fallback

  return Math.min(bounds.max, Math.max(1, Math.floor(limit)))
}
