import { describe, expect, it } from "vitest"

import {
  cardHeadlineOf,
  displayAddress,
  pageMetadata,
  publishedCard,
  SHARE_IMAGE_PATH,
  shareImageHref,
  WORDMARK,
  type ShareCard,
} from "./share"
import {
  HOME,
  WHY_USE_IT,
  SITE_ROUTES,
  SITE_THEME_NAMES,
  WHAT_YOU_RUN,
} from "./site"

/**
 * What a shared link says, held against the pages it is a link to.
 *
 * The failure this file exists for is one nobody on this project would ever see:
 * a card is rendered by somebody else's server, into somebody else's channel,
 * for a reader who has not opened the page. Every other claim this site makes is
 * checked by looking at it. This one has to be checked by measurement or not at
 * all.
 */

const ORIGIN = "https://loom.example"

/** Every string a card puts in front of a reader. */
const wordsOn = (card: ShareCard): readonly string[] =>
  [card.wordmark, card.eyebrow, card.headline, card.supporting, card.footnote, card.address].filter(
    (word): word is string => word !== undefined && word !== ""
  )

describe("the headline is the page's own title", () => {
  it.each(SITE_ROUTES)("$path says the site's name no more than the wordmark does", (route) => {
    expect(cardHeadlineOf(route)).not.toContain(WORDMARK)
  })

  /**
   * The two halves of the front door's title read across the card as the line
   * they were written as — the wordmark, then the rest of it — so this is the
   * assertion that the split took the name out and nothing else.
   */
  it("keeps every other word of the title, in order", () => {
    expect(cardHeadlineOf(HOME)).toBe("pages that rearrange themselves around your readers")
    expect(cardHeadlineOf(WHY_USE_IT)).toBe("why use it instead of building it yourself")
    expect(cardHeadlineOf(WHAT_YOU_RUN)).toBe("What you run — in your own app, not in front of it")
  })

  it("puts the name back together with the wordmark", () => {
    expect(`${WORDMARK} — ${cardHeadlineOf(HOME)}`).toBe(HOME.title)
  })
})

describe("the card of a published page", () => {
  it.each(SITE_ROUTES)("$path borrows every word from the route", (route) => {
    const card = publishedCard(route, ORIGIN)

    expect(card.headline).toBe(cardHeadlineOf(route))
    expect(card.supporting).toBe(route.description)
    expect(card.footnote).toBeUndefined()
  })

  /**
   * The pill means the rules said something, on every card and nowhere else.
   * It carried the route's nav label first, and the picture is what caught it:
   * `/how-it-works` printed those three words twice, once in the pill and once
   * as the headline under it. A reader comparing two cards can now tell at a
   * glance which of them is a page somebody changed.
   */
  it.each(SITE_ROUTES)("$path wears no pill, because nothing was asked of it", (route) => {
    expect(publishedCard(route, ORIGIN).eyebrow).toBeUndefined()
  })

  it("never prints the same words twice", () => {
    for (const route of SITE_ROUTES) {
      const card = publishedCard(route, ORIGIN)

      expect(new Set(wordsOn(card)).size).toBe(wordsOn(card).length)
      expect(card.supporting.startsWith(card.headline)).toBe(false)
    }
  })

  it("says the address the way a reader would, without the scheme", () => {
    expect(displayAddress(ORIGIN, "/")).toBe("loom.example")
    expect(displayAddress(ORIGIN, WHY_USE_IT.path)).toBe("loom.example/why-use-it")
  })
})

/**
 * The address of the picture, which is a page and a palette.
 *
 * This file ran the real thing until 31 October: `askRunFor` for each
 * pre-written request, a card drawn from the record it produced, and the
 * picture's address carrying all four parameters so that a link somebody sent
 * after asking the page for something unfurled as the state they left it in.
 * [0328](../../../../../decisions/0328-the-marketing-site-has-no-demonstration-and-no-mechanism-page.md)
 * removed the demonstration and `askedCard` with it.
 *
 * The rule those cases were written around is kept, because it is the one a
 * careless change breaks: **the picture's address and the page's address are
 * one convention with one set of names**, and this site has already paid twice
 * for a parameter written in one spelling and read in another.
 */
describe("the address of the picture", () => {
  it("carries the palette the visitor was looking at", () => {
    for (const theme of SITE_THEME_NAMES) {
      const url = new URL(shareImageHref(HOME, { origin: ORIGIN, theme }))

      expect(url.pathname).toBe(SHARE_IMAGE_PATH)
      expect(url.searchParams.get("theme")).toBe(theme)
    }
  })

  it.each(SITE_ROUTES)("names $path and nothing else", (route) => {
    const url = new URL(shareImageHref(route, { origin: ORIGIN, theme: "minimal" }))

    expect([...url.searchParams.keys()].sort()).toEqual(["page", "theme"])
    expect(url.searchParams.get("page")).toBe(route.path)
  })
})

describe("what the document says about itself", () => {
  it.each(SITE_ROUTES)("$path unfurls with its own title and a picture", (route) => {
    const meta = pageMetadata(route, { origin: ORIGIN, theme: "minimal" })

    expect(meta.title).toBe(route.title)
    expect(meta.description).toBe(route.description)
    expect(meta.openGraph?.title).toBe(route.title)
    expect((meta.twitter as { readonly card?: string } | undefined)?.card).toBe(
      "summary_large_image"
    )

    const image = (meta.openGraph as { images: readonly { url: string }[] }).images[0]

    expect(image?.url).toBe(shareImageHref(route, { origin: ORIGIN, theme: "minimal" }))
  })

  /**
   * **Every page is titled as itself, however the address is dressed up.**
   *
   * Two cases stood here: one asserting that an address carrying a request was
   * titled with the request, and one asserting that every *other* page was
   * not. The second existed because `/?ask=shorter` was titled with the
   * request for ten days after the band moved off the front door, so the title
   * promised a rearrangement and the page served the published one.
   *
   * [0328](../../../../../decisions/0328-the-marketing-site-has-no-demonstration-and-no-mechanism-page.md)
   * removed the requests, so the first case has no subject and the second is
   * the whole rule. A leftover link still has to unfurl as the page it opens,
   * which is what this holds.
   */
  it.each(SITE_ROUTES)("$path is titled as itself however the address is dressed up", (route) => {
    const meta = pageMetadata(route, { origin: ORIGIN, theme: "minimal" })

    expect(meta.title).toBe(route.title)
    expect(meta.description).toBe(route.description)
  })

/**
   * The arrangement is a view of the front door rather than a second page of
   * this site, so it names the front door as the address to keep. This is the
   * one assertion here that is about a search engine rather than a reader.
   */
  it.each(SITE_ROUTES)("$path names itself, without the visitor's query", (route) => {
    const meta = pageMetadata(route, { origin: ORIGIN, theme: "bold" })

    expect(meta.alternates?.canonical).toBe(`${ORIGIN}${route.path}`)
  })
})
