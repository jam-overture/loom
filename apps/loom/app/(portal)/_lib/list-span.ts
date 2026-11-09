/**
 * The line under every list in the portal saying which rows the page shows and
 * the stretch of time they cover (`docs/portal-wireframes.md`, *Patterns every
 * screen shares*, *Pagination*: `1–50 of 4,812 · 05:41 to 06:12 today`). Pure.
 *
 * Times are UTC and say so, as everywhere else in the portal (`when.ts`): the
 * line is rendered on the server, so a reader's own zone would be a guess.
 */

/** How many rows the list holds, and whether the read stopped at a limit so there may be more. */
export type ListTotal = { readonly count: number; readonly more: boolean }

const MONTHS: readonly string[] = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

const DAY_MS = 86_400_000

const counted = (count: number): string => count.toLocaleString("en-GB")

/**
 * `1–50 of 312`, `51 of 51`, `1–50 of 500 or more`. `first` is 1-based, as a
 * person counts; a total is printed only where the list knows it.
 */
export const positionWords = (first: number, last: number, total: ListTotal): string => {
  const shown = first === last ? counted(first) : `${counted(first)}–${counted(last)}`

  return `${shown} of ${counted(total.count)}${total.more ? " or more" : ""}`
}

/** `today`, `yesterday`, `7 November`, or `7 November 2025` outside the current year. */
const dayWords = (at: Date, now: Date): string => {
  const days = Math.round(
    (Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) -
      Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate())) /
      DAY_MS
  )

  if (days === 0) return "today"
  if (days === 1) return "yesterday"

  const date = `${at.getUTCDate()} ${MONTHS[at.getUTCMonth()] ?? ""}`

  return at.getUTCFullYear() === now.getUTCFullYear() ? date : `${date} ${at.getUTCFullYear()}`
}

const clockWords = (at: Date): string => at.toISOString().slice(11, 16)

/** A row's moment: an ISO instant, or milliseconds since the epoch. */
export type Moment = string | number

/**
 * The stretch from the oldest row on a page to the newest: `05:41 to 06:12 UTC
 * today`, `at 05:41 UTC today` for one moment, `7 November 22:10 to today 06:12
 * UTC` across days. `undefined` for an empty page or an end that is not a
 * moment, rather than a line that guesses.
 */
export const stretchWords = (
  oldest: Moment | undefined,
  newest: Moment | undefined,
  now: number
): string | undefined => {
  if (oldest === undefined || newest === undefined) return undefined

  const from = new Date(oldest)
  const to = new Date(newest)
  const today = new Date(now)

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return undefined

  const fromDay = dayWords(from, today)
  const toDay = dayWords(to, today)

  if (fromDay !== toDay) return `${fromDay} ${clockWords(from)} to ${toDay} ${clockWords(to)} UTC`

  const on = fromDay === "today" || fromDay === "yesterday" ? fromDay : `on ${fromDay}`

  return clockWords(from) === clockWords(to)
    ? `at ${clockWords(to)} UTC ${on}`
    : `${clockWords(from)} to ${clockWords(to)} UTC ${on}`
}

/** The whole line: what the page shows, then its stretch of time where there is one. */
export const spanLine = (shown: string, stretch: string | undefined): string =>
  stretch === undefined ? shown : `${shown} · ${stretch}`
