import { everyMemberOf } from "../closed-set.js"
import type { TreeId } from "../ids.js"
import type { PrimitiveType } from "../primitive-type.js"
import { PRIMITIVE_ROLES, type PrimitiveRole } from "../role.js"

import {
  pageActionOf,
  type ActionStanding,
  type PartAction,
} from "./action.js"
import { doorOf, type PageDoor } from "./door.js"
import { kindKeyOf, type KindKey } from "./library.js"
import type { KindReachSilence, UnscaledPage } from "./library-reach.js"
import {
  pageViewsFor,
  type RevisionOf,
  type StoredPageViews,
} from "./page-views.js"
import type { PageReading } from "./parts.js"
import type { ReachSilence } from "./reach.js"

/**
 * Of the readers who met a kind of part, the share that did something inside
 * it.
 *
 * Three readings now stand on one list of `PageReading`s and answer three
 * different questions about one primitive type. [`library.ts`](library.ts)
 * counts the **places** it stands and how many of them were reached (0257);
 * [`library-reach.ts`](library-reach.ts) counts the **readers** who met those
 * places and read it (0256). Both are about attention. This is the third and it
 * is about what readers *did*: *of the readers who met your pricing card, three
 * in ten did something inside it.*
 *
 * It is the **sixteenth** thing taken out of what this subsystem already knows
 * rather than collected. `engaged` has been on a tally since the counters
 * existed and [`action.ts`](action.ts) interpreted it for one page (0242);
 * nothing had ever asked it of a **component**, which is the question a person
 * who wrote that component actually has. **Nothing is added to a payload, a
 * browser, a column, a store or the vocabulary of kinds**, and the broadcaster
 * is not touched.
 *
 * ## It is the page reading summed, and not a second reading of a nought
 *
 * Every rule about what a counter means is 0242's and is applied by
 * {@link pageActionOf}, whose rows this folds. So *a leaf has no inside*, *a
 * press is its own occurrence and not a reader*, and *an absent row is not a
 * nought* are decided in one place and once. What is added here is the
 * arithmetic of putting several pages' answers together, which is the only part
 * a library-level reading can get wrong on its own.
 *
 * ## The door is a weight here, and nothing else — which is why this can answer
 * where a share of arrivals cannot
 *
 * A placement's own share is `engaged ÷ reached`: two distinct page-view counts
 * off one row, so the straddle over-count (0147) is common to both terms and
 * divides out, which is the figure 0242 settled and 0221 established the
 * soundness of.
 *
 * Across pages it does not divide out, because the straddle rate is each page's
 * own (0250) — so the weight each page carries is put on the scale the door
 * counts in, exactly as a kind's reach is (0256): `appearances ÷ (1 +
 * inflation)`, which comes to `min(appearances, opened)`, taken as that minimum
 * of two whole numbers rather than as the division it equals.
 *
 * **But the door appears in the weights only**, and that is the difference
 * worth the record. 0256's share divides a reach by the *arrivals*, so the
 * scale is in its denominator and a page the door cannot scale takes the whole
 * figure with it. Here both terms are reaches off the same rows, so a page's
 * own scale factor cancels inside that page's contribution and only the
 * *relative* weight of one page against another needs the door. Two
 * consequences, and they are the shape of this module:
 *
 * - **A kind borne by one page needs no door row at all.** Its share is that
 *   page's own sound figure, and 0256 would have had to withhold it. A deployment
 *   with one page, and a component that stands on one page of forty, are both
 *   answered.
 * - **A page whose placements were reached by nobody needs no scale either**,
 *   because it contributes nothing to either term whatever its scale is. So the
 *   pages that must be scalable are exactly the ones that contributed reach, and
 *   {@link KindAction.weighed} is how many there were.
 *
 * Where more than one page contributed reach and one of them cannot be scaled,
 * the whole kind is withheld — 0256's refusal unchanged, for its reason: a
 * weighted mean over a subset is a figure whose denominator nobody named.
 *
 * ## There is no nought share, and that is not a gap
 *
 * A census can report that nobody read a kind; a reach reading can report that
 * nobody who arrived met it. Neither is available to this one, because its
 * denominator is **the readers who got there**. A kind nothing reached has no
 * denominator, so *nobody acted in it* is a silence here and never a nought —
 * and a surface that printed a nought would be saying the one thing the counters
 * cannot distinguish from nobody ever seeing it.
 *
 * ## What is deliberately not published
 *
 * **No ceiling.** 0256 publishes a share against the folded page views and a
 * bound against the openings, because openings are exact. Nothing counts an
 * action at the door, so there is no exact term to bound this with — and none is
 * needed, since the straddle cancels inside every page's contribution rather
 * than being carried into the result. {@link KindAction.settled} says whether
 * the evidence has stopped arriving, which is the only error left.
 *
 * **No count where there is no scale.** A scale-free row publishes its share and
 * **not** `met` or `acted`: those are counts of page views at the door's scale,
 * and a row whose page the door could not scale has no number on that scale to
 * offer. Mixing the two scales in one column would misrank the one ordering
 * here that matters, so {@link LibraryAction.unranked} says how many rows the
 * ranking could not see.
 *
 * **No reading-wide share**, for 0256's reason: a share over every kind at once
 * weighs a page by how finely it was built.
 *
 * **Nothing the census already says.** The standings of attention, the words,
 * the dwell and the occurrence counts are a kind's row in `library.ts`. The
 * three readings pair on {@link kindKeyOf}.
 *
 * Pure. It reaches no store, no clock and no DOM, it is linear in the parts of
 * the readings times the rows handed in, and nothing in it survives into a
 * browser bundle.
 */

