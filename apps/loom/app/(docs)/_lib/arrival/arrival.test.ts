import { describe, expect, it } from "vitest"

import {
  ARRIVAL_BUDGET_MINUTES,
  ARRIVAL_ROUTE,
  ARRIVAL_TOTALS,
  arrivalTotals,
  buildArrivalRoute,
  type StepSource,
} from "./route"
import { namedExportsIn, publishedNames } from "../api/mentions"
import { fencesOnPage } from "../fences/extract"
import { isCheckable } from "../fences/model"
import { docsEntryAt, docsOrder } from "../nav"
import { readPageHeadings, readPageSource } from "../search/headings"

/**
 * The route is a promise made on the first page about five other pages, so
 * every check here asks the same question: **is the promise still true of the
 * page it is about?**
 *
 * The failure this exists to prevent is not a broken link. It is an itinerary
 * that goes on reading perfectly after the pages under it have moved on — the
 * step that says you will have typed `definePrimitive` on a page that stopped
 * showing it, the "six pages, nineteen blocks" of a route whose pages have
 * eleven. Every one of those is a build failure rather than a page, and the
 * tests below are the same assertions from outside the module, recomputed from
 * the page sources rather than read back off what it produced.
 */

const step = (source: Partial<StepSource> = {}): StepSource => ({
  id: "a-step",
  section: "getting-started",
  page: "installation",
  done: "the package is there",
  checkpoint: "createStarterPrimitiveRegistry",
  ...source,
})

const pageOf = (href: string): string => href.split("#")[0] ?? href

describe("the route this site sends a stranger on", () => {
  it("ends where the site says a stranger is finished — a change of somebody else's, on their page", () => {
    expect(ARRIVAL_ROUTE.map((entry) => entry.checkpoint)).toEqual([
      "createStarterPrimitiveRegistry",
      "createTree",
      "renderLoomTree",
      "commitIntent",
      "definePrimitive",
      "gatePolicySchema",
    ])
  })

  it("sends a reader to pages that exist", () => {
    for (const entry of ARRIVAL_ROUTE) {
      expect(docsEntryAt(entry.href), entry.href).toBeDefined()
    }
  })

  /**
   * The shortcut and the rail cannot disagree. A step earlier in the route than
   * its predecessor is in the sidebar would leave the two halves of the site's
   * own opinion about reading order pointing opposite ways.
   */
  it("never sends a reader backwards through the sidebar", () => {
    const positions = ARRIVAL_ROUTE.map((entry) =>
      docsOrder.findIndex((page) => page.href === entry.href)
    )

    expect(positions).toEqual([...positions].sort((a, b) => a - b))
    expect(new Set(positions).size).toBe(positions.length)
  })

  it("uses the rail's own title for each page", () => {
    for (const entry of ARRIVAL_ROUTE) {
      expect(docsEntryAt(entry.href)?.page.title, entry.href).toBe(entry.title)
    }
  })
})

describe("the checkpoint, which is the load-bearing half", () => {
  it("names something the runtime really publishes", () => {
    for (const entry of ARRIVAL_ROUTE) {
      expect(publishedNames.has(entry.checkpoint), entry.checkpoint).toBe(true)
    }
  })

  /**
   * Recomputed from the page rather than trusted: the module found the name to
   * build the step, and this reads the file again and asks the same question,
   * so a step whose page stopped showing its checkpoint fails here as well as
   * throwing there.
   */
  it("is a name the page it points at actually prints as code", () => {
    for (const entry of ARRIVAL_ROUTE) {
      const [, section = "", page = ""] = entry.href.split("/").slice(1)
      const named = namedExportsIn(readPageSource(section, page), publishedNames)

      expect([...named.keys()], entry.href).toContain(entry.checkpoint)
    }
  })

  it("links to a heading that is really on the page", () => {
    for (const entry of ARRIVAL_ROUTE) {
      const [anchor] = entry.checkpointHref.split("#").slice(1)

      if (anchor === undefined) continue

      const [, section = "", page = ""] = entry.href.split("/").slice(1)

      expect(
        readPageHeadings(section, page).map((heading) => heading.anchor),
        entry.checkpointHref
      ).toContain(anchor)
    }
  })

  it("opens the page at the top, and only the name jumps into it", () => {
    for (const entry of ARRIVAL_ROUTE) {
      expect(entry.href).not.toContain("#")
      expect(pageOf(entry.checkpointHref)).toBe(entry.href)
    }
  })
})

describe("what a step says it gets you", () => {
  /**
   * The one rule this page is written under: a reader on it has none of the
   * vocabulary yet, so the sentence promising them something may not be
   * written in it. Only the runtime's camel-cased and capitalized names are
   * matched — `ok` and `value` are published too, and refusing an English
   * sentence the word "value" would be a rule about English rather than about
   * jargon.
   */
  it("is written without a single runtime name in it", () => {
    const jargon = [...publishedNames].filter((name) => /^[A-Z]|[a-z][A-Z]/.test(name))

    for (const entry of ARRIVAL_ROUTE) {
      for (const name of jargon) {
        expect(entry.done, `${entry.id} — ${name}`).not.toMatch(
          new RegExp(`(^|[^A-Za-z0-9_$])${name}([^A-Za-z0-9_$]|$)`)
        )
      }
    }
  })

  it("says what you will have, in a sentence rather than a label", () => {
    for (const entry of ARRIVAL_ROUTE) {
      expect(entry.done.length, entry.id).toBeGreaterThan(60)
      expect(entry.done.trim().endsWith("."), entry.id).toBe(true)
    }
  })
})

