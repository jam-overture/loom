import { beforeAll, describe, expect, it } from "vitest"

import {
  anchorsIn,
  crossPageFragmentsIn,
  mentionsIn,
  namedPagesIn,
  pathNamed,
  pathsLinkedFrom,
  PAGE_NAMES,
  type Mention,
} from "./naming"
import { SERVED_STATE_COUNT, servedPages, type ServedPage } from "./served"
import { PRODUCT_SURFACES, SITE_ROUTES } from "./site"
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

const ROUTE_PATHS: readonly string[] = SITE_ROUTES.map((route) => route.path)

/** A mention, and the band and state it was found in, so a failure can be read. */
type Found = {
  readonly where: string
  readonly mention: Mention
}

describe("the pages this site names", () => {
  let pages: readonly ServedPage[] = []

  beforeAll(async () => {
    pages = await servedPages()
  })

  it("sweeps every state the site can be served in", () => {
    expect(pages).toHaveLength(SERVED_STATE_COUNT)
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
    const found: Found[] = []

    for (const page of pages) {
      for (const band of page.tree.root.children) {
        if (band.kind !== "element") continue

        const linked = pathsLinkedFrom(band, ORIGIN)

        for (const mention of mentionsIn(readerCopy(band))) {
          const where = `${page.route.path} (${page.state}) ${band.type}`

          found.push({ where, mention })

          if (!linked.has(mention.names)) {
            stranded.push(`${where} names ${mention.names} as "${mention.phrase}": ${mention.text}`)
          }
        }
      }
    }

    expect(stranded).toEqual([])
    /**
     * A sweep that found nothing passes everything, so it says how much it
     * read. 798 mentions and 126 of them inside a sentence, measured over the
     * 126 served states the day this was written; the floors are well under
     * those, because a band removed by one of the five choices is allowed to
     * take a mention with it and so is an ordinary copy edit. They are here to
     * catch a sweep that read nothing, which is the failure that passes.
     */
    expect(found.length).toBeGreaterThanOrEqual(600)
    expect(found.filter(({ mention }) => mention.inASentence).length).toBeGreaterThanOrEqual(80)
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
    let checked = 0

    for (const page of pages) {
      for (const link of crossPageFragmentsIn(page.tree.root, page.route.path, ORIGIN, ROUTE_PATHS)) {
        checked += 1

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
     * 84 the day this was written: two links, each in the 42 states of the
     * page it is on. The floor is the 42 that were already live and unheld,
     * because it is here to catch a sweep that read nothing rather than to
     * count the links.
     */
    expect(checked).toBeGreaterThanOrEqual(40)
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
            : [{ band: band.props["eyebrow"], fragments: crossPageFragmentsIn(band, page.route.path, ORIGIN, ROUTE_PATHS) }]
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
