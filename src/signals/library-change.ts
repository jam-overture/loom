import type { AudienceId } from "../audience/audience.js"
import { everyMemberOf } from "../closed-set.js"
import type { NodeId, TreeId } from "../ids.js"
import type { PrimitiveType } from "../primitive-type.js"
import { PRIMITIVE_ROLES, type PrimitiveRole } from "../role.js"

import {
  audiencesOf,
  formKeyOf,
  formOf,
  inFormOrder,
  pagesOf,
  type ComparedPopulations,
  type PageForm,
} from "./audiences.js"
import { kindKeyOf, type KindKey } from "./library.js"
import type { PageReading, PartReading } from "./parts.js"

/**
 * What a change did to a kind of part, everywhere it stands.
 *
 * Three readings of a library answer about **one window**: the places a kind
 * stands and how many were reached ([`library.ts`](library.ts)), the share of
 * the readers who met it that read it ([`library-reach.ts`](library-reach.ts)),
 * and the share of those readers that acted inside it
 * ([`library-action.ts`](library-action.ts)). Six comparisons answer about
 * **two** windows — where reading stops, the words readers reached, whether
 * they had time for them, who they were, what they did, and the pair a change
 * dissolved — and every one of them is asked of **one page**.
 *
 * So the question an author who changed a *component* has could not be asked.
 * *I rewrote the testimonial band last week; is it read now?* is a question
 * about a kind of part across forty pages, and the only thing available was two
 * censuses on two screens and a person subtracting one share from the other —
 * which is the subtraction this module exists to refuse, because the two
 * censuses are taken over **different sets of places**. A page published in
 * between adds a placement; a page that expired takes one away; and a share of
 * places moves with both while no reader does anything differently.
 *
 * It is the **seventeenth** thing taken out of what this subsystem already
 * knows rather than collected: **nothing is added to a payload, a browser, a
 * column, a store or the vocabulary of kinds**, and the broadcaster is not
 * touched.
 *
 * ## The places are held still, which is the whole of the method
 *
 * Every figure here is taken over the placements that stand in **both**
 * windows: the same node of the same page, of the same kind on both sides. A
 * placement only one side bears is counted in {@link KindChange.gained} or
 * {@link KindChange.lost} and is in no share, which is
 * [0239](../../decisions/0239-a-change-is-read-against-the-words-both-revisions-say-and-a-floor-costs-the-page-total-and-not-the-passage.md)'s
 * rule at another unit — a change is read against the words both revisions say,
 * and a change to a library is read against the places both windows bore.
 *
 * What that buys is the thing no other comparison in this subsystem has, and it
 * is worth being plain about. Every one of the six compares **shares**, because
 * a count of readers is inflated by its own window's straddle
 * ([0147](../../decisions/0147-a-rollup-is-added-to-what-is-stored-and-a-distinct-view-count-is-therefore-approximate.md))
 * and nothing divides out between two windows. Here the denominator is a count
 * of **places**: it has no reader in it, no rollup window in it, and — once the
 * places are held still — it is *the same number on both sides*. So the
 * movement can be published as a count of places that changed hands, the
 * verdict is the sign of a subtraction of two whole numbers, and no threshold
 * decides anything.
 *
 * ## What that count is still confounded by, said before the figure is read
 *
 * A placement stands as `read` when **at least one** reader reached it (0212,
 * [0235](../../decisions/0235-how-much-of-a-page-gets-read-is-a-share-of-words-that-partition-it-and-the-typical-reader-is-a-ceiling.md)),
 * so a quiet window skips more places than a busy one with no reader behaving
 * differently. That is not an error to be corrected — *at least one* is what
 * makes a census of places answerable without counting a reader — but it is a
 * term in every transition here, and a comparison is the first reading in which
 * it can be mistaken for a finding.
 *
 * So the two windows' page views travel **on the reading**, as
 * {@link LibraryChange.viewsWas} and {@link LibraryChange.viewsNow}, and they
 * are floors rather than counts (`PageReading.views`). A comparison across two
 * windows of very different size is a comparison whose transitions carry the
 * difference in traffic, and these are the two numbers that say so. Nothing
 * here withholds a figure for it and nothing scales one: a floor on the views
 * of a window is not a correction, and a reading that pretended it was one
 * would be worse than the caveat.
 *
 * **The reader-weighted question is a different one and is not answered here.**
 * *Of the readers who met your testimonial band, the share that read it has
 * gone from four in ten to seven* needs the door on both sides, is a weighted
 * mean whose weights move when the pages' traffic moves, and belongs beside
 * `library-reach.ts` rather than inside this type — 0256's own refusal, for its
 * own reason: one type carrying a sound figure and a corrected one with nothing
 * but prose to tell them apart is a type a surface reads past. It is filed.
 *
 * ## The two keys answer differently about one change, which is why there are two
 *
 * A node whose **type** changed is not one placement that moved; it is a place
 * one kind left and another took ({@link LibraryChange.recast}). The type rows
 * say exactly that, because a type is the thing an author replaces.
 *
 * The role rows do not, and they are right not to: a part's role is what it
 * plays for a reader (0114), so a testimonial swapped for a card that plays the
 * same part is, to a reader, the same place still standing — and the place is
 * therefore held still in the role row and compared. The two readings of one
 * change are not a disagreement to resolve; they are the two questions a
 * deployment has, and the role one is thin today for the reason every role
 * figure in this subsystem is thin (0212).
 *
 * ## What it refuses to compare
 *
 * **Words.** A placement's words are its own and add across places (0212), so
 * *this kind said four thousand words and readers reached three hundred* is
 * sound in one window. Across two it is not: a paired placement is paired by
 * node and the revision may have moved underneath it, so the two sides' words
 * are two different sentences and their shares are not a before and an after.
 * 0239 solved exactly this for one page, by reading a change against the words
 * both revisions say; the library-scale version of that is a second unit and is
 * filed rather than shipped with a caveat.
 *
 * **Occurrences.** `activations`, `opens`, `closes` and `completions` are counts
 * of things that happened, so they scale with how many readers there were: a
 * press count that doubled in a window that doubled is three sentences about
 * traffic wearing one about reading ([`change.ts`](change.ts)). The share of
 * readers who *acted* is the figure that answers it, and it is the reader-
 * weighted question above.
 *
 * **Anything added across kinds.** There is no reading-wide share and no
 * reading-wide movement, for the reason a census has none (0257): a figure over
 * every kind at once counts a page once per element node, so it measures how
 * finely the pages were written as much as how they are read.
 *
 * ## The one lie a comparison of two libraries can be told
 *
 * Two revisions of one tree on **one** side. A census keeps them apart on
 * purpose — two live versions of a page are two pages
 * ([0250](../../decisions/0250-a-deployment-is-ordered-by-readers-lost-at-the-doors-scale-and-a-page-the-door-cannot-scale-is-out-of-the-order.md),
 * 0257) — but a comparison pairs by **page**, and a page that is two revisions
 * in one window has no single counterpart in the other. Picking one would be a
 * number nobody could account for, so the tree is excluded and named in
 * {@link LibraryChange.ambiguous}. The same reading handed in twice is the
 * ordinary double count and is dropped (0158: counting a window and forgetting
 * it are one operation).
 *
 * Pure. It reaches no store, no clock and no DOM, it is linear in the parts of
 * the readings handed to it, and nothing in it survives into a browser bundle.
 */

