import type { AudienceId } from "../audience/audience.js"
import type { NodeId, TreeId } from "../ids.js"
import type { PrimitiveType } from "../primitive-type.js"
import type { PrimitiveRole } from "../role.js"

import { readingKeyOf } from "./audiences.js"
import { atDoorScale, doorOf } from "./door.js"
import type { KindPaceSilence, LibraryPaceOptions } from "./library-pace.js"
import type { UnscaledPage } from "./library-reach.js"
import {
  paceStandingOf,
  readingPaceOf,
  READING_WORDS_PER_MINUTE,
  type PaceSilence,
  type PaceStanding,
} from "./pace.js"
import { pageViewsFor, type RevisionOf, type StoredPageViews } from "./page-views.js"
import type { PageReading } from "./parts.js"
import type { ReachSilence } from "./reach.js"

/**
 * Whether the readers who reach **one part** have time for what it says, across
 * every page it stands on.
 *
 * A goal is a kind of signal on a part
 * ([0350](../../decisions/0350-a-project-sets-goals-from-signals-already-collected-and-one-of-them-is-primary.md)):
 * one node id, counted on the pages a project named or on every page that has
 * it. Every figure a goal has is therefore keyed on a part across pages — and
 * **the one a screen has been waiting for since 8 November is how long readers
 * stay on it**, which `docs/portal.md` records twice as *waiting on time on a
 * part being counted per reader*.
 *
 * The time was already in the rows. A tally carries `dwellMs` beside `reached`
 * for every part of every revision, and [`pace.ts`](pace.ts) has divided the
 * two for a part of **one** page since it landed. What was unaskable is the
 * same question of a part that stands on nine pages: a goal's part has nine
 * rows, nine word counts and nine doors, and nothing added them up. So this is
 * the join, and it is the **twenty-third** thing taken out of what this
 * subsystem already knows rather than collected: no payload field, no counter,
 * no column, no byte on any wire and nothing in a browser.
 *
 * ## It is `library-pace.ts`' arithmetic keyed on a node instead of a kind
 *
 * [`library-pace.ts`](library-pace.ts) answers the same question of a *kind* of
 * part (0325) and this one shares its terms exactly, deliberately and by
 * reading its published pieces rather than by respelling them: a pooled
 * quotient of two reader-millisecond sums, `dwellMs` added as the rows hold it
 * and `readers × wordsWithin × msPerWord` as the denominator, each page's
 * readers put on its **own** door's scale before two pages are added (0250),
 * the verdict taken by {@link paceStandingOf} so that a floor can hold up
 * anything but `skimmed`, and a page the door cannot scale kept rather than
 * refused, because the missing correction only ever moves a pace towards the
 * safe verdict.
 *
 * **A goal's part is not a kind of part**, which is why this is a reading and
 * not a row of that one. A kind pools every placement of a type; a goal names
 * one node, and the type row a screen could have read instead holds the
 * forty-nine other sections of the deployment. Nothing in the library readings
 * can narrow to a node, and a surface narrowing one by hand would be dividing
 * two columns with none of the five rules above applied to them.
 *
 * ## Nothing nests, and that is the whole of what this reading does not need
 *
 * A kind's pace carries a nesting rule, because a stack inside a stack would
 * put one page's words into one row twice. **A node id stands at most once in a
 * revision**, so there is nothing here for an outer placement to stand for: one
 * reading contributes one placement or none, every term is a sum over distinct
 * pages, and the only way a page can enter twice is a caller handing the same
 * reading in twice — which is what {@link PartPace.duplicated} counts and the
 * one error that would be permanent if it were let through (0158).
 *
 * ## Which page it is skimmed on is the same rows, kept rather than summed away
 *
 * The pooled quotient is one number about nine pages, and `standings` says *and
 * skimmed on two of them* without saying which two. The per-page rows were
 * always there — the loop reads each page's own pace, its own words and its own
 * door, and threw them away — so publishing them costs an array and no further
 * arithmetic
 * ([0390](../../decisions/0390-a-parts-pages-are-a-second-order-ranked-on-the-reading-time-its-readers-did-not-have.md)).
 *
 * The decision in it is the **order**, and it is this subsystem's ordinary one:
 * the pages are ranked on the reading time their readers did not have, a
 * magnitude in reader-milliseconds, rather than on the pace, a rate. A page one
 * reader hurried past has the worst rate in the deployment and is not the page
 * to go to (0250, 0377).
 *
 * ## The silences are a kind's four, as values
 *
 * {@link KindPaceSilence} unchanged, and reused rather than respelled for the
 * reason `library-pace.ts` reuses a census's two (0256): *it stands nowhere*,
 * *nowhere it stands was read*, *its words could not be counted* and *it says
 * nothing that takes time* are the same four states of the same quotient, and a
 * twenty-third silence vocabulary naming them again would give a screen two
 * names for one state and two mappings to keep in step. What is part-shaped is
 * the **sentence**, which {@link describePartPaceSilence} says; the meaning a
 * window publishes is `meaningOfKindPaceSilence` and stays one function.
 *
 * Pure. It reaches no store, no clock and no DOM, it is linear in the parts of
 * the readings times the rows handed in, and nothing in it survives into a
 * browser bundle.
 */

