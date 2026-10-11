import { describe, expect, it } from "vitest"

import { ASKS, askById } from "./adapt/asks"
import { RESERVED_VOCABULARY } from "./copy"
import { askRunFor } from "./render"
import {
  askedCard,
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
  ASKED_ROUTE,
  HOME,
  HOW_IT_WORKS,
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
    expect(cardHeadlineOf(HOME)).toBe("every change your AI makes, written down")
    expect(cardHeadlineOf(HOW_IT_WORKS)).toBe("How it works")
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
    expect(displayAddress(ORIGIN, HOW_IT_WORKS.path)).toBe("loom.example/how-it-works")
  })
})

/**
 * The half a competitor cannot copy, and the half that was invisible.
 *
 * These run the real thing: the same `askRunFor` the page calls, the same
 * interpreter and the same rules. A card built from anything else would be a
 * second account of one event, and the two would drift where only a stranger
 * could see them.
 */
describe.each(ASKS)("a link somebody sends after asking $id", (ask) => {
  const runFor = async (approve: boolean) =>
    askRunFor({ origin: ORIGIN, theme: "minimal", ask: ask.id, approve })

  it.each([false, true])("quotes the request verbatim (approved: %s)", async (approve) => {
    const run = await runFor(approve)

    expect(run).toBeDefined()
    expect(run?.record.asked).toBe(ask.utterance)
    expect(askedCard(run!.record, ORIGIN).headline).toBe(`“${ask.utterance}”`)
  })

  it.each([false, true])(
    "says what the rules decided, in the record's words (approved: %s)",
    async (approve) => {
      const run = await runFor(approve)
      const card = askedCard(run!.record, ORIGIN)

      expect(card.eyebrow).toBe(run!.record.verdictLabel)
      expect(card.supporting).toBe(run!.record.verdictLine)
      expect(card.footnote).toBe(run!.record.measured)
    }
  )

  /**
   * The one thing a reader takes from a thumbnail before they read a word of
   * it. The band above the fold answers this question already and the card asks
   * it of the same function, so the two cannot disagree — and the assertion is
   * against the *record's* own fields rather than against the answer, because a
   * test that called `toneFor` twice would pass whatever `toneFor` did.
   */
  it.each([false, true])(
    "wears the accent only where the visitor can still act (approved: %s)",
    async (approve) => {
      const run = await runFor(approve)
      const card = askedCard(run!.record, ORIGIN)

      expect(card.tone).toBe(
        run!.record.awaitingYou || run!.record.landed ? "accent" : "neutral"
      )
    }
  )

  /**
   * The card is the answer band's three lines, and this is the assertion that
   * keeps them one account rather than two. The band above the fold prints the
   * verdict label, the quoted request and the verdict line off the same record;
   * a card that took any of the three from anywhere else could say *allowed*
   * over a page that says *waiting for you*, and the two are never on one screen.
   */
  it("agrees with the page it opens, field for field", async () => {
    const run = await runFor(false)
    const card = askedCard(run!.record, ORIGIN)

    expect(wordsOn(card)).toEqual([
      WORDMARK,
      run!.record.verdictLabel,
      `“${run!.record.asked}”`,
      run!.record.verdictLine,
      run!.record.measured,
      "loom.example/how-it-works",
    ])
  })

  /**
   * Where the card says it is, which moved on 11 October and is the half of
   * this that a stranger checks: a card reading `loom.example` over a verdict
   * reached on `/how-it-works` is a card pointing at a page that was asked
   * nothing. Written out rather than taken from `displayAddress` so that the
   * two spellings have to agree out loud.
   */
  it("says the address of the page the request was run against", async () => {
    const run = await runFor(false)

    expect(askedCard(run!.record, ORIGIN).address).toBe("loom.example/how-it-works")
    expect(ASKED_ROUTE.path).toBe(HOW_IT_WORKS.path)
  })
})

/**
 * The register applies here too, and it is the front door's half of it: a card
 * is met by someone who has not arrived anywhere, so it may not use a word this
 * project invented for itself.
 *
 * It passes today because nothing here writes a sentence — every string is one
 * `voice.test.ts` already holds against a page. That is exactly why it is worth
 * asserting: the day somebody writes card copy of their own is the day this
 * stops being free.
 */
describe("a card speaks the visitor's language", () => {
  const cards = async (): Promise<readonly ShareCard[]> => [
    ...SITE_ROUTES.map((route) => publishedCard(route, ORIGIN)),
    ...(await Promise.all(
      ASKS.map(async (ask) => {
        const run = await askRunFor({ origin: ORIGIN, theme: "minimal", ask: ask.id })

        return askedCard(run!.record, ORIGIN)
      })
    )),
  ]

  /**
   * A rule asserted only in the direction the fixtures happen to reach is a rule
   * half of which has never run. Five requests against the front door reach both.
   */
  it("is exercised in both tones", async () => {
    const tones = (await cards()).map((card) => card.tone)

    expect(tones).toContain("accent")
    expect(tones).toContain("neutral")
  })

  it.each(RESERVED_VOCABULARY)("never says %s", async (word) => {
    for (const card of await cards()) {
      for (const line of wordsOn(card)) {
        expect(line.toLowerCase()).not.toContain(word.toLowerCase())
      }
    }
  })
})

