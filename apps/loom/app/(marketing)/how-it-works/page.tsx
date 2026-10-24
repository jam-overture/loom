import { askedFor } from "@/app/(marketing)/_lib/addressed"
import { renderSitePage } from "@/app/(marketing)/_lib/render"
import { servedOrigin } from "@/app/(marketing)/_lib/serving"
import { type PageSearchParams as SearchParams, routeMetadata } from "@/app/(marketing)/_lib/share"
import { HOW_IT_WORKS, siteOrigin } from "@/app/(marketing)/_lib/site"
import { BrowserBar } from "@/app/(marketing)/_components/browser-bar"
import { StructuredData } from "@/app/(marketing)/_components/structured-data"

/**
 * What this address unfurls as, which on this page is **the verdict the rules
 * reached**.
 *
 * The same factory every page of this site takes, and on this one it carries a
 * request, because this is the page a request is run against. That used to be
 * the front door and this page took a factory that read the palette and nothing
 * else — so for ten days the one page on this site that rearranges in front of
 * a visitor unfurled as a plain page, while the one that does not unfurled as a
 * request it would not act on. Both halves were correct on 30 September.
 *
 * What a link of this page says, by what is in its address:
 *
 * | address | the card |
 * | --- | --- |
 * | `/how-it-works` | the published page |
 * | `?ask=drop-pitch` | *Refused*, in the neutral tone, with the rule that refused it |
 * | `?ask=unstick-menu` | *Waiting for you*, because the rules held it |
 * | `…&approve=1&back=1` | *Waiting for you* again, on the putting-back |
 *
 * The last row is the one worth having. Nothing else on the internet unfurls as
 * a product declining to undo its own change until a person says yes, and until
 * today no address of this site could produce it: `ShareContext` carried two of
 * the four parameters, so the picture could not be drawn.
 */
export const generateMetadata = routeMetadata(HOW_IT_WORKS)

/**
 * The mechanism page, and which request it prints the record of.
 *
 * Read through `askedFor`, which is the one reader of an address on this site,
 * so a visitor who followed the panel's link is shown the record of the change
 * they just watched rather than of the one this page was written around. Until
 * 9 October this page read the address itself and read two of its four
 * parameters, so *Put it back* on the band below did nothing; `_lib/addressed.ts`
 * is that eight days, written down.
 */
const HowItWorksPage = async ({ searchParams }: { readonly searchParams: SearchParams }) => {
  const rendered = await renderSitePage(HOW_IT_WORKS, askedFor(await searchParams), {
    origin: await servedOrigin(),
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
      <StructuredData route={HOW_IT_WORKS} origin={siteOrigin()} />
      <BrowserBar theme={rendered.theme} />
      {rendered.element}
    </>
  )
}

export default HowItWorksPage