/** One line per silence, for a surface saying why one part has no pace. */
export const describePartPaceSilence = (silence: KindPaceSilence): string => {
  switch (silence) {
    case "unread":
      return "nothing reported a view of this part on any page it stands on"
    case "unplaced":
      return "none of the pages read holds this part"
    case "unreadable":
      return "some of its words could not be counted, so only a skim could be claimed of it"
    case "wordless":
      return "it says nothing that takes time to read"
  }
}

/**
 * One page a part stands on, with that page's own figures.
 *
 * {@link PartPace} answers *how long do readers stay on this part* with one
 * pooled quotient over every page it stands on, and publishes `standings` —
 * so a screen can say *paced across your pages and skimmed on two of them* and
 * **cannot say which two**. These are the two rows, and nothing extra was
 * computed to get them: `partPaceOf` already reads each page's own pace, its
 * own words and its own door, and summed them away
 * ([0390](../../decisions/0390-a-parts-pages-are-a-second-order-ranked-on-the-reading-time-its-readers-did-not-have.md)).
 *
 * Every figure here is the one the page's own reading holds, at that page's own
 * door scale (0250) — not a share of the figure above it. The terms that add do
 * add: `ranked`'s `readers`, `dwellMs` and `needMs` are exactly
 * {@link PartPace}'s three, which is the only thing tying this breakdown to the
 * figure it breaks down.
 */
export type PacedPlace = {
  readonly treeId: TreeId
  readonly revision: number
  /** The audience this page's counters are of, as the reading has it; `null` where nothing said. */
  readonly audienceId: AudienceId | null
  /**
   * Page views that reached the part here, at this page's own door scale.
   *
   * **Not a count of people and deliberately not rounded into one** (0256), for
   * the reason {@link PartPace.readers} is not: it is a scaled page-view count,
   * and two pages' are added without either being rounded first.
   */
  readonly readers: number
  /** Time on screen here, summed across every view in the window, exactly as the rows hold it. */
  readonly dwellMs: number
  /** The words this placement puts on screen: its own and its subtree's, which is the denominator's input. */
  readonly wordsWithin: number
  /** Whether {@link wordsWithin} is a floor rather than a count, because something in it declares no `copy` (0122). */
  readonly floored: boolean
  /** Whether the part is this page's root, so its words are every word the page says. */
  readonly whole: boolean
  /**
   * Why no straddle correction was applied to this page's readers, and `null`
   * where one was.
   *
   * A page the door cannot scale is kept rather than refused, and the
   * correction it is missing only ever moves its pace **down**, towards the one
   * safe verdict — so this row can rank too low and never too high.
   */
  readonly unscaled: ReachSilence | null
  /** `readers × wordsWithin × msPerWord`: the time its words take the readers who reached it here. `null` under a silence. */
  readonly needMs: number | null
  /** `dwellMs ÷ readers`: the time the typical reader who reached it here had. `null` under a silence. */
  readonly spentMs: number | null
  /**
   * `needMs − dwellMs` where positive: the reading time this page's readers did
   * not have. The ranking key of {@link PartPace.ranked}, and `null` under a
   * silence.
   *
   * **It does not add**, and it is the one term here that does not: the rows'
   * `shortMs` sum to at least {@link PartPace.shortMs} and are equal to it only
   * where no page had time to spare, because a page whose readers lingered pays
   * for a page whose readers skimmed in the pooled figure and pays for nothing
   * here. Both figures are true and the difference is the whole reason this
   * breakdown is worth drawing — but a surface adding these rows up has
   * published a number the reading above it contradicts.
   */
  readonly shortMs: number | null
  /** `dwellMs ÷ needMs`. `1` is exactly time enough. `null` under a silence. */
  readonly pace: number | null
  /** This page's own verdict, by `paceStandingOf` — so one page can be `skimmed` while the part is `paced`. */
  readonly standing: PaceStanding
  /** Why this page has no figures, and `null` where it has them. */
  readonly silence: PaceSilence | null
}

