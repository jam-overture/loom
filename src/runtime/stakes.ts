import { z } from "zod"

import type { PrimitiveType } from "../primitive-type.js"

import type { ChangeAnalysis } from "./analysis.js"
import { describeNestedTarget } from "./nesting.js"
import type { GatePolicy } from "./policy.js"
import type { DiscardedWork } from "./proposal.js"
import { describeRedirectedSubmission } from "./redirection.js"
import { describeRepointedBinding } from "./repointing.js"
import {
  describeInvalidProps,
  describeUnknownPrimitive,
  describeUnplacedSlot,
  describeUnreadBinding,
} from "./vocabulary.js"
import { highestStake, type StakeLevel } from "./stake-level.js"

/**
 * Stakes assessment: facts plus policy in, a level plus its reasons out.
 *
 * Every factor is recorded rather than collapsed, so a disposition can explain
 * itself. "High stakes" is not useful feedback; "this removes 14 nodes and
 * touches commerce.checkout" is.
 *
 * Stakes measure damage only. Whether a change can be taken back is a separate
 * axis assessed separately — a change can be devastating and trivially
 * reversible, or tiny and permanent, and the Gate needs to see those two
 * properties independently rather than pre-blended into one number.
 *
 * Every factor but one is a fact about the delta against the tree. The
 * exception, `discards-later-work`, is a fact about the log the delta was
 * computed from, which no amount of looking at the delta can recover (0035).
 */

/**
 * Which rule a factor is, as a closed vocabulary rather than a bare union.
 *
 * A schema because the codes leave the process. A telemetry record carries them
 * so that a corpus can group refusals by the rule that caused one, and anything
 * crossing that boundary has to be parsed on the way back in. This is the same
 * bargain `stakeLevelSchema` and `dispositionReasonSchema` already make, and it
 * is deliberately *not* the bargain `telemetryFailureSchema.code` makes: an
 * error taxonomy is open because adding a code elsewhere in the codebase must
 * not invalidate yesterday's records, whereas this list is the Gate's own
 * vocabulary and a record naming a rule this version has never heard of is a
 * record it genuinely cannot interpret.
 *
 * The order is the order `FACTORS` evaluates in, which is severity-ish and not
 * arithmetic: nothing reads an index here, unlike `STAKE_ORDER` (0166).
 */
export const stakeFactorCodeSchema = z.enum([
  "protected-type-removed",
  "protected-type-touched",
  "protected-type-relocated",
  "protected-prop-configured",
  "large-removal",
  "broad-change",
  "shallow-structural-change",
  "discards-later-work",
  "nested-target",
  "unknown-primitive",
  "invalid-props",
  "unread-binding",
  "unplaced-slot",
  "redirected-submission",
  "repointed-binding",
])

export type StakeFactorCode = z.infer<typeof stakeFactorCodeSchema>

/**
 * Every rule the Gate can raise, walkable.
 *
 * Derived rather than declared: the members come from a schema, so a second
 * hand-written list would be the copy `closed-set.ts` exists to avoid. Two
 * surfaces hold a plain-language table keyed by this union and both reached for
 * `Object.keys(...) as StakeFactorCode[]` to walk it, which is a cast standing
 * in for a list.
 */
export const STAKE_FACTOR_CODES: readonly StakeFactorCode[] = stakeFactorCodeSchema.options

export type StakeFactor = {
  readonly code: StakeFactorCode
  readonly level: StakeLevel
  readonly detail: string
}

export type StakeAssessment = {
  readonly level: StakeLevel
  readonly factors: readonly StakeFactor[]
}

/**
 * Everything the damage estimate is computed from: what the delta does, and
 * what its author declared it writes over.
 *
 * A record rather than a trailing argument, for the reason `Commit.answeredBy`
 * gives: an input that can be left off the end is one that will be, and leaving
 * this one off silently lowers the stakes of a change that discards work.
 */
export type StakeInput = {
  readonly analysis: ChangeAnalysis
  /** Empty when the proposal declared nothing, which is not the same as nothing. */
  readonly discards: readonly DiscardedWork[]
}

