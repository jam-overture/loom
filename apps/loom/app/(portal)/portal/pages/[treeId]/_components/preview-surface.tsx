"use client"

import { useEffect, useRef, type MouseEvent, type ReactNode } from "react"

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
 * the runtime attaching behaviour to primitives it does not own.
 */

/** Portal-side and presentational: the runtime emits identity, not state. */
const SELECTED_ATTRIBUTE = "data-loom-selected"

export const PreviewSurface = ({ children }: { readonly children: ReactNode }) => {
  const { selected, select } = useSelection()
  const surface = useRef<HTMLDivElement>(null)

  const addressed = selected ? addressedNodeId(selected.addressing) : null

  useEffect(() => {
    const root = surface.current
    if (!root) return

    const previous = root.querySelectorAll(`[${SELECTED_ATTRIBUTE}]`)
    for (const element of previous) element.removeAttribute(SELECTED_ATTRIBUTE)

    if (addressed === null) return

    /**
     * A miss is expected rather than exceptional: `addressNode` answers from the
     * tree and the registry, and a primitive the conformance probe could not judge
     * (0012) may still turn out not to decorate. The DOM is the last word.
     */
    root.querySelector(`[${LOOM_NODE_ATTRIBUTE}="${addressed}"]`)?.setAttribute(SELECTED_ATTRIBUTE, "true")
  }, [addressed])

  const onClick = (event: MouseEvent<HTMLDivElement>) => {
    const { target } = event
    if (!(target instanceof Element)) return

    select(target.closest(`[${LOOM_NODE_ATTRIBUTE}]`)?.getAttribute(LOOM_NODE_ATTRIBUTE) ?? null)
  }

  return (
    <div ref={surface} onClick={onClick} className="loom-preview">
      {children}
    </div>
  )
}
