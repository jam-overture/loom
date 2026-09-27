import type { Metadata } from "next"

import type { Ask } from "./adapt/asks"
import type { ChangeRecord } from "./adapt/record"
import { toneFor } from "./pages/answer"
import {
  HOME,
  internalHref,
  isPublicDeployment,
  readThemeName,
  siteOrigin,
  type SiteRoute,
  type SiteThemeName,
} from "./site"

/**
 * What this site looks like when somebody sends it to somebody else.
 *
 * The exit condition written against this lane is *pages good enough to send to
 * someone cold*, and the way a page is sent to someone cold is a link pasted
 * into a message. Until this module existed, every one of those links unfurled
 * as a bare address: no card, no picture, and a title only because Next puts one
 * in the document by default. Three pages, one origin, nothing to look at.
 *
 * **The half that matters is the second one.** This site's whole claim is that a
 * page somebody rearranged has an *address* — `/?ask=problem&approve=1` is the
 * front door with the band about what Loom is for lifted under the headline, and
 * it can be copied, sent and opened a week later. That is the thing no competitor
 * can show. It was also, until now, the exact moment the site said nothing at
 * all: a rearranged address and the published one previewed identically, so the
 * one artefact built for sharing was invisible the second it was shared.
 *
 * So a shared address previews as *what it is*: the request in the visitor's own
 * words, the verdict the rules reached, and how much of the page actually moved.
 *
 * **Nothing here writes a sentence.** Every string on a card and in every tag is
 * lifted from something that already exists and is already tested — a route's
 * own title and description in `site.ts`, an ask's `utterance` in `asks.ts`, and
 * the `ChangeRecord` the run produced. A share card that composed its own copy
 * would be a fourth register nobody reads, drifting from the page it advertises
 * where only a stranger would ever see the two together.
 */

/** The route that draws the picture. Not a page: it answers with an image. */
export const SHARE_IMAGE_PATH = "/share-image"

/** The name the header's `loom.logo` carries, and the only place the card says it. */
export const WORDMARK = "Loom"

/** How `site.ts` joins the two halves of a page title. */
const TITLE_SEPARATOR = " — "

/**
 * The card's headline: the page's own title, with the site's name taken out.
 *
 * The wordmark is already at the top left of the card, so a title carrying
 * `Loom` would print it twice — and on the front door, whose title is
 * *"Loom — every change your AI makes, written down"*, the two halves read as
 * one line across the card exactly as they were written.
 *
 * Splitting rather than trimming a prefix, because the name sits on the left of
 * the separator in one title and the right of it in another, and a rule that
 * only handled the case in front of it is a rule that breaks on the fourth page
 * somebody adds.
 */
export const cardHeadlineOf = (route: SiteRoute): string =>
  route.title
    .split(TITLE_SEPARATOR)
    .filter((part) => part !== WORDMARK)
    .join(TITLE_SEPARATOR)

/**
 * The card, as words.
 *
 * Kept apart from the drawing of it because the drawing needs a font renderer
 * and this does not: what a shared link *says* is a decision about copy, and it
 * is asserted here against the route and the record rather than against a
 * picture nobody can diff.
 */
export type ShareCard = {
  readonly wordmark: string
  /**
   * What the rules said, as a pill in the top right — and never anything else.
   *
   * It was the route's nav label first, and the picture said why that was wrong:
   * `/how-it-works` printed *How it works* in the pill and *How it works* as the
   * headline, and `/the-record` opened its headline with the same three words as
   * its pill. A label a card repeats is not a label, it is a stammer.
   *
   * Leaving it off a published page is worth more than fixing the duplication
   * would have been. **A pill on this card now means the rules reached a verdict
   * about this exact page**, which is a thing a reader can learn from one glance
   * at two cards side by side, and could not have learned from a pill that was
   * always there saying where they were.
   */
  readonly eyebrow?: string
  /**
   * How the pill is painted, and it is the answer band's rule rather than a
   * second one: the accent belongs to a verdict the visitor can still act on,
   * and a refusal is an aside.
   *
   * The first card painted every verdict in the accent, which is the mistake
   * that shipped and was fixed on the band above the fold on 26 August — and it
   * is worse here, because a card is read at thumbnail size by someone who will
   * not read the word next to the color.
   */
  readonly tone?: "accent" | "neutral"
  readonly headline: string
  readonly supporting: string
  /**
   * The smallest true thing about this exact page, bottom left.
   *
   * Present only when the address carries a request, and then it is the
   * measurement — *"11 pieces moved, in 1 step."* — because that is the sentence
   * that makes the card evidence rather than a claim. A published page has no
   * such fact to offer and prints nothing rather than something rounded up.
   */
  readonly footnote?: string
  /** The address the card is of, as a reader would say it. Bottom right. */
  readonly address: string
}

/** `host/path`, with the scheme and the trailing slash a reader would not say. */
export const displayAddress = (origin: string, path: string): string => {
  const url = new URL(path, `${origin}/`)

  return `${url.host}${url.pathname === "/" ? "" : url.pathname}`
}

/**
 * The published page, as a card: the wordmark, the page's own title, its own
 * sentence, and where it lives. Nothing about the rules, because nothing has
 * been asked of it.
 */
export const publishedCard = (route: SiteRoute, origin: string): ShareCard => ({
  wordmark: WORDMARK,
  headline: cardHeadlineOf(route),
  supporting: route.description,
  address: displayAddress(origin, route.path),
})