/**
 * The rules whose level is fixed at the code, and the level each one is fixed
 * at.
 *
 * Every rule in this file is one of two kinds, and the difference is which
 * question it answers. Seven of them ask *how much of this deployment's page
 * does this touch* — how many nodes went, how broad it was, how shallow, which
 * of the types this host declared it cares about — so moving a field of the
 * policy moves the answer. The other eight ask *is this change coherent at all*:
 * a target nobody can reach, a type nothing is registered for, props the
 * declaring primitive refuses, a question nothing reads, content put in a region
 * nothing places, a form or a region pointed somewhere else, work written over.
 * None of those consults a policy field. A host turns them off by declaring no
 * vocabulary (0002) and cannot tune them, so their level is a property of the
 * rule itself.
 *
 * Declared here rather than written into each factor because the level now has
 * two readers. The Gate computes it while it holds the delta, and
 * `remeasureStakes` has to state it months later holding only a record — and the
 * second reader exists *because* these seven cannot be re-measured from a
 * record: a code says a rule fired and the list of nodes it fired about does not
 * cross the boundary (0023). What crosses is the code, and this is what turns a
 * code back into a level without a second copy of these numbers in whatever
 * reads the journal.
 */
const FIXED_LEVELS = {
  "discards-later-work": "high",
  "nested-target": "critical",
  "unknown-primitive": "critical",
  "invalid-props": "critical",
  "unread-binding": "critical",
  "unplaced-slot": "critical",
  "redirected-submission": "high",
  "repointed-binding": "high",
} as const satisfies Partial<Record<StakeFactorCode, StakeLevel>>

/** A rule no policy field can move, so its code alone gives its level. */
export type FixedStakeFactorCode = keyof typeof FIXED_LEVELS

/**
 * A rule a policy decides, so the same change under two policies is two
 * answers. The complement of `FixedStakeFactorCode` by construction: a factor
 * added to the vocabulary belongs to one set or the other and nothing has to
 * remember to put it there.
 */
export type MeasuredStakeFactorCode = Exclude<StakeFactorCode, FixedStakeFactorCode>

/** The level this rule is always raised at, which is the whole of what its code means. */
export const fixedStakeLevel = (code: FixedStakeFactorCode): StakeLevel => FIXED_LEVELS[code]

export const isFixedStakeFactor = (code: StakeFactorCode): code is FixedStakeFactorCode =>
  code in FIXED_LEVELS

/**
 * The two halves of the vocabulary, walkable, in the order the Gate raises them.
 *
 * Filtered from `STAKE_FACTOR_CODES` rather than written out, so neither list can
 * be the stale copy of a partition that lives in one place. A factor added to the
 * schema joins one of them according to whether `FIXED_LEVELS` names it, and a
 * reader walking either gets the new member without being told.
 */
export const FIXED_STAKE_FACTOR_CODES: readonly FixedStakeFactorCode[] =
  STAKE_FACTOR_CODES.filter(isFixedStakeFactor)

export const MEASURED_STAKE_FACTOR_CODES: readonly MeasuredStakeFactorCode[] =
  STAKE_FACTOR_CODES.filter((code): code is MeasuredStakeFactorCode => !isFixedStakeFactor(code))

/**
 * The facts the policy-dependent rules read, and nothing else.
 *
 * Narrower than `ChangeAnalysis` on purpose, and the narrowing is the contract.
 * An analysis holds six lists of specifics — which targets are unreachable,
 * which nodes carry refused props — that name parts of a particular page, so
 * they belong to the moment the delta was weighed and go no further. What is
 * here is nine numbers and four lists of type and prop names, which is exactly
 * the part a telemetry record can carry and therefore the part a host can hold
 * on to and measure again.
 *
 * So the seven rules below take this rather than the analysis, and the two
 * producers — `stakeMeasurementOf` from a delta, `remeasureStakes` from a
 * journalled record — put the same rules to the same numbers. A second
 * implementation of *large removal* or *broad change* in whatever wants to
 * re-run them would be a copy of the Gate that drifts from the Gate, which is
 * the one failure a simulation of a policy must not have.
 */