describe("the numbers printed beside each step", () => {
  it("counts the blocks that are on the page", () => {
    for (const entry of ARRIVAL_ROUTE) {
      const [, section = "", page = ""] = entry.href.split("/").slice(1)
      const fences = fencesOnPage(section, page)

      expect(entry.blocks, entry.href).toBe(fences.length)
      expect(entry.compiled, entry.href).toBe(fences.filter(isCheckable).length)
    }
  })

  it("never claims more compiled blocks than there are blocks", () => {
    for (const entry of ARRIVAL_ROUTE) {
      expect(entry.compiled, entry.href).toBeLessThanOrEqual(entry.blocks)
    }
  })

  it("adds up to what the footer prints", () => {
    expect(ARRIVAL_TOTALS.steps).toBe(ARRIVAL_ROUTE.length)
    expect(ARRIVAL_TOTALS.blocks).toBe(
      ARRIVAL_ROUTE.reduce((total, entry) => total + entry.blocks, 0)
    )
    expect(ARRIVAL_TOTALS.compiled).toBe(
      ARRIVAL_ROUTE.reduce((total, entry) => total + entry.compiled, 0)
    )
    expect(ARRIVAL_TOTALS.minutes).toBe(
      ARRIVAL_ROUTE.reduce((total, entry) => total + entry.minutes, 0)
    )
  })

  it("counts fewer pages than the site has, because it is a shortcut", () => {
    expect(ARRIVAL_TOTALS.sitePages).toBeGreaterThan(ARRIVAL_TOTALS.steps)
  })

  /**
   * The heading over this route says *the next hour*. A route that grew past
   * the hour would still render, still link correctly and still be false, and
   * this is the only check that would notice.
   */
  it("fits inside the hour the heading promises", () => {
    expect(ARRIVAL_TOTALS.minutes).toBeLessThanOrEqual(ARRIVAL_BUDGET_MINUTES)
    expect(ARRIVAL_TOTALS.minutes).toBeGreaterThan(0)
  })
})

describe("the ways a route is refused rather than rendered", () => {
  it("refuses a step whose page does not exist", () => {
    expect(() => buildArrivalRoute([step({ page: "installing-it" })])).toThrow(
      /is not a page/
    )
  })

  it("refuses a step that comes before the one in front of it", () => {
    expect(() =>
      buildArrivalRoute([
        step({ id: "later", section: "building-with-loom", page: "primitives", checkpoint: "definePrimitive" }),
        step({ id: "earlier" }),
      ])
    ).toThrow(/after a page that comes later/)
  })

  it("refuses a step that promises a name the runtime does not publish", () => {
    expect(() => buildArrivalRoute([step({ checkpoint: "createStarterRegistry" })])).toThrow(
      /does not publish/
    )
  })

  it("refuses a step whose page has stopped naming its checkpoint", () => {
    expect(() =>
      buildArrivalRoute([step({ page: "your-first-tree", checkpoint: "commitIntent" })])
    ).toThrow(/no longer names/)
  })

  /**
   * *Introduction* names `TreeDelta` in a paragraph and has no fenced code at
   * all, which is exactly the page a checkpoint alone would happily accept.
   */
  it("refuses a step that sends a reader to type on a page with no code", () => {
    expect(() =>
      buildArrivalRoute([step({ page: "introduction", checkpoint: "TreeDelta" })])
    ).toThrow(/has no code on it/)
  })
})

describe("the page the route is on", () => {
  const introduction = readPageSource("getting-started", "introduction")

  it("is the first page a reader is given, and it shows the route", () => {
    expect(docsOrder[0]?.href).toBe("/docs/getting-started/introduction")
    expect(introduction).toContain("<ArrivalRoute />")
  })

  /**
   * The heading is the promise the budget above is enforced against. If it is
   * rewritten to say something else, the number in `ARRIVAL_BUDGET_MINUTES`
   * stops meaning anything and this is what says so.
   */
  it("promises an hour in the heading the route sits under", () => {
    expect(introduction).toContain("## What the next hour looks like")
    expect(ARRIVAL_BUDGET_MINUTES).toBe(60)
  })

  it("does not send a reader anywhere the route already sends them", () => {
    const closing = introduction.slice(introduction.indexOf("## Where to go next"))

    for (const entry of ARRIVAL_ROUTE.slice(1)) {
      expect(closing, entry.href).not.toContain(`(${entry.href})`)
    }
  })
})

describe("the totals, held against a route that is not this one", () => {
  it("counts an empty route as nothing at all", () => {
    const empty = arrivalTotals([])

    expect(empty.steps).toBe(0)
    expect(empty.blocks).toBe(0)
    expect(empty.minutes).toBe(0)
    expect(empty.sitePages).toBe(ARRIVAL_TOTALS.sitePages)
  })
})
