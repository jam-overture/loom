import { beforeAll, describe, expect, it } from "vitest"

import {
  anchorsIn,
  crossPageFragmentsIn,
  mentionsIn,
  namedPagesIn,
  pathNamed,
  pathsLinkedFrom,
  PAGE_NAMES,
  type CrossPageLink,
  type Mention,
} from "./naming"
import { SERVED_STATE_COUNT, servedPages, sweepCover, sweepShare, type ServedPage } from "./served"
import { PAGES_AT_LEAST, PRODUCT_SURFACES, SITE_PATHS, SITE_ROUTES } from "./site"
import { readerCopy } from "./words"

/**
 * What this site says about its own pages, held to what is on them.
 *
 * The module's own docblock has the failure and the three rules. What this file
 * adds is the sweep: every rule runs over **every page in every state it can be
 * served in**, because a sentence that is correct on arrival and a link that is
 * correct on arrival are not the same thing as a site that is correct. The
 * mechanism page rewrites itself eleven ways and the footer's disclosure
 * changes with the deployment.
 *
 * It is the fourth file in this route group to be written against `served.ts`
 * rather than against a page builder, for the reason that module records: a
 * rule that reads the tree a builder returns is reading the input to the thing
 * a visitor gets.
 */

const ORIGIN = "https://loom.example"

/** A mention, and the band and state it was found in, so a failure can be read. */
type Found = {
  readonly where: string
  readonly mention: Mention
  /** The addresses the band it is in offers, which is what makes it stranded or not. */
  readonly linked: ReadonlySet<string>
}

/**
 * Every page this site names from a band of one served state, with the way out
 * of that band beside it.
 *
 * A function rather than the loop it was, because the rule and the two floors
 * under it ask the same question of a page and had to agree about the answer:
 * the floors are now *per state* (`sweepShare`), so they count what this
 * returns for one page while the rule reads it for all of them. Written twice,
 * the two readings would eventually be two different sweeps with one floor
 * between them.
 */
const mentionsOn = (page: ServedPage): readonly Found[] =>
  page.tree.root.children.flatMap((band) => {
    if (band.kind !== "element") return []

    const linked = pathsLinkedFrom(band, ORIGIN)
    const where = `${page.route.path} (${page.state}) ${band.type}`

    return mentionsIn(readerCopy(band)).map((mention) => ({ where, mention, linked }))
  })

/** Every link one served state makes into another page of this site, at an anchor. */
const linksOn = (page: ServedPage): readonly CrossPageLink[] =>
  crossPageFragmentsIn(page.tree.root, page.route.path, ORIGIN, SITE_PATHS)

