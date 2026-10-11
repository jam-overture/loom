import { describe, expect, it } from "vitest"

import { ASKS, askById } from "./adapt/asks"
import { askRunFor } from "./render"
import { shareImageFor } from "./share-image"
import { publishedCard } from "./share"
import { ASKED_ROUTE, HOME, HOW_IT_WORKS, SITE_ROUTES, SITE_THEME_NAMES } from "./site"

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
      page: ASKED_ROUTE.path,
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
  it.each(SITE_ROUTES.filter((route) => route.path !== ASKED_ROUTE.path))(
    "is ignored on $path, which cannot run one",
    async (route) => {
      const { card } = await shareImageFor(
        query({ page: route.path, ask: "problem", approve: "1", back: "1" }),
        ORIGIN
      )

      expect(card).toEqual(publishedCard(route, ORIGIN))
    }
  )

  it("is ignored when it names nothing this page offers", async () => {
    const { card } = await shareImageFor(query({ ask: "make-it-purple" }), ORIGIN)

    expect(card).toEqual(publishedCard(HOME, ORIGIN))
  })
})

/**
 * The undo, drawn.
 *
 * This route read `ask` and `approve` off the query by hand and never looked
 * for `back` or `back-yes`, so an address a visitor copied while the rules were
 * holding the putting-back drew the picture of the change going through — the
 * one state of this site nothing else can show, unfurling as the state before
 * it. It reads the address through `askedFor` now, which is the function the
 * pages read theirs with.
 *
 * `unstick-menu` is the request whose undo is held: it changes a setting on a
 * protected piece, and the change that reverses a setting change is another
 * setting change on the same piece, so the rules weigh it identically.
 */
describe("an address carrying an undo", () => {
  const ask = askById("unstick-menu")!

  const runFor = async (back: boolean, backApprove = false) =>
    askRunFor({
      origin: ORIGIN,
      theme: "minimal",
      ask: ask.id,
      approve: true,
      back,
      backApprove,
    })

  it("draws the verdict on the putting-back rather than on the change", async () => {
    const { card } = await shareImageFor(
      query({ page: ASKED_ROUTE.path, ask: ask.id, approve: "1", back: "1" }),
      ORIGIN
    )
    const run = await runFor(true)

    expect(run?.undone).toBeDefined()
    expect(card.headline).toBe(`“${run!.undone!.asked}”`)
    expect(card.eyebrow).toBe(run!.undone!.verdictLabel)
    expect(card.supporting).toBe(run!.undone!.verdictLine)
    expect(card.footnote).toBe(run!.undone!.measured)
  })

  /**
   * The two cards of one address, side by side, which is the pair the picture
   * could not draw. They are the same request and the same approval; the only
   * difference is the parameter that was being dropped.
   */
  it("says something different from the same address without the undo", async () => {
    const landed = await shareImageFor(
      query({ page: ASKED_ROUTE.path, ask: ask.id, approve: "1" }),
      ORIGIN
    )
    const held = await shareImageFor(
      query({ page: ASKED_ROUTE.path, ask: ask.id, approve: "1", back: "1" }),
      ORIGIN
    )

    expect(held.card).not.toEqual(landed.card)
    expect(held.card.headline).not.toBe(landed.card.headline)
  })

  it("draws the undo the visitor allowed, once they have", async () => {
    const { card } = await shareImageFor(
      query({ page: ASKED_ROUTE.path, ask: ask.id, approve: "1", back: "1", "back-yes": "1" }),
      ORIGIN
    )
    const run = await runFor(true, true)

    expect(card.eyebrow).toBe(run!.undone!.verdictLabel)
    expect(card.supporting).toBe(run!.undone!.verdictLine)
  })

  /**
   * `?back=1` with nothing asked is an address that says nothing, and
   * `askedFor` drops the three answers when there is no request to answer
   * about. It is held here as well as in `addressed.test.ts` because this is
   * the one reader of an address that a person outside this repository can hit
   * with anything they like.
   */
  it("is the published page when there is no request to put back", async () => {
    const { card } = await shareImageFor(
      query({ page: ASKED_ROUTE.path, back: "1", "back-yes": "1" }),
      ORIGIN
    )

    expect(card).toEqual(publishedCard(ASKED_ROUTE, ORIGIN))
  })
})

describe("the card is drawn for the deployment it is served from", () => {
  it("says the address of the origin it was asked on, not a pinned one", async () => {
    const preview = await shareImageFor(query({ page: HOW_IT_WORKS.path }), "https://preview.test")

    expect(preview.card.address).toBe("preview.test/how-it-works")
  })
})
