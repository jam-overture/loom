import type { Result } from "@jam-overture/loom"
import { DEFAULT_APPLICATION_ID, type ApplicationId } from "@jam-overture/loom/store"

import type { PullSpan } from "@/app/_lib/pages/pulls"

import { plainMoment } from "./when"

/**
 * Whether a project's site takes its live pages, said to the person deciding
 * whether to accept a change (0358). Until a site pulls, *Accept* changes
 * Loom's copy of a page and no reader sees it: the project is *connected for
 * observation* (0275 clause 1), and the screen says so in those words.
 */
export type Pulling =
  /** This deployment's own site serves its pages from the store (0259), so it never pulls. */
  | { readonly kind: "own-site" }
  | { readonly kind: "unreadable" }
  | { readonly kind: "never" }
  | {
      readonly kind: "pulling"
      readonly first: number
      readonly last: number
      /** No pull for longer than {@link QUIET_AFTER_MS}. */
      readonly quiet: boolean
    }

/**
 * How long without a pull before the screen says a site may have stopped.
 *
 * The interval is the site's to choose (the pull client's finding suggests a
 * minute), so this is generous on purpose: an hour is sixty missed pulls at the
 * suggested rate, and still short enough that a person is told the same day.
 */
export const QUIET_AFTER_MS = 60 * 60 * 1000

export const pullingOf = (
  application: ApplicationId,
  span: Result<PullSpan | null, unknown>,
  now: number
): Pulling => {
  if (application === DEFAULT_APPLICATION_ID) return { kind: "own-site" }
  if (!span.ok) return { kind: "unreadable" }
  if (span.value === null) return { kind: "never" }

  return { kind: "pulling", ...span.value, quiet: now - span.value.last > QUIET_AFTER_MS }
}

const moment = (at: number): string => plainMoment(new Date(at).toISOString())

/** The heading and the sentences under it, plain words first. */
export const pullingWords = (
  pulling: Pulling
): { readonly title: string; readonly lines: readonly string[] } => {
  switch (pulling.kind) {
    case "own-site":
      return {
        title: "Your site serves Loom's pages directly",
        lines: [
          "This deployment's own site reads its pages from Loom as it draws them, so a change you accept is live at once.",
        ],
      }
    case "unreadable":
      return {
        title: "Whether your site pulls could not be read",
        lines: [
          "Nothing here is a statement about your site. If this stays, this deployment may not have the table that records pulls yet.",
        ],
      }
    case "never":
      return {
        title: "Your site is not pulling yet",
        lines: [
          "It is connected for observation only: a change you accept goes onto Loom's copy of the page, and no reader sees it until your site's server pulls its pages.",
        ],
      }
    case "pulling":
      return pulling.quiet
        ? {
            title: "Your site has stopped pulling",
            lines: [
              `It last pulled on ${moment(pulling.last)}, so a change accepted since then may not have reached readers.`,
              `It first pulled on ${moment(pulling.first)}.`,
            ],
          }
        : {
            title: "Your site pulls its pages",
            lines: [
              `It last pulled on ${moment(pulling.last)}, so a change you accept is live from its next pull.`,
              `It first pulled on ${moment(pulling.first)}.`,
            ],
          }
  }
}
