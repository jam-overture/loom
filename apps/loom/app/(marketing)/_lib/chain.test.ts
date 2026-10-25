import type { ElementNode } from "@jam-overture/loom"
import { describe, expect, it } from "vitest"

import { BAND } from "./bands"
import { CHAIN, CHAIN_LINKS, rendersLinkVerbatim } from "./chain"
import { MAINTAINERS_OWN } from "./copy"
import { treeFor } from "./render"
import { DEFAULT_THEME, HOME } from "./site"

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

describe("the chain on the front door", () => {
  const rungs = rungsOf(bandOf(BAND.chain))

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
