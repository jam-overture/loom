import { everyMemberOf } from "../closed-set.js"

import type { ReaderRegion, RegionReading } from "./region.js"
import { UNKNOWN_REGION } from "./region.js"

/**
 * Whether two windows of a page were read by the same readership.
 *
 * Four readings in this subsystem compare two revisions — where the reading
 * stops ([`change.ts`](change.ts)), the words a change put in front of readers
 * ([`copy-change.ts`](copy-change.ts)), how much of a page gets read, and what
 * readers did in it — and every one of them attributes the difference to the
 * change. Each is careful about the arithmetic and none of them can see the one
 * thing that would make the attribution wrong: **the readers were not the same
 * people.** A page that was read by its home market in March and by a
 * conference audience in April got better or worse for a reason no tree
 * contains.
 *
 * Region is the only thing Loom knows about who a reader was, and it was built
 * to be a map rather than an answer (0214). So this is the map asked a
 * question: *the two windows were read by the same mix of places, so the
 * comparison beside this one is comparing like with like* — or the other
 * sentence, which is the valuable one.
 *
 * It is the eleventh thing taken out of what this subsystem already knows
 * rather than collected: **nothing is added to a payload, a browser, a column,
 * a store or the vocabulary of kinds**, and the broadcaster is not touched.
 *
 * ## It takes two readings, and that is the whole privacy design
 *
 * A region bucket is reported only once it is too large to be a person (0214),
 * and a comparison is a second place that could give a small bucket away. *This
 * country had forty readers and now has a figure we are withholding* says there
 * are between one and twenty-four people in it, which is narrower than the
 * floor promises and would be a leak out of the one subsystem that cannot
 * afford one.
 *
 * So this takes two {@link RegionReading}s rather than two sets of rows, and
 * the property that follows is structural rather than careful: **a figure
 * appears here only where the floored reading it came from already published
 * it.** The comparison cannot disclose more than the two maps it is built from,
 * because it never sees more.
 *
 * The cost is one conflation and it is deliberate. A region named before and
 * unnamed now has either emptied or fallen under the floor, and this cannot
 * tell which — both are {@link RegionMovement} `thinned`. Separating them would
 * be the leak again, said in two words instead of a number: nought names
 * nobody, and one to twenty-four names somebody.
 *
 * The bucket that names nowhere is the one exception, and it is an exception
 * for the same reason: it is never withheld, so its absence from a map is
 * exactly nought rather than a withholding, and it is compared like a figure
 * that was published. Without that, a platform that stopped placing its
 * arrivals would read as the countries it drained having lost their readers.
 *
 * ## The counts are exact and are still not a trend
 *
 * Every other comparison here refuses counts, because two revisions are two
 * windows of two trees read by two sets of readers and nothing divides out
 * (0224). A region count is the one counter in this subsystem that is exact —
 * stamped once, when a page view began, never recounted, and therefore addable
 * across revisions and months (0214, 0219).
 *
 * It still is not a trend, for a different reason and a worse one. **A region
 * counter has no window.** It is a running total per revision with nothing but
 * an `updatedAt` on it, so a revision that has been live a month is compared
 * against one that has been live a day, and the larger number is mostly the
 * larger exposure. {@link ReadershipChange.arrivals} is therefore published as
 * the weight behind the mix — *this moved among six hundred readers rather than
 * six* — and no growth ratio is published at all, because the one anybody would
 * quote would be a measurement of how long each revision had been up.
 *
 * The **mix** survives that, which is why it is the figure here: a composition
 * is roughly the same over a day and over a month of the same audience, where a
 * count is not.
 *
 * ## What `moved` is, and why there are two of it
 *
 * Half the sum of the absolute share movements, over the regions both maps
 * name — the share of readers who would have to be somewhere else for the two
 * windows to have the same mix. 0 is the same readership, 1 is two readerships
 * with no country in common.
 *
 * It is a **floor**, because the regions one map names and the other withholds
 * contribute a term nobody can evaluate, and every such term is at least
 * nothing. {@link ReadershipChange.movedAtMost} adds the whole unaccounted
 * share of both sides, which is the most those terms can come to. Where the
 * floor withholds little the two numbers are nearly one number; where a page is
 * quiet they open wide and {@link ReadershipComparability} `unsettled` is the
 * honest answer rather than a verdict.
 *
 * Pure, linear in the buckets, and it reaches no store, clock or DOM.
 */