describe("the pages this site names", () => {
  let pages: readonly ServedPage[] = []

  beforeAll(async () => {
    pages = await servedPages()
  })

  /**
   * **The sweep had nothing independent holding it until 22 October.** This
   * assertion was one line against `SERVED_STATE_COUNT`, which is a value
   * computed by the module under test: a `servedPages` that came back with
   * nothing, because `SITE_ROUTES` or `ASK_STATES` had gone empty, would have
   * been compared against the zero that same arithmetic produces and every rule
   * in this file would have swept an empty list and passed.
   *
   * So the sweep is also held to reaching every page of this site, and to there
   * being at least `PAGES_AT_LEAST` of them — the hand-written number, which
   * moves when a page is added or retired and never when the sweep is crossed
   * with one dimension more or less. The walk is `sweepCover` as of
   * 23 October, which is where the measurement of what the one-line version
   * let through is written down.
   */
  it("sweeps every page of this site, in every state it can be served in", () => {
    const cover = sweepCover(pages)

    expect(cover).toEqual({ states: SERVED_STATE_COUNT, routes: SITE_PATHS })
    expect(cover.routes.length).toBeGreaterThanOrEqual(PAGES_AT_LEAST)
  })

  /**
   * The list is the vocabulary, so a page added to the product has to be given
   * one before anything can check what is said about it.
   *
   * An entry may have no phrases — the portal has none and the module says why
   * — but it may not be absent, because absent is indistinguishable from
   * forgotten.
   */
  it("knows every page of this product, including the ones it never names", () => {
    const destinations = [...SITE_ROUTES, ...PRODUCT_SURFACES].map((place) => place.path)

    expect([...PAGE_NAMES.map((page) => page.path)].sort()).toEqual([...destinations].sort())
  })

  /**
   * The rule that fires when a page is retired out from under a sentence.
   *
   * It reads the shape rather than the list, which is the whole point: a
   * sentence still naming *the Rules page* a week after that page was folded
   * into another one is a sentence whose name is **not** in the list any more,
   * so a check driven off the list would pass it.
   */
  it("names no page it does not have", () => {
    const unknown: string[] = []

    for (const page of pages) {
      for (const { field, text } of readerCopy(page.tree.root)) {
        for (const named of namedPagesIn(text)) {
          if (pathNamed(named) === undefined) {
            unknown.push(`${page.route.path} (${page.state}) ${field}: "the ${named} page"`)
          }
        }
      }
    }

    expect(unknown).toEqual([])
  })

  /**
   * The half of the rule that is about the reader rather than about us.
   *
   * Asked of the **band** rather than of the page, and that is the assertion
   * doing the work. Every page of this site carries a footer that links to
   * every other page of it, so a rule asked of the page would be satisfied by
   * the footer and would hold nothing at all. A reader who has just been told
   * that something is somewhere else wants the way there from where they are
   * standing, not from the bottom of the page.
   */
  it("offers the way to every page it names, from the band that names it", () => {
    const stranded: string[] = []

    for (const page of pages) {
      for (const found of mentionsOn(page)) {
        if (!found.linked.has(found.mention.names)) {
          stranded.push(
            `${found.where} names ${found.mention.names} as "${found.mention.phrase}": ${found.mention.text}`
          )
        }
      }
    }

    expect(stranded).toEqual([])

    /**
     * A sweep that found nothing passes everything, so it says how much it
     * read — **per served state, and never as a total**.
     *
     * Both floors here were totals until 22 October and both were wrong in the
     * way `sweepShare` describes. They were `600` and `80` against a
     * measurement of 798 and 126, and on 21 October the deployment stopped
     * being a dimension of `servedPages`: every mention on this site had been
     * read twice, the readings halved to 550 and 75 for a change that touched
     * no copy, the first floor failed and the second would have been next.
     * Re-measuring them by hand is a fix that lasts until the sweep changes
     * shape again.
     *
     * **7.3 mentions a state and 1.0 of them inside a sentence, measured over
     * the 75 served states on 22 October.** The floors are well under those,
     * because a band removed by one of the five choices is allowed to take a
     * mention with it and so is an ordinary copy edit.
     *
     * `quiet` is enforced on the first and not the second, and the difference
     * is real rather than caution: every state of every page names another page
     * somewhere — six in the thinnest of them — while a mention *inside a
     * sentence* is sparse enough that the front door has states with none. A
     * rule has to be true of the site before it is worth having.
     */
    const named = sweepShare(pages, (page) => mentionsOn(page).length)
    const inASentence = sweepShare(
      pages,
      (page) => mentionsOn(page).filter(({ mention }) => mention.inASentence).length
    )

    expect(named.quiet).toEqual([])
    expect(named.each).toBeGreaterThanOrEqual(3)
    expect(inASentence.each).toBeGreaterThanOrEqual(0.5)
  })

  /**
   * The gap `anchors.test.ts` names and leaves, closed in the one direction
   * that is this lane's to close.
   *
   * That file holds a fragment on `/how-it-works` pointing at `/how-it-works`,
   * and says in its own comment that a fragment on another surface's address is
   * that surface's promise. Between the two sits this site pointing into
   * itself: the footer of every page offers *what this deployment counts*,
   * which is a band on `/what-you-run`, and the paragraph on `/what-you-run`
   * about the ready-made changes now offers the band on `/how-it-works` that
   * has them. Neither had anything holding it.
   *
   * The target is checked in **every state it can be served in**, because the
   * page doing the pointing has no idea which one the reader will arrive at.
   */
  it("lands every link it makes into another of its own pages", () => {
    const anchorsByState = new Map<string, readonly (readonly string[])[]>()

    for (const page of pages) {
      anchorsByState.set(page.route.path, [
        ...(anchorsByState.get(page.route.path) ?? []),
        anchorsIn(page.tree.root),
      ])
    }

    const broken: string[] = []

    for (const page of pages) {
      for (const link of linksOn(page)) {
        const states = anchorsByState.get(link.to) ?? []
        const missing = states.filter((declared) => !declared.includes(link.fragment)).length

        if (missing > 0) {
          broken.push(
            `${page.route.path} (${page.state}) points at ${link.to}#${link.fragment}, which ${missing} of its ${states.length} states do not declare`
          )
        }
      }
    }

    expect(broken).toEqual([])
    /**
     * The third total floor in this file, and the third one whose number was a
     * fact about how many states the sweep happened to have.
     *
     * It was `40` against a reading of 84 — *two links, each in the 42 states
     * of the page it is on* — and both halves of that sentence halved on
     * 21 October, to 50 over 75 states. It did not fail then and it is the next
     * one that would: halving `ASK_STATES` again takes the reading to 26, which
     * is what the mutation run for this change measured.
     *
     * **0.67 links a state on 22 October**, which is two states in three. No
     * `quiet` here: only two pages of the three make such a link, so a third of
     * the states correctly carry none.
     */
    expect(sweepShare(pages, (page) => linksOn(page).length).each).toBeGreaterThanOrEqual(0.3)
  })

  /**
   * The paragraph the module was written for, named here rather than left to
   * the sweep.
   *
   * A sweep says *nothing is wrong*. It does not say *this sentence is the
   * reason*, and the next run to read this file should be able to see what the
   * rules are about without reconstructing it from a failure that is not
   * happening.
   */
  it("sends a reader who is told about the ready-made changes to them", () => {
    const sentences = pages
      .filter((page) => page.route.path === "/what-you-run")
      .flatMap((page) =>
        page.tree.root.children.flatMap((band) => {
          if (band.kind !== "element") return []

          const says = mentionsIn(readerCopy(band)).filter(
            (mention) => mention.inASentence && mention.names === "/how-it-works"
          )

          return says.length === 0
            ? []
            : [{ band: band.props["eyebrow"], fragments: crossPageFragmentsIn(band, page.route.path, ORIGIN, SITE_PATHS) }]
        })
      )

    expect(sentences.length).toBeGreaterThan(0)

    for (const { band, fragments } of sentences) {
      expect({ band, into: fragments.map((link) => `${link.to}#${link.fragment}`) }).toEqual({
        band: "What leaves your server",
        into: ["/how-it-works#see-it-happen"],
      })
    }
  })
})
