import type { Metadata } from "next"

import { describe, expect, it } from "vitest"

import { askById } from "./_lib/adapt/asks"
import { shareImageFor } from "./_lib/share-image"
import {
  cardHeadlineOf,
  displayAddress,
  pageMetadata,
  shareImageHref,
  type PageSearchParams,
} from "./_lib/share"
import { HOME, SITE_ROUTES, SITE_THEME_NAMES, siteOrigin, type SiteRoute } from "./_lib/site"

/**
 * That every page of this site actually announces itself.
 *
 * `share.test.ts` holds what a shared link *says* — the headline, the pill, the
 * address, the picture's own query — and it holds all of it against
 * `pageMetadata`, which is a function. **Nothing held that a page calls it**, and
 * on 14 September five of the nine did not: `/the-rules`, `/who-can-ask`,
 * `/when-it-goes-wrong`, `/what-you-run` and `/your-components` each exported a
 * static `metadata` with a title and a sentence, so an address on any of them
 * unfurled with no picture at all. Every assertion about cards passed the whole
 * time, because every one of them was about the machinery rather than about the
 * pages.
 *
 * That is the gap this file is for, and it is the reason it imports the route
 * modules rather than the library: the only thing that can catch a page not
 * calling the library is a test that goes and looks at the page.
 *
 * The failure it prevents is also the one nobody here would ever see. A card is
 * drawn by somebody else's server, into somebody else's channel, for a reader
 * who has not opened the page — so a page that stops emitting one looks
 * completely normal to everybody who works on this site, and wrong only to the
 * stranger the lane's exit condition is written about.
 */

/** What a page of this route group may export, of the two that decide this. */
type PageModule = {
  readonly generateMetadata?: (args: {
    readonly searchParams: PageSearchParams
  }) => Promise<Metadata>
  /**
   * Next refuses a segment exporting both, so this is not merely a second source
   * of truth — it is a build error. It is typed here so the test can say which
   * of the two a page has rather than only that it lacks the other.
   */
  readonly metadata?: Metadata
}

/**
 * Every page module of this site, by the route it answers.
 *
 * Written out rather than resolved from `route.path`, because a dynamic import
 * of a computed path is a glob the bundler has to guess at, and a guess that
 * came back empty would make this file pass by finding nothing. The list being
 * hand-written is safe for exactly one reason: **the first assertion below holds
 * it to `SITE_ROUTES` in both directions**, so a tenth page cannot be added to
 * the site and left out of this file, and an entry here cannot outlive its route.
 */
const PAGE_MODULES: Readonly<Record<string, () => Promise<PageModule>>> = {
  "/": () => import("./page"),
  "/how-it-works": () => import("./how-it-works/page"),
  "/the-rules": () => import("./the-rules/page"),
  "/who-can-ask": () => import("./who-can-ask/page"),
  "/the-record": () => import("./the-record/page"),
  "/putting-it-back": () => import("./putting-it-back/page"),
  "/what-readers-do": () => import("./what-readers-do/page"),
  "/what-can-happen": () => import("./what-can-happen/page"),
  "/what-you-run": () => import("./what-you-run/page"),
  "/your-components": () => import("./your-components/page"),
}

const ORIGIN = siteOrigin()

const announcedBy = async (
  route: SiteRoute,
  params: Record<string, string> = {}
): Promise<Metadata> => {
  const module = await PAGE_MODULES[route.path]!()

  return module.generateMetadata!({ searchParams: Promise.resolve(params) })
}

/** The picture a piece of metadata points a crawler at. */
const pictureIn = (metadata: Metadata): string => {
  const images = (metadata.openGraph as { readonly images: readonly { readonly url: string }[] })
    .images

  return images[0]!.url
}

describe("this file knows about every page", () => {
  it("has a module for each of the site's routes", () => {
    expect(Object.keys(PAGE_MODULES).sort()).toEqual(SITE_ROUTES.map((r) => r.path).sort())
  })
})

describe.each(SITE_ROUTES)("$path", (route) => {
  it("decides what it unfurls as, rather than leaving it to the layout", async () => {
    const module = await PAGE_MODULES[route.path]!()

    expect(typeof module.generateMetadata).toBe("function")
  })

  /**
   * The shape the five that went quiet had. It is also what Next refuses to
   * build, so a page that regrows one fails here before it fails there — with a
   * sentence saying which page and why, rather than a build log.
   */
  it("does not also export a fixed one", async () => {
    const module = await PAGE_MODULES[route.path]!()

    expect("metadata" in module).toBe(false)
  })

  it.each(SITE_THEME_NAMES)("says what this site says about %s of it", async (theme) => {
    expect(await announcedBy(route, { theme })).toEqual(
      pageMetadata(route, { origin: ORIGIN, theme })
    )
  })

  it("points at a picture of itself, absolutely", async () => {
    const picture = pictureIn(await announcedBy(route))

    expect(picture).toBe(shareImageHref(route, { origin: ORIGIN, theme: "minimal" }))
    expect(new URL(picture).origin).toBe(new URL(ORIGIN).origin)
  })

  /**
   * The whole way round, because every step so far has compared one of this
   * lane's functions against another. This one takes the address the page hands
   * a crawler, gives it to the thing that answers that address, and looks at the
   * card that comes back — which is what the stranger sees, and the only
   * assertion here that would survive the two halves drifting together.
   */
  it("hands a crawler an address that draws this page's card", async () => {
    const picture = new URL(pictureIn(await announcedBy(route)))
    const { card } = await shareImageFor(picture.searchParams, ORIGIN)

    expect(card.headline).toBe(cardHeadlineOf(route))
    expect(card.address).toBe(displayAddress(ORIGIN, route.path))
  })
})

/**
 * Why the front door is the one page that may not take the shared factory.
 *
 * Every other page unfurls as a function of its route and the palette, which is
 * all `routeMetadata` reads. This one also unfurls as a function of **what the
 * visitor asked it for** — `/?ask=shorter` is the front door with a band lifted
 * under the headline, it has an address, and a card that showed the published
 * page for both would be silent at the exact moment this site is making the
 * claim nothing else can make.
 *
 * So it is asserted rather than left as a comment on the exception: if the front
 * door is ever quietly converted to the one-liner beside it, this goes red and
 * says what was lost.
 */
describe("the front door, which is asked for things", () => {
  const ask = askById("shorter")!

  it("titles a rearranged address with the request that made it", async () => {
    expect((await announcedBy(HOME, { ask: ask.id })).title).toBe(ask.utterance)
  })

  it("draws the arrangement rather than the published page", async () => {
    const plain = new URL(pictureIn(await announcedBy(HOME)))
    const asked = new URL(pictureIn(await announcedBy(HOME, { ask: ask.id, approve: "1" })))

    expect(plain.searchParams.get("ask")).toBeNull()
    expect(asked.searchParams.get("ask")).toBe(ask.id)
    expect(asked.searchParams.get("approve")).toBe("1")
  })

  /**
   * The card a rearranged address unfurls as is the verdict the rules reached,
   * run for real — so the request has to survive all the way to the drawing, not
   * merely into the query string.
   */
  it("carries the request as far as the card", async () => {
    const asked = new URL(pictureIn(await announcedBy(HOME, { ask: ask.id })))
    const { card } = await shareImageFor(asked.searchParams, ORIGIN)

    expect(card.headline).toBe(`“${ask.utterance}”`)
    expect(card.eyebrow).toBeDefined()
  })
})
