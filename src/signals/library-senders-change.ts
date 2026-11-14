import { everyMemberOf } from "../closed-set.js"
import type { NodeId, TreeId } from "../ids.js"
import type { PrimitiveType } from "../primitive-type.js"
import { PRIMITIVE_ROLES, type PrimitiveRole } from "../role.js"

import { inFormOrder, type ComparedPopulations, type PageForm } from "./audiences.js"
import { pairedWindowOf, partsByNodeIn } from "./library-change.js"
import { kindKeyOf, type KindKey } from "./library.js"
import type { PageReading, PartReading } from "./parts.js"
import { senderStatesOf, witnessedState, type SenderState } from "./subtrees.js"

/**
 * **What fixing a silent component was worth.**
 *
 * The record is
 * [0394](../../decisions/0394-what-a-fix-to-a-silent-component-was-worth-is-read-over-the-places-both-windows-could-check.md),
 * and it begins where
 * [0393](../../decisions/0393-a-silent-component-is-a-census-over-the-placements-the-defect-could-be-seen-on-and-the-share-is-bracketed.md)
 * gathered 0382's defect by kind of part, so a deployment can say *`loom.accordion`
 * is silent in thirty-one of the thirty-four places it stands*. That is the
 * component to fix. The question it leaves is the one an author has the moment
 * they have fixed it: **did it work, and how much of the library did it
 * recover?**
 *
 * Two censuses cannot answer it, for the reason two censuses of anything in this
 * subsystem cannot be subtracted ([`library-change.ts`](library-change.ts)):
 * they are taken over **different sets of places**. A page published in between
 * adds placements, a page that expired takes some away, and a share of places
 * moves with both while no sender has changed. So this pairs the places first
 * and reads the movement over the ones that stand in both windows, exactly as a
 * change to a library's reading is read.
 *
 * It is the **twenty-fifth** reading taken out of the server-side join of 0212
 * rather than collected: **no payload field, no counter, no column, no table, no
 * byte on any wire, and nothing in a reader's browser.** A browser could not
 * send this if it wanted to — whether a part is silent is a statement about
 * *what else was on the page*, which only the tree and the registry know.
 *
 * ## The population is the places the defect could be seen on in **both** windows
 *
 * This is the whole of the design and the only place a surface can read a row
 * wrong.
 *
 * 0393's census divides by {@link KindSenderChange.checkable}'s one-window
 * cousin — the placements something below reported reach at — because a leaf can
 * never be seen to be silent and a placement nobody has been under cannot be
 * seen to be silent *yet*. A comparison has to hold that still on **both**
 * sides, and the two obvious cheaper denominators are both wrong in a direction
 * that matters:
 *
 * - Over **every paired place**, the figure falls as a library gains leaves and
 *   as either window loses readers. That is 0393's argument unchanged.
 * - Over the places checkable **in the later window only**, a placement nobody
 *   was under before and is under now arrives with no *before* state to have
 *   been silent in — so it joins the population at whatever it is today, and a
 *   window that merely got busier publishes a repair. This is the one that would
 *   have been easy to ship and impossible to notice: a release that fixed
 *   nothing, in a week with more readers, reads as a fix.
 *
 * So {@link KindSenderChange.checkable} is the paired placements witnessed in
 * both windows, and the four transitions partition it. {@link
 * KindSenderChange.checkableWas} and {@link KindSenderChange.checkableNow} are
 * published beside it so that a surface can see how much of the library each
 * window could speak for at all — the coverage moving is not a finding about
 * senders and must not be read as one.
 *
 * ## An unclaimed side makes the transition unclaimable, not the share wider
 *
 * The census brackets: a witnessed placement whose standing is `unknown`
 * reported something that was not a view with a reader below it, which is
 * plausibly the same defect, so `share` excludes it and `atMost` includes it.
 *
 * A comparison cannot bracket, and should not. *Indeterminate, then reporting*
 * is not a repair that might be smaller than it looks; it is **no claim at all**
 * about what moved, because the earlier side never said anything to move from.
 * Counting it as a repair would manufacture the finding this reading exists to
 * publish, and counting it as `held` would hide one. So a paired checkable place
 * that is `unknown` on either side is counted in
 * {@link KindSenderChange.indeterminate}, kept out of
 * {@link KindSenderChange.comparable}, and the row says so with the silence
 * `unclaimable` where there is nothing else left.
 *
 * ## The verdict is a subtraction of two whole numbers
 *
 * `repaired − wentSilent`, over one population with one denominator — no
 * threshold, no share compared with a share, and no reader anywhere in it. That
 * is what 0239's rule buys at this unit, and it is why this reading can say
 * *fixed* rather than *probably fixed*.
 *
 * The confound is still named rather than corrected: a placement stands as
 * witnessed when **at least one** reader was below it, so a quieter window
 * checks fewer places. {@link LibrarySendersChange.viewsWas} and {@link
 * LibrarySendersChange.viewsNow} travel on the reading as floors (0147), with
 * the two `checkable` counts, for exactly that reason.
 *
 * ## What it refuses
 *
 * **A deployment-wide share.** There is none here and there is none in the
 * census, for the reason 0257 gives: a figure over every kind at once counts a
 * page once per element node, so it measures how finely the pages were written
 * as much as how they report themselves. The totals are counts.
 *
 * **Anything about a page.** The errand is the primitive — that is the whole of
 * why 0393 exists — so the rows are kinds and the examples are examples. A
 * surface that printed the recovered nodes as *the work* would be printing the
 * wrong unit again, one window later.
 *
 * Pure, and linear in the parts handed in: one pass per window for the states,
 * one for the pairing. It reaches no store, no clock and no DOM, and nothing in
 * it survives into a browser bundle.
 */

