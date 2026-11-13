/**
 * The file `/why-use-it` prints under *On your own site*, as the text the page
 * renders.
 *
 * ## The hole this fills, and it is the one between the last two bands
 *
 * This page walks the maintainer's six links in his order, and by the foot of
 * it a reader has been shown: the parts that come with the install, the two
 * files that add one of their own, a page made out of them, what that page
 * reports, the function that brings their model, the same page arranged for
 * somebody else, and the record of what allowed the change.
 *
 * Every one of those happens somewhere. **Nothing on this site said where.**
 * A reader who believes all of it still does not know what goes in
 * `app/page.tsx`, and `renderLoomTree` — the seam every claim above rests on —
 * was printed nowhere a visitor could read it. The site showed a reader how to
 * write a component, how to register it and how to connect a model, and never
 * how to serve a page.
 *
 * ## What the panel is allowed to claim, and where that comes from
 *
 * [0361](../../../../../decisions/0361-the-site-pulls-into-its-own-process-and-a-host-wires-the-live-page-in-two-calls.md),
 * clause 2, in its own words:
 *
 * > *"The whole of a host's integration is two calls. One at startup —
 * > `startPullingLivePages({ deployment, key })` … — and one where a page is
 * > rendered: `livePageOf(live.held(), builtTree.treeId) ?? builtTree`. **The
 * > `??` is the fallback, entire.**"*
 *
 * And [0358](../../../../../decisions/0358-an-accepted-change-goes-live-from-the-portal-and-the-site-pulls-it-with-no-pull-request.md),
 * which is what makes the second sentence of the copy a fact rather than a
 * promise: *"there is no pull request, no merge and no deploy between somebody
 * accepting a change and a reader seeing it."* The published entry point says
 * the same thing in its own first paragraph.
 *
 * **It is the pitch half and not the under-the-hood half.** `docs/positioning.md`
 * puts *the rules, the record, the undo, the refusals* under the hood and
 * *what you can build, and why building it this way beats how you do it now*
 * in front. A copy change that is live without shipping anything is the second
 * of those: it is a claim about a reader's working day, not about governance.
 *
 * ## Why the source is a constant here and a file beside it
 *
 * `written.ts` carries the whole argument and nothing about it is different
 * here. `wired/page.tsx` is a real module the gate compiles against the
 * published API, this is the text the page renders, and `wired.test.ts` holds
 * the two together. Every marketing route is `force-dynamic` by
 * [0331](../../../../../decisions/0331-a-marketing-page-is-served-per-request-because-the-store-governs-it.md),
 * so a `readFileSync` at render time would run in a deployed function with no
 * repository under it and fail only once shipped.
 *
 * **How far the check goes is `connected.test.ts`' standard rather than
 * `written.test.ts`'.** The registration panel is proved by being accepted
 * through the door a deployment uses. This one is proved by being **run**: the
 * test starts a server that answers the live-pages door, points the specimen at
 * it, renders the page, and reads the heading out of the markup. Serving the
 * page Loom answered with rather than the page the code built is the band's
 * claim, and it is the thing asserted.
 */

/** The marker in the specimen; everything after it is what the site prints. */
export const SHOWN_MARKER = "// ── shown on the site ──"

export type WiredFile = {
  /** What the panel is captioned with, which is the filename a reader would use. */
  readonly caption: string
  /** The specimen this came from, relative to this directory. */
  readonly from: string
  /** The published region of that file, exactly. */
  readonly source: string
}

/**
 * The route, and it is the whole of what a host writes to serve a Loom page.
 *
 * Three things in it are worth a reader's attention and the copy around the
 * panel names each: the loop is at module scope because it belongs to the
 * server rather than to a request; `?? homePage` is the entire fallback, so a
 * Loom that has never answered and a page it does not know are the same case;
 * and the page is drawn by the host's own registry, which is the one from three
 * bands above with their own component in it.
 *
 * ## The two lines a reader has to change, which the panel used to hide
 *
 * The address and the key are read off `process.env`, with the names the
 * published entry point's own example reads. **Until today they were not**: the
 * panel took them from an object in `wired/loom.ts`, because
 * `tools/sources/deployment.ts` had no way to tell a printed specimen from a
 * setting this deployment has, and the band carried a sentence saying *the
 * address and the key come out of your environment* in place of lines that did
 * not say it. `wired/loom.ts` has what closed that
 * ([0379](../../../../../decisions/0379-a-file-may-publish-part-of-its-body-as-somebody-elses-code-and-a-check-that-reads-this-deployment-stops-at-the-marker.md)).
 *
 * **The sentence came off with the workaround**, which is the part worth
 * reading twice: it was nine words paying for an indirection, on the panel
 * whose whole value is being exactly the file a reader writes. A panel that
 * needs prose to say what its own code would have said is the thing to notice,
 * and it is nine words back on a page that had 34 left.
 */
export const YOUR_ROUTE: WiredFile = {
  caption: "app/page.tsx",
  from: "wired/page.tsx",
  source: `import { livePageOf, startPullingLivePages } from "@jam-overture/loom/live"
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

export default Page`,
}

export const WIRED_FILES: readonly WiredFile[] = [YOUR_ROUTE]

/** The language the panel declares. It is a React component, so it is `tsx`. */
export const WIRED_LANGUAGE = "tsx"

/**
 * The two names the copy under the panel quotes, read off the panel rather than
 * typed into the sentence twice.
 *
 * They are the two calls 0361 clause 2 names, and `wired.test.ts` holds each of
 * them to being in the source the sentence sits over. A sentence naming a
 * function the panel does not call is the failure this exists to stop.
 */
export const THE_TWO_CALLS: readonly string[] = ["startPullingLivePages", "livePageOf"]
