/**
 * A moment, as something you read rather than something you parse.
 *
 * The journal times everything in ISO-8601 UTC, which is exactly right for a
 * record and wrong on a screen: `2026-07-31T09:04:00.000Z` makes a reader do
 * three separate jobs — split it at the `T`, notice the `Z`, and drop the
 * milliseconds — before they learn anything. This does those three jobs.
 *
 * Deliberately *not* `toLocaleString`. This runs in a Server Component, so a
 * locale-dependent or timezone-dependent format would be rendered on the server
 * in the server's locale and then re-rendered in the browser's, which is a
 * hydration mismatch that shows up as a flicker or a React warning nobody can
 * reproduce locally. So the format is fixed, the zone is named rather than
 * converted, and the output is the same everywhere.
 *
 * The ISO string is never dropped. Every caller keeps it in the `dateTime`
 * attribute, where a machine reads it and a person does not have to.
 */

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

const ISO_UTC = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/

/**
 * Anything that is not an ISO instant comes back untouched.
 *
 * The journal validates its timestamps, so this branch should be unreachable —
 * but the alternative to returning the input is printing `NaN undefined` at a
 * reader, and a raw timestamp they have to decode is strictly better than a
 * confident lie about when something happened.
 */
export const plainMoment = (iso: string): string => {
  const parts = ISO_UTC.exec(iso)
  if (parts === null) return iso

  const [, year, month, day, hour, minute] = parts
  const monthName = MONTHS[Number(month) - 1]
  if (monthName === undefined) return iso

  return `${Number(day)} ${monthName} ${year} at ${hour}:${minute} UTC`
}

/**
 * The same moment, to the day.
 *
 * A stretch of the record spans days, and a span printed to the minute at both
 * ends is four numbers a reader has to subtract before they learn it covers
 * about a week. The time is dropped rather than hidden: every caller that needs
 * the instant keeps the ISO string, as above.
 */
export const plainDay = (iso: string): string => {
  const parts = ISO_UTC.exec(iso)
  if (parts === null) return iso

  const [, year, month, day] = parts
  const monthName = MONTHS[Number(month) - 1]
  if (monthName === undefined) return iso

  return `${Number(day)} ${monthName} ${year}`
}
