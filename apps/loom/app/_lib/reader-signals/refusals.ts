import type { Result } from "@jam-overture/loom"

/**
 * The deliveries the door turned away that named a project (0311).
 *
 * The door refuses before it writes, so until this a refused batch left no
 * trace, and the one question a person setting up their site most needs
 * answered — *is my page posting and being turned away, or not posting at
 * all?* — had no answer on the screen they were looking at.
 *
 * **Only refusals that name a project are counted**, because a count needs
 * somewhere to be kept. A delivery with no key, or a key nobody issued, names
 * nobody; one refused for size or rate is turned away before it is known
 * whose it is, and reading the key to find out would spend this deployment's
 * database on exactly the caller the gate exists to stop.
 */

export type RefusalReason =
  /** The project names its site, and this delivery came from another one or from none. */
  | "wrong-site"
  /** The project is closed (0289). */
  | "closed"
  /** The key was right and the body was not something the door could read. */
  | "unreadable"

export const REFUSAL_REASONS: readonly RefusalReason[] = ["wrong-site", "closed", "unreadable"]

/** How many of one reason, and the newest of them. */
export type RefusalTally = {
  readonly reason: RefusalReason
  readonly refused: number
  readonly lastAt: number
  /**
   * The site the newest one came from, as an origin (`https://shop.example`),
   * or `null` where it named none. Kept for `wrong-site` above all: *refused
   * from `https://loomjs.org`* is the whole answer to a project that names
   * `www.loomjs.org`.
   */
  readonly lastOrigin: string | null
}

export type RefusalStoreError = { readonly code: "unavailable"; readonly detail: string }

/**
 * One application's refusals, scoped at construction like every store the door
 * files into (`Filing`), so a refusal cannot be counted against the wrong
 * project by passing the wrong id.
 */
export interface RefusalCounter {
  readonly record: (
    reason: RefusalReason,
    origin: string | null,
    at: number
  ) => Promise<Result<void, RefusalStoreError>>
  /** One tally per reason that has happened, in `REFUSAL_REASONS` order. */
  readonly read: () => Promise<Result<readonly RefusalTally[], RefusalStoreError>>
}

/**
 * An `Origin` header as something safe to keep and show: the origin a URL
 * parses to, or `null` for none, for `"null"`, and for anything that is not
 * one. The header is the sender's to write, so what reaches a table and then a
 * screen is what `URL` made of it rather than what was typed.
 */
export const keptOrigin = (header: string | null): string | null => {
  if (header === null || header === "null") return null

  try {
    const origin = new URL(header).origin

    return origin === "null" ? null : origin
  } catch {
    return null
  }
}

/** Tallies in the order a screen lists them, whatever order a store returned. */
export const inReasonOrder = (tallies: readonly RefusalTally[]): readonly RefusalTally[] =>
  REFUSAL_REASONS.flatMap((reason) => tallies.filter((tally) => tally.reason === reason))
