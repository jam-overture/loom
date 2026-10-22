import type { AudienceId } from "../audience/audience.js"
import { everyMemberOf } from "../closed-set.js"
import type { NodeId, TreeId } from "../ids.js"
import type { PrimitiveType } from "../primitive-type.js"
import type { PrimitiveRole } from "../role.js"

import { pageActionOf, type PageAction, type PartAction } from "./action.js"
import {
  describeFormPairRefusal,
  formPairOf,
  FORM_PAIR_REFUSALS,
  type FormPairRefusal,
} from "./audiences.js"
import type { PageReading } from "./parts.js"

/**
 * What readers *do* inside a page, form by form.
 *
 * The second of the two comparisons [0302](../../decisions/0302-two-forms-of-one-page-are-compared-at-each-forms-own-share-and-neither-side-is-earlier.md)
 * named and did not build. `formComparisonOf` holds two forms of one page
 * against each other on each part's **reach** — did this audience's readers
 * get here. This one asks the next question of the same pair: having got here,
 * did they *do* anything. *The riders open the size guide twice as often as
 * the skiers, and neither of them touches the finance band.*
 *
 * Nothing is collected for it. Two readings go in and a comparison comes out,
 * which makes it the thirty-fourth thing taken out of the server-side join
 * rather than added to a payload, a browser, a column or the vocabulary of
 * kinds.
 *
 * ## What it borrows, and the reason borrowing is the unit
 *
 * The five states in which two readings are **not** two forms of one page are
 * `FormPairRefusal` in [`audiences.ts`](audiences.ts), imported here and in
 * `forms.ts` rather than spelled twice. That is not tidying: 0302's six clauses
 * are about the **pair** — one tree, one revision, two provable populations,
 * neither of them earlier — and a second reading of the same pair restates none
 * of them. A rule written in two places is a rule one of its copies will
 * disagree with, which is what `readingKeyOf` and `formKeyOf` exist to stop one
 * level up, and this is the same argument at the comparison.
 *
 * So what is this module's own is one figure and the two things that figure
 * cannot survive.
 *
 * ## The figure, and why this reading has a page-level one where its sibling does not
 *
 * The comparable figure is {@link PartAction.share} — `within ÷ reached`, the
 * readers who reached a part and did something strictly inside it (0167, 0242).
 * Both terms are distinct page-view counts off **one row**, so the straddle
 * over-count (0147) is very nearly common to the numerator and the denominator
 * and divides out before the two populations meet, exactly as a reach share
 * does in `forms.ts` and a fall does in `progress.ts` (0221).
 *
 * **And here the page as a whole has an honest figure, where the reach
 * comparison refuses one.** 0302 clause 5 refuses a page-level verdict for two
 * reasons: a mean over parts charges one reader once per part they got through,
 * and two forms do not have the same parts, so two such means have two
 * denominators that are not the same page. Neither reaches the root.
 * {@link PageAction.whole} is **one part's own row** — every action anywhere on
 * the page is strictly inside the root (0242) — so *three in ten skiers did
 * something on this page and one in ten riders did* is one division per side
 * and no addition at all. {@link FormActionComparison.whole} is that row, held
 * against itself across the two forms, and it is the only page-level claim
 * either form comparison makes.
 *
 * It is kept out of {@link FormActionComparison.sharpest} because the page
 * contains every part it would outrank, which is how `pageActionOf` treats it
 * for `mostIgnored` and `pageReadingOf` before that. It stays **inside**
 * {@link FormActionComparison.counted}, because that is a census of the shared
 * parts and a census that leaves one out does not account for the page.
 *
 * ## The two states the figure cannot survive
 *
 * **A leaf has no inside**, so `engaged` is structurally nought on it and a
 * share built from that nought is a filing rule misread as a finding about
 * readers (0167, 0242). `PartAction.share` is already withheld there, and on a
 * part with no row and on a part whose `reached` is nought — the three states
 * its standing calls `unknown`. So the withholding rule here is **one check
 * where `forms.ts` needs two**: a withheld share and an unknown standing are
 * the same fact said twice and never disagree, which `action.ts` guarantees and
 * this module relies on rather than re-deriving.
 *
 * **A sender that does not walk** is the other, and it is this reading's own
 * silence. A press is filed against the control and credited to its addressed
 * ancestors from the ancestry the signal carries (0167), so a window whose
 * delegated signals have no `within` reports occurrences and credits no reader
 * with acting inside anything: every share on that side is a **nought that is a
 * filing artefact**, not a reader who did nothing. Subtracting the other form's
 * real share against it would publish that form's whole share as a difference
 * between two populations — which is the rule 0282 already applies to an
 * unknown standing, reaching a second state by the same argument. So
 * {@link ComparedFormAction.gap} is withheld on **every** shared part where
 * either side is unwalked, the parts fall into `unknown`, and
 * {@link FormActionSilence.unwalked} says which state the reading is in.
 *
 * That withholding is **`pageActionOf`'s own** since 0304 — 0303 spelled it
 * here, in a second clause of `gapOf`, and the rule moved down to the reading
 * that can see the fault once the before-and-after needed it too. Nothing about
 * this reading's answer changed, which is what its suite asserts.
 *
 * Pure, linear in the parts of the two readings, and reaches no store, clock or
 * DOM. A caller checks `PageReading.orphaned` on both readings before trusting
 * either, exactly as it must before trusting either on its own.
 */

