import { describe, expect, it } from "vitest"

import { audienceIdSchema } from "../audience/audience.js"
import { describeComposeError, type AudienceForm } from "../audience/compose.js"
import type { AudienceRule } from "../audience/rule.js"
import { sequentialIdFactory, treeIdSchema } from "../ids.js"
import { sampleTree } from "../testing/fixtures.js"
import { buildElement, buildText } from "../tree/builders.js"
import type { TreeOperation } from "../tree/delta.js"
import { childrenOf } from "../tree/node.js"

import {
  isPulling,
  livePageOf,
  livePagesHeld,
  NO_LIVE_PAGES,
  pageForReader,
  segmentOf,
  type LivePages,
  type ServedPage,
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

const spare = sequentialIdFactory("spare")

const form = (
  word: string,
  tree: typeof page,
  operations: readonly TreeOperation[],
  baseRevision = tree.revision
): AudienceForm => ({
  audienceId: audienceIdSchema.parse(`aud_${word}`),
  delta: { deltaId: spare.deltaId(), treeId: tree.treeId, baseRevision, operations },
})

const banner = (text: string) =>
  buildElement(spare, { type: "loom.banner", children: [buildText(spare, text)] })

const serving = (
  rules: readonly AudienceRule[],
  forms: readonly AudienceForm[],
  live: typeof page = page
): LivePages =>
  holding([live, other], {
    rules: new Map([[live.treeId, rules]]),
    forms: new Map([[live.treeId, forms]]),
  })

const firstChildOf = (served: ServedPage) => childrenOf(served.tree.root).map((child) => child.id)[0]

describe("the page a reader is served, composed in the site's process (0371 clause 5)", () => {
  it("serves the live page and no segment where the deployment has none", () => {
    const served = pageForReader(holding([page]), page, { device: "phone" })

    expect(served.tree).toBe(page)
    expect(served.audience).toBeUndefined()
    expect(served.refusal).toBeUndefined()
  })

  /** The whole of the fallback a host used to write by hand, done once here. */
  it("serves the built page it was handed for a page the door did not name", () => {
    const unheld = { ...sampleTree().tree, treeId: treeIdSchema.parse("t_neverpublished") }

    expect(pageForReader(NO_LIVE_PAGES, unheld, { device: "phone" }).tree).toBe(unheld)
    expect(pageForReader(serving([phones], []), unheld, { device: "phone" }).tree).toBe(unheld)
  })

  it("applies the form of the segment the reader is in", () => {
    const { tree, ids } = sampleTree()
    const sale = banner("Sale")
    const held = serving(
      [phones],
      [form("phone", tree, [{ op: "insert", parentId: ids.page, index: 0, node: sale }])],
      tree
    )

    const served = pageForReader(held, tree, { device: "phone" })

    expect(firstChildOf(served)).toBe(sale.id)
    expect(served.audience).toBe(phones.audienceId)
    expect(served.refusal).toBeUndefined()
  })

  it("serves the base to a reader whose context matches no rule", () => {
    const { tree, ids } = sampleTree()
    const held = serving(
      [phones],
      [form("phone", tree, [{ op: "insert", parentId: ids.page, index: 0, node: banner("Sale") }])],
      tree
    )

    const served = pageForReader(held, tree, { device: "desktop" })

    expect(served.tree).toBe(tree)
    expect(served.audience).toBeUndefined()
    expect(served.refusal).toBeUndefined()
  })

  /**
   * A segment made in the portal and not yet given a form is the state every
   * segment starts in, and pieces 1 to 3 of 0371 shipped sorting readers into
   * one. It is a name over the base, not a refusal.
   */
  it("sorts a reader into a segment that has no form, and serves them the base", () => {
    const held = serving([phones, searchers], [])
    const served = pageForReader(held, page, { device: "phone", source: "search" })

    expect(served.tree).toBe(page)
    expect(served.audience).toBe(searchers.audienceId)
    expect(served.refusal).toBeUndefined()
  })

  it("applies the forms there are and skips the segment that has none", () => {
    const { tree, ids } = sampleTree()
    const sale = banner("Sale")
    const held = serving(
      [phones, searchers],
      [form("phone", tree, [{ op: "insert", parentId: ids.page, index: 0, node: sale }])],
      tree
    )

    const served = pageForReader(held, tree, { device: "phone", source: "search" })

    expect(firstChildOf(served)).toBe(sale.id)
    expect(served.audience).toBe(searchers.audienceId)
  })

  /**
   * Two deltas reaching one page resolve by the deployment's order, and the
   * segment a page view is filed under is the last rule that matched (0385).
   * The two questions have different answers on the same request, on purpose.
   */
  it("applies both forms in the rules' order and files the page view under the last", () => {
    const { tree, ids } = sampleTree()
    const first = banner("Phones")
    const second = banner("Searchers")
    const held = serving(
      [phones, searchers],
      [
        form("phone", tree, [{ op: "insert", parentId: ids.page, index: 0, node: first }]),
        form("search", tree, [{ op: "insert", parentId: ids.page, index: 0, node: second }]),
      ],
      tree
    )

    const served = pageForReader(held, tree, { device: "phone", source: "search" })

    expect(childrenOf(served.tree.root).map((child) => child.id).slice(0, 2)).toEqual([
      second.id,
      first.id,
    ])
    expect(served.audience).toBe(searchers.audienceId)
  })

  it("serves the base and no segment at all when a form cannot be applied", () => {
    const { tree, ids } = sampleTree()
    const held = serving(
      [phones],
      [form("phone", tree, [{ op: "insert", parentId: ids.page, index: 0, node: banner("Sale") }], 99)],
      tree
    )

    const served = pageForReader(held, tree, { device: "phone" })

    expect(served.tree).toBe(tree)
    expect(served.refusal).toEqual({
      code: "stale-form",
      audienceId: phones.audienceId,
      expected: 99,
      actual: tree.revision,
    })
    expect(served.audience).toBeUndefined()
  })

  /**
   * The refusal is what the host logs. A page served as the base whose signals
   * say `aud_phone` is the measurement 0263 clause 4 refuses, so the name goes
   * with the form it was promised on.
   */
  it("says why in a sentence a host can log", () => {
    const { tree, ids } = sampleTree()
    const held = serving(
      [phones],
      [form("phone", tree, [{ op: "insert", parentId: ids.page, index: 0, node: banner("Sale") }], 99)],
      tree
    )

    const served = pageForReader(held, tree, { device: "phone" })

    expect(served.refusal && describeComposeError(served.refusal)).toContain("aud_phone")
  })

  it("serves the base to a reader the host gave no context for", () => {
    const { tree, ids } = sampleTree()
    const held = serving(
      [phones],
      [form("phone", tree, [{ op: "insert", parentId: ids.page, index: 0, node: banner("Sale") }])],
      tree
    )

    const served = pageForReader(held, tree, undefined)

    expect(served.tree).toBe(tree)
    expect(served.audience).toBeUndefined()
    expect(served.refusal).toBeUndefined()
  })

  /** Nothing here edits what is held, so a render that has read a page keeps it. */
  it("leaves the pages it was handed alone", () => {
    const { tree, ids } = sampleTree()
    const before = childrenOf(tree.root).length
    const held = serving(
      [phones],
      [form("phone", tree, [{ op: "insert", parentId: ids.page, index: 0, node: banner("Sale") }])],
      tree
    )

    pageForReader(held, tree, { device: "phone" })

    expect(childrenOf(tree.root).length).toBe(before)
    expect(childrenOf(held.pages.get(tree.treeId)?.root ?? tree.root).length).toBe(before)
  })
})

const HOUR = 3_600_000

/**
 * A revision starts at 0 and counts up per accepted delta, so a version a pin
 * can be served is the earlier revision and the live page is the later one.
 */
const was = page
const now: typeof page = { ...page, revision: page.revision + 1 }
const otherNow: typeof other = { ...other, revision: other.revision + 1 }

type Version = { readonly until: number; readonly tree: typeof page }

/** A holding whose window can serve a pin the versions named here. */
const pinning = (
  live: readonly (typeof page)[],
  held: readonly (readonly [typeof page, readonly Version[]])[],
  bounds: { readonly floor?: number; readonly number?: number } = {}
): LivePages =>
  holding(live, {
    window: {
      ms: HOUR,
      floor: bounds.floor ?? 0,
      number: bounds.number ?? 900,
      held: new Map(held.map(([tree, versions]) => [tree.treeId, versions])),
    },
  })

describe("the version a pinned reader is drawn (0383)", () => {
  it("draws the version the reader was pinned to rather than the newest", () => {
    const held = pinning([now], [[now, [{ until: 500, tree: was }]]])

    expect(livePageOf(held, now.treeId, 400)).toBe(was)
    expect(livePageOf(held, now.treeId, 500)).toBe(now)
  })

  it("draws the newest for a reader with no pin, which is every reader today", () => {
    const held = pinning([now], [[now, [{ until: 500, tree: was }]]])

    expect(livePageOf(held, now.treeId)).toBe(now)
    expect(livePageOf(held, now.treeId, undefined)).toBe(now)
  })

  it("draws the newest for every pin while the project has no window", () => {
    expect(livePageOf(holding([page]), page.treeId, 400)).toBe(page)
    expect(livePageOf(NO_LIVE_PAGES, page.treeId, 400)).toBeUndefined()
  })

  /**
   * Clause 2: what a reader keeps is the site, not one page. One number holds
   * them to every page as it stood, so a change that assumed an old home page
   * was gone cannot meet a reader still being served it.
   */
  it("holds one reader to every page of the site at once", () => {
    const held = pinning(
      [now, otherNow],
      [
        [now, [{ until: 500, tree: was }]],
        [otherNow, [{ until: 700, tree: other }]],
      ]
    )

    expect(livePageOf(held, now.treeId, 400)).toBe(was)
    expect(livePageOf(held, otherNow.treeId, 400)).toBe(other)
  })

  it("draws the newest page a pin was never held a version of", () => {
    const held = pinning([now, otherNow], [[now, [{ until: 500, tree: was }]]])

    expect(livePageOf(held, otherNow.treeId, 400)).toBe(otherNow)
  })

  it("draws the newest for a pin below the floor a snapshot or a revert raised", () => {
    const held = pinning([now], [[now, [{ until: 500, tree: was }]]], { floor: 450 })

    expect(livePageOf(held, now.treeId, 400)).toBe(now)
  })
})

describe("the segment a pinned reader is sorted into (0383, Audiences)", () => {
  /** A holding that both sorts readers of `live` and can serve a pin `version`. */
  const sortingAndPinning = (
    live: typeof page,
    version: typeof page,
    rules: readonly AudienceRule[],
    forms: readonly AudienceForm[]
  ): LivePages => ({
    ...holding([live, other], {
      rules: new Map([[live.treeId, rules]]),
      forms: new Map([[live.treeId, forms]]),
    }),
    window: {
      ms: HOUR,
      floor: 0,
      number: 900,
      held: new Map([[live.treeId, [{ until: 500, tree: version }]]]),
    },
  })

  it("applies the reader's form to the version the pin chose", () => {
    const { tree, ids } = sampleTree()
    const sale = banner("Sale")
    const version = { ...tree }
    const held = sortingAndPinning(
      tree,
      version,
      [phones],
      [form("phone", tree, [{ op: "insert", parentId: ids.page, index: 0, node: sale }])]
    )

    const served = pageForReader(held, tree, { device: "phone" }, 400)

    expect(firstChildOf(served)).toBe(sale.id)
    expect(served.audience).toBe(phones.audienceId)
    expect(served.refusal).toBeUndefined()
  })

  /**
   * The forms were authored against the version in `pages`. A pinned reader
   * whose form does not apply to the version they were pinned to keeps that
   * version and loses their segment, which is the trade `refusal` already
   * describes one dimension across (0263 clause 4).
   */
  it("serves the pinned version without the form where the form does not apply to it", () => {
    const { tree, ids } = sampleTree()
    const later = { ...tree, revision: tree.revision + 1 }
    const held = sortingAndPinning(
      later,
      tree,
      [phones],
      [
        form(
          "phone",
          later,
          [{ op: "insert", parentId: ids.page, index: 0, node: banner("Sale") }],
          later.revision
        ),
      ]
    )

    const served = pageForReader(held, later, { device: "phone" }, 400)

    expect(served.tree).toBe(tree)
    expect(served.audience).toBeUndefined()
    expect(served.refusal).not.toBeUndefined()
  })

  /** A pinned reader of a deployment with no segments is the ordinary case. */
  it("serves the pinned version and no segment where the deployment has none", () => {
    const served = pageForReader(
      pinning([now], [[now, [{ until: 500, tree: was }]]]),
      now,
      undefined,
      400
    )

    expect(served.tree).toBe(was)
    expect(served.audience).toBeUndefined()
    expect(served.refusal).toBeUndefined()
  })
})