/** Why a kind of part has no before and after for its senders. */
export type SenderFixSilence =
  /**
   * Nothing in the pages read, on either side, is of this kind.
   *
   * Only ever a role row, for the reason a role row exists for every member of
   * the vocabulary: *nothing in this library is a landmark* is a fact about the
   * library rather than a missing row.
   */
  | "unplaced"
  /**
   * It stands in both windows and in no place that is in both.
   *
   * Every placement was gained or lost — the pages it stood on are gone, or the
   * nodes were rewritten. A fact about the **library** and not about its
   * senders, and {@link KindSenderChange.gained} and
   * {@link KindSenderChange.lost} are its size.
   */
  | "unpaired"
  /**
   * Its places stand in both windows and none of them could be checked in both.
   *
   * Leaves, which can never be checked, and places nothing reported reach below
   * in one of the two windows. The instruction is *come back with readers on
   * both sides*, and it is kept apart from `unpaired`, which says the places
   * moved.
   */
  | "uncheckable"
  /**
   * Every place checkable in both windows is `unknown` in one of them.
   *
   * Nothing is claimed, by the rule in the module documentation. The places are
   * counted in {@link KindSenderChange.checkable} and in
   * {@link KindSenderChange.indeterminate}; it is the comparison that is
   * withheld, which is how this subsystem publishes a standing beside a withheld
   * share (0212).
   */
  | "unclaimable"

export const SENDER_FIX_SILENCES: readonly SenderFixSilence[] =
  everyMemberOf<SenderFixSilence>()(["unplaced", "unpaired", "uncheckable", "unclaimable"])

/** One line per silence, for a surface saying why a kind has no before and after. */
export const describeSenderFixSilence = (silence: SenderFixSilence): string => {
  switch (silence) {
    case "unplaced":
      return "nothing in the pages read, in either window, is of this kind"
    case "unpaired":
      return "no place this kind of part stands is in both windows"
    case "uncheckable":
      return "no place it stands in both windows could be checked in both"
    case "unclaimable":
      return "every place that could be checked in both reported something other than a view in one of them"
  }
}

/**
 * What happened to a kind of part's senders between the two windows.
 *
 * The sign of `repaired − wentSilent`, which is a subtraction of two counts of
 * places over one population. See the module documentation: no threshold decides
 * any of these.
 */
export type SenderMovement =
  /** More of the places it stands report themselves now, which is what a fix to a primitive looks like. */
  | "repaired"
  /** Fewer do, which is what a release that broke a sender looks like. */
  | "regressed"
  /**
   * Exactly as many do, which includes places trading places: two repaired and
   * two gone silent is `held`, and both counts are published so a surface can
   * say so.
   */
  | "held"
  /**
   * No place of it reported itself in either window.
   *
   * Kept apart from `held` because it is the one state here that is an
   * instruction: the component is still silent everywhere it could be checked,
   * and whatever was done between the windows did not reach it. There is
   * deliberately no sibling for *reporting everywhere and still reporting* —
   * that is `held` with nothing silent, and it asks nobody to do anything.
   */
  | "still-silent"
  /** {@link KindSenderChange.silence} says why nothing can be said. */
  | "unknown"

