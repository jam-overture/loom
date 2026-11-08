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
 * **A reader waits on it once per server, and only for the first answer**
 * ([0364](../../decisions/0364-a-new-server-waits-for-its-first-pull-before-it-serves-and-never-waits-again.md)).
 * The first pull is made at once rather than after an interval, and a render
 * that asks `ready()` before it has settled waits for it — so the first reader
 * on a new server gets the live page rather than the page as built and then a
 * different one on the next request. A pull that fails answers at once, and
 * the wait gives up after `DEFAULT_FIRST_WAIT_MS` only when Loom says nothing
 * at all; either way the page as built is served and the pull carries on.
 *
 * After the first answer nothing waits again: the next pull is scheduled only
 * when the last has settled, so a slow Loom stretches the interval instead of
 * stacking requests behind it, and a render reads whatever is held.
 */

import { ceilingOf } from "../deadline.js"

import { NO_LIVE_PAGES, type LivePages } from "./pages.js"
import { pullLivePages, withPullOutcome, type PullLivePagesOptions, type SitePullOutcome } from "./pull.js"

/** A minute, which is a change live within a minute of somebody accepting it. */
export const DEFAULT_PULL_INTERVAL_MS = 60_000

/**
 * How long a render waits for a new server's first answer, when Loom says
 * nothing at all.
 *
 * It is not a guess at how long Loom takes: a refusal or a failed connection
 * ends the wait at once. It is the bound on a hang, which nothing else can tell
 * apart from slowness, and it is set long enough that only a Loom that is down
 * reaches it. The portal waits as long for its own store.
 */
export const DEFAULT_FIRST_WAIT_MS = 5_000

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
  /** How long `ready()` waits on a silent Loom. `DEFAULT_FIRST_WAIT_MS` when unset. */
  readonly firstWaitMs?: number
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
 * `ready` is what a render awaits. It answers what is held once the first
 * pull has settled, or once a silent Loom has had `firstWaitMs`, and at once
 * every time after that. `held` answers without waiting, for a caller that
 * would rather have the page as built than wait at all.
 *
 * `pullNow` answers the pull already in flight rather than starting a second,
 * so a host that pulls on a deploy hook cannot double the load on the door.
 */
export type LivePullLoop = {
  readonly ready: () => Promise<LivePages>
  readonly held: () => LivePages
  readonly pullNow: () => Promise<SitePullOutcome>
  readonly stop: () => void
}

export const startPullingLivePages = (options: StartPullingOptions): LivePullLoop => {
  const interval = ceilingOf(options.intervalMs, DEFAULT_PULL_INTERVAL_MS)
  const firstWait = ceilingOf(options.firstWaitMs, DEFAULT_FIRST_WAIT_MS)
  const schedule = options.schedule ?? scheduleWithTimeout
  const now = options.now ?? Date.now

  let held: LivePages = NO_LIVE_PAGES
  let inFlight: Promise<SitePullOutcome> | undefined
  let cancel: (() => void) | undefined
  let stopped = false
  let waited: Promise<void> | undefined

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

  const loop = (): Promise<SitePullOutcome> => {
    const running = pull()

    void running.finally(() => {
      if (!stopped) cancel = schedule(() => void loop(), interval)
    })

    return running
  }

  const first = loop()

  /*
   * Started by the first render that asks rather than at boot, so the bound is
   * on how long a reader waits and not on how long the process has been up.
   */
  const firstSettled = (): Promise<void> =>
    (waited ??= new Promise<void>((resolve) => {
      const giveUp = schedule(resolve, firstWait)

      void first.finally(() => {
        giveUp()
        resolve()
      })
    }))

  return {
    ready: () => firstSettled().then(() => held),
    held: () => held,
    pullNow: pull,
    stop: () => {
      stopped = true
      cancel?.()
      cancel = undefined
    },
  }
}
