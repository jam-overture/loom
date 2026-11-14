import {
  applyDelta,
  buildElement,
  describeCeiling,
  buildText,
  describeTreeError,
  sequentialIdFactory,
  type JsonObject,
  type LoomTree,
  type TreeDelta,
} from "@jam-overture/loom"
import {
  DEFAULT_FIRST_WAIT_MS,
  DEFAULT_PULL_CEILING_MS,
  DEFAULT_PULL_INTERVAL_MS,
  describeComposeError,
  describeSitePullFailure,
  isPulling,
  LIVE_PAGES_PATH,
  livePagesUrlOf,
  NO_LIVE_PAGES,
  pageForReader,
  pullLivePages,
  startPullingLivePages,
  withPullOutcome,
  type LivePages,
  type PullFetch,
  type SitePullOutcome,
} from "@jam-overture/loom/live"

import { docsExamples } from "@/app/(docs)/_lib/examples/catalogue"

/**
 * What *How a change reaches readers* prints, produced by pulling.
 *
 * **The plain version first.** Somebody accepts a change in the portal. The
 * reader is on a server the portal has never heard of. Nothing on this site
 * said how the change gets from the one to the other, which is the last step of
 * the sentence this documentation exists to let a stranger finish.
 *
 * It gets there because the server **asks**. A loop fetches the project's live
 * pages on a timer, keeps them in the process, and the render path draws from
 * what it holds. Loom is never in the render path (0262), so there is no call
 * to it per request and no reader waiting on a network.
 *
 * Every figure and every sentence on that page is produced here, by running the
 * published client against a door this file stands up. A `PullFetch` is the
 * narrow shape of `fetch` the pull declares so that a test can be a function
 * rather than a server, and it is the whole of how this page is possible: there
 * is no Loom deployment to pull from while a documentation site is being built,
 * and a page about an unreachable door could not be written by reaching one that
 * works.
 *
 * **What that does and does not buy.** The client, the failure vocabulary, the
 * sentences, the sorting and the composition are the published ones, so a
 * renamed reason or a reworded sentence takes this page red. What is
 * constructed is the door's side: the page it answers is this site's own
 * example, and the one segment form is written below. The page says so, beside
 * the table it matters for.
 */

/** The page the whole page is about: the one a reader scrolls, presses and opens. */
const BUILT: LoomTree = (() => {
  const example = docsExamples.get("a-page-a-reader-scrolls")

  if (example === undefined) {
    throw new Error('loom: the live-pages page needs the "a-page-a-reader-scrolls" example')
  }

  return example.build()
})()

/**
 * The audience the one form on this page belongs to.
 *
 * A plain string rather than a parsed `AudienceId`, because everything below
 * assembles **the door's answer**, which is JSON over the wire. The client
 * parses it on arrival, which is the seam this block is demonstrating: an id
 * that did not match the grammar would be refused there rather than here.
 */
const RETURNING = "aud_returning"

const ids = sequentialIdFactory("livepages")

/**
 * The line a returning reader gets, inserted above everything else.
 *
 * A banner at the top of the root rather than a reworded heading, because it is
 * the shape a reader can hold in their head: the base page is untouched and one
 * node arrives in front of it. It is also the honest shape of what the portal
 * writes, since a segment's form is a delta against the base and the smallest
 * useful one is an insert.
 */
const welcomeBack = (): TreeDelta["operations"][number] => ({
  op: "insert",
  parentId: BUILT.root.id,
  index: 0,
  node: buildElement(ids, {
    type: "loom.banner",
    props: { tone: "accent", align: "center" },
    children: [buildText(ids, "Welcome back. Your measurements are still on file.")],
  }),
})

/** The form the door answers for that audience, against the revision it was authored on. */
const returningForm = (baseRevision: number) => ({
  audienceId: RETURNING,
  delta: {
    deltaId: ids.deltaId(),
    treeId: BUILT.treeId,
    baseRevision,
    operations: [welcomeBack()],
  },
})

