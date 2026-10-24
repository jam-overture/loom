import type { AudienceId } from "../audience/audience.js"
import { everyMemberOf } from "../closed-set.js"
import type { NodeId, TreeId } from "../ids.js"
import type { PrimitiveType } from "../primitive-type.js"
import type { PrimitiveRole } from "../role.js"

import {
  describeFormPairRefusal,
  formPairOf,
  FORM_PAIR_REFUSALS,
  type FormPairRefusal,
} from "./audiences.js"
import { spokenFor, type PageReading, type PartReading, type PartStanding } from "./parts.js"

/**
 * Two forms of one page, side by side.
 *
 * A page is one base tree plus the deltas an audience earns
 * ([0263](../../decisions/0263-a-page-is-a-base-tree-and-the-deltas-an-audience-earns.md)),
 * so a deployment serving two audiences serves two forms of one tree at one
 * revision, told apart by a column and nothing else
 * ([0284](../../decisions/0284-a-signal-names-the-audience-it-was-collected-under-and-the-predicate-stays-in-the-control-plane.md)).
 * Every comparison in this subsystem until now varies the **tree** and holds the
 * readership still. This one does the opposite: it holds the tree and the
 * revision still and varies the readership, which is the question a deployment
 * that earned a second form actually has. *Do the riders read this page the way
 * the skiers do, and does each of them get the same page at all?*
 *
 * `docs/signals.md` §36 named it and did not build it, with the instruction
 * that matters most here: **it must not borrow `changeOf`.** That reading's
 * arithmetic would run and its sentence — *this is what your change did* —
 * would be false of every figure, because nothing changed. The two readings
 * are of one revision.
 *
 * Nothing is collected for it. Two readings go in and a comparison comes out,
 * which makes it the thirty-third thing taken out of the server-side join
 * rather than added to a payload, a browser, a column or the vocabulary of
 * kinds.
 *
 * ## Neither side is earlier, so the order is not the caller's to set
 *
 * `formPairOf` settles which side is {@link FormComparison.one} and refuses the
 * five pairs that are not two forms of one page. The rule and its reasons are
 * published there, with the five refusals, because they are facts about the
 * **pair** rather than about the counter this reading compares — and a second
 * comparison of two forms (0303) wants every one of them with no clause
 * changed. What stays here is the consequence: the answer is the same whichever
 * way round it is asked, which is asserted rather than described.
 *
 * ## The figure that is comparable across two populations
 *
 * A `reached` count is not: two forms are served to two sets of people, so one
 * form reporting more readers is very often one form having more readers.
 * **A share of a side's own views is**, by the argument 0221 gives for a stop
 * and 0224 for two revisions, applied here to a part across two populations:
 * {@link FormPartSide.reach} is `readers ÷ views` off one side's own rows, so
 * each side's straddle over-count
 * ([0147](../../decisions/0147-a-rollup-is-added-to-what-is-stored-and-a-distinct-view-count-is-therefore-approximate.md))
 * has very nearly divided out before the two sides meet.
 *
 * ## What a difference here cannot be attributed to, and the census that says so
 *
 * **A difference between two forms has two causes and nothing in the counters
 * separates them.** The deltas changed what is on the page *and* the people
 * reading it are different, both by construction. §20 exists so that a
 * before-and-after can report when its readership moved; here that confounder
 * is permanently true and is not a fault to be detected. It is the shape of the
 * question.
 *
 * So this reading states the content half rather than estimating it.
 * {@link FormComparison.onlyIn} is every part exactly one of the two forms has,
 * which is what the deltas did made visible, and
 * {@link FormComparison.disagreed} is every shared node the two forms give
 * different primitive types — the sharper version of the same fact. What is
 * left after both of those is a part both forms really have, where the only
 * remaining difference is the readers. That is the comparison, and the honest
 * sentence over it is *the skiers reach this band more often than the riders
 * do* and never *this band reads better*.
 *
 * ## What it refuses to add up
 *
 * There is no page-level figure for *which form reads better*, and the absence
 * is deliberate for two reasons that both have to be answered and neither is.
 * A reader who reached the second band and the third is in both parts' figures,
 * so a mean over parts counts one reader as many times as they got through —
 * the distinctness trap 0147 wrote down for views and
 * [0167](../../decisions/0167-a-delegated-signal-names-the-regions-it-happened-inside.md)
 * for presses. And the two forms do not have the same parts, so a mean over
 * each side's own parts has two denominators that are not the same page.
 * {@link FormComparison.counted} is the count of parts falling each way, which
 * is a figure over one shared set and needs no mean, and
 * {@link FormComparison.sharpest} is the one row somebody would act on.
 *
 * Pure, linear in the parts of the two readings, and reaches no store, clock or
 * DOM. A caller checks {@link PageReading.orphaned} on both readings before
 * trusting either, exactly as it must before trusting either on its own.
 */

