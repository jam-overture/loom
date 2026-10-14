import type { Metadata } from "next"

import { describe, expect, it } from "vitest"

import { askById } from "./_lib/adapt/asks"
import { askRunFor } from "./_lib/render"
import { shareImageFor } from "./_lib/share-image"
import {
  cardHeadlineOf,
  displayAddress,
  pageMetadata,
  routeMetadata,
  shareImageHref,
  type PageSearchParams,
} from "./_lib/share"
import {
  ASKED_ROUTE,
  HOME,
  SITE_ROUTES,
  SITE_THEME_NAMES,
  siteOrigin,
  type SiteRoute,
} from "./_lib/site"

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
 * it to `SITE_ROUTES` in both directions**, so a fourth page cannot be added to
 * the site and left out of this file, and an entry here cannot outlive its route.
 */
const PAGE_MODULES: Readonly<Record<string, () => Promise<PageModule>>> = {
  "/": () => import("./page"),
  "/how-it-works": () => import("./how-it-works/page"),
  "/what-you-run": () => import("./what-you-run/page"),
}

const ORIGIN = siteOrigin()

/**
 * One request, named once.
 *
 * `shorter` because it is the quietest of the list — the rules let it through
 * on its own — so an assertion about *whether a page reads a request at all*
 * is not also an assertion about a verdict.
 */
const ask = "shorter"
const utterance = askById(ask)!.utterance

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
 * Why no page of this site may decide for itself what it unfurls as.
 *
 * **This block was the opposite assertion until 11 October**, and the comment
 * above it is worth keeping because it was right and then quietly stopped
 * being:
 *
 * > *"Every other page unfurls as a function of its route and the palette, which
 * > is all `routeMetadata` reads. This one also unfurls as a function of what the
 * > visitor asked it for — `/?ask=shorter` is the front door with a band lifted
 * > under the headline, it has an address, and a card that showed the published
 * > page for both would be silent at the exact moment this site is making the
 * > claim nothing else can make."*
 *
 * Every word of it was true of the front door until 1 October, when the
 * maintainer moved the band to `/how-it-works`. After that the exception
 * pointed at the wrong page from both ends: `/` announced a request it does not
 * act on, and the page that acts on one took the factory that reads none. The
 * assertion written to protect the exception passed the whole time, because what
 * it held was *the front door reads an ask* — which was still true, and no
 * longer the property worth having.
 *
 * So the exception is gone rather than moved. `routeMetadata` reads the whole
 * address and `pageMetadata` drops what the route cannot use, and the page that
 * runs a request is `ASKED_ROUTE` — one constant, read by the renderer, the
 * address writer, the words and the picture. A band that moves again moves one
 * line, and the test below says so by naming the constant rather than a path.
 */
describe("every page takes the one factory", () => {
  /**
   * Every address this site writes, as the five states a page can be asked for.
   *
   * The sweep is the assertion rather than a convenience, and it is what one
   * address could not do: a page keeping a reader of its own agrees with the
   * factory on `{}` whatever it reads, because there is nothing in `{}` to read
   * differently. The one that was wrong before today — `/how-it-works` taking a
   * factory that read the palette and nothing else — is only visible on an
   * address carrying a request.
   */
  const ADDRESSES: readonly (readonly [string, Record<string, string>])[] = [
    ["nothing asked", {}],
    ["a palette", { theme: "bold" }],
    ["a request", { ask }],
    ["a request the visitor allowed", { ask, approve: "1" }],
    ["an undo", { ask: "unstick-menu", approve: "1", back: "1" }],
    ["an undo the visitor allowed", { ask: "unstick-menu", approve: "1", back: "1", "back-yes": "1" }],
  ]

  describe.each(SITE_ROUTES)("$path", (route) => {
    it.each(ADDRESSES)("is announced by the shared factory, given %s", async (_what, params) => {
      const module = await PAGE_MODULES[route.path]!()

      expect(await module.generateMetadata!({ searchParams: Promise.resolve(params) })).toEqual(
        await routeMetadata(route)({ searchParams: Promise.resolve(params) })
      )
    })
  })

  /**
   * The half the shape above cannot catch. A page agreeing with the factory is
   * a page announced the way the factory announces it, which says nothing about
   * whether the factory lands a request on the right page; what this asks is
   * that it lands on exactly one, and names the constant rather than the path.
   */
  it("announces a request on one page of this site and no other", async () => {
    const titles = await Promise.all(
      SITE_ROUTES.map(async (route) => [route.path, (await announcedBy(route, { ask })).title])
    )

    expect(titles.filter(([, title]) => title === utterance).map(([path]) => path)).toEqual([
      ASKED_ROUTE.path,
    ])
  })
})

