/**
 * The file `/why-use-it` prints under *On your own site*, and the point of this
 * one is that a reader recognises it as a route they have written before.
 *
 * ## The step this site had never shown
 *
 * `written/` shows the two files that add a component. `connected/` shows the
 * function that brings a model. Between them the site had a hole the size of
 * the thing a reader has to do next: **nothing on this surface showed how a
 * Loom page gets onto a route.** The chain's third link is *Loom designed web
 * page* and it lands on a band that renders one; the band underneath says what
 * the page reports; and no page, band or panel said what a reader puts in
 * `app/page.tsx` to have any of it.
 *
 * `renderLoomTree` is the published seam every one of those claims rests on,
 * and before today it was not printed anywhere a visitor could read it.
 *
 * ## Why the pull is in the same file and not a band of its own
 *
 * Because it is three lines of the same file, and splitting them would make two
 * weak bands out of one that answers the question a reader actually has.
 * [0361](../../../../../../decisions/0361-the-site-pulls-into-its-own-process-and-a-host-wires-the-live-page-in-two-calls.md)
 * decided the shape: *"The whole of a host's integration is two calls."* One at
 * startup and one where a page is rendered, with `??` as the entire fallback.
 * A reader who has just been shown a page rearranged for somebody else
 * ([`forAReader`](../pages/why-use-it.ts)) and the record of what allowed it
 * has exactly one question left, and it is **how does that reach my site**.
 * This file is the answer and it is short enough to be the answer.
 *
 * ## `live` is at module scope deliberately, and the copy says why
 *
 * One loop per server rather than one per reader (0361 clause 1), which is the
 * one thing in this panel a reader could get wrong in a way that costs them
 * requests rather than correctness. Put inside the component it would start a
 * pull loop on every render. The band's copy names it.
 *
 * ## Everything below the marker is published
 *
 * Same arrangement, and the same reasons, as `written/price-tag.tsx`: no
 * comments under the marker, nothing clever, and the imports inside the region
 * so a reader can see which package each name comes from. `homePage` and
 * `components` come from `./loom` beside this file, which is scaffolding rather
 * than a claim about how a host arranges their own application.
 *
 * ## The address and the key are read off `process.env`, which is the point
 *
 * This is the one line of the panel a reader has to change, and the panel
 * landed on 10 November without it. For the two days since, the two values came
 * out of a mutable object in `wired/loom.ts`, because the sweep that reads this
 * deployment's settings could not tell a printed specimen from a setting the
 * Loom site has. `wired/loom.ts` carries what that cost and what closed it.
 * [0379](../../../../../../decisions/0379-a-file-may-publish-part-of-its-body-as-somebody-elses-code-and-a-check-that-reads-this-deployment-stops-at-the-marker.md)
 * stops that sweep at the marker below, so the panel prints the two reads the
 * published entry point's own example prints and the band needs no sentence
 * standing in for them.
 *
 * ## The registry is called `components` here, and the rule says so
 *
 * `voice.test.ts` sweeps the text inside every source panel for the words this
 * site may not say to a stranger, and `registry` is one of them — the same list
 * that keeps *primitive* and *tree* off the page. `_lib/registry.ts` is what
 * this site calls its own, and that file is not printed to anybody.
 *
 * So the binding is named for what it holds, which is the word the site already
 * uses three bands above: *Loom keeps a list of the components an AI model is
 * allowed to use.* The rename is the rule working rather than the rule being
 * worked around: a reader meets the same word in the copy and in the code.
 *
 * `wired.test.ts` renders this page against a server answering the live-pages
 * door, which is what makes the band's claim a measurement rather than a
 * transcription.
 */

// ── shown on the site ──
import { livePageOf, startPullingLivePages } from "@jam-overture/loom/live"
import { renderLoomTree } from "@jam-overture/loom/react"

import { components, homePage } from "./loom"

const live = startPullingLivePages({
  deployment: process.env.LOOM_URL ?? "",
  key: process.env.LOOM_PROJECT_KEY ?? "",
})

const Page = async () => {
  const page = livePageOf(await live.ready(), homePage.treeId) ?? homePage

  return renderLoomTree(page, {
    resolver: components,
    validator: components,
  }).element
}

export default Page