/**
 * How much of a readership has to move before a comparison of two windows is
 * not comparing like with like.
 *
 * A tenth: one reader in ten would have to be somewhere else. It is a
 * judgement, like every threshold in this subsystem, and it is **published and
 * not overridable** for the reason the pace thresholds are (0218, 0230) — how
 * much margin a claim needs is the framework's promise about its own
 * confidence, where the words a page's readers get through in a minute is a
 * fact about that page's text. A surface that wants a different line draws it
 * on {@link ReadershipChange.moved}, which is published for exactly that.
 */
export const READERSHIP_SHIFTED_ABOVE = 0.1

/**
 * What happened to one region between the two windows.
 *
 * Three of the five compare two figures and two of them report that there is
 * only one figure to have. No threshold decides between `grew`, `shrank` and
 * `steady`: a region count is exact, so a difference of one view is a
 * difference of one view, and the one-reader tests the other comparisons here
 * need (0224) have nothing to do.
 *
 * The bucket that names nowhere is never `thickened` or `thinned`, because it
 * is never withheld: a map without one placed every arrival it counted, so its
 * absence is a nought that can be compared.
 */
export type RegionMovement =
  /** Named in both windows, and more views in the later one. */
  | "grew"
  /** Named in both windows, and fewer views in the later one. */
  | "shrank"
  /** Named in both windows, and exactly as many views. */
  | "steady"
  /**
   * Unnamed in the earlier window and named in the later one.
   *
   * Either it had nobody or it had too few to name, and which is not said.
   */
  | "thickened"
  /**
   * Named in the earlier window and unnamed in the later one.
   *
   * The same conflation the other way round, and the one worth being clear
   * about: this is **not** *the readers from this country stopped coming*. It
   * is *there are no longer enough of them to say*, which includes none of
   * them and includes nearly enough of them.
   */
  | "thinned"

export const REGION_MOVEMENTS: readonly RegionMovement[] = everyMemberOf<RegionMovement>()([
  "grew",
  "shrank",
  "steady",
  "thickened",
  "thinned",
])

/** One line per movement, for a surface putting the comparison in front of a person. */
export const describeRegionMovement = (movement: RegionMovement): string => {
  switch (movement) {
    case "grew":
      return "More page views began here than before."
    case "shrank":
      return "Fewer page views began here than before."
    case "steady":
      return "Exactly as many page views began here as before."
    case "thickened":
      return "Too few page views began here to name before, and enough now."
    case "thinned":
      return "Enough page views began here to name before, and too few now."
  }
}

/** What one window's map said about one region, where it said anything. */
export type RegionSide = {
  /** Page views that began here, or `undefined` where the floor withheld the bucket. */
  readonly views: number | undefined
  /**
   * {@link views} over every view in that window, named and withheld, or
   * `undefined` with it.
   *
   * The denominator is the window's whole total rather than its named buckets,
   * so the shares of a map sum to below 1 by exactly what the floor is holding
   * back. Normalising over the named buckets would make a quiet window's shares
   * add to 1 and read as a complete picture of nothing.
   */
  readonly share: number | undefined
}