/**
 * Why a kind has no share of the readers who acted inside it.
 *
 * **The reach reading's whole set is reused rather than restated**, which is the
 * affirmative use of the limit 0256 found: a silence's subject is a property of
 * the reading that publishes it (0240), and this reading's subject is a kind
 * exactly as that one's is. Its five members are the same five states of the
 * world at the same subject, so a surface drawing two of the three library
 * readings prints one word for one state. Two are added, and only one of them
 * brings a condition nothing else could report.
 */
export type KindActionSilence =
  | KindReachSilence
  /**
   * No place this kind stands has anything inside it.
   *
   * A heading, a paragraph, a rule, an image and a button are all this: a press
   * is filed against the control and `engaged` counts the views whose reader
   * did something *strictly inside* a node (0167), so a leaf reports a nought
   * for ever and the nought is a filing rule rather than a measurement (0242).
   *
   * **It is a fact about the shape of the pages and not about the window**, and
   * it is the one reason here that would be exactly as true if every reader in
   * the world had read them. The question does not exist for this kind rather
   * than having gone unanswered — so the instruction it carries is *ask the
   * census instead*, never *collect more*.
   *
   * It is said of the kind only where **every** placement is a leaf. A kind that
   * bears parts in some places and not others is answered over the places where
   * the question exists, and {@link KindAction.leaves} is how many it stood in
   * where it did not.
   */
  | "unenterable"
  /**
   * A page that contributed readers holds actions and credits them to nobody.
   *
   * A press is credited to the addressed ancestors the signal carries (0167), so
   * a sender whose delegated signals have no `within` adds occurrences and no
   * `engaged` anywhere on that page — a server synthesising batches, a replayed
   * fixture, a walk turned off. Every share on such a page is a nought that is a
   * filing rule, which is what `PageAction.unwalked` reports for one page.
   *
   * Withheld for the **whole** kind where any page behind the figure is in that
   * state, and not blended: such a page puts reach into the denominator and
   * nothing into the numerator, so a mean across pages would be dragged down by
   * a sender's configuration with no reader involved. That is the same class of
   * error as a page the door cannot scale, and it gets the same refusal.
   * {@link LibraryAction.unwalked} names the pages, which is the actionable half.
   */
  | "unwalked"

export const KIND_ACTION_SILENCES: readonly KindActionSilence[] =
  everyMemberOf<KindActionSilence>()([
    "unread",
    "unplaced",
    "unscaled",
    "unopened",
    "uncounted",
    "unenterable",
    "unwalked",
  ])

/** One line per silence, for a surface saying why a kind has no share of its readers' actions. */
export const describeKindActionSilence = (
  silence: KindActionSilence,
): string => {
  switch (silence) {
    case "unread":
      return "nothing reported a reader reaching any place this kind of part stands that has an inside"
    case "unplaced":
      return "nothing in the pages read is of this kind"
    case "unenterable":
      return "no place this kind of part stands has anything inside it, so there is nothing a reader could act in"
    case "unwalked":
      return "a page behind the figure holds actions and credits none of them to a reader"
    case "unscaled":
      return "two or more pages are behind the figure and one of them has no page views counted at the door, so they cannot be weighed against each other"
    case "unopened":
      return "a page behind the figure has a row and nothing has said a page view began"
    case "uncounted":
      return "a page behind the figure has readers and no window of their reading has been counted yet"
  }
}

