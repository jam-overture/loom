import { namedExportsIn, publishedNames } from "../api/mentions"
import { fencesOnPage } from "../fences/extract"
import { isCheckable } from "../fences/model"
import {
  DOCS_LANDING_SLUG,
  docsEntryAt,
  docsHref,
  docsOrder,
  writtenDocsSections,
} from "../nav"
import { headingAnchor } from "../search/anchor"
import { readPageSource } from "../search/headings"
import { readPageProse } from "../search/prose"

/**
 * The shortest way from nothing to a change of somebody else's on your page.
 *
 * A stranger arriving at a documentation site with twenty-one pages does not
 * need a summary of them. They need to know **what the next hour is** — which
 * pages, in what order, and what they will have at the end of each one — before
 * deciding whether to spend it. That question is answered nowhere else on this
 * site, and the sidebar is the wrong shape to answer it: it lists everything
 * there is, in the order it should be read *once you are reading*.
 *
 * Two halves, and the split is the same one the Architecture section makes.
 *
 * **What each step gets you is written here**, in a sentence with no runtime
 * word in it. That is orientation, it is allowed to be lossy, and no page is
 * obliged to describe its own point in a sentence a stranger can hold.
 *
 * **Everything else is read from the page it points at** as the site builds:
 * the title and the address off the rail, the number of code blocks off the
 * page source, the reading time off its prose, and the anchor onto the heading
 * where the step's checkpoint is actually named. So a route that has gone stale
 * cannot render — it fails the build instead, which is the whole reason the
 * written half is allowed to be this short.
 *
 * A **checkpoint** is the one published name a reader will have typed by the
 * end of a step. It is the load-bearing part: a step claiming to teach you
 * `definePrimitive` is checked against the page's own code, so a page rewritten
 * to teach something else takes the promise down with it rather than leaving a
 * confident itinerary pointing at prose that no longer keeps it.
 */

export type StepSource = {
  readonly id: string
  readonly section: string
  readonly page: string
  /** What you have when it is done. No runtime word belongs in this sentence. */
  readonly done: string
  /** The one published name you will have typed by the end of it. */
  readonly checkpoint: string
}

const SOURCES: readonly StepSource[] = [
  {
    id: "install",
    section: "getting-started",
    page: "installation",
    done: "The package is in your project, and one call has proved it — you asked for the starter vocabulary and got it back, or got a sentence saying why not.",
    checkpoint: "createStarterPrimitiveRegistry",
  },
  {
    id: "a-page-as-data",
    section: "getting-started",
    page: "your-first-tree",
    done: "You have written a page down as data: a heading, a sentence, the box around them. It is JSON, so you can print it, store it and read it back.",
    checkpoint: "createTree",
  },
  {
    id: "on-the-screen",
    section: "getting-started",
    page: "rendering-a-tree",
    done: "That data is on the screen, drawn by your own React components. Nothing about the page is generated code.",
    checkpoint: "renderLoomTree",
  },
  {
    id: "somebody-asks",
    section: "getting-started",
    page: "your-first-change",
    done: "Somebody has asked for a change in a sentence, and it happened. You watched the ask become a written-down list of operations, get an answer, and land on the page.",
    checkpoint: "commitIntent",
  },
  {
    id: "a-word-of-your-own",
    section: "building-with-loom",
    page: "primitives",
    done: "A component you built is a word anybody can now use — the first one that was not handed to you. Everything a change is allowed to say comes off that list.",
    checkpoint: "definePrimitive",
  },
  {
    id: "when-it-says-no",
    section: "the-runtime",
    page: "what-the-gate-decides",
    done: "A change has been refused, and you know why and could have decided otherwise. This is the step people skip and then discover on a Friday.",
    checkpoint: "gatePolicySchema",
  },
]

/**
 * Words a minute, for the only number on this page nobody can check.
 *
 * Every other figure the route prints is counted off the pages. This one is a
 * rate, it is a convention rather than a measurement, and the page says so out
 * loud rather than quietly implying a stopwatch. 200 is the low end of the
 * usual range for technical prose, which is the right end to be at when the
 * number is being used to promise somebody an hour.
 */
export const WORDS_A_MINUTE = 200

/**
 * What the section's own title promises.
 *
 * A route that grew to ninety minutes of reading under a heading that says
 * *the next hour* would be a page lying about itself, in the way that is
 * hardest to notice: nothing renders differently and no link breaks. So the
 * claim is a budget, and a run that adds a seventh step either fits inside it
 * or changes the promise deliberately.
 */
export const ARRIVAL_BUDGET_MINUTES = 60

