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
import { pageViewsFor, type StoredPageViews } from "./page-views.js"
import type { PageReading } from "./parts.js"

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
  /** `needMs − dwellMs` where positive: the reading time its readers did not have. Nought where they had enough, `null` under a silence. */
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

/** Tree id, then newest revision first, which is the order the page-view rows are read in. */
const byPage = (one: UnscaledPage, other: UnscaledPage): number =>
  one.treeId.localeCompare(other.treeId) || other.revision - one.revision

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

    if (part.pace === null) {
      /**
       * A part with no pace always carries the reason it has none, because
       * `pace.ts` fills the silence for every standing of `unknown` and a part
       * with no pace is always one. The fallback is the type system's and not a
       * state.
       */
      silences[part.silence ?? "unreached"] += 1
      continue
    }

    const scaled = door.silence === null ? atDoorScale(part.readers, door) : part.readers

    counted += 1
    trees.add(reading.treeId)
    bearing.add(key)
    floored += part.floored ? 1 : 0
    whole += part.depth === 0 ? 1 : 0
    readers += scaled
    dwellMs += part.dwellMs
    needMs += scaled * part.wordsWithin * msPerWord

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
    unscaledPages: [...unscaledPages].sort(byPage),
    duplicated,
    duplicatedRows,
    wordsPerMinute,
  }
}
