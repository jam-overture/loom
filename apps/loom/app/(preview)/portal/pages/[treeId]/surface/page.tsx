import { notFound } from "next/navigation"

import { treeIdSchema } from "@jam-overture/loom"
import { renderRequest } from "@jam-overture/loom/react"
import { treeSourceFromStore } from "@jam-overture/loom/store"

import { currentActor } from "@/app/(portal)/_lib/auth/identity"
import { portalRegistry } from "@/app/(portal)/_lib/registry"
import { ensureSeeded, portalStore } from "@/app/(portal)/_lib/store"

/**
 * One page, drawn alone, for the pane that sizes it.
 *
 * ## It is the same render, in a different document
 *
 * Same source, same resolver, same validator, same `editMode` — so the pane and
 * the outline beside it cannot disagree about what is on the page, which is the
 * property `/portal/pages/[treeId]` has always had and must keep. The only thing
 * that differs is where the markup lands: in a document of its own, so that it
 * has a viewport of its own, so that a reader asking for *a phone* gets a page
 * laid out at a phone's width rather than a box that is merely narrow.
 *
 * `editMode` is on for the same reason it is on next door: it decorates rather
 * than restructures (0010), so every element carries `data-loom-node` and the
 * pane can read a click without the runtime attaching behaviour to primitives it
 * does not own.
 *
 * ## What it is not
 *
 * **Not a way to serve a page to the public.** It is behind the portal's
 * session, it answers for a signed-in reviewer only, and it carries edit-mode
 * decoration a served page never would. A deployment serving its pages for real
 * does that through its own route; this is the review surface looking at its
 * own subject.
 *
 * **Not addressable by hand, usefully.** Nothing links here and nothing should:
 * it is the inside of a frame. Opening it directly gives a bare page on a
 * transparent background, which is correct and is not a screen.
 */
export const dynamic = "force-dynamic"

const SurfacePage = async ({ params }: { params: Promise<{ treeId: string }> }) => {
  /*
   * Not `requireActor`, which redirects to the sign-in form. A redirect inside
   * an iframe draws the login screen inside somebody's page preview, which
   * reads as *your page now looks like this*. A reviewer whose session has
   * ended gets nothing here and is told by the screen around it.
   */
  if ((await currentActor()) === null) notFound()

  const { treeId } = await params
  const parsed = treeIdSchema.safeParse(treeId)

  if (!parsed.success) notFound()

  await ensureSeeded()

  const rendered = await renderRequest(
    { treeId: parsed.data, editMode: true },
    {
      source: treeSourceFromStore(portalStore),
      resolver: portalRegistry,
      validator: portalRegistry,
    }
  )

  /*
   * A failure is nothing at all here, deliberately. The screen around this
   * frame already reads the same tree and already says what went wrong, in its
   * own words, with the reassurance that drawing a page only reads it. A second
   * failure notice drawn *inside* the device frame would read as a claim about
   * the page at that size — "your page is broken on a phone" — which is the one
   * thing this pane must never say by accident.
   */
  if (!rendered.ok) notFound()

  /*
   * `loom-preview` is what the portal's own stylesheet keys its hover and
   * selection outlines off. It is the one portal-side class that has to cross
   * into this document, and it carries no layout — the rules it matches are
   * `outline` and nothing else.
   */
  return <div className="loom-preview">{rendered.value.element}</div>
}

export default SurfacePage
