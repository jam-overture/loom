/**
 * The pin a reader carries, and the version of a page it asks for.
 *
 * A reader's first page view under a window pins them to the project's live
 * pages as they stood at that moment, and every page they read until the window
 * runs out is drawn as it stood then (0383 clause 2). This is the whole of that
 * in the customer's server: a number read out of a request's `Cookie` header, a
 * version chosen against what the last pull held, and the `Set-Cookie` value a
 * reader with no pin is given.
 *
 * **Nothing here reaches Loom, and nothing here is a reader id.** The pin is
 * the number the project's live pages stood at when the reader first arrived,
 * so every reader who arrived between the same two changes carries the same
 * value (0383 clause 3). It goes on no signal and no pull (0146, 0262): the
 * door is asked for the project's pages, never for this reader's.
 *
 * **A pin the server cannot resolve reads the newest live page**, and a server
 * holding nothing renders the page as built (0383 clause 5). Every refusal in
 * this file is that sentence — freshness is what fails, never the page.
 */

import type { TreeId } from "../ids.js"
import type { LoomTree } from "../tree/tree.js"

/**
 * One version of a page a pin can still be served.
 *
 * `until` is the number the change that replaced this version became live at,
 * so this version is what a pin *below* that number asks for.
 */
export type HeldVersion = {
  readonly until: number
  readonly tree: LoomTree
}

/**
 * How long this project holds its readers, and what a pin needs to be
 * resolved — the door's `window`, as the pull read it.
 *
 * **The numbers are milliseconds** (when each state of the pages was made), so
 * they only ever increase and they do not go up by one. Everything here
 * compares them and nothing counts them.
 */
export type ReadersHeld = {
  /** How long a reader keeps the pages they first saw. */
  readonly ms: number
  /** The number below which a pin reads the newest pages: a snapshot or a revert raised it. */
  readonly floor: number
  /** What the pages stand at now, which is what a new reader is pinned to. */
  readonly number: number
  /** Each page's versions a pin can still be served, by the page's own id. */
  readonly held: ReadonlyMap<TreeId, readonly HeldVersion[]>
}

export type LiveWindow = { readonly ms: 0 } | ReadersHeld

/**
 * Whether this project holds its readers at all.
 *
 * A predicate rather than `window.ms === 0` at each use: `ms` is a length on
 * one side of the union and the literal `0` on the other, so a comparison does
 * not narrow it and every reader of this file would have to know that.
 */
const holdsReaders = (window: LiveWindow): window is ReadersHeld => window.ms !== 0

/**
 * Readers are not held: every page view reads the newest live page, no cookie
 * is set, and nothing is kept on a reader's device.
 *
 * This is the default a project has until somebody chooses otherwise (0383
 * clause 1), what a server holds before its first pull, and what a door from
 * before the window answers.
 */
export const WINDOW_OFF: LiveWindow = { ms: 0 }

/** The cookie the pin is kept in, first-party, on the customer's own domain. */
export const PIN_COOKIE = "loom_pin"

/** The one spelling of a pin: what `pinCookieFor` writes, and nothing else. */
const DECIMAL = /^(?:0|[1-9][0-9]*)$/

/**
 * The pin in a request's `Cookie` header, or `undefined` for a reader who has
 * no usable one.
 *
 * **This asks one question and it is a syntactic one: is there a whole number
 * under our name?** Whether that number can be resolved against the window the
 * last pull brought is `livePageOf`'s question, and the two are deliberately
 * apart — a pin from before the floor is a reader who *has* a pin and must not
 * be given a new one (0383 clause 3), while a cookie holding something that is
 * not a number is a reader who has none and gets one. Answering both here would
 * make those one answer, and they are opposite acts.
 *
 * A header carrying our name twice is read as its first value. A browser sends
 * one for a cookie set at `Path=/`, and two would have no single reading.
 *
 * **Only a value this file could have written is read**: digits, no sign, no
 * point, no exponent, no leading zero. `Number` would read `1e3` as 1,000 and
 * an empty string as `0` — and `0` is a pin below every floor rather than the
 * absence of one, which is the difference between serving this reader the
 * newest page and giving them a pin they never had. A cookie under our name
 * holding anything else was not set by `pinCookieFor`, so its reader has no pin
 * and gets one.
 */
export const pinIn = (cookies: string | null | undefined): number | undefined => {
  if (cookies === undefined || cookies === null) return undefined

  const value = cookies
    .split(";")
    .map((pair) => pair.trim())
    .find((pair) => pair.startsWith(`${PIN_COOKIE}=`))
    ?.slice(PIN_COOKIE.length + 1)

  if (value === undefined || !DECIMAL.test(value)) return undefined

  const pin = Number(value)

  return Number.isSafeInteger(pin) ? pin : undefined
}

/**
 * The version of this page to draw for a reader carrying this pin, or
 * `undefined` where the pin asks for the newest live page.
 *
 * The four pins that read the newest are the four 0383 clause 5 names: no
 * window set, a pin below the floor (so a snapshot from the site or an accepted
 * revert has overtaken it — clause 4), a pin above the number the pages stand
 * at, and a page this pin was never held a version of.
 *
 * **The version served is the one with the earliest `until` after the pin**,
 * rather than the first in the list. The door answers them oldest first and
 * both readings agree on an ordered list; reading the order would make a
 * reader's page depend on it, and the cost of a list that arrived out of order
 * is a reader served a *newer* page than they were pinned to, which is the one
 * flip this record exists to remove.
 */
export const heldVersionFor = (
  window: LiveWindow,
  page: TreeId,
  pin: number | undefined
): LoomTree | undefined => {
  if (pin === undefined || !holdsReaders(window)) return undefined
  if (!Number.isSafeInteger(pin) || pin < window.floor || pin > window.number) return undefined

  return (window.held.get(page) ?? [])
    .filter((version) => version.until > pin)
    .reduce<HeldVersion | undefined>(
      (earliest, version) =>
        earliest === undefined || version.until < earliest.until ? version : earliest,
      undefined
    )?.tree
}

/**
 * The `Set-Cookie` value for this reader, or `undefined` to set none.
 *
 * **A reader who has a pin is never given another one** (0383 clause 3). A
 * cookie renewed on every visit would hold a daily reader on one version for
 * ever, so the expiry is set once, at first sight, and never extended. Nothing
 * is set while the window is *Off*, which is every project that has not chosen
 * one.
 *
 * **The expiry is `Max-Age` and there is no clock in this function.** Both are
 * one choice: `Max-Age` is counted from when the reader's browser receives the
 * response, which is first sight exactly, so the window cannot be lengthened or
 * shortened by the server's clock drifting from the reader's — which is what
 * `Expires` is compared against. It also makes this a pure function of what the
 * last pull brought, with no `now` to be wrong about.
 *
 * A window under a second rounds to no cookie rather than to `Max-Age=0`: both
 * hold the reader for no time at all, and a cookie that is dead on arrival is
 * a thing somebody has to explain.
 */
export const pinCookieFor = (
  held: { readonly window: LiveWindow },
  pin: number | undefined
): string | undefined => {
  const { window } = held

  if (pin !== undefined || !holdsReaders(window)) return undefined

  const seconds = Math.floor(window.ms / 1000)

  return seconds < 1
    ? undefined
    : `${PIN_COOKIE}=${window.number}; Max-Age=${seconds}; Path=/; HttpOnly; Secure; SameSite=Lax`
}
