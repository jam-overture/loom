import { timingSafeEqual } from "node:crypto"

/**
 * Who may start the daily sweep: the scheduler, and nobody else.
 *
 * Vercel's scheduler sends `Authorization: Bearer <CRON_SECRET>` when the
 * deployment has that variable, so the route answers only a request carrying
 * it. A deployment without one starts no sweep from outside at all: an open
 * route would let anybody spend every project's model key on demand.
 */

/** Long enough that guessing it costs more than it could spend. */
export const MINIMUM_CRON_SECRET_LENGTH = 16

export type ScheduleCheck = "allowed" | "refused" | "unconfigured"

export const scheduleCheck = (
  authorization: string | null,
  secret: string | undefined
): ScheduleCheck => {
  const expected = secret?.trim() ?? ""

  if (expected.length < MINIMUM_CRON_SECRET_LENGTH) return "unconfigured"

  const given = Buffer.from(authorization ?? "")
  const wanted = Buffer.from(`Bearer ${expected}`)

  return given.length === wanted.length && timingSafeEqual(given, wanted) ? "allowed" : "refused"
}