/**
 * One kind of part, against what the readers who met it did inside it.
 *
 * Identity and the placement counts travel with the figures, so a surface
 * drawing this never holds two lists side by side to find out how much is behind
 * a share.
 */
export type KindAction = {
  readonly kind: KindKey
  /** What part a type plays (0114), or `null`. Always `null` on a role row, which carries it as its key. */
  readonly role: PrimitiveRole | null
  /** Element nodes of this kind across the readings, as the census counts them. */
  readonly placements: number
  /**
   * Placements that bear element parts, which are the ones the question exists
   * for.
   *
   * Taken off the tree the reading was built from, so it is a property of the
   * pages and not of the window: a part keeps its children in a window nobody
   * read.
   */
  readonly insides: number
  /**
   * Placements with no element part under them, which are in no term here.
   *
   * `placements = insides + leaves`. Published rather than left to be inferred
   * because on an ordinary library it is most of the rows, and a figure over a
   * third of a kind's places should say so where it is.
   */
  readonly leaves: number
  /** Placements bearing parts that a window could speak for. */
  readonly verdicts: number
  /** Placements bearing parts that no row named, and therefore excluded. */
  readonly unknown: number
  /**
   * Placements with a verdict that no reader reached.
   *
   * In neither term, because a reader who never got there says nothing about
   * what readers do once they have. It is the reason a kind can have verdicts
   * and still no share.
   */
  readonly unmet: number
  /**
   * Placements at the root of their page.
   *
   * A root's `engaged` is the page-wide headcount of readers who did anything at
   * all (0242), so a row whose placements are roots is that figure and not a
   * fact about a component. A kind is not a node and the same type is a root on
   * one page and nested on another, so nothing is excluded for it — this is the
   * number that says how much of the row is page-wide.
   */
  readonly roots: number
  /**
   * Placements by the standing a page's own reading gives them (0242), over
   * **every** placement including the leaves.
   *
   * The *places* half of this row, and the one a surface must not print under
   * the share's label: *readers acted in it in 3 of its 9 places* and *3 in 10
   * of the readers who met it acted inside it* are different sentences about one
   * component and can differ by an order of magnitude. It is the pairing care
   * the other two readings of a library already needed once (0256, 0257).
   */
  readonly standings: Readonly<Record<ActionStanding, number>>
  /** Revisions bearing a placement with an inside and a verdict. */
  readonly pages: number
  /**
   * Of those, the pages that contributed reach — the weights that actually
   * decide the share.
   *
   * 1 is the scale-free case: one page's own sound figure, needing no door row.
   * It is also what makes the door's silences conditional, since a page nobody
   * reached needs no scale.
   */
  readonly weighed: number
  /**
   * Page views that reached an enterable place of this kind, at the door's
   * scale: `reached × min(appearances, opened) ÷ appearances`, added over the
   * bearing placements.
   *
   * The denominator of {@link share}. **Not a count of people and deliberately
   * not rounded into one** (0256): the unit is the pair *(a page view, a place
   * this kind stands on that page)*, so a page view of a page bearing three
   * placements is three of them.
   *
   * `null` under a silence, and `null` on a scale-free row — where the share
   * stands and there is no number on the door's scale to publish beside it.
   */
  readonly met: number | null
  /** The same page views whose reader acted inside the place, at the same scale. */
  readonly acted: number | null
  /** `met − acted`: the page views that met an enterable place and did nothing in it. */
  readonly ignored: number | null
  /**
   * `acted ÷ met` — the share of the readers who met it that did something
   * inside it.
   *
   * A weighted mean of each page's own sound share with that page's arrivals
   * behind it, and the one figure here that survives where the counts do not:
   * a scale-free row publishes this and no count. Above 1 exactly where
   * {@link unreconciled} is non-nought and never otherwise.
   */
  readonly share: number | null
  /**
   * Whether {@link met} and {@link acted} are on the door's scale, which is the
   * only scale two rows' counts may be compared on.
   *
   * False on a scale-free row and under a silence. {@link share} is sound either
   * way, which is the whole of what the door buys here.
   */
  readonly onDoorScale: boolean
  /**
   * Appearances in excess of openings across the weighing pages, added **once
   * per page** rather than once per placement.
   *
   * The weights here are a page's and not a placement's, which is where this
   * parts from the reach reading's figure of the same name. It biases nothing:
   * the straddle divided out inside each page's share before the pages met, so
   * this is the measured size of a correction that has already happened.
   */
  readonly drift: number
  /**
   * Openings across the weighing pages whose reading no rollup has folded yet.
   *
   * The one error left in the share, and it is in the weights rather than in any
   * term: a lagging page weighs less than a caught-up one, which shifts the
   * evidence and not the figure.
   */
  readonly pending: number
  /**
   * No opening is waiting to be folded and nothing is unreconciled, so the
   * weights are final.
   *
   * **Not an exactness claim and there is no `exact` here**, because no term of
   * this share carries a straddle to be exact about. False under a silence.
   */
  readonly settled: boolean
  /**
   * Placements crediting more readers with acting inside them than reached them,
   * which no rollup produces.
   *
   * Counters older than the column, or a caller that concatenated two reads. It
   * is the one thing that can put {@link share} above 1, and a surface should
   * show the census instead where it is non-nought.
   */
  readonly unreconciled: number
  readonly silence: KindActionSilence | null
}