export const SENDER_MOVEMENTS: readonly SenderMovement[] = everyMemberOf<SenderMovement>()([
  "repaired",
  "regressed",
  "held",
  "still-silent",
  "unknown",
])

/** One line per movement, for a surface putting a component's before and after in front of a person. */
export const describeSenderMovement = (movement: SenderMovement): string => {
  switch (movement) {
    case "repaired":
      return "more of the places it stands report themselves now"
    case "regressed":
      return "fewer of the places it stands report themselves now"
    case "held":
      return "as many of the places it stands report themselves now as did"
    case "still-silent":
      return "no place it stands reported itself in either window"
    case "unknown":
      return "nothing can be said about what changed"
  }
}

/** One kind of part's senders, held against themselves across two windows. */
export type KindSenderChange = {
  readonly kind: KindKey
  /**
   * What part a type plays (0114), or `null`. Always `null` on a role row, which
   * carries it as its key.
   *
   * The later window's answer where it stands there, so that a surface reading a
   * row and the role beside it is reading today's library.
   */
  readonly role: PrimitiveRole | null
  /** Places of this kind that stand in both windows: the same node of the same page, of this kind on both sides. */
  readonly places: number
  /** Places of it in the later window with no counterpart in the earlier one. */
  readonly gained: number
  /** Places of it in the earlier window with no counterpart in the later one. */
  readonly lost: number
  /**
   * Of {@link places}, those something below reported reach at in the **earlier**
   * window.
   *
   * Published so that a surface can see the coverage move. A window with fewer
   * readers checks fewer places, and that is not a finding about senders.
   */
  readonly checkableWas: number
  /** The same for the later window. */
  readonly checkableNow: number
  /**
   * Of {@link places}, those checkable in **both** windows — the population this
   * row is about.
   *
   * Never the later window's alone: see the module documentation, where the
   * cheaper denominator publishes a repair for a week that merely got busier.
   */
  readonly checkable: number
  /**
   * Checkable places that reported something other than a view in one of the two
   * windows, which are in no transition.
   *
   * Not a bracket on the figure, as the census publishes: across two windows an
   * unclaimed side makes the transition unclaimable rather than the share wider.
   */
  readonly indeterminate: number
  /**
   * `checkable − indeterminate`: the places with a verdict on both sides, which
   * is the denominator of both shares and the sum of the four transitions.
   */
  readonly comparable: number
  /** Comparable places silent in the earlier window and reporting in the later one. */
  readonly repaired: number
  /** Comparable places reporting in the earlier window and silent in the later one. */
  readonly wentSilent: number
  /** Comparable places silent in both. */
  readonly keptSilent: number
  /** Comparable places reporting in both. */
  readonly keptReporting: number
  /**
   * The share of {@link comparable} places that was silent in the earlier
   * window; `null` where {@link silence} says why not.
   *
   * The same figure `KindSenders.share` takes of one window, over a population
   * held still — so this one and {@link silentShareNow} are the two ends of a
   * movement and the census's two are not.
   */
  readonly silentShareWas: number | null
  /** The same share in the later window, over the same places. */
  readonly silentShareNow: number | null
  readonly movement: SenderMovement
  /**
   * Why the two shares are not there, and `null` where they are.
   *
   * About the comparison and not about the row: {@link places}, {@link gained}
   * and {@link lost} are counts of parts of trees and are true whatever any
   * window measured.
   */
  readonly silence: SenderFixSilence | null
  /**
   * Distinct trees with at least one place of this kind repaired.
   *
   * The figure a page-by-page reading cannot give, one window on from the
   * census's `silentTrees`: *that fix recovered this component across nineteen
   * of your pages*.
   */
  readonly repairedTrees: number
  /** Distinct trees with at least one place of this kind gone silent, by the same rule. */
  readonly silencedTrees: number
  /**
   * Nodes of this kind that went silent, in the order the pages were paired,
   * capped at {@link SILENCED_EXAMPLES}.
   *
   * Examples and never a list to act on — the errand is the primitive. The
   * repaired side has no examples for the same reason it needs none: nobody opens
   * a page to look at something that is working.
   */
  readonly silencedExamples: readonly NodeId[]
}

