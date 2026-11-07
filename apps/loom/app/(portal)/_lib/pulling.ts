import type { Result } from "@jam-overture/loom"
import { DEFAULT_APPLICATION_ID, type ApplicationId } from "@jam-overture/loom/store"

import type { NewestAnswer, PullSpan } from "@/app/_lib/pages/pulls"

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

/**
 * Whether the site keeps the newest pages it is given, which pulling alone
 * does not say: a site whose installed Loom cannot read an answer refuses it
 * whole, goes on showing the pages it held, and goes on pulling, so it looks
 * from the door like a site that is up to date (`FINDINGS.md`, 7 November).
 * It goes on naming the pages it held as the ones it has, so the newest answer
 * is given again on every pull and never named back.
 */
export type Keeping =
  /**
   * Nothing says otherwise: it named the newest pages back, it has not pulled
   * for long enough since they were first given to tell, or it has never named
   * any pages back, which a site that keeps them always does.
   */
  | { readonly kind: "keeps" }
  | { readonly kind: "unreadable" }
  /** Given the newest pages since `since`, for {@link NOT_KEPT_AFTER_MS} or more, and never named them back. */
  | { readonly kind: "not-kept"; readonly since: number }

/**
 * How long a site is given the newest pages without naming them back before
 * the screen says it is not keeping them.
 *
 * A site that keeps them names them back on its very next pull, a minute later
 * at the interval the pull client suggests, so ten minutes is ten chances; and
 * a site that pulls less often than that is never said to refuse on one answer,
 * because it takes two answers to span any time at all.
 */
export const NOT_KEPT_AFTER_MS = 10 * 60 * 1000

export const keepingOf = (newest: Result<NewestAnswer | null, unknown>): Keeping => {
  if (!newest.ok) return { kind: "unreadable" }

  const answer = newest.value

  return answer !== null &&
    answer.anyKept &&
    !answer.kept &&
    answer.last - answer.first >= NOT_KEPT_AFTER_MS
    ? { kind: "not-kept", since: answer.first }
    : { kind: "keeps" }
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

/**
 * What *Connect your site* says: whether the site pulls, and, while it does,
 * whether it keeps what it is given. A site that has gone quiet is told that
 * first, because nothing it is given reaches it either way.
 */
export const connectionWords = (
  pulling: Pulling,
  keeping: Keeping
): { readonly title: string; readonly lines: readonly string[] } => {
  const words = pullingWords(pulling)

  if (pulling.kind !== "pulling" || pulling.quiet) return words

  switch (keeping.kind) {
    case "keeps":
      return words
    case "unreadable":
      return {
        ...words,
        lines: [
          ...words.lines,
          "Whether it keeps the newest pages it is given could not be read. If this stays, this deployment may not have that part of the record yet.",
        ],
      }
    case "not-kept":
      return {
        title: "Your site pulls, and is not keeping its newest pages",
        lines: [
          `Since ${moment(keeping.since)} it has been given pages it has not kept: it goes on asking for the ones it had before, so a change accepted since then has not reached readers.`,
          "The usual cause is that the version of Loom installed on your site cannot read them. Updating it there lets your site take them on its next pull.",
          `It last pulled on ${moment(pulling.last)}.`,
        ],
      }
  }
}
