import { describe, expect, it } from "vitest"

import {
  openRecord,
  PROBE_KEY,
  RECORD_KEY,
  recordHasHistory,
  recordIsKnown,
  type RecordStore,
} from "./reading"

/**
 * The five things an empty record can mean, told apart.
 *
 * Every one of these was an empty record before, and the page said the same
 * sentence about all of them. Three can only be produced by a browser
 * misbehaving, which is the whole reason the storage is a parameter: arranging a
 * `localStorage` that answers reads and refuses writes is not something a test
 * can do to a real one, and it is a configuration real readers have.
 */

type Fake = {
  readonly store: RecordStore
  readonly written: Map<string, string>
}

const fake = (
  held: Readonly<Record<string, string>> = {},
  faults: { readonly read?: boolean; readonly write?: boolean } = {}
): Fake => {
  const written = new Map(Object.entries(held))

  return {
    written,
    store: {
      read: (key) => {
        if (faults.read === true) throw new Error("SecurityError")

        return written.get(key) ?? null
      },
      write: (key, value) => {
        if (faults.write === true) throw new Error("QuotaExceededError")

        written.set(key, value)
      },
      drop: (key) => {
        written.delete(key)
      },
    },
  }
}

const A_RECORD = JSON.stringify({ lessons: { "1": "2026-09-01" }, sets: {} })

describe("opening the record", () => {
  it("reads a record that is there", () => {
    const state = openRecord(fake({ [RECORD_KEY]: A_RECORD }).store)

    expect(state.reading.kind).toBe("read")
    expect(state.progress.lessons).toEqual({ "1": "2026-09-01" })
    expect(state.writable).toBe(true)
    expect(state.wouldOverwrite).toBe(false)
    expect(recordHasHistory(state.reading)).toBe(true)
  })

  it("says a browser holds nothing rather than that the reader has done nothing", () => {
    const state = openRecord(fake().store)

    expect(state.reading.kind).toBe("absent")
    expect(recordIsKnown(state.reading)).toBe(true)
    expect(recordHasHistory(state.reading)).toBe(false)
  })

  /**
   * A record of somebody who marked a lesson and unmarked it. Legible, empty,
   * and — this is the part that matters — safe to write over, which is exactly
   * what distinguishes it from the two below.
   */
  it("counts a legible empty record as read, not as missing", () => {
    const state = openRecord(fake({ [RECORD_KEY]: JSON.stringify({ lessons: {} }) }).store)

    expect(state.reading.kind).toBe("read")
    expect(recordHasHistory(state.reading)).toBe(false)
    expect(state.wouldOverwrite).toBe(false)
  })

  it("keeps what it could not parse, and refuses to write over it", () => {
    const state = openRecord(fake({ [RECORD_KEY]: "{lessons:" }).store)

    expect(state.reading).toEqual({ kind: "unreadable", reason: "not-json", held: "{lessons:" })
    expect(state.wouldOverwrite).toBe(true)
    expect(recordIsKnown(state.reading)).toBe(false)
  })

  it("will not claim somebody else's value under this key is an empty record", () => {
    const state = openRecord(fake({ [RECORD_KEY]: '{"note":"hi"}' }).store)

    expect(state.reading).toEqual({
      kind: "unreadable",
      reason: "not-a-record",
      held: '{"note":"hi"}',
    })
    expect(state.wouldOverwrite).toBe(true)
  })

  it("treats a bare JSON value as not a record at all", () => {
    expect(openRecord(fake({ [RECORD_KEY]: "42" }).store).reading).toMatchObject({
      reason: "not-a-record",
    })
    expect(openRecord(fake({ [RECORD_KEY]: "[1,2]" }).store).reading).toMatchObject({
      reason: "not-a-record",
    })
  })

  /**
   * The route somebody takes when they move a record by hand: copy the export
   * file, paste it into devtools under the key. Telling them their own history
   * is unreadable would be true of the wrapper and of nothing else.
   */
  it("reads an export file pasted in where the bare record goes", () => {
    const file = JSON.stringify({
      format: "loom.lessons.record",
      version: 1,
      exportedOn: "2026-09-10",
      progress: { lessons: { "4": "2026-09-02" }, sets: {}, predictions: {}, corrections: [] },
    })

    const state = openRecord(fake({ [RECORD_KEY]: file }).store)

    expect(state.reading.kind).toBe("read")
    expect(state.progress.lessons).toEqual({ "4": "2026-09-02" })
  })
})

describe("whether a write will land", () => {
  it("probes rather than assuming, and finds the store that reads and will not write", () => {
    const state = openRecord(fake({}, { write: true }).store)

    expect(state.reading.kind).toBe("absent")
    expect(state.writable).toBe(false)
  })

  it("leaves nothing behind when the probe works", () => {
    const board = fake({ [RECORD_KEY]: A_RECORD })

    expect(openRecord(board.store).writable).toBe(true)
    expect(board.written.has(PROBE_KEY)).toBe(false)
    expect(board.written.get(RECORD_KEY)).toBe(A_RECORD)
  })

  /**
   * A blocked read is not probed. There is nothing under there to lose and
   * nothing a probe could add: a browser that refuses to be read is refusing
   * this origin's storage, not this key.
   */
  it("does not probe a browser that refused the read", () => {
    const board = fake({}, { read: true })
    const state = openRecord(board.store)

    expect(state.reading).toEqual({ kind: "unreadable", reason: "storage-blocked", held: undefined })
    expect(state.writable).toBe(false)
    expect(state.wouldOverwrite).toBe(false)
    expect(board.written.size).toBe(0)
  })
})