export type ArrivalStep = {
  readonly id: string
  /** What the rail calls the page. */
  readonly title: string
  readonly done: string
  readonly checkpoint: string
  /** The page itself. A reader following the route starts at the top of it. */
  readonly href: string
  /** The same page, anchored at the heading where the checkpoint is named. */
  readonly checkpointHref: string
  /** Fenced blocks on the page — how much of it is code rather than prose. */
  readonly blocks: number
  /** How many of those the repository's own typechecker compiles. */
  readonly compiled: number
  /** Reading time for its prose alone, at {@link WORDS_A_MINUTE}. */
  readonly minutes: number
}

const wordsOn = (section: string, page: string): number =>
  [...readPageProse(section, page).values()]
    .join(" ")
    .split(/\s+/)
    .filter((word) => word.length > 0).length

/** The page at a step, refusing an address the rail does not carry. */
const pageAt = (section: string, page: string) => {
  const href = docsHref(section, page)
  const entry = docsEntryAt(href)

  if (entry === undefined) {
    throw new Error(`loom: the arrival route sends a reader to ${href}, which is not a page`)
  }

  return { href, entry, index: docsOrder.indexOf(entry) }
}

const resolve = (source: StepSource, previous: StepSource | undefined): ArrivalStep => {
  const { href, entry, index } = pageAt(source.section, source.page)
  const where = `${source.section}/${source.page}`
  const previousIndex = previous === undefined ? -1 : pageAt(previous.section, previous.page).index

  /**
   * The route may not send a reader backwards.
   *
   * It is a shortcut through the site, not a second opinion about what order
   * the site is in — a step that came before its predecessor in the rail would
   * be the sidebar and the front page disagreeing, with the reader to settle
   * it. Checked by position rather than by section, so moving a page in
   * `nav.ts` is felt here.
   */
  if (index <= previousIndex) {
    throw new Error(`loom: the arrival route reaches ${href} after a page that comes later`)
  }

  if (!publishedNames.has(source.checkpoint)) {
    throw new Error(`loom: the arrival route promises ${source.checkpoint}, which the runtime does not publish`)
  }

  const heading = namedExportsIn(readPageSource(source.section, source.page), publishedNames).get(
    source.checkpoint
  )

  if (heading === undefined) {
    throw new Error(`loom: ${where} no longer names ${source.checkpoint}, which the arrival route promises it teaches`)
  }

  const fences = fencesOnPage(source.section, source.page)
  const blocks = fences.length

  /**
   * A step that says you will have typed something points at a page with code
   * on it. The one failure this catches that the checkpoint does not: a name
   * that survives only in a paragraph, on a page whose blocks have all gone.
   */
  if (blocks === 0) {
    throw new Error(`loom: ${where} has no code on it, and the arrival route sends a reader there to type`)
  }

  const anchor = heading === "" ? "" : `#${headingAnchor(heading)}`

  return {
    id: source.id,
    title: entry.page.title,
    done: source.done,
    checkpoint: source.checkpoint,
    href,
    checkpointHref: `${href}${anchor}`,
    blocks,
    compiled: fences.filter(isCheckable).length,
    minutes: Math.round(wordsOn(source.section, source.page) / WORDS_A_MINUTE),
  }
}

export const buildArrivalRoute = (sources: readonly StepSource[]): readonly ArrivalStep[] =>
  sources.map((source, position) => resolve(source, sources[position - 1]))

export const ARRIVAL_ROUTE: readonly ArrivalStep[] = buildArrivalRoute(SOURCES)

export type ArrivalTotals = {
  readonly steps: number
  readonly blocks: number
  /** Of those blocks, how many are TypeScript the build compiles. */
  readonly compiled: number
  readonly minutes: number
  /** Written pages on the whole site, so the route can say how much it skips. */
  readonly sitePages: number
}

export const arrivalTotals = (steps: readonly ArrivalStep[]): ArrivalTotals => ({
  steps: steps.length,
  blocks: steps.reduce((total, step) => total + step.blocks, 0),
  compiled: steps.reduce((total, step) => total + step.compiled, 0),
  minutes: steps.reduce((total, step) => total + step.minutes, 0),
  sitePages: writtenDocsSections.reduce((total, section) => total + section.pages.length, 0),
})

export const ARRIVAL_TOTALS: ArrivalTotals = arrivalTotals(ARRIVAL_ROUTE)

if (ARRIVAL_TOTALS.minutes > ARRIVAL_BUDGET_MINUTES) {
  throw new Error(
    `loom: the arrival route is ${ARRIVAL_TOTALS.minutes} minutes of reading under a heading that promises ${ARRIVAL_BUDGET_MINUTES}`
  )
}


