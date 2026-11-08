import { describe, expect, it } from "vitest"

import { treeIdSchema } from "../ids.js"
import { sampleTree } from "../testing/fixtures.js"

import { isPulling, livePageOf, livePagesHeld, NO_LIVE_PAGES, type LivePages } from "./pages.js"

const page = sampleTree().tree
/** A second page of the site: the same shape under its own id, which is all these read. */
const other = { ...sampleTree().tree, treeId: treeIdSchema.parse("t_second") }
const holding = (pages: readonly (typeof page)[], over: Partial<LivePages> = {}): LivePages => ({
  ...NO_LIVE_PAGES,
  pages: new Map(pages.map((tree) => [tree.treeId, tree])),
  ...over,
})

describe("the live pages a server holds", () => {
  it("starts holding nothing, which is every page as built", () => {
    expect(NO_LIVE_PAGES.pages.size).toBe(0)
    expect(NO_LIVE_PAGES.tag).toBeUndefined()
    expect(NO_LIVE_PAGES.pulledAt).toBeUndefined()
    expect(NO_LIVE_PAGES.failures).toBe(0)
    expect(isPulling(NO_LIVE_PAGES)).toBe(false)
  })

  it("answers a page it holds by that page's own id", () => {
    expect(livePageOf(holding([page]), page.treeId)).toBe(page)
  })

  /** The whole of the fallback a host writes is `?? builtTree`, so this must not throw. */
  it("answers nothing for a page the door did not name", () => {
    const unnamed = treeIdSchema.parse("t_neverpublished")

    expect(livePageOf(holding([page]), unnamed)).toBeUndefined()
    expect(livePageOf(NO_LIVE_PAGES, page.treeId)).toBeUndefined()
  })

  it("lists every page it holds", () => {
    expect(livePagesHeld(holding([page, other]))).toEqual([page, other])
    expect(livePagesHeld(NO_LIVE_PAGES)).toEqual([])
  })

  /**
   * A server with pages and ten failures behind it is still serving Loom's
   * pages, which is the behaviour asked for rather than a state to hide.
   */
  it("says it is pulling once the door has answered, failures since or not", () => {
    expect(isPulling(holding([page], { pulledAt: 5 }))).toBe(true)
    expect(isPulling(holding([page], { pulledAt: 5, failures: 10 }))).toBe(true)
    expect(isPulling(holding([page], { failures: 10 }))).toBe(false)
  })
})