/** The rule that sorts a reader into it: one key, one value, and nothing else. */
const returningRule = {
  audienceId: RETURNING,
  clauses: [{ key: "returning", anyOf: [true] }],
}

/**
 * The same page after an unrelated change was accepted on it.
 *
 * This is how the refused row further down is produced, and it is produced
 * rather than described: the page really is at a later revision than the form
 * was written against, because a change really was applied to it. Inventing a
 * revision number would have been a figure typed into a table.
 */
const MOVED_ON: LoomTree = (() => {
  const applied = applyDelta(BUILT, {
    deltaId: ids.deltaId(),
    treeId: BUILT.treeId,
    baseRevision: BUILT.revision,
    operations: [{ op: "configure", nodeId: BUILT.root.id, set: { width: "wide" }, unset: [] }],
  })

  if (!applied.ok) {
    throw new Error(`loom: the page could not be moved on — ${describeTreeError(applied.error)}`)
  }

  return applied.value
})()

/**
 * The envelope the door answers, as JSON, assembled from this site's own page.
 *
 * `moved` answers the page at the later revision while leaving the form where it
 * was written, which is the ordinary way a form goes stale: somebody accepted
 * something else.
 */
const doorAnswer = (moved: boolean): string =>
  JSON.stringify({
    pages: [moved ? MOVED_ON : BUILT],
    rules: [{ treeId: BUILT.treeId, rules: [returningRule] }],
    forms: [{ treeId: BUILT.treeId, forms: [returningForm(BUILT.revision)] }],
  })

/** A door that answers those pages, with the entity tag it names them by. */
const doorThatAnswers =
  (moved = false): PullFetch =>
  async () =>
    new Response(doorAnswer(moved), {
      status: 200,
      headers: { "content-type": "application/json", etag: 'W/"live-1"' },
    })

const DEPLOYMENT = "https://loom.example.com"

const KEY = "pk1documentation"

/** One pull, run for real, against whatever door and whatever configuration. */
const pullOnce = async (
  fetch: PullFetch,
  overrides: { readonly deployment?: string; readonly ceilingMs?: number } = {}
): Promise<SitePullOutcome> =>
  pullLivePages(
    {
      deployment: overrides.deployment ?? DEPLOYMENT,
      key: KEY,
      fetch,
      ...(overrides.ceilingMs === undefined ? {} : { ceilingMs: overrides.ceilingMs }),
    },
    NO_LIVE_PAGES
  )

/** What the server holds after a pull, which is what every render draws from. */
const heldAfter = async (
  fetch: PullFetch,
  overrides: { readonly deployment?: string; readonly ceilingMs?: number } = {}
): Promise<LivePages> =>
  withPullOutcome(NO_LIVE_PAGES, await pullOnce(fetch, overrides), Date.now())

/** What one pull brought back, as the page reports it. */
export type Arrival = {
  /** `fresh`, `unchanged` or `failed`, which is the whole vocabulary. */
  readonly kind: SitePullOutcome["kind"]
  /** The address that was asked, which carries no query and names no reader. */
  readonly url: string
  /** The path the client appends, so a reader can recognize it in a log. */
  readonly path: string
  /** How many pages, segment rule lists and segment forms the door answered. */
  readonly pages: number
  readonly rules: number
  readonly forms: number
  /** The tag the door gave, which is what the next pull sends back. */
  readonly tag: string
  /** Whether the server is now drawing on pages Loom confirmed. */
  readonly pulling: boolean
}

/**
 * One pull, start to finish, against a door answering this site's own page.
 *
 * The three counts are the shape of the answer rather than a size: the pages,
 * the rules that sort each page's readers, and the form each segment earns. They
 * arrive together on purpose, so that a site never sorts readers by one pull's
 * rules over another pull's pages (0371 clause 4), and the tag is what makes the
 * next pull cost nothing while nothing has moved.
 */