/** One region, as the two windows' maps have it. */
export type ComparedRegion = {
  readonly region: ReaderRegion
  readonly was: RegionSide
  readonly now: RegionSide
  readonly movement: RegionMovement
  /**
   * `now.share − was.share`, or `undefined` where either window withheld the
   * bucket.
   *
   * Signed, and the terms this is summed into are what
   * {@link ReadershipChange.moved} is. A row with no shift is a row that is
   * counted in the unaccounted share instead, which is the same fact said as a
   * bound rather than as a figure.
   */
  readonly shift: number | undefined
  /**
   * `now.views − was.views`, or `undefined` where either window withheld the
   * bucket.
   *
   * Exact where it is published, and still not a trend: the two windows are two
   * revisions' running totals and were not up for the same length of time.
   */
  readonly change: number | undefined
}

/**
 * Whether the comparison beside this one is comparing like with like.
 *
 * Six members, and four of them are answers. There is no silence vocabulary
 * here for the reason a reading of what readers did needs none (0242): every
 * state in which a figure is missing is one of these, so a withheld `moved` and
 * a standing can never disagree about why.
 */
export type ReadershipComparability =
  /**
   * The mix cannot have moved far enough to matter — `movedAtMost` is under the
   * line, so the withheld buckets cannot carry it over.
   */
  | "like-for-like"
  /** The mix moved, and the region that moved most is a place. */
  | "shifted"
  /**
   * The mix moved, and the region that moved most is the bucket that names
   * nowhere.
   *
   * Worth its own member because it is almost never a fact about readers. The
   * unplaced bucket is what the platform in front of the application did not
   * say (0214), so a swing in it is a proxy changed, a header dropped or a CDN
   * rerouted — a change in the measurement rather than in the readership, and a
   * surface that called it an audience shift would send somebody looking for
   * the wrong thing.
   */
  | "unplaced"
  /**
   * `moved` is under the line and `movedAtMost` is over it: the floor is
   * withholding enough that the question cannot be answered either way.
   *
   * The ordinary state of a quiet page, and a correct answer rather than a
   * fault. A deployment that wants it settled needs more readers, not a smaller
   * floor.
   */
  | "unsettled"
  /** One of the two windows counted no page views at all, so there is no mix to compare. */
  | "unmeasured"
  /**
   * The two maps were floored differently, so nothing was compared.
   *
   * A bucket named in one and withheld in the other would then be an artefact
   * of the two floors rather than a movement of readers, and every figure built
   * on it would inherit that. Read both sides at the same floor — the higher of
   * the two, since a floor is raise-only.
   */
  | "incomparable"

export const READERSHIP_COMPARABILITIES: readonly ReadershipComparability[] =
  everyMemberOf<ReadershipComparability>()([
    "like-for-like",
    "shifted",
    "unplaced",
    "unsettled",
    "unmeasured",
    "incomparable",
  ])

/** One line per standing, for a surface putting the comparison in front of a person. */
export const describeReadershipComparability = (
  comparability: ReadershipComparability
): string => {
  switch (comparability) {
    case "like-for-like":
      return "The two windows were read by much the same mix of places."
    case "shifted":
      return "The two windows were read by different mixes of places."
    case "unplaced":
      return "What moved is the share of readers the platform could not place, which is a change in the measurement rather than in the readership."
    case "unsettled":
      return "Too many buckets are below the floor to say whether the mix moved."
    case "unmeasured":
      return "One of the two windows counted no page views."
    case "incomparable":
      return "The two maps were read at different floors and were not compared."
  }
}

/** What the comparison could not account for, as a share of each window's views. */
export type UnaccountedShares = {
  readonly was: number
  readonly now: number
}

/** How many page views began in each window, which is the weight and never a trend. */
export type Arrivals = {
  readonly was: number
  readonly now: number
}

