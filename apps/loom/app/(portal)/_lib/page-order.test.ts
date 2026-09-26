import { describe, expect, it } from "vitest"

import { runtimeWordsIn } from "@/app/(portal)/_test/plain-language"

import type { PageName } from "./page-name"
import {
  byName,
  inPageOrder,
  mostChangedRank,
  needsYouRank,
  ORDER_LEAD,
  readyToCheckRank,
  SAME_AFTER_THAT,
  type PageOrder,
} from "./page-order"

const page = (name: string, treeId = `t_${name.toLowerCase()}`): PageName => ({
  name,
  treeId,
  derived: true,
})

/** The four with a rank in front of the tiebreak. */
const RANKED: readonly PageOrder[] = [
  "needs-you-first",
  "ready-to-check-first",
  "most-changed-first",
  "worst-first",
]

const ORDERS: readonly PageOrder[] = [...RANKED, "by-name"]

describe("byName — the tiebreak every list of pages in this portal ends with", () => {
  it("arranges two pages by what they are called", () => {
    expect(byName(page("About"), page("Pricing"))).toBeLessThan(0)
    expect(byName(page("Pricing"), page("About"))).toBeGreaterThan(0)
  })

  /**
   * A name comes from the page's own leading heading, and a heading's case is
   * the author's business. `about` below `Zebra` would be a list arranged by
   * something no reader can see.
   */
  it("ignores case, so a lower-case heading is not exiled to the end", () => {
    expect(byName(page("about"), page("Pricing"))).toBeLessThan(0)
    expect(byName(page("Pricing"), page("about"))).toBeGreaterThan(0)
  })

  /**
   * The property that makes every list in this portal reproducible. Two pages
   * can genuinely share a name — a name is derived rather than chosen, and
   * nothing stops two pages leading with the same heading — and two rows left
   * tied would fall back to whatever order the store handed back, which is the
   * defect this module exists to remove.
   */
  it("falls through to the identifier, so the order is total", () => {
    expect(byName(page("Home", "t_a"), page("Home", "t_b"))).toBeLessThan(0)
    expect(byName(page("Home", "t_b"), page("Home", "t_a"))).toBeGreaterThan(0)
    expect(byName(page("Home", "t_a"), page("Home", "t_a"))).toBe(0)
  })

  /**
   * `localeCompare` is the obvious implementation and the wrong one: its answer
   * depends on the locale and on the ICU data the runtime was built with, so two
   * deployments of one portal could arrange one pair of pages two ways. This is
   * the assertion that fails if somebody reaches for it — `ä` sorts beside `a`
   * under a German collation and after `z` by codepoint.
   */
  it("does not depend on a collation, so two deployments cannot disagree", () => {
    expect(byName(page("Über"), page("Zebra"))).toBeGreaterThan(0)
  })

  /**
   * Compared as `<`, `>` and `=` rather than through `Math.sign`, because
   * `-Math.sign(0)` is `-0` and vitest compares with `Object.is`. The first
   * version of this test failed on a page compared with itself, which is the one
   * pair that cannot be out of order.
   */
  it("is antisymmetric on every pair it is given", () => {
    const names = [page("About"), page("about", "t_2"), page("Home"), page("Über"), page("zebra")]

    for (const left of names) {
      for (const right of names) {
        const there = byName(left, right)
        const back = byName(right, left)

        expect(there < 0).toBe(back > 0)
        expect(there === 0).toBe(back === 0)
      }
    }
  })
})

describe("inPageOrder", () => {
  const row = (name: string, rank: number) => ({ name, rank })
  const order = (rows: readonly { name: string; rank: number }[]) =>
    inPageOrder(rows, (entry) => ({
      rank: entry.rank,
      page: page(entry.name),
    })).map((entry) => entry.name)

  it("puts a lower rank nearer the top", () => {
    expect(order([row("Zebra", 0), row("About", 3)])).toEqual(["Zebra", "About"])
  })

  it("falls back to the name within one rank", () => {
    expect(order([row("Pricing", 1), row("About", 1), row("Home", 1)])).toEqual([
      "About",
      "Home",
      "Pricing",
    ])
  })

  /**
   * The whole claim of the module. Two screens ranking the same pages on
   * different facts still agree about the pages neither has anything to say
   * about — which on a deployment where nothing is wrong is all of them.
   */
  it("gives two screens the same list when neither has anything to separate the pages", () => {
    const pages = [row("Pricing", 0), row("About", 0), row("Home", 0)]
    const anotherScreen = [row("Home", 7), row("Pricing", 7), row("About", 7)]

    expect(order(pages)).toEqual(order(anotherScreen))
  })

  it("does not modify what it was given", () => {
    const rows = [row("Zebra", 1), row("About", 1)]
    inPageOrder(rows, (entry) => ({
      rank: entry.rank,
      page: page(entry.name),
    }))

    expect(rows.map((entry) => entry.name)).toEqual(["Zebra", "About"])
  })

  it("holds an empty list and a single row", () => {
    expect(order([])).toEqual([])
    expect(order([row("Home", 2)])).toEqual(["Home"])
  })
})