/** Why a comparison of two forms answered nothing, or answered less than all of it. */
export type FormComparisonSilence =
  /**
   * The five states in which two readings are not two forms of one page, taken
   * whole from {@link FormPairRefusal}.
   *
   * They were written here first and moved once a second comparison of two
   * forms wanted every one of them unchanged: each is a fact about the pair
   * rather than about the counter being compared, so the rule belongs where
   * both readings can import it instead of where one of them can be copied
   * from.
   */
  | FormPairRefusal
  /**
   * One of the two windows held no page views.
   *
   * **The one member here that is not a refusal**, and it is spelled as
   * `CopyChangeSilence.nothing-measured` is for the same reason: the parts
   * census is a fact about the two composed trees and stays true of a window
   * nobody read. *The pro form of this page has three bands the free form does
   * not, and nothing has been measured on either* is a sentence worth printing.
   * Every per-part reach on that side is `null`, so every
   * {@link ComparedForm.gap} is withheld and nothing falls either way.
   */
  | "nothing-measured"

/** The closed set, for a surface that has to account for every absent figure. */
export const FORM_COMPARISON_SILENCES: readonly FormComparisonSilence[] =
  everyMemberOf<FormComparisonSilence>()([...FORM_PAIR_REFUSALS, "nothing-measured"])

/** One line per silence, for a surface saying why a figure is not there. */
export const describeFormComparisonSilence = (silence: FormComparisonSilence): string =>
  silence === "nothing-measured"
    ? "one of the two windows held no page views"
    : describeFormPairRefusal(silence)

/** One side of the comparison, as the window it was read from leaves it. */
export type FormSide = {
  readonly treeId: TreeId
  readonly revision: number
  /** `null` where the window named none, or named two with neither asked for. */
  readonly audienceId: AudienceId | null
  /**
   * That side's page-view floor, which is the denominator of every reach below.
   *
   * A floor rather than a count, for the reason `parts.ts` gives: distinct view
   * counts cannot be added across rows (0147), so the largest row is the most
   * that can be said from counters alone.
   */
  readonly views: number
  /** Element nodes this form has, which two forms of one page need not share. */
  readonly parts: number
}

/** What one side's window says about one part of it. */
export type FormPartSide = {
  readonly standing: PartStanding
  /** Distinct page views of this form that reported the part coming into view. */
  readonly readers: number
  /** That side's own view floor, carried so the share below can be checked. */
  readonly views: number
  /**
   * {@link FormPartSide.readers} over {@link FormPartSide.views}, or `null`
   * where that window held none.
   *
   * A ceiling on the share of that form's readers who reached the part:
   * `reached` leans up by the views that straddled a rollup window (0147) and
   * `views` leans down by being a floor, and the same lean is in both terms of
   * each side. Above 1 is not clamped — a figure cut to fit its own ceiling is a
   * fault made undrawable rather than visible.
   */
  readonly reach: number | null
}

/** A part exactly one of the two forms has, with the form that has it named. */
export type PartOfForm = {
  readonly nodeId: NodeId
  readonly type: PrimitiveType
  readonly role: PrimitiveRole | null
  /** The form this part is in. The other form does not have this node at all. */
  readonly audienceId: AudienceId
  readonly side: FormPartSide
}