export type StakeMeasurement = {
  readonly insertedNodeCount: number
  readonly removedNodeCount: number
  readonly movedNodeCount: number
  /** `affectedNodeIds.length`. Breadth reads the count and never the ids. */
  readonly affectedNodeCount: number
  readonly shallowestAffectedDepth: number
  readonly touchedPrimitiveTypes: readonly PrimitiveType[]
  readonly removedPrimitiveTypes: readonly PrimitiveType[]
  readonly relocatedPrimitiveTypes: readonly PrimitiveType[]
  readonly configuredPropKeys: readonly string[]
}

/** The measurable half of an analysis, which is what the Gate's own path takes. */
export const stakeMeasurementOf = (analysis: ChangeAnalysis): StakeMeasurement => ({
  insertedNodeCount: analysis.insertedNodeCount,
  removedNodeCount: analysis.removedNodeCount,
  movedNodeCount: analysis.movedNodeCount,
  affectedNodeCount: analysis.affectedNodeIds.length,
  shallowestAffectedDepth: analysis.shallowestAffectedDepth,
  touchedPrimitiveTypes: analysis.touchedPrimitiveTypes,
  removedPrimitiveTypes: analysis.removedPrimitiveTypes,
  relocatedPrimitiveTypes: analysis.relocatedPrimitiveTypes,
  configuredPropKeys: analysis.configuredPropKeys,
})

const intersect = <TValue>(
  candidates: readonly TValue[],
  declared: readonly TValue[]
): readonly TValue[] => candidates.filter((candidate) => declared.includes(candidate))

/** Destroying a protected primitive outranks merely reconfiguring one. */
const protectedTypeRemoved = (
  measurement: StakeMeasurement,
  policy: GatePolicy
): StakeFactor | null => {
  const matches = intersect(measurement.removedPrimitiveTypes, policy.protectedPrimitiveTypes)
  if (matches.length === 0) return null

  return {
    code: "protected-type-removed",
    level: "critical",
    detail: `destroys protected ${matches.join(", ")}`,
  }
}

const protectedTypeTouched = (
  measurement: StakeMeasurement,
  policy: GatePolicy
): StakeFactor | null => {
  const matches = intersect(measurement.touchedPrimitiveTypes, policy.protectedPrimitiveTypes)
  if (matches.length === 0) return null

  return {
    code: "protected-type-touched",
    level: "high",
    detail: `touches protected ${matches.join(", ")}`,
  }
}

/**
 * Moving a protected primitive ranks with rewriting one, not with destroying
 * one: the node survives intact and the position is what changed. It is a
 * separate factor rather than a wider reading of `protected-type-touched`
 * because the two sentences a reviewer needs are different — one says the card
 * was rewritten, the other says it is somewhere else now (0044).
 */
const protectedTypeRelocated = (
  measurement: StakeMeasurement,
  policy: GatePolicy
): StakeFactor | null => {
  const matches = intersect(measurement.relocatedPrimitiveTypes, policy.protectedPrimitiveTypes)
  if (matches.length === 0) return null

  return {
    code: "protected-type-relocated",
    level: "high",
    detail: `relocates protected ${matches.join(", ")}`,
  }
}

const protectedProp = (measurement: StakeMeasurement, policy: GatePolicy): StakeFactor | null => {
  const matches = intersect(measurement.configuredPropKeys, policy.protectedPropKeys)
  if (matches.length === 0) return null

  return {
    code: "protected-prop-configured",
    level: "high",
    detail: `configures protected ${matches.join(", ")}`,
  }
}