/** How many newly silent nodes a row carries as examples. */
export const SILENCED_EXAMPLES = 5

/** What a change did to a deployment's senders, by kind of part. */
export type LibrarySendersChange = {
  /**
   * Every type that stands in either window, most places gone silent first.
   *
   * Then the higher silent share in the later window, then by type, so two kinds
   * that silenced the same number of places do not reorder on a refresh.
   */
  readonly byType: readonly KindSenderChange[]
  /**
   * Every role in the vocabulary that stands in either window, then the row for
   * parts whose type declared none, in the same order as {@link byType}.
   */
  readonly byRole: readonly KindSenderChange[]
  /** Forms read in both windows: a page in one of its forms, never a revision. */
  readonly pages: number
  /** Forms read in the later window only, which is not pages published. */
  readonly pagesGained: number
  /** Forms read in the earlier window only, which is not pages withdrawn. */
  readonly pagesLost: number
  /** The audiences each window's forms named, published and never refused. */
  readonly audiences: ComparedPopulations
  /**
   * Paired pages whose revision moved between the windows.
   *
   * **The number this reading is usually read beside.** A fix to a primitive
   * reaches a page by republishing it, so a repair with `republished` at nought
   * is a repair nothing in the library can explain — a window that got busier, or
   * a sender switched on outside the tree.
   */
  readonly republished: number
  /** Places that stand in both windows, which is the sum of every type row's {@link KindSenderChange.places}. */
  readonly placements: number
  /** Places in the later window only. */
  readonly gained: number
  /** Places in the earlier window only. */
  readonly lost: number
  /**
   * Paired nodes whose primitive type changed.
   *
   * A place one kind left and another took, counted in the first's {@link
   * KindSenderChange.lost} and the second's {@link KindSenderChange.gained} —
   * and held still in the role rows where the two types play the same part.
   */
  readonly recast: number
  /**
   * Places checkable in both windows, over the whole library, which is the sum
   * of every type row's {@link KindSenderChange.checkable}.
   *
   * A node whose type changed is in no type row's population, exactly as it is
   * in no type row's {@link KindSenderChange.places}: there is no kind whose
   * senders can be held still at a place one kind left and another took. The
   * role rows hold it where the two types play the same part.
   */
  readonly checkable: number
  /** Of them, those with a verdict on both sides. */
  readonly comparable: number
  /** Comparable places that went from silent to reporting, over the whole library. */
  readonly repaired: number
  /** Comparable places that went from reporting to silent. */
  readonly wentSilent: number
  /** Comparable places silent in both windows, which is what a fix has not reached yet. */
  readonly keptSilent: number
  /** Comparable places reporting in both. */
  readonly keptReporting: number
  /** Checkable places unclaimed on one of the two sides, over the whole library. */
  readonly indeterminate: number
  /**
   * A floor on the page views of the earlier window, added over the paired
   * pages (0147).
   *
   * Published because every transition here is confounded by it: a quieter
   * window checks fewer places with no sender behaving differently. Not a count
   * of readers and not addable into one.
   */
  readonly viewsWas: number
  /** The same floor for the later window, over the same pages. */
  readonly viewsNow: number
  /**
   * The type that recovered its reporting in the most places, which is what the
   * fix was worth.
   *
   * By the **count** of places and not by the share, for the reason the census
   * ranks by the places a kind is silent in (0393): a kind repaired in its one
   * and only place is a perfect rate and a smaller result than one repaired in
   * thirty-one of thirty-four. `null` where nothing anywhere was repaired.
   *
   * A type and never a role, because a type is the thing an author replaces.
   */
  readonly mostRepaired: KindSenderChange | null
  /**
   * The type that went silent in the most places, by the same rule.
   *
   * The alarm rather than the result, and the reason this reading is worth
   * taking when nobody has fixed anything: a release that silences a component
   * is invisible to a census, which sees only that it is silent now.
   */
  readonly mostSilenced: KindSenderChange | null
  /**
   * Forms read at two revisions in one window, which are in nothing above.
   *
   * A page that is two live revisions in one window has no single counterpart in
   * the other, and the comparison pairs by page in its form: excluded and named
   * rather than picked between.
   */
  readonly ambiguous: readonly PageForm[]
  /**
   * Readings of a revision beyond the first, on either side, which were dropped.
   *
   * A page twice is the one way a census — or a comparison of two — can lie
   * about how much of a library there is (0158).
   */
  readonly duplicated: number
  /**
   * Types the two windows disagree about the role of, where the later window's
   * answer stands.
   *
   * A type plays one part (0114), so a disagreement is two readings joined
   * against two different registries. Every role row above is then about neither.
   */
  readonly roleDisagreed: readonly PrimitiveType[]
}