/**
 * The front door as a visitor left it, as a card.
 *
 * The three lines are the three the answer band prints above the fold, in the
 * same order and off the same fields: the verdict as its label, the request
 * verbatim, and what the rules decided. That is deliberate — a card and the page
 * it opens should not be two accounts of one event — and it is what makes the
 * card impossible to write a sentence into.
 */
export const askedCard = (record: ChangeRecord, origin: string): ShareCard => ({
  wordmark: WORDMARK,
  eyebrow: record.verdictLabel,
  tone: toneFor(record),
  headline: `“${record.asked}”`,
  supporting: record.verdictLine,
  footnote: record.measured,
  address: displayAddress(origin, HOME.path),
})

/** What the address is asking for, when it is asking for anything. */
export type ShareContext = {
  readonly origin: string
  readonly theme: SiteThemeName
  readonly ask?: Ask
  readonly approve?: boolean
}

/**
 * Where the picture for this address lives.
 *
 * Everything the drawing needs is in the query string for the same reason
 * everything the *page* needs is: the image is a function of the address, so a
 * crawler fetching it a week later gets the picture of the page that address
 * opens, and two people sharing two arrangements cannot be served one card.
 *
 * The palette travels with it. A visitor who switched to a different palette and
 * sent the address they were looking at should get a card in the palette they
 * were looking at — which is also the plainest demonstration this site has that
 * a re-theme is three registered ids and nothing else.
 */
export const shareImageHref = (route: SiteRoute, context: ShareContext): string => {
  const url = new URL(SHARE_IMAGE_PATH, `${context.origin}/`)

  url.searchParams.set("page", route.path)
  url.searchParams.set("theme", context.theme)

  if (context.ask !== undefined && route.path === HOME.path) {
    url.searchParams.set("ask", context.ask.id)
    if (context.approve === true) url.searchParams.set("approve", "1")
  }

  return url.toString()
}

/**
 * The title and the sentence under it, in an unfurled card.
 *
 * On an address carrying a request, **the title is the request** — the words a
 * person typed, which is what that link is about and what its reader is being
 * shown. The description stays the front door's, because a stranger meeting this
 * in a channel still needs to be told what the product is; the request alone
 * would be a quotation from nowhere.
 *
 * The request cannot be anything a stranger wrote: `readAskId` resolves one of
 * five ids or nothing at all, so what reaches here is a string this repository
 * ships rather than a string a URL carried.
 */
const wordsFor = (
  route: SiteRoute,
  context: ShareContext
): { readonly title: string; readonly description: string } =>
  context.ask !== undefined && route.path === HOME.path
    ? { title: context.ask.utterance, description: HOME.description }
    : { title: route.title, description: route.description }

const OPEN_GRAPH_IMAGE = { width: 1200, height: 630 } as const

/**
 * Everything the document has to say about itself, for one address.
 *
 * **The canonical address is the page without the arrangement.** What a visitor
 * asked this page for is theirs and not a second page of this site — the bands
 * are the same bands in a different order — so `/?ask=problem` names `/` as the
 * page it is a view of. That is the honest answer and it costs the site nothing
 * it wanted: a canonical tag decides which address a search engine keeps, and it
 * has no bearing on what an unfurled card shows, which is the half this run is
 * actually for.
 */
export const pageMetadata = (route: SiteRoute, context: ShareContext): Metadata => {
  const { title, description } = wordsFor(route, context)
  const canonical = internalHref(context.origin, route.path)

  return {
    title,
    description,
    alternates: { canonical },
    /**
     * The other half of the preview's `noindex`, approved 27 September.
     *
     * `robots.txt` is a request a well-behaved crawler honours; this is the
     * instruction on the page itself, which is what an assistant fetching one
     * address without reading the root file sees. Both are needed and neither
     * is a substitute — the same distinction `robots.ts` already draws about
     * `Disallow` not being what keeps the portal shut.
     *
     * Omitted entirely on a public deployment rather than written as
     * `index: true`, because the default is index and a page saying so out loud
     * is a page with an opinion nobody needs to maintain.
     */
    ...(isPublicDeployment() ? {} : { robots: { index: false, follow: false } }),
    openGraph: {
      type: "website",
      siteName: WORDMARK,
      url: canonical,
      title,
      description,
      images: [{ ...OPEN_GRAPH_IMAGE, url: shareImageHref(route, context), alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [shareImageHref(route, context)],
    },
  }
}

/** The address a page is reached at, as Next hands it to a route's exports. */
export type PageSearchParams = Promise<Record<string, string | string[] | undefined>>

/**
 * The `generateMetadata` a page of this site exports, given the route it is.
 *
 * **Eight of the nine are this and nothing else**, because what a page unfurls
 * as is a function of the route and the palette and `pageMetadata` already takes
 * both. Written out per page it was twelve lines of identical glue, and twelve
 * lines of identical glue is how five pages came to have none of it: the layout
 * says *every page replaces everything a shared link unfurls as, in its own
 * `generateMetadata`*, and the pages added after that machinery landed copied
 * the shape of the page beside them — which did not have it — rather than the
 * shape of the comment. Nothing was red, because what was tested was
 * `pageMetadata`, and a page that never calls it fails no test of it.
 *
 * So what a tenth page copies is **one line naming its own route**, and there is
 * nothing in it left to leave out. The front door is the ninth and keeps its
 * own: its card is a function of what the visitor asked for as well, which is
 * the one thing this cannot take off an address it does not read.
 */
export const routeMetadata =
  (route: SiteRoute) =>
  async ({ searchParams }: { readonly searchParams: PageSearchParams }): Promise<Metadata> => {
    const params = await searchParams

    return pageMetadata(route, { origin: siteOrigin(), theme: readThemeName(params["theme"]) })
  }