/** Why a kind of part has no before and after. */
export type KindChangeSilence =
  /**
   * It stands in both windows, and no place of it can be spoken for on both
   * sides.
   *
   * Every paired placement is `unknown` in one window or the other — a page
   * neither window measured, or one window that measured it and one that did
   * not. The places are still counted in {@link KindChange.places}; what is
   * withheld is the comparison, because a standing of `unknown` is *nothing can
   * be said* and never *nobody read it* (0212).
   */
  | "unread"
  /**
   * Nothing in the pages read, on either side, is of this kind.
   *
   * Only ever a role row, and the reason a role row exists for every member of
   * the vocabulary: *nothing in this library is a heading* is a fact about the
   * library rather than a missing row. A type row cannot be in this state,
   * because a type row exists only where a part of that type stands on one side
   * or the other.
   */
  | "unplaced"
  /**
   * It stands in both windows and in no place that is in both.
   *
   * Every placement was gained or lost: the pages it stood on are gone and it
   * is somewhere else now, or the nodes were rewritten. There is nothing held
   * still, so there is nothing to compare — and that is an answer about the
   * **library** rather than about its readers, which
   * {@link KindChange.gained} and {@link KindChange.lost} are the size of.
   *
   * Kept apart from `unread` because the instructions are opposite: this one
   * says the places moved, and the other says nobody has been seen in them.
   */
  | "unpaired"

