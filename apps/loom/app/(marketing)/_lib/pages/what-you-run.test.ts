import { measurePrompt, sequentialIdFactory, type PromptMeasurement } from "@loom/runtime"
import { describe, expect, it } from "vitest"

import { RESERVED_VOCABULARY } from "../copy"
import { treeFor } from "../render"
import {
  DEFAULT_THEME,
  HOME,
  internalHref,
  SITE_ROUTES,
  SITE_THEME_NAMES,
  WHAT_YOU_RUN,
  YOUR_COMPONENTS,
} from "../site"
import { uses, wordsOf } from "../words"

import { PLACES, partsOf, WHAT_LEAVES } from "./what-you-run"

/**
 * The page that says what the thing on a reader's own machine would be.
 *
 * Everything is asserted against the **built page**, never against the module
 * that builds it. A test that read the measurement and compared it with itself
 * would pass however the band was assembled, and passing however the band was
 * assembled is what let seven typed step counts survive sixteen runs of this
 * site. `WHAT_LEAVES` and `PLACES` say only what the page is *supposed* to be
 * printing; the assertion always goes looking for it in the tree.
 */

const ORIGIN = "https://loom.example"

const context = { origin: ORIGIN, theme: DEFAULT_THEME }

const words = (): string => wordsOf(treeFor(WHAT_YOU_RUN, context).root)

