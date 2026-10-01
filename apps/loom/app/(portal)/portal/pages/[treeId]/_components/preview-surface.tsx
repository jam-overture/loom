"use client"

import { useEffect, useRef, type MouseEvent, type ReactNode } from "react"

import type { NodeId } from "@jam-overture/loom"
import { addressedNodeId, LOOM_NODE_ATTRIBUTE } from "@jam-overture/loom/react"

import { useSelection } from "./selection-context"

/**
 * The rendered tree, made selectable without being re-rendered.
 *
 * Its children are elements a Server Component produced, so this cannot pass a
 * selected flag down into them — and should not want to. 0010 fixed that edit
 * mode decorates rather than restructures, and the decoration is already in the
 * DOM: one attribute on the matching element is the whole of selection, and it
 * changes no markup that anyone laid out.
 *
 * Clicks are read the same way, by delegation. A listener per node would mean
 * the runtime attaching behavior to primitives it does not own.
 *
 * ## Several at once, as of phase 2
 *
 * The attribute goes on every picked part rather than on one, which is the whole
 * of what marking a set costs here — and it is why the marking was written as
 * *clear every one of them, then set the ones that are picked* rather than as
 * *move the mark*. Two parts of a page can be outlined at the same time without
 * anything in this component knowing how many there are.
 *
 * The ids are joined into one string for the dependency list, because the array
 * is rebuilt on every render and an effect comparing arrays by identity would
 * re-mark the page on every keystroke in the prompt box below. The ids cannot
 * contain the separator: `nodeIdSchema` is `n_` and an alphabet that excludes it.
 *
 * **A click on the page itself, and not on any part of it, lets everything go.**
 * That is the one gesture a toggling selection needs that toggling cannot
 * express, and it is the behavior every canvas and file list already has.
 */

/** Portal-side and presentational: the runtime emits identity, not state. */
const SELECTED_ATTRIBUTE = "data-loom-selected"

export const PreviewSurface = ({ children }: { readonly children: ReactNode }) => {
  const { picked, pick, clear } = useSelection()
  const surface = useRef<HTMLDivElement>(null)

  const marks = picked
    .map((row) => addressedNodeId(row.addressing))
    .filter((nodeId): nodeId is NodeId => nodeId !== null)
    .join(" ")

  useEffect(() => {
    const root = surface.current
    if (!root) return

    const previous = root.querySelectorAll(`[${SELECTED_ATTRIBUTE}]`)
    for (const element of previous) element.removeAttribute(SELECTED_ATTRIBUTE)

    /**
     * A miss is expected rather than exceptional: `addressNode` answers from the
     * tree and the registry, and a primitive the conformance probe could not judge
     * (0012) may still turn out not to decorate. The DOM is the last word.
     */
    for (const nodeId of marks === "" ? [] : marks.split(" ")) {
      root
        .querySelector(`[${LOOM_NODE_ATTRIBUTE}="${nodeId}"]`)
        ?.setAttribute(SELECTED_ATTRIBUTE, "true")
    }
  }, [marks])

  const onClick = (event: MouseEvent<HTMLDivElement>) => {
    const { target } = event
    if (!(target instanceof Element)) return

    const nodeId = target.closest(`[${LOOM_NODE_ATTRIBUTE}]`)?.getAttribute(LOOM_NODE_ATTRIBUTE)

    if (nodeId === null || nodeId === undefined) {
      clear()

      return
    }

    pick(nodeId)
  }

  return (
    <div ref={surface} onClick={onClick} className="loom-preview">
      {children}
    </div>
  )
}
