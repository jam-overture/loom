import { everyMemberOf } from "../closed-set.js"
import type { TreeId } from "../ids.js"
import type { PrimitiveType } from "../primitive-type.js"
import { PRIMITIVE_ROLES, type PrimitiveRole } from "../role.js"

import { readingKeyOf } from "./audiences.js"
import { atDoorScale, doorOf, type PageDoor } from "./door.js"
import { kindKeyOf, type KindKey, type KindSilence } from "./library.js"
import {
  pageViewsFor,
  type RevisionOf,
  type StoredPageViews,
} from "./page-views.js"
import type { PageReading, PartReading } from "./parts.js"
import type { ReachSilence } from "./reach.js"

/**
 * Of the readers who met a kind of part, the share that read it.
 *
 * [`library.ts`](library.ts) publishes a kind's standing as a share of the
 * **places** it stands — *the testimonial band stands in nine places and
 * readers reached two of them* — and is explicit that this is not a share of
 * readers: a placement on a page nine thousand people read counts the same as
 * one on a page three people read
 * ([0257](../../decisions/0257-a-kind-of-part-is-read-across-the-places-it-stands-and-the-unit-is-the-placement.md)).
 * The figure everybody asks for next is the other one, and this lane filed its
 * shape the same morning rather than shipping a corrected number beside an
 * uncorrected one on the same type.
 *
 * This is that figure. It is the **fifteenth** thing taken out of what this
 * subsystem already knows rather than collected: no payload, no browser change,
 * no counter that does not exist, no column and no byte on any wire.
 *
 * ## The unit is one page view of one place, and never a reader
 *
 * A reader cannot be the unit and no field would make them one. Two page views
 * of two pages are two page views, with nothing that says whether one person
 * made both — which is rule 1 of the plan and
 * [0146](../../decisions/0146-a-reader-signal-stays-anonymous-and-a-funnel-is-correlated-inside-one-page-view.md),
 * not a gap. So the unit is the pair *(a page view, a place this kind stands on
 * that page)*: a page view of a page bearing three placements of one kind is
 * three of them, which is what makes the figure addable at all.
 *
 * ## Each page's share is sound, and the weights are the door's
 *
 * A placement's share of its own page's readers is `reached ÷ appearances`,
 * which is the estimate
 * [0229](../../decisions/0229-a-share-of-readers-is-estimated-against-the-appearances-and-bounded-against-the-openings.md)
 * settled: the straddle over-count is in both terms and very nearly divides
 * out, because a reader who spanned two rollup windows spanned them for the
 * whole page.
 *
 * **Across two pages it does not divide out, because the straddle rate is each
 * page's own** — the fact that put every page's loss on the door's scale before
 * an order over them could mean anything
 * ([0250](../../decisions/0250-a-deployment-is-ordered-by-readers-lost-at-the-doors-scale-and-a-page-the-door-cannot-scale-is-out-of-the-order.md)).
 * A mean of the per-page shares weighted by `appearances` would weigh the pages
 * readers linger on most heavily, so shortening a rollup window would move the
 * figure and move no reader.
 *
 * So every term is put on the scale the door counts in, by 0250's correction
 * and off that page's own row by the published matching rule:
 *
 * - the weight is `appearances ÷ (1 + inflation)`, which comes to
 *   `min(appearances, opened)` — the page views a rollup folded, at the door's
 *   scale. It is **taken as that minimum of two whole numbers**, because the
 *   division of three floats agrees with it to fifteen places and not to
 *   sixteen, and 0229 has already been bitten by exactly that;
 * - the numerator is `reached × weight ÷ appearances`, so each page
 *   contributes its own sound share with that weight behind it.
 *
 * What comes out is `met ÷ counted`, and because the weights are counts of real
 * page views rather than a projection onto arrivals nobody folded, **nothing
 * here is withheld for a collection that is behind.** A page whose rollups are
 * lagging weighs less than one that is caught up; that shifts the evidence and
 * not the share, and {@link KindReach.pending} is the figure that says by how
 * much.
 *
 * ## Two denominators, for 0229's reason one level up
 *
 * {@link KindReach.share} is taken of the folded page views at the door's
 * scale, and {@link KindReach.atMost} of the openings, which are exact. The
 * gap between them is the straddle and the lag together, and the identity
 * `openings = counted + pending` is published rather than described.
 *
 * As in a page's own reading, the estimate may sit **above** the ceiling while
 * openings are pending, because the two are then taken of different
 * populations. That is not a contradiction and `pending` is the explanation.
 *
 * ## A kind standing on a page the door cannot scale has no share at all
 *
 * Not a share over the pages that could be scaled. A weighted mean over a
 * subset is a figure whose denominator nobody named, and *of the places we
 * could price* is not a sentence a surface will print — it will print the
 * number. So the share is withheld for the whole kind, the reason is on the
 * row, and the pages that caused it are published once for the reading with
 * **their own** vocabulary's reason on them.
 *
 * Nothing is lost by the refusal: the census of places is sound on exactly the
 * same readings, says so without a correction, and is one call away.
 *
 * ## What is deliberately not published
 *
 * **No reading-wide share.** A share over every kind at once is a share over
 * every (page view, placement) pair in the deployment, in which a page with
 * forty parts weighs forty times one with a single band — a number whose
 * denominator is an artefact of how finely the pages were built. The artefact
 * is a set of rows, so nothing is added across kinds and the only error
 * available to it is one page standing in it twice, which is the one thing
 * deduplicated here
 * ([0158](../../decisions/0158-counting-a-window-of-reader-signals-and-forgetting-it-are-one-operation.md)).
 *
 * **No headcount.** `met` is a count of page views at the door's scale and is
 * deliberately not rounded into people: a share of one part of a page
 * multiplied back up was a count of readers larger than the page had, found on
 * a reader card on 8 October, and a share of places times a readership is
 * worse.
 *
 * **Nothing the census already says.** The standings, the words, the dwell and
 * the occurrences are a kind's row in `library.ts` and are not restated here.
 * The two readings are built from one list of readings and pair on
 * {@link kindKeyOf}.
 *
 * Pure. It reaches no store, no clock and no DOM, it is linear in the parts of
 * the readings times the rows handed in, and nothing in it survives into a
 * browser bundle.
 */

