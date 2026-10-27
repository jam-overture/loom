import { describe, expect, it } from "vitest"

import {
  ARRIVAL_BUDGET_MINUTES,
  ARRIVAL_ROUTE,
  ARRIVAL_TOTALS,
  ROUTE_ACCOUNT,
  ROUTE_ACCOUNT_FAULTS,
  arrivalTotals,
  buildArrivalRoute,
  type OffRoutePage,
  pagesTheRoutePasses,
  routeAccountFaults,
  type StepSource,
} from "./route"
import { namedExportsIn, publishedNames } from "../api/mentions"
import { fencesOnPage } from "../fences/extract"
import { isCheckable } from "../fences/model"
import {
  DOCS_LANDING_SLUG,
  docsEntryAt,
  docsEntryPoint,
  docsHref,
  docsOrder,
  docsSections,
} from "../nav"
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

  /**
   * **The page a reader is given**, which stopped being `docsOrder[0]` on
   * 25 October: the first entry in the order is now the Getting started
   * section's own page, and `/docs` deliberately goes past it to the page with
   * a tree on it. The claim is unchanged and it is asked of the function that
   * answers it.
   */
  it("is the first page a reader is given, and it shows the route", () => {
    expect(docsEntryPoint()).toBe("/docs/getting-started/introduction")
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

/**
 * The route is a shortcut, so most of the site is not on it. These are about
 * the pages it goes **past** — the ones a reader walking it meets and is not
 * sent to.
 *
 * The failure here is quieter than a stale itinerary and it is the one that
 * actually happens: somebody adds a page to Getting started, the rail carries
 * it, the section's own page lists it, and the route — six stops typed into a
 * file nobody edits when they write a page — goes on promising an hour that
 * never mentions it. Nothing is false on any page. A reader just never hears
 * about it.
 *
 * So the pure function is exercised on routes written to break one rule at a
 * time, with the page sources handed in, and the site's own account is
 * recomputed here from the rail rather than read back off the module.
 */

/** Pages whose source is whatever a test says it is. */
const pagesSaying =
  (sources: Readonly<Record<string, string>>) =>
  (section: string, page: string): string =>
    sources[`${section}/${page}`] ?? ""

const INTRODUCTION = "getting-started/introduction"
const QUICKSTART = "getting-started/quickstart"

/** The one step the crafted routes below are built on: Getting started, third page. */
const oneStop: readonly StepSource[] = [step()]

/**
 * A complete account of that one-step route: it passes the two pages above
 * *Installation*, and both are excused.
 */
const printedHere: OffRoutePage = {
  section: "getting-started",
  page: "introduction",
  excuse: "the-route-is-printed-here",
  because: "The route is drawn on this page, so a reader looking at it is already here.",
}

const offeredInProse: OffRoutePage = {
  section: "getting-started",
  page: "quickstart",
  excuse: "the-route-offers-it-in-its-own-prose",
  because: "The paragraph above the route offers it to anybody who would rather run one file.",
}

const introductionSaying = pagesSaying({
  [INTRODUCTION]: `<ArrivalRoute /> and [Quickstart](${docsHref("getting-started", "quickstart")})`,
})

const faultsOn = (skipped: readonly OffRoutePage[], sourceOf = introductionSaying): readonly string[] =>
  routeAccountFaults(oneStop, skipped, sourceOf)

/**
 * The route as the sources that produced it, rebuilt from the addresses it
 * printed, so what the assertions below walk is the rendered route rather than
 * the list beside it in the module.
 */
const ROUTE_AS_SOURCES: readonly StepSource[] = ARRIVAL_ROUTE.map((entry) => {
  const [, section = "", page = ""] = entry.href.split("/").slice(1)

  return { id: entry.id, section, page, done: entry.done, checkpoint: entry.checkpoint }
})

describe("the pages the route walks past", () => {
  it("accounts for every one of them, on the site as it stands", () => {
    expect(ROUTE_ACCOUNT_FAULTS).toEqual([])
  })

  /**
   * Recomputed from the rail rather than from `pagesTheRoutePasses`, which is
   * the function under test: per section the route stops in, every written page
   * up to the stop it leaves from is either a stop or named with a reason.
   */
  it("is every page in a section the route visits, up to where it leaves", () => {
    const stops = new Set(ARRIVAL_ROUTE.map((entry) => entry.href))
    const excused = new Set(
      ROUTE_ACCOUNT.skipped.map((page) => docsHref(page.section, page.page))
    )

    for (const section of docsSections.filter((candidate) => candidate.source === "written")) {
      const hrefs = section.pages.map((page) => docsHref(section.slug, page.slug))
      const last = hrefs.reduce((latest, href, index) => (stops.has(href) ? index : latest), -1)

      if (last === -1) continue

      for (const [index, href] of hrefs.entries()) {
        if (index > last) continue
        if (href === docsHref(section.slug, DOCS_LANDING_SLUG)) continue

        expect(stops.has(href) || excused.has(href), href).toBe(true)
      }
    }
  })

  /**
   * The section the finding was about, stated as numbers rather than left to
   * the loop above: a page added to Getting started changes one of these three.
   */
  it("leaves nothing in Getting started unaccounted for", () => {
    const passed = pagesTheRoutePasses(ROUTE_AS_SOURCES)
    const inSection = passed.filter((where) => where.startsWith("getting-started/"))

    expect(inSection).toHaveLength(7)
    expect(ARRIVAL_ROUTE.filter((entry) => entry.href.startsWith("/docs/getting-started/"))).toHaveLength(4)
    expect(ROUTE_ACCOUNT.skipped.filter((page) => page.section === "getting-started")).toHaveLength(3)
  })

  /**
   * The seven pages after *Primitives and the registry* are the section the
   * route declined to finish rather than pages it walks past, which is the
   * narrowing the module argues for. If that argument is ever dropped, this is
   * the assertion that says the seven became everybody's problem.
   */
  it("does not ask about a section's pages after the stop the route leaves from", () => {
    const passed = pagesTheRoutePasses(ROUTE_AS_SOURCES)

    expect(passed.filter((where) => where.startsWith("building-with-loom/"))).toEqual([
      "building-with-loom/primitives",
    ])
    expect(passed.some((where) => where.startsWith("architecture/"))).toBe(false)
  })

  it("never counts a section's own page, which is a listing rather than a stop", () => {
    for (const where of pagesTheRoutePasses(ROUTE_AS_SOURCES)) {
      expect(where.endsWith("/"), where).toBe(false)
    }
  })
})

describe("the reason a page is not a stop, which is a fact rather than a claim", () => {
  it("names the page the route is really drawn on", () => {
    const printed = ROUTE_ACCOUNT.skipped.filter(
      (page) => page.excuse === "the-route-is-printed-here"
    )

    expect(printed).toHaveLength(1)

    for (const page of printed) {
      expect(readPageSource(page.section, page.page)).toContain("<ArrivalRoute />")
    }
  })

  it("is offered in the route's own prose where it says it is", () => {
    const host = ROUTE_ACCOUNT.skipped.find((page) => page.excuse === "the-route-is-printed-here")
    const prose = readPageSource(host?.section ?? "", host?.page ?? "")

    for (const page of ROUTE_ACCOUNT.skipped) {
      if (page.excuse !== "the-route-offers-it-in-its-own-prose") continue

      expect(prose, `${page.section}/${page.page}`).toContain(`(${docsHref(page.section, page.page)})`)
    }
  })

  it("is covered by a step the reader has already been through", () => {
    const positions = new Map(docsOrder.map((entry, index) => [entry.href, index] as const))

    for (const page of ROUTE_ACCOUNT.skipped) {
      if (page.excuse !== "a-stop-covers-the-same-ground") continue

      const stop = ARRIVAL_ROUTE.find((entry) => entry.id === page.stop)

      expect(stop, page.stop).toBeDefined()
      expect(positions.get(stop?.href ?? "") ?? -1).toBeLessThan(
        positions.get(docsHref(page.section, page.page)) ?? -1
      )
    }
  })

  it("says why in a sentence, for whoever is reading the failure", () => {
    for (const page of ROUTE_ACCOUNT.skipped) {
      expect(page.because.length, `${page.section}/${page.page}`).toBeGreaterThan(40)
      expect(page.because.trim().endsWith("."), `${page.section}/${page.page}`).toBe(true)
    }
  })
})

describe("the ways an account of the skipped pages is refused", () => {
  it("accepts the complete one", () => {
    expect(faultsOn([printedHere, offeredInProse])).toEqual([])
  })

  it("refuses a page the route passes that nothing says anything about", () => {
    expect(faultsOn([printedHere])).toEqual([
      `the route passes ${QUICKSTART} and neither stops there nor says why it does not`,
    ])
  })

  it("refuses the same page named twice", () => {
    expect(faultsOn([printedHere, offeredInProse, offeredInProse])).toContain(
      `${QUICKSTART} is named twice among the pages the route does not stop at`
    )
  })

  it("refuses a reason given for something that is not a page", () => {
    expect(
      faultsOn([printedHere, offeredInProse, { ...printedHere, page: "introducing-it" }])
    ).toContain("getting-started/introducing-it is named as a page the route does not stop at, and it is not a page")
  })

  it("refuses a reason given for a section's own page", () => {
    expect(
      faultsOn([printedHere, offeredInProse, { ...printedHere, page: DOCS_LANDING_SLUG }])
    ).toContain("getting-started/ is a section's own page, which is never a stop and needs no reason")
  })

  it("refuses a page that is a stop and also says why it is not one", () => {
    expect(
      faultsOn([printedHere, offeredInProse, { ...printedHere, page: "installation" }])
    ).toContain(
      "getting-started/installation is a stop on the route and also says why the route does not stop there"
    )
  })

  /**
   * An excuse for a page the route never goes past is an excuse holding nothing
   * up, and it will go stale without anything noticing — which is the whole
   * argument the rest of this file is built on.
   */
  it("refuses a reason for a page the route does not pass", () => {
    expect(
      faultsOn([printedHere, offeredInProse, { ...printedHere, page: "rendering-a-tree" }])
    ).toContain(
      "the route does not pass getting-started/rendering-a-tree, so nothing has to say why it is not a stop"
    )
  })

  it("refuses a reason that is a label rather than a sentence", () => {
    expect(faultsOn([printedHere, { ...offeredInProse, because: "covered elsewhere" }])).toEqual([
      `the reason the route does not stop at ${QUICKSTART} is not a sentence`,
    ])
  })

  it("refuses a reason that trails off without a full stop", () => {
    expect(
      faultsOn([printedHere, { ...offeredInProse, because: offeredInProse.because.slice(0, -1) }])
    ).toEqual([`the reason the route does not stop at ${QUICKSTART} is not a sentence`])
  })

  it("refuses a page that says the route is printed on it and does not draw it", () => {
    expect(faultsOn([printedHere, offeredInProse], pagesSaying({}))).toContain(
      `${INTRODUCTION} says the route is printed on it, and it does not draw the route`
    )
  })

  it("refuses two pages both saying the route is printed on them", () => {
    expect(
      faultsOn([printedHere, offeredInProse, { ...printedHere, page: "quickstart" }])
    ).toContain("more than one page says the route is printed on it")
  })

  it("refuses an offer nothing can be checked against", () => {
    expect(routeAccountFaults(oneStop, [offeredInProse], introductionSaying)).toContain(
      `${QUICKSTART} says the route's own prose offers it, and nothing says which page the route is printed on`
    )
  })

  /**
   * The failure this excuse exists for: the link in the route's own prose is
   * rewritten away, and the reason the route gives for skipping the Quickstart
   * stops being true the same minute.
   */
  it("refuses an offer the route's page no longer makes", () => {
    expect(
      faultsOn([printedHere, offeredInProse], pagesSaying({ [INTRODUCTION]: "<ArrivalRoute />" }))
    ).toEqual([
      `${QUICKSTART} says the route's own prose offers it, and ${INTRODUCTION} does not link to it`,
    ])
  })

  it("refuses a page covered by a step the route does not have", () => {
    expect(
      faultsOn([
        printedHere,
        {
          section: "getting-started",
          page: "quickstart",
          excuse: "a-stop-covers-the-same-ground",
          stop: "installing-it",
          because: "The step that teaches this is the one before it in the section.",
        },
      ])
    ).toEqual([
      `${QUICKSTART} is said to be covered by the step "installing-it", and the route has no such step`,
    ])
  })

  /**
   * *Quickstart* comes before *Installation* in the rail, so a reader passing
   * it has not reached the step said to cover it. An excuse pointing forwards
   * is an excuse about a reader who has already finished.
   */
  it("refuses a page covered by a step the reader has not reached yet", () => {
    expect(
      faultsOn([
        printedHere,
        {
          section: "getting-started",
          page: "quickstart",
          excuse: "a-stop-covers-the-same-ground",
          stop: "a-step",
          because: "The step after it in the section is said to have taught it already.",
        },
      ])
    ).toEqual([
      `${QUICKSTART} is said to be covered by a step the reader does not reach until after it`,
    ])
  })

  it("asks nothing of a route with no steps in it", () => {
    expect(pagesTheRoutePasses([])).toEqual([])
    expect(routeAccountFaults([], [], introductionSaying)).toEqual([])
  })
})
