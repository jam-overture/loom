"use client"

import { useEffect, useRef, type ReactNode } from "react"

import { LOOM_NODE_ATTRIBUTE } from "@jam-overture/loom/react"

import type { Mark } from "@/app/(portal)/_lib/proposed-view"

/**
 * A drawn page, with the parts a change is about outlined on it.
 *
 * Its children are elements a Server Component produced, so this cannot pass a
 * flag down into them — and, exactly as `preview-surface.tsx` argues for
 * selection, should not want to. 0010 fixed that edit mode **decorates and never
 * invents DOM**: the identity is already on the element as `data-loom-node`, and
 * one attribute beside it is the whole of a mark. Nothing anybody laid out moves.
 *
 * This is the third component in the portal to mark a rendered page this way and
 * the pattern is the same one deliberately, because the alternative is two
 * overlays that disagree about which element an id addresses.
 *
 * ## Why the marks are cleared before they are set
 *
 * A reviewer can walk from one held change to the next without this component
 * unmounting — same route, different `proposalId` — so the effect has to be able
 * to take a mark *off* a part that the previous change was about and this one is
 * not. Setting without clearing would accumulate the union of every change
 * looked at in one visit, which is the quietest possible way to outline a part
 * nothing is going to happen to.
 *
 * The marks are joined into one string for the dependency list, because the array
 * is rebuilt on every render and an effect comparing arrays by identity would
 * re-mark the page on every one of them. The separator cannot occur in either
 * half: a `MarkKind` is one of four words and `nodeIdSchema` is `n_` and an
 * alphabet that excludes both the space and the colon.
 *
 * ## A mark that finds nothing is expected
 *
 * A text node has no element of its own, and a primitive the conformance probe
 * could not judge (0012) may turn out not to decorate. So a miss is ordinary
 * rather than exceptional, and it is the reason the legend beside these pictures
 * counts parts from the change's own operations instead of from what got
 * outlined. The picture is an aid to the eye; the sentences under it are the
 * account.
 */

/** Portal-side and presentational: the runtime emits identity, not what is about to happen to it. */
const MARK_ATTRIBUTE = "data-loom-mark"

export const MarkedPage = ({
  marks,
  children,
}: {
  readonly marks: readonly Mark[]
  readonly children: ReactNode
}) => {
  const surface = useRef<HTMLDivElement>(null)
  const wanted = marks.map((mark) => `${mark.nodeId}:${mark.kind}`).join(" ")

  useEffect(() => {
    const root = surface.current
    if (!root) return

    for (const element of root.querySelectorAll(`[${MARK_ATTRIBUTE}]`)) {
      element.removeAttribute(MARK_ATTRIBUTE)
    }

    for (const mark of wanted === "" ? [] : wanted.split(" ")) {
      const [nodeId, kind] = mark.split(":")

      root
        .querySelector(`[${LOOM_NODE_ATTRIBUTE}="${nodeId}"]`)
        ?.setAttribute(MARK_ATTRIBUTE, kind ?? "")
    }
  }, [wanted])

  return (
    <div ref={surface} className="loom-marked">
      {children}
    </div>
  )
}
