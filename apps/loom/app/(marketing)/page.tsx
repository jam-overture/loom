import { askedFor } from "@/app/(marketing)/_lib/addressed"
import { renderSitePage } from "@/app/(marketing)/_lib/render"
import { servedOrigin } from "@/app/(marketing)/_lib/serving"
import { type PageSearchParams as SearchParams, routeMetadata } from "@/app/(marketing)/_lib/share"
import { HOME, siteOrigin } from "@/app/(marketing)/_lib/site"
import { BrowserBar } from "@/app/(marketing)/_components/browser-bar"
import { StructuredData } from "@/app/(marketing)/_components/structured-data"

/**
 * What this address unfurls as when somebody sends it to somebody else.
 *
 * **The shared factory, as of 11 October, and this page was the one exception
 * to it.** It had a `generateMetadata` of its own for eighteen lines of good
 * reason: the front door was not one page, `/?ask=problem&approve=1` was the
 * front door with a band lifted under the headline, and a card that showed the
 * published page for both would have been silent at exactly the moment this
 * site makes the claim nothing else can make.
 *
 * Every word of that was true until 1 October, when the band moved to
 * `/how-it-works`. After it, this page read a request it does not act on and
 * announced it — so a link to `/?ask=shorter&approve=1` unfurled as a request
 * and opened a page that had not been asked anything, which is the one thing
 * this site cannot afford to get wrong, because it is the claim.
 *
 * The factory reads the whole address and `pageMetadata` drops what this route
 * cannot use, so what is announced here is the published front door. The run
 * that used to be made to draw this card is made for `/how-it-works` now, by
 * the same function, off the same constant the renderer reads.
 */
export const generateMetadata = routeMetadata(HOME)

/**
 * The landing page: one tree, rendered.
 *
 * Everything a visitor can do to this site is in the address, which is what
 * makes the footer's re-theme link an ordinary navigation rather than client
 * state, and what lets a rearranged page be copied, bookmarked and shared
 * without two readers moving the site under each other. It is read here through
 * `askedFor`, the one reader, and read whole.
 *
 * **The palette is the only part of it this page is a function of**, and that is
 * a change of 1 October rather than a property: the band a request rearranges
 * moved to `/how-it-works`, and `pageTreeFor` runs a request for that page and
 * for no other. `addressed.test.ts` measures it — this page serves the same
 * markup asked or not — and it reads the rest of the address anyway, because the
 * last time a page here decided for itself which half of an address was worth
 * reading, the half it dropped was the half the band needed.
 *
 * The card is no longer drawn from the request either. It was until
 * 11 October, which made this page the only one announcing an arrangement it
 * does not serve; `generateMetadata` above is the shared factory and this route
 * is announced as the page it publishes.
 */
const HomePage = async ({ searchParams }: { readonly searchParams: SearchParams }) => {
  const rendered = await renderSitePage(HOME, {
    origin: await servedOrigin(),
    ...askedFor(await searchParams),
  })

  /**
   * The two tags beside the tree: the graph a crawler and an assistant read,
   * and the colour the strip of browser above the page is told to be.
   *
   * A fragment rather than a wrapper, so the page's own markup is unchanged and
   * the tree is still the whole of what a visitor *sees* — neither of these
   * draws anything. See `_components/structured-data.tsx` for why this surface
   * renders a tag of its own at all, and `_components/browser-bar.tsx` for the
   * one thing on this site that is allowed to name a colour, and why the page
   * rather than the layout is where it can be named.
   */
  return (
    <>
      <StructuredData route={HOME} origin={siteOrigin()} />
      <BrowserBar theme={rendered.theme} />
      {rendered.element}
    </>
  )
}

export default HomePage
