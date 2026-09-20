import type { ChangeAnalysis } from "./analysis.js"
import { describeNestedTarget } from "./nesting.js"
import type { GatePolicy } from "./policy.js"
import type { DiscardedWork } from "./proposal.js"
import { describeRedirectedSubmission } from "./redirection.js"
import { describeRepointedBinding } from "./repointing.js"
import { describeUnknownPrimitive } from "./vocabulary.js"
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

export type StakeFactorCode =
  | "protected-type-removed"
  | "protected-type-touched"
  | "protected-type-relocated"
  | "protected-prop-configured"
  | "large-removal"
  | "broad-change"
  | "shallow-structural-change"
  | "discards-later-work"
  | "nested-target"
  | "unknown-primitive"
  | "redirected-submission"
  | "repointed-binding"

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

const intersect = <TValue>(
  candidates: readonly TValue[],
  declared: readonly TValue[]
): readonly TValue[] => candidates.filter((candidate) => declared.includes(candidate))

/** Destroying a protected primitive outranks merely reconfiguring one. */
const protectedTypeRemoved = ({ analysis }: StakeInput, policy: GatePolicy): StakeFactor | null => {
  const matches = intersect(analysis.removedPrimitiveTypes, policy.protectedPrimitiveTypes)
  if (matches.length === 0) return null

  return {
    code: "protected-type-removed",
    level: "critical",
    detail: `destroys protected ${matches.join(", ")}`,
  }
}

const protectedTypeTouched = ({ analysis }: StakeInput, policy: GatePolicy): StakeFactor | null => {
  const matches = intersect(analysis.touchedPrimitiveTypes, policy.protectedPrimitiveTypes)
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
  { analysis }: StakeInput,
  policy: GatePolicy
): StakeFactor | null => {
  const matches = intersect(analysis.relocatedPrimitiveTypes, policy.protectedPrimitiveTypes)
  if (matches.length === 0) return null

  return {
    code: "protected-type-relocated",
    level: "high",
    detail: `relocates protected ${matches.join(", ")}`,
  }
}

const protectedProp = ({ analysis }: StakeInput, policy: GatePolicy): StakeFactor | null => {
  const matches = intersect(analysis.configuredPropKeys, policy.protectedPropKeys)
  if (matches.length === 0) return null

  return {
    code: "protected-prop-configured",
    level: "high",
    detail: `configures protected ${matches.join(", ")}`,
  }
}

const largeRemoval = ({ analysis }: StakeInput, policy: GatePolicy): StakeFactor | null => {
  const { removedNodeCount } = analysis
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

const broadChange = ({ analysis }: StakeInput, policy: GatePolicy): StakeFactor | null => {
  const touched = analysis.affectedNodeIds.length
  if (touched < policy.breadthThreshold) return null

  return { code: "broad-change", level: "medium", detail: `touches ${touched} nodes` }
}

const isStructural = (analysis: ChangeAnalysis): boolean =>
  analysis.insertedNodeCount + analysis.removedNodeCount + analysis.movedNodeCount > 0

const shallowStructuralChange = (
  { analysis }: StakeInput,
  policy: GatePolicy
): StakeFactor | null => {
  if (!isStructural(analysis)) return null
  if (analysis.shallowestAffectedDepth > policy.shallowDepthThreshold) return null

  return {
    code: "shallow-structural-change",
    level: "medium",
    detail: `restructures at depth ${analysis.shallowestAffectedDepth}`,
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
    level: "high",
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
    level: "critical",
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
    level: "critical",
    detail: `adds ${one ? "a node" : `${unknownPrimitives.length} nodes`} no primitive is registered for, so ${
      one ? "it draws" : "they draw"
    } nothing: ${unknownPrimitives.map(describeUnknownPrimitive).join("; ")}`,
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
    level: "high",
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
    level: "high",
    detail: `repoints ${
      repointedBindings.length === 1 ? "a binding" : `${repointedBindings.length} bindings`
    }: ${repointedBindings.map(describeRepointedBinding).join("; ")}`,
  }
}

const FACTORS: readonly ((input: StakeInput, policy: GatePolicy) => StakeFactor | null)[] = [
  protectedTypeRemoved,
  protectedTypeTouched,
  protectedTypeRelocated,
  protectedProp,
  largeRemoval,
  broadChange,
  shallowStructuralChange,
  discardsLaterWork,
  nestedTarget,
  unknownPrimitive,
  redirectedSubmission,
  repointedBinding,
]

export const assessStakes = (input: StakeInput, policy: GatePolicy): StakeAssessment => {
  const factors = FACTORS.flatMap((factor) => factor(input, policy) ?? [])

  return { level: highestStake(factors.map((factor) => factor.level)), factors }
}

/** The factor with this code, for a caller that needs the reason and not the level. */
export const stakeFactor = (
  stakes: StakeAssessment,
  code: StakeFactorCode
): StakeFactor | undefined => stakes.factors.find((factor) => factor.code === code)
