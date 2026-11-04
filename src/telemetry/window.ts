import { err, ok, type Result } from "../result.js"

/**
 * A stretch of wall-clock time a journal can be asked for, and the stretch a
 * page turned out to cover.
 *
 * A journal is paged by `seq`, which is arrival order and answers *the records
 * before these ones*. That is not the question anybody asks out loud. "Has it
 * got better since last week" is a question about time, and without a window
 * the nearest thing a screen could do was fold one page against the page before
 * it — two stretches of unequal wall-clock time whose inequality grows with how
 * busy the deployment is, so the comparison silently changed meaning while
 * every number in it stayed right.
 *
 * Both halves are here because they are one idea seen from two sides: the time
 * a read asks for, and the time a page answered with. A consumer that can state
 * the first and cannot read the second has to infer the second off the records,
 * which is where it gets the empty page wrong.
 */

/**
 * A half-open window over `recordedAt`, in epoch milliseconds.
 *
 * **Over `recordedAt`, and that is not negotiable.** `recordedAt` is stamped by
 * the journal on arrival; `occurredAt` is what the host said, and a host with a
 * skewed serverless clock or a replayed batch is describing its own timeline. A
 * bound on `occurredAt` would let a reader ask for a window and be handed
 * records from outside it, in page order, with nothing saying so — the same
 * argument `journal.ts` already makes about retention, that an age a writer can
 * choose is an age a writer can dodge.
 *
 * **Epoch milliseconds rather than the ISO strings a caller held.** One instant
 * may be written two ways — `2026-01-01T02:00:00Z` and
 * `2026-01-01T04:00:00+02:00` — and a journal comparing those as strings orders
 * them backwards and answers with a window nobody asked for. Holding the
 * instants makes comparing them the only thing an implementation can do.
 *
 * **Half-open: `since` is included, `until` is not.** Consecutive windows tile
 * without overlapping, which is the shape's whole purpose — *last week* against
 * *the week before* must not count a record that landed on the boundary twice.
 *
 * Built only by {@link telemetryWindow}. A window assembled by hand could hold
 * `NaN`, and every comparison against `NaN` is false, so one typo'd bound would
 * read as *nothing happened in that week* rather than as a mistake.
 */
export type TelemetryWindow = {
  /** Inclusive. Absent is unbounded into the past, back to the journal's start. */
  readonly since?: number
  /** Exclusive. Absent is unbounded toward the present. */
  readonly until?: number
}

/**
 * The ends of the stretch a page covers, as the journal stamped them.
 *
 * ISO strings rather than the instants {@link TelemetryWindow} holds, because
 * these are printed rather than compared: a screen saying which stretch it is
 * describing wants the stamp. A caller feeding one page's end back in as the
 * next read's bound hands the string to {@link telemetryWindow}, which is the
 * one place a string becomes an instant.
 */
export type TelemetrySpan = {
  readonly from: string
  readonly to: string
}

/**
 * Why a window could not be built.
 *
 * Both are caller mistakes rather than states of the journal, which is why they
 * are refused here and never reach it: `TelemetryError` says a journal is
 * `unavailable` and nothing else, deliberately, and a typo'd bound is not a
 * journal being unavailable.
 */
export type TelemetryWindowFault =
  | {
      readonly code: "unreadable-bound"
      readonly bound: "since" | "until"
      readonly given: string
    }
  | { readonly code: "inverted"; readonly since: string; readonly until: string }

export const describeTelemetryWindowFault = (fault: TelemetryWindowFault): string =>
  fault.code === "unreadable-bound"
    ? `a telemetry window's ${fault.bound} is not an instant: ${JSON.stringify(fault.given)}`
    : `a telemetry window ends before it begins: since ${fault.since} is after until ${fault.until}`

const instantOf = (bound: string | Date): number | undefined => {
  const instant = bound instanceof Date ? bound.getTime() : Date.parse(bound)

  return Number.isFinite(instant) ? instant : undefined
}