/**
 * Why a kind has no share of the readers who met it.
 *
 * The census's own two reasons are **its values**, not two new spellings of
 * them, so a surface drawing both readings of one kind prints one word for one
 * state. The three added are the states of the door, said of a kind: each is
 * caused by one page, and which page is
 * {@link LibraryReach.unscaled}'s to say in the vocabulary whose subject is a
 * page.
 */
export type KindReachSilence =
  | KindSilence
  /**
   * A page it stands on has no page-view row at the door, so no term of it can
   * be put on a scale another page's shares could be added to.
   *
   * The page's own reading is as good as any other's and every figure in it
   * stands; what is missing is the one number that makes two pages' shares
   * comparable. Same state of the world as an order over pages calls
   * `unscaled` and a page's own reading calls `unmeasured`, at a third subject.
   */
  | "unscaled"
  /**
   * A page it stands on has a row and nothing in it says a page view ever
   * began.
   *
   * Kept apart from `unscaled` because the remedy is the opposite: a missing
   * row is retention or an upgrade, and this is **senders that are not marking
   * their openings** — every rate denominator-less while the counters look
   * healthy, which is the diagnosis nothing else in this subsystem offers.
   */
  | "unopened"
  /**
   * A page it stands on has openings and no rollup has folded a window of them
   * yet.
   *
   * The one reason here that resolves itself. It is what the first minutes of a
   * deployment look like, and what a stalled collection looks like for ever.
   */
  | "uncounted"

export const KIND_REACH_SILENCES: readonly KindReachSilence[] =
  everyMemberOf<KindReachSilence>()(["unread", "unplaced", "unscaled", "unopened", "uncounted"])

