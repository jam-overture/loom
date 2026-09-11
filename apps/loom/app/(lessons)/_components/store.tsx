"use client"

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react"

import { EMPTY_PROGRESS, readProgress, type Progress } from "../_lib/progress"

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
 * edited by hand, and then `readProgress` on whatever that produced.
 */

const KEY = "loom.lessons.progress.v1"

const load = (): Progress => {
  try {
    const raw = window.localStorage.getItem(KEY)

    return raw === null ? EMPTY_PROGRESS : readProgress(JSON.parse(raw))
  } catch {
    return EMPTY_PROGRESS
  }
}

const save = (progress: Progress): void => {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(progress))
  } catch {
    /** A full or blocked store loses the record, not the sitting in progress. */
  }
}

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
}

export const useProgress = (): ProgressStore => {
  const clock = useContext(ClockContext)
  const [progress, setProgress] = useState<Progress>(EMPTY_PROGRESS)
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

  useEffect(() => {
    setProgress(load())
    setToday(clockRef.current())
    setReady(true)
  }, [])

  const update = useCallback((change: (progress: Progress) => Progress) => {
    setProgress((previous) => {
      const next = change(previous)
      save(next)

      return next
    })
  }, [])

  return { progress, ready, today, update }
}
