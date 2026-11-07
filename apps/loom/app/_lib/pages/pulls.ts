import type { Result } from "@jam-overture/loom"
import type { ApplicationId } from "@jam-overture/loom/store"

/**
 * When a project's site took its live pages from the read door (0358 clause
 * 3), so the portal can say whether accepting a change reaches readers: until
 * the first pull a project is *connected for observation* (0275 clause 1).
 *
 * **Kept by the answer the site took, not by the request.** A site pulls on a
 * short interval and is mostly told `304`, so one row per pull would be a row a
 * minute saying nothing new. One row per entity tag, with when it was first and
 * last taken, is the same facts in a row per change of the live pages: it says
 * when the site last pulled, and when the pages an accepted change made were
 * first taken, which is the *Live* step of the timeline from *Accept*.
 */
export type SitePull = {
  readonly application: ApplicationId
  /** The entity tag the door answered with, `200` and `304` alike. */
  readonly tag: string
  readonly at: number
}

/** The first and the most recent pull a project's site made, in epoch milliseconds. */
export type PullSpan = {
  readonly first: number
  readonly last: number
}

export type SitePullStoreError = { readonly code: "unavailable"; readonly detail: string }

export interface SitePullStore {
  /** Idempotent, and in any order: a tag keeps the earliest and latest moment it was taken. */
  readonly record: (pull: SitePull) => Promise<Result<void, SitePullStoreError>>
  /** `null` for a project whose site has never pulled. */
  readonly span: (
    application: ApplicationId
  ) => Promise<Result<PullSpan | null, SitePullStoreError>>
}
