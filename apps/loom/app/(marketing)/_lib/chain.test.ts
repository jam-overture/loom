import type { ElementNode } from "@jam-overture/loom"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { BAND } from "./bands"
import { type ChainLink, CHAIN, CHAIN_LINKS, rendersLinkVerbatim, shownAt } from "./chain"
import { MAINTAINERS_OWN } from "./copy"
import { pageTreeFor, renderTree, treeFor } from "./render"
import { servedBy } from "./routes"
import { DEFAULT_THEME, HOME, SITE_ROUTES } from "./site"

/** Any host: these assertions are about paths and fragments, never about an origin. */
const ORIGIN = "https://loom.example"

/**
 * The chain, held against the page rather than against itself.
 *
 * `docs/positioning.md` carries the maintainer's own chain of 24 October and
 * calls it the message. What a test can hold is the part a reader cannot check
 * and a run can quietly lose: that the band on the front door still has **one
 * rung per link, in his order**, and that the one link published in his words
 * still is.
 *
 * It reads the built tree and not `chain.ts`, for the reason `journey.test.ts`
 * gives at length: a test that compares a list to itself passes however the
 * page was built, and six typed literals passed that way for sixteen runs on
 * this site.
 */

const bandOf = (eyebrow: string): ElementNode => {
  const band = treeFor(HOME, { theme: DEFAULT_THEME }).root.children.find(
    (child): child is ElementNode => child.kind === "element" && child.props["eyebrow"] === eyebrow
  )

  if (band === undefined) throw new Error(`loom: the front door has no ${eyebrow} band`)

  return band
}

const rungsOf = (band: ElementNode): readonly ElementNode[] => {
  const list = band.children.find(
    (child): child is ElementNode => child.kind === "element" && child.type === "loom.milestone-list"
  )

  return (list?.children ?? []).filter(
    (child): child is ElementNode => child.kind === "element" && child.type === "loom.milestone"
  )
}

/** The rungs as the page builds them, read once and asserted against in two places. */
const rungs = rungsOf(bandOf(BAND.chain))

describe("the chain on the front door", () => {
  it("has one rung for each link the maintainer wrote, in his order", () => {
    expect(rungs.map((rung) => rung.props["title"])).toEqual(CHAIN.map(({ title }) => title))
    expect(CHAIN).toHaveLength(CHAIN_LINKS.length)
  })

  /**
   * The chain is not a count and no sentence on this site says how long it is.
   * `journey.ts` has the whole of why: this page says *Four steps* two bands
   * down and `/how-it-works` says five, and a third number on the first screen
   * is how a visitor learns that this site cannot count the thing it offers to
   * count for them. So the marker column carries the actor instead.
   */
  it("numbers nothing, and names who does each one", () => {
    for (const [index, rung] of rungs.entries()) {
      const actor = CHAIN[index]?.actor

      expect(rung.props["marker"]).toBe(actor)
      expect(String(actor)).not.toMatch(/^\d+$/)
    }
  })

  /** And the shape of it: the reader's own work stops, and the page's starts. */
  it("puts the reader's own work at the top of it", () => {
    const [first, second, third] = CHAIN as readonly { readonly actor: string }[]

    expect([first?.actor, second?.actor]).toEqual(["You", "You"])
    expect(third?.actor).not.toBe("You")
  })

  it("says every rung in words a stranger has, and never in ours", () => {
    for (const { title, body } of CHAIN) {
      expect(title.length).toBeGreaterThan(0)
      expect(body.length).toBeGreaterThan(0)
      expect(`${title} ${body}`).not.toMatch(/primitive|registry|runtime|schema|delta/i)
    }
  })

  /**
   * His wording is provenance rather than copy, and two of the six could not be
   * published as he wrote them: one uses a word this site keeps off itself, and
   * one is a note to himself. The exception is the outcome claim, which is his
   * to make and nobody else's.
   */
  it("publishes exactly one link in his own words, and it is the outcome", () => {
    const verbatim = CHAIN.filter(rendersLinkVerbatim)

    expect(verbatim.map(({ link }) => link)).toEqual(["Greater user engagement and conversion"])
    expect(MAINTAINERS_OWN).toContain("Greater user engagement and conversion")
  })

  it("keeps the rest of his wording off the page", () => {
    const words = JSON.stringify(treeFor(HOME, { theme: DEFAULT_THEME }).root)

    for (const { link } of CHAIN.filter((rung) => !rendersLinkVerbatim(rung))) {
      expect(words).not.toContain(link)
    }
  })

  /**
   * It is the first band under the opening, which is the whole of what changed
   * on 25 October. The governance bands are all still on this page and all of
   * them are below it.
   */
  it("is the first thing a visitor meets after the headline", () => {
    /**
     * The opening band carries an eyebrow of its own and is a `loom.hero`
     * rather than a `loom.section`, so the bands are read by type. The header
     * and the hero are what come before the first section, and nothing else
     * may.
     */
    const sections = treeFor(HOME, { theme: DEFAULT_THEME })
      .root.children.filter(
        (child): child is ElementNode => child.kind === "element" && child.type === "loom.section"
      )
      .map((band) => band.props["eyebrow"])

    expect(sections[0]).toBe(BAND.chain)

    /** And the governance bands are all still here, below it. */
    const governance = [BAND.whatIsIt, BAND.problems]

    for (const band of governance) {
      expect(sections.indexOf(band)).toBeGreaterThan(sections.indexOf(BAND.chain))
    }
  })
})

