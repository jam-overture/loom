import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { ANCHOR } from "./bands"
import { elementsIn } from "./measure"
import type { PageContext } from "./pages/home"
import { pageTreeFor, renderTree } from "./render"
import { HOME, HOW_IT_WORKS, SITE_THEMES, type SiteThemeName } from "./site"

/**
 * What the front door reaches, held to the one destination it had no way to.
 *
 * This site's recorded position is that **the marketing site is the
 * demonstration and not a brochure about it**, and exactly one band on it is
 * the product working rather than an argument for it: the five choices on
 * `/how-it-works`, with the record filling in beside them. Everything else is
 * a claim about that band.
 *
 * Until this run the page a stranger arrives at could not get them there.
 * `/what-you-run` has named it in a sentence since 6 October and the front door
 * had nothing — not a link, not a card in the band of ways in, not a control.
 * The two things it did offer went to the *top* of `/how-it-works`, which is
 * the journey band, so the visitor who pressed the obvious thing met five steps
 * and a scroll. Measured on a production build of `main` at 390x844, the
 * demonstration starts **3,622px below the fold** from there.
 *
 * ## Why this is a rule and not a link somebody added
 *
 * Nothing that existed could have reported it. `naming.test.ts` holds *a
 * sentence that names a page offers the way there*, and the front door names no
 * page in the sentence this is about. `routes.test.ts` holds *every address
 * this site points at is served*, and an address nobody points at is not an
 * address. `anchors.test.ts` holds the fragment lands, within `/how-it-works`.
 * Each of the three is about a link that exists. **A missing link is not a
 * broken one**, and the gap between those two sentences is where this sat for a
 * week with every test green.
 *
 * So the assertion is the reader's version of the claim rather than the
 * code's: from the page a stranger arrives at, the thing this site exists to
 * show is **one press away, and the press lands on it.**
 */

const ORIGIN = "https://loom.example"

const THEMES = Object.keys(SITE_THEMES) as readonly SiteThemeName[]

/**
 * Swept over the palettes because the address carries one.
 *
 * `internalHref` keeps the visitor's palette across a link so the site does not
 * silently reset what they chose, which means the href this reads is built per
 * theme. A link correct on `minimal` and malformed on `bold` would be a link
 * two thirds of this site's own demonstrated states never exercise.
 */
const frontDoorIn = async (theme: SiteThemeName) =>
  pageTreeFor(HOME, { origin: ORIGIN, theme } satisfies PageContext)

/** Every href the front door offers, as the browser would resolve it. */
const linksFrom = async (theme: SiteThemeName): Promise<readonly URL[]> =>
  elementsIn((await frontDoorIn(theme)).root).flatMap((element) => {
    const href = element.props["href"]

    if (typeof href !== "string") return []

    try {
      return [new URL(href, ORIGIN)]
    } catch {
      return []
    }
  })

describe("the front door reaches the demonstration", () => {
  it.each(THEMES)("offers it on %s", async (theme) => {
    const into = (await linksFrom(theme)).filter(
      (url) => url.origin === ORIGIN && url.pathname === HOW_IT_WORKS.path
    )

    expect(into.map((url) => url.hash)).toContain(`#${ANCHOR.seeItHappen}`)
  })

  /**
   * The half that makes the link worth having, and the half a press depends on.
   *
   * An href ending in the right fragment is satisfied by a band that stopped
   * declaring the anchor, which is the silent failure `anchors.test.ts` was
   * written about — no error, no console line, a page that renders perfectly
   * and a button that does nothing. That file holds it for links *within*
   * `/how-it-works`; this is the same promise made from a different page, so it
   * is read the same way: in the markup a browser actually receives.
   */
  it("lands on the band rather than on the page", async () => {
    const page = await pageTreeFor(HOW_IT_WORKS, { origin: ORIGIN, theme: "minimal" })
    const markup = renderToStaticMarkup(renderTree(page, { origin: ORIGIN }).element)

    expect(markup).toContain(`id="${ANCHOR.seeItHappen}"`)
  })

  /**
   * The front door is not a second copy of the demonstration, and this says so.
   *
   * The band is `/how-it-works`'s and the maintainer put it there on 1 October.
   * A later run reading *the front door should reach it* as *the front door
   * should have one* would be this lane moving a band its owner placed, so the
   * rule is written with its own limit attached: a link, and nowhere to declare
   * the anchor but the page that owns it.
   */
  it("does not grow a second copy of the band's anchor", async () => {
    const markup = renderToStaticMarkup(
      renderTree(await frontDoorIn("minimal"), { origin: ORIGIN }).element
    )

    expect(markup).not.toContain(`id="${ANCHOR.seeItHappen}"`)
  })
})
