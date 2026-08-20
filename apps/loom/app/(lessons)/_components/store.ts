"use client"

import { useCallback, useEffect, useState } from "react"

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

export type ProgressStore = {
  readonly progress: Progress
  /**
   * False until the stored record has been read. The server rendered this page
   * without a browser, so the first paint has to be the same on both sides:
   * anything that depends on what the reader has done waits for this.
   */
  readonly ready: boolean
  readonly update: (change: (progress: Progress) => Progress) => void
}

export const useProgress = (): ProgressStore => {
  const [progress, setProgress] = useState<Progress>(EMPTY_PROGRESS)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setProgress(load())
    setReady(true)
  }, [])

  const update = useCallback((change: (progress: Progress) => Progress) => {
    setProgress((previous) => {
      const next = change(previous)
      save(next)

      return next
    })
  }, [])

  return { progress, ready, update }
}

const pad = (value: number): string => String(value).padStart(2, "0")

/**
 * Today where the reader is, not where the server is. A spacing schedule that
 * rolls over at midnight UTC tells someone in California that a set is due
 * while they are still doing yesterday.
 */
export const today = (): string => {
  const now = new Date()

  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}