export const produceArrival = async (): Promise<Arrival> => {
  const outcome = await pullOnce(doorThatAnswers())
  const held = await heldAfter(doorThatAnswers())
  const url = livePagesUrlOf(DEPLOYMENT)

  if (!url.ok) throw new Error("loom: the documented deployment address was refused")

  return {
    kind: outcome.kind,
    url: url.value.toString(),
    path: LIVE_PAGES_PATH,
    pages: held.pages.size,
    rules: held.rules.size,
    forms: held.forms.size,
    tag: held.tag ?? "none",
    pulling: isPulling(held),
  }
}

/** One way a pull can fail, and what the reader got anyway. */
export type Failure = {
  /** The reason, from the closed list the client publishes. */
  readonly reason: string
  /** What was done to produce it, in plain words. */
  readonly cause: string
  /** The sentence `describeSitePullFailure` returned, for the host's log. */
  readonly sentence: string
  /** The status the door answered, where the failure had one. */
  readonly status: string
  /** Whether the page was still there to render. Every row says yes. */
  readonly served: boolean
  /** How many live pages the server held afterwards. */
  readonly held: number
}

const failureFrom = async (
  cause: string,
  fetch: PullFetch,
  overrides: { readonly deployment?: string; readonly ceilingMs?: number } = {}
): Promise<Failure> => {
  const outcome = await pullOnce(fetch, overrides)

  if (outcome.kind !== "failed") {
    throw new Error(`loom: ${cause} was supposed to fail the pull and did not`)
  }

  const held = withPullOutcome(NO_LIVE_PAGES, outcome, Date.now())
  const served = pageForReader(held, BUILT, { returning: true })

  return {
    reason: outcome.failure.reason,
    cause,
    sentence: describeSitePullFailure(outcome.failure),
    status: outcome.failure.status === undefined ? "none" : String(outcome.failure.status),
    served: served.tree.treeId === BUILT.treeId,
    held: held.pages.size,
  }
}

/** A door nobody is going to answer, for the row about the ceiling. */
const doorThatNeverAnswers: PullFetch = (_url, init) =>
  new Promise((_resolve, reject) => {
    init.signal.addEventListener("abort", () => reject(new Error("the pull gave up")))
  })

/** A door that is not there at all. */
const doorThatIsNotThere: PullFetch = async () => {
  throw new Error("getaddrinfo ENOTFOUND loom.example.com")
}

/**
 * Five milliseconds, so a documentation build does not spend the real ceiling.
 *
 * The same choice *When nothing comes back* makes, for the same reason. The
 * deployment's own number is printed beside it, read off the constant, because a
 * page showing one of the two would be implying it had waited the other.
 */
export const DOCS_PULL_CEILING_MS = 5

/**
 * Every way a pull can fail, each one produced, and the page served in all of
 * them.
 *
 * This is the block the page is really about. 0358 clause 4 says a failed pull
 * costs freshness and never the page, and the column that carries it is the last
 * one: a server that was never configured, cannot reach Loom, is not answered
 * by it, is refused by it, or cannot read what it said, renders the site it was
 * built with. There is no error state here for a host to write.
 */
export const produceFailures = async (): Promise<readonly Failure[]> =>
  Promise.all([
    failureFrom("nothing was configured to pull from", doorThatAnswers(), { deployment: "" }),
    failureFrom("the host could not be resolved", doorThatIsNotThere),
    failureFrom("the door said nothing at all", doorThatNeverAnswers, {
      ceilingMs: DOCS_PULL_CEILING_MS,
    }),
    failureFrom("the project key was not accepted", async () => new Response("", { status: 401 })),
    failureFrom(
      "the door answered something this version cannot read",
      async () => new Response('{"pages":"soon"}', { status: 200 })
    ),
  ])

/** What one reader was served, and what their page views will be filed under. */
export type Reader = {
  /** Who they are, in plain words rather than as a context object. */
  readonly who: string
  /** The context the host's server built, which never leaves the process. */
  readonly context: string
  /** The segment they were sorted into, or nothing. */
  readonly segment: string
  /** How many bands the page they got has, which is how the insert shows up. */
  readonly bands: number
  /** Whether the page they got carries the segment's form. */
  readonly formApplied: boolean
  /** The runtime's sentence about a form it would not apply. */
  readonly refusal: string
}

