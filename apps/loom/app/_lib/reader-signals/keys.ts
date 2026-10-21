import { z } from "zod"

import { ok, type Result } from "@jam-overture/loom"
import type { ApplicationId } from "@jam-overture/loom/store"

import { mintKey } from "@/app/(portal)/_lib/auth/accounts"

/**
 * The key a project's pages post their readers' signals with, and the half of
 * [0298](../../../../../decisions/0298-a-projects-ingest-key-is-public-and-names-its-application-and-the-door-files-nothing-it-cannot-name.md)
 * that has no database in it.
 *
 * **It names an application, not a project** (0296 clause 4). The product says
 * *the project's key*, and under one application per project that is the same
 * thing; the schema says application because that is what the five reader
 * tables carry, and a key that resolved to a project would need a second
 * lookup to find the column it is filed under.
 *
 * ## It is public, so it is stored as it is
 *
 * This is not a password and not an account key. It is pasted into a page and
 * sent by every browser that reads it, so anybody who opens the page source has
 * it. 0285 stores an account's key as a digest because the key *is* the
 * account; storing this one as a digest would protect a value that is already
 * printed on the customer's own website, and would cost the one thing a
 * snippet screen needs — showing the snippet again.
 *
 * What it buys is **attribution**: a delivery says which project it is for,
 * and one project's readers cannot arrive under another's name. What it does
 * not buy is secrecy, and nothing that reads it may treat it as if it did.
 *
 * ## It is still minted, never chosen
 *
 * Because it is the lookup. A chosen key would collide, would be guessable
 * from the project's name, and would make *which project is this* depend on
 * what somebody typed. 128 bits from the platform's randomness, under a prefix
 * that says what it is when it turns up in a log or a pasted snippet.
 */

/** What a delivery's key is read from: `/api/reader-signals?key=…`. */
export const INGEST_KEY_PARAMETER = "key"

/**
 * `lk_` and 32 hex characters.
 *
 * The prefix is the whole of how somebody reading a page's source, a request
 * log or a support thread tells this apart from an account key, which is the
 * same 32 hex characters and is a secret.
 */
export const ingestKeySchema = z
  .string()
  .regex(/^lk_[0-9a-f]{32}$/)
  .brand<"IngestKey">()

export type IngestKey = z.infer<typeof ingestKeySchema>

/** A new key, from the platform's randomness — the same 128 bits an account key is minted from. */
export const mintIngestKey = (): IngestKey => ingestKeySchema.parse(`lk_${mintKey()}`)

export type IngestKeyStoreError = {
  readonly code: "unavailable"
  readonly detail: string
}

/**
 * What the door needs, what a page needs to post with, and what minting needs,
 * and nothing else.
 *
 * No listing and no revocation without replacement: a key is replaced by
 * minting another, which ends the first, and that is the whole of rotation
 * here — 0285's shape for account keys, kept because a second lifecycle for a
 * second kind of key would be one more thing nothing builds the screens for.
 */
export interface IngestKeyStore {
  /** The application this key names, or `null` for a key this deployment never issued or has replaced. */
  readonly applicationWithKey: (
    key: IngestKey
  ) => Promise<Result<ApplicationId | null, IngestKeyStoreError>>

  /**
   * The key this application holds, or `null` for one never given a key.
   *
   * Readable because the key is (clause 2 of 0298): this is how a page this
   * deployment serves learns what to post with, and how 4c's screen shows a
   * snippet again.
   */
  readonly keyOf: (
    applicationId: ApplicationId
  ) => Promise<Result<IngestKey | null, IngestKeyStoreError>>

  /**
   * Give the application this key, ending whichever it held before.
   *
   * **Exactly one per application** (0296 clause 4), so this replaces rather
   * than adds: a project whose key leaked into somebody else's site is given a
   * new one, and the old one has to stop working at the same moment.
   */
  readonly put: (
    applicationId: ApplicationId,
    key: IngestKey,
    at: number
  ) => Promise<Result<void, IngestKeyStoreError>>
}

/**
 * Mint a key and give it to the application: the one act registration, the
 * connect screen's *replace* and `pnpm signals:key` all perform.
 *
 * One function rather than three copies of two lines, because the two lines
 * are an order — mint, then write — and a copy that wrote a key it had been
 * handed instead of one it minted would be a chosen key by another road.
 * Answers with the key that was written, so the caller can show the snippet
 * without asking the store for what it just told it.
 */
export const issueIngestKey =
  (keys: Pick<IngestKeyStore, "put">) =>
  async (
    applicationId: ApplicationId,
    at: number
  ): Promise<Result<IngestKey, IngestKeyStoreError>> => {
    const key = mintIngestKey()
    const written = await keys.put(applicationId, key, at)

    return written.ok ? ok(key) : written
  }
