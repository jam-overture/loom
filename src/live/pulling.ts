/**
 * The loop that keeps a customer's server current: pull, hold, wait, pull
 * again.
 *
 * This is the one stateful thing in the pull — a server holds its live pages
 * and a timer, and both belong to the process rather than to a request. It is a
 * closure and not a class because there is nothing to inherit and nothing to
 * override: the two functions a host calls are reading what is held and
 * stopping.
 *
 * **No reader ever waits on it.** The loop runs beside the render path, the
 * first pull is made at once rather than after an interval, and the next is
 * scheduled only when the last has settled — so a slow Loom stretches the
 * interval instead of stacking requests behind it. A render reads whatever is
 * held at the moment it asks, which before the first answer is nothing, and
 * nothing means the page as built.
 */

import { ceilingOf } from "../deadline.js"

import { NO_LIVE_PAGES, type LivePages } from "./pages.js"
import { pullLivePages, withPullOutcome, type PullLivePagesOptions, type SitePullOutcome } from "./pull.js"

/** A minute, which is a change live within a minute of somebody accepting it. */
export const DEFAULT_PULL_INTERVAL_MS = 60_000

/**
 * How the loop waits, as a function, so a test can drive it without a clock.
 *
 * It answers with its own cancel rather than a handle, which is the only part
 * of a timer this module uses and the part every runtime spells differently.
 */
export type PullSchedule = (run: () => void, afterMs: number) => () => void

const scheduleWithTimeout: PullSchedule = (run, afterMs) => {
  const handle: ReturnType<typeof setTimeout> = setTimeout(run, afterMs)

  /*
   * A pending pull must not be the reason a process will not exit: a server
   * shutting down between pulls would otherwise wait out the interval. Guarded
   * because `unref` is Node's and not the web's.
   */
  if (typeof handle === "object" && typeof handle.unref === "function") handle.unref()

  return () => clearTimeout(handle)
}

export type StartPullingOptions = PullLivePagesOptions & {
  /** How long between pulls. `DEFAULT_PULL_INTERVAL_MS` when unset. */
  readonly intervalMs?: number
  /**
   * Told of every outcome, after what is held has moved.
   *
   * This is where a deployment logs a failed pull, and the only way it learns
   * of one: nothing here writes to a console, because a library that logs on
   * its host's behalf logs in the wrong format and at the wrong level.
   */
  readonly onOutcome?: (outcome: SitePullOutcome, held: LivePages) => void
  readonly now?: () => number
  readonly schedule?: PullSchedule
}

/**
 * A running pull: what it holds, a way to pull out of turn, and a way to stop.
 *
 * `pullNow` answers the pull already in flight rather than starting a second,
 * so a host that pulls on a deploy hook cannot double the load on the door.
 */
export type LivePullLoop = {
  readonly held: () => LivePages
  readonly pullNow: () => Promise<SitePullOutcome>
  readonly stop: () => void
}

export const startPullingLivePages = (options: StartPullingOptions): LivePullLoop => {
  const interval = ceilingOf(options.intervalMs, DEFAULT_PULL_INTERVAL_MS)
  const schedule = options.schedule ?? scheduleWithTimeout
  const now = options.now ?? Date.now

  let held: LivePages = NO_LIVE_PAGES
  let inFlight: Promise<SitePullOutcome> | undefined
  let cancel: (() => void) | undefined
  let stopped = false

  const announce = (outcome: SitePullOutcome): void => {
    try {
      options.onOutcome?.(outcome, held)
    } catch {
      /*
       * A host's logger throwing must not end the loop: the pages would then go
       * stale for ever over a mistake in a sentence about them.
       */
    }
  }

  const once = async (): Promise<SitePullOutcome> => {
    const outcome = await pullLivePages(options, held)

    held = withPullOutcome(held, outcome, now())
    announce(outcome)

    return outcome
  }

  const pull = (): Promise<SitePullOutcome> => {
    if (inFlight !== undefined) return inFlight

    const running = once().finally(() => {
      inFlight = undefined
    })

    inFlight = running

    return running
  }

  const loop = (): void => {
    void pull().finally(() => {
      if (!stopped) cancel = schedule(loop, interval)
    })
  }

  loop()

  return {
    held: () => held,
    pullNow: pull,
    stop: () => {
      stopped = true
      cancel?.()
      cancel = undefined
    },
  }
}