/** A part both forms have, read by each form's own readers. */
export type ComparedForm = {
  readonly nodeId: NodeId
  /** The type {@link FormComparison.one} gives it; `disagreed` names the pair if the other differs. */
  readonly type: PrimitiveType
  readonly role: PrimitiveRole | null
  readonly one: FormPartSide
  readonly other: FormPartSide
  /**
   * The form whose readers reached it more often, or `null` where no claim
   * stands.
   *
   * `null` with a {@link ComparedForm.gap} of nought is the two forms reaching
   * it alike; `null` with a `gap` of `null` is nothing being sayable. The two
   * are a long way apart and are deliberately not one value.
   */
  readonly favours: AudienceId | null
  /**
   * The distance between the two reaches, which is never signed.
   *
   * `|one.reach − other.reach|`, with the direction in
   * {@link ComparedForm.favours} rather than in the sign — because a sign is
   * read against an order, and the order here is the alphabet of two audience
   * names and means nothing.
   *
   * `null` where either side held no views **or** either side's standing is
   * `unknown` (0282): a reach of nought that is a missing counter is not a
   * reader who did not arrive, and subtracting against it would publish the
   * other side's whole reach as a difference between two populations.
   */
  readonly gap: number | null
}

/** How the shared parts fell, as a count over one set and never a mean. */
export type FormsCounted = {
  /** Parts {@link FormComparison.one}'s readers reached more often. */
  readonly one: number
  /** Parts {@link FormComparison.other}'s readers reached more often. */
  readonly other: number
  /** Parts the two forms reached alike. */
  readonly alike: number
  /** Parts where one side or the other cannot say. */
  readonly unknown: number
}

/**
 * Two forms of one page held against each other.
 *
 * There is no `treeId` or `revision` at the top of this reading, where every
 * other reading in this subsystem has one, and the absence is the point: this
 * is a reading of two sides rather than of one page, and the two refusals that
 * matter most are exactly the two where picking one side's would be picking one
 * of two different answers.
 */
export type FormComparison = {
  /** The side whose audience id sorts lower, or the first argument where no pair of names stands. */
  readonly one: FormSide
  readonly other: FormSide
  /** Parts both forms have, in the reading order of {@link FormComparison.one}. */
  readonly compared: readonly ComparedForm[]
  /** Parts exactly one form has, by audience and then by node. */
  readonly onlyIn: readonly PartOfForm[]
  /**
   * Shared nodes the two forms give different primitive types.
   *
   * Reported and not dropped, the way `LibraryReading.roleDisagreed` is: the
   * two reaches are each their own form's and stay comparable, while a pair that
   * is a band on one side and a card on the other is a fact about the deltas
   * nobody would otherwise see.
   */
  readonly disagreed: readonly NodeId[]
  readonly counted: FormsCounted
  /** The shared part with the widest gap, by node id where two tie; `null` where none can say. */
  readonly sharpest: ComparedForm | null
  readonly silence: FormComparisonSilence | null
}

const NOTHING_COUNTED: FormsCounted = Object.freeze({ one: 0, other: 0, alike: 0, unknown: 0 })

const sideOf = (reading: PageReading): FormSide => ({
  treeId: reading.treeId,
  revision: reading.revision,
  audienceId: reading.audienceId,
  views: reading.views,
  parts: reading.parts.length,
})

const partSideOf = (part: PartReading, views: number): FormPartSide => {
  const readers = part.counters?.reached ?? 0

  return {
    standing: part.standing,
    readers,
    views,
    reach: views > 0 ? readers / views : null,
  }
}

/**
 * The gap, and the rule that withholds it.
 *
 * Both sides have to be spoken for before a difference between them is a
 * difference between two populations rather than between a measurement and a
 * missing row (0282) — which is the same restriction `ComparedPassage.gain`
 * carries, said of a part instead of a passage.
 */
