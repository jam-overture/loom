import { describe, expect, it, vi } from "vitest"

import { appProjectsForWriting, appStoreForWriting } from "@/app/_lib/app/store"

import { boundedAttemptLog } from "./auth/attempt-log"
import { memoryAttemptLog } from "./auth/attempts"
import { portalReaderSignals, portalReaderTallies, readerSignalsForWriting, readerTalliesForWriting } from "./reader-signals"
import { portalTelemetry, telemetryForWriting } from "./telemetry"

import { seedTree } from "./seed"
import { portalProjects, portalStore } from "./store"
import { holdsForWriting, portalHolds } from "./write"

/**
 * What every screen in this portal does when the database goes quiet.
 *
 * Eighteen screens read something. On 12 October a slow Supabase made all of
 * them return 504 after minutes, because `await store.list({})` on a store that does
 * not answer is a page that never arrives — and each of those screens already
 * had a written, tested branch saying *we couldn't load your pages, nothing has
 * been lost* that no code path could reach.
 *
 * [#617](https://github.com/jam-overture/loom/pull/617) fixed that by writing a
 * budget at the call site, and fixed **one** of the eleven: `/portal`. The other
 * ten — the page list, the history, both checkups, every inspector, the
 * application screen — still had none, because a rule written at a call site is
 * a rule ten other call sites have never heard of.
 *
 * So the test is not *does this screen handle it*, which is eleven tests and a
 * twelfth screen tomorrow that nobody writes one for. It is **does the handle
 * they all read through answer at all** — which is one property, in one place,
 * and the only one that cannot be forgotten by omission.
 */

const never = <T,>(): Promise<T> => new Promise<T>(() => undefined)

describe("the handles every portal screen reads through", () => {
  it("refuses a silent tree store instead of hanging on it", async () => {
    const silent = vi.spyOn(appStoreForWriting, "list").mockImplementation(never)

    try {
      const listed = await portalStore.list({})

      expect(listed.ok === false ? listed.error.code : "answered").toBe("unavailable")
    } finally {
      silent.mockRestore()
    }
  }, 20_000)

  it("refuses a silent hold store, so the waiting count is a sentence and not a wait", async () => {
    const silent = vi.spyOn(holdsForWriting, "forTree").mockImplementation(never)

    try {
      const held = await portalHolds.forTree(seedTree().treeId)

      expect(held.ok === false ? held.error.code : "answered").toBe("unavailable")
    } finally {
      silent.mockRestore()
    }
  }, 20_000)

  it("refuses a silent project store, which is what the workspace screen lists", async () => {
    const silent = vi.spyOn(appProjectsForWriting, "list").mockImplementation(never)

    try {
      const listed = await portalProjects.list()

      expect(listed.ok === false ? listed.error.code : "answered").toBe("unavailable")
    } finally {
      silent.mockRestore()
    }
  }, 20_000)
})

/**
 * The other four handles a screen reads through, swept for the same property.
 *
 * Found by listing every `await <handle>.<method>(` in the route groups rather
 * than by memory, because the first pass of this change fixed the tree store
 * and the holds and left six screens — activity, both rules screens, trust,
 * readers, pieces — reading a journal that could still hang. Eleven screens was
 * the wrong count; the right question is which handles exist.
 */
describe("the journals and rollups a screen reads through", () => {
  it("refuses a silent telemetry journal, which six screens print", async () => {
    const silent = vi.spyOn(telemetryForWriting, "read").mockImplementation(never)

    try {
      const page = await portalTelemetry.read({ direction: "older" })

      expect(page.ok === false ? page.error.code : "answered").toBe("unavailable")
    } finally {
      silent.mockRestore()
    }
  }, 20_000)

  it("refuses a silent reader-signal buffer", async () => {
    const silent = vi.spyOn(readerSignalsForWriting, "read").mockImplementation(never)

    try {
      const page = await portalReaderSignals.read({ direction: "older", limit: 1 })

      expect(page.ok === false ? page.error.code : "answered").toBe("unavailable")
    } finally {
      silent.mockRestore()
    }
  }, 20_000)

  it("refuses silent reader rollups, which every rate on two screens divides by", async () => {
    const tallies = vi.spyOn(readerTalliesForWriting, "tallies").mockImplementation(never)
    const views = vi.spyOn(readerTalliesForWriting, "pageViews").mockImplementation(never)

    try {
      const counted = await portalReaderTallies.tallies()
      const doors = await portalReaderTallies.pageViews()

      expect([
        counted.ok === false ? counted.error.code : "answered",
        doors.ok === false ? doors.error.code : "answered",
      ]).toEqual(["unavailable", "unavailable"])
    } finally {
      tallies.mockRestore()
      views.mockRestore()
    }
  }, 20_000)

  /**
   * The sign-in throttle, which is the one of these that is not a screen.
   *
   * `attempt-sign-in.ts` reads the log **before** comparing the key, on a form
   * anyone on the internet can reach — so a log that does not answer was a
   * sign-in button that never came back. It fails closed either way, which is a
   * policy question filed for the maintainer; what changes here is that it fails
   * at all rather than hanging.
   */
  it("refuses a silent sign-in throttle rather than hanging the form", async () => {
    const log = memoryAttemptLog()
    vi.spyOn(log, "recall").mockImplementation(never)

    const known = await boundedAttemptLog(log, 40).recall("someone@example.test", 0)

    expect(known.ok === false ? known.error.code : "answered").toBe("unavailable")
  })
})
