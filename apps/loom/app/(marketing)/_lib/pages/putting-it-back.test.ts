import type { ElementNode, LoomNode, LoomTree } from "@loom/runtime"
import { beforeAll, describe, expect, it } from "vitest"

import type { RoundTrip } from "../adapt/round-trip"
import { RESERVED_VOCABULARY } from "../copy"
import { piecesIn } from "../measure"
import { pageTreeFor, roundTripsFor, treeFor } from "../render"
import {
  DEFAULT_THEME,
  HOME,
  PUTTING_IT_BACK,
  SITE_ROUTES,
  THE_RECORD,
  WHAT_YOU_RUN,
  WHO_CAN_ASK,
  YOUR_COMPONENTS,
  type SiteThemeName,
} from "../site"
import { uses, wordsOf } from "../words"
import { afterwards, readingOf, ROUND_TRIP_ANCHOR, puttingItBackPageTree } from "./putting-it-back"

/**
 * The page for the fourth quarter of the difference, held to the runs it prints.
 *
 * Everything on it is a measurement taken on this site's own front page while
 * the page was being built. So everything is asserted against **the rendered
 * page** rather than against the module that composes it — the failure this lane
 * has recorded more than any other is a sentence that stayed true of a run the
 * page had stopped printing, and a test that reads the builder's inputs cannot
 * see that happen.
 */

const ORIGIN = "https://loom.example"
const context = { origin: ORIGIN, theme: DEFAULT_THEME }

const elementsOf = (node: LoomNode): readonly ElementNode[] =>
  node.kind === "text"
    ? []
    : [...(node.kind === "element" ? [node] : []), ...node.children.flatMap(elementsOf)]

const served = async (theme: SiteThemeName = DEFAULT_THEME): Promise<LoomTree> =>
  pageTreeFor(PUTTING_IT_BACK, { origin: ORIGIN, theme })

const linksOf = (node: LoomNode): readonly string[] =>
  elementsOf(node).flatMap((element) =>
    typeof element.props["href"] === "string" ? [element.props["href"]] : []
  )

/** A trip with every field settable, for the branches this site's own runs do not reach. */
const tripLike = (over: Partial<RoundTrip> = {}): RoundTrip => ({
  ask: "shorter",
  asked: "I am in a hurry.",
  label: "I don't have long",
  change: {
    ask: "shorter",
    asked: "I am in a hurry.",
    proposed: "It takes the questions away.",
    putBack: false,
    measured: "10 pieces taken away, in 1 step.",
    weighed: "Weighed as middling: it takes a lot off the page at once.",
    verdict: "landed",
    verdictLabel: "Allowed",
    verdictLine: "It can be taken back.",
    undo: "The change that reverses this was written at the same time.",
    landed: true,
    awaitingYou: false,
  },
  back: {
    ask: "shorter",
    asked: "Put it back.",
    proposed: "It puts the questions back.",
    putBack: true,
    measured: "10 pieces added, in 1 step.",
    weighed: "Weighed as middling: it reaches across a lot of the page.",
    verdict: "landed",
    verdictLabel: "Allowed",
    verdictLine: "It can be taken back.",
    undo: "Nothing has changed, so there is nothing to put back.",
    landed: true,
    awaitingYou: false,
  },
  arrived: 228,
  changed: 218,
  restored: 228,
  identical: true,
  ...over,
})

describe("the round trips the page prints", () => {
  let page: LoomTree
  let trips: readonly RoundTrip[]
  let words = ""

  beforeAll(async () => {
    page = await served()
    trips = await roundTripsFor(context)
    words = wordsOf(page.root)
  })

  it("is one row per request, and the sentence in each is the one the sequence returned", () => {
    expect(trips.length).toBeGreaterThan(0)

    for (const trip of trips) {
      expect({ ask: trip.ask, onThePage: words.includes(trip.change.measured) }).toEqual({
        ask: trip.ask,
        onThePage: true,
      })
      expect({ ask: trip.ask, onThePage: words.includes(trip.back.measured) }).toEqual({
        ask: trip.ask,
        onThePage: true,
      })
    }
  })

  /**
   * The count a reader is asked to compare across a click: the page says how many
   * pieces came back, and it is the number of pieces the front door is built
   * from. A page that printed its own count would be a page that agrees with
   * itself and with nothing else.
   */
  it("says the number of pieces the front door is actually built from", () => {
    const front = piecesIn(treeFor(HOME, context).root)

    expect(front).toBeGreaterThan(0)
    expect(words).toContain(`${front} pieces again — the same ones`)
  })

  it("hands a reader the address of the band its opening action promises", () => {
    const anchored = elementsOf(page.root).filter(
      (element) => element.props["anchor"] === ROUND_TRIP_ANCHOR
    )

    expect(anchored).toHaveLength(1)
    expect(linksOf(page.root).some((href) => href.endsWith(`#${ROUND_TRIP_ANCHOR}`))).toBe(true)
  })

  /**
   * The one place the page sends a reader to do it themselves, and it carries
   * both halves: the request, and the instruction to put it back afterwards.
   */
  it("offers the front door with a change to make and a change to undo", () => {
    const links = linksOf(page.root)

    expect(links.some((href) => href.includes("ask=shorter") && href.includes("back=1"))).toBe(true)
    expect(links.some((href) => href.includes(THE_RECORD.path))).toBe(true)
  })
})

