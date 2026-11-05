import type { ApplicationId } from "@jam-overture/loom/store"

import { portalDatabase } from "../database"
import type { GoalStore } from "./goal"
import { memoryGoalStore } from "./goals-memory"
import { postgresGoalStore } from "./goals-postgres"
import { memoryProposalGoalStore } from "./proposal-goals-memory"
import { postgresProposalGoalStore } from "./proposal-goals-postgres"
import type { ProposalGoalStore } from "./serving"

/**
 * One application's goals (0350) and the goal each of its proposals serves
 * (0352): Postgres when one is configured and memory when not, memoised per
 * application on a global carrier for `write.ts`'s reason, where a second
 * construction in memory is a second, empty list.
 */
type Kept = {
  readonly goals: GoalStore
  readonly proposalGoals: ProposalGoalStore
}

const CARRIER_KEY = Symbol.for("loom.portal.goals")

type Carrier = { [CARRIER_KEY]?: Map<ApplicationId, Kept> }

const kept = ((globalThis as unknown as Carrier)[CARRIER_KEY] ??= new Map())

const keptFor = (application: ApplicationId): Kept => {
  const known = kept.get(application)

  if (known !== undefined) return known

  const made: Kept =
    portalDatabase === undefined
      ? { goals: memoryGoalStore(), proposalGoals: memoryProposalGoalStore() }
      : {
          goals: postgresGoalStore(portalDatabase, { application }),
          proposalGoals: postgresProposalGoalStore(portalDatabase, {
            application,
          }),
        }

  kept.set(application, made)

  return made
}

export const goalsFor = (application: ApplicationId): GoalStore => keptFor(application).goals

export const proposalGoalsFor = (application: ApplicationId): ProposalGoalStore =>
  keptFor(application).proposalGoals