/** What a deployment's library gets its readers to do, by kind of part. */
export type LibraryAction = {
  /**
   * Every type that stands anywhere, most readers ignored first.
   *
   * Then the lower share, then by type, so two kinds that are ignored equally
   * do not reorder on a refresh. A kind with no share sorts after one whose
   * share is nought.
   */
  readonly byType: readonly KindAction[]
  /** Every role in the vocabulary, then the row for parts whose type declared none, in the same order. */
  readonly byRole: readonly KindAction[]
  /** Readings counted, which is revisions of pages and not trees. */
  readonly pages: number
  /** Distinct trees across them. */
  readonly trees: number
  /** Element nodes across them, which is the sum of every type row's placements. */
  readonly placements: number
  /** Of those, the ones bearing element parts. */
  readonly insides: number
  /** Of those, the ones with nothing inside them. `placements = insides + leaves`. */
  readonly leaves: number
  /**
   * Page views counted at the door across the pages read, added **once per
   * page**.
   *
   * Addable for the reason no other count here is: a page view began on one
   * revision of one tree and was counted once (0219). It is the weight behind
   * the whole reading and is the denominator of nothing.
   */
  readonly arrivals: number
  /** Placements by standing, over the whole library. */
  readonly standings: Readonly<Record<ActionStanding, number>>
  /**
   * The type the most readers met and did nothing inside, which is the kind to
   * look at first.
   *
   * By the **count** of page views and not by the share, for the reason a page's
   * falls are ranked by the readers they lose (0221). A type and never a role,
   * because a type is the thing an author can replace.
   *
   * **A kind that is only ever a page's root is not eligible**, which is how a
   * page's own reading treats its root (0242) and the pace reading before it
   * (0230): a root's reach is the whole page's, so such a row contains every row
   * it would outrank and would lead with *readers opened your pages and did
   * nothing* for ever. It is the row's `roots` against its `placements` that
   * decides, never the type's name — a kind is not a node, and a type that is a
   * root on one page and a band on another is a fact about a component and stays
   * in the ranking with {@link KindAction.roots} saying how much of it is
   * page-wide.
   *
   * It can only ever be a row on the door's scale, since a count is the thing
   * being ranked. {@link unranked} is how many rows had a share the ranking
   * could not see.
   */
  readonly mostIgnored: KindAction | null
  /**
   * Type rows with a share and no count, which the ranking above cannot
   * include.
   *
   * The scale-free rows, and only those: a row the ranking passes over for being
   * a page's root is excluded by design rather than for want of a scale.
   * Published because a ranking that silently skipped rows is the kind of
   * omission a surface presents as a complete answer.
   */
  readonly unranked: number
  /** Pages the door could scale, which is where every count here comes from. */
  readonly scaled: number
  /**
   * The pages bearing a measured placement that the door could not scale, by
   * tree and newest revision first, with the reason in the vocabulary a page's
   * own reading publishes (0240).
   *
   * One of these pages is why a row above is withheld — or is harmless, because
   * a page needs no scale until a second one is weighed against it. Reused from
   * the reach reading rather than restated: it is a fact about a page either way.
   */
  readonly unscaled: readonly UnscaledPage[]
  /**
   * The pages holding actions that credit nobody, by tree and newest revision
   * first.
   *
   * The sender diagnosis, and the actionable half of every `unwalked` row above.
   * Empty is the healthy state, and so is a deployment nobody acted on at all —
   * a page with no occurrences is not in this list.
   */
  readonly unwalked: readonly RevisionOf[]
  /**
   * Readings of a revision beyond the first, which were dropped.
   *
   * A caller that concatenated two reads holds one page twice, and a page twice
   * is the one way a weighted figure can lie about how much weight is behind it.
   */
  readonly duplicated: number
  /**
   * Door rows for one revision beyond the first, which were ignored.
   *
   * A store keeps one row per revision, so this is a caller's two reads again —
   * and adding them would double a page's weight against every other page.
   */
  readonly duplicatedRows: number
  /**
   * Types whose readings disagreed about the role they play, where the first
   * reading's answer stands.
   *
   * Detected off the same readings by the same rule as the other two library
   * readings, so the three cannot disagree about it.
   */
  readonly roleDisagreed: readonly PrimitiveType[]
}