/** One line per silence, for a surface saying why a kind has no share of readers. */
export const describeKindReachSilence = (silence: KindReachSilence): string => {
  switch (silence) {
    case "unread":
      return "nothing reported a view of any place this kind of part stands"
    case "unplaced":
      return "nothing in the pages read is of this kind"
    case "unscaled":
      return "a page it stands on has no page views counted at the door, so its share is not comparable"
    case "unopened":
      return "a page it stands on has a row and nothing has said a page view began"
    case "uncounted":
      return "a page it stands on has readers and no window of their reading has been counted yet"
  }
}

/**
 * One kind of part, against the readers who met the places it stands.
 *
 * Identity and the placement counts travel with the figures, so a surface
 * drawing this never holds two lists side by side to find out how much is
 * behind a share. Everything a census says about the kind — its standings, its
 * words, its dwell, its uses — stays in the census and is paired on
 * {@link kindKeyOf}.
 */
export type KindReach = {
  readonly kind: KindKey
  /** What part a type plays (0114), or `null`. Always `null` on a role row, which carries it as its key. */
  readonly role: PrimitiveRole | null
  /** Element nodes of this kind across the readings, as the census counts them. */
  readonly placements: number
  /**
   * Placements a window could speak for, which are the ones in the figures.
   *
   * A placement whose standing is `unknown` is in a window that said nothing
   * about it, and putting its nought into the numerator against its page's
   * readers would call it a skip — which is the one direction a census of a
   * quiet deployment must not be wrong in (0212). It is counted in
   * {@link unknown} and is in no term here.
   */
  readonly verdicts: number
  /** Placements nothing could be said about, and therefore excluded. */
  readonly unknown: number
  /** Revisions bearing at least one placement with a verdict. */
  readonly pages: number
  /**
   * Page views that began on a page bearing it, counted once per place it
   * stands there. Exact (0219), and the denominator of {@link atMost}.
   *
   * `openings = counted + pending`, which is the identity the two denominators
   * differ by.
   */
  readonly openings: number | null
  /**
   * The same page views at the door's scale, keeping only those a rollup has
   * folded: `appearances ÷ (1 + inflation)` per bearing page, which is
   * `min(appearances, opened)`.
   *
   * The denominator of {@link share}. Not a projection — every page view in it
   * was both counted at the door and folded into the counters the numerator
   * comes from.
   */
  readonly counted: number | null
  /**
   * Page views that reached a place this kind stands, at the door's scale.
   *
   * `reached × counted ÷ appearances`, added over the bearing placements. **Not
   * a count of people and deliberately not rounded into one**: it is a reach
   * stated at the door's scale, which is what makes two kinds' reach the same
   * kind of number.
   */
  readonly met: number | null
  /** `counted − met`: the page views that met a page bearing it and did not reach the place. */
  readonly missed: number | null
  /**
   * `met ÷ counted` — the share of the readers who met it that read it.
   *
   * A weighted mean of each page's own sound share, with that page's exact
   * arrivals behind it. It is above 1 exactly where {@link unreconciled} is
   * non-nought and never otherwise.
   *
   * `null` where {@link silence} says why not.
   */
  readonly share: number | null
  /**
   * The most the share could be: `min(reached, opened)` per bearing placement
   * over the {@link openings}, never above 1.
   *
   * A ceiling rather than an estimate, for the reason a page's own reading
   * bounds its shares (0229): no window boundary can inflate an opening, and
   * `reached` is at least the page views that really got there. For a kind
   * nearly everybody meets it is 1 and says nothing, which is the ordinary
   * state rather than a fault.
   */
  readonly atMost: number | null
  /** The numerator of {@link atMost}: whole page views, which is what keeps it a bound. */
  readonly atMostMet: number | null
  /**
   * Appearances in excess of openings across the bearing placements — the
   * straddle that divided out of each page's share before the pages met.
   */
  readonly drift: number
  /**
   * Openings across the bearing placements whose reading no rollup has folded
   * yet, which is exactly `openings − counted`.
   *
   * It does not bias the share; it says how much of the evidence behind it is
   * still arriving, and how unequally — a lagging page weighs less than a
   * caught-up one.
   */
  readonly pending: number
  /**
   * Nobody's visit spanned a window and no opening is waiting, so the estimate
   * and the ceiling are the same number and the share is exact.
   *
   * False under a silence.
   */
  readonly exact: boolean
  /**
   * Placements reporting more reach than their page had appearances, which no
   * rollup produces.
   *
   * Node counters older than the page-view column, or a caller that
   * concatenated two reads. It is the one thing that can put {@link share}
   * above 1, and a surface should show the census instead where it is
   * non-nought.
   */
  readonly unreconciled: number
  readonly silence: KindReachSilence | null
}