/** Why a comparison of what two forms' readers did answered nothing, or less than all of it. */
export type FormActionSilence =
  /**
   * The five states in which two readings are not two forms of one page.
   *
   * Imported from {@link FormPairRefusal} rather than restated, for the reason
   * the module documentation gives: every one of them is a fact about the pair
   * and none of them is about the counter.
   */
  | FormPairRefusal
  /**
   * One of the two windows holds uses and credits no reader with acting inside
   * anything.
   *
   * `PageAction.unwalked` on either side: a sender whose delegated signals
   * carry no `within` (0167), a server synthesising batches, a fixture
   * replayed. Every share on that side is a nought that is a filing artefact,
   * so every gap across it would be the other form's whole share reported as a
   * difference between two populations.
   *
   * **The figures are withheld as well as the state named.** The spurious
   * nought would be read as *this audience does nothing on your page*, which is
   * the most confident wrong sentence this reading could print. That was argued
   * here first (0303), with `ActionChangeSilence.unwalked` left naming the state
   * alone, and settled for both by moving the rule into the reading (0304), so
   * the two no longer differ. The census of what each form has still answers,
   * because which parts a form carries is a fact about the deltas and about no
   * counter.
   *
   * Checked before `nothing-measured`, and **a single
   * window can reach both**, so the order is a decision rather than reading
   * order: a side with no page views and occurrences filed against its parts is
   * a sender that is not one, and *this window does not report where actions
   * happened* is the sharper of the two things to say about it.
   */
  | "unwalked"
  /**
   * One of the two windows held no page views.
   *
   * Every standing on that side is `unknown` (0242), so there is no share to
   * compare and every gap is already withheld. **The census still answers**,
   * which is what this member has in common with its spelling everywhere else:
   * *the pro form has three bands the free form does not, and nothing has been
   * measured on either* is a sentence worth printing.
   */
  | "nothing-measured"

/** The closed set, for a surface that has to account for every absent figure. */
export const FORM_ACTION_SILENCES: readonly FormActionSilence[] =
  everyMemberOf<FormActionSilence>()([...FORM_PAIR_REFUSALS, "unwalked", "nothing-measured"])

/** One line per silence, for a surface saying why a figure is not there. */
export const describeFormActionSilence = (silence: FormActionSilence): string => {
  switch (silence) {
    case "unwalked":
      return "one of the two windows does not report where actions happened, so its shares are noughts"
    case "nothing-measured":
      return "one of the two windows held no page views"
    default:
      return describeFormPairRefusal(silence)
  }
}

/** One side of the comparison, as the reading of what its readers did leaves it. */
export type FormActionSide = {
  readonly treeId: TreeId
  readonly revision: number
  /** `null` where the window named none, or named two with neither asked for. */
  readonly audienceId: AudienceId | null
  /**
   * That side's page-view floor, carried through unchanged.
   *
   * A floor rather than a count, for the reason `parts.ts` gives: distinct view
   * counts cannot be added across rows (0147), so the largest row is the most
   * that can be said from counters alone. Nothing here divides by it — every
   * share in this reading is off one row — and it is carried so a surface can
   * say how big each population was beside what it did.
   */
  readonly views: number
  /** Element nodes this form has, which two forms of one page need not share. */
  readonly parts: number
  /** Parts with no element parts under them, whose share is withheld structurally. */
  readonly leaves: number
  /** Whether this side holds uses and credits them to nobody (0167). */
  readonly unwalked: boolean
}

/** A part exactly one of the two forms has, with the form that has it named. */
export type PartActionOfForm = {
  readonly nodeId: NodeId
  readonly type: PrimitiveType
  readonly role: PrimitiveRole | null
  /** The form this part is in. The other form does not have this node at all. */
  readonly audienceId: AudienceId
  readonly side: PartAction
}

/**
 * A part both forms have, as each form's own readers used it.
 *
 * Each side is the whole {@link PartAction} rather than a narrowed copy of it,
 * because that reading already withholds its share in exactly the states where
 * a share is not a measurement, and a second type restating three of its fields
 * would be a second place to get that wrong.
 */
