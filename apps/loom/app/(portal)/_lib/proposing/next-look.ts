import type { ModelKeyStanding } from "@/app/_lib/models/model-keys"

/**
 * When Loom next looks at a project's pages by itself: the line under
 * *For review*'s title (`docs/portal-wireframes.md`, *2 · For review*).
 *
 * Loom looks once a day, in the sweep `vercel.json` schedules (0329 clause 5),
 * and only at a project with a model key of its own (0332). So the next look
 * is the next time that schedule fires, where the deployment can start a
 * sweep at all and the project's key can be used; otherwise it is the reason
 * there is none, so the screen never promises a look that will not happen.
 */

/** The sweep's daily start in UTC, as `vercel.json` schedules `/api/proposals`; its test pins the two together. */
export const DAILY_LOOK_UTC = { hour: 14, minute: 0 } as const

export type DailyTime = { readonly hour: number; readonly minute: number }

export type NextLook =
  | { readonly kind: "scheduled"; readonly at: number }
  /** The deployment has no secret for its scheduler, so no sweep starts (`scheduleCheck`). */
  | { readonly kind: "no-schedule" }
  | { readonly kind: "no-key" }
  /** A key is kept but can no longer be opened, so the sweep passes the project by. */
  | { readonly kind: "key-unreadable" }

const MINUTE_MS = 60_000
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS

/** The first start of a daily schedule after `now`; one starting this very instant has begun, so the next is tomorrow's. */
export const nextDailyAt = (now: number, time: DailyTime): number => {
  const today = Math.floor(now / DAY_MS) * DAY_MS + time.hour * HOUR_MS + time.minute * MINUTE_MS

  return today > now ? today : today + DAY_MS
}

export const nextLookOf = ({
  now,
  scheduled,
  key,
  time = DAILY_LOOK_UTC,
}: {
  readonly now: number
  readonly scheduled: boolean
  readonly key: ModelKeyStanding
  readonly time?: DailyTime
}): NextLook => {
  if (!scheduled) return { kind: "no-schedule" }

  switch (key.kind) {
    case "none":
      return { kind: "no-key" }
    case "unreadable":
      return { kind: "key-unreadable" }
    case "set":
      return { kind: "scheduled", at: nextDailyAt(now, time) }
  }
}

/**
 * How long until a moment, in the words a person reads at a glance: minutes
 * under an hour, whole hours after, each rounded to the nearest and said as
 * *about* where it was rounded.
 */
export const untilWords = (ms: number): string => {
  if (ms < MINUTE_MS) return "in under a minute"

  if (ms < HOUR_MS) {
    const minutes = Math.round(ms / MINUTE_MS)

    return minutes === 60
      ? "in about an hour"
      : `in about ${minutes} minute${minutes === 1 ? "" : "s"}`
  }

  const hours = Math.round(ms / HOUR_MS)

  return hours === 1 ? "in about an hour" : `in about ${hours} hours`
}
