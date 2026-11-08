import {
  err,
  ok,
  type EditIntent,
  type IdFactory,
  type LoomTree,
  type ProposalId,
  type Result,
} from "@jam-overture/loom"
import { planRevert } from "@jam-overture/loom/store"
import {
  commitIntent,
  computedChangeRuntime,
  revertInterpreter,
  type RevertOutcome,
  type WritePath,
} from "@jam-overture/loom/write"

import { recordsOfPage } from "../accepted-reading"
import { acceptedChangesOf, type AcceptedChange } from "../going-live"
import type { ProposalGoal, ProposalGoalStore } from "../goals/serving"
import { currentCopyOf, type PageCopyStore } from "./copies"
import { standsOn } from "./following"
import { madeFromOf, type MadeFromStore } from "./made-from"

/**
 * *Propose reverting* on a Loom change's card on a page's history (8c of
 * `docs/portal.md`; `docs/portal-wireframes.md`, *5 · Pages · History*).
 *
 * A revert is a change like any other (0032): it is raised by the person who
 * pressed the button, made of the inverse the runtime plans from the page's
 * record, and weighed by the Gate. Within the project's rules it goes onto
 * the live page and the site has it from its next pull (0358); otherwise it
 * waits under *For review* for someone who may accept it, like every change
 * the Gate holds.
 *
 * It serves the goal the change it undoes served, recorded under its intent
 * before the write as every proposal's goal is (0352), so *For review* leads
 * with that goal and the revert is measured on it like the change was.
 */

export type RevertFor = {
  readonly path: WritePath
  readonly copies: Pick<PageCopyStore, "list">
  readonly proposalGoals: Pick<ProposalGoalStore, "record" | "forIntents">
  readonly made: Pick<MadeFromStore, "record" | "forProposals">
  readonly ids: Pick<IdFactory, "intentId">
  /** The page as the site last published it. */
  readonly published: LoomTree
  /** The accepted change to revert. */
  readonly proposalId: ProposalId
  /** Who pressed *Propose reverting*. */
  readonly actor: string
  readonly at: Date
}

/** Why a change cannot be reverted from its card, each of which a person can be told. */
export type NotReverted =
  /** The change is not on the live page: undone already, dropped, or never on this page. */
  | { readonly kind: "not-standing" }
  /** The change is itself an undo; reverting it is accepting the change it undid again. */
  | { readonly kind: "an-undo" }
  /** The site published a newer version Loom has not followed yet, so the page's record does not start where the site does. */
  | { readonly kind: "site-moved" }

export type Reverting =
  | {
      readonly kind: "raised"
      readonly outcome: RevertOutcome
      /** The goal the revert serves: the one the change it undoes served, where that was recorded. */
      readonly goal: ProposalGoal | undefined
    }
  | { readonly kind: "not-reverted"; readonly why: NotReverted }

export type RevertError = { readonly code: "store"; readonly detail: string }

const storeFailure = (detail: string): RevertError => ({ code: "store", detail })

const notReverted = (why: NotReverted): Result<Reverting, RevertError> =>
  ok({ kind: "not-reverted", why })

/** Whether a change's card offers *Propose reverting*: on the live page, and not itself an undo. Pure. */
export const mayRevert = (change: AcceptedChange): boolean =>
  change.ending.kind === "standing" && change.accepted.provenance.undoes === undefined

/** The goal the change served, as its proposal recorded it; `undefined` where none was recorded. */
const goalServedBy = async (
  given: RevertFor
): Promise<Result<ProposalGoal | undefined, RevertError>> => {
  const made = await given.made.forProposals([given.proposalId])

  if (!made.ok) return err(storeFailure(made.error.detail))

  const intentId = made.value.get(given.proposalId)?.intentId

  if (intentId === undefined) return ok(undefined)

  const goals = await given.proposalGoals.forIntents([intentId])

  return goals.ok ? ok(goals.value.get(intentId)) : err(storeFailure(goals.error.detail))
}

/**
 * Raise the revert of one accepted change on a page, against the page's
 * current copy.
 *
 * The copy's record is replayed from the version the site published, so the
 * revert is planned only where that version is the one the copy stands on: a
 * newer version not yet followed would be the wrong place to start, and the
 * person is told to wait for Loom to follow it rather than given a guess.
 */
export const proposeReverting = async (
  given: RevertFor
): Promise<Result<Reverting, RevertError>> => {
  const { path, published } = given
  const pageId = published.treeId
  const copies = await given.copies.list()

  if (!copies.ok) return err(storeFailure(copies.error.detail))

  const records = await recordsOfPage(path.store, copies.value, pageId)

  if (!records.ok) return err(storeFailure(records.error.detail))

  const change = acceptedChangesOf(pageId, records.value).find(
    (accepted) => accepted.proposalId === given.proposalId
  )

  if (change === undefined || change.ending.kind !== "standing") {
    return notReverted({ kind: "not-standing" })
  }

  if (!mayRevert(change)) return notReverted({ kind: "an-undo" })

  const copy = currentCopyOf(copies.value, pageId)
  const onCopy = records.value.at(-1)?.revisions ?? []
  const target = onCopy.find((revision) => revision.proposalId === given.proposalId)
  const head = await path.store.head(copy.copyId)

  if (target === undefined) return notReverted({ kind: "not-standing" })
  if (!head.ok) return err(storeFailure(head.error.code))

  const seed = { ...published, treeId: copy.copyId }

  if (!standsOn(head.value, onCopy, seed, path.runtime.idFactory)) {
    return notReverted({ kind: "site-moved" })
  }

  const planned = await planRevert(path.store, {
    treeId: copy.copyId,
    revision: target.revision,
    seed,
  })

  if (!planned.ok) return err(storeFailure(planned.error.code))

  if (planned.value.outcome !== "revertable") {
    return ok({
      kind: "raised",
      outcome: { kind: "not-revertable", plan: planned.value },
      goal: undefined,
    })
  }

  const goal = await goalServedBy(given)

  if (!goal.ok) return goal

  const plan = planned.value
  const intent: EditIntent = {
    intentId: given.ids.intentId(),
    treeId: copy.copyId,
    baseRevision: plan.headRevision,
    origin: "user-instruction",
    actor: given.actor,
    utterance: `Revert version ${change.accepted.revision}.`,
    observedAt: given.at.toISOString(),
  }

  if (goal.value !== undefined) {
    const recorded = await given.proposalGoals.record({
      ...goal.value,
      intentId: intent.intentId,
      at: given.at.getTime(),
    })

    if (!recorded.ok) return err(storeFailure(recorded.error.detail))
  }

  const outcome = await commitIntent(
    {
      store: path.store,
      holds: path.holds,
      runtime: computedChangeRuntime(
        path.runtime,
        revertInterpreter(plan, path.runtime.idFactory, path.runtime.clock)
      ),
    },
    intent
  )
  const made = madeFromOf(outcome, given.at.getTime())

  /** After the change, and whatever it answers, as every made change's origin is kept. */
  if (made !== undefined) await given.made.record(made)

  return ok({ kind: "raised", outcome, goal: goal.value })
}