export type ComparedFormAction = {
  readonly nodeId: NodeId
  /** The type {@link FormActionComparison.one} gives it; `disagreed` names the pair if the other differs. */
  readonly type: PrimitiveType
  readonly role: PrimitiveRole | null
  readonly one: PartAction
  readonly other: PartAction
  /**
   * The form whose readers acted inside it more often, or `null` where no claim
   * stands.
   *
   * `null` with a {@link ComparedFormAction.gap} of nought is the two forms
   * acting alike; `null` with a `gap` of `null` is nothing being sayable. The
   * two are a long way apart and are deliberately not one value.
   */
  readonly favours: AudienceId | null
  /**
   * The distance between the two shares, which is never signed.
   *
   * `|one.share − other.share|`, with the direction in
   * {@link ComparedFormAction.favours} rather than in the sign — because a sign
   * is read against an order, and the order here is the alphabet of two
   * audience names and means nothing (0302).
   *
   * `null` where either side withholds its share — a leaf, a part with no row,
   * a part nobody reached — **and on every part of a pair where either side is
   * unwalked**, where the noughts are a filing artefact rather than readers who
   * did nothing.
   */
  readonly gap: number | null
}

/** How the shared parts fell, as a count over one set and never a mean. */
export type FormActionsCounted = {
  /** Parts {@link FormActionComparison.one}'s readers acted inside more often. */
  readonly one: number
  /** Parts {@link FormActionComparison.other}'s readers acted inside more often. */
  readonly other: number
  /** Parts the two forms acted inside alike. */
  readonly alike: number
  /** Parts where one side or the other cannot say. */
  readonly unknown: number
}

/**
 * What two forms' readers did inside one page, held against each other.
 *
 * There is no `treeId` or `revision` at the top, where every reading of one
 * page has one, for the reason 0302 gives: this is a reading of two sides
 * rather than of one page, and the two refusals that matter most are exactly
 * the two where picking one side's would be picking one of two answers.
 */
export type FormActionComparison = {
  /** The side whose audience id sorts lower, or the first argument where no pair of names stands. */
  readonly one: FormActionSide
  readonly other: FormActionSide
  /** The two readings this comparison was taken from, so nothing downstream derives them twice. */
  readonly readings: { readonly one: PageAction; readonly other: PageAction }
  /** Parts both forms have, in the reading order of {@link FormActionComparison.one}. */
  readonly compared: readonly ComparedFormAction[]
  /** Parts exactly one form has, by audience and then by node. */
  readonly onlyIn: readonly PartActionOfForm[]
  /**
   * Shared nodes the two forms give different primitive types.
   *
   * Reported and not dropped, as `FormComparison.disagreed` is: the two shares
   * are each their own form's and stay comparable, while a pair that is a band
   * on one side and a card on the other is a fact about the deltas nobody would
   * otherwise see.
   */
  readonly disagreed: readonly NodeId[]
  /**
   * Shared nodes one form gives an inside and the other does not.
   *
   * The diagnosis this reading needs and its sibling does not. A share is
   * withheld on a leaf for a structural reason, so a part the deltas filled for
   * one audience and left bare for the other has a share on one side and none
   * on the other — and the pair lands in `unknown` with nothing saying why.
   * *The riders' version of this band has nothing in it* is the answer, and it
   * is a fact about the deltas rather than about either readership.
   */
  readonly insideDisagreed: readonly NodeId[]
  readonly counted: FormActionsCounted
  /**
   * The root, held against itself across the two forms.
   *
   * The one page-level claim either form comparison makes, and it is a division
   * rather than an addition: see the module documentation. `null` where the
   * revision's root is not an element part of both forms.
   */
  readonly whole: ComparedFormAction | null
  /**
   * The shared part with the widest gap, by node id where two tie.
   *
   * The page itself is never it, because it contains every part it would
   * outrank. `null` where nothing can say.
   */
  readonly sharpest: ComparedFormAction | null
  readonly silence: FormActionSilence | null
}

const NOTHING_COUNTED: FormActionsCounted = Object.freeze({
  one: 0,
  other: 0,
  alike: 0,
  unknown: 0,
})

const sideOf = (reading: PageAction, audienceId: AudienceId | null): FormActionSide => ({
  treeId: reading.treeId,
  revision: reading.revision,
  audienceId,
  views: reading.views,
  parts: reading.parts.length,
  leaves: reading.leaves,
  unwalked: reading.unwalked,
})

/**
 * The gap, and the one rule that withholds it.
 *
 * A share is absent wherever it is not a measurement, which is the whole of it:
 * a leaf, a part with no row and a part nobody reached (0242), **and every part
 * of an unwalked window** (0304). 0303 withheld the second case here, with a
 * `walked` argument of its own; the rule now lives in the reading that can see
 * the fault, so this is one check again and the cases cannot disagree.
 */