/** And the band is reachable at all: a page that lost it would fail above. */
describe("the band that carries it", () => {
  it("is a section of the front door with a heading of its own", () => {
    const band = bandOf(BAND.chain)
    const heading = band.children.find((child) => child.kind === "slot" && child.name === "heading")

    expect(heading).toBeDefined()
    expect(rungsOf(band).length).toBeGreaterThanOrEqual(6)
  })
})

/**
 * **The chain is the map, and this is the half a press depends on.**
 *
 * As of 30 October each rung carries the band of this site where a visitor can
 * watch that link being true. Everything about that is checkable and none of
 * it is visible: an href pointing at a band that was renamed is a control that
 * silently does nothing, on a page that renders perfectly and a build that is
 * green. `anchors.test.ts` holds that promise for links within one page and
 * `reaching.test.ts` holds it for the one cross-page link the front door had.
 * This is the same promise, made five more times, read the same way — off the
 * markup a browser receives rather than off the tree that built it.
 *
 * The destinations are three different pages, so each one is rendered once and
 * the anchors are looked for in what came out.
 */
describe("every rung is the way to the band that shows it", () => {
  const linked = CHAIN.filter((rung) => rung.shown !== undefined)

  it("points five of the six somewhere, and leaves the outcome alone", () => {
    expect(linked).toHaveLength(CHAIN.length - 1)

    /**
     * And the unlinked one is the **last**, which is the property that makes
     * the band's shape true rather than accidental. The work stops at the
     * second rung, the showing stops at the fifth, and what is left is the
     * reason for the other five. A rung in the middle with nowhere to go would
     * read as an oversight, and would be one.
     */
    expect(CHAIN.findIndex((rung) => rung.shown === undefined)).toBe(CHAIN.length - 1)
  })

  it("renders the destination on the rung a reader presses", () => {
    for (const [index, rung] of rungs.entries()) {
      expect(rung.props["href"]).toBe(shownAt(CHAIN[index] as ChainLink))
    }
  })

  /**
   * An address this application does not serve is a 404 with a fragment on the
   * end of it. `routes.ts` reads the application's own directory tree, so this
   * goes red on the branch that moves a page rather than on a visitor.
   */
  it("sends nobody to an address this application does not serve", () => {
    for (const { shown } of linked) {
      expect(servedBy(shown?.path ?? "")).toBeDefined()
    }
  })

  /** And never back to the page the reader is already standing on. */
  it("sends nobody to the front door", () => {
    for (const { shown } of linked) {
      expect(shown?.path).not.toBe(HOME.path)
    }
  })

  /**
   * The one that cannot be read off the tree: the band at the other end still
   * declares the `id` the press is aimed at.
   */
  it.each([...new Set(linked.map(({ shown }) => shown?.path))])(
    "lands on a band of %s rather than on the page",
    async (path) => {
      const route = SITE_ROUTES.find((candidate) => candidate.path === path)

      if (route === undefined) throw new Error(`loom: the chain points at ${path}, which is not a page of this site`)

      const markup = renderToStaticMarkup(
        renderTree(await pageTreeFor(route, { theme: DEFAULT_THEME }), { origin: ORIGIN }).element
      )

      for (const { shown } of linked.filter((rung) => rung.shown?.path === path)) {
        expect(markup).toContain(`id="${shown?.anchor}"`)
      }
    }
  )

  /**
   * The front door does not grow a copy of a band it points at, which is
   * `reaching.test.ts`' limit applied to the other four destinations: a later
   * run reading *the chain should reach these* as *the front door should have
   * them* would be this lane moving bands their pages own.
   */
  it("declares none of those anchors itself", () => {
    const markup = renderToStaticMarkup(
      renderTree(treeFor(HOME, { theme: DEFAULT_THEME }), { origin: ORIGIN }).element
    )

    for (const { shown } of linked) {
      expect(markup).not.toContain(`id="${shown?.anchor}"`)
    }
  })
})

/**
 * **The line that stands in for an affordance the library cannot draw.**
 *
 * A linked `loom.milestone` is pixel-identical to an unlinked one until a
 * pointer touches it, and on a phone nothing ever does. Until that is answered
 * in `src/primitives/` the band says in words what it cannot say in paint, and
 * these hold the sentence to the two things that make it safe: it is there
 * while the links are, and it promises nothing this band cannot keep.
 */
describe("the line telling a reader the rungs can be pressed", () => {
  /** `prose` puts its words in a text child, so the band is read the way a reader meets it. */
  const hint = bandOf(BAND.chain)
    .children.filter((child): child is ElementNode => child.kind === "element")
    .flatMap((child) => child.children)
    .flatMap((child) => (child.kind === "text" ? [child.value] : []))
    .find((text) => text.startsWith("Press"))

  it("is on the band for as long as a rung carries a link", () => {
    expect(CHAIN.some((rung) => rung.shown !== undefined)).toBe(true)
    expect(hint).toBeDefined()
  })

  /**
   * *A step* and never *any* or *every*. The last rung has nowhere to go, so a
   * universal is a promise the band breaks the one time a reader tests it.
   */
  it("promises a step rather than all of them", () => {
    expect(hint).not.toMatch(/\b(any|every|each|all)\b/i)
  })

  /**
   * And it says no number. `chain.ts` has the whole of why at length: this page
   * says *Four steps* further down and `/how-it-works` says five, and a third
   * count on the first screen teaches a visitor that this site cannot count the
   * thing it is offering to count for them.
   */
  it("says no number, like everything else about this band", () => {
    expect(hint).not.toMatch(/\d|\b(one|two|three|four|five|six)\b/i)
  })
})