/** The kind-level reason a page's reason causes, which is the same state at the other subject. */
const KIND_ACTION_OF_REACH: Readonly<Record<ReachSilence, KindActionSilence>> =
  Object.freeze({
    unmeasured: "unscaled",
    unopened: "unopened",
    uncounted: "uncounted",
  })

const NO_STANDINGS: Readonly<Record<ActionStanding, number>> = Object.freeze({
  acted: 0,
  untouched: 0,
  unknown: 0,
})

/**
 * What one page contributes to one kind, kept apart from every other page's
 * because the weights are per page.
 *
 * Two distinct view counts added across the placements of one page, which is
 * what the unit means: a page view of a page bearing three placements of a kind
 * is three page views of a place.
 */
type PageTerms = {
  reached: number
  within: number
  readonly door: PageDoor
  readonly unwalked: boolean
}

/** What one kind's row is being built out of, before it is a row. */
type Tallying = {
  readonly kind: KindKey
  role: PrimitiveRole | null
  placements: number
  insides: number
  leaves: number
  verdicts: number
  unknown: number
  unmet: number
  roots: number
  unreconciled: number
  readonly standings: Record<ActionStanding, number>
  /** One entry per page bearing an enterable placement with a verdict, keyed by revision. */
  readonly terms: Map<string, PageTerms>
}

const tallying = (kind: KindKey): Tallying => ({
  kind,
  role: null,
  placements: 0,
  insides: 0,
  leaves: 0,
  verdicts: 0,
  unknown: 0,
  unmet: 0,
  roots: 0,
  unreconciled: 0,
  standings: { ...NO_STANDINGS },
  terms: new Map(),
})

/**
 * One placement's contribution, which is nothing at all unless it has an inside
 * and a window could speak for it.
 *
 * The order is the order the claims have to be ruled out in: a leaf is excluded
 * before any row is read, because its nought is a filing rule whatever the
 * window said, and an absent row is excluded before a reach of nought, because
 * *nothing was reported* and *nobody got there* are the two states 0242 exists
 * to keep apart.
 */
const add = (
  into: Tallying,
  part: PartAction,
  page: {
    readonly revision: string
    readonly door: PageDoor
    readonly unwalked: boolean
  },
): void => {
  into.placements += 1
  into.standings[part.standing] += 1

  if (part.depth === 0) into.roots += 1

  if (!part.bearsParts) {
    into.leaves += 1

    return
  }

  into.insides += 1

  const { reached, within } = part

  if (reached === undefined || within === undefined) {
    into.unknown += 1

    return
  }

  into.verdicts += 1

  const standing = into.terms.get(page.revision)
  const terms = standing ?? {
    reached: 0,
    within: 0,
    door: page.door,
    unwalked: page.unwalked,
  }

  if (standing === undefined) into.terms.set(page.revision, terms)

  if (within > reached) into.unreconciled += 1

  if (reached === 0) {
    into.unmet += 1

    return
  }

  terms.reached += reached
  terms.within += within
}