/**
 * A page bearing a measured placement that the door could not scale, with the
 * reason in the vocabulary a page's own reading publishes.
 *
 * **Not this reading's vocabulary**, and that is the point: the subject of a
 * reason is a property of the reading it comes from, so a reason about a page
 * is reported as a page's (0240). A funnel could reuse a reach silence outright
 * because a funnel is asked of a page; a census of the library cannot, because
 * its own subject is a kind — so the two vocabularies stand side by side here
 * and the published table is what says they are one state at two subjects.
 */
export type UnscaledPage = RevisionOf & {
  readonly silence: ReachSilence
}

/** What a deployment's library does for the readers who meet it, by kind of part. */
export type LibraryReach = {
  /**
   * Every type that stands anywhere, most readers missed first.
   *
   * Then the lower share, then by type, so two kinds that lose the same do not
   * reorder on a refresh. A kind with no share sorts after one whose share is
   * nought, because `null` is *nothing can be said* and not *nobody read it*.
   */
  readonly byType: readonly KindReach[]
  /** Every role in the vocabulary, then the row for parts whose type declared none, in the same order. */
  readonly byRole: readonly KindReach[]
  /** Readings counted, which is revisions of pages and not trees. */
  readonly pages: number
  /** Distinct trees across them. */
  readonly trees: number
  /** Element nodes across them, which is the sum of every type row's placements. */
  readonly placements: number
  /**
   * Page views counted at the door across the pages read, added **once per
   * page**.
   *
   * Addable for the reason no other count here is: a page view began on one
   * revision of one tree and was counted once (0219). It is the weight behind
   * the whole reading and is not the denominator of anything — a kind's own
   * denominator counts a page once per place it stands there.
   */
  readonly arrivals: number
  /** Pages the door could scale, which is where every share here comes from. */
  readonly scaled: number
  /**
   * The pages bearing a measured placement that the door could not scale, by
   * tree and newest revision first.
   *
   * The actionable half of every silence on a row above: one of these pages is
   * why. Empty is the healthy state.
   */
  readonly unscaled: readonly UnscaledPage[]
  /**
   * The type that loses the most readers, which is the kind to look at first.
   *
   * By the **count** of page views missed and not by the share, for the reason
   * a page's falls are ranked by the readers they lose (0221): a kind missed by
   * two readers out of three is a worse rate and a smaller problem than one
   * missed by four hundred out of a thousand. A type and never a role, because
   * a type is the thing an author can replace.
   */
  readonly mostMissed: KindReach | null
  /**
   * Readings of a revision beyond the first, which were dropped.
   *
   * A caller that concatenated two reads holds one page twice, and a page twice
   * is the one way a weighted figure can lie about how much weight is behind
   * it.
   */
  readonly duplicated: number
  /**
   * Door rows for one revision beyond the first, which were ignored.
   *
   * A store keeps one row per revision, so this is a caller's two reads again —
   * and adding them would double a page's arrivals and halve every share taken
   * against it.
   */
  readonly duplicatedRows: number
  /**
   * Types whose readings disagreed about the role they play, where the first
   * reading's answer stands.
   *
   * Raised here rather than fetched from the census, because it is an alarm and
   * because every role row below is about neither library when it is set. Both
   * readings detect it off the same readings by the same rule, so they cannot
   * disagree about it.
   */
  readonly roleDisagreed: readonly PrimitiveType[]
}