/** Two windows' readerships, held against each other. */
export type ReadershipChange = {
  /**
   * The floor both maps were read at, or `undefined` where they differ and
   * nothing was compared.
   */
  readonly floor: number | undefined
  readonly comparability: ReadershipComparability
  /**
   * Half the sum of the absolute share movements over the regions both maps
   * name, in `[0, 1]`, or `undefined` where nothing was compared.
   *
   * A floor on how much the readership moved. The share of readers who would
   * have to be somewhere else for the two windows to have the same mix.
   */
  readonly moved: number | undefined
  /**
   * {@link moved} plus the whole unaccounted share of both windows, capped at
   * 1, or `undefined` with it.
   *
   * A ceiling, and the two numbers together are the only honest statement this
   * can make on a page whose buckets are mostly under the floor.
   */
  readonly movedAtMost: number | undefined
  /**
   * Every region either map names, most-moved first.
   *
   * Ranked by views moved rather than by share moved, which is the ranking rule
   * this subsystem uses everywhere (0221): a country of forty readers that
   * halved is a smaller fact than one of four hundred that moved a tenth. A
   * `thinned` or `thickened` row is ranked by the one figure it has, which
   * treats the withheld side as nought and therefore ranks such a row as high
   * as it could possibly deserve.
   */
  readonly regions: readonly ComparedRegion[]
  /**
   * The region carrying the largest absolute {@link ComparedRegion.shift}, or
   * `undefined` where no region is named in both maps.
   *
   * What `shifted` and `unplaced` are told apart by, and the first thing a
   * person reading a shifted comparison wants.
   */
  readonly loudest: ReaderRegion | undefined
  /**
   * The share of each window's views that is in no comparable row: its withheld
   * buckets, and the buckets the other window withheld.
   *
   * The width of the bound on {@link moved}, and a measurement in its own
   * right — a deployment reading two thirds of its arrivals as unaccounted is
   * being told that its traffic is spread thinner than its floor, which no
   * single window's map says.
   */
  readonly unaccounted: UnaccountedShares
  /**
   * Page views that began in each window, named and withheld.
   *
   * Exact (0214, 0219), and deliberately not divided one by the other: the two
   * revisions were not up for the same length of time, and nothing in these
   * rows says how long either was.
   */
  readonly arrivals: Arrivals
}

const namedIn = (reading: RegionReading): ReadonlyMap<ReaderRegion, number> =>
  new Map(reading.regions.map((bucket) => [bucket.region, bucket.views]))

/**
 * One window's figure for one region, where the map published one.
 *
 * **The unplaced bucket is the one region whose absence is exactly nought**,
 * and the asymmetry is worth the special case. A floored map withholds a small
 * placed bucket, so a placed region missing from it is either empty or nearly
 * so and this cannot tell which. The unplaced bucket is never withheld
 * (0214) — it names nowhere, so there is nobody in it to re-identify — which
 * means a map without one was written by a platform that placed every arrival.
 *
 * Without it the commonest measurement fault this comparison exists to catch
 * would be reported as its opposite: a proxy that stops writing the header
 * fills a bucket that was not there before, so the unplaced share would carry
 * no movement of its own and the whole shift would be attributed to the placed
 * regions it drained.
 */
const viewsIn = (
  named: ReadonlyMap<ReaderRegion, number>,
  region: ReaderRegion
): number | undefined => (region === UNKNOWN_REGION ? (named.get(region) ?? 0) : named.get(region))

const shareOf = (views: number | undefined, total: number): number | undefined =>
  views === undefined || total === 0 ? undefined : views / total

const movementOf = (was: number | undefined, now: number | undefined): RegionMovement => {
  if (was === undefined) return "thickened"
  if (now === undefined) return "thinned"
  if (now > was) return "grew"
  if (now < was) return "shrank"

  return "steady"
}

/** How many views a row moved, with a withheld side read as nought. */
const magnitudeOf = (row: ComparedRegion): number =>
  Math.abs((row.now.views ?? 0) - (row.was.views ?? 0))

/**
 * Two windows' region maps, compared.
 *
 * The labels are the caller's: handing them the other way round reverses every
 * sign rather than being refused, exactly as a before-and-after reading of a
 * page does (0224). Both maps must be of the same tree, and a caller holding a
 * window of rows over several revisions gets one with `regionReadingFor` in
 * [`region.ts`](region.ts) rather than writing the filter.
 */