export const KIND_CHANGE_SILENCES: readonly KindChangeSilence[] =
  everyMemberOf<KindChangeSilence>()(["unread", "unplaced", "unpaired"])

/** One line per silence, for a surface saying why a kind has no before and after. */
export const describeKindChangeSilence = (silence: KindChangeSilence): string => {
  switch (silence) {
    case "unread":
      return "no place this kind of part stands in both windows can be spoken for in both"
    case "unplaced":
      return "nothing in the pages read, in either window, is of this kind"
    case "unpaired":
      return "no place this kind of part stands is in both windows"
  }
}

/**
 * What happened to a kind of part between the two windows.
 *
 * The verdict is the sign of `tookUp − fellAway`, which is a subtraction of two
 * counts of **places** and needs no threshold and no share: the denominator is
 * the same set of places on both sides, so a movement is places changing hands
 * and nothing else. Every other comparison in this subsystem has to compare two
 * shares instead, because its denominator is a count of readers that moved too.
 */
export type KindMovement =
  /** More places of it are read now than were, which is the sentence a change to a primitive is made for. */
  | "taken-up"
  /** Fewer are. */
  | "abandoned"
  /**
   * Exactly as many are, which includes places trading places: two taken up and
   * two fallen away is `held`, and the two counts are published so that a
   * surface can say so.
   */
  | "held"
  /**
   * No place of it was read in either window.
   *
   * Kept apart from `held` for the reason a comparison of what readers did
   * keeps `still-untouched` from it (0251): *skipped everywhere, and still
   * skipped everywhere* is the one state here that is an instruction. There is
   * deliberately no sibling for *read everywhere and still read everywhere* —
   * that is `held` at a share of one, and it asks nobody to do anything.
   */
  | "still-unread"
  /** {@link KindChange.silence} says why nothing can be said. */
  | "unknown"

export const KIND_MOVEMENTS: readonly KindMovement[] = everyMemberOf<KindMovement>()([
  "taken-up",
  "abandoned",
  "held",
  "still-unread",
  "unknown",
])

/** One line per movement, for a surface putting a kind's before and after in front of a person. */
export const describeKindMovement = (movement: KindMovement): string => {
  switch (movement) {
    case "taken-up":
      return "more of the places it stands are read now"
    case "abandoned":
      return "fewer of the places it stands are read now"
    case "held":
      return "as many of the places it stands are read now as were"
    case "still-unread":
      return "no place it stands was read in either window"
    case "unknown":
      return "nothing can be said about what changed"
  }
}

/**
 * One kind of part, held against itself across two windows.
 *
 * The same shape for a type row and a role row, because they are one comparison
 * asked of two keys — and the two give different answers about a node whose type
 * changed, which is the point of asking both. See the module documentation.
 */