const gapOf = (one: PartAction, other: PartAction): number | null =>
  one.share === undefined || other.share === undefined
    ? null
    : Math.abs(one.share - other.share)

const favouredBy = (
  gap: number | null,
  one: PartAction,
  other: PartAction,
  audiences: { readonly one: AudienceId; readonly other: AudienceId }
): AudienceId | null => {
  if (gap === null || gap === 0) return null

  return (one.share ?? 0) > (other.share ?? 0) ? audiences.one : audiences.other
}

/** The parts of a reading by node, which the two sides are joined on. */
const partsOf = (reading: PageAction): ReadonlyMap<NodeId, PartAction> =>
  new Map(reading.parts.map((part) => [part.nodeId, part]))

/**
 * Hold what two forms' readers did against each other.
 *
 * Takes two page readings, each of one audience, of one tree at one revision,
 * and derives what readers did on each — handed two readings rather than two
 * finished `PageAction`s for the reason `actionChangeOf` is: one input per side
 * cannot be a mismatched pair, and the two it derives travel on the comparison
 * so nothing downstream pays for them twice.
 *
 * The labels are not `was` and `now` and the order of the arguments does not
 * reach the answer: see `formPairOf`, and {@link FormActionSilence} for the
 * seven states in which there is no figure.
 */
export const formActionComparisonOf = (
  one: PageReading,
  other: PageReading
): FormActionComparison => {
  const pair = formPairOf(one, other)
  const readings = { one: pageActionOf(pair.one), other: pageActionOf(pair.other) }

  if (pair.pairing === "refused")
    return {
      one: sideOf(readings.one, pair.one.audienceId),
      other: sideOf(readings.other, pair.other.audienceId),
      readings,
      compared: [],
      onlyIn: [],
      disagreed: [],
      insideDisagreed: [],
      counted: NOTHING_COUNTED,
      whole: null,
      sharpest: null,
      silence: pair.refusal,
    }

  const audiences = pair.audiences
  const held = { one: partsOf(readings.one), other: partsOf(readings.other) }

  const compared: ComparedFormAction[] = []
  const onlyIn: PartActionOfForm[] = []
  const disagreed: NodeId[] = []
  const insideDisagreed: NodeId[] = []
  const counted = { ...NOTHING_COUNTED }

  for (const part of readings.one.parts) {
    const across = held.other.get(part.nodeId)

    if (across === undefined) {
      onlyIn.push({
        nodeId: part.nodeId,
        type: part.type,
        role: part.role,
        audienceId: audiences.one,
        side: part,
      })
      continue
    }

    if (across.type !== part.type) disagreed.push(part.nodeId)
    if (across.bearsParts !== part.bearsParts) insideDisagreed.push(part.nodeId)

    const gap = gapOf(part, across)
    const favours = favouredBy(gap, part, across, audiences)

    if (gap === null) counted.unknown += 1
    else if (favours === null) counted.alike += 1
    else if (favours === audiences.one) counted.one += 1
    else counted.other += 1

    compared.push({
      nodeId: part.nodeId,
      type: part.type,
      role: part.role,
      one: part,
      other: across,
      favours,
      gap,
    })
  }

  for (const part of readings.other.parts) {
    if (held.one.has(part.nodeId)) continue

    onlyIn.push({
      nodeId: part.nodeId,
      type: part.type,
      role: part.role,
      audienceId: audiences.other,
      side: part,
    })
  }

  const whole = compared.find((part) => part.one.depth === 0 && part.other.depth === 0) ?? null

  /**
   * The widest gap, with the node id as the tiebreak so that two parts a form
   * acts in equally differently do not swap places between two reads of one
   * store.
   */
  const sharpest = compared.reduce<ComparedFormAction | null>((widest, part) => {
    if (part.gap === null || part === whole) return widest
    if (widest === null || widest.gap === null) return part
    if (part.gap > widest.gap) return part

    return part.gap === widest.gap && part.nodeId.localeCompare(widest.nodeId) < 0 ? part : widest
  }, null)

  const silence = (): FormActionSilence | null => {
    if (readings.one.unwalked || readings.other.unwalked) return "unwalked"

    return readings.one.views === 0 || readings.other.views === 0 ? "nothing-measured" : null
  }

  return {
    one: sideOf(readings.one, audiences.one),
    other: sideOf(readings.other, audiences.other),
    readings,
    compared,
    onlyIn: [...onlyIn].sort(
      (a, b) => a.audienceId.localeCompare(b.audienceId) || a.nodeId.localeCompare(b.nodeId)
    ),
    disagreed: [...disagreed].sort((a, b) => a.localeCompare(b)),
    insideDisagreed: [...insideDisagreed].sort((a, b) => a.localeCompare(b)),
    counted,
    whole,
    sharpest,
    silence: silence(),
  }
}
