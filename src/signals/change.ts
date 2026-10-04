import { everyMemberOf } from "../closed-set.js"
import type { NodeId, TreeId } from "../ids.js"

import type { PageReading, PartReading } from "./parts.js"
import { readingProgressOf, type ReadingProgress, type ReadingStep } from "./progress.js"

/**
 * What a change did to the reading of a page.
 *
 * *Before versus after a change* is the measurement Loom exists for: a page
 * changed, and the question is whether readers got further. Every other reading
 * in this subsystem describes one window of one revision and leaves the
 * comparison to whoever is looking at two screens.
 *
 * It is the fourth thing taken out of the server-side join rather than collected
 * ([`parts.ts`](parts.ts), [`page-views.ts`](page-views.ts) and
 * [`progress.ts`](progress.ts) being the others): **nothing was added to a
 * payload, a browser, a column or the vocabulary.** Two readings go in and a
 * comparison comes out.
 *
 * ## The one figure that is comparable across two revisions
 *
 * A `reached` count is not. Two revisions are two windows of two trees with two
 * sets of readers: the counts differ because the page changed, because more
 * people came, and because a rollup window straddled differently
 * ([0147](../../decisions/0147-a-rollup-is-added-to-what-is-stored-and-a-distinct-view-count-is-therefore-approximate.md)).
 * Nothing divides out.
 *
 * A **share** is, and for the reason
 * [0221](../../decisions/0221-where-reading-stops-is-a-fall-between-two-siblings-and-a-ratio-of-two-counts-off-one-row-set.md)
 * gives: a stop's share is `lost ÷ reached` off two rows of one revision, so
 * each side's inflation has already divided out before the two sides meet. The
 * difference between two shares is therefore a difference between two figures
 * that were each honest on their own, which is the whole of why this module
 * compares shares and never counts.
 *
 * So the unit of comparison is **the stop**, not the part. *Six in ten readers
 * left at the pricing band and now four in ten do* is a sentence; *three hundred
 * readers reached it and now four hundred do* is three sentences about traffic
 * wearing one about reading.
 *
 * ## A pair the change dissolved is an answer, not a gap
 *
 * A stop is a pair of adjacent siblings. A change can take that pair apart —
 * remove an end, move one away, insert a band between them — and the obvious
 * handling is to drop it from the comparison. That throws away the most
 * interesting thing on the screen: **a band inserted into the gap where readers
 * were leaving is the commonest change anybody will make**, and the pair it
 * separated is how you find it. So every pair that cannot be compared is
 * reported with the reason it cannot ({@link PairFate}), carrying what its own
 * side measured, which is still true of that side.
 *
 * ## Two readings, not two revisions
 *
 * The two readings may name the same revision. Then no part was added, removed,
 * moved or reworded, every pair matches, and what comes back is the difference
 * between two windows of one page — *this week against last week* — out of the
 * same function. That is not a special case to be allowed for; it is the same
 * question with the tree held still.
 *
 * Which also means this does not check which reading is older. The labels `was`
 * and `now` are the caller's, and a caller who holds them backwards gets a
 * comparison with every sign reversed rather than a refusal.
 *
 * ## What it refuses to add up
 *
 * There is no page-level total of readers kept, and the absence is deliberate.
 * A reader who got past the second band and then past the third is in both
 * stops' figures, so adding them counts one reader twice — the distinctness trap
 * 0147 wrote down for views and
 * [0167](../../decisions/0167-a-delegated-signal-names-the-regions-it-happened-inside.md)
 * wrote down for presses, in the one place where the sum would look most like a
 * headline.
 *
 * Pure, linear in the parts, and reaches no store, clock or DOM. A caller checks
 * {@link PageReading.orphaned} on both readings before trusting either, exactly
 * as it must before trusting either progress.
 */

