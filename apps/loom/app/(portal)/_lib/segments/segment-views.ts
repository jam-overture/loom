import type { AudienceId } from "@jam-overture/loom/store"
import type { ArrivalRange, ReaderTallyStore, StoredArrivals } from "@jam-overture/loom/signals"

/**
 * Each segment's page views over the last 7 days, from the hourly counters
 * every delivery is already filed under by its audience (0284, 0356). Nothing
 * new is counted: a site that names a segment on its signals has its page
 * views kept under that segment's `aud_` id, and this reads them.
 *
 * **None yet is not a nought** (0371 clause 7.1): until the site sorts its
 * readers and names the segment on its signals, nothing has ever been counted
 * under it, which is a different sentence from *nobody in this segment
 * arrived this week*. The read answers both, because the counters say when
 * the scope was first counted whatever range was asked.
 */
export type SegmentViews =
  | { readonly kind: "none-yet" }
  | { readonly kind: "counted"; readonly views: number; readonly begins: number }
  | { readonly kind: "unreadable" }

export const segmentViewsOf = (stored: StoredArrivals): SegmentViews =>
  stored.begins === undefined
    ? { kind: "none-yet" }
    : {
        kind: "counted",
        views: stored.hours.reduce((sum, hour) => sum + hour.views, 0),
        begins: stored.begins,
      }

/** Every segment's page views over the range, read at once; one that does not answer costs only its own figure. */
export const readSegmentViews = async (
  tallies: Pick<ReaderTallyStore, "arrivals">,
  audiences: readonly AudienceId[],
  range: ArrivalRange
): Promise<ReadonlyMap<AudienceId, SegmentViews>> =>
  new Map(
    await Promise.all(
      audiences.map(async (audience): Promise<readonly [AudienceId, SegmentViews]> => {
        const read = await tallies.arrivals({ audience, ...range })

        return [audience, read.ok ? segmentViewsOf(read.value) : { kind: "unreadable" }]
      })
    )
  )

const count = (value: number): string => value.toLocaleString("en-GB")

/** The figure as the list says it. */
export const segmentViewsWords = (views: SegmentViews | undefined): string => {
  switch (views?.kind) {
    case undefined:
    case "unreadable":
      return "Could not be read just now"
    case "none-yet":
      return "None yet"
    case "counted":
      return views.views === 1 ? "1 page view" : `${count(views.views)} page views`
  }
}