const largeRemoval = (measurement: StakeMeasurement, policy: GatePolicy): StakeFactor | null => {
  const { removedNodeCount } = measurement
  const { removalThresholds } = policy

  if (removedNodeCount >= removalThresholds.high) {
    return {
      code: "large-removal",
      level: "high",
      detail: `removes ${removedNodeCount} nodes`,
    }
  }

  if (removedNodeCount >= removalThresholds.medium) {
    return {
      code: "large-removal",
      level: "medium",
      detail: `removes ${removedNodeCount} nodes`,
    }
  }

  return null
}

const broadChange = (measurement: StakeMeasurement, policy: GatePolicy): StakeFactor | null => {
  const touched = measurement.affectedNodeCount
  if (touched < policy.breadthThreshold) return null

  return { code: "broad-change", level: "medium", detail: `touches ${touched} nodes` }
}

const isStructural = (measurement: StakeMeasurement): boolean =>
  measurement.insertedNodeCount + measurement.removedNodeCount + measurement.movedNodeCount > 0

const shallowStructuralChange = (
  measurement: StakeMeasurement,
  policy: GatePolicy
): StakeFactor | null => {
  if (!isStructural(measurement)) return null
  if (measurement.shallowestAffectedDepth > policy.shallowDepthThreshold) return null

  return {
    code: "shallow-structural-change",
    level: "medium",
    detail: `restructures at depth ${measurement.shallowestAffectedDepth}`,
  }
}

/**
 * Work this change writes over, as damage.
 *
 * `high` and not `critical`: critical is where the refusal floor sits by
 * default, and a change that discards work is one a person should be allowed to
 * decide about rather than one nobody may make. A host that disagrees lowers its
 * refusal floor to `high` and gets a refusal, which is the composition 0002
 * asks for instead of a second knob.
 *
 * Host-independent, so there is no vocabulary knob: whether a revision counts as
 * work does not depend on which primitives a deployment cares about.
 */
const discardsLaterWork = ({ discards }: StakeInput): StakeFactor | null => {
  if (discards.length === 0) return null

  const revisions = discards.map((discarded) => discarded.revision)
  const nodes = new Set(discards.flatMap((discarded) => discarded.nodeIds))

  return {
    code: "discards-later-work",
    level: FIXED_LEVELS["discards-later-work"],
    detail: `discards work from revision${revisions.length === 1 ? "" : "s"} ${revisions.join(
      ", "
    )} at ${nodes.size} node${nodes.size === 1 ? "" : "s"}`,
  }
}

/**
 * A target the reader cannot reach, as damage.
 *
 * `critical`, which under the default refusal floor means refused rather than
 * offered — the strongest thing the Gate does, and the level is the argument.
 * Every other factor here measures a change that might be right: destroying a
 * protected primitive is what a redesign looks like, and discarding work is
 * sometimes the point. This one measures a change that is wrong however it was
 * meant. A control nobody can click is not a control.
 *
 * **The damage is unreachability, not nesting**, which is why the sentence says
 * so. Nested anchors are one way to produce it — invalid HTML, resolved by
 * browsers dropping a link — and they were the only way until 0068 declared
 * `loom.article` a target on `href`. That one stretches its title anchor over
 * the whole card with a `::after`, so a control placed underneath receives
 * nothing while the markup stays perfectly well formed. "You put a link inside a
 * link" would send a reader of that diff looking for an `<a>` inside an `<a>`
 * that is not there. What both cases share is the enclosing node taking the
 * whole of itself, which is exactly what `isInteractive` reports.
 *
 * Refusal is also the useful disposition rather than merely the severe one: a
 * refused proposal is the one a repairer gets to try again, and "this control
 * cannot be reached" is feedback a model can act on. Confirmation would put the
 * question to a person who can only answer no.
 *
 * A host that disagrees does not need a knob — it declares no interactive
 * vocabulary, and this never fires. Like the lists above, silence is the
 * default (0002).
 */
const nestedTarget = ({ analysis }: StakeInput): StakeFactor | null => {
  const { nestedTargets } = analysis
  if (nestedTargets.length === 0) return null

  const one = nestedTargets.length === 1

  return {
    code: "nested-target",
    level: FIXED_LEVELS["nested-target"],
    detail: `puts ${one ? "a target" : `${nestedTargets.length} targets`} where the reader cannot reach ${
      one ? "it" : "them"
    }: ${nestedTargets.map(describeNestedTarget).join("; ")}`,
  }
}

