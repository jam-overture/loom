import { ok } from "@jam-overture/loom"

import { oldestFirst, type PageCopy, type PageCopyStore } from "./copies"

/** One application's page copies in the process: the reference implementation. */
export const memoryPageCopyStore = (): PageCopyStore => {
  const held = new Map<string, PageCopy>()

  return {
    list: () => Promise.resolve(ok(oldestFirst([...held.values()]))),

    start: (copy) => {
      held.set(copy.copyId, copy)

      return Promise.resolve(ok(undefined))
    },
  }
}
