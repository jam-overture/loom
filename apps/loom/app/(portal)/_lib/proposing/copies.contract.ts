import { describe, expect, it } from "vitest"

import { treeIdSchema, type Result } from "@jam-overture/loom"

import type { PageCopyStore } from "./copies"

/** Both implementations of the page copies, held to the same behaviour. */

const HOME = treeIdSchema.parse("t_home")
const FIRST = treeIdSchema.parse("t_again1")
const SECOND = treeIdSchema.parse("t_again2")

const unwrap = <TValue>(result: Result<TValue, { readonly detail: string }>): TValue => {
  if (!result.ok) throw new Error(`expected ok, got ${result.error.detail}`)

  return result.value
}

export const describePageCopyStoreContract = (
  name: string,
  make: () => PageCopyStore | Promise<PageCopyStore>
): void => {
  describe(`${name} — PageCopyStore contract`, () => {
    it("has no copies before any page started again", async () => {
      expect(unwrap(await (await make()).list())).toEqual([])
    })

    it("lists copies oldest first, whichever order they were started in", async () => {
      const store = await make()

      unwrap(await store.start({ pageId: HOME, copyId: SECOND, startedAt: 2 }))
      unwrap(await store.start({ pageId: HOME, copyId: FIRST, startedAt: 1 }))

      expect(unwrap(await store.list()).map((copy) => copy.copyId)).toEqual([FIRST, SECOND])
    })

    it("keeps the first record of a copy started twice", async () => {
      const store = await make()

      unwrap(await store.start({ pageId: HOME, copyId: FIRST, startedAt: 1 }))
      unwrap(await store.start({ pageId: HOME, copyId: FIRST, startedAt: 1 }))

      expect(unwrap(await store.list())).toEqual([{ pageId: HOME, copyId: FIRST, startedAt: 1 }])
    })
  })
}