export type KindChange = {
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
   * Of {@link places}, those with a verdict on **both** sides, which is the
   * denominator of both shares.
   *
   * One number and not two, which is the whole of why the two shares are
   * comparable: a place nothing can be said about in either window is in neither
   * term, so the two sides are read over exactly the same set of places.
   */
  readonly comparable: number
  /** Comparable places skipped in the earlier window and read in the later one. */
  readonly tookUp: number
  /** Comparable places read in the earlier window and skipped in the later one. */
  readonly fellAway: number
  /** Comparable places read in both. */
  readonly keptRead: number
  /** Comparable places skipped in both. */
  readonly keptSkipped: number
  /**
   * The share of {@link comparable} places that was read in the earlier window;
   * `null` where {@link silence} says why not.
   *
   * *At least one reader reached it*, which is what a standing of `read` means
   * and not what a person reads the word as (0235). Places and never people: see
   * the module documentation and `library.ts`, where the same figure is taken of
   * one window.
   */
  readonly readShareWas: number | null
  /** The same share in the later window, over the same places. */
  readonly readShareNow: number | null
  readonly movement: KindMovement
  /**
   * Why the two shares are not there, and `null` where they are.
   *
   * About the comparison and not about the row: {@link places},
   * {@link gained} and {@link lost} are counts of parts of trees and are true
   * whatever any window measured, which is how a census publishes a standing
   * beside a withheld share (0212).
   */
  readonly silence: KindChangeSilence | null
}