/**
 * A placement with figures of its own, which is every row of
 * {@link PartPace.ranked} and no row of {@link PartPace.unranked}.
 *
 * Published as a type of its own so a screen drawing the order does not
 * null-check four fields that an ordered row cannot be missing: a row is in
 * `ranked` *because* it has a reading time to be short of.
 */
export type MeasuredPlace = PacedPlace & {
  readonly needMs: number
  readonly spentMs: number
  readonly shortMs: number
  readonly pace: number
  readonly silence: null
}

/** One part, against the time its readers had for what it says, across the pages it stands on. */
export type PartPace = {
  readonly nodeId: NodeId
  /**
   * What the part is, as the **first** reading holding it has it, and `null`
   * where no reading holds it at all.
   *
   * First rather than commonest, which is the rule the library readings take
   * about a type's role: a disagreement is reported rather than voted on.
   */
  readonly type: PrimitiveType | null
  /** What part it plays (0114), as the same reading has it; `null` where its type declared none. */
  readonly role: PrimitiveRole | null
  /**
   * Types a later reading had this node as, where the first reading's answer
   * stands.
   *
   * Empty is the ordinary state and the healthy one. A node id standing as two
   * different primitives on two pages means the two halves of every sum here
   * are about two different things, which a screen naming one of them would
   * never show — so it is published rather than resolved, in the shape
   * `LibraryPace.roleDisagreed` uses for the neighbouring disagreement.
   */
  readonly typeDisagreed: readonly PrimitiveType[]
  /** Readings that hold the part at all, after duplicates are dropped. */
  readonly placements: number
  /** Placements in the figures: reached, and saying something counted. */
  readonly counted: number
  /** Why the rest have no pace of their own. The counts add to `placements − counted`. */
  readonly silences: Readonly<Record<PaceSilence, number>>
  /**
   * Every placement by its own page's verdict, which is the census view of the
   * same set.
   *
   * The counts add to {@link placements}, and `unknown` is a placement with no
   * pace of its own *or* one whose words are a floor.
   */
  readonly standings: Readonly<Record<PaceStanding, number>>
  /** Revisions bearing a counted placement. */
  readonly pages: number
  /** Distinct trees across them, which is pages rather than versions of pages. */
  readonly trees: number
  /** Counted placements whose words are a floor, because a type in them declares no `copy` (0122). */
  readonly floored: number
  /**
   * Counted placements that are their page's root.
   *
   * A goal on a page's outermost part is a goal on the whole page, and its
   * words are every word the page says — worth a screen knowing before it reads
   * a pace as being about a band.
   */
  readonly whole: number
  /**
   * Page views that reached a counted placement, at each page's own door scale,
   * counted once per page it stands on.
   *
   * **Not a count of people and deliberately not rounded into one** (0256): a
   * reader who met the part on two pages is two of them. `null` under a
   * silence.
   */
  readonly readers: number | null
  /**
   * Time on screen across the counted placements, added, exactly as the rows
   * hold it.
   *
   * Sound without a correction: a page view a rollup counted twice carries one
   * page view's dwell, so the straddle correction divides out of the numerator
   * and the whole of it is in the readers.
   */
  readonly dwellMs: number
  /**
   * The time its words take the readers who reached it: `readers × wordsWithin
   * × msPerWord`, added over the counted placements.
   *
   * The denominator, in the same reader-milliseconds {@link dwellMs} is in, and
   * each page's own words — the same part can say more on one page than on
   * another, and a sum of paces would have let the quiet page outvote the busy
   * one. `null` under a silence.
   */
  readonly needMs: number | null
  /**
   * `dwellMs ÷ readers`: **the time the typical reader who reached this part
   * had there**, which is the figure a goal's screen asks for.
   *
   * `null` under a silence, which is the state a screen draws instead of a
   * nought: *nobody was seen on it* and *they had no time on it* are different
   * answers.
   */
  readonly spentMs: number | null
  /**
   * `needMs − dwellMs` where positive: the reading time its readers did not
   * have. Nought where they had enough, `null` under a silence.
   *
   * Taken over the pooled sums, so a page whose readers lingered pays for a page
   * whose readers skimmed. The per-page figures on {@link PartPace.ranked} are
   * each page's own and are **not** addable to this one; see
   * {@link PacedPlace.shortMs}.
   */
  readonly shortMs: number | null
  /** `dwellMs ÷ needMs`. `1` is exactly time enough. `null` under a silence. */
  readonly pace: number | null
  /** The verdict, by `paceStandingOf` — so a floor can hold up anything but `skimmed`. */
  readonly standing: PaceStanding
  /** Why there is no verdict, and `null` where there is one. */
  readonly silence: KindPaceSilence | null
  /**
   * Of {@link readers}, those on a page the door could not scale, so no
   * straddle correction was applied to them.
   *
   * It biases the pace **down**, towards `skimmed`, which is why those pages
   * are kept rather than withheld.
   */
  readonly unscaled: number
  /**
   * The pages bearing a counted placement that the door could not scale, by
   * tree and newest revision first.
   *
   * The actionable half of the figure above: one of these pages is why. Empty
   * is the healthy state.
   */
  readonly unscaledPages: readonly UnscaledPage[]
  /**
   * Readings of a revision beyond the first, which were dropped.
   *
   * A caller that concatenated two reads holds one page twice, and a page twice
   * doubles both terms of the quotient while looking like twice the evidence.
   */
  readonly duplicated: number
  /** Door rows for one revision beyond the first, which were ignored. */
  readonly duplicatedRows: number
  /**
   * Every page the part is **counted** on, by the reading time its readers did
   * not have, most first (0390).
   *
   * Then the lower pace, then by tree id and newest revision first, so two
   * pages that cost the same do not reorder on a refresh. The key is
   * {@link PacedPlace.shortMs}, which is a magnitude in reader-milliseconds
   * rather than a rate: *which page is this part skimmed on* asked of a pace
   * would put a page one reader hurried past above a page four hundred readers
   * skimmed, and the second is the page to go to.
   *
   * `ranked.length` is {@link counted}, and the rows' `readers`, `dwellMs` and
   * `needMs` add to {@link PartPace.readers}, {@link PartPace.dwellMs} and
   * {@link PartPace.needMs} exactly — wherever those three are published. A
   * part whose pooled pace is withheld keeps its rows, because the pages are
   * then the only thing on the reading that says where to go and look.
   *
   * Each row's {@link PacedPlace.standing} is its page's own verdict and agrees
   * with {@link standings} by construction; its {@link PacedPlace.shortMs} is
   * its page's own and is the one term that does not add.
   */
  readonly ranked: readonly MeasuredPlace[]
  /**
   * Every other page it stands on, by tree id and newest revision first.
   *
   * A placement with no figures of its own, each carrying the
   * {@link PacedPlace.silence} saying why — and **none of its terms is in the
   * sums above**, which is not a rounding: a `wordless` placement can hold real
   * time on screen that no quotient can use, and adding it to `dwellMs` would
   * put time in a numerator whose denominator refused it.
   *
   * `ranked.length + unranked.length` is {@link placements}.
   */
  readonly unranked: readonly PacedPlace[]
  /**
   * The head of the order: the one page of this part to go and look at.
   *
   * `null` where no page is counted, which is exactly where {@link silence} is
   * not.
   */
  readonly worst: MeasuredPlace | null
  /** The costing rate that was applied, which is the default unless one was given. */
  readonly wordsPerMinute: number
}

