"use client"

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react"

import { EMPTY_PROGRESS, type Progress } from "../_lib/progress"
import {
  browserStore,
  openRecord,
  RECORD_KEY,
  recordWillKeep,
  type RecordState,
  type RecordStore,
} from "../_lib/reading"

/**
 * Where a reader's study history lives, and why it is not a database.
 *
 * The record is small, private, and worth nothing to anyone but the person who
 * wrote it — what they typed when they could not remember something is the most
 * unflattering data this project holds. Keeping it in the browser means the
 * course can be worked through with no account and nothing sent anywhere, and
 * the day it needs to follow someone between machines is the day it earns a
 * table, not before.
 *
 * Reading is total, twice over: `JSON.parse` on a string somebody may have
 * edited by hand, and then `readProgress` on whatever that produced. What is new
 * is that it is total *and says which way it went* — `_lib/reading.ts` has the
 * argument, and the consequence here is that this store hands down three facts
 * it used to swallow: whether the empty record is a measurement, whether a write
 * lands, and whether writing would destroy something nobody could read.
 */

/**
 * Where the record is kept, as a parameter.
 *
 * Nothing in the application mounts this — the default is the reader's own
 * browser. It exists because a store that throws on read, or answers reads and
 * refuses writes, is a real browser configuration and an unreachable one from a
 * test otherwise.
 */
const StoreContext = createContext<() => RecordStore>(browserStore)

export const RecordStoreProvider = ({
  store,
  children,
}: {
  readonly store: () => RecordStore
  readonly children: ReactNode
}) => <StoreContext.Provider value={store}>{children}</StoreContext.Provider>

/**
 * What happened to the last write, which the reader is entitled to know.
 *
 * `untried` until something has been saved — silence about a write nobody has
 * asked for is the correct amount to say. `lost` is the quota case: the read
 * worked, the probe worked, and this particular write did not.
 */
export type SaveState = "untried" | "saved" | "lost"

const pad = (value: number): string => String(value).padStart(2, "0")

/**
 * What day it is, as an input.
 *
 * Every date this surface computes is a subtraction from today: whether a set is
 * due, how many days ago, when a missed question comes back. Reading that day out
 * of the ambient environment is the same side effect reading the clock is
 * anywhere else in this project, and it enters through a seam for the same reason
 * ids do — so a caller can say what day it is instead of asking.
 *
 * It cost an evening to find out that mattered. The queue's tests built their
 * fixtures from `toISOString()`, which is a **UTC** calendar date, and asserted
 * against labels computed from a **local** one; the two are the same day for most
 * of the day and different after 17:00 in California, so a suite green in CI
 * failed on a maintainer's machine and looked like a broken working tree rather
 * than a timezone. Injecting the day removes the class: a test that says what day
 * it is cannot disagree with the machine it runs on.
 */
export type Clock = () => string

/**
 * Today where the reader is, not where the server is. A spacing schedule that
 * rolls over at midnight UTC tells someone in California that a set is due while
 * they are still doing yesterday.
 */