/**
 * One kind's row before it is a row.
 *
 * A mutable accumulator and not a fold, for the reason the census's is: a
 * library of forty pages is tens of thousands of placements and a fold would
 * copy a row per one. Nothing escapes this module.
 */
type Tallying = {
  readonly kind: KindKey
  role: PrimitiveRole | null
  places: number
  gained: number
  lost: number
  checkableWas: number
  checkableNow: number
  checkable: number
  indeterminate: number
  repaired: number
  wentSilent: number
  keptSilent: number
  keptReporting: number
  readonly repairedIn: Set<TreeId>
  readonly silencedIn: Set<TreeId>
  readonly silencedExamples: NodeId[]
}

const tallying = (kind: KindKey): Tallying => ({
  kind,
  role: null,
  places: 0,
  gained: 0,
  lost: 0,
  checkableWas: 0,
  checkableNow: 0,
  checkable: 0,
  indeterminate: 0,
  repaired: 0,
  wentSilent: 0,
  keptSilent: 0,
  keptReporting: 0,
  repairedIn: new Set(),
  silencedIn: new Set(),
  silencedExamples: [],
})

/** The two keys one placement is counted under, which is the pair of questions this answers. */
const keysOf = (part: PartReading): readonly KindKey[] => [
  { by: "type", type: part.type },
  { by: "role", role: part.role },
]

const rowFor = (rows: Map<string, Tallying>, kind: KindKey): Tallying => {
  const key = kindKeyOf(kind)
  const row = rows.get(key) ?? tallying(kind)

  rows.set(key, row)

  return row
}

/** What one paired place was on both sides, decided once and added into both its rows. */
type Paired = {
  readonly nodeId: NodeId
  readonly treeId: TreeId
  readonly was: SenderState
  readonly now: SenderState
}

const add = (into: Tallying, at: Paired): void => {
  const checkableWas = witnessedState(at.was)
  const checkableNow = witnessedState(at.now)

  into.places += 1
  into.checkableWas += checkableWas ? 1 : 0
  into.checkableNow += checkableNow ? 1 : 0

  if (!checkableWas || !checkableNow) return

  into.checkable += 1

  if (at.was === "indeterminate" || at.now === "indeterminate") {
    into.indeterminate += 1

    return
  }

  if (at.was === "silent" && at.now !== "silent") {
    into.repaired += 1
    into.repairedIn.add(at.treeId)
  } else if (at.was !== "silent" && at.now === "silent") {
    into.wentSilent += 1
    into.silencedIn.add(at.treeId)
    if (into.silencedExamples.length < SILENCED_EXAMPLES) into.silencedExamples.push(at.nodeId)
  } else if (at.was === "silent") into.keptSilent += 1
  else into.keptReporting += 1
}

/**
 * The silence, with the four reasons tried in the order they have to be tried
 * in.
 *
 * Nothing of the kind first, because *there is no such part in this library* is
 * a better answer than anything said about its places. Then nothing held still,
 * because a kind whose places all moved is a fact about the library. Then the
 * places that could not be checked, because *come back with readers* and
 * *nothing claimed what it was* are different instructions and the first is the
 * one that covers the second's places too.
 */
const silenceOf = (of: Tallying, comparable: number): SenderFixSilence | null => {
  if (of.places + of.gained + of.lost === 0) return "unplaced"
  if (of.places === 0) return "unpaired"
  if (of.checkable === 0) return "uncheckable"

  return comparable === 0 ? "unclaimable" : null
}

/**
 * The verdict, off the two counts of places and never off the two shares.
 *
 * The shares have one denominator by construction, so their difference has the
 * sign of `wentSilent − repaired` exactly; taking it from the counts keeps a
 * division out of a verdict.
 */
const movementOf = (of: Tallying, silence: SenderFixSilence | null): SenderMovement => {
  if (silence !== null) return "unknown"
  if (of.repaired > of.wentSilent) return "repaired"
  if (of.wentSilent > of.repaired) return "regressed"

  return of.keptReporting === 0 && of.repaired === 0 ? "still-silent" : "held"
}