const NO_STANDINGS: Readonly<Record<PaceStanding, number>> = Object.freeze({
  skimmed: 0,
  paced: 0,
  lingered: 0,
  unknown: 0,
})

const NO_SILENCES: Readonly<Record<PaceSilence, number>> = Object.freeze({
  unreached: 0,
  unreadable: 0,
  wordless: 0,
})

/**
 * Tree id, then newest revision first, which is the order the page-view rows
 * are read in — and the last key of every list this module publishes, so two
 * pages that cost the same do not reorder on a refresh.
 */
const byRevision = (one: RevisionOf, other: RevisionOf): number =>
  one.treeId.localeCompare(other.treeId) || other.revision - one.revision

/**
 * Most reading time missing, then the lower pace, then by page (0390).
 *
 * Both keys are the row's own, and the second is only ever reached by pages
 * whose readers had time enough — `shortMs` is nought exactly where `pace` is
 * at least `1`, so the tie-break ranks the pages nearest to being short.
 */
const byTimeMissing = (one: MeasuredPlace, other: MeasuredPlace): number =>
  other.shortMs - one.shortMs || one.pace - other.pace || byRevision(one, other)

const MS_PER_MINUTE = 60_000

/** A positive, finite option, or the fallback. Everything else is refused. */
const positive = (value: number | undefined, fallback: number): number =>
  value !== undefined && Number.isFinite(value) && value > 0 ? value : fallback

