import { ok } from "@jam-overture/loom"
import type { ApplicationId } from "@jam-overture/loom/store"

import type { IngestKey, IngestKeyStore } from "./keys"

/**
 * The keys in the process: the reference implementation, and what `pnpm dev`
 * runs on.
 *
 * It starts empty and nothing outside this process can put a key in it, for
 * the reason `accounts-memory.ts` gives about accounts — the command that
 * mints one writes to Postgres. So a deployment with no database takes no
 * keyed delivery, which is the right failure: its buffer is a map that the
 * next cold start has never heard of, and a customer's readers are not worth
 * collecting into that.
 */
export const memoryIngestKeyStore = (): IngestKeyStore => {
  const held = new Map<ApplicationId, IngestKey>()

  return {
    applicationWithKey: (key) => {
      const found = [...held].find(([, candidate]) => candidate === key)

      return Promise.resolve(ok(found === undefined ? null : found[0]))
    },

    keyOf: (applicationId) => Promise.resolve(ok(held.get(applicationId) ?? null)),

    /**
     * Keyed by the application, so a second key replaces the first rather than
     * standing beside it — which Postgres gets from the primary key, and a map
     * keyed the other way round would quietly fail to do.
     */
    put: (applicationId, key, _at) => {
      held.set(applicationId, key)

      return Promise.resolve(ok(undefined))
    },
  }
}
