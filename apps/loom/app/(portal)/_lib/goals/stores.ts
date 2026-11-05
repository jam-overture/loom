import type { ApplicationId } from "@jam-overture/loom/store"

import { portalDatabase } from "../database"
import type { GoalStore } from "./goal"
import { memoryGoalStore } from "./goals-memory"
import { postgresGoalStore } from "./goals-postgres"

/**
 * One application's goals (0350): Postgres when one is configured and memory
 * when not, memoised per application on a global carrier for `write.ts`'s
 * reason, where a second construction in memory is a second, empty list.
 */
const CARRIER_KEY = Symbol.for("loom.portal.goals")

type Carrier = { [CARRIER_KEY]?: Map<ApplicationId, GoalStore> }

const kept = ((globalThis as unknown as Carrier)[CARRIER_KEY] ??= new Map())

export const goalsFor = (application: ApplicationId): GoalStore => {
  const known = kept.get(application)

  if (known !== undefined) return known

  const made =
    portalDatabase === undefined
      ? memoryGoalStore()
      : postgresGoalStore(portalDatabase, { application })

  kept.set(application, made)

  return made
}
