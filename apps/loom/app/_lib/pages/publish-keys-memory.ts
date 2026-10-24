import { ok } from "@jam-overture/loom"
import type { ApplicationId } from "@jam-overture/loom/store"

import type { PublishKeyStore } from "./publish-keys"

/** The publish keys in the process: the reference implementation. */
export const memoryPublishKeyStore = (): PublishKeyStore => {
  const held = new Map<ApplicationId, { readonly digest: string; readonly at: number }>()

  return {
    applicationWithDigest: (digest) => {
      const found = [...held].find(([, candidate]) => candidate.digest === digest)

      return Promise.resolve(ok(found === undefined ? null : found[0]))
    },

    mintedAt: (application) => Promise.resolve(ok(held.get(application)?.at ?? null)),

    put: (application, digest, at) => {
      held.set(application, { digest, at })

      return Promise.resolve(ok(undefined))
    },
  }
}