export const systemClock: Clock = () => {
  const now = new Date()

  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

const ClockContext = createContext<Clock>(systemClock)

/**
 * A different clock, for a caller that has one. Nothing in the application
 * mounts this — the default is the reader's own browser — and it exists so a
 * test can pin the day rather than compute one and hope.
 */
export const ClockProvider = ({
  clock,
  children,
}: {
  readonly clock: Clock
  readonly children: ReactNode
}) => <ClockContext.Provider value={clock}>{children}</ClockContext.Provider>

export type ProgressStore = {
  readonly progress: Progress
  /**
   * False until the stored record has been read. The server rendered this page
   * without a browser, so the first paint has to be the same on both sides:
   * anything that depends on what the reader has done waits for this.
   */
  readonly ready: boolean
  /**
   * The day the record was read against, and `""` until it has been. Taken once,
   * beside the record itself: the two are read together because every question
   * this store answers is a comparison between them, and a sitting begun at
   * 23:58 should record every answer in it under the day it began.
   */
  readonly today: string
  readonly update: (change: (progress: Progress) => Progress) => void
  /**
   * Where the record came from, and therefore what its emptiness means. Every
   * caller may ignore this and draw from `progress` as before; the one that does
   * not is the notice, which is the only thing on this surface whose subject is
   * the storage rather than the course.
   */
  readonly record: RecordState
  readonly saving: SaveState
  /**
   * Give up on a value that could not be read, and start recording again.
   *
   * The only way out of `wouldOverwrite`, and it is the reader's to take: the
   * page will not discard their unreadable record to unblock itself, because it
   * cannot know that the string under that key is worthless and they can.
   */
  readonly startFresh: () => void
}

const KEPT: RecordState = {
  reading: { kind: "absent" },
  progress: EMPTY_PROGRESS,
  writable: true,
  wouldOverwrite: false,
}

/**
 * One record per page, shared, rather than one per component that asks for it.
 *
 * This hook used to *be* the store: every caller ran its own `useState`, read
 * the same key, and kept its own copy. That works while the components are
 * read-only and is wrong the moment one of them writes, which two of them do.
 * Found by a test written for something else, and confirmed on `/lessons`:
 * marking a lesson in the syllabus updates the syllabus and leaves the line
 * above it — *no set is due for review today* — reporting a queue computed from
 * the record as it was before the click, until the page is reloaded.
 *
 * So the state lives in one place, and `useProgress` prefers it. A component
 * rendered without the provider still gets a working store of its own, which is
 * what every test on this surface does and what this hook has always promised;
 * the provider is how the application makes the several of them one.
 */
const ProgressContext = createContext<ProgressStore | undefined>(undefined)

export const ProgressProvider = ({ children }: { readonly children: ReactNode }) => {
  const store = useOwnProgress(true)

  return <ProgressContext.Provider value={store}>{children}</ProgressContext.Provider>
}

export const useProgress = (): ProgressStore => {
  const shared = useContext(ProgressContext)

  /**
   * Called unconditionally, as hooks must be, and told whether it is the one in
   * use — an idle copy reads no storage and probes nothing, so a page under the
   * provider touches the browser once rather than once per component.
   */
  const own = useOwnProgress(shared === undefined)

  return shared ?? own
}

const useOwnProgress = (active: boolean): ProgressStore => {
  const clock = useContext(ClockContext)
  const buildStore = useContext(StoreContext)
  const [progress, setProgress] = useState<Progress>(EMPTY_PROGRESS)
  const [record, setRecord] = useState<RecordState>(KEPT)
  const [saving, setSaving] = useState<SaveState>("untried")
  const [today, setToday] = useState("")
  const [ready, setReady] = useState(false)

  /**
   * Held in a ref so the mount effect stays a mount effect. A provider that
   * builds its clock inline hands down a new function every render, and an
   * effect that depended on it would re-read the record — a fresh object each
   * time — and never settle.
   */
  const clockRef = useRef(clock)
  clockRef.current = clock

  const storeRef = useRef(buildStore)
  storeRef.current = buildStore

  /**
   * The record and the reading, mirrored where a callback can reach them.
   *
   * `update` used to take the functional form of `setProgress` to avoid a stale
   * closure, and that form is now the wrong shape: writing to storage inside a
   * state updater makes the updater impure, and React is entitled to run it
   * twice. So the current values live in refs and `update` is an ordinary
   * function that reads them, decides, writes once, and then sets state.
   */
  const progressRef = useRef(progress)
  progressRef.current = progress

  const recordRef = useRef(record)
  recordRef.current = record

  useEffect(() => {
    if (!active) return

    const opened = openRecord(storeRef.current())

    setRecord(opened)
    setProgress(opened.progress)
    setToday(clockRef.current())
    setReady(true)
  }, [active])

  /**
   * The write, and the two reasons it does not happen.
   *
   * The sitting always advances in memory — a reader mid-set whose browser will
   * not store anything should still finish the set, and the record page can
   * still hand them a file of it. What changes is that not storing it is now
   * *reported* rather than caught and dropped, because ten minutes of
   * closed-book recall that quietly evaporates is the one failure this surface
   * must not have.
   */
  const update = useCallback((change: (progress: Progress) => Progress) => {
    const held = recordRef.current
    const next = change(progressRef.current)

    progressRef.current = next
    setProgress(next)

    if (!recordWillKeep(held)) {
      setSaving("lost")

      return
    }

    try {
      storeRef.current().write(RECORD_KEY, JSON.stringify(next))
      setSaving("saved")

      /** What is stored is now this, so a later read of it would say so. */
      const stored: RecordState = { ...held, reading: { kind: "read", progress: next }, progress: next }

      recordRef.current = stored
      setRecord(stored)
    } catch {
      setSaving("lost")
    }
  }, [])

  const startFresh = useCallback(() => {
    try {
      storeRef.current().drop(RECORD_KEY)
    } catch {
      /** It could not be read and cannot be dropped; the block below still lifts. */
    }

    const fresh: RecordState = {
      ...recordRef.current,
      reading: { kind: "absent" },
      wouldOverwrite: false,
    }

    recordRef.current = fresh
    setRecord(fresh)
    setSaving("untried")
  }, [])

  return { progress, ready, today, update, record, saving, startFresh }
}
