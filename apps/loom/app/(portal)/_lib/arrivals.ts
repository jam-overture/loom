import type { ReceivedBatch, StoredPageViews } from "@jam-overture/loom/signals"

/**
 * What a project's *Signals* screen says about what has arrived, as a function
 * of the two things that hold it.
 *
 * Unit 5 of `docs/portal.md`: *one screen shows them arriving*. Everything it
 * says is read off rows this deployment already keeps for the project's one
 * application, and nothing here is a new count:
 *
 * - **The page-view rows**, which the door writes on every delivery that
 *   opened a page view (0219). They are durable, and `opened` is the one
 *   figure in the subsystem that adds across revisions and months, so it is the
 *   number this screen leads with.
 * - **The buffer**, which holds what arrived and has not been collected yet
 *   (0146). It is short-lived by design and emptied by every collection, so it
 *   is read only for the newest arrivals — the rows a person watches to see a
 *   signal they just sent land.
 *
 * **When the last one came** has two answers depending on which of the two is
 * holding it, and they are kept apart. A batch in the buffer carries the
 * instant this deployment received it, which is exact. A page-view row carries
 * when it last moved, which the door writes on arrival and the collection
 * writes again when it counts, so it is *at or after* the last arrival and is
 * said as *last counted*. A screen that called the second an arrival would be
 * wrong by however long collection waited.
 */

/** One batch the buffer is still holding. */
export type RecentArrival = {
  readonly treeId: string
  readonly revision: number
  readonly receivedAt: string
  /** How many signals the batch carried. A batch can carry none and still open a page view. */
  readonly signals: number
}

export type Latest =
  | { readonly kind: "arrived"; readonly at: string }
  | { readonly kind: "counted"; readonly at: string }

export type Arrivals = {
  /** Page views counted across every page and version. */
  readonly opened: number
  /** Newest first. */
  readonly recent: readonly RecentArrival[]
  /** `undefined` where nothing has ever arrived. */
  readonly latest: Latest | undefined
}

const later = (a: string, b: string): string => (a >= b ? a : b)

/**
 * Everything the screen says, from the page-view rows and the newest page of
 * the buffer.
 *
 * `newest` is a page of the buffer in whatever order the journal returns it —
 * ascending by arrival, always — and this turns it round, because the person
 * reading wants the batch they sent a moment ago at the top.
 */
export const arrivalsOf = (
  rows: readonly StoredPageViews[],
  newest: readonly ReceivedBatch[]
): Arrivals => {
  const recent = [...newest]
    .sort((a, b) => b.seq - a.seq)
    .map((batch) => ({
      treeId: batch.treeId,
      revision: batch.revision,
      receivedAt: batch.receivedAt,
      signals: batch.signals.length,
    }))

  const arrived = recent[0]?.receivedAt
  const counted = rows.reduce<string | undefined>(
    (latest, row) => (latest === undefined ? row.updatedAt : later(latest, row.updatedAt)),
    undefined
  )

  return {
    opened: rows.reduce((sum, row) => sum + row.opened, 0),
    recent,
    latest:
      arrived !== undefined
        ? { kind: "arrived", at: arrived }
        : counted !== undefined
          ? { kind: "counted", at: counted }
          : undefined,
  }
}
