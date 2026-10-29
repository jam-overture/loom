import { sequentialIdFactory } from "@jam-overture/loom"
import { describe, expect, it } from "vitest"

import { BAND } from "./bands"
import { COST_CLAIMS, costs } from "./costs"
import { elementsIn } from "./measure"
import { treeFor } from "./render"
import { HOME, SITE_ROUTES } from "./site"
import { readerCopy } from "./words"

/**
 * The one band on this site that says what Loom costs.
 *
 * Every other band here is this lane's reading of a subject this lane is
 * allowed to have a reading of. This one is not: positioning and pricing are
 * the maintainer's, `voice.test.ts` has held the site silent about money since
 * 27 September, and the only reason this band exists is that he answered the
 * question on 24 October. `costs.ts` quotes him and `docs/positioning.md` has
 * the conversation.
 *
 * So the rules below are about **staying inside the permission** rather than
 * about the band rendering. A run that reads this file should come away
 * knowing it may not add to this band without a new answer from him.
 */

const band = costs(sequentialIdFactory("costs"))
const copyIn = (node: Parameters<typeof readerCopy>[0]): string =>
  readerCopy(node)
    .map(({ text }) => text)
    .join(" ")

describe("the band that says what Loom costs", () => {
  /**
   * **Two claims, because two is what was authorised.**
   *
   * `docs/positioning.md` grants exactly *the framework is free* and *the
   * portal is paid*, and says in the same breath that anything past them "is
   * not settled and is not this lane's to invent". A third card is the cheapest
   * possible way to invent one, so the number is a rule rather than a fact
   * about today's copy.
   */
  it("makes two claims and no more", () => {
    expect(COST_CLAIMS).toHaveLength(2)
  })

  /**
   * The copy is the data, so the test above is a bound on the band and not
   * only on the array. A card typed straight into the tree would slip past
   * `toHaveLength`, which is the obvious way for a later run to add a third
   * thing without noticing it had.
   */
  it("renders every claim it holds and nothing it does not", () => {
    const features = elementsIn(band).filter((element) => element.type === "loom.feature")

    expect(features.map((feature) => feature.props["title"])).toEqual(
      COST_CLAIMS.map(({ what }) => what)
    )
    expect(features.map((feature) => feature.props["body"])).toEqual(
      COST_CLAIMS.map(({ body }) => body)
    )
  })

  /**
   * **It names no amount, which is the half of the instruction of
   * 27 September that his answer of 24 October did not lift.**
   *
   * `voice.test.ts` sweeps every page for this and would catch it there too.
   * It is asserted here as well because this is the band where somebody will
   * one day be tempted: the failure arrives beside the copy, naming the band,
   * rather than as a route-level sweep whose message does not say which of
   * eleven bands wrote the number.
   */
  it("puts no number on either of them", () => {
    expect(copyIn(band)).not.toMatch(/[$£€]\s?\d|\d+\s?(usd|eur|gbp)\b|\bper (seat|user|month)\b/i)
  })

  /**
   * Both halves said, and said on the page rather than only in the array.
   *
   * The reason to check the rendered band for these two words is that the
   * claim is the pair. A band that said the framework is free and stopped
   * would be a more flattering page and a less honest one, and it is exactly
   * what a later run trimming for the word budget would produce.
   */
  it("says both halves: that one is free and that the other is paid for", () => {
    const words = copyIn(band).toLowerCase()

    expect(words).toContain("free")
    expect(words).toMatch(/\bpay\b/)
  })
})

describe("the front door", () => {
  it("carries the band, under the band that asks for an install", () => {
    const bands = treeFor(HOME, { theme: "minimal" }).root.children.filter(
      (node) => node.kind === "element"
    )
    const eyebrows = bands.map((node) =>
      node.kind === "element" ? node.props["eyebrow"] : undefined
    )

    expect(eyebrows).toContain(BAND.costs)
    expect(eyebrows.indexOf(BAND.costs)).toBe(eyebrows.indexOf(BAND.install) + 1)
  })

  /**
   * **And it is the only page that says it**, which is the shape of the
   * permission rather than a layout preference. He wrote *"The front door may
   * say both"*; he did not say the site may. A second page repeating it is a
   * claim made twice by a lane that was allowed to make it once, and the
   * duplicate is how a sentence drifts into a different sentence.
   */
  it.each(SITE_ROUTES.filter((route) => route.path !== HOME.path))(
    "$path leaves the subject to the front door",
    (route) => {
      expect(copyIn(treeFor(route, { theme: "minimal" }).root)).not.toContain(BAND.costs)
    }
  )
})