/**
 * The page a visitor can ask for a change to, which is `/how-it-works`.
 *
 * These are the four assertions that used to be written against the front door,
 * pointed at the constant instead of at a path — so the next time the band
 * moves, the pages it moved between are not what has to be edited.
 */
describe("the page that is asked for things", () => {
  it("titles a rearranged address with the request that made it", async () => {
    expect((await announcedBy(ASKED_ROUTE, { ask })).title).toBe(utterance)
  })

  it("draws the arrangement rather than the published page", async () => {
    const plain = new URL(pictureIn(await announcedBy(ASKED_ROUTE)))
    const asked = new URL(pictureIn(await announcedBy(ASKED_ROUTE, { ask, approve: "1" })))

    expect(plain.searchParams.get("ask")).toBeNull()
    expect(asked.searchParams.get("ask")).toBe(ask)
    expect(asked.searchParams.get("approve")).toBe("1")
  })

  /**
   * The card a rearranged address unfurls as is the verdict the rules reached,
   * run for real — so the request has to survive all the way to the drawing, not
   * merely into the query string.
   */
  it("carries the request as far as the card", async () => {
    const asked = new URL(pictureIn(await announcedBy(ASKED_ROUTE, { ask })))
    const { card } = await shareImageFor(asked.searchParams, ORIGIN)

    expect(card.headline).toBe(`“${utterance}”`)
    expect(card.eyebrow).toBeDefined()
  })

  /**
   * The published front door, which is what `/` now announces and did not until
   * today. It is asserted from this side as well as from the sweep above,
   * because *the page that does not rearrange says nothing about a request* is
   * the half of this move a reader of the site would notice: a link to
   * `/?ask=shorter&approve=1` unfurled as a request and opened a page that had
   * not been asked anything.
   */
  it("is the only page a request changes the announcement of", async () => {
    expect(await announcedBy(HOME, { ask, approve: "1" })).toEqual(await announcedBy(HOME))
  })
})

/**
 * The undo, which is the one state of this site a competitor cannot screenshot
 * and the one that had no card.
 *
 * `ShareContext` carried `ask` and `approve` and not `back` or `back-yes` — the
 * same two-of-four the routes carried for the eight days *Put it back* did
 * nothing — so every address of a held or landed undo unfurled as the change
 * going through. The request below is the one whose undo the rules hold:
 * `unstick-menu` changes a setting on a protected piece, and the change that
 * reverses a setting change is another setting change on the same piece, so it
 * is weighed the same way and held the same way.
 */
describe("an address that carries an undo", () => {
  const held = { ask: "unstick-menu", approve: "1", back: "1" } as const

  it("asks the picture for the undo as well as the change", async () => {
    const picture = new URL(pictureIn(await announcedBy(ASKED_ROUTE, held)))

    expect(picture.searchParams.get("back")).toBe("1")
    expect(picture.searchParams.get("back-yes")).toBeNull()
  })

  it("unfurls as the verdict on the putting-back, not on the change", async () => {
    const picture = new URL(pictureIn(await announcedBy(ASKED_ROUTE, held)))
    const { card } = await shareImageFor(picture.searchParams, ORIGIN)
    const run = await askRunFor({
      origin: ORIGIN,
      theme: "minimal",
      ask: "unstick-menu",
      approve: true,
      back: true,
    })

    expect(run?.undone).toBeDefined()
    expect(card.eyebrow).toBe(run!.undone!.verdictLabel)
    expect(card.supporting).toBe(run!.undone!.verdictLine)
    expect(card.headline).toBe(`“${run!.undone!.asked}”`)
  })

  /**
   * The card moved, and the title did not. What a link is *about* is what
   * somebody asked for; what happened to it is the card's half to report, which
   * is how one title covers all four states of an address.
   */
  it("still titles itself with the request, not with the undo", async () => {
    expect((await announcedBy(ASKED_ROUTE, held)).title).toBe(askById("unstick-menu")!.utterance)
  })
})
