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
  /**
   * Whether the site named this answer as the pages it already holds: its
   * `If-None-Match` matched, so it was answered `304`. A site keeps an answer's
   * tag only with the pages it names, so this is the one sign, from outside,
   * that it kept them rather than refusing them.
   */
  readonly kept: boolean
}

/** The first and the most recent pull a project's site made, in epoch milliseconds. */
export type PullSpan = {
  readonly first: number
  readonly last: number
}

/**
 * The newest answer a project's site was given, and whether it kept it.
 *
 * A site whose installed Loom cannot read an answer refuses it whole and goes
 * on asking for the pages it held, under their older tag, so the door answers
 * it the newest pages on every pull and is never told it holds them. From the
 * rows that is an answer taken again and again and never named back.
 */
export type NewestAnswer = {
  /** When the site was first and last answered with the newest pages, in epoch milliseconds. */
  readonly first: number
  readonly last: number
  /** The site has named the newest pages back as the ones it holds. */
  readonly kept: boolean
  /** The site has named some answer back, so it is one that says what it holds. */
  readonly anyKept: boolean
}

/** One answer the site was given: when it was first and last given, and whether it was named back. */
export type TakenAnswer = PullSpan & {
  /** The site named this answer back as the pages it holds. */
  readonly kept: boolean
}

export type TakenSince = {
  readonly answers: readonly TakenAnswer[]
  /**
   * The site has named some answer back, ever, so it is one that says what it
   * holds, and an answer it never named back is one it may have refused.
   */
  readonly namesBack: boolean
}

export type SitePullStoreError = { readonly code: "unavailable"; readonly detail: string }

export interface SitePullStore {
  /**
   * Idempotent, and in any order: a tag keeps the earliest and latest moment it
   * was taken, and once kept it stays kept.
   */
  readonly record: (pull: SitePull) => Promise<Result<void, SitePullStoreError>>
  /** `null` for a project whose site has never pulled. */
  readonly span: (
    application: ApplicationId
  ) => Promise<Result<PullSpan | null, SitePullStoreError>>
  /**
   * The answers the site was first given at or after `since`, earliest first,
   * and whether it is a site that names back the pages it holds.
   *
   * Accepting a change changes the live pages and so their entity tag, so the
   * answers given at or after the moment a change was accepted are the pages
   * that change made, and the first of them the site kept is when readers had
   * it: the *Live* step of the timeline from *Accept*. An answer first given
   * before `since` and again after it is pages from before, so it is not
   * listed.
   */
  readonly takenSince: (
    application: ApplicationId,
    since: number
  ) => Promise<Result<TakenSince, SitePullStoreError>>
  /** `null` for a project whose site has never pulled. */
  readonly newest: (
    application: ApplicationId
  ) => Promise<Result<NewestAnswer | null, SitePullStoreError>>
}
