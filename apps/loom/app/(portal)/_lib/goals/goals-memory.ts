import { err, ok } from "@jam-overture/loom"

import { heirOf, MAX_GOALS, primaryFirst, primaryOf, type Goal, type GoalStore } from "./goal"

/** One application's goals in the process: the reference implementation. */
export const memoryGoalStore = (): GoalStore => {
  let held: readonly Goal[] = []

  /** The mark on `goalId` alone, keeping its date where it already held it. */
  const markOnly = (goalId: string, at: number): readonly Goal[] =>
    held.map((goal) => ({
      ...goal,
      primarySince: goal.goalId === goalId ? (goal.primarySince ?? at) : null,
    }))

  return {
    list: () => Promise.resolve(ok(primaryFirst(held))),

    add: (draft, { primary }) => {
      if (held.length >= MAX_GOALS) {
        return Promise.resolve(err({ code: "full", detail: `${MAX_GOALS} goals are kept already` }))
      }

      held = [...held, { ...draft, primarySince: null }]

      if (primary || primaryOf(held) === undefined) held = markOnly(draft.goalId, draft.createdAt)

      return Promise.resolve(ok(undefined))
    },

    makePrimary: (goalId, at) => {
      if (!held.some((goal) => goal.goalId === goalId)) {
        return Promise.resolve(err({ code: "not_found", detail: `no goal ${goalId}` }))
      }

      held = markOnly(goalId, at)

      return Promise.resolve(ok(undefined))
    },

    remove: (goalId, at) => {
      if (!held.some((goal) => goal.goalId === goalId)) {
        return Promise.resolve(err({ code: "not_found", detail: `no goal ${goalId}` }))
      }

      held = held.filter((goal) => goal.goalId !== goalId)

      const heir = primaryOf(held) === undefined ? heirOf(held) : undefined

      if (heir !== undefined) held = markOnly(heir.goalId, at)

      return Promise.resolve(ok(undefined))
    },
  }
}
