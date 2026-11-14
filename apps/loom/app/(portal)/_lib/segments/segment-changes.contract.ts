import { describe, expect, it } from "vitest"

import {
  nodeIdSchema,
  proposalIdSchema,
  treeIdSchema,
  type Result,
  type TreeOperation,
} from "@jam-overture/loom"
import { audienceIdSchema } from "@jam-overture/loom/store"

import {
  SEGMENT_CHANGES_PER_PAGE,
  type SegmentChange,
  type SegmentChangeStore,
} from "./segment-changes"

/** Both implementations of the changes accepted for one segment, held to the same behaviour. */

const HOME = treeIdSchema.parse("t_home")
const ABOUT = treeIdSchema.parse("t_about")

const LEVEL: TreeOperation = {
  op: "configure",
  nodeId: nodeIdSchema.parse("n_heading"),
  set: { level: 2 },
  unset: [],
}

const change = (n: number, overrides: Partial<SegmentChange> = {}): SegmentChange => ({
  proposalId: proposalIdSchema.parse(`p_${n}`),
  pageId: HOME,
  audienceId: audienceIdSchema.parse("aud_phone"),
  operations: [LEVEL],
  acceptedBy: "ada@example.com",
  acceptedAt: n * 10,
  ...overrides,
})

const unwrap = <TValue>(result: Result<TValue, { readonly detail: string }>): TValue => {
  if (!result.ok) throw new Error(`expected ok, got ${result.error.detail}`)

  return result.value
}

export const describeSegmentChangeStoreContract = (
  name: string,
  make: () => SegmentChangeStore | Promise<SegmentChangeStore>
): void => {
  describe(`${name} — SegmentChangeStore contract`, () => {
    it("knows no changes for a page nothing was accepted on", async () => {
      expect(unwrap(await (await make()).forPage(HOME))).toEqual([])
    })

    it("reads a page's changes back oldest accepted first, and no other page's", async () => {
      const store = await make()

      unwrap(await store.record(change(3)))
      unwrap(await store.record(change(1, { audienceId: audienceIdSchema.parse("aud_search") })))
      unwrap(await store.record(change(2, { pageId: ABOUT })))

      expect(unwrap(await store.forPage(HOME))).toEqual([
        change(1, { audienceId: audienceIdSchema.parse("aud_search") }),
        change(3),
      ])
    })

    it("keeps the first record of a proposal, as a change is accepted once", async () => {
      const store = await make()

      unwrap(await store.record(change(1)))
      unwrap(await store.record(change(1, { acceptedBy: "someone else", acceptedAt: 99 })))

      expect(unwrap(await store.forPage(HOME))).toEqual([change(1)])
    })

    it("marks only the named changes of the page dropped, and keeps when the first drop was", async () => {
      const store = await make()

      unwrap(await store.record(change(1)))
      unwrap(await store.record(change(2)))
      unwrap(await store.record(change(3, { pageId: ABOUT })))
      unwrap(await store.drop(HOME, [change(1).proposalId, change(3).proposalId], 500))
      unwrap(await store.drop(HOME, [change(1).proposalId], 900))
      unwrap(await store.drop(HOME, [], 900))

      expect(unwrap(await store.forPage(HOME))).toEqual([change(1, { droppedAt: 500 }), change(2)])
      expect(unwrap(await store.forPage(ABOUT))).toEqual([change(3, { pageId: ABOUT })])
    })

    it("answers at most the bound a page keeps, oldest first", async () => {
      const store = await make()

      for (let n = SEGMENT_CHANGES_PER_PAGE + 1; n >= 1; n -= 1) {
        unwrap(await store.record(change(n)))
      }

      const read = unwrap(await store.forPage(HOME))

      expect(read).toHaveLength(SEGMENT_CHANGES_PER_PAGE)
      expect(read[0]).toEqual(change(1))
    })
  })
}