/**
 * ## The pages the route walks past
 *
 * The route is six stops and the site has thirty-odd pages, so most of what a
 * reader goes past on the way is not a stop. That is what a shortcut is. What
 * nothing said until now is **which** pages it goes past, and why — so a page
 * added to Getting started joined the rail, joined the section's own list, and
 * did not join the route, and nothing anywhere went red. A reader taking the
 * route would simply never hear about it.
 *
 * So every page the route passes is now either a stop or **named below, with
 * the reason it is not one**. A page added in front of one fails the build
 * until somebody decides which of the two it is, and that is the one failure
 * the rest of this module cannot see: every other check here is about the stops
 * the route declares rather than about the pages it declares nothing about.
 *
 * **What *passes* means, because the honest answer is narrower than the rail.**
 * The route is responsible for the pages a reader meets **before it takes them
 * out of a section**. It enters Getting started at the top and leaves at the
 * last page, so the whole section is its business. It enters Building with Loom
 * at *Primitives and the registry* and leaves from there for the runtime — so
 * the seven pages after it in that section are not pages a reader on the route
 * goes past, they are the section the route declined to finish. A page appended
 * to one of those is depth the site is allowed to grow; a page slipped in
 * *before* the stop the route leaves from is a page the route now walks past in
 * silence, and that is the one this refuses.
 *
 * **The reason is not a sentence we are taken at our word on.** Each excuse is
 * a *fact about the site* that something checks, so an excuse cannot outlive
 * what made it true:
 *
 * - `the-route-is-printed-here` — the page the route is drawn on. Checked by
 *   looking for the route's own tag in that page's source.
 * - `the-route-offers-it-in-its-own-prose` — the route's page links to it in so
 *   many words. Checked against that page's source, so a paragraph rewritten to
 *   drop the link takes the excuse down with it.
 * - `a-stop-covers-the-same-ground` — a stop the reader has **already been
 *   through** teaches it. Checked against the stops, and against reading order:
 *   a page excused by a stop further along is a page the reader passes before
 *   the thing that was supposed to have covered it.
 *
 * The sentence beside the excuse is the judgement rather than the fact — why
 * the hour is better without the page rather than thinner — and its reader is
 * whoever is looking at a failure.
 *
 * **Two kinds of page are off the route by rule rather than by name.** A
 * section's own page is a listing and the route sends a reader to pages that
 * teach, so a landing page is never a stop and never needs an excuse. And a
 * page the route does not reach was never on the way: the route finishes at the
 * Gate, and the rest of the site is the rest of the site. Both are refused as
 * excuses, because an excuse that holds nothing up is one more thing to keep
 * true.
 */

export type OffRouteExcuse =
  | { readonly excuse: "the-route-is-printed-here" }
  | { readonly excuse: "the-route-offers-it-in-its-own-prose" }
  /** `stop` is the {@link StepSource.id} of the step that covers it. */
  | { readonly excuse: "a-stop-covers-the-same-ground"; readonly stop: string }

export type OffRoutePage = {
  readonly section: string
  readonly page: string
  /** Why the hour is better without it. A sentence, read by whoever hits a failure. */
  readonly because: string
} & OffRouteExcuse

const OFF_ROUTE: readonly OffRoutePage[] = [
  {
    section: "getting-started",
    page: "introduction",
    excuse: "the-route-is-printed-here",
    because:
      "The route is drawn on this page, so a reader looking at it has arrived already — a step sending them here would be the itinerary offering itself as the first destination.",
  },
  {
    section: "getting-started",
    page: "quickstart",
    excuse: "the-route-offers-it-in-its-own-prose",
    because:
      "It is the first three steps in one file you run rather than three pages you read, and the paragraph above the route offers it to anybody who would rather start that way.",
  },
  {
    section: "getting-started",
    page: "scaffolding-a-project",
    excuse: "a-stop-covers-the-same-ground",
    stop: "install",
    because:
      "It is the same ground as Installation with a command doing the typing, and a reader who has been through either one has what the next step needs.",
  },
  {
    section: "the-runtime",
    page: "proposing-a-change",
    excuse: "a-stop-covers-the-same-ground",
    stop: "somebody-asks",
    because:
      "Your first change has already walked an ask from a sentence to a page; this is those same four steps in the runtime's own words, which is a second reading rather than a first.",
  },
]

/** `section/page`, the one spelling of a page in the two lists above. */
const whereOf = (page: { readonly section: string; readonly page: string }): string =>
  `${page.section}/${page.page}`

/** How far along the rail a page is, or `-1` for an address the rail does not carry. */
const railIndexOf = (section: string, page: string): number =>
  docsOrder.findIndex((entry) => entry.href === docsHref(section, page))

/**
 * The pages a reader walking the route goes past, in reading order.
 *
 * Per section the route visits, everything up to and including the stop it
 * leaves that section from — which is the reading of *passes* argued above. A
 * section with no stop in it is a section the route never enters, so none of it
 * is here. Landing pages and the generated sections are left out for the other
 * two reasons: a listing is not a stop, and a reference page is not where a
 * first hour goes.
 */
