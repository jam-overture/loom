import { describe, expect, it } from "vitest"

import { treeIdSchema } from "../ids.js"
import { sampleTree } from "../testing/fixtures.js"
import type { LoomTree } from "../tree/tree.js"

import { livePageOf } from "./pages.js"
import type { PullFetch, SitePullOutcome } from "./pull.js"
import {
  DEFAULT_PULL_INTERVAL_MS,
  startPullingLivePages,
  type PullSchedule,
  type StartPullingOptions,
} from "./pulling.js"

const DEPLOYMENT = "https://loom.example.com"
const KEY = "lk_0123456789abcdef0123456789abcdef"

const page = sampleTree().tree
const other: LoomTree = { ...sampleTree().tree, treeId: treeIdSchema.parse("t_second") }

const answersPages = (pages: readonly LoomTree[], etag: string): Response =>
  new Response(JSON.stringify({ pages }), {
    status: 200,
    headers: { "content-type": "application/json", etag },
  })

/**
 * A clock whose only hand is the one a test moves.
 *
 * The loop is a timer and a promise, and a test that waited on real ones would
 * either be slow or be flaky. This hands the loop its own `schedule` and runs
 * what it booked when a test says so, which makes every ordering assertion
 * below exact rather than probable.
 */
const handWound = (): { schedule: PullSchedule; tick: () => Promise<void>; booked: () => number } => {
  let booked: { run: () => void } | undefined
  let bookings = 0

  return {
    booked: () => bookings,
    schedule: (run) => {
      bookings += 1
      booked = { run }

      return () => {
        booked = undefined
      }
    },
    tick: async () => {
      const due = booked

      booked = undefined
      due?.run()
      await Promise.resolve()
      await Promise.resolve()
    },
  }
}

const pulling = (
  fetch: PullFetch,
  over: Partial<StartPullingOptions> = {}
): ReturnType<typeof startPullingLivePages> =>
  startPullingLivePages({ deployment: DEPLOYMENT, key: KEY, fetch, ...over })

describe("the loop that keeps a server current", () => {
  it("defaults to a minute, which is a change live within a minute of Accept", () => {
    expect(DEFAULT_PULL_INTERVAL_MS).toBe(60_000)
  })

  it("holds nothing until the first answer, so a render has a page as built", async () => {
    const clock = handWound()
    const live = pulling(() => Promise.resolve(answersPages([page], '"one"')), {
      schedule: clock.schedule,
    })

    expect(live.held().pages.size).toBe(0)

    await live.pullNow()

    expect(livePageOf(live.held(), page.treeId)).toEqual(page)

    live.stop()
  })

  /**
   * Asked before anything awaits it: a server that waited out an interval
   * first would serve the pages it was built with for that whole interval,
   * including the change somebody accepted a moment before it booted.
   */
  it("pulls at once rather than after an interval", async () => {
    const asked: string[] = []
    const clock = handWound()
    const live = pulling(
      (url) => {
        asked.push(url)

        return Promise.resolve(answersPages([page], '"one"'))
      },
      { schedule: clock.schedule }
    )

    expect(asked).toEqual([`${DEPLOYMENT}/api/pages/live`])
    expect(clock.booked()).toBe(0)

    await live.pullNow()
    live.stop()
  })

  it("books the next pull only once the last has settled", async () => {
    let settle: (() => void) | undefined
    const clock = handWound()
    const live = pulling(
      () =>
        new Promise((resolve) => {
          settle = () => resolve(answersPages([page], '"one"'))
        }),
      { schedule: clock.schedule }
    )

    expect(clock.booked()).toBe(0)

    settle?.()
    await live.pullNow()
    await Promise.resolve()

    expect(clock.booked()).toBe(1)

    live.stop()
  })

  it("keeps pulling, and takes the newest pages each time", async () => {
    const answers = [answersPages([page], '"one"'), answersPages([page, other], '"two"')]
    const clock = handWound()
    const live = pulling(() => Promise.resolve(answers.shift() ?? answersPages([], '"none"')), {
      schedule: clock.schedule,
    })

    await live.pullNow()

    expect(live.held().pages.size).toBe(1)

    await clock.tick()
    await live.pullNow()

    expect(live.held().pages.size).toBe(2)
    expect(livePageOf(live.held(), other.treeId)).toEqual(other)

    live.stop()
  })

  it("answers the pull in flight rather than starting a second", async () => {
    let asks = 0
    const clock = handWound()
    const live = pulling(
      () => {
        asks += 1

        return Promise.resolve(answersPages([page], '"one"'))
      },
      { schedule: clock.schedule }
    )
    const [first, second] = [live.pullNow(), live.pullNow()]

    expect(first).toBe(second)

    await first
    expect(asks).toBe(1)

    live.stop()
  })

  it("keeps its pages through a failed pull, and tells the host about it", async () => {
    const outcomes: SitePullOutcome[] = []
    const answers: (() => Promise<Response>)[] = [
      () => Promise.resolve(answersPages([page], '"one"')),
      () => Promise.reject(new Error("ECONNREFUSED")),
    ]
    const clock = handWound()
    const live = pulling(() => (answers.shift() ?? (() => Promise.reject(new Error("done"))))(), {
      schedule: clock.schedule,
      onOutcome: (outcome) => outcomes.push(outcome),
    })

    await live.pullNow()
    await clock.tick()
    await live.pullNow()

    expect(livePageOf(live.held(), page.treeId)).toEqual(page)
    expect(live.held().failures).toBe(1)
    expect(outcomes.map((outcome) => outcome.kind)).toEqual(["fresh", "failed"])

    live.stop()
  })

  it("goes on pulling when the host's own logger throws", async () => {
    const clock = handWound()
    const live = pulling(() => Promise.resolve(answersPages([page], '"one"')), {
      schedule: clock.schedule,
      onOutcome: () => {
        throw new Error("the log is full")
      },
    })

    await live.pullNow()

    expect(live.held().pages.size).toBe(1)
    await Promise.resolve()
    expect(clock.booked()).toBe(1)

    live.stop()
  })

  it("books nothing more once it is stopped", async () => {
    const clock = handWound()
    const live = pulling(() => Promise.resolve(answersPages([page], '"one"')), {
      schedule: clock.schedule,
    })

    live.stop()
    await live.pullNow()
    await Promise.resolve()

    expect(clock.booked()).toBe(0)
  })

  it("can be stopped twice, which is what a second shutdown hook does", () => {
    const clock = handWound()
    const live = pulling(() => Promise.resolve(answersPages([page], '"one"')), {
      schedule: clock.schedule,
    })

    expect(() => {
      live.stop()
      live.stop()
    }).not.toThrow()
  })

  it("times what it holds with the clock it was given", async () => {
    const clock = handWound()
    const live = pulling(() => Promise.resolve(answersPages([page], '"one"')), {
      schedule: clock.schedule,
      now: () => 1_700_000_000_000,
    })

    await live.pullNow()

    expect(live.held().pulledAt).toBe(1_700_000_000_000)

    live.stop()
  })
})