/**
 * The cell a reader scans down, in both of its states.
 *
 * The true one is what this site's runs produce. The false one is unreachable
 * here — `roundTripsOn` throws rather than returning it — and is asserted anyway,
 * because a cell that printed the reassuring sentence whatever happened would
 * pass every other test on this page.
 */
describe("what the page says came back", () => {
  it("says the pieces are the ones you arrived with when they are", () => {
    expect(afterwards(tripLike())).toContain("228 pieces again — the same ones")
  })

  it("says they are not when they are not", () => {
    const drifted = afterwards(tripLike({ identical: false, restored: 228 }))

    expect(drifted).toContain("228 pieces, and not the same ones")
    expect(drifted).not.toContain("pieces again")
  })
})

/**
 * The reading under the table, which is the sentence that goes stale.
 *
 * Held on data this site does not have, so that it is the composition being
 * asserted rather than today's true text — the survivor this lane reported on
 * 13 September, and the half of it that can actually be closed.
 */
describe("the reading under the table", () => {
  it("counts the trips your rules stopped on the way back", () => {
    const stopped = readingOf([
      tripLike({ ask: "problem" }),
      tripLike({ back: { ...tripLike().back, verdict: "approved" } }),
    ])

    expect(stopped).toContain("One of them your rules stopped on the way back")
  })

  it("says so plainly when your rules stopped none of them", () => {
    const clean = readingOf([tripLike(), tripLike({ ask: "proof" })])

    expect(clean).toContain("let every one of them back on its own")
    expect(clean).not.toContain("stopped on the way back")
  })

  it("counts the pieces off the trips rather than off a number written here", () => {
    expect(readingOf([tripLike({ arrived: 41, restored: 41 })])).toContain("same 41 pieces")
  })
})

/**
 * The two bands that exist only because a run produced them.
 *
 * Both are composed out of what came back and both are left out when nothing
 * came back that way, which is what stops the page keeping a paragraph about
 * something that has stopped happening.
 */
describe("the band about being asked twice", () => {
  it("quotes the request your rules stopped, and what they said about putting it back", async () => {
    const trips = await roundTripsFor(context)
    const stopped = trips.find((trip) => trip.back.verdict === "approved")
    const words = wordsOf((await served()).root)

    if (stopped === undefined) throw new Error("loom: no trip on this site is stopped on the way back")

    expect(words).toContain(stopped.asked)
    expect(words).toContain(stopped.back.verdictLine)
    expect(words).toContain("Saying yes once does not buy you saying yes again")
  })

  it("is not on a page where nothing was stopped on the way back", () => {
    const built = puttingItBackPageTree({ ...context, trips: [tripLike(), tripLike({ ask: "proof" })] })

    expect(wordsOf(built.root)).not.toContain("Saying yes once does not buy you saying yes again")
  })
})

describe("the band about weighing the way back on its own", () => {
  it("prints two different weighings on every row it carries", async () => {
    const trips = await roundTripsFor(context)
    const words = wordsOf((await served()).root)
    const differing = trips.filter((trip) => trip.change.weighed !== trip.back.weighed)

    expect(differing.length).toBeGreaterThan(0)

    for (const trip of differing) {
      expect({ ask: trip.ask, change: words.includes(trip.change.weighed) }).toEqual({
        ask: trip.ask,
        change: true,
      })
      expect({ ask: trip.ask, back: words.includes(trip.back.weighed) }).toEqual({
        ask: trip.ask,
        back: true,
      })
    }
  })

  it("is not on a page where every trip was weighed the same both ways", () => {
    const same = tripLike({ back: { ...tripLike().back, weighed: tripLike().change.weighed } })
    const built = puttingItBackPageTree({ ...context, trips: [same] })

    expect(wordsOf(built.root)).not.toContain("not given the verdict of the change it reverses")
  })
})

describe("the page itself", () => {
  it("is in the site's map, directly after the record it is the other half of", () => {
    const paths = SITE_ROUTES.map((route) => route.path)

    expect(paths.indexOf(PUTTING_IT_BACK.path)).toBe(paths.indexOf(THE_RECORD.path) + 1)
  })

  /**
   * Widened rather than relaxed, like the three assertions it joins: five of nine
   * pages are now off the bar, which is worse than four of eight and is the
   * number the 12 September finding asked to be told. The list stays exact.
   */
  it("is off the bar, with four other pages", () => {
    expect(PUTTING_IT_BACK.inMenu).toBe(false)
    expect(SITE_ROUTES.filter((route) => !route.inMenu)).toEqual([
      HOME,
      WHO_CAN_ASK,
      PUTTING_IT_BACK,
      WHAT_YOU_RUN,
      YOUR_COMPONENTS,
    ])
  })

  it("meets nobody with a word they do not have", async () => {
    const words = wordsOf((await served()).root)

    for (const term of RESERVED_VOCABULARY) {
      expect({ term, uses: uses(words, term) }).toEqual({ term, uses: false })
    }
  })

  /**
   * The title carries no *Loom*, because the card already has the wordmark at
   * its top left and `share.ts` only drops the half of a title that is exactly
   * the name.
   */
  it("names itself on a share card without printing the name twice", () => {
    expect(PUTTING_IT_BACK.title).not.toContain("Loom")
    expect(PUTTING_IT_BACK.description).toContain("Loom")
  })
})
