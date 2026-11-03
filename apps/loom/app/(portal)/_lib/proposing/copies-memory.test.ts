import { describe, expect, it } from "vitest"

import { treeIdSchema } from "@jam-overture/loom"

import { copiesOfPage, currentCopyOf, pageOfCopy } from "./copies"
import { memoryPageCopyStore } from "./copies-memory"
import { describePageCopyStoreContract } from "./copies.contract"

describePageCopyStoreContract("memoryPageCopyStore", memoryPageCopyStore)

const HOME = treeIdSchema.parse("t_home")
const AGAIN = treeIdSchema.parse("t_again")
const COPIES = [{ pageId: HOME, copyId: AGAIN, startedAt: 5 }]

describe("which copy of a page is which", () => {
  it("is the page's own id until the page starts again", () => {
    expect(currentCopyOf([], HOME)).toEqual({ pageId: HOME, copyId: HOME, startedAt: 0 })
  })

  it("is the newest copy once it has, with the first still counted", () => {
    expect(currentCopyOf(COPIES, HOME).copyId).toBe(AGAIN)
    expect(copiesOfPage(COPIES, HOME).map((copy) => copy.copyId)).toEqual([HOME, AGAIN])
  })

  it("names the page any copy is of", () => {
    expect(pageOfCopy(COPIES, AGAIN)).toBe(HOME)
    expect(pageOfCopy(COPIES, HOME)).toBe(HOME)
  })
})