/** Why a comparison answered nothing. */
export type ChangeSilence =
  /**
   * The two readings are of different trees.
   *
   * Nothing is comparable: not a pair, not a part, not a word. Two pages are
   * two pages, and the plausible-false-number failure here would be a screen
   * reporting that a change removed every part of a page it was never about.
   */
  | "different-trees"
  /**
   * One of the two windows held no views.
   *
   * Every standing on that side is `unknown` (`parts.ts`), so there is no share
   * to compare against — and *every fall was fixed* is what a naive subtraction
   * would say about a page nobody has opened yet. The parts census still
   * answers, because what the change did to the tree is a fact about the tree:
   * a reading may say *three bands moved and one was reworded, and nothing has
   * been measured since.*
   */
  | "nothing-measured"

export const CHANGE_SILENCES: readonly ChangeSilence[] = everyMemberOf<ChangeSilence>()([
  "different-trees",
  "nothing-measured",
])

/** One line per silence, for a surface putting the comparison in front of a person. */
export const describeChangeSilence = (silence: ChangeSilence): string => {
  switch (silence) {
    case "different-trees":
      return "the two readings are of different pages"
    case "nothing-measured":
      return "one of the two windows held no page views"
  }
}

/** Why a pair of siblings has no counterpart in the other reading. */
export type PairFate =
  /** One of its two parts is not in the other revision at all: removed by the change, or added by it. */
  | "absent"
  /** Both parts are there and no longer children of the same node, so they are not siblings to compare. */
  | "moved"
  /**
   * Both parts are still children of one node and no longer next to each other.
   *
   * Something was inserted between them, or a part between them that could not
   * anchor a stop now can. This is the fate worth looking at hardest: a change
   * made where readers were leaving shows up here and nowhere else.
   */
  | "separated"
  /**
   * They are still adjacent and the other way round, so the fall between them
   * is a fall in the other direction.
   *
   * A reader meets them in the opposite order, which makes the two shares
   * answers to two different questions rather than two answers to one. Reported
   * once per side, because each orientation is an adjacency somebody really
   * read.
   */
  | "reordered"
  /**
   * They are still adjacent, and one of them reported something other than
   * coming into view there.
   *
   * Its `reached` of 0 is an absence of evidence rather than an absence of
   * readers (0221), so no fall can be measured between them on that side — and
   * a side-by-side that quietly read it as zero would report a cliff appearing
   * or vanishing that no reader walked off.
   */
  | "unanchorable"
  /**
   * They are adjacent and anchorable on both sides, and on one side nobody
   * reached the first of them.
   *
   * `lost ÷ reached` has no value there, and the tempting reading is the
   * dangerous one: a share of 0.6 beside a share nobody can compute looks like a
   * fall that was fixed, when what happened is that readers stopped arriving.
   */
  | "unreached"

export const PAIR_FATES: readonly PairFate[] = everyMemberOf<PairFate>()([
  "absent",
  "moved",
  "reordered",
  "separated",
  "unanchorable",
  "unreached",
])

/** One line per fate, for a surface putting the comparison in front of a person. */
export const describePairFate = (fate: PairFate): string => {
  switch (fate) {
    case "absent":
      return "one of the two parts is not in the other revision"
    case "moved":
      return "the two parts are no longer children of the same part"
    case "reordered":
      return "the two parts are now the other way round"
    case "separated":
      return "something now sits between the two parts"
    case "unanchorable":
      return "one of the two parts reported nothing that could anchor a stop"
    case "unreached":
      return "nobody reached the first of the two parts"
  }
}

/** What one reading said about one pair of siblings. */
export type StopSide = {
  /** Views that reached the first of the pair, which is the denominator of `share`. */
  readonly reached: number
  /** Views that reached the first and not the second. Zero where none did. */
  readonly lost: number
  /** `lost ÷ reached`, in `[0, 1]`. Zero is a pair nobody stopped at. */
  readonly share: number
}

/**
 * One pair of siblings, as two readings measured it.
 *
 * Both sides are falls off their own rows, so the two shares are comparable and
 * the two `reached` counts are not. Nothing here divides one side's count by the
 * other's.
 */
