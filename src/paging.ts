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

/**
 * Which end of an append-only sequence a page is taken from.
 *
 * A log only grows, so the question asked of one most often is "what happened
 * recently" — and forward-only paging answers that by reading everything that
 * ever happened first. `older` starts at the newest position and walks back,
 * which is one index seek rather than a walk from the beginning.
 */
export type PageDirection = "newer" | "older"

/**
 * The two ends a page names: cursors to resume from in either direction, `null`
 * when the page already reaches that end.
 *
 * `newer: null` is a weaker claim than `older: null`. The oldest position in a
 * log is a fact; the newest is only true at the time of the read, because the
 * log is still being appended to.
 */
export type PageEnds = {
  readonly older: string | null
  readonly newer: string | null
}

/**
 * The ends a page reports, given the positions it holds and what the read
 * already knows.
 *
 * Shared by every implementation of every paged log, because "which ends does
 * this page name" is a property of keyset paging rather than of a backend or of
 * what is being paged. `beyond` is what the limit+1 probe found on the side
 * being paged toward; the far side is bounded by the cursor the caller passed,
 * since a position it named is a position records exist at.
 *
 * `positions` is in the page's own ascending order, whichever end it came from.
 */
export const pageEnds = (
  positions: readonly number[],
  direction: PageDirection,
  { beyond, resumed }: { readonly beyond: boolean; readonly resumed: boolean }
): PageEnds => {
  const first = positions.at(0)
  const last = positions.at(-1)

  if (first === undefined || last === undefined) return { older: null, newer: null }

  return direction === "older"
    ? { older: beyond ? String(first) : null, newer: resumed ? String(last) : null }
    : { older: resumed ? String(first) : null, newer: beyond ? String(last) : null }
}

/**
 * Reads a cursor back into the position it names. A cursor is opaque to the
 * caller, so one that is absent or unreadable means the same thing to every
 * implementation — start at the end the direction begins from — rather than one
 * refusing what another silently accepts.
 */
export const cursorPosition = (cursor: string | undefined): number | undefined => {
  /** `Number("")` is 0, and an empty cursor is an absent one rather than the start. */
  if (cursor === undefined || cursor.trim() === "") return undefined

  const position = Number(cursor)

  return Number.isFinite(position) ? position : undefined
}