/**
 * A node the deployment cannot draw, as damage.
 *
 * `critical`, which under the default refusal floor means refused, and the
 * comparison with `nested-target` above is the argument: this is the other
 * factor that measures a change which is wrong however it was meant. Every
 * other one measures a change that might be right. A part of the page that no
 * code can render is not a part of the page — the renderer omits it and says so
 * (0050), and it says so to nobody, on every request, for as long as the
 * revision is current.
 *
 * Refusal is the useful disposition here and not merely the severe one, for the
 * reason `nested-target` gives and more sharply. A refused proposal is the one a
 * repairer gets to try again, and *this type does not exist* is the single most
 * actionable thing a model can be told: the catalogue it was given already lists
 * what does. Confirmation would put an invented word to a person who can only
 * answer no.
 *
 * **What keeps a rollback undoable** is where this is measured rather than how
 * severely it is judged. A tree may legitimately name a primitive a later
 * deployment withdrew, and only what a change *introduces* is counted, so an
 * ordinary edit to a page that already holds one is untouched. Restoring such a
 * node — an undo of the removal that took it out — is the case this does refuse,
 * and refusing it is the honest answer: the primitive has to come back before
 * the page can.
 *
 * A host that disagrees does not need a knob. It declares no vocabulary and this
 * never fires, which is today's behaviour and the default (0002).
 */
const unknownPrimitive = ({ analysis }: StakeInput): StakeFactor | null => {
  const { unknownPrimitives } = analysis
  if (unknownPrimitives.length === 0) return null

  const one = unknownPrimitives.length === 1

  return {
    code: "unknown-primitive",
    level: FIXED_LEVELS["unknown-primitive"],
    detail: `adds ${one ? "a node" : `${unknownPrimitives.length} nodes`} no primitive is registered for, so ${
      one ? "it draws" : "they draw"
    } nothing: ${unknownPrimitives.map(describeUnknownPrimitive).join("; ")}`,
  }
}

/**
 * Props the declaring primitive refuses, as damage.
 *
 * `critical`, the same level as `unknown-primitive`, because the damage is
 * identical and it is worth being blunt about why: `renderElement` returns
 * `null` for both. A type nothing registered and a node whose props its own
 * schema rejects produce the same hole on the same page for the same reader,
 * and a level that ranked them differently would be ranking the explanation
 * rather than the harm.
 *
 * The reason to refuse rather than to hold, as with `unknown-primitive`: a
 * refusal is the disposition a repairer is offered, and *`text` is longer than
 * this primitive accepts, by this much* is among the most actionable things a
 * model can be told. Confirmation would put a broken node to a person whose
 * only available answer is no.
 *
 * A host that disagrees does not need a knob. It wires no props vocabulary and
 * this never fires, which is today's behaviour and the default (0002).
 */
const invalidProps = ({ analysis }: StakeInput): StakeFactor | null => {
  const { invalidProps: invalid } = analysis
  if (invalid.length === 0) return null

  const one = invalid.length === 1

  return {
    code: "invalid-props",
    level: FIXED_LEVELS["invalid-props"],
    detail: `leaves ${one ? "a node" : `${invalid.length} nodes`} carrying props the declaring primitive refuses, so ${
      one ? "it draws" : "they draw"
    } nothing: ${invalid.map(describeInvalidProps).join("; ")}`,
  }
}

