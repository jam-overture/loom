import { z } from "zod"

import { err, ok, type Result } from "@jam-overture/loom"
import type { ApplicationId } from "@jam-overture/loom/store"

/**
 * How long a reader keeps the pages they first saw (0383 clause 1): a choice
 * each project makes on *Settings*, *Off* until it does.
 *
 * Kept by the application, as the model key is, because a project holds one
 * site (0296) and the read door is handed the application its key names.
 */
export const READER_WINDOWS = ["off", "1h", "1d", "7d"] as const

export const readerWindowSchema = z.enum(READER_WINDOWS)

export type ReaderWindow = z.infer<typeof readerWindowSchema>

const HOUR = 60 * 60 * 1000

/**
 * How long a window holds a reader, in milliseconds. *Off* holds nobody, and
 * seven days is the ceiling clause 1 sets on what a server keeps.
 */
export const WINDOW_LENGTH: Readonly<Record<ReaderWindow, number>> = {
  off: 0,
  "1h": HOUR,
  "1d": 24 * HOUR,
  "7d": 7 * 24 * HOUR,
}

/** What a form sent, as a window, or the sentence that says why it is not one. */
export const readReaderWindow = (sent: unknown): Result<ReaderWindow, string> => {
  const parsed = readerWindowSchema.safeParse(sent)

  return parsed.success ? ok(parsed.data) : err("Choose one of the four.")
}

/** A window as it is kept: the choice, and when it was made. */
export type KeptReaderWindow = {
  readonly window: ReaderWindow
  readonly setAt: number
}

export type ReaderWindowStoreError = { readonly code: "unavailable"; readonly detail: string }

export interface ReaderWindowStore {
  /** The application's window as kept, or `null` where nobody has chosen one, which is *Off*. */
  readonly kept: (
    application: ApplicationId
  ) => Promise<Result<KeptReaderWindow | null, ReaderWindowStoreError>>
  /** Keyed by the application, so a second choice replaces the first. */
  readonly put: (
    application: ApplicationId,
    window: KeptReaderWindow
  ) => Promise<Result<void, ReaderWindowStoreError>>
}