/**
 * The figures, or the reason there are none, with the reasons tried in the order
 * they have to be tried in.
 *
 * Nothing of the kind first, because *there is no such part in this library* is
 * a better answer than every reason below it and they are all true of it by
 * accident. Then the structural reason, because a kind with no inside anywhere
 * is answered by the census and not by waiting for readers. Then the window:
 * no row, then no reader, because a kind nobody reached has no denominator
 * whether or not its pages could be scaled. Then the sender, before the door,
 * because a page crediting nobody is the sharper diagnosis and the one that
 * does not resolve itself. The door last, and only where two pages have to be
 * weighed against each other.
 */
const figuresOf = (
  of: Tallying,
  weighing: readonly PageTerms[],
): Pick<
  KindAction,
  | "met"
  | "acted"
  | "ignored"
  | "share"
  | "onDoorScale"
  | "drift"
  | "pending"
  | "silence"
> => {
  const none = {
    met: null,
    acted: null,
    ignored: null,
    share: null,
    onDoorScale: false,
    drift: 0,
    pending: 0,
  }

  if (of.placements === 0) return { ...none, silence: "unplaced" }
  if (of.insides === 0) return { ...none, silence: "unenterable" }
  if (of.verdicts === 0) return { ...none, silence: "unread" }

  const first = weighing[0]

  if (first === undefined) return { ...none, silence: "unread" }

  const drift = weighing.reduce((sum, terms) => sum + terms.door.drift, 0)
  const pending = weighing.reduce((sum, terms) => sum + terms.door.pending, 0)

  if (weighing.some((terms) => terms.unwalked)) {
    return { ...none, drift, pending, silence: "unwalked" }
  }

  /** The first page the door could not scale, as that page's own reason. */
  const blocked = weighing.reduce<ReachSilence | null>(
    (found, terms) => found ?? terms.door.silence,
    null,
  )

  /**
   * One page's own figure, with no scale in it at all.
   *
   * Reported with `onDoorScale: false` rather than with the door's numbers,
   * because this page has none: its share is sound and its counts are on the
   * counters' own scale, which is not a scale any other row's counts could be
   * added to.
   */
  if (blocked !== null && weighing.length === 1) {
    return {
      met: null,
      acted: null,
      ignored: null,
      share: first.within / first.reached,
      onDoorScale: false,
      drift,
      pending,
      silence: null,
    }
  }

  if (blocked !== null) {
    return { ...none, drift, pending, silence: KIND_ACTION_OF_REACH[blocked] }
  }

  const met = weighing.reduce(
    (sum, terms) =>
      sum + (terms.reached * terms.door.counted) / terms.door.appearances,
    0,
  )
  const acted = weighing.reduce(
    (sum, terms) =>
      sum + (terms.within * terms.door.counted) / terms.door.appearances,
    0,
  )

  return {
    met,
    acted,
    ignored: met - acted,
    share: acted / met,
    onDoorScale: true,
    drift,
    pending,
    silence: null,
  }
}

const rowOf = (of: Tallying): KindAction => {
  const weighing = [...of.terms.values()].filter((terms) => terms.reached > 0)
  const figures = figuresOf(of, weighing)

  return {
    kind: of.kind,
    role: of.kind.by === "type" ? of.role : null,
    placements: of.placements,
    insides: of.insides,
    leaves: of.leaves,
    verdicts: of.verdicts,
    unknown: of.unknown,
    unmet: of.unmet,
    roots: of.roots,
    standings: of.standings,
    pages: of.terms.size,
    weighed: weighing.length,
    ...figures,
    settled:
      figures.silence === null &&
      figures.pending === 0 &&
      of.unreconciled === 0,
    unreconciled: of.unreconciled,
  }
}

/** The name a row is ordered by, which is the key's own and never the row's position. */
const nameOf = (kind: KindKey): string =>
  kind.by === "type" ? kind.type : (kind.role ?? "")

/**
 * The worse of two, which is the ranking rule spelled once.
 *
 * Most readers ignored, then the lower share, then by name — so a kind with no
 * share at all sorts after one with a share of nought rather than above it, and
 * a scale-free row sorts on its share rather than on a count it does not have.
 */