/**
 * A question nothing will read, as damage.
 *
 * `critical`, which ranks it with `unknown-primitive` and `invalid-props`, and
 * the argument is **not** theirs. Those two are `critical` because the damage is
 * identical — `renderElement` returns `null` and the page has a hole — and a
 * level that separated them would be ranking the explanation rather than the
 * harm. This harm is a different thing: the page draws, nothing is missing from
 * the markup, and what is wrong is that the region shows its empty state while
 * the host pays a round trip to its own source on every render to fill it.
 *
 * It is ranked with them because of the **available answer** rather than the
 * damage, which is worth stating plainly rather than filed under a family
 * resemblance. A refusal is the disposition a repairer is offered, and
 * *`loom.feed` reads `entries`, and this node asked under `rows`* is close to
 * the most actionable thing a model can be told: the declaration holds the
 * correct name, so the repair is one string. Confirmation is the wrong rung for
 * the same reason it is wrong for invalid props — it puts a change to a person
 * whose only sensible answer is no, and the one thing it could not tell them is
 * what to do instead.
 *
 * The one case it ranks too high is the node somebody meant to leave asking
 * ahead of a primitive that will read it next week. That change is honestly
 * refusable today: the round trip is real now and the reader nobody wrote is
 * not, so a host that wants it declares no reader and this never fires — which
 * is the default, and 0002's answer to every knob that was not built.
 */
const unreadBinding = ({ analysis }: StakeInput): StakeFactor | null => {
  const { unreadBindings: unread } = analysis
  if (unread.length === 0) return null

  const one = unread.length === 1

  return {
    code: "unread-binding",
    level: FIXED_LEVELS["unread-binding"],
    detail: `asks ${one ? "a question" : `${unread.length} questions`} no primitive reads, so the ${
      one ? "answer is" : "answers are"
    } fetched and dropped: ${unread.map(describeUnreadBinding).join("; ")}`,
  }
}

/**
 * Content put where nothing will draw it, as damage.
 *
 * `critical`, which is `unread-binding`'s level and the argument for it applies
 * here with one word changed. The repair is one string and the registry holds
 * it: *`loom.dialog` places `header` and `footer`, and this node filled `body`*
 * is something a repairer can act on without being told anything else, so a
 * refusal is worth more to it than a confirmation a person can only answer no
 * to.
 *
 * Where it is a stronger case than the binding is in what is lost. A question
 * nothing reads costs a round trip and draws an empty state; a region nothing
 * places drops the content **and everything under it**, so an author's
 * paragraph is simply not on the page. 0249 gave the renderer a diagnostic for
 * that and this is the half that keeps it from being written in the first
 * place.
 *
 * It fires only where a host has handed a placer, which is 0002's answer again:
 * a deployment resolving primitives from a plain map has never been able to say
 * what a primitive places, and nothing here invents the knowledge.
 */
const unplacedSlot = ({ analysis }: StakeInput): StakeFactor | null => {
  const { unplacedSlots: unplaced } = analysis
  if (unplaced.length === 0) return null

  const one = unplaced.length === 1

  return {
    code: "unplaced-slot",
    level: FIXED_LEVELS["unplaced-slot"],
    detail: `fills ${one ? "a region" : `${unplaced.length} regions`} no primitive places, so the ${
      one ? "content and everything under it is" : "contents and everything under them are"
    } dropped: ${unplaced.map(describeUnplacedSlot).join("; ")}`,
  }
}

/**
 * A form pointed somewhere else, as damage.
 *
 * `high` rather than `critical`, and the comparison with `nested-target` above
 * is the argument. That one measures a change that is wrong however it was
 * meant, so it is refused. This one measures a change that is often exactly
 * right — a deployment that splits one mailing list into two repoints its forms,
 * and refusing that would mean no proposal could ever move a form at all. What
 * must not happen is that it goes through without anybody noticing, and that is
 * a question of who decides rather than of whether it may be done.
 *
 * So it is `high` plus a rule in the Gate, in the shape 0035 established for
 * discarded work: a level alone cannot say "never auto-apply", because ceilings
 * are per origin (0002) and a `high` factor is a hold for one origin and a
 * silent apply for another. Where a visitor's data goes should not depend on who
 * asked for it to move.
 *
 * Host-independent, so no vocabulary knob: `loom:submit` is the runtime's own
 * key, and both endpoints were registered by the host in either case.
 */
