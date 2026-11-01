import { err, ok, type Result } from "@jam-overture/loom"
import type { ApplicationId } from "@jam-overture/loom/store"

import { portalAuth } from "@/app/(portal)/_lib/auth/config"
import { portalDatabase } from "@/app/(portal)/_lib/database"
import { readWithin } from "@/app/_lib/app/bounded-store"

import {
  keepModelKey,
  standingOf,
  type ModelKey,
  type ModelKeyStanding,
  type ModelKeyStore,
  type ModelKeyStoreError,
} from "./model-keys"
import { memoryModelKeyStore } from "./model-keys-memory"
import { postgresModelKeyStore } from "./model-keys-postgres"
import { sealerFrom } from "./seal"

/**
 * This deployment's model keys: Postgres when one is configured and memory
 * when not, memoised on a global carrier for `key-store.ts`'s reason.
 *
 * Sealed under the portal's session secret (0332 clause 2). A deployment
 * without one signs nobody in, so nobody can set a key on it either, and every
 * project reads as having none.
 */

const CARRIER_KEY = Symbol.for("loom.app.model-keys")

const store: ModelKeyStore = ((globalThis as unknown as { [CARRIER_KEY]?: ModelKeyStore })[
  CARRIER_KEY
] ??= portalDatabase === undefined ? memoryModelKeyStore() : postgresModelKeyStore(portalDatabase))

const sealer = portalAuth.ok ? sealerFrom(portalAuth.value.secret) : undefined

/** Whether this deployment can keep a model key at all. */
export const modelKeysKeepable = sealer !== undefined

/** One project's key, opened, read within the portal's budget. */
export const modelKeyOf = async (
  application: ApplicationId
): Promise<Result<ModelKeyStanding, ModelKeyStoreError>> => {
  if (sealer === undefined) return ok({ kind: "none" })

  const kept = await readWithin(
    () => store.kept(application),
    (detail) => ({ code: "unavailable" as const, detail })
  )

  return kept.ok ? ok(standingOf(kept.value, sealer)) : kept
}

export const setModelKey = (
  application: ApplicationId,
  key: ModelKey,
  at: number
): Promise<Result<void, ModelKeyStoreError>> =>
  sealer === undefined
    ? Promise.resolve(err({ code: "unavailable", detail: "this deployment has no session secret" }))
    : keepModelKey(store, sealer)(application, key, at)

export const removeModelKey = (
  application: ApplicationId
): Promise<Result<void, ModelKeyStoreError>> => store.remove(application)