/**
 * The silence, with the reasons tried in the order they have to be tried in.
 *
 * *It stands nowhere* before *nowhere was read*, because the second is true of
 * the first by accident. Then the part-level reasons in the order a page's own
 * reading reaches them: a floor before silence, because *nobody counted them*
 * outranks *there are none*.
 */
const silenceOf = (
  placements: number,
  counted: number,
  silences: Readonly<Record<PaceSilence, number>>,
  standing: PaceStanding
): KindPaceSilence | null => {
  if (placements === 0) return "unplaced"

  if (counted === 0) {
    if (silences.unreadable > 0) return "unreadable"
    if (silences.wordless > 0) return "wordless"

    return "unread"
  }

  return standing === "unknown" ? "unreadable" : null
}

/**
 * Whether the readers who reach one part have time for what it says.
 *
 * Takes the node, the readings of the pages it is counted on, and the whole
 * window of page-view rows a deployment holds — each page's own row is picked
 * out of them by the published matching rule (`pageViewsFor`) rather than by a
 * hand-written copy of it, because the pairing is the part of every join here
 * that fails quietly when it is got wrong.
 *
 * **Which readings are handed in is the caller's answer to *which pages*.** A
 * goal naming pages hands in those pages' readings; a goal naming none hands in
 * every page it can read, and a reading with no row for the node contributes
 * nothing but a count. Narrowing here rather than inside would have made this
 * function hold the goal vocabulary, which is the portal's and not this
 * subsystem's (0350).
 *
 * There is **no `inflation` option**, for the reason `libraryPaceOf` has none:
 * one scalar over nine pages with nine straddle rates would be a correction
 * nobody measured, so each page's own is read off its own door row.
 *
 * Linear in the parts of the readings times the rows.
 */