/**
 * One page, one pull, three readers, through the one call a render path makes.
 *
 * `pageForReader` answers three things at once and this page needs all three:
 * the tree to render, the segment to file the page view under (0284), and why a
 * form was not applied. The third row is the one worth reading twice. A form
 * written against a revision the page has moved past costs the reader their
 * **segment** and not their page, which is how the two properties either side
 * of it hold at the same time.
 */
export const produceReaders = async (): Promise<readonly Reader[]> => {
  const current = await heldAfter(doorThatAnswers())
  const stale = await heldAfter(doorThatAnswers(true))

  const read = (who: string, held: LivePages, context: JsonObject): Reader => {
    const served = pageForReader(held, BUILT, context)

    return {
      who,
      context: JSON.stringify(context),
      segment: served.audience ?? "none",
      bands: served.tree.root.children.length,
      formApplied: served.tree.root.children.length > BUILT.root.children.length,
      refusal: served.refusal === undefined ? "none" : describeComposeError(served.refusal),
    }
  }

  return [
    read("Somebody who has been here before", current, { returning: true, device: "phone" }),
    read("Somebody arriving for the first time", current, { returning: false, device: "phone" }),
    read("A returning reader, after the page moved", stale, { returning: true, device: "phone" }),
  ]
}

/** How many bands the base page has, so the prose never states the number. */
export const baseBandCount = (): number => BUILT.root.children.length

/** The waits a deployment gets, read off the constants rather than typed. */
export type Timings = {
  /** How long between pulls. */
  readonly interval: string
  /** How long the first render waits on a Loom that says nothing. */
  readonly firstWait: string
  /** How long one pull is given before it is a failure. */
  readonly ceiling: string
  /** The one this file chose, so the page can say which number is whose. */
  readonly docs: string
}

/**
 * Spelled by the runtime rather than here.
 *
 * `describeCeiling` is the published sentence for a duration, and it is the one
 * every other wait on this site is printed with. A second spelling in this file
 * would be this page disagreeing with *When nothing comes back* about what ten
 * thousand milliseconds is called.
 */
export const produceTimings = (): Timings => ({
  interval: describeCeiling(DEFAULT_PULL_INTERVAL_MS),
  firstWait: describeCeiling(DEFAULT_FIRST_WAIT_MS),
  ceiling: describeCeiling(DEFAULT_PULL_CEILING_MS),
  docs: describeCeiling(DOCS_PULL_CEILING_MS),
})

/** What the loop did: the one wait a reader ever has, and who has it. */
export type FirstReader = {
  /** Pulls the door had been asked for when the first render asked. */
  readonly pullsAtFirstRender: number
  /** Whether the first render got Loom's page rather than the built one. */
  readonly firstRenderWasLive: boolean
  /** Pulls the door had been asked for when the second render asked. */
  readonly pullsAtSecondRender: number
  /** Whether the second render cost the door anything. */
  readonly secondRenderAskedTheDoor: boolean
}

/**
 * The first render on a new server waits for the first pull, and nothing after
 * it waits at all.
 *
 * Produced by counting the door's calls either side of two renders. `ready()` is
 * what a render awaits: it settles once the first pull has, and answers at once
 * every time after. The schedule is replaced with one that never runs, so this
 * measures the first pull rather than a timer, and nothing is left running when
 * it returns.
 */
export const produceFirstReader = async (): Promise<FirstReader> => {
  let asked = 0
  const counting: PullFetch = async (url, init) => {
    asked += 1

    return doorThatAnswers()(url, init)
  }

  const loop = startPullingLivePages({
    deployment: DEPLOYMENT,
    key: KEY,
    fetch: counting,
    schedule: () => () => undefined,
  })

  try {
    const first = await loop.ready()
    const pullsAtFirstRender = asked

    await loop.ready()

    return {
      pullsAtFirstRender,
      firstRenderWasLive: first.pages.size > 0,
      pullsAtSecondRender: asked,
      secondRenderAskedTheDoor: asked > pullsAtFirstRender,
    }
  } finally {
    loop.stop()
  }
}