describe("the address of the picture", () => {
  it("carries the palette the visitor was looking at", () => {
    for (const theme of SITE_THEME_NAMES) {
      const url = new URL(shareImageHref(HOME, { origin: ORIGIN, theme }))

      expect(url.pathname).toBe(SHARE_IMAGE_PATH)
      expect(url.searchParams.get("theme")).toBe(theme)
    }
  })

  it("carries the request, and whether the visitor said yes to it", () => {
    const url = new URL(
      shareImageHref(ASKED_ROUTE, {
        origin: ORIGIN,
        theme: "minimal",
        ask: askById("problem")!,
        approve: true,
      })
    )

    expect(url.searchParams.get("ask")).toBe("problem")
    expect(url.searchParams.get("approve")).toBe("1")
  })

  /**
   * **All four, which is what it carried two of.**
   *
   * `ShareContext` had `ask` and `approve` and no `back` or `back-yes`, so the
   * picture of an address carrying an undo was the picture of the change going
   * through. It is the same two-of-four the routes themselves carried for the
   * eight days *Put it back* did nothing, one file over, and it is asserted by
   * the names in the address rather than by the fields on the context: a card
   * drawn from a query string is only as good as the spelling.
   */
  it("carries the undo, and whether the visitor said yes to that", () => {
    const url = new URL(
      shareImageHref(ASKED_ROUTE, {
        origin: ORIGIN,
        theme: "minimal",
        ask: askById("unstick-menu")!,
        approve: true,
        back: true,
        backApprove: true,
      })
    )

    expect([...url.searchParams.keys()].sort()).toEqual([
      "approve",
      "ask",
      "back",
      "back-yes",
      "page",
      "theme",
    ])
    expect(url.searchParams.get("back")).toBe("1")
    expect(url.searchParams.get("back-yes")).toBe("1")
  })

  it("leaves out the two answers the visitor did not give", () => {
    const url = new URL(
      shareImageHref(ASKED_ROUTE, {
        origin: ORIGIN,
        theme: "minimal",
        ask: askById("unstick-menu")!,
        approve: true,
      })
    )

    expect(url.searchParams.get("back")).toBeNull()
    expect(url.searchParams.get("back-yes")).toBeNull()
  })

  /**
   * A request belongs to `ASKED_ROUTE` and nowhere else. `/what-you-run?ask=…`
   * is an address the site never writes, and a picture of a request against a
   * page that cannot run one would be a card about nothing.
   *
   * **The front door is one of those pages as of 11 October**, and it is the
   * one this assertion would have missed: it was the page a request belonged to
   * until the band moved, and for ten days after it the picture of
   * `/?ask=shorter` was a verdict reached on a page the link does not open.
   */
  it.each(SITE_ROUTES.filter((route) => route.path !== ASKED_ROUTE.path))(
    "is dropped on $path, which cannot run one",
    (route) => {
      const url = new URL(
        shareImageHref(route, {
          origin: ORIGIN,
          theme: "minimal",
          ask: askById("problem")!,
          approve: true,
          back: true,
          backApprove: true,
        })
      )

      expect([...url.searchParams.keys()].sort()).toEqual(["page", "theme"])
    }
  )
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

  it("titles a rearranged address with the request that made it", () => {
    const ask = askById("shorter")!
    const meta = pageMetadata(ASKED_ROUTE, { origin: ORIGIN, theme: "minimal", ask })

    expect(meta.title).toBe(ask.utterance)
    expect(meta.description).toBe(HOME.description)
  })

  /**
   * And nowhere else, which is the half that was wrong rather than missing.
   * `/?ask=shorter` was titled with the request for ten days after the band
   * moved off the front door, so the title promised a rearrangement and the
   * page served the published one.
   */
  it.each(SITE_ROUTES.filter((route) => route.path !== ASKED_ROUTE.path))(
    "$path is titled as itself however the address is dressed up",
    (route) => {
      const ask = askById("shorter")!
      const meta = pageMetadata(route, { origin: ORIGIN, theme: "minimal", ask, approve: true })

      expect(meta.title).toBe(route.title)
      expect(meta.description).toBe(route.description)
    }
  )

  /**
   * The arrangement is a view of the front door rather than a second page of
   * this site, so it names the front door as the address to keep. This is the
   * one assertion here that is about a search engine rather than a reader.
   */
  it.each(SITE_ROUTES)("$path names itself, without the visitor's query", (route) => {
    const meta = pageMetadata(route, {
      origin: ORIGIN,
      theme: "bold",
      ...(route.path === HOME.path ? { ask: askById("proof")!, approve: true } : {}),
    })

    expect(meta.alternates?.canonical).toBe(`${ORIGIN}${route.path}`)
  })
})