const rowOf = (of: Tallying): KindSenderChange => {
  const comparable = of.repaired + of.wentSilent + of.keptSilent + of.keptReporting
  const silence = silenceOf(of, comparable)

  return {
    kind: of.kind,
    role: of.kind.by === "type" ? of.role : null,
    places: of.places,
    gained: of.gained,
    lost: of.lost,
    checkableWas: of.checkableWas,
    checkableNow: of.checkableNow,
    checkable: of.checkable,
    indeterminate: of.indeterminate,
    comparable,
    repaired: of.repaired,
    wentSilent: of.wentSilent,
    keptSilent: of.keptSilent,
    keptReporting: of.keptReporting,
    silentShareWas: comparable === 0 ? null : (of.keptSilent + of.repaired) / comparable,
    silentShareNow: comparable === 0 ? null : (of.keptSilent + of.wentSilent) / comparable,
    movement: movementOf(of, silence),
    silence,
    repairedTrees: of.repairedIn.size,
    silencedTrees: of.silencedIn.size,
    silencedExamples: [...of.silencedExamples],
  }
}

/** The name a row is ordered by, which is the key's own and never the row's position. */
const nameOf = (kind: KindKey): string => (kind.by === "type" ? kind.type : (kind.role ?? ""))

/**
 * The kind to look at first, which is the ranking rule spelled once.
 *
 * Most places gone silent, then the higher silent share now, then by name — so a
 * kind with no share at all sorts after one with a share of nought rather than
 * above it, because `null` is *nothing can be said* and not *every sender works*.
 *
 * Silenced before repaired, because a component that has just stopped reporting
 * is the thing to act on and a repair is the thing to read.
 */
const worseOf = (one: KindSenderChange, other: KindSenderChange): number =>
  other.wentSilent - one.wentSilent ||
  (other.silentShareNow ?? -1) - (one.silentShareNow ?? -1) ||
  nameOf(one.kind).localeCompare(nameOf(other.kind))

/** The states of one window's parts, by node, which is what a paired place is read off. */
const sendersByNodeIn = (reading: PageReading): ReadonlyMap<NodeId, SenderState> =>
  new Map(senderStatesOf(reading.parts).map(({ part, state }) => [part.nodeId, state]))

/**
 * What a change did to a deployment's senders, across every page a kind of part
 * stands on.
 *
 * Takes the two windows' readings rather than two `LibrarySenders`, and the
 * reason is the method: a census publishes a kind's places added up, and the
 * places have to be **paired** before anything can be held still.
 *
 * The labels are the caller's. Two readings of one window come back as every
 * place held and nothing repaired or silenced — which is asserted against the
 * census term for term — and a caller holding the two sides backwards gets a
 * comparison with every movement reversed rather than a refusal, exactly as
 * every other before-and-after reading here does.
 */
