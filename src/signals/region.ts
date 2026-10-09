import { z } from "zod"

import type { TreeId } from "../ids.js"
import type { Result } from "../result.js"

import type { ReaderSignalStoreError } from "./journal.js"
import type { RevisionOf, RevisionViews } from "./page-views.js"
import type { TallyReadRequest } from "./tally.js"

/**
 * Where readers are, as a counter and nothing else.
 *
 * A coarse region is the one fact about a reader that a deployment can know
 * without the browser ever being told it is being measured: the request arrived
 * from somewhere, and the platform in front of the application already wrote
 * that down in a header. Nothing is added to a batch, nothing is asked of the
 * page, and the address the region was read from is never stored.
 *
 * Three refusals hold the shape, and they are the design rather than caveats on
 * it:
 *
 * - **It lands on a counter, never on a buffered batch.** A region beside a
 *   view key on a raw row is the beginning of a profile — one row saying *this
 *   page view came from here* — and the only thing stopping it becoming one
 *   would be that nobody got round to joining the two. So the region is counted
 *   at the door and the raw row never carries it.
 * - **A bucket is reported only once it is too large to be a person.** A country
 *   with a handful of views in it is a reader, not a readership. The floor is a
 *   number this module owns, a deployment may raise it and may not lower it, and
 *   what it suppresses is still *counted* — a reading says how many views it is
 *   withholding, so the total stays true while the attribution does not exist.
 * - **One page view is one view.** Counting deliveries instead would be the
 *   quiet failure: a reader who stays ten minutes posts a hundred batches, so a
 *   single person would clear any floor on their own and the protection would
 *   invert. A batch says whether it opened its page view, and only those count.
 *
 * The exactness is worth naming, because the per-node counters do not have it.
 * `views` on a tally counts distinct page views inside a rollup window and is
 * added to the next window's, so a view that straddles the boundary is counted
 * twice (0147). A region view is counted once, at the moment a page view began,
 * and is never recounted — so these numbers add across revisions, across trees
 * and across months without drifting.
 */

/** The sentinel, before it is a region. The schema below is what makes it one. */
const UNKNOWN = "unknown"

/**
 * A region nobody can name.
 *
 * A deployment behind a proxy that adds no such header, a request from a
 * development machine, a header holding something that is not a country code —
 * all of them are this, and it is a bucket rather than a dropped row. *We do
 * not know where 40 of these views came from* is a fact about the measurement;
 * silently keeping only the views that could be placed is a figure that looks
 * complete and is not.
 *
 * Seven characters, so it can never collide with a two-letter code.
 */
export const UNKNOWN_REGION = UNKNOWN as ReaderRegion

/** Two uppercase letters, which is what a country code is. */
export const regionPattern = /^[A-Z]{2}$/

/**
 * A country, or the admission that there is none.
 *
 * Deliberately no narrower. A subdivision or a city is the step from *where our
 * readers are* to *who that reader was* — a city plus a count of two is a
 * person with an address — and the header carrying one is sitting beside the
 * header this reads. It is not read.
 *
 * Deliberately no wider either: the value becomes a column, and a column fed
 * from a request header is a column a caller can write to. Two letters or the
 * one sentinel is a closed set, so the worst a poisoned header can do is add to
 * a bucket that already exists.
 */
export const readerRegionSchema = z
  .union([z.literal(UNKNOWN), z.string().regex(regionPattern)])
  .brand<"ReaderRegion">()

export type ReaderRegion = z.infer<typeof readerRegionSchema>

/**
 * Read a region off whatever the platform wrote, and never fail.
 *
 * Trimmed and upper-cased because headers are written by whoever is in front of
 * the application and casing is not a thing to have an opinion about. Anything
 * that is not a country code — absent, empty, a city, a word, the Tor marker
 * some platforms send — is unplaced rather than refused: this runs on the
 * request path of the one public write endpoint, and a region that cannot be
 * read is a bucket, not an error.
 */
export const readerRegionOf = (given: string | null | undefined): ReaderRegion => {
  if (given === null || given === undefined) return UNKNOWN_REGION

  const code = given.trim().toUpperCase()

  return regionPattern.test(code) ? (code as ReaderRegion) : UNKNOWN_REGION
}

