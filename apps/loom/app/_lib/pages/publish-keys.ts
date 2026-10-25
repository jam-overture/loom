import { z } from "zod"

import { ok, type Result } from "@jam-overture/loom"
import type { ApplicationId } from "@jam-overture/loom/store"

import { digestOf, mintKey } from "@/app/(portal)/_lib/auth/accounts"

/**
 * The key a site's build publishes its pages with (0312 clause 2).
 *
 * A secret, unlike the ingest key beside it: the ingest key is in every page
 * and can only add readers, while this one changes what Loom believes a page
 * is. So it is minted by the portal, shown once, and kept as a digest — 0285's
 * account key, for 0285's reasons.
 */

/**
 * `lp_` and 32 hex characters. The prefix is how somebody reading a build log
 * tells it apart from the public `lk_` key, which looks the same after it.
 */
export const publishKeySchema = z
  .string()
  .regex(/^lp_[0-9a-f]{32}$/)
  .brand<"PublishKey">()

export type PublishKey = z.infer<typeof publishKeySchema>

export const mintPublishKey = (): PublishKey => publishKeySchema.parse(`lp_${mintKey()}`)

/** What is stored and compared: the key's SHA-256, never the key. */
export const publishKeyDigest = (key: PublishKey): Promise<string> => digestOf(key)

export type PublishKeyStoreError = { readonly code: "unavailable"; readonly detail: string }

export interface PublishKeyStore {
  /** The application a key's digest names, or `null` for one never issued or since replaced. */
  readonly applicationWithDigest: (
    digest: string
  ) => Promise<Result<ApplicationId | null, PublishKeyStoreError>>
  /** When the application's current key was minted, or `null` where it has none. */
  readonly mintedAt: (
    application: ApplicationId
  ) => Promise<Result<number | null, PublishKeyStoreError>>
  /** Keyed by the application, so a second key ends the first. */
  readonly put: (
    application: ApplicationId,
    digest: string,
    at: number
  ) => Promise<Result<void, PublishKeyStoreError>>
}

/**
 * Mint a key, keep its digest, and hand back the key itself — the only time
 * anything will.
 */
export const issuePublishKey =
  (store: PublishKeyStore) =>
  async (
    application: ApplicationId,
    at: number
  ): Promise<Result<PublishKey, PublishKeyStoreError>> => {
    const key = mintPublishKey()
    const kept = await store.put(application, await publishKeyDigest(key), at)

    return kept.ok ? ok(key) : kept
  }
