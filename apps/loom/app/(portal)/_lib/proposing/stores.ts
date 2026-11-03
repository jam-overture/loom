import { DEFAULT_APPLICATION_ID, type ApplicationId } from "@jam-overture/loom/store"

import { portalDatabase } from "../database"
import type { PageCopyStore } from "./copies"
import { memoryPageCopyStore } from "./copies-memory"
import { postgresPageCopyStore } from "./copies-postgres"
import type { TurnedDownStore } from "./turned-down"
import { memoryTurnedDownStore } from "./turned-down-memory"
import { postgresTurnedDownStore } from "./turned-down-postgres"

/**
 * One application's page copies (0340) and turned-down changes (0341):
 * Postgres when one is configured and memory when not, memoised per
 * application on a global carrier for `write.ts`'s reason, where a second
 * construction in memory is a second, empty map.
 */
type Kept = {
  readonly copies: PageCopyStore
  readonly turnedDown: TurnedDownStore
}

const CARRIER_KEY = Symbol.for("loom.portal.proposing")

type Carrier = { [CARRIER_KEY]?: Map<ApplicationId, Kept> }

const kept = ((globalThis as unknown as Carrier)[CARRIER_KEY] ??= new Map())

const keptFor = (application: ApplicationId): Kept => {
  const known = kept.get(application)

  if (known !== undefined) return known

  const made: Kept =
    portalDatabase === undefined
      ? { copies: memoryPageCopyStore(), turnedDown: memoryTurnedDownStore() }
      : {
          copies: postgresPageCopyStore(portalDatabase, { application }),
          turnedDown: postgresTurnedDownStore(portalDatabase, { application }),
        }

  kept.set(application, made)

  return made
}

export const pageCopiesFor = (application: ApplicationId): PageCopyStore =>
  keptFor(application).copies

export const turnedDownFor = (application: ApplicationId): TurnedDownStore =>
  keptFor(application).turnedDown

/**
 * Whether an application's copies follow what its site publishes. This
 * deployment's own site serves its copies (0259), so there the copy is the
 * page and is never started again.
 */
export const followsItsSite = (application: ApplicationId): boolean =>
  application !== DEFAULT_APPLICATION_ID