/**
 * A window, or the reason there is not one.
 *
 * Takes what a caller is actually holding — an ISO string off a record's
 * `recordedAt`, or a `Date` it did arithmetic on.
 *
 * An unbounded request, neither end named, is a window rather than a fault: it
 * is what `read` does with no window at all, and a caller assembling bounds
 * from two optional inputs should not have to special-case the day both are
 * absent.
 *
 * `since` equal to `until` is allowed and is empty by construction, the window
 * being half-open. That is a degenerate ask rather than a mistake, and a caller
 * slicing a range into windows produces it at the edges.
 */
export const telemetryWindow = (request: {
  readonly since?: string | Date
  readonly until?: string | Date
}): Result<TelemetryWindow, TelemetryWindowFault> => {
  const since = request.since === undefined ? undefined : instantOf(request.since)
  const until = request.until === undefined ? undefined : instantOf(request.until)

  if (request.since !== undefined && since === undefined)
    return err<TelemetryWindowFault>({
      code: "unreadable-bound",
      bound: "since",
      given: String(request.since),
    })

  if (request.until !== undefined && until === undefined)
    return err<TelemetryWindowFault>({
      code: "unreadable-bound",
      bound: "until",
      given: String(request.until),
    })

  if (since !== undefined && until !== undefined && since > until)
    return err<TelemetryWindowFault>({
      code: "inverted",
      since: new Date(since).toISOString(),
      until: new Date(until).toISOString(),
    })

  return ok<TelemetryWindow>({
    ...(since === undefined ? {} : { since }),
    ...(until === undefined ? {} : { until }),
  })
}

/**
 * Whether a `recordedAt` falls inside a window — the predicate every journal
 * that keeps its records in process has to apply, and the one a journal backed
 * by a query expresses as a `where` instead.
 *
 * A `recordedAt` that cannot be read is **outside every window**, which is the
 * only safe direction: a record whose stamp is unreadable cannot be claimed to
 * belong to a stretch of time, and letting it in would put a record of unknown
 * date inside a window somebody is about to draw a conclusion from. It stays
 * visible to an unwindowed read, which is where it can be noticed.
 */
export const withinTelemetryWindow = (
  window: TelemetryWindow | undefined,
  recordedAt: string
): boolean => {
  if (window === undefined) return true

  const instant = Date.parse(recordedAt)
  if (!Number.isFinite(instant)) return false

  return (
    (window.since === undefined || instant >= window.since) &&
    (window.until === undefined || instant < window.until)
  )
}

/**
 * The stretch a page covers: the earliest and latest `recordedAt` among its
 * records, as they were stamped.
 *
 * **`null` on an empty page, rather than two nulls.** A consumer taking the ends
 * off the first and last record got them wrong on an empty page and had to
 * remember to check — and *there is no answer* and *the answer covers no time*
 * are different claims a pair of nulls cannot tell apart.
 *
 * **The earliest and latest rather than the first and last.** A page ascends by
 * `seq`, and `seq` is allocated at insert while `recordedAt` is a clock's
 * reading, so two writers whose transactions overlap can land a lower
 * `recordedAt` at a higher `seq`. First-and-last would then report a span
 * running backwards. A page is bounded by a clamped limit, so scanning it costs
 * nothing worth saving.
 *
 * A stamp that cannot be read defines neither end, for the reason
 * {@link withinTelemetryWindow} refuses it: it is a date nobody knows. A page
 * holding nothing else spans nothing.
 */
export const telemetrySpanOf = (
  records: readonly { readonly recordedAt: string }[]
): TelemetrySpan | null =>
  records.reduce<TelemetrySpan | null>((span, { recordedAt }) => {
    const instant = Date.parse(recordedAt)
    if (!Number.isFinite(instant)) return span
    if (span === null) return { from: recordedAt, to: recordedAt }

    return {
      from: Date.parse(span.from) <= instant ? span.from : recordedAt,
      to: Date.parse(span.to) >= instant ? span.to : recordedAt,
    }
  }, null)
