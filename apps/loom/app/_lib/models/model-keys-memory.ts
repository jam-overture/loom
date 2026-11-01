import { ok } from "@jam-overture/loom"
import type { ApplicationId } from "@jam-overture/loom/store"

import type { KeptModelKey, ModelKeyStore } from "./model-keys"

/** The model keys in the process: the reference implementation. */
export const memoryModelKeyStore = (): ModelKeyStore => {
  const held = new Map<ApplicationId, KeptModelKey>()

  return {
    kept: (application) => Promise.resolve(ok(held.get(application) ?? null)),

    put: (application, key) => {
      held.set(application, key)

      return Promise.resolve(ok(undefined))
    },

    remove: (application) => {
      held.delete(application)

      return Promise.resolve(ok(undefined))
    },
  }
}
