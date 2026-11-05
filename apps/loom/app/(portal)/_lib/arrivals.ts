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
 * - **The journal**, which keeps each delivery for the deployment's window,
 *   thirty days by default (0349, 0351). It is read for the newest delivery
 *   only; *Events* lists the rest.
 *
 * **When the last one came** has two answers depending on which of the two is
 * holding it, and they are kept apart. A kept delivery carries the instant
 * this deployment received it, which is exact. A page-view row carries
 * when it last moved, which the door writes on arrival and the collection
 * writes again when it counts, so it is *at or after* the last arrival and is
 * said as *last counted*. A screen that called the second an arrival would be
 * wrong by however long collection waited.
 */

export type Latest =
  | { readonly kind: "arrived"; readonly at: string }
  | { readonly kind: "counted"; readonly at: string }

export type Arrivals = {
  /** Page views counted across every page and version. */
  readonly opened: number
  /** `undefined` where nothing has ever arrived. */
  readonly latest: Latest | undefined
}

const later = (a: string, b: string): string => (a >= b ? a : b)

/**
 * Everything the screen says, from the page-view rows and the newest page of
 * the journal, in whatever order the journal returns it.
 */
export const arrivalsOf = (
  rows: readonly StoredPageViews[],
  newest: readonly ReceivedBatch[]
): Arrivals => {
  const arrived = newest.reduce<ReceivedBatch | undefined>(
    (latest, batch) => (latest === undefined || batch.seq > latest.seq ? batch : latest),
    undefined
  )?.receivedAt
  const counted = rows.reduce<string | undefined>(
    (latest, row) => (latest === undefined ? row.updatedAt : later(latest, row.updatedAt)),
    undefined
  )

  return {
    opened: rows.reduce((sum, row) => sum + row.opened, 0),
    latest:
      arrived !== undefined
        ? { kind: "arrived", at: arrived }
        : counted !== undefined
          ? { kind: "counted", at: counted }
          : undefined,
  }
}
