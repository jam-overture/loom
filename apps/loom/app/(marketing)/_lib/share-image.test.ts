import { describe, expect, it } from "vitest"

import { ASKS } from "./adapt/asks"
import { askRunFor } from "./render"
import { shareImageFor } from "./share-image"
import { publishedCard } from "./share"
import { HOME, HOW_IT_WORKS, SITE_ROUTES, SITE_THEME_NAMES, THE_RECORD } from "./site"

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
 * The card of a rearranged address is the record of the run that address
 * produces — not a description of it, and not a run of its own. These hold the
 * route's output against the page's own call, so a card and the page it opens
 * cannot report two different verdicts.
 */
describe.each(ASKS)("a request for $id in the address", (ask) => {
  it.each([
    ["held", false],
    ["approved", true],
  ])("draws the record the page reaches, %s", async (_state, approve) => {
    const params = query({
      page: HOME.path,
      ask: ask.id,
      ...(approve ? { approve: "1" } : {}),
    })
    const { card } = await shareImageFor(params, ORIGIN)
    const run = await askRunFor({ origin: ORIGIN, theme: "minimal", ask: ask.id, approve })

    expect(card.eyebrow).toBe(run?.record.verdictLabel)
    expect(card.headline).toBe(`“${run?.record.asked}”`)
    expect(card.supporting).toBe(run?.record.verdictLine)
    expect(card.footnote).toBe(run?.record.measured)
  })
})

describe("a request that does not belong to the address", () => {
  it("is ignored on a page that cannot run one", async () => {
    const { card } = await shareImageFor(
      query({ page: THE_RECORD.path, ask: "problem", approve: "1" }),
      ORIGIN
    )

    expect(card).toEqual(publishedCard(THE_RECORD, ORIGIN))
  })

  it("is ignored when it names nothing this page offers", async () => {
    const { card } = await shareImageFor(query({ ask: "make-it-purple" }), ORIGIN)

    expect(card).toEqual(publishedCard(HOME, ORIGIN))
  })
})

describe("the card is drawn for the deployment it is served from", () => {
  it("says the address of the origin it was asked on, not a pinned one", async () => {
    const preview = await shareImageFor(query({ page: HOW_IT_WORKS.path }), "https://preview.test")

    expect(preview.card.address).toBe("preview.test/how-it-works")
  })
})