export const librarySendersChangeOf = (
  was: readonly PageReading[],
  now: readonly PageReading[]
): LibrarySendersChange => {
  const earlier = pairedWindowOf(was)
  const later = pairedWindowOf(now)
  const rows = new Map<string, Tallying>()
  const roleWas = new Map<PrimitiveType, PrimitiveRole | null>()
  const roleNow = new Map<PrimitiveType, PrimitiveRole | null>()
  const ambiguous = new Map([...earlier.ambiguous, ...later.ambiguous])
  let pages = 0
  let pagesGained = 0
  let pagesLost = 0
  let republished = 0
  let placements = 0
  let gained = 0
  let lost = 0
  let recast = 0
  let viewsWas = 0
  let viewsNow = 0

  /**
   * Every role in the vocabulary gets a row whether or not anything plays it, as
   * the census's role rows do: a role nothing in the library plays is a fact
   * about the library, and a surface that had to tell a missing row from an
   * empty one would be reading the vocabulary itself.
   */
  for (const role of [...PRIMITIVE_ROLES, null]) rowFor(rows, { by: "role", role })

  for (const [form, reading] of earlier.byForm) {
    if (ambiguous.has(form)) continue

    for (const part of reading.parts) {
      roleWas.set(part.type, part.role)
      rowFor(rows, { by: "type", type: part.type }).role = part.role
    }

    if (later.byForm.has(form)) continue

    pagesLost += 1

    for (const part of reading.parts) {
      lost += 1

      for (const kind of keysOf(part)) rowFor(rows, kind).lost += 1
    }
  }

  for (const [form, reading] of later.byForm) {
    if (ambiguous.has(form)) continue

    for (const part of reading.parts) {
      roleNow.set(part.type, part.role)
      rowFor(rows, { by: "type", type: part.type }).role = part.role
    }

    if (earlier.byForm.has(form)) continue

    pagesGained += 1

    for (const part of reading.parts) {
      gained += 1

      for (const kind of keysOf(part)) rowFor(rows, kind).gained += 1
    }
  }

  for (const [form, before] of earlier.byForm) {
    const after = later.byForm.get(form)

    if (after === undefined || ambiguous.has(form)) continue

    const beforeParts = partsByNodeIn(before)
    const afterParts = partsByNodeIn(after)
    const beforeStates = sendersByNodeIn(before)
    const afterStates = sendersByNodeIn(after)

    pages += 1
    republished += before.revision === after.revision ? 0 : 1
    viewsWas += before.views
    viewsNow += after.views

    for (const part of before.parts) {
      const counterpart = afterParts.get(part.nodeId)

      if (counterpart === undefined) {
        lost += 1

        for (const kind of keysOf(part)) rowFor(rows, kind).lost += 1
        continue
      }

      if (part.type === counterpart.type) {
        placements += 1
      } else {
        recast += 1
        lost += 1
        gained += 1
        rowFor(rows, { by: "type", type: part.type }).lost += 1
        rowFor(rows, { by: "type", type: counterpart.type }).gained += 1
      }

      if (part.role !== counterpart.role) {
        rowFor(rows, { by: "role", role: part.role }).lost += 1
        rowFor(rows, { by: "role", role: counterpart.role }).gained += 1
      }

      /**
       * A place is paired under a key only where it is of that kind on both
       * sides, which is where the two keys answer differently: a node recast
       * into another type is a place one type left and another took, while the
       * role rows hold it still wherever the two types play the same part.
       */
      const sameType: readonly KindKey[] =
        part.type === counterpart.type ? [{ by: "type", type: part.type }] : []
      const sameRole: readonly KindKey[] =
        part.role === counterpart.role ? [{ by: "role", role: part.role }] : []
      const paired: Paired = {
        nodeId: part.nodeId,
        treeId: before.treeId,
        was: beforeStates.get(part.nodeId) ?? "leaf",
        now: afterStates.get(part.nodeId) ?? "leaf",
      }

      for (const kind of [...sameType, ...sameRole]) add(rowFor(rows, kind), paired)
    }

    for (const part of after.parts) {
      if (beforeParts.has(part.nodeId)) continue

      gained += 1

      for (const kind of keysOf(part)) rowFor(rows, kind).gained += 1
    }
  }

  const built = [...rows.values()].map(rowOf)
  const byType = built.filter((row) => row.kind.by === "type").sort(worseOf)
  const disagreed = [...roleNow.keys()]
    .filter((type) => roleWas.has(type) && roleWas.get(type) !== roleNow.get(type))
    .sort((one, other) => one.localeCompare(other))
  const totalOf = (figure: (row: KindSenderChange) => number): number =>
    byType.reduce((total, row) => total + figure(row), 0)

  return {
    byType,
    byRole: built.filter((row) => row.kind.by === "role").sort(worseOf),
    pages,
    pagesGained,
    pagesLost,
    audiences: { was: earlier.audiences, now: later.audiences },
    republished,
    placements,
    gained,
    lost,
    recast,
    checkable: totalOf((row) => row.checkable),
    comparable: totalOf((row) => row.comparable),
    repaired: totalOf((row) => row.repaired),
    wentSilent: totalOf((row) => row.wentSilent),
    keptSilent: totalOf((row) => row.keptSilent),
    keptReporting: totalOf((row) => row.keptReporting),
    indeterminate: totalOf((row) => row.indeterminate),
    viewsWas,
    viewsNow,
    mostRepaired:
      byType
        .filter((row) => row.repaired > 0)
        .sort(
          (one, other) =>
            other.repaired - one.repaired || nameOf(one.kind).localeCompare(nameOf(other.kind))
        )[0] ?? null,
    mostSilenced: byType.find((row) => row.wentSilent > 0) ?? null,
    ambiguous: [...ambiguous.values()].sort(inFormOrder),
    duplicated: earlier.duplicated + later.duplicated,
    roleDisagreed: disagreed,
  }
}