const redirectedSubmission = ({ analysis }: StakeInput): StakeFactor | null => {
  const { redirectedSubmissions } = analysis
  if (redirectedSubmissions.length === 0) return null

  return {
    code: "redirected-submission",
    level: FIXED_LEVELS["redirected-submission"],
    detail: `redirects ${
      redirectedSubmissions.length === 1 ? "a submission" : `${redirectedSubmissions.length} submissions`
    }: ${redirectedSubmissions.map(describeRedirectedSubmission).join("; ")}`,
  }
}

/**
 * A region pointed at different data, as damage.
 *
 * `high`, plus a rule in the Gate, for every reason `redirectedSubmission` above
 * gives — and the pairing is the argument. That factor measures where a
 * visitor's data goes; this one measures which of the host's data arrives, and
 * they are the two ends of one pipe. Repointing is often exactly right: a
 * deployment that splits one catalogue into two repoints its pages, and refusing
 * that would mean no proposal could ever move a binding at all. What must not
 * happen is that it goes through without anybody noticing, which is a question
 * of who decides rather than of whether it may be done.
 *
 * A level alone cannot say "never auto-apply" while ceilings are per origin
 * (0002), so the rule carries that and the level carries the damage. Which of a
 * deployment's data comes out should not depend on who asked for it to change.
 *
 * Host-independent, so no vocabulary knob: `loom:data` is the runtime's own key,
 * and both sources were registered by the host in either case.
 */
const repointedBinding = ({ analysis }: StakeInput): StakeFactor | null => {
  const { repointedBindings } = analysis
  if (repointedBindings.length === 0) return null

  return {
    code: "repointed-binding",
    level: FIXED_LEVELS["repointed-binding"],
    detail: `repoints ${
      repointedBindings.length === 1 ? "a binding" : `${repointedBindings.length} bindings`
    }: ${repointedBindings.map(describeRepointedBinding).join("; ")}`,
  }
}

/**
 * The seven a policy decides, in the order the Gate raises them.
 *
 * Order is part of the record: `stakeFactorCodes` is written in the order the
 * factors came out, so the two lists here are the one list this used to be, cut
 * where the kinds change and not reordered.
 */
const MEASURED_FACTORS: readonly ((
  measurement: StakeMeasurement,
  policy: GatePolicy
) => StakeFactor | null)[] = [
  protectedTypeRemoved,
  protectedTypeTouched,
  protectedTypeRelocated,
  protectedProp,
  largeRemoval,
  broadChange,
  shallowStructuralChange,
]

/** The eight fixed at their code, which read the specifics a record does not carry. */
const FIXED_FACTORS: readonly ((input: StakeInput, policy: GatePolicy) => StakeFactor | null)[] = [
  discardsLaterWork,
  nestedTarget,
  unknownPrimitive,
  invalidProps,
  unreadBinding,
  unplacedSlot,
  redirectedSubmission,
  repointedBinding,
]

/**
 * The policy-dependent half, against a measurement rather than a delta.
 *
 * Published because it is the half that can be run twice: once by the Gate on
 * the change in front of it, and again by anything holding a record of that
 * change and a policy it is considering. The other half cannot, which is why it
 * is not here — see `fixedStakeLevel`.
 */
export const measureStakes = (
  measurement: StakeMeasurement,
  policy: GatePolicy
): readonly StakeFactor[] => MEASURED_FACTORS.flatMap((factor) => factor(measurement, policy) ?? [])

export const assessStakes = (input: StakeInput, policy: GatePolicy): StakeAssessment => {
  const factors = [
    ...measureStakes(stakeMeasurementOf(input.analysis), policy),
    ...FIXED_FACTORS.flatMap((factor) => factor(input, policy) ?? []),
  ]

  return { level: highestStake(factors.map((factor) => factor.level)), factors }
}

/** The factor with this code, for a caller that needs the reason and not the level. */
export const stakeFactor = (
  stakes: StakeAssessment,
  code: StakeFactorCode
): StakeFactor | undefined => stakes.factors.find((factor) => factor.code === code)
