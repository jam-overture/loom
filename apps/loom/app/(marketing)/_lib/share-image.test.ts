import { describe, expect, it } from "vitest"

import { shareImageFor } from "./share-image"
import { publishedCard } from "./share"
import { HOME, SITE_ROUTES, SITE_THEME_NAMES, WHY_USE_IT } from "./site"

/**
 * An address, turned into the card it should unfurl as.
 *
 * Everything here arrives from a query string, which is a boundary: the address
 * was typed by whoever pasted the link, and some of them are pasted badly. The
 * rule is the one the pages already follow — a mangled address is a page, not a
 * 400 — and the reason it matters more here is that the failure is silent. A
 * page that threw would show somebody an error; an image route that throws shows
 * a broken thumbnail in a channel and tells nobody.
 */

const ORIGIN = "https://loom.example"

const query = (pairs: Record<string, string>): URLSearchParams => new URLSearchParams(pairs)

describe("the page the address names", () => {
  it.each(SITE_ROUTES)("draws $path", async (route) => {
    const { card } = await shareImageFor(query({ page: route.path }), ORIGIN)

    expect(card).toEqual(publishedCard(route, ORIGIN))
  })

  it.each([
    ["nothing at all", {}],
    ["a page this site does not serve", { page: "/pricing" }],
    ["a path from another surface", { page: "/portal" }],
  ])("falls back to the front door on %s", async (_what, params) => {
    const { route } = await shareImageFor(query(params), ORIGIN)

    expect(route).toBe(HOME)
  })
})

describe("the palette the address names", () => {
  it.each(SITE_THEME_NAMES)("resolves %s", async (name) => {
    const { theme } = await shareImageFor(query({ theme: name }), ORIGIN)

    expect(theme.palette.id).toBe(name)
  })

  it("falls back to the house palette on a name nobody registered", async () => {
    const { theme } = await shareImageFor(query({ theme: "neon" }), ORIGIN)

    expect(theme.palette.id).toBe("minimal")
  })
})

/**
 * **An address carrying anything but a palette draws the published card**, as
 * of [0328](../../../../../decisions/0328-the-marketing-site-has-no-demonstration-and-no-mechanism-page.md).
 *
 * This was two describes and twelve cases: a card drawn from the record of
 * whichever change the address asked for, and the pair of pages that could not
 * run one. There is no page that can now, and what is worth keeping is the
 * half that is still a promise — a link somebody shared before the
 * demonstration came off still unfurls as a card rather than as nothing.
 */
describe("an address left over from the demonstration", () => {
  it.each(SITE_ROUTES)("draws $path's published card", async (route) => {
    const { card } = await shareImageFor(
      query({ page: route.path, ask: "problem", approve: "1", back: "1" }),
      ORIGIN
    )

    expect(card).toEqual(publishedCard(route, ORIGIN))
  })

  it("is ignored when it names nothing this page offers", async () => {
    const { card } = await shareImageFor(query({ ask: "make-it-purple" }), ORIGIN)

    expect(card).toEqual(publishedCard(HOME, ORIGIN))
  })
})

describe("the card is drawn for the deployment it is served from", () => {
  it("says the address of the origin it was asked on, not a pinned one", async () => {
    const preview = await shareImageFor(query({ page: WHY_USE_IT.path }), "https://preview.test")

    expect(preview.card.address).toBe("preview.test/why-use-it")
  })
})
