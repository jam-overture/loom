import { namedExportsIn, publishedNames } from "../api/mentions"
import { fencesOnPage } from "../fences/extract"
import { isCheckable } from "../fences/model"
import { docsEntryAt, docsHref, docsOrder, writtenDocsSections } from "../nav"
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
 * The way round the first three steps, for somebody who would rather start from
 * a project that already works.
 *
 * Named here rather than in the component so that it is resolved against the
 * rail like everything else — the shortcut past the route is the last link on
 * this site that should be allowed to rot.
 */
export const ARRIVAL_SHORTCUT_HREF = pageAt("getting-started", "scaffolding-a-project").href
