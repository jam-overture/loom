import type { ProposalId } from "../ids.js"
import { err, ok, type Result } from "../result.js"
import type { Disposition } from "../runtime/disposition.js"
import type { EditIntent } from "../runtime/intent.js"
import { describeInterpretationError, type InterpretationError } from "../runtime/interpreter.js"
import { narrator, type Narrator } from "../runtime/narration.js"
import { composeChange, confirmChange, type CompositionRuntime } from "../runtime/pipeline.js"
import type { ProposedChange } from "../runtime/proposal.js"
import { describeStoreError, type StoreError } from "../store/errors.js"
import type { TreeStore } from "../store/store.js"
import type { TreeDelta } from "../tree/delta.js"
import { describeTreeError, type TreeError } from "../tree/errors.js"
import type { LoomTree } from "../tree/tree.js"

import { describeHoldError, type HeldProposal, type HoldError, type HoldStore } from "./held.js"

/**
 * The one write path (0017).
 *
 * `composeChange` decides whether a change may happen; this decides that it
 * happened. Everything that reaches `store.append` comes through here, so there
 * is exactly one place where a delta becomes history, and it is the same place
 * the Gate ran.
 *
 * The two are kept apart on purpose. The composition runtime is a pure-ish
 * function of a tree it was handed; making it read and write a store would give
 * §2 a persistence dependency it does not need and would make every pipeline
 * test set up a store. This module owns the seam instead: read head, refuse a
 * stale intent before spending a model call on it, compose, persist.
 */

export type WritePath = {
  readonly store: TreeStore
  readonly holds: HoldStore
  readonly runtime: CompositionRuntime
}

/**
 * Answering a held proposal names the proposal and whoever answered it.
 *
 * The two travel together rather than the actor being an optional trailing
 * argument, because an answer with no one attached is a decision nobody made —
 * and a parameter that is easy to leave off is one that will be (0027). A host
 * with no identities to name omits it deliberately; it cannot omit it by
 * forgetting there was a second argument.
 */
export type ProposalAnswer = {
  readonly proposalId: ProposalId
  readonly actor?: string
}

export type WriteOutcome =
  | {
      readonly kind: "committed"
      readonly tree: LoomTree
      readonly proposal: ProposedChange
      readonly disposition: Disposition
      readonly inverse: TreeDelta
    }
  | { readonly kind: "held"; readonly held: HeldProposal }
  | {
      readonly kind: "refused"
      readonly proposal: ProposedChange
      readonly disposition: Disposition
      /**
       * Why no smaller change was offered instead, when a repairer was asked for
       * one and declined. Carried straight through from the composition outcome,
       * where the three endings a refusal can have are set out.
       */
      readonly repairFailure?: InterpretationError
    }
  | { readonly kind: "not-interpreted"; readonly error: InterpretationError }
  | {
      readonly kind: "not-applicable"
      readonly proposal: ProposedChange
      readonly error: TreeError
    }
  /** Persistence refused, including the stale-intent case that never reached a model. */
  | { readonly kind: "not-written"; readonly error: StoreError }
  /** The proposal being confirmed is not in custody — answered already, or never held. */
  | { readonly kind: "not-answerable"; readonly error: HoldError }

export const describeWriteOutcome = (outcome: WriteOutcome): string => {
  switch (outcome.kind) {
    case "committed":
      return `applied at revision ${outcome.tree.revision}`
    case "held":
      return `held for confirmation: ${outcome.held.disposition.reason.detail}`
    case "refused":
      return outcome.repairFailure === undefined
        ? `refused: ${outcome.disposition.reason.detail}`
        : `refused: ${outcome.disposition.reason.detail} — asked for something smaller, and ${describeInterpretationError(outcome.repairFailure)}`
    case "not-interpreted":
      return describeInterpretationError(outcome.error)
    case "not-applicable":
      return `the proposal did not apply: ${describeTreeError(outcome.error)}`
    case "not-written":
      return describeStoreError(outcome.error)
    case "not-answerable":
      return describeHoldError(outcome.error)
  }
}