export const partPaceOf = (
  nodeId: NodeId,
  readings: readonly PageReading[],
  rows: readonly StoredPageViews[],
  options: LibraryPaceOptions = {}
): PartPace => {
  const wordsPerMinute = positive(options.wordsPerMinute, READING_WORDS_PER_MINUTE)
  const msPerWord = MS_PER_MINUTE / wordsPerMinute

  const seen = new Set<string>()
  const trees = new Set<TreeId>()
  const bearing = new Set<string>()
  const unscaledPages: UnscaledPage[] = []
  const disagreed = new Set<PrimitiveType>()
  const standings: Record<PaceStanding, number> = { ...NO_STANDINGS }
  const silences: Record<PaceSilence, number> = { ...NO_SILENCES }
  const ranked: MeasuredPlace[] = []
  const unranked: PacedPlace[] = []

  let type: PrimitiveType | null = null
  let role: PrimitiveRole | null = null
  let placements = 0
  let counted = 0
  let floored = 0
  let whole = 0
  let readers = 0
  let dwellMs = 0
  let needMs = 0
  let unscaled = 0
  let duplicated = 0
  let duplicatedRows = 0

  for (const reading of readings) {
    const key = readingKeyOf(reading)

    if (seen.has(key)) {
      duplicated += 1
      continue
    }

    seen.add(key)

    const found = pageViewsFor(reading, rows)

    duplicatedRows += found.duplicated

    const door = doorOf(found.measured)

    /**
     * Each page's own straddle rate, off its own door (0250). A page the door
     * cannot scale gets no correction, which leaves its pace low rather than
     * high.
     */
    const paced = readingPaceOf(reading, {
      inflation: found.measured?.inflation ?? 0,
      wordsPerMinute,
    })

    const part = paced.parts.find((candidate) => candidate.nodeId === nodeId)

    if (part === undefined) continue

    placements += 1

    if (placements === 1) {
      type = part.type
      role = part.role
    } else if (part.type !== type) {
      disagreed.add(part.type)
    }

    standings[part.standing] += 1

    const scaled = door.silence === null ? atDoorScale(part.readers, door) : part.readers

    /**
     * What this page is, before it is known whether it has figures — the half
     * of a row that both lists carry, and the half that is the same question
     * either way.
     *
     * `standing` is the page's **own** reading's verdict and never one
     * re-derived from the row's `pace` below. The two quotients agree
     * mathematically and need not agree in their last float place, and
     * `standings` counts this one — so a breakdown of *skimmed on two of them*
     * that recomputed the verdict could name three pages or one (0390).
     */
    const where = {
      treeId: reading.treeId,
      revision: reading.revision,
      audienceId: reading.audienceId,
      readers: scaled,
      dwellMs: part.dwellMs,
      wordsWithin: part.wordsWithin,
      floored: part.floored,
      whole: part.depth === 0,
      unscaled: door.silence,
      standing: part.standing,
    }

    if (part.pace === null) {
      /**
       * A part with no pace always carries the reason it has none, because
       * `pace.ts` fills the silence for every standing of `unknown` and a part
       * with no pace is always one. The fallback is the type system's and not a
       * state.
       */
      const silence = part.silence ?? "unreached"

      silences[silence] += 1
      unranked.push({ ...where, needMs: null, spentMs: null, shortMs: null, pace: null, silence })
      continue
    }

    /**
     * The page's own terms, in the reader-milliseconds the sums are in — never
     * `PacedPart.needMs`, which is one reader's. Taking the row's figures off
     * the same two products the sums are made of is what makes the breakdown
     * add up to the figure above it, which is the only thing tying the two
     * together.
     */
    const placeNeedMs = scaled * part.wordsWithin * msPerWord

    counted += 1
    trees.add(reading.treeId)
    bearing.add(key)
    floored += part.floored ? 1 : 0
    whole += part.depth === 0 ? 1 : 0
    readers += scaled
    dwellMs += part.dwellMs
    needMs += placeNeedMs

    ranked.push({
      ...where,
      needMs: placeNeedMs,
      spentMs: part.dwellMs / scaled,
      shortMs: Math.max(0, placeNeedMs - part.dwellMs),
      pace: part.dwellMs / placeNeedMs,
      silence: null,
    })

    if (door.silence !== null) {
      unscaled += scaled
      unscaledPages.push({
        treeId: reading.treeId,
        revision: reading.revision,
        silence: door.silence,
      })
    }
  }

  /**
   * A counted placement always has a reader and a word of its own, so a part
   * with one has a denominator: `needMs` is nought exactly when `counted` is.
   */
  const pace = counted === 0 ? null : dwellMs / needMs
  const order = [...ranked].sort(byTimeMissing)
  const standing = paceStandingOf(pace, floored > 0)
  const silence = silenceOf(placements, counted, silences, standing)
  const measured = silence === null

  return {
    nodeId,
    type,
    role,
    typeDisagreed: [...disagreed].sort((one, other) => one.localeCompare(other)),
    placements,
    counted,
    silences: { ...silences },
    standings: { ...standings },
    pages: bearing.size,
    trees: trees.size,
    floored,
    whole,
    readers: measured ? readers : null,
    dwellMs,
    needMs: measured ? needMs : null,
    spentMs: measured ? dwellMs / readers : null,
    shortMs: measured ? Math.max(0, needMs - dwellMs) : null,
    pace: measured ? pace : null,
    standing,
    silence,
    unscaled,
    unscaledPages: [...unscaledPages].sort(byRevision),
    duplicated,
    duplicatedRows,
    ranked: order,
    unranked: [...unranked].sort(byRevision),
    worst: order[0] ?? null,
    wordsPerMinute,
  }
}
