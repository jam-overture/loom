import type { PartReading, PartStanding } from "./parts.js"

/**
 * The shape of a page's parts, as three projections every reading of the
 * frontier needs and none of them should spell twice.
 *
 * A reading of a page is a pre-order list of addressed nodes carrying a depth
 * ([`parts.ts`](parts.ts)), so *what is inside this part* is a contiguous run
 * and *what did the readers below it report* is a difference of two prefix
 * counts. Both are one pass over the page and neither walks a part's ancestors,
 * which is the quadratic shape rule 4 of
 * [`docs/signals.md`](../../docs/signals.md) keeps out of these readings.
 *
 * **Internal to `src/signals/`, and deliberately not re-exported from
 * [`index.ts`](index.ts).** It publishes no answer about a deployment; it is the
 * one spelling of a projection that [`frontier.ts`](frontier.ts) and
 * [`library-senders.ts`](library-senders.ts) both need. Two spellings that agree
 * today are how the two came to disagree about which parts a reader was below
 * — the failure `parts.ts` names about `spokenFor` and the counter keys.
 *
 * Pure: no store, no clock, no DOM, and nothing here survives into a browser
 * bundle.
 */

/** Where each part sits, from one pre-order pass over a stack of open parts. */
export type PartExtents = {
  /**
   * The index of the part each part sits inside, and `null` at an outermost
   * part.
   *
   * Taken by index rather than by id so that a container's standing is read off
   * the row itself. An id would be a second place where two parts sharing one —
   * which a tree does not do, and which a reading cannot check — became a wrong
   * answer instead of an impossible one.
   */
  readonly containers: readonly (number | null)[]
  /** The exclusive end of each part's subtree; `parts.length` for a part the page ends inside. */
  readonly ends: readonly number[]
}

/** Each part's container and the end of its subtree, in one pass. */
export const extentsOf = (parts: readonly PartReading[]): PartExtents => {
  const total = parts.length
  const containers: (number | null)[] = []
  const ends: number[] = new Array<number>(total).fill(total)
  const open: number[] = []

  for (const [at, part] of parts.entries()) {
    for (;;) {
      const top = open.at(-1)
      if (top === undefined) break

      const above = parts[top]
      if (above === undefined || above.depth < part.depth) break

      ends[top] = at
      open.pop()
    }

    containers.push(open.at(-1) ?? null)
    open.push(at)
  }

  return { containers, ends }
}

/** Prefix counts, so a subtree's standings are two subtractions rather than a scan. */
export const prefixOf = (
  parts: readonly PartReading[],
  standing: PartStanding
): readonly number[] => {
  const counts: number[] = [0]

  for (const part of parts) counts.push((counts.at(-1) ?? 0) + (part.standing === standing ? 1 : 0))

  return counts
}

/** The count over the half-open range `[from, to)` of a prefix built by {@link prefixOf}. */
export const between = (counts: readonly number[], from: number, to: number): number =>
  (counts[to] ?? 0) - (counts[from] ?? 0)