export type ComparedStop = {
  /** The part they reached. */
  readonly after: NodeId
  /** The next part in the run, which fewer reached. */
  readonly before: NodeId
  /** The parent whose run they are both steps of, which is the same node in both readings. */
  readonly parentId: NodeId
  readonly was: StopSide
  readonly now: StopSide
  /**
   * `was.share − now.share`: the share of readers that no longer stop here.
   *
   * **Positive is better**, because a stop is a loss, and
   * {@link ComparedStop.readersKept} carries the same sign for the same reason.
   * A screen that subtracted the other way round would have one of its two
   * figures pointing the wrong way, which is the defect a reviewer cannot see.
   */
  readonly improvement: number
  /**
   * The smallest share one reader could move, on whichever side counted fewer.
   *
   * `1 ÷ min(was.reached, now.reached)`. It is the resolution of the comparison
   * and not a confidence interval: two readers out of three against one out of
   * two is a third of a share point apart and is two readers, and no amount of
   * arithmetic makes it more than that.
   */
  readonly resolution: number
  /**
   * Whether `improvement` is at least one reader's worth on the coarser side.
   *
   * False is *nothing happened here that a reader did*, and it is the field that
   * keeps a sparsely-read page off the top of a screen. Evaluated in integers
   * rather than by comparing two divisions, so a rounding error never decides
   * whether a reader exists.
   */
  readonly beyondOneReader: boolean
  /**
   * `improvement × now.reached`: the readers the change no longer loses here, at
   * the volume the page has now.
   *
   * The ranking key, and it ranks by readers rather than by share for the same
   * reason a fall does (0221) — a stop two readers out of three abandoned is a
   * worse rate and a smaller problem than one four hundred out of a thousand
   * did. Not rounded, because it is a rate times a count and a magnitude rather
   * than a census, and **never added across stops**: one reader is in every stop
   * they walked past.
   */
  readonly readersKept: number
}

/** A pair one reading measured and the other cannot be asked about. */
export type IncomparablePair = {
  readonly after: NodeId
  readonly before: NodeId
  readonly parentId: NodeId
  /** Which reading this pair is from, and therefore which reading `reached` and `share` are off. */
  readonly side: "was" | "now"
  readonly fate: PairFate
  readonly reached: number
  readonly share: number
}

/**
 * What the change did to the page itself, as the two trees say it.
 *
 * Counters are not in it. This is the half of a comparison that answers with no
 * readers at all, and it is what makes a silent window still worth reading.
 */
export type PartsChanged = {
  /** Element nodes in both revisions, {@link PartsChanged.moved} among them. */
  readonly shared: number
  /** In the later revision and not the earlier one, in reading order. */
  readonly added: readonly NodeId[]
  /** In the earlier revision and not the later one, in reading order. */
  readonly removed: readonly NodeId[]
  /** Shared parts whose parent is a different node, in reading order. */
  readonly moved: readonly NodeId[]
  /**
   * Shared parts whose own words are not the words they were, in reading order.
   *
   * **A floor and not a count.** A part's words are the props its type declared
   * as copy (0122) and its direct text children, so a part whose type declares
   * nothing has no words to compare and a rewording of it is invisible here.
   * {@link PartsChanged.unreadable} is how many parts that is, which is what
   * stops the floor from reading as a total.
   */
  readonly reworded: readonly NodeId[]
  /**
   * Shared parts whose words were the same as far as this reading could see, and
   * where something about them went unread on one side or the other.
   *
   * *Nobody has said whether these props are words* is a different answer from
   * *these words did not change*, and keeping them apart is the bargain `copy`
   * was declared under (0122) and the join carried into a reading (0212).
   */
  readonly unreadable: number
}

