import { ok } from "@jam-overture/loom"

import { newestFirst, type PublishedPage, type PublishedPageStore } from "./published"

/** One application's published pages in the process: the reference implementation. */
export const memoryPublishedPageStore = (): PublishedPageStore => {
  const held = new Map<string, PublishedPage>()

  return {
    publish: (trees, at) => {
      for (const tree of trees) held.set(tree.treeId, { tree, receivedAt: at })

      return Promise.resolve(ok(undefined))
    },

    list: () => Promise.resolve(ok(newestFirst([...held.values()]))),
  }
}
