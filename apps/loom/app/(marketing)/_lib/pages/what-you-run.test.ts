import {
  buildUserMessage,
  frameCatalogue,
  measurePrompt,
  sequentialIdFactory,
  type FrameOriginRegistry,
  type PromptMeasurement,
} from "@loom/runtime"
import { describe, expect, it } from "vitest"

import { RESERVED_VOCABULARY } from "../copy"
import { OWN_ORIGIN_DESCRIPTION, siteFrameOrigins } from "../frames"
import { treeFor } from "../render"
import {
  DEFAULT_THEME,
  HOME,
  PUTTING_IT_BACK,
  internalHref,
  SITE_ROUTES,
  WHAT_READERS_DO,
  SITE_THEME_NAMES,
  WHAT_YOU_RUN,
  WHO_CAN_ASK,
  YOUR_COMPONENTS,
} from "../site"
import { uses, wordsOf } from "../words"

import { bandsAgree, PLACES, partsOf, sentCriteria, WHAT_LEAVES } from "./what-you-run"

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

  /**
   * The line 0172 drew, held here so it is a decision rather than a side effect.
   *
   * Three of the eight parts the runtime reports are blocks that are absent
   * from the request unless a host registered data, a form destination or a
   * framable origin. **This site has one of the three**, and had it before the
   * request was ever told: the front door frames the demonstration, so the
   * origins list has had one entry since 12 September. The other two are still
   * genuinely absent, the band still says nothing about them, and the guard
   * still fires the moment either starts costing something.
   */
  it("says nothing about a part this site does not send, and still catches one it does", () => {
    const measurement = WHAT_LEAVES.measure(context)

    expect([measurement.sources, measurement.endpoints]).toEqual([0, 0])
    expect(partsOf(measurement).map((part) => part.key)).not.toContain("sources")
    expect(partsOf(measurement).map((part) => part.key)).not.toContain("endpoints")

    expect(() =>
      partsOf({ ...measurement, sources: 773 })
    ).toThrow(/unnamed: sources/)
  })

  /**
   * **The registry this site had and never handed over.**
   *
   * `frames.ts` registers exactly one origin — this deployment's own, so the
   * front door may put the running demonstration inside itself — and until this
   * branch the request measured on this page was not told. A model asked to
   * change the front door could therefore propose a frame of any host it liked
   * and get a refusal where the document should be, which is the gap 0172
   * closed the seam for and left each surface to wire.
   *
   * Asserted on the built page rather than on the measurement, because the
   * point is that the reader is told: the row has to be in the table with its
   * own number in it.
   */
  it("counts the origins this deployment will frame, and prints them as a row", () => {
    const measurement = WHAT_LEAVES.measure(context)
    const part = partsOf(measurement).find((one) => one.key === "frames")

    expect(measurement.frames).toBeGreaterThan(0)
    expect(part).toBeDefined()
    expect(words()).toContain(part?.what)
    expect(words()).toContain(new Intl.NumberFormat("en-US").format(measurement.frames))
  })

  /**
   * And what those characters are, which a count alone cannot say.
   *
   * The measurement is a number; this goes to the bytes. The block a model
   * receives has to name the origin this site actually registered — if it named
   * something else, or named nothing and cost 412 characters of preamble, every
   * assertion above would still pass.
   */
  it("tells the model the origin it really registered", () => {
    const page = treeFor(HOME, { origin: ORIGIN, theme: DEFAULT_THEME })
    const message = buildUserMessage(
      {
        intentId: sequentialIdFactory("framed").intentId(),
        treeId: page.treeId,
        baseRevision: page.revision,
        origin: "user-instruction",
        actor: "a visitor",
        utterance: "put a video here",
        observedAt: "2026-09-21T00:00:00.000Z",
      },
      page,
      { frameCatalogue: frameCatalogue(siteFrameOrigins(ORIGIN) as FrameOriginRegistry) }
    )

    expect(message).toContain(ORIGIN)
    expect(message).toContain(OWN_ORIGIN_DESCRIPTION)
  })

  /**
   * **The mutation that survived the first six, and what it was hiding.**
   *
   * The test above builds its own catalogue out of `frames.ts` and asserts the
   * runtime prints the origin in it. That is a test of `frames.ts` and of the
   * runtime, and it passes whatever the page passed to `measurePrompt` — so
   * pointing the page's own catalogue at a host this site does not serve left
   * all thirty-seven green. It is the failure this file's own header warns
   * about, written by the person who wrote the header.
   *
   * A count cannot name an origin, so this pins the count to one: the origins
   * block is one line carrying the address, so measuring the same page at a
   * longer address has to cost exactly the extra characters of it. A block
   * built from anything but `context.origin` does not move when the context
   * does, and a block built from a hard-coded address does not move at all.
   */
  it("measures the origin this deployment actually serves from", () => {
    const longer = `${ORIGIN}-by-eighteen-more`
    const here = WHAT_LEAVES.measure(context)
    const there = WHAT_LEAVES.measure({ origin: longer, theme: DEFAULT_THEME })

    expect(there.frames - here.frames).toBe(longer.length - ORIGIN.length)
  })

  /**
   * The two bands, held to each other.
   *
   * The comparison above opens by telling a reader to read down the last column
   * to see the whole of what ever leaves, and the band below measures exactly
   * that column. Nothing checked it, and the column was two rows short of the
   * measurement beside it. Both directions, because under-reporting is the one
   * that costs a reader's trust and over-reporting is merely wrong.
   */
  it("holds the comparison's last column to what the measurement says leaves", () => {
    const shipped = partsOf(WHAT_LEAVES.measure(context))
    const owned = shipped.flatMap((part) => (part.owned === undefined ? [] : [part.owned]))

    expect(owned).toHaveLength(shipped.length - 1)
    expect([...owned].sort()).toEqual([...sentCriteria()].sort())

    for (const heading of owned) {
      expect(words()).toContain(heading)
    }
  })

  it("refuses to build when something leaves that the table above has no row for", () => {
    const shipped = partsOf(WHAT_LEAVES.measure(context))

    expect(() => bandsAgree(shipped, sentCriteria().filter((row) => row !== "Whose pages you let inside yours"))).toThrow(
      /leaves with no row: Whose pages you let inside yours/
    )
  })

  it("refuses to build when the table claims something leaves and nothing does", () => {
    const shipped = partsOf(WHAT_LEAVES.measure(context))

    expect(() => bandsAgree(shipped, [...sentCriteria(), "Your database"])).toThrow(
      /row with nothing leaving: Your database/
    )
  })

  /**
   * The one part with no row, and why that is not an oversight.
   *
   * The standing instructions are the same words on every request on every
   * site. Nothing in them is about the reader, so there is nothing of theirs
   * for a row about where their things end up to be about — and a row saying so
   * would be the page inventing a possession to reassure somebody about.
   */
  it("gives every part but the standing instructions a row", () => {
    const shipped = partsOf(WHAT_LEAVES.measure(context))

    expect(shipped.filter((part) => part.owned === undefined).map((part) => part.key)).toEqual([
      "system",
    ])
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
   * Widened twice, never relaxed. On 12 September `HOME` came off the bar so a
   * seventh page could go on it without taking the count past the eight items
   * #166 asked about; on 13 September `/who-can-ask` was added off it, on the
   * argument that it is the second question a reader of `/the-rules` asks
   * rather than something anybody arrives wanting.
   *
   * **Five of nine is a bad answer to a real problem and it is not this
   * assertion's job to hide that.** It was four of eight on 13 September and
   * `/putting-it-back` made it worse rather than better. The good answer is a
   * bar that groups, which `loom.nav` cannot — it takes a flat run of links and
   * nothing in the library opens. Filed for `Loom primitives` on 12 September
   * and still open. The list stays exact so a sixth fails here and has to be
   * argued for.
   */
  it("is off the bar deliberately, with four other pages", () => {
    expect(WHAT_YOU_RUN.inMenu).toBe(false)
    expect(SITE_ROUTES.filter((route) => !route.inMenu)).toEqual([
      HOME,
      WHO_CAN_ASK,
      PUTTING_IT_BACK,
      WHAT_READERS_DO,
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
