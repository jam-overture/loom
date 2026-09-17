import { fireEvent, render, screen } from "@testing-library/react"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it } from "vitest"

import { RecordNotice } from "./notice"
import { ProgressProvider, RecordStoreProvider, useProgress } from "./store"
import { withLessonWorkedThrough } from "../_lib/progress"
import { RECORD_KEY, type RecordStore } from "../_lib/reading"

/**
 * The browser misbehaving, arranged.
 *
 * Every case here is a real configuration and none of them can be produced from
 * a real `localStorage` inside a test: a store that throws on read is Safari
 * with site data off, a store that reads and refuses writes is the same setting
 * in a different browser, and a key holding something unparseable is any of the
 * ways a write can be interrupted. They are the three ways a reader loses a
 * sitting without being told, which is why they get a component of their own.
 */

const fake = (
  held: Readonly<Record<string, string>> = {},
  faults: { readonly read?: boolean; readonly write?: boolean } = {}
): { readonly build: () => RecordStore; readonly written: Map<string, string> } => {
  const written = new Map(Object.entries(held))

  const store: RecordStore = {
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
  }

  return { build: () => store, written }
}

/**
 * The arrangement the layout mounts: one record for the page, and everything on
 * it reading that one. The three cases below where a click has to change what
 * the notice says are only reachable this way — two components each owning a
 * copy of the store cannot tell each other that a write was refused.
 */
const on = (build: () => RecordStore, ui: ReactNode) =>
  render(
    <RecordStoreProvider store={build}>
      <ProgressProvider>{ui}</ProgressProvider>
    </RecordStoreProvider>
  )

/** A stand-in for every page that writes: one button, one recorded fact. */
const MarkALesson = () => {
  const { update } = useProgress()

  return (
    <button type="button" onClick={() => update((held) => withLessonWorkedThrough(held, 1, "2026-09-17"))}>
      Mark lesson 01
    </button>
  )
}

const A_RECORD = JSON.stringify({ lessons: { "1": "2026-09-01" }, sets: {} })

beforeEach(() => {
  window.localStorage.clear()
})

describe("when nothing is wrong", () => {
  it("says nothing at all, for a record that reads and writes", () => {
    const { container } = on(fake({ [RECORD_KEY]: A_RECORD }).build, <RecordNotice />)

    expect(container.textContent).toBe("")
  })

  it("says nothing to a reader who is simply new", () => {
    const { container } = on(fake().build, <RecordNotice />)

    expect(container.textContent).toBe("")
  })
})

describe("when the browser will not keep anything", () => {
  it("tells a reader whose storage refused the read, before they spend the ten minutes", () => {
    on(fake({}, { read: true }).build, <RecordNotice />)

    expect(screen.getByText(/Nothing can be saved here/)).toBeDefined()
    expect(screen.getByRole("status").textContent).toContain("site data is turned off")
    expect(screen.getByRole("status").textContent).toContain("not saying you have done nothing")
  })

  /**
   * The one that looks normal. The read succeeds and answers `null`, so the
   * course renders as a clean slate for a new reader and behaves as one — right
   * up to the moment the tab closes.
   */
  it("tells a reader whose storage reads and refuses writes", () => {
    on(fake({}, { write: true }).build, <RecordNotice />)

    expect(screen.getByText(/Nothing is being saved/)).toBeDefined()
    expect(screen.getByRole("status").textContent).toContain("will not take anything back")
  })

  it("says so after a write fails on a store that had accepted the probe", () => {
    const written = new Map<string, string>()
    let refusing = false

    const store: RecordStore = {
      read: (key) => written.get(key) ?? null,
      write: (key, value) => {
        if (refusing) throw new Error("QuotaExceededError")

        written.set(key, value)
      },
      drop: (key) => {
        written.delete(key)
      },
    }

    on(() => store, (
      <>
        <RecordNotice />
        <MarkALesson />
      </>
    ))

    expect(screen.queryByRole("status")).toBeNull()

    refusing = true
    fireEvent.click(screen.getByText("Mark lesson 01"))

    expect(screen.getByRole("status").textContent).toContain("has just refused it")
  })
})

describe("when something is there and could not be read", () => {
  it("refuses to write over it, and says that is what it is doing", () => {
    const board = fake({ [RECORD_KEY]: "{lessons:" })

    on(board.build, (
      <>
        <RecordNotice />
        <MarkALesson />
      </>
    ))

    expect(screen.getByText(/Your record could not be read/)).toBeDefined()
    expect(screen.getByRole("status").textContent).toContain("Nothing is being saved until you decide")

    fireEvent.click(screen.getByText("Mark lesson 01"))

    /** The whole point: the only copy is still the only copy. */
    expect(board.written.get(RECORD_KEY)).toBe("{lessons:")
  })

  it("hands the string back rather than describing it", () => {
    on(fake({ [RECORD_KEY]: '{"note":"hi"}' }).build, <RecordNotice />)

    expect(screen.getByRole("status").textContent).toContain("no study history in it")
    expect(screen.queryByRole("textbox")).toBeNull()

    fireEvent.click(screen.getByText("Show me what is there"))

    expect(screen.getByRole("textbox")).toHaveProperty("value", '{"note":"hi"}')
  })

  /**
   * The way out, and it is the reader's to take rather than the page's. A page
   * that cleared the key to unblock itself would be making a judgement about
   * somebody else's data that it has no way to make.
   */
  it("starts recording again only when the reader discards it", () => {
    const board = fake({ [RECORD_KEY]: "{lessons:" })

    on(board.build, (
      <>
        <RecordNotice />
        <MarkALesson />
      </>
    ))

    fireEvent.click(screen.getByText("Discard it and start a new record"))

    expect(screen.queryByRole("status")).toBeNull()
    expect(board.written.has(RECORD_KEY)).toBe(false)

    fireEvent.click(screen.getByText("Mark lesson 01"))

    expect(board.written.get(RECORD_KEY)).toContain("2026-09-17")
  })
})
