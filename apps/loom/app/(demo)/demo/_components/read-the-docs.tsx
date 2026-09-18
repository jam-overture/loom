"use client"

import Link from "next/link"

import { DOCS } from "@/app/(marketing)/_lib/site"

import { useFramed } from "./use-framed"

/**
 * The foot of the rail: the question a visitor only has *after* they have
 * watched a few changes land, and the honest destination for it.
 *
 * `/docs` rather than the portal, which is a review queue behind a sign-in
 * ([0019](../../../../../decisions/0019-the-portal-is-a-review-queue-not-a-cms.md))
 * — sending somebody who has just been told *no account, nothing kept* to a
 * sign-in page is a dead end. That argument is unchanged and it is why this
 * link exists.
 *
 * **Withdrawn inside a frame**, for the reason in `framed.ts`: the sandbox has
 * no `allow-top-navigation` and no `allow-popups`, so the only thing this
 * anchor can do in a box is load the documentation site *into the box* — a
 * second full navigation bar inside a 1078 × 673 rectangle on somebody else's
 * landing page, with the way back being a browser control the visitor does not
 * know applies to a rectangle.
 *
 * It is the weaker of the two withdrawals and worth saying why it is still
 * right. The wordmark's destination is the page the visitor is already on, so
 * withdrawing it costs nothing at all. This one has a real destination, and
 * withdrawing it costs a framed visitor the demonstration's one forward step.
 * What makes that the better trade is who is framing: the band that embeds this
 * puts **Open it full size** *above* the frame rather than below it, precisely
 * so the reader who cannot work inside the box meets the way out before the box
 * — and any host with a menu has a documentation link in it. A door that opens
 * into the room you are standing in is not a way out of the room, and offering
 * one is the silently-dead control this whole demonstration argues against.
 *
 * The sentence underneath it stays either way. *No account, no sign-in, nothing
 * kept* is a claim about what this surface does with a visitor, and it is at
 * least as worth making to somebody who arrived without choosing to.
 */
export const ReadTheDocs = () => {
  const framed = useFramed()

  if (framed) return null

  return (
    <Link
      href={DOCS.path}
      className="text-ink-secondary hover:text-ink group inline-flex items-center gap-1.5 text-xs transition-colors"
    >
      Want this on a page of your own? Read the docs
      <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">
        →
      </span>
    </Link>
  )
}