export type ReadingChange = {
  /** The earlier reading's tree. The two agree unless `silence` is `different-trees`. */
  readonly treeId: TreeId
  readonly revisions: { readonly was: number; readonly now: number }
  /**
   * The two progress readings this comparison is made of.
   *
   * Carried rather than left to the caller, because deriving them twice is how
   * two screens come to disagree — and because the headline of each side is
   * already on them: a consumer that wants *the steepest fall before, and what
   * happened to it* takes `progress.was.steepest` and finds that pair in
   * {@link ReadingChange.stops} or {@link ReadingChange.incomparable} by its two
   * node ids.
   */
  readonly progress: { readonly was: ReadingProgress; readonly now: ReadingProgress }
  readonly parts: PartsChanged
  /** Every pair both readings could measure, in the earlier reading's reading order. */
  readonly stops: readonly ComparedStop[]
  /** Every pair only one of them could, each once, with the reason. */
  readonly incomparable: readonly IncomparablePair[]
  /**
   * The pair the change keeps most readers at, among those beyond one reader.
   *
   * Null where no pair improved by more than a reader, which includes every page
   * the change did not help.
   */
  readonly mostKept: ComparedStop | null
  /** The pair it loses most readers at, on the same terms. Null where none worsened. */
  readonly mostLost: ComparedStop | null
  /** Why nothing was compared, or `null` where something was. */
  readonly silence: ChangeSilence | null
}

const NO_PARTS: PartsChanged = Object.freeze({
  shared: 0,
  added: Object.freeze([]),
  removed: Object.freeze([]),
  moved: Object.freeze([]),
  reworded: Object.freeze([]),
  unreadable: 0,
})

/** One pair of adjacent anchorable siblings, keyed so the two readings can be joined on it. */
type Adjacency = {
  readonly after: NodeId
  readonly before: NodeId
  readonly parentId: NodeId
  readonly side: StopSide
}

const keyOf = (after: NodeId, before: NodeId): string => `${after}\u0000${before}`

const sideOf = (after: ReadingStep, before: ReadingStep): StopSide => {
  const lost = Math.max(after.reached - before.reached, 0)

  return {
    reached: after.reached,
    lost,
    share: after.reached === 0 ? 0 : lost / after.reached,
  }
}

/**
 * Every pair of consecutive anchorable steps of every run, in reading order.
 *
 * Rebuilt from the steps rather than read off {@link ReadingProgress.stops},
 * because a pair nobody stopped at is a measurement this module needs and a fall
 * is the only thing progress keeps. A pair whose share went to zero is the best
 * outcome a change can have, and reading only the falls would lose exactly that.
 *
 * One pass per run, carrying the previous anchorable step rather than searching
 * backwards, which is how `progress.ts` stays linear and why the ledger is not
 * quadratic any more.
 */
const adjacenciesOf = (progress: ReadingProgress): readonly Adjacency[] => {
  const pairs: Adjacency[] = []

  for (const run of progress.runs) {
    let previous: ReadingStep | undefined

    for (const step of run.steps) {
      if (!step.anchors) continue

      if (previous !== undefined) {
        pairs.push({
          after: previous.nodeId,
          before: step.nodeId,
          parentId: run.parentId,
          side: sideOf(previous, step),
        })
      }

      previous = step
    }
  }

  return pairs
}

/**
 * Where a node sits in the other reading, which is what a fate is diagnosed
 * from.
 *
 * Off the reading's parts rather than off its runs, because a run leaves out
 * the parts a diagnosis most needs: a part moved under a parent it is now the
 * only child of is a step of no run at all, and reading its absence from the
 * runs as *something came between them* would hide the move that explains it.
 */
type Placement = { readonly parentId: NodeId | null; readonly anchors: boolean }

const placementsOf = (reading: PageReading): ReadonlyMap<NodeId, Placement> => {
  const byNode = new Map<NodeId, Placement>()

  for (const part of reading.parts) {
    byNode.set(part.nodeId, { parentId: part.parentId, anchors: part.standing !== "unknown" })
  }

  return byNode
}