/** The kind-level reason a page's reason causes, which is the same state at the other subject. */
const KIND_REACH_OF_REACH: Readonly<Record<ReachSilence, KindReachSilence>> = Object.freeze({
  unmeasured: "unscaled",
  unopened: "unopened",
  uncounted: "uncounted",
})

/**
 * What one kind's row is being built out of, before it is a row.
 *
 * A mutable accumulator for the reason the census has one: the sets are what
 * make `pages` honest, and a fold would copy one per placement.
 */
type Tallying = {
  readonly kind: KindKey
  role: PrimitiveRole | null
  placements: number
  verdicts: number
  unknown: number
  readonly pages: Set<string>
  openings: number
  counted: number
  met: number
  atMostMet: number
  drift: number
  pending: number
  unreconciled: number
  /** The first door reason any page bearing a measured placement of it gave. */
  blocked: ReachSilence | null
}

const tallying = (kind: KindKey): Tallying => ({
  kind,
  role: null,
  placements: 0,
  verdicts: 0,
  unknown: 0,
  pages: new Set(),
  openings: 0,
  counted: 0,
  met: 0,
  atMostMet: 0,
  drift: 0,
  pending: 0,
  unreconciled: 0,
  blocked: null,
})

/**
 * One placement's contribution, which is nothing at all unless a window could
 * speak for it.
 *
 * The door's reason is taken only from a page bearing a placement with a
 * verdict: a kind that stands on a page nobody read is `unread` and not
 * `unscaled`, because *nothing reported a view of it* is the better answer and
 * the door has nothing to scale either way.
 */
const add = (into: Tallying, part: PartReading, door: PageDoor, revision: string): void => {
  into.placements += 1

  if (part.standing === "unknown") {
    into.unknown += 1

    return
  }

  into.verdicts += 1
  into.pages.add(revision)

  if (door.silence !== null) {
    into.blocked ??= door.silence

    return
  }

  const reached = part.counters?.reached ?? 0

  into.openings += door.opened
  into.counted += door.counted
  into.met += atDoorScale(reached, door)
  into.atMostMet += Math.min(reached, door.opened)
  into.drift += door.drift
  into.pending += door.pending
  into.unreconciled += reached > door.appearances ? 1 : 0
}

/**
 * The silence, with the reasons tried in the order they have to be tried in.
 *
 * Nothing of the kind before nothing measured, because *there is no such part
 * in this library* is a better answer than *nobody was seen reading it* and the
 * second is true of the first by accident. Nothing measured before the door,
 * because a kind nobody read has no share whether or not it could be scaled.
 */
const silenceOf = (of: Tallying): KindReachSilence | null => {
  if (of.placements === 0) return "unplaced"
  if (of.verdicts === 0) return "unread"
  return of.blocked === null ? null : KIND_REACH_OF_REACH[of.blocked]
}

const rowOf = (of: Tallying): KindReach => {
  const silence = silenceOf(of)
  const measured = silence === null

  return {
    kind: of.kind,
    role: of.kind.by === "type" ? of.role : null,
    placements: of.placements,
    verdicts: of.verdicts,
    unknown: of.unknown,
    pages: of.pages.size,
    openings: measured ? of.openings : null,
    counted: measured ? of.counted : null,
    met: measured ? of.met : null,
    missed: measured ? of.counted - of.met : null,
    share: measured ? of.met / of.counted : null,
    atMost: measured ? Math.min(1, of.atMostMet / of.openings) : null,
    atMostMet: measured ? of.atMostMet : null,
    drift: of.drift,
    pending: of.pending,
    exact: measured && of.drift === 0 && of.pending === 0 && of.unreconciled === 0,
    unreconciled: of.unreconciled,
    silence,
  }
}

/** The name a row is ordered by, which is the key's own and never the row's position. */
const nameOf = (kind: KindKey): string => (kind.by === "type" ? kind.type : (kind.role ?? ""))

/**
 * The worse of two, which is the ranking rule spelled once.
 *
 * Most readers missed, then the lower share, then by name — so a kind with no
 * share at all sorts after one with a share of nought rather than above it.
 */