const worseOf = (one: KindAction, other: KindAction): number =>
  (other.ignored ?? -1) - (one.ignored ?? -1) ||
  (one.share ?? 2) - (other.share ?? 2) ||
  nameOf(one.kind).localeCompare(nameOf(other.kind))

/** Tree id, then newest revision first, which is the order the page-view rows are read in. */
const byPage = (one: RevisionOf, other: RevisionOf): number =>
  one.treeId.localeCompare(other.treeId) || other.revision - one.revision

/**
 * What a deployment's library gets its readers to do, by kind of part.
 *
 * Takes the readings and the whole window of page-view rows a deployment holds —
 * each page's own row is picked out of them by the published matching rule
 * (`pageViewsFor`) rather than by a fourth hand-written copy of it, because the
 * pairing is the part of every join here that fails quietly when it is got
 * wrong.
 *
 * Linear in the parts of the readings times the rows, with one pass that fills
 * both groupings.
 */
export const libraryActionOf = (
  readings: readonly PageReading[],
  rows: readonly StoredPageViews[],
): LibraryAction => {
  const tallies = new Map<string, Tallying>()
  const seen = new Set<string>()
  const trees = new Set<TreeId>()
  const unscaled: UnscaledPage[] = []
  const unwalked: RevisionOf[] = []
  const disagreed = new Set<PrimitiveType>()
  const standings: Record<ActionStanding, number> = { ...NO_STANDINGS }
  let pages = 0
  let placements = 0
  let insides = 0
  let leaves = 0
  let arrivals = 0
  let scaled = 0
  let duplicated = 0
  let duplicatedRows = 0

  /**
   * Every role in the vocabulary gets a row whether or not anything plays it,
   * the way the other two library readings' role rows do: a role nothing plays
   * is a fact about the library worth having, and a surface that had to tell a
   * missing row from an empty one would be reading the vocabulary itself.
   */
  for (const role of [...PRIMITIVE_ROLES, null]) {
    const kind: KindKey = { by: "role", role }

    tallies.set(kindKeyOf(kind), tallying(kind))
  }

  for (const reading of readings) {
    const revision = `${reading.treeId}\u0000${reading.revision}`

    if (seen.has(revision)) {
      duplicated += 1
      continue
    }

    seen.add(revision)
    trees.add(reading.treeId)
    pages += 1

    const found = pageViewsFor(reading, rows)
    const door = doorOf(found.measured)
    const action = pageActionOf(reading)

    duplicatedRows += found.duplicated
    arrivals += door.opened

    if (door.silence === null) scaled += 1

    if (action.unwalked)
      unwalked.push({ treeId: reading.treeId, revision: reading.revision })

    /**
     * A page the door cannot scale is listed only where a window could speak for
     * something on it: a page nobody read is not a page whose readers could not
     * be counted, and listing it would put the commonest healthy state on a list
     * that is meant to be empty.
     */
    if (
      door.silence !== null &&
      reading.standings.unknown < reading.parts.length
    ) {
      unscaled.push({
        treeId: reading.treeId,
        revision: reading.revision,
        silence: door.silence,
      })
    }

    const page = { revision, door, unwalked: action.unwalked }

    for (const part of action.parts) {
      const keys: readonly KindKey[] = [
        { by: "type", type: part.type },
        { by: "role", role: part.role },
      ]

      placements += 1
      standings[part.standing] += 1

      if (part.bearsParts) insides += 1
      else leaves += 1

      for (const kind of keys) {
        const key = kindKeyOf(kind)
        const tally = tallies.get(key) ?? tallying(kind)

        if (kind.by === "type") {
          if (tally.placements === 0) tally.role = part.role
          else if (tally.role !== part.role) disagreed.add(part.type)
        }

        add(tally, part, page)
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
    insides,
    leaves,
    arrivals,
    standings,
    mostIgnored:
      byType.find((row) => (row.ignored ?? 0) > 0 && row.roots < row.placements) ?? null,
    unranked: byType.filter(
      (row) => row.share !== null && row.ignored === null && row.roots < row.placements
    ).length,
    scaled,
    unscaled: [...unscaled].sort(byPage),
    unwalked: [...unwalked].sort(byPage),
    duplicated,
    duplicatedRows,
    roleDisagreed: [...disagreed].sort((one, other) =>
      one.localeCompare(other),
    ),
  }
}
