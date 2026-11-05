import type { IntentId, LoomTree, NodeId, Result } from "@jam-overture/loom"

import { primaryFirst, type Goal, type GoalId, type GoalKind } from "./goal"
import { partsOf } from "./goal-view"

/**
 * Which goal a change to a page serves (8b of `docs/portal.md`, record 0352).
 *
 * *"Loom proposes toward [the primary goal] unless a page has its own. A page
 * with no goal on it gets no proposals"* (`docs/portal-wireframes.md`, *3 ·
 * Goals*). A goal is on a page when it covers the page (every page, or the
 * page among those chosen) and the page has the part it counts: a change to a
 * page cannot move a count of something the page does not have.
 */

/** The goal a change to this page serves, or `undefined` for a page no goal is on. Pure. */
export const goalForPage = (goals: readonly Goal[], page: LoomTree): Goal | undefined => {
  const parts = new Set<string>(partsOf(page).map((part) => part.nodeId))
  const on = primaryFirst(goals).filter(
    (goal) => (goal.pages === null || goal.pages.includes(page.treeId)) && parts.has(goal.nodeId)
  )

  /** A page's own goal names it; otherwise the primary, then the oldest, as `primaryFirst` orders them. */
  return on.find((goal) => goal.pages !== null) ?? on[0]
}

/**
 * The goal a proposal was raised for, as it was then: kept by the intent the
 * proposal was made from, because the intent id is minted before the write and
 * every held or made change carries it. The goal's name, kind and part are
 * kept with it, so the change still names what it was for after the goal is
 * renamed away or removed.
 */
export type ProposalGoal = {
  readonly intentId: IntentId
  readonly goalId: GoalId
  readonly name: string
  readonly kind: GoalKind
  readonly nodeId: NodeId
  readonly at: number
}

/** The goal as a proposal records it. Pure. */
export const proposalGoalOf = (goal: Goal, intentId: IntentId, at: number): ProposalGoal => ({
  intentId,
  goalId: goal.goalId,
  name: goal.name,
  kind: goal.kind,
  nodeId: goal.nodeId,
  at,
})

export type ProposalGoalStoreError = {
  readonly code: "unavailable"
  readonly detail: string
}

/** One application's record of which goal each proposal serves, scoped at construction. */
export interface ProposalGoalStore {
  /** Recording the same intent twice keeps the first: a proposal is raised for one goal. */
  readonly record: (served: ProposalGoal) => Promise<Result<void, ProposalGoalStoreError>>
  /** The goals of these intents; an intent nothing was recorded for is absent from the map. */
  readonly forIntents: (
    intentIds: readonly IntentId[]
  ) => Promise<Result<ReadonlyMap<IntentId, ProposalGoal>, ProposalGoalStoreError>>
}