const worseOf = (one: KindReach, other: KindReach): number =>
  (other.missed ?? -1) - (one.missed ?? -1) ||
  (one.share ?? 2) - (other.share ?? 2) ||
  nameOf(one.kind).localeCompare(nameOf(other.kind))

/** Tree id, then newest revision first, which is the order the page-view rows are read in. */
const byPage = (one: UnscaledPage, other: UnscaledPage): number =>
  one.treeId.localeCompare(other.treeId) || other.revision - one.revision

/**
 * What a deployment's library does for the readers who meet it, by kind of
 * part.
 *
 * Takes the readings and the whole window of page-view rows a deployment holds
 * — each page's own row is picked out of them by the published matching rule
 * (`pageViewsFor`) rather than by a third hand-written copy of it, because the
 * pairing is the part of every join here that fails quietly when it is got
 * wrong.
 *
 * Linear in the parts of the readings times the rows, with one pass that fills
 * both groupings.
 */
export const libraryReachOf = (
  readings: readonly PageReading[],
  rows: readonly StoredPageViews[]
): LibraryReach => {
  const tallies = new Map<string, Tallying>()
  const seen = new Set<string>()
  const trees = new Set<TreeId>()
  const unscaled: UnscaledPage[] = []
  const disagreed = new Set<PrimitiveType>()
  let pages = 0
  let placements = 0
  let arrivals = 0
  let scaled = 0
  let duplicated = 0
  let duplicatedRows = 0

  /**
   * Every role in the vocabulary gets a row whether or not anything plays it,
   * the way the census's role rows do: a role nothing in the library plays is a
   * fact about the library worth having, and a surface that had to tell a
   * missing row from an empty one would be reading the vocabulary itself.
   */
  for (const role of [...PRIMITIVE_ROLES, null]) {
    const kind: KindKey = { by: "role", role }

    tallies.set(kindKeyOf(kind), tallying(kind))
  }

  for (const reading of readings) {
    const revision = readingKeyOf(reading)

    if (seen.has(revision)) {
      duplicated += 1
      continue
    }

    seen.add(revision)
    trees.add(reading.treeId)
    pages += 1

    const found = pageViewsFor(reading, rows)
    const door = doorOf(found.measured)

    duplicatedRows += found.duplicated
    arrivals += door.opened

    if (door.silence === null) scaled += 1

    /**
     * A page the door cannot scale is listed only where a window could speak
     * for something on it: a page nobody read is not a page whose readers could
     * not be counted, and listing it would put the commonest healthy state on
     * the one list here that is meant to be empty.
     */
    if (door.silence !== null && reading.standings.unknown < reading.parts.length) {
      unscaled.push({
        treeId: reading.treeId,
        revision: reading.revision,
        silence: door.silence,
      })
    }

    for (const part of reading.parts) {
      const keys: readonly KindKey[] = [
        { by: "type", type: part.type },
        { by: "role", role: part.role },
      ]

      placements += 1

      for (const kind of keys) {
        const key = kindKeyOf(kind)
        const tally = tallies.get(key) ?? tallying(kind)

        if (kind.by === "type") {
          if (tally.placements === 0) tally.role = part.role
          else if (tally.role !== part.role) disagreed.add(part.type)
        }

        add(tally, part, door, revision)
        tallies.set(key, tally)
      }
    }
  }

  const built = [...tallies.values()].map(rowOf)
  const byType = built.filter((row) => row.kind.by === "type").sort(worseOf)

  return {
    byType,
    byRole: built.filter((row) => row.kind.by === "role").sort(worseOf),
    pages,
    trees: trees.size,
    placements,
    arrivals,
    scaled,
    unscaled: [...unscaled].sort(byPage),
    mostMissed: byType.find((row) => (row.missed ?? 0) > 0) ?? null,
    duplicated,
    duplicatedRows,
    roleDisagreed: [...disagreed].sort((one, other) => one.localeCompare(other)),
  }
}