export const readershipChangeOf = (was: RegionReading, now: RegionReading): ReadershipChange => {
  const incomparable = was.floor !== now.floor
  const unmeasured = was.views === 0 || now.views === 0
  const wasNamed = namedIn(was)
  const nowNamed = namedIn(now)
  const regions = [...new Set([...wasNamed.keys(), ...nowNamed.keys()])].map(
    (region): ComparedRegion => {
      const wasViews = viewsIn(wasNamed, region)
      const nowViews = viewsIn(nowNamed, region)
      const wasSide = { views: wasViews, share: shareOf(wasViews, was.views) }
      const nowSide = { views: nowViews, share: shareOf(nowViews, now.views) }
      const both = wasSide.share !== undefined && nowSide.share !== undefined

      return {
        region,
        was: wasSide,
        now: nowSide,
        movement: movementOf(wasSide.views, nowSide.views),
        shift: both ? (nowSide.share ?? 0) - (wasSide.share ?? 0) : undefined,
        change:
          wasSide.views === undefined || nowSide.views === undefined
            ? undefined
            : nowSide.views - wasSide.views,
      }
    }
  )

  const arrivals = { was: was.views, now: now.views }

  if (incomparable || unmeasured) {
    return {
      floor: incomparable ? undefined : was.floor,
      comparability: incomparable ? "incomparable" : "unmeasured",
      moved: undefined,
      movedAtMost: undefined,
      // Two differently floored maps publish nothing, because every row of the
      // join would be an artefact of the two floors rather than a movement.
      regions: incomparable ? [] : ranked(regions),
      loudest: undefined,
      // Nothing was compared, so neither window's views are accounted for.
      unaccounted: { was: 1, now: 1 },
      arrivals,
    }
  }

  const shifted = regions.filter(
    (row): row is ComparedRegion & { readonly shift: number } => row.shift !== undefined
  )
  const moved = shifted.reduce((total, row) => total + Math.abs(row.shift), 0) / 2
  // Clamped at nought, because a window whose every bucket is comparable sums
  // its shares to 1 give or take a float's last bit, and a negative width would
  // put the ceiling under the floor.
  const accounted = (side: (row: ComparedRegion) => number | undefined): number =>
    Math.max(0, 1 - shifted.reduce((total, row) => total + (side(row) ?? 0), 0))
  const unaccounted = {
    was: accounted((row) => row.was.share),
    now: accounted((row) => row.now.share),
  }
  const movedAtMost = Math.min(1, moved + (unaccounted.was + unaccounted.now) / 2)
  const loudest = [...shifted].sort(
    (one, other) =>
      Math.abs(other.shift) - Math.abs(one.shift) || one.region.localeCompare(other.region)
  )[0]?.region

  return {
    floor: was.floor,
    comparability: comparabilityOf(moved, movedAtMost, loudest),
    moved,
    movedAtMost,
    regions: ranked(regions),
    loudest,
    unaccounted,
    arrivals,
  }
}

/** Most views moved first, and by code where two moved the same, so a refresh does not reorder. */
const ranked = (regions: readonly ComparedRegion[]): readonly ComparedRegion[] =>
  [...regions].sort(
    (one, other) =>
      magnitudeOf(other) - magnitudeOf(one) || one.region.localeCompare(other.region)
  )

const comparabilityOf = (
  moved: number,
  movedAtMost: number,
  loudest: ReaderRegion | undefined
): ReadershipComparability => {
  if (moved > READERSHIP_SHIFTED_ABOVE) {
    return loudest === UNKNOWN_REGION ? "unplaced" : "shifted"
  }

  return movedAtMost > READERSHIP_SHIFTED_ABOVE ? "unsettled" : "like-for-like"
}