/**
 * Page views from one region, of one revision of one tree.
 *
 * Keyed the way every durable counter in this subsystem is keyed — a signal
 * about the fourth section means nothing once a proposal has moved it — so a
 * region's number is answerable before and after a change rather than smeared
 * across both.
 */
export type ReaderRegionCount = {
  readonly treeId: TreeId
  readonly revision: number
  readonly region: ReaderRegion
  /** Page views that *began* here, so a longer visit is not a bigger number. */
  readonly views: number
}

/** A region count as the store keeps it, which is the count plus when it last moved. */
export type StoredRegionCount = ReaderRegionCount & {
  readonly updatedAt: string
}

/**
 * The durable half, and the only one there is — a region has no raw form to
 * expire, because it was never written down as an observation.
 *
 * Written by the intake, on the request path, which is what distinguishes this
 * from the per-node counters: those are written by a rollup over a window, and
 * a region cannot be, because by then the request it was read from is gone.
 */
export interface ReaderRegionStore {
  /**
   * Add views to the buckets they belong in, creating rows that do not exist
   * yet. Additive for the same reason applying a rollup is: every call reports
   * what just arrived rather than what is true so far.
   */
  readonly count: (
    counts: readonly ReaderRegionCount[],
    at: string
  ) => Promise<Result<void, ReaderSignalStoreError>>
  readonly regions: (
    request?: TallyReadRequest
  ) => Promise<Result<readonly StoredRegionCount[], ReaderSignalStoreError>>
}

/**
 * What one delivery adds, which is one view per page view it opened.
 *
 * **It is handed the openings rather than the delivery**, so that a region can
 * only ever be a stamp on a page view somebody already counted. The walk that
 * finds them, and the deduplication that makes a retried opening one arrival
 * rather than two, is `openingsOf` in `page-views.ts` — shared deliberately,
 * because two counters that each decided for themselves how many readers
 * arrived would sooner or later disagree about it, and the disagreement would
 * surface as a map whose numbers do not add up to the number of page views
 * there were.
 *
 * A delivery that opened nothing adds nothing, and a sender that never says
 * adds nothing at all — which is the honest answer for a batch synthesised on a
 * server or replayed from a fixture, exactly as such a batch adds nothing to
 * any view count.
 */
export const regionCountsOf = (
  openings: readonly RevisionViews[],
  region: ReaderRegion
): readonly ReaderRegionCount[] =>
  openings.map(({ treeId, revision, views }) => ({ treeId, revision, region, views }))

/**
 * The smallest a bucket may be before it is named.
 *
 * Twenty-five, and the number is a judgement rather than a derivation: it is
 * low enough that a deployment with a few hundred readers sees its own map, and
 * high enough that no bucket is one person, one household or one office. A
 * deployment that wants more caution raises it.
 *
 * It is not lowerable, and that is the one place this subsystem overrides an
 * operator. The floor is what makes the aggregate an aggregate; a deployment
 * that could set it to one would be running a different product, and the
 * difference would be invisible on the screen that showed the result.
 */
export const DEFAULT_REGION_FLOOR = 25

/**
 * The floor that will actually be used, given what somebody asked for.
 *
 * Raise-only, and anything that is not a whole number of views is the default —
 * a floor read from configuration is read from a string somebody typed, and the
 * direction to be wrong in is the cautious one.
 */
export const regionFloorOf = (asked: number | undefined): number =>
  asked === undefined || !Number.isInteger(asked) ? DEFAULT_REGION_FLOOR : Math.max(DEFAULT_REGION_FLOOR, asked)

/** One region, as a reading reports it. */
export type RegionBucket = {
  readonly region: ReaderRegion
  readonly views: number
}

export type RegionReading = {
  /** The floor the rows were read at, so a screen can say what it is withholding by. */
  readonly floor: number
  /** Buckets large enough to name, most-read first. */
  readonly regions: readonly RegionBucket[]
  /** What was too small to name, as a total that names nowhere. */
  readonly withheld: {
    readonly buckets: number
    readonly views: number
  }
  /** Every view in the rows, named or withheld. A reading never loses one. */
  readonly views: number
}

export type RegionReadingOptions = {
  /** Raised above {@link DEFAULT_REGION_FLOOR}; a smaller number is the default.  */
  readonly floor?: number
}