/**
 * Reads head and refuses an intent that names a revision head has moved past.
 *
 * The check is here rather than left to `append` for two reasons. It saves a
 * model call that could only produce a delta destined to be refused; and it
 * means the interpreter is never handed a tree the asker was not looking at,
 * which is the same rule the interpreter already follows about revisions.
 */
const readWritableHead = async (
  path: WritePath,
  intent: EditIntent
): Promise<Result<LoomTree, StoreError>> => {
  const head = await path.store.head(intent.treeId)
  if (!head.ok) return head

  if (head.value.revision !== intent.baseRevision) {
    return err<StoreError>({
      code: "revision-conflict",
      treeId: intent.treeId,
      expected: intent.baseRevision,
      found: head.value.revision,
    })
  }

  return ok(head.value)
}

/**
 * What a commit is, apart from the path it takes: the change, the verdict, the
 * way back, and — when a human had to allow it — who did.
 *
 * Grouped rather than trailing `persist`'s parameter list, for the reason 0027
 * gave for `ProposalAnswer`: an approver that can be left off the end is one
 * that will be, and the whole point of recording it is that it is not optional
 * when there is one.
 */
type Commit = {
  readonly proposal: ProposedChange
  readonly disposition: Disposition
  readonly inverse: TreeDelta
  /** Absent on a change the Gate accepted outright — nobody had to allow it. */
  readonly answeredBy?: string
}

/**
 * Persists a change the Gate accepted and the tree took.
 *
 * The tree returned is the store's, not the one the pipeline applied in memory:
 * they agree, and when they ever do not, the log is the one that is right.
 */
const persist = async (
  path: WritePath,
  narrate: Narrator,
  intent: EditIntent,
  commit: Commit
): Promise<WriteOutcome> => {
  const { proposal, disposition, inverse } = commit

  const appended = await path.store.append(intent.treeId, {
    proposalId: proposal.proposalId,
    delta: proposal.delta,
    provenance: proposal.provenance,
    appliedAt: path.runtime.clock.now(),
    ...(commit.answeredBy === undefined ? {} : { answeredBy: commit.answeredBy }),
  })

  if (!appended.ok) {
    narrate({ type: "commit-failed", proposalId: proposal.proposalId, error: appended.error })

    return { kind: "not-written", error: appended.error }
  }

  narrate({
    type: "change-committed",
    proposalId: proposal.proposalId,
    revision: appended.value.revision,
  })

  return { kind: "committed", tree: appended.value, proposal, disposition, inverse }
}

const takeIntoCustody = async (
  path: WritePath,
  narrate: Narrator,
  intent: EditIntent,
  proposal: ProposedChange,
  disposition: Disposition
): Promise<WriteOutcome> => {
  const held = await path.holds.hold({
    proposalId: proposal.proposalId,
    treeId: intent.treeId,
    baseRevision: intent.baseRevision,
    intent,
    proposal,
    disposition,
    heldAt: path.runtime.clock.now(),
  })

  if (!held.ok) {
    narrate({
      type: "hold-failed",
      proposalId: proposal.proposalId,
      detail: describeHoldError(held.error),
    })

    return { kind: "not-answerable", error: held.error }
  }

  narrate({ type: "proposal-held", proposalId: proposal.proposalId })

  return { kind: "held", held: held.value }
}

