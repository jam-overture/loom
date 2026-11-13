import type { Result } from "@jam-overture/loom"

import type { KeptReaderWindow, ReaderWindow } from "@/app/_lib/pages/reader-windows"

import { plainMoment } from "./when"

/**
 * What *Settings* says about how long a reader keeps the pages they first saw
 * (0383). Pure, so every sentence is tested without a screen.
 */

/** Each choice as the screen names it. */
export const WINDOW_LABEL: Readonly<Record<ReaderWindow, string>> = {
  off: "Off",
  "1h": "1 hour",
  "1d": "1 day",
  "7d": "7 days",
}

/** A window that holds a reader, as a length of time inside a sentence. */
const HELD_FOR: Readonly<Record<Exclude<ReaderWindow, "off">, string>> = {
  "1h": "an hour",
  "1d": "a day",
  "7d": "seven days",
}

/**
 * The window a project has, said to anybody who opens *Settings*.
 *
 * Never chosen and *Off* read the same to a site, and are said apart only by
 * the *since*: a person who chose *Off* is told when, so the screen does not
 * read as though nobody had looked.
 */
export const windowSentence = (
  kept: Result<KeptReaderWindow | null, { readonly detail: string }>
): string => {
  if (!kept.ok) {
    return "The store did not say how long readers keep a page, so nothing here is a statement about it. A deployment updated on or after 13 November keeps it only once its database has been brought up to date."
  }

  if (kept.value === null)
    return "Off: every page view shows the newest pages. Nobody has changed it."

  const since = plainMoment(new Date(kept.value.setAt).toISOString())

  return kept.value.window === "off"
    ? `Off since ${since}: every page view shows the newest pages.`
    : `A reader keeps the pages they first saw for ${HELD_FOR[kept.value.window]}, since ${since}.`
}

/** What a window does, beside the choice (0383 clauses 2 and 4). */
export const WINDOW_MEANING =
  "A reader's first visit keeps them on your pages as they stood then, until the time runs out. New readers always get the newest. A newer version of your site, or a change you take back, reaches everybody at once."

/** What a window puts on readers' devices, beside the choice (0383 clauses 3 and 7). */
export const COOKIE_SENTENCE =
  "Anything but Off puts one cookie on your readers' devices. Your own server sets it, it holds a number shared by every reader who arrived between the same two changes, and it never comes to Loom. Whether your readers must agree to it first is yours to decide with your own advice."

/**
 * Said while nothing yet holds a reader: the read door does not answer the
 * versions a pin needs, and the package a site runs cannot read one. A choice
 * is kept meanwhile, so it is in place the day both arrive.
 */
export const NOT_IN_EFFECT =
  "Not in effect yet. Loom does not yet hand your site what keeping a reader on older pages needs, so every reader gets the newest pages whatever is chosen here. The choice is kept for when it does."

/**
 * A sentence to paste into the site's privacy notice (0383 clause 7), for a
 * window that sets the cookie. *Off* sets none, so it has none to paste.
 */
export const privacyNoticeSentence = (window: ReaderWindow): string | undefined =>
  window === "off"
    ? undefined
    : `This site sets one cookie that keeps the pages you see the same for up to ${HELD_FOR[window]} after your first visit. It holds a number shared by everyone who arrived around the same time, so it does not identify you, and it is not sent to anyone else.`