const gapOf = (one: FormPartSide, other: FormPartSide): number | null =>
  one.reach === null || other.reach === null || !spokenFor(one.standing) || !spokenFor(other.standing)
    ? null
    : Math.abs(one.reach - other.reach)

const favouredBy = (
  gap: number | null,
  one: FormPartSide,
  other: FormPartSide,
  audiences: { readonly one: AudienceId; readonly other: AudienceId }
): AudienceId | null => {
  if (gap === null || gap === 0) return null

  return (one.reach ?? 0) > (other.reach ?? 0) ? audiences.one : audiences.other
}

/** The parts of a reading by node, which the two sides are joined on. */
const partsOf = (reading: PageReading): ReadonlyMap<NodeId, PartReading> =>
  new Map(reading.parts.map((part) => [part.nodeId, part]))

/**
 * Hold two forms of one page against each other.
 *
 * Takes two page readings, each of one audience, of one tree at one revision.
 * The labels are not `was` and `now` and the order of the arguments does not
 * reach the answer: see the module documentation, and
 * {@link FormComparisonSilence} for the five states in which there is no pair.
 */
export const formComparisonOf = (one: PageReading, other: PageReading): FormComparison => {
  const pair = formPairOf(one, other)
  const [first, second] = [pair.one, pair.other]

  if (pair.pairing === "refused")
    return {
      one: sideOf(first),
      other: sideOf(second),
      compared: [],
      onlyIn: [],
      disagreed: [],
      counted: NOTHING_COUNTED,
      sharpest: null,
      silence: pair.refusal,
    }

  const audiences = pair.audiences
  const held = { one: partsOf(first), other: partsOf(second) }

  const compared: ComparedForm[] = []
  const onlyIn: PartOfForm[] = []
  const disagreed: NodeId[] = []
  const counted = { ...NOTHING_COUNTED }

  for (const part of first.parts) {
    const across = held.other.get(part.nodeId)

    if (across === undefined) {
      onlyIn.push({
        nodeId: part.nodeId,
        type: part.type,
        role: part.role,
        audienceId: audiences.one,
        side: partSideOf(part, first.views),
      })
      continue
    }

    if (across.type !== part.type) disagreed.push(part.nodeId)

    const sides = {
      one: partSideOf(part, first.views),
      other: partSideOf(across, second.views),
    }
    const gap = gapOf(sides.one, sides.other)
    const favours = favouredBy(gap, sides.one, sides.other, audiences)

    if (gap === null) counted.unknown += 1
    else if (favours === null) counted.alike += 1
    else if (favours === audiences.one) counted.one += 1
    else counted.other += 1

    compared.push({
      nodeId: part.nodeId,
      type: part.type,
      role: part.role,
      one: sides.one,
      other: sides.other,
      favours,
      gap,
    })
  }

  for (const part of second.parts) {
    if (held.one.has(part.nodeId)) continue

    onlyIn.push({
      nodeId: part.nodeId,
      type: part.type,
      role: part.role,
      audienceId: audiences.other,
      side: partSideOf(part, second.views),
    })
  }

  /**
   * The widest gap, with the node id as the tiebreak so that two parts a form
   * reaches equally differently do not swap places between two reads of one
   * store.
   */
  const sharpest = compared.reduce<ComparedForm | null>((widest, part) => {
    if (part.gap === null) return widest
    if (widest === null || widest.gap === null) return part
    if (part.gap > widest.gap) return part

    return part.gap === widest.gap && part.nodeId.localeCompare(widest.nodeId) < 0 ? part : widest
  }, null)

  return {
    one: sideOf(first),
    other: sideOf(second),
    compared,
    onlyIn: [...onlyIn].sort(
      (a, b) => a.audienceId.localeCompare(b.audienceId) || a.nodeId.localeCompare(b.nodeId)
    ),
    disagreed: [...disagreed].sort((a, b) => a.localeCompare(b)),
    counted,
    sharpest,
    silence: first.views === 0 || second.views === 0 ? "nothing-measured" : null,
  }
}
