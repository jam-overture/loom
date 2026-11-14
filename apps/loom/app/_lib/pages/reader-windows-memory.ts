import { ok } from "@jam-overture/loom"
import type { ApplicationId } from "@jam-overture/loom/store"

import type { KeptReaderWindow, ReaderWindowStore } from "./reader-windows"

/** The reader windows in the process: the reference implementation. */
export const memoryReaderWindowStore = (): ReaderWindowStore => {
  const held = new Map<ApplicationId, KeptReaderWindow>()

  return {
    kept: (application) => Promise.resolve(ok(held.get(application) ?? null)),

    put: (application, window) => {
      held.set(application, window)

      return Promise.resolve(ok(undefined))
    },
  }
}
