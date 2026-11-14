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
 * one spelling of a projection that [`frontier.ts`](frontier.ts), the census in
 * [`library-senders.ts`](library-senders.ts) and the comparison in
 * [`library-senders-change.ts`](library-senders-change.ts) all need. Two
 * spellings that agree
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

/**
 * What a placement is, as far as a silent sender can be seen on it.
 *
 * The five states are exclusive and exhaustive over a page's parts, and the
 * order below is the order they are decided in: whether anything stands inside
 * it, then whether anything inside it reported reach, then what it said about
 * itself.
 */
export type SenderState =
  /** Nothing stands inside it, so nothing could ever witness it (0393). */
  | "leaf"
  /** Parts stand inside it and none of them reported reach in this window. */
  | "unwitnessed"
  /** Something below it reported reach, and it reported coming into view itself. */
  | "reporting"
  /** Something below it reported reach and it said nothing, which is the defect (0382). */
  | "silent"
  /**
   * Something below it reported reach and it reported something that was not a
   * view.
   *
   * Plausibly the same defect and never claimed as it, because `unknown` is the
   * absence of a claim (0282).
   */
  | "indeterminate"

/** Whether the defect could be seen at a placement in this state. */
export const witnessedState = (state: SenderState): boolean =>
  state === "reporting" || state === "silent" || state === "indeterminate"

/** One part with what its placement is, which is what a census and a comparison both count. */
export type PartSender = {
  readonly part: PartReading
  readonly state: SenderState
}

const stateOf = (part: PartReading, beneath: number, readBelow: number): SenderState => {
  if (beneath === 0) return "leaf"
  if (readBelow === 0) return "unwitnessed"

  switch (part.standing) {
    case "read":
      return "reporting"
    case "skipped":
      return "silent"
    case "unknown":
      return "indeterminate"
  }
}

/**
 * Each part of a page with the state its placement is in, in one pass.
 *
 * The **one** spelling of 0382's rule — *skipped, with reach reported below it*
 * — shared by the census ([`library-senders.ts`](library-senders.ts)) and by the
 * comparison of two windows
 * ([`library-senders-change.ts`](library-senders-change.ts)). Two spellings of
 * it that agreed today is what this module exists to prevent, and a census and a
 * comparison disagreeing about which placements were silent is the shape of that
 * failure a surface could not notice.
 *
 * Carries the part rather than an index, so that neither caller reads a parallel
 * array back by position.
 */
export const senderStatesOf = (parts: readonly PartReading[]): readonly PartSender[] => {
  const { ends } = extentsOf(parts)
  const reads = prefixOf(parts, "read")

  return parts.map((part, at) => {
    const end = ends[at] ?? parts.length

    return { part, state: stateOf(part, end - at - 1, between(reads, at + 1, end)) }
  })
}