/**
 * Why a pair of one reading is not a pair of the other, given that it is not.
 *
 * In order, because the answers are not exclusive and the first true one is the
 * one worth saying: a part that is not there is not also moved, and a part that
 * cannot anchor is not also separated. `separated` is therefore the narrow
 * answer it should be — both parts there, both able to anchor, still children of
 * one part, and no longer next to each other.
 */
const fateOf = (
  pair: Adjacency,
  placements: ReadonlyMap<NodeId, Placement>,
  pairs: ReadonlySet<string>
): PairFate => {
  const after = placements.get(pair.after)
  const before = placements.get(pair.before)

  if (after === undefined || before === undefined) return "absent"
  if (!after.anchors || !before.anchors) return "unanchorable"
  if (after.parentId !== before.parentId) return "moved"
  if (pairs.has(keyOf(pair.before, pair.after))) return "reordered"

  return "separated"
}

/**
 * Whether two shares are at least one reader's worth apart, in integers.
 *
 * `|w.lost ÷ w.reached − n.lost ÷ n.reached| ≥ 1 ÷ min(w.reached, n.reached)`,
 * multiplied out by both denominators and the smaller of them so that no
 * division happens: a float that lands a hair under the threshold would decide
 * that a reader who exists does not. Exact while the counts stay inside
 * `Number.MAX_SAFE_INTEGER` under a cube, which is about a hundred thousand
 * views of one part of one revision in one window.
 */
const beyondOneReaderIn = (was: StopSide, now: StopSide): boolean => {
  const difference = Math.abs(was.lost * now.reached - now.lost * was.reached)

  return difference * Math.min(was.reached, now.reached) >= was.reached * now.reached
}

const comparedStopOf = (pair: Adjacency, now: StopSide): ComparedStop => {
  const improvement = pair.side.share - now.share

  return {
    after: pair.after,
    before: pair.before,
    parentId: pair.parentId,
    was: pair.side,
    now,
    improvement,
    resolution: 1 / Math.min(pair.side.reached, now.reached),
    beyondOneReader: beyondOneReaderIn(pair.side, now),
    readersKept: improvement * now.reached,
  }
}

/**
 * The side of an unreached pair that is worth reporting: the one that reached
 * somebody, where exactly one did.
 *
 * Both sides are true of themselves, and only one of them has a fall on it. A
 * pair nobody reached on either side is filed on the earlier reading, because
 * that is the baseline the question is asked against.
 */
const unreachedSideOf = (pair: Adjacency, now: StopSide): IncomparablePair => {
  const reporting = pair.side.reached === 0 && now.reached > 0

  return {
    after: pair.after,
    before: pair.before,
    parentId: pair.parentId,
    side: reporting ? "now" : "was",
    fate: "unreached",
    reached: reporting ? now.reached : pair.side.reached,
    share: reporting ? now.share : pair.side.share,
  }
}

/**
 * The better of two, which is the ranking rule spelled once.
 *
 * `>` rather than `>=` keeps the first in reading order when two stops kept the
 * same readers, the same way `progress.ts` ranks the steepest fall.
 */
const moreKeptOf = (standing: ComparedStop | null, next: ComparedStop): ComparedStop =>
  standing === null || next.readersKept > standing.readersKept ? next : standing

const moreLostOf = (standing: ComparedStop | null, next: ComparedStop): ComparedStop =>
  standing === null || next.readersKept < standing.readersKept ? next : standing

/** A part's own words, as one string, so two readings' words compare in one go. */
const wordsOf = (part: PartReading): string => part.copy.words.join("\u0000")