export const pagesTheRoutePasses = (sources: readonly StepSource[]): readonly string[] => {
  const leaves = sources.reduce<ReadonlyMap<string, number>>((sections, source) => {
    const index = railIndexOf(source.section, source.page)

    return new Map(sections).set(source.section, Math.max(index, sections.get(source.section) ?? -1))
  }, new Map())

  return docsOrder
    .filter((entry, index) => {
      const leaving = leaves.get(entry.section.slug)

      return (
        leaving !== undefined &&
        index <= leaving &&
        entry.section.source === "written" &&
        entry.page.slug !== DOCS_LANDING_SLUG
      )
    })
    .map((entry) => `${entry.section.slug}/${entry.page.slug}`)
}

/**
 * Everything wrong with the account the route gives of the pages it passes, as
 * sentences a person can act on.
 *
 * A list rather than a throw, and pure over its three arguments, so the rules
 * can be held against routes written to break them one at a time — which is
 * what `arrival.test.ts` does — rather than against whichever shape the site
 * happens to be in this week. The site's own answer is
 * {@link ROUTE_ACCOUNT_FAULTS}, and it is empty or this module does not load.
 */
export const routeAccountFaults = (
  sources: readonly StepSource[],
  skipped: readonly OffRoutePage[],
  sourceOf: (sectionSlug: string, pageSlug: string) => string = readPageSource
): readonly string[] => {
  const stops = new Map(sources.map((source) => [whereOf(source), source] as const))
  const stopIds = new Map(sources.map((source) => [source.id, source] as const))
  const passed = pagesTheRoutePasses(sources)
  const printedOn = skipped.filter((page) => page.excuse === "the-route-is-printed-here")
  const host = printedOn[0]

  const twice = printedOn.length > 1 ? ["more than one page says the route is printed on it"] : []

  const named = skipped.flatMap((page, position) => {
    const where = whereOf(page)
    const index = railIndexOf(page.section, page.page)

    if (skipped.findIndex((other) => whereOf(other) === where) !== position) {
      return [`${where} is named twice among the pages the route does not stop at`]
    }

    if (index === -1) {
      return [`${where} is named as a page the route does not stop at, and it is not a page`]
    }

    if (page.page === DOCS_LANDING_SLUG) {
      return [`${where} is a section's own page, which is never a stop and needs no reason`]
    }

    if (stops.has(where)) {
      return [`${where} is a stop on the route and also says why the route does not stop there`]
    }

    if (!passed.includes(where)) {
      return [`the route does not pass ${where}, so nothing has to say why it is not a stop`]
    }

    const reason = page.because.trim()

    if (reason.length < 40 || !reason.endsWith(".")) {
      return [`the reason the route does not stop at ${where} is not a sentence`]
    }

    if (page.excuse === "the-route-is-printed-here") {
      return sourceOf(page.section, page.page).includes("<ArrivalRoute />")
        ? []
        : [`${where} says the route is printed on it, and it does not draw the route`]
    }

    if (page.excuse === "the-route-offers-it-in-its-own-prose") {
      if (host === undefined) {
        return [
          `${where} says the route's own prose offers it, and nothing says which page the route is printed on`,
        ]
      }

      return sourceOf(host.section, host.page).includes(`(${docsHref(page.section, page.page)})`)
        ? []
        : [`${where} says the route's own prose offers it, and ${whereOf(host)} does not link to it`]
    }

    const covering = stopIds.get(page.stop)

    if (covering === undefined) {
      return [
        `${where} is said to be covered by the step "${page.stop}", and the route has no such step`,
      ]
    }

    return railIndexOf(covering.section, covering.page) < index
      ? []
      : [`${where} is said to be covered by a step the reader does not reach until after it`]
  })

  const unaccounted = passed
    .filter((where) => !stops.has(where) && !skipped.some((page) => whereOf(page) === where))
    .map((where) => `the route passes ${where} and neither stops there nor says why it does not`)

  return [...twice, ...named, ...unaccounted]
}

export const ROUTE_ACCOUNT_FAULTS: readonly string[] = routeAccountFaults(SOURCES, OFF_ROUTE)

if (ROUTE_ACCOUNT_FAULTS.length > 0) {
  throw new Error(
    `loom: the arrival route does not account for every page it passes —\n${ROUTE_ACCOUNT_FAULTS.map(
      (fault) => `  - ${fault}`
    ).join("\n")}`
  )
}

/**
 * The two halves of the account, for anything that wants to read it rather than
 * check it: the pages the route goes past, and the ones it goes past on
 * purpose.
 */
export const ROUTE_ACCOUNT = {
  passes: pagesTheRoutePasses(SOURCES),
  skipped: OFF_ROUTE,
} as const