export const commitIntent = async (path: WritePath, intent: EditIntent): Promise<WriteOutcome> => {
  const narrate = narrator(path.runtime.events, path.runtime.clock, intent.treeId)

  const head = await readWritableHead(path, intent)
  if (!head.ok) {
    narrate({ type: "intent-not-writable", intent, error: head.error })

    return { kind: "not-written", error: head.error }
  }

  const outcome = await composeChange(path.runtime, head.value, intent)

  switch (outcome.kind) {
    case "applied":
      return persist(path, narrate, intent, {
        proposal: outcome.assessment.proposal,
        disposition: outcome.disposition,
        inverse: outcome.inverse,
      })
    case "awaiting-confirmation":
      return takeIntoCustody(
        path,
        narrate,
        intent,
        outcome.assessment.proposal,
        outcome.disposition
      )
    case "rejected":
      return {
        kind: "refused",
        proposal: outcome.assessment.proposal,
        disposition: outcome.disposition,
        ...(outcome.repairFailure === undefined ? {} : { repairFailure: outcome.repairFailure }),
      }
    case "not-interpreted":
      return { kind: "not-interpreted", error: outcome.error }
    case "not-applicable":
      return { kind: "not-applicable", proposal: outcome.proposal, error: outcome.error }
  }
}

/**
 * Answers a held proposal with yes.
 *
 * A hold names a revision, so a hold whose tree has moved on can never apply
 * again — it is not stale pending a retry, it is dead. Confirming one therefore
 * releases it and reports the conflict, rather than leaving a proposal in the
 * queue that will refuse every time it is answered.
 *
 * The Gate runs again on the way through (`confirmChange`), against the tree as
 * it stands. A human saying yes is permission to proceed, not permission to skip
 * the check.
 */
export const confirmHeld = async (
  path: WritePath,
  answer: ProposalAnswer
): Promise<WriteOutcome> => {
  const { proposalId } = answer
  const found = await path.holds.get(proposalId)
  if (!found.ok) return { kind: "not-answerable", error: found.error }

  const { intent, proposal } = found.value
  const narrate = narrator(path.runtime.events, path.runtime.clock, intent.treeId)

  const head = await path.store.head(intent.treeId)
  if (!head.ok) return { kind: "not-written", error: head.error }

  if (head.value.revision !== found.value.baseRevision) {
    /** Dead rather than stale, so custody ends here whatever the caller does next. */
    await path.holds.release(proposalId)

    const error: StoreError = {
      code: "revision-conflict",
      treeId: intent.treeId,
      expected: found.value.baseRevision,
      found: head.value.revision,
    }
    narrate({ type: "commit-failed", proposalId, error })

    return { kind: "not-written", error }
  }

  /** The take is what makes answering happen exactly once, so it precedes the apply. */
  const released = await path.holds.release(proposalId)
  if (!released.ok) return { kind: "not-answerable", error: released.error }

  narrate({
    type: "hold-confirmed",
    proposalId,
    ...(answer.actor === undefined ? {} : { actor: answer.actor }),
  })

  const outcome = confirmChange(path.runtime, head.value, proposal, intent)

  switch (outcome.kind) {
    case "applied":
      /**
       * The one place `answeredBy` is set. It is the same actor the
       * `hold-confirmed` event carries, taken from the same `ProposalAnswer`, so
       * the two records cannot disagree about who allowed this (0029).
       */
      return persist(path, narrate, intent, {
        proposal,
        disposition: outcome.disposition,
        inverse: outcome.inverse,
        ...(answer.actor === undefined ? {} : { answeredBy: answer.actor }),
      })
    case "rejected":
      return { kind: "refused", proposal, disposition: outcome.disposition }
    case "not-applicable":
      return { kind: "not-applicable", proposal: outcome.proposal, error: outcome.error }
  }
}

/**
 * Answers a held proposal with no.
 *
 * The most informative thing a reviewer does, from §6's point of view: the Gate
 * was willing to offer this change and a human did not want it, which is the
 * only signal that distinguishes a policy that is too permissive from one that
 * is calibrated.
 */
export const discardHeld = async (
  path: WritePath,
  answer: ProposalAnswer
): Promise<Result<HeldProposal, HoldError>> => {
  const released = await path.holds.release(answer.proposalId)
  if (!released.ok) return released

  narrator(
    path.runtime.events,
    path.runtime.clock,
    released.value.treeId
  )({
    type: "hold-discarded",
    proposalId: answer.proposalId,
    ...(answer.actor === undefined ? {} : { actor: answer.actor }),
  })

  return released
}