/**
 * Rows from the store, read as something a screen may show.
 *
 * **Grouped before it is suppressed, and the order matters.** Ten views of one
 * revision and twenty of the next are thirty views of one country, which is a
 * readership; suppressing each revision first would withhold both and report a
 * map of nowhere. A caller asking about one revision filters at the store,
 * where the filter belongs.
 *
 * **The unplaced bucket is never withheld**, however small it is. It names no
 * place, so there is nobody in it to re-identify, and hiding it would mean a
 * reading whose numbers do not add up to the number of views there were.
 */
export const regionReadingOf = (
  rows: readonly StoredRegionCount[],
  options: RegionReadingOptions = {}
): RegionReading => {
  const floor = regionFloorOf(options.floor)
  const grouped = new Map<ReaderRegion, number>()

  for (const row of rows) {
    grouped.set(row.region, (grouped.get(row.region) ?? 0) + row.views)
  }

  const buckets = [...grouped.entries()].map(([region, views]) => ({ region, views }))
  const nameable = (bucket: RegionBucket): boolean =>
    bucket.region === UNKNOWN_REGION || bucket.views >= floor
  const named = buckets.filter(nameable)
  const small = buckets.filter((bucket) => !nameable(bucket))

  return {
    floor,
    /** Most-read first, and by code when two are equal, so a screen does not reorder on a refresh. */
    regions: named.sort((one, other) => other.views - one.views || one.region.localeCompare(other.region)),
    withheld: {
      buckets: small.length,
      views: small.reduce((total, bucket) => total + bucket.views, 0),
    },
    views: buckets.reduce((total, bucket) => total + bucket.views, 0),
  }
}

/**
 * One revision's region rows, read as a map, without the caller writing the
 * filter.
 *
 * The same shape and the same reason as `pageViewsFor` in
 * [`page-views.ts`](page-views.ts): the matching is the part of every join in
 * this subsystem that fails quietly when it is got wrong, and a comparison of
 * two revisions' readerships is the first thing here that has to do it twice in
 * one call. Reading one revision's map against another revision's rows would
 * answer confidently and be about nothing.
 *
 * **Filtered before it is floored, which is the half that is not obvious.**
 * {@link regionReadingOf} groups across whatever it is handed, because thirty
 * views of one country spread over two revisions are a readership and
 * suppressing each revision first would withhold both. A caller asking about
 * one revision is asking a narrower question and gets a narrower answer: the
 * floor bites harder per revision than it does across a deployment, so a quiet
 * page reports more of itself as withheld. That is the floor working rather
 * than a fault, and it is why a readership comparison is answerable on a page
 * with traffic and says so on a page without.
 */
export type RegionReadingFor = {
  /** The revision's own map, floored. */
  readonly reading: RegionReading
  /**
   * Rows for another tree or another revision, and ignored.
   *
   * Counting another revision's arrivals into this one's map is the mistake
   * that would make a readership comparison compare a revision with itself.
   */
  readonly foreign: number
  /**
   * Rows naming a region this revision already had a row for, beyond the first,
   * every one of which was ignored.
   *
   * A store keeps one row per tree, revision and region, so this cannot come
   * out of one read — it happens when a caller concatenates two windows of
   * rows, and the store's counts are already running totals rather than a
   * window's. Adding them would double a bucket, which is the one error in this
   * subsystem that cannot be undone afterwards (0158), so the first row stands
   * and the fact is reported.
   */
  readonly duplicated: number
}

/**
 * Pick one revision's region rows out of a set of them and read them.
 *
 * Linear in the rows, with one pass and one map.
 */
export const regionReadingFor = (
  where: RevisionOf,
  rows: readonly StoredRegionCount[],
  options: RegionReadingOptions = {}
): RegionReadingFor => {
  const matching = rows.filter(
    (row) => row.treeId === where.treeId && row.revision === where.revision
  )
  const first = new Map<ReaderRegion, StoredRegionCount>()

  for (const row of matching) {
    if (!first.has(row.region)) first.set(row.region, row)
  }

  return {
    reading: regionReadingOf([...first.values()], options),
    foreign: rows.length - matching.length,
    duplicated: matching.length - first.size,
  }
}