const partsChangedOf = (was: PageReading, now: PageReading): PartsChanged => {
  const earlier = new Map<NodeId, PartReading>()

  for (const part of was.parts) earlier.set(part.nodeId, part)

  const added: NodeId[] = []
  const removed: NodeId[] = []
  const moved: NodeId[] = []
  const reworded: NodeId[] = []
  let shared = 0
  let unreadable = 0

  for (const part of now.parts) {
    const before = earlier.get(part.nodeId)

    if (before === undefined) {
      added.push(part.nodeId)
      continue
    }

    shared += 1

    if (before.parentId !== part.parentId) moved.push(part.nodeId)

    if (wordsOf(before) !== wordsOf(part)) reworded.push(part.nodeId)
    else if (before.copy.unread.length > 0 || part.copy.unread.length > 0) unreadable += 1
  }

  const later = new Set(now.parts.map((part) => part.nodeId))

  for (const part of was.parts) if (!later.has(part.nodeId)) removed.push(part.nodeId)

  return { shared, added, removed, moved, reworded, unreadable }
}

/**
 * What a change did to the reading of a page, from a reading of each side.
 *
 * Handed two `PageReading`s rather than two `ReadingProgress`es, for the reason
 * `readingProgressOf` is handed a reading: one input per side cannot be a
 * mismatched pair, and the parts census needs the parts a progress leaves out —
 * a root, and a part whose parent has no other child. The two progresses it
 * derives are returned, so nothing downstream computes them twice.
 */
export const readingChangeOf = (was: PageReading, now: PageReading): ReadingChange => {
  const progress = { was: readingProgressOf(was), now: readingProgressOf(now) }
  const empty = {
    treeId: was.treeId,
    revisions: { was: was.revision, now: now.revision },
    progress,
    stops: [],
    incomparable: [],
    mostKept: null,
    mostLost: null,
  }

  if (was.treeId !== now.treeId) {
    return { ...empty, parts: NO_PARTS, silence: "different-trees" }
  }

  const parts = partsChangedOf(was, now)

  /**
   * A side with no views has no share to compare against, and the parts census
   * does not need one — so the tree half of the answer stands and the reader
   * half says why it is missing.
   */
  if (was.views === 0 || now.views === 0) {
    return { ...empty, parts, silence: "nothing-measured" }
  }

  const earlierPairs = adjacenciesOf(progress.was)
  const laterPairs = new Map<string, Adjacency>()

  for (const pair of adjacenciesOf(progress.now)) laterPairs.set(keyOf(pair.after, pair.before), pair)

  const laterKeys = new Set(laterPairs.keys())
  const earlierKeys = new Set(earlierPairs.map((pair) => keyOf(pair.after, pair.before)))
  const laterPlacements = placementsOf(now)

  const stops: ComparedStop[] = []
  const incomparable: IncomparablePair[] = []
  const matched = new Set<string>()
  let mostKept: ComparedStop | null = null
  let mostLost: ComparedStop | null = null

  for (const pair of earlierPairs) {
    const key = keyOf(pair.after, pair.before)
    const later = laterPairs.get(key)

    if (later === undefined) {
      incomparable.push({
        after: pair.after,
        before: pair.before,
        parentId: pair.parentId,
        side: "was",
        fate: fateOf(pair, laterPlacements, laterKeys),
        reached: pair.side.reached,
        share: pair.side.share,
      })
      continue
    }

    matched.add(key)

    if (pair.side.reached === 0 || later.side.reached === 0) {
      incomparable.push(unreachedSideOf(pair, later.side))
      continue
    }

    const stop = comparedStopOf(pair, later.side)

    stops.push(stop)

    if (!stop.beyondOneReader) continue

    if (stop.readersKept > 0) mostKept = moreKeptOf(mostKept, stop)
    if (stop.readersKept < 0) mostLost = moreLostOf(mostLost, stop)
  }

  const earlierPlacements = placementsOf(was)

  for (const pair of adjacenciesOf(progress.now)) {
    if (matched.has(keyOf(pair.after, pair.before))) continue

    incomparable.push({
      after: pair.after,
      before: pair.before,
      parentId: pair.parentId,
      side: "now",
      fate: fateOf(pair, earlierPlacements, earlierKeys),
      reached: pair.side.reached,
      share: pair.side.share,
    })
  }

  return { ...empty, parts, stops, incomparable, mostKept, mostLost, silence: null }
}