describe("the page about what you would be running", () => {
  it("is a page of this site with a builder and a place in the map", () => {
    expect(SITE_ROUTES).toContain(WHAT_YOU_RUN)
    expect(() => treeFor(WHAT_YOU_RUN, context)).not.toThrow()
  })

  /**
   * The shape of the answer, in the order a reader needs it: it is yours, it is
   * a package, and the one outside thing is a model you picked.
   */
  it("says what the thing is, not only what it does", () => {
    const text = words().toLowerCase()

    expect(text).toContain("an application you already have and already host")
    expect(text).toContain("a package you add to it")
    expect(text).toContain("nothing is in the middle")
  })

  /**
   * The boundary with `Loom docs`, agreed in the finding of 10 September and
   * asserted here so it cannot erode a sentence at a time.
   *
   * `/docs` owns *how to install it* — the commands, the code, the API. This
   * page owns *what the shape is*, which is what somebody asks before they are
   * willing to read an installation guide. So it may say that installing is the
   * next step and hand the reader over; it may not start doing it.
   */
  it("hands installation to the documentation rather than starting it", () => {
    const text = words()

    expect(text.toLowerCase()).toContain("how to install it")
    expect(text).not.toMatch(/npm |pnpm |yarn |import \{|npx /)
  })

  /**
   * The register, strictly, on the front door's terms rather than the mechanism
   * page's: this reader has no more context than one who has just arrived.
   */
  it.each(RESERVED_VOCABULARY)("never says %s to a reader who has just arrived", (term) => {
    expect(uses(words(), term)).toBe(false)
  })

  it("keeps the reader in the sentence", () => {
    const text = words().toLowerCase()

    expect(text).toContain("your own application")
    expect(text).toContain("your rules")
  })
})

/**
 * The comparison, which is the page's claim in one glance.
 *
 * The rows are asserted for what they say rather than for how many there are: a
 * count would pass whatever the rows had become, and what matters is that the
 * two uncomfortable answers are still on it.
 */
describe("where everything ends up", () => {
  it("offers the three places as columns", () => {
    for (const place of PLACES) {
      expect(words()).toContain(place)
    }
  })

  /**
   * The honest row, and the reason the band can be believed at all.
   *
   * A page claiming *nothing of yours goes anywhere* while quietly omitting that
   * the page itself goes would be worth less than no band, because a reader who
   * found out later would be right to assume the rest was shaded too. If
   * somebody ever softens this row, this is where it fails.
   */
  it("admits that the page and the words on it are sent", () => {
    expect(words()).toContain("The pages themselves, and the words on them")
  })

  it("says the rules are weighed here and never sent", () => {
    expect(words()).toContain("Weighed after the answer comes back, never sent with the question.")
  })
})

/**
 * The measured band, held to the runtime rather than to a copy of it.
 *
 * The band's whole claim is *these are the real numbers*, and the way that would
 * stop being true is somebody pasting today's values in to make a test pass. So
 * the assertion runs the other way round: the page must contain what
 * `measurePrompt` says **now**, whatever that turns out to be.
 */
describe("what leaves, measured", () => {
  it("prints the number the runtime reports for every part, and the total", () => {
    const measurement = WHAT_LEAVES.measure(context)
    const text = words()
    const format = new Intl.NumberFormat("en-US")

    for (const part of partsOf(measurement)) {
      expect(text).toContain(part.what)
      expect(text).toContain(format.format(part.characters))
    }

    expect(text).toContain(format.format(measurement.total))
  })

  /**
   * The measurement is of the request that would really be sent, not of a
   * fixture kept beside the page. Taken here independently, through the same
   * public function a host would call, and required to agree.
   */
  it("is the measurement of this site's own front door", () => {
    const measurement = WHAT_LEAVES.measure(context)
    const parts = partsOf(measurement)

    expect(parts.every((part) => part.characters > 0)).toBe(true)
    expect(parts.reduce((sum, part) => sum + part.characters, 0)).toBe(measurement.total)
  })

  /**
   * The guard that makes the band unable to go quietly stale.
   *
   * A sixth thing arriving in the request is the exact failure this lane has
   * found seven runs running — a fact the code holds and the page cannot reach —
   * and the only reliable answer to it is a page that refuses to build. Asserted
   * in both directions: a part nobody has written a sentence for is something
   * leaving a reader's server that the page does not mention, and a sentence for
   * a part no longer sent is the page describing something that stopped
   * happening.
   */
  it("refuses to build a band that does not name everything sent", () => {
    const measurement = WHAT_LEAVES.measure(context)

    expect(() => partsOf({ ...measurement, surprise: 12 } as unknown as PromptMeasurement)).toThrow(
      /unnamed: surprise/
    )
  })

  it("refuses to build a band naming something that is not sent", () => {
    const { themes: _dropped, ...without } = WHAT_LEAVES.measure(context)

    expect(() => partsOf(without as PromptMeasurement)).toThrow(/named but not sent: themes/)
  })

  /**
   * The ask the band is about has to exist, and naming a missing one has to be
   * loud. `measurePrompt` would happily measure any sentence, so the failure
   * this guards against is the band silently becoming about a request the site
   * does not offer.
   */
  it("measures a request this site actually offers", () => {
    expect(WHAT_LEAVES.ask).toBe("problem")
    expect(() => WHAT_LEAVES.parts(context)).not.toThrow()
  })

  /**
   * **The defect the existing suite caught before anybody looked at the page.**
   *
   * The obvious way to write the measurement is to pass the reader's palette
   * through to the front door it measures. That is wrong: a page's root carries
   * what it is wearing, so the request describing it is a few characters longer
   * in one palette than another — and a number below the root that moves when
   * the palette moves is what 0049 says cannot happen. `pages.test.ts` fails on
   * all three pairs when it is written that way; this says the same thing about
   * the number itself, where a reader of this file will see it.
   */
  it("prints the same numbers in every palette", () => {
    const printed = SITE_THEME_NAMES.map((theme) =>
      wordsOf(treeFor(WHAT_YOU_RUN, { origin: ORIGIN, theme }).root).match(/[\d,]{3,}/g)
    )

    for (const set of printed) {
      expect(set).toEqual(printed[0])
    }
  })

  /**
   * And the measurement really is a function of the site rather than a constant:
   * measuring a different request gives a different answer, so the assertions
   * above are checking something that can move.
   */
  it("would report a different number for a different request", () => {
    const front = treeFor(HOME, context)
    const longer = measurePrompt(
      {
        intentId: sequentialIdFactory("probe").intentId(),
        treeId: front.treeId,
        baseRevision: front.revision,
        origin: "user-instruction",
        actor: "a visitor",
        utterance: "a much longer sentence than the one the band is measured on, deliberately so",
        observedAt: "2026-09-11T00:00:00.000Z",
      },
      front
    )

    expect(longer.request).not.toBe(WHAT_LEAVES.measure(context).request)
  })
})

/**
 * The band this page was filed against, on the page that raised it.
 *
 * The front door answers *is this a page builder* with "nothing you have to host
 * with us" and *do I need an account* with "Loom runs inside your own
 * application". Both asserted the fact and neither explained it, which is the
 * shape this lane has now found eight runs running. The fix is not to change
 * either answer — they were right — but to stop leaving the reader to take them
 * on trust.
 */
describe("the front door, which asserted this twice and never showed it", () => {
  const front = (): string => wordsOf(treeFor(HOME, context).root)

  it("still makes both claims", () => {
    expect(front()).toContain("nothing you have to host with us")
    expect(front()).toContain("Loom runs inside your own application")
  })

  /**
   * The offer is in the facts band rather than under the answers themselves, and
   * that is deliberate rather than convenient: *Take the questions off the page*
   * is one of this site's five requests, and one more row in the band it removes
   * moved the verdict from landed to held. `home.ts` carries the reasoning.
   */
  it("now offers the page that backs them", () => {
    expect(front()).toContain("What you would be running")
  })
})

/**
 * Off the bar, and the guarantee that goes with it: what the bar leaves out, the
 * footer's map carries. `chrome.test.ts` holds the second half for every route;
 * this holds the decision itself, so that it is a decision rather than a drift.
 */
describe("its place in the navigation", () => {
  /**
   * Widened on 12 September, not relaxed: `HOME` came off the bar so that a
   * seventh page could go on it without taking the count past the eight items
   * #166 asked about. The list is still exact, so a fourth page leaving the bar
   * still fails here and still has to be argued for.
   */
  it("is off the bar deliberately, with two other pages", () => {
    expect(WHAT_YOU_RUN.inMenu).toBe(false)
    expect(SITE_ROUTES.filter((route) => !route.inMenu)).toEqual([
      HOME,
      WHAT_YOU_RUN,
      YOUR_COMPONENTS,
    ])
  })

  it("is reachable from the front door without the footer", () => {
    const linked = wordsOf(treeFor(HOME, context).root)

    expect(linked).toContain("What you would be running")
    expect(internalHref(ORIGIN, WHAT_YOU_RUN.path, DEFAULT_THEME)).toContain(WHAT_YOU_RUN.path)
  })
})
