import { redirect } from "next/navigation"

import { requireActor } from "@/app/(portal)/_lib/auth/identity"

/**
 * The front door, which is a redirect for exactly as long as the workspace is a
 * prototype.
 *
 * Unit 0 deleted the screen that was here — a reviewer's landing page listing
 * the places a change might be waiting — along with nineteen others
 * ([`docs/portal.md`](../../../../../docs/portal.md)). What replaces it is the
 * shape the portal is being rebuilt into rather than a smaller version of what
 * was removed, and that shape is `/portal/preview`: a workspace of projects,
 * each saying whether it is receiving, how much, how much went wrong and what
 * is waiting on somebody.
 *
 * **It redirects rather than renders**, and the reason is the banner. The
 * workspace runs on invented data until unit 3, and the one rule this plan will
 * not bend is that no screen ships numbers nobody produced. The prototype keeps
 * its own route and its own banner saying so; copying its body up here would
 * serve the same fiction from an address that does not admit it.
 *
 * **It guards itself rather than taking an exemption.** A signed-out visitor
 * could be left to bounce off the workspace's own `requireActor`, and the
 * difference is where they come back to: guarded here, sign-in returns them to
 * `/portal`, which is the address they typed and the one that will be the
 * workspace. `guarded-pages.test.ts` holds every page in this group to this,
 * and the exemption list is for pages with nothing behind them.
 *
 * **This file disappears at unit 3**, when the workspace is wired to real
 * projects and moves here for good. A redirect that becomes a page is a smaller
 * change than a page that has to be un-written.
 */
const PortalFrontDoor = async () => {
  await requireActor("/portal")

  redirect("/portal/preview")
}

export default PortalFrontDoor