/** What a change did to a deployment's library, by kind of part. */
export type LibraryChange = {
  /**
   * Every type that stands in either window, most places fallen away first.
   *
   * Then the lower read share in the later window, then by type, so two kinds
   * that lost the same number of places do not reorder on a refresh.
   */
  readonly byType: readonly KindChange[]
  /**
   * Every role in the vocabulary that stands in either window, then the row for
   * parts whose type declared none, in the same order as {@link byType}.
   *
   * Thin today for the reason every role figure in this subsystem is thin:
   * nothing in `src/primitives/` declares one, so nearly every part is in the
   * `null` row — and in this reading that row is the one that treats a node
   * whose type changed as a place still standing. The join is at read time
   * (0212), so the day a role is declared these rows start answering without a
   * migration.
   */
  readonly byRole: readonly KindChange[]
  /** Forms read in both windows: a page in one of its forms, never a revision. */
  readonly pages: number
  /** Forms read in the later window only, which is not pages published. */
  readonly pagesGained: number
  /** Of {@link pagesGained}, forms whose page the earlier window already held. */
  readonly formsGained: number
  /** Forms read in the earlier window only, which is not pages withdrawn. */
  readonly pagesLost: number
  /** Of {@link pagesLost}, forms whose page the later window still holds. */
  readonly formsLost: number
  /** The audiences each window's forms named, published and never refused. */
  readonly audiences: ComparedPopulations
  /**
   * Paired pages whose revision moved between the windows.
   *
   * The comparison still stands — a placement is paired by node, and whether
   * readers reached it is a fact about the place either way — but it says that
   * the pages changed as well as the window, which is the difference between
   * *your readers behave differently* and *you changed your pages*. A reading
   * where this is nought is two windows of one library.
   */
  readonly republished: number
  /** Places that stand in both windows, which is the sum of every type row's {@link KindChange.places}. */
  readonly placements: number
  /** Places in the later window only. */
  readonly gained: number
  /** Places in the earlier window only. */
  readonly lost: number
  /**
   * Paired nodes whose primitive type changed.
   *
   * A place one kind left and another took, counted in the first's {@link
   * KindChange.lost} and the second's {@link KindChange.gained} — and held
   * still in the role rows where the two types play the same part. Not an
   * alarm: it is the commonest change an author makes to a library.
   */
  readonly recast: number
  /**
   * A floor on the page views of the earlier window, added over the paired
   * pages.
   *
   * `PageReading.views` is the largest `views` any one part of a page reports,
   * which is a floor and not a count (0147). Published because every transition
   * in this reading is confounded by it: a quieter window skips more places with
   * no reader behaving differently, and these two numbers are what let somebody
   * see that before reading a movement as a finding.
   *
   * Not a count of readers, and not addable into one: a reader who read two
   * pages is two page views here.
   */
  readonly viewsWas: number
  /** The same floor for the later window, over the same pages. */
  readonly viewsNow: number
  /**
   * The type that lost its reading in the most places, which is the kind to look
   * at first.
   *
   * By the **count** of places and not by the share, for the reason a page's
   * falls are ranked by the readers they lose (0221) and a census's kinds by the
   * places they are skipped in (0257): a kind that lost its one and only place
   * is a perfect rate and a smaller problem than one that lost seven of nine.
   * `null` where nothing anywhere fell away.
   *
   * A type and never a role, because a type is the thing an author can replace.
   */
  readonly mostAbandoned: KindChange | null
  /** The type that gained its reading in the most places, by the same rule. */
  readonly mostTakenUp: KindChange | null
  /**
   * Forms read at two revisions in one window, which are in nothing above.
   *
   * A page that is two live revisions in one window has no single counterpart in
   * the other, and the comparison pairs by page in its form. See the module
   * documentation: excluded and named rather than picked between.
   *
   * A **form** and not a tree, because a page served in two forms (0263) is two
   * paired pages here: one of them held at two revisions says nothing about the
   * other, and a screen naming the exclusion needs to say which form it was.
   */
  readonly ambiguous: readonly PageForm[]
  /**
   * Readings of a revision beyond the first, on either side, which were dropped.
   *
   * A caller that concatenated two reads of one window holds a page twice, and a
   * page twice is the one way a census — or a comparison of two — can lie about
   * how much of a library there is (0158).
   */
  readonly duplicated: number
  /**
   * Types the two windows disagree about the role of, where the later window's
   * answer stands.
   *
   * A type plays one part (0114), so a disagreement is not a change a deployment
   * made: it is two readings joined against two different registries, held
   * against each other. Every role row below is then about neither.
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
  tookUp: number
  fellAway: number
  keptRead: number
  keptSkipped: number
}

const tallying = (kind: KindKey): Tallying => ({
  kind,
  role: null,
  places: 0,
  gained: 0,
  lost: 0,
  tookUp: 0,
  fellAway: 0,
  keptRead: 0,
  keptSkipped: 0,
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

/**
 * The silence, with the three reasons tried in the order they have to be tried
 * in.
 *
 * Nothing of the kind first, because *there is no such part in this library* is
 * a better answer than anything said about its places. Then nothing held still,
 * because a kind whose places all moved is a fact about the library and would
 * otherwise be reported as nobody having been seen reading it.
 */
const silenceOf = (of: Tallying, comparable: number): KindChangeSilence | null => {
  if (of.places + of.gained + of.lost === 0) return "unplaced"
  if (of.places === 0) return "unpaired"

  return comparable === 0 ? "unread" : null
}

/**
 * The verdict, off the two counts of places and never off the two shares.
 *
 * The shares have one denominator by construction, so their difference has the
 * sign of `tookUp − fellAway` exactly; taking it from the counts keeps a
 * division out of a verdict, which is the arithmetic 0229 was bitten by in the
 * other direction.
 */
const movementOf = (of: Tallying, silence: KindChangeSilence | null): KindMovement => {
  if (silence !== null) return "unknown"
  if (of.tookUp > of.fellAway) return "taken-up"
  if (of.fellAway > of.tookUp) return "abandoned"

  return of.keptRead === 0 && of.tookUp === 0 ? "still-unread" : "held"
}

const rowOf = (of: Tallying): KindChange => {
  const comparable = of.tookUp + of.fellAway + of.keptRead + of.keptSkipped
  const silence = silenceOf(of, comparable)

  return {
    kind: of.kind,
    role: of.kind.by === "type" ? of.role : null,
    places: of.places,
    gained: of.gained,
    lost: of.lost,
    comparable,
    tookUp: of.tookUp,
    fellAway: of.fellAway,
    keptRead: of.keptRead,
    keptSkipped: of.keptSkipped,
    readShareWas: comparable === 0 ? null : (of.keptRead + of.fellAway) / comparable,
    readShareNow: comparable === 0 ? null : (of.keptRead + of.tookUp) / comparable,
    movement: movementOf(of, silence),
    silence,
  }
}

/** The name a row is ordered by, which is the key's own and never the row's position. */
const nameOf = (kind: KindKey): string => (kind.by === "type" ? kind.type : (kind.role ?? ""))

/**
 * The kind to look at first, which is the ranking rule spelled once.
 *
 * Most places fallen away, then the lower read share now, then by name — so a
 * kind with no share at all sorts after one with a share of nought rather than
 * above it, because `null` is *nothing can be said* and not *nobody read it*.
 */
const worseOf = (one: KindChange, other: KindChange): number =>
  other.fellAway - one.fellAway ||
  (one.readShareNow ?? 2) - (other.readShareNow ?? 2) ||
  nameOf(one.kind).localeCompare(nameOf(other.kind))

/**
 * One window's pages, by tree, with the two ways a window can hold a page twice
 * counted apart.
 *
 * Published because the pairing is the method rather than a detail of it: a
 * reader-weighted comparison of the same kinds (0279) pairs its pages by exactly
 * this rule, and a second hand-written copy of it would be two spellings of one
 * rule that agree today — which is what moved the counter tables' upsert keys
 * into `counters.ts` and the door's scale into `door.ts`.
 */
export type PairedWindow = {
  /**
   * The window's readings, one per form, keyed by the published form rule.
   *
   * Keyed by the **form** and not by the tree, because two forms of one page
   * (0263) share a tree and have separate counterparts in the other window.
   * Keyed by a tree, the second form of a page at one revision was dropped as
   * the first one handed in twice, which is the double count nothing can notice
   * afterwards (0158), and two forms at two revisions gated **both** out as
   * ambiguous.
   */
  readonly byForm: ReadonlyMap<string, PageReading>
  /**
   * Forms held at two revisions, which have no single counterpart in the other
   * window.
   *
   * A map rather than a set so that the form can be published back to a surface
   * that has to name the page it excluded: the key is opaque and a screen needs
   * the tree and the audience.
   */
  readonly ambiguous: ReadonlyMap<string, PageForm>
  /** The same revision of the same form handed in again. */
  readonly duplicated: number
  /**
   * The audiences this window's forms named, in a stable order.
   *
   * `[]` is *no form here named one*, which is every window written before the
   * column existed (0284) and every one a test builds by hand. Two members is
   * a deployment serving two forms of at least one of its pages (0263) and is
   * not a fault: the pairing is by form, so the two never meet inside a figure.
   */
  readonly audiences: readonly AudienceId[]
  /**
   * The pages behind this window's forms, which two forms of one page share.
   *
   * What makes *a form the other window does not hold* answerable as either a
   * page published or a page that began being served in a second form (0295).
   * Ambiguous forms are in it: the question is what the window held, not what
   * was comparable.
   */
  readonly pagesHeld: ReadonlySet<TreeId>
}

/**
 * One window's readings keyed by page in its form, with a form held at two
 * revisions kept apart from the same revision handed in twice.
 *
 * The first has no single counterpart in the other window and is excluded and
 * named; the second is the ordinary double count and is dropped (0158). **Both
 * are decided per form**, so a page served in two forms is two paired pages and
 * one of them being ambiguous leaves the other standing.
 */
export const pairedWindowOf = (readings: readonly PageReading[]): PairedWindow => {
  const byForm = new Map<string, PageReading>()
  const ambiguous = new Map<string, PageForm>()
  let duplicated = 0

  for (const reading of readings) {
    const key = formKeyOf(formOf(reading))
    const standing = byForm.get(key)

    if (standing === undefined) {
      byForm.set(key, reading)
      continue
    }

    if (standing.revision === reading.revision) duplicated += 1
    else ambiguous.set(key, formOf(reading))
  }

  const forms = [...byForm.values()].map(formOf)

  return { byForm, ambiguous, duplicated, audiences: audiencesOf(forms), pagesHeld: pagesOf(forms) }
}

/**
 * One reading's parts by node, which is what a placement is paired on.
 *
 * Published with {@link pairedWindowOf} and for the same reason: pairing by node
 * rather than by position is what makes a comparison about the part and not
 * about where it sits (0224).
 */
export const partsByNodeIn = (reading: PageReading): ReadonlyMap<NodeId, PartReading> =>
  new Map(reading.parts.map((part) => [part.nodeId, part]))

/**
 * What a change did to a kind of part, across every page it stands on.
 *
 * Takes the two windows' readings rather than two `LibraryReading`s, and the
 * reason is the method: a census publishes a kind's places added up, and the
 * places have to be **paired** before anything can be held still. Two censuses
 * cannot be subtracted, which is what this module is for.
 *
 * The labels are the caller's. Two readings of one window and one library come
 * back as every place held and nothing gained or lost; a caller who holds the
 * two sides backwards gets a comparison with every movement reversed rather than
 * a refusal, exactly as a before-and-after reading of one page does.
 *
 * Linear in the parts handed in, with one pass per window that fills both
 * groupings.
 */
export const libraryChangeOf = (
  was: readonly PageReading[],
  now: readonly PageReading[]
): LibraryChange => {
  const earlier = pairedWindowOf(was)
  const later = pairedWindowOf(now)
  const rows = new Map<string, Tallying>()
  const roleWas = new Map<PrimitiveType, PrimitiveRole | null>()
  const roleNow = new Map<PrimitiveType, PrimitiveRole | null>()
  const ambiguous = new Map([...earlier.ambiguous, ...later.ambiguous])
  let pages = 0
  let pagesGained = 0
  let pagesLost = 0
  let formsGained = 0
  let formsLost = 0
  let republished = 0
  let placements = 0
  let gained = 0
  let lost = 0
  let recast = 0
  let viewsWas = 0
  let viewsNow = 0

  /**
   * Every role in the vocabulary gets a row whether or not anything plays it, as
   * a census's role rows do: a role nothing in the library plays is a fact about
   * the library, and a surface that had to tell a missing row from an empty one
   * would be reading the vocabulary itself.
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
    /** The page is still served, in the other form: a form left the library and the page did not (0295). */
    if (later.pagesHeld.has(reading.treeId)) formsLost += 1

    for (const part of reading.parts) {
      lost += 1

      for (const kind of keysOf(part)) rowFor(rows, kind).lost += 1
    }
  }

  for (const [form, reading] of later.byForm) {
    if (ambiguous.has(form)) continue

    for (const part of reading.parts) {
      const row = rowFor(rows, { by: "type", type: part.type })

      roleNow.set(part.type, part.role)
      row.role = part.role
    }

    if (earlier.byForm.has(form)) continue

    pagesGained += 1
    /** The page was already served, in the other form: a second form began rather than a page being published. */
    if (earlier.pagesHeld.has(reading.treeId)) formsGained += 1

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
       * A placement is paired under a key only where it is of that kind on both
       * sides, which is where the two keys answer differently: a node recast
       * into another type is a place one type left and another took, while the
       * role rows hold it still wherever the two types play the same part.
       */
      const sameType: readonly KindKey[] =
        part.type === counterpart.type ? [{ by: "type", type: part.type }] : []
      const sameRole: readonly KindKey[] =
        part.role === counterpart.role ? [{ by: "role", role: part.role }] : []

      for (const kind of [...sameType, ...sameRole]) {
        const row = rowFor(rows, kind)

        row.places += 1

        if (part.standing === "read" && counterpart.standing === "read") row.keptRead += 1
        else if (part.standing === "read" && counterpart.standing === "skipped") row.fellAway += 1
        else if (part.standing === "skipped" && counterpart.standing === "read") row.tookUp += 1
        else if (part.standing === "skipped" && counterpart.standing === "skipped")
          row.keptSkipped += 1
      }
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

  return {
    byType,
    byRole: built.filter((row) => row.kind.by === "role").sort(worseOf),
    pages,
    pagesGained,
    formsGained,
    pagesLost,
    formsLost,
    audiences: { was: earlier.audiences, now: later.audiences },
    republished,
    placements,
    gained,
    lost,
    recast,
    viewsWas,
    viewsNow,
    mostAbandoned: byType.find((row) => row.fellAway > 0) ?? null,
    mostTakenUp:
      byType
        .filter((row) => row.tookUp > 0)
        .sort(
          (one, other) =>
            other.tookUp - one.tookUp || nameOf(one.kind).localeCompare(nameOf(other.kind))
        )[0] ?? null,
    ambiguous: [...ambiguous.values()].sort(inFormOrder),
    duplicated: earlier.duplicated + later.duplicated,
    roleDisagreed: disagreed,
  }
}
