import { describe, expect, it } from "vitest"

import { audienceIdSchema } from "../audience/audience.js"
import type { AudienceRule } from "../audience/rule.js"
import { treeIdSchema } from "../ids.js"
import { sampleTree } from "../testing/fixtures.js"

import {
  isPulling,
  livePageOf,
  livePagesHeld,
  NO_LIVE_PAGES,
  segmentOf,
  type LivePages,
} from "./pages.js"

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

const rule = (word: string, key: string, value: string): AudienceRule => ({
  audienceId: audienceIdSchema.parse(`aud_${word}`),
  clauses: [{ key, anyOf: [value] }],
})

const phones = rule("phone", "device", "phone")
const searchers = rule("search", "source", "search")
const ruled = (rules: readonly AudienceRule[]): LivePages =>
  holding([page, other], { rules: new Map([[page.treeId, rules]]) })

describe("the segment a reader is in, sorted in the site's process (0371 clause 2)", () => {
  it("names the segment whose rule the reader's context matches", () => {
    expect(segmentOf(ruled([phones]), page.treeId, { device: "phone" })).toBe(phones.audienceId)
  })

  it("names none for a reader no rule matches, which is every reader", () => {
    expect(segmentOf(ruled([phones]), page.treeId, { device: "desktop" })).toBeUndefined()
  })

  it("names none for a reader the host gave no context", () => {
    expect(segmentOf(ruled([phones]), page.treeId, undefined)).toBeUndefined()
  })

  it("names none on a page with no rules, and on a page the server does not hold", () => {
    const unnamed = treeIdSchema.parse("t_neverpublished")

    expect(segmentOf(ruled([phones]), other.treeId, { device: "phone" })).toBeUndefined()
    expect(segmentOf(ruled([phones]), unnamed, { device: "phone" })).toBeUndefined()
    expect(segmentOf(NO_LIVE_PAGES, page.treeId, { device: "phone" })).toBeUndefined()
  })

  /**
   * A batch names one audience, so a reader in two segments is counted in one:
   * the last rule's, which is the specific one and the one that wins a
   * contested part (0359 clause 3, 0385).
   */
  it("names the last matching rule's segment when two match", () => {
    const both = { device: "phone", source: "search" }

    expect(segmentOf(ruled([phones, searchers]), page.treeId, both)).toBe(searchers.audienceId)
    expect(segmentOf(ruled([searchers, phones]), page.treeId, both)).toBe(phones.audienceId)
  })

  it("names an earlier rule's segment when the later one does not match", () => {
    const context = { device: "phone", source: "direct" }

    expect(segmentOf(ruled([phones, searchers]), page.treeId, context)).toBe(phones.audienceId)
  })
})