describe("needsYouRank — `/portal/pages`", () => {
  it("leads with the pages that have changes waiting for an answer", () => {
    expect(needsYouRank({ waiting: 4, unreadable: 0 })).toBe(0)
    expect(needsYouRank({ waiting: 1, unreadable: 3 })).toBe(0)
  })

  it("puts a page whose only waiting row cannot be answered second", () => {
    expect(needsYouRank({ waiting: 0, unreadable: 2 })).toBe(1)
  })

  /**
   * The rung this ladder exists for. A page whose waiting count would not read
   * is **not** a page with nothing waiting, and the two were drawn identically
   * until 24 September put a mark on the second. Ranked below a known-empty page
   * it would go straight back to where nobody looks.
   */
  it("ranks a count that could not be read above a count that is zero", () => {
    expect(needsYouRank({ waiting: null, unreadable: 0 })).toBeLessThan(
      needsYouRank({ waiting: 0, unreadable: 0 })
    )
  })

  it("sends a page with nothing happening on it to the bottom", () => {
    expect(needsYouRank({ waiting: 0, unreadable: 0 })).toBe(3)
  })

  /**
   * Tiers, not counts — the argument is in the module. A page with twelve
   * waiting changes does not outrank one with a single change that has been
   * sitting there since July, because the queue inside both of them is sorted by
   * how long something has waited and a page order that contradicted it would be
   * this portal disagreeing with itself.
   */
  it("does not rank one waiting page above another by how many are waiting", () => {
    expect(needsYouRank({ waiting: 12, unreadable: 0 })).toBe(
      needsYouRank({ waiting: 1, unreadable: 0 })
    )
  })

  it("puts an unreadable row above a page whose count merely failed to read", () => {
    expect(needsYouRank({ waiting: 0, unreadable: 1 })).toBeLessThan(
      needsYouRank({ waiting: null, unreadable: 0 })
    )
  })
})

describe("readyToCheckRank — `/portal/checkup`'s chooser", () => {
  /**
   * The visible consequence the finding named: the one page you can check was
   * listed fourth, below three you cannot, on a screen with one action on it.
   */
  it("leads with the pages that can be checked", () => {
    expect(readyToCheckRank({ canBeChecked: true })).toBeLessThan(
      readyToCheckRank({ canBeChecked: false })
    )
  })

  it("has two rungs and no third, because a chooser offers or it does not", () => {
    expect(
      new Set([readyToCheckRank({ canBeChecked: true }), readyToCheckRank({ canBeChecked: false })])
        .size
    ).toBe(2)
  })
})

describe("mostChangedRank — `/portal/history`'s chooser", () => {
  it("leads with the longest history", () => {
    expect(mostChangedRank({ revision: 40 })).toBeLessThan(mostChangedRank({ revision: 2 }))
  })

  it("sends a page with nothing to read to the bottom", () => {
    expect(mostChangedRank({ revision: 0 })).toBeGreaterThan(mostChangedRank({ revision: 1 }))
  })
})

describe("what a list says about its own order", () => {
  it("names every order and nothing else", () => {
    expect(Object.keys(ORDER_LEAD).sort()).toEqual([...ORDERS].sort())
  })

  it.each(ORDERS)("%s says which order it is in, in plain language", (order) => {
    const lead = ORDER_LEAD[order]

    expect(runtimeWordsIn(lead), lead).toEqual([])
    expect(lead.endsWith(".")).toBe(true)
  })

  /**
   * A ranked order's sentence has to name the *top* of its list, because that is
   * the part of an order a reader needs told and the part a second screen can be
   * compared against. `by-name` is the one order with nothing in front of the
   * tiebreak, so it is the one with no top to name.
   */
  it.each(RANKED)("%s names the top of its list", (order) => {
    expect(ORDER_LEAD[order], order).toMatch(/comes? first\.$/u)
  })

  it("does not claim a top on the one order that has none", () => {
    expect(ORDER_LEAD["by-name"]).not.toMatch(/comes? first/u)
  })

  it("says the part that is true of every list, in plain language", () => {
    expect(runtimeWordsIn(SAME_AFTER_THAT)).toEqual([])
  })

  /**
   * Four sentences that all said the same thing would be four labels rather than
   * four orders, and a reader comparing two screens would learn nothing. This is
   * what fails if a later edit makes them interchangeable.
   */
  it("gives every order a sentence of its own", () => {
    expect(new Set(Object.values(ORDER_LEAD)).size).toBe(ORDERS.length)
  })

  /**
   * `most-changed-first` ranks on a count and there is no time in a listing at
   * all, so a sentence promising recency would be the portal inventing the field
   * §1 kept out of the document.
   */
  it("does not promise recency from a count", () => {
    expect(ORDER_LEAD["most-changed-first"]).toContain("most changes")
    expect(ORDER_LEAD["most-changed-first"]).not.toMatch(/recent|latest|newest/iu)
  })
})
