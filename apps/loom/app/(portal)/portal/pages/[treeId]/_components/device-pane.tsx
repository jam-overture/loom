"use client"

import Link from "next/link"
import { useCallback, useEffect, useRef, useState } from "react"

import type { NodeId } from "@jam-overture/loom"
import { addressedNodeId, LOOM_NODE_ATTRIBUTE } from "@jam-overture/loom/react"

import {
  surfaceAddress,
  viewportAddress,
  VIEWPORTS,
  type Viewport,
} from "@/app/(portal)/_lib/viewports"

import { useSelection } from "./selection-context"

/**
 * The page, at the size somebody reads it on.
 *
 * ## What it is for
 *
 * A reviewer is being asked to say yes or no to a change to a page, and *does
 * this hold up on a phone* is one of the two or three questions that actually
 * decides the answer. Until now the preview was one width — the width of
 * whatever was left over beside the outline — which is a width nobody is served.
 *
 * ## Why an iframe, which is the only interesting decision here
 *
 * Because a screen size is a **viewport**, and only a document has one.
 *
 * Most of the primitive library responds with `@container`, and a fixed-width
 * box would satisfy every one of those rules. Three are still viewport `@media`,
 * and one of them folds `loom.nav`'s destinations behind a button below 48rem.
 * A box 390 pixels wide changes no viewport — so the cheap version of this pane
 * would draw a phone-width page wearing a desktop navigation bar, which is the
 * plausible-false-picture failure this lane keeps writing findings about. It
 * would be wrong in exactly the place a reviewer came to look.
 *
 * `…/surface` is that document. Nothing about the render differs: same source,
 * same resolver, same validator, same edit-mode decoration.
 *
 * ## Selection still works, and it costs almost nothing
 *
 * Because picking was never React state reaching into the tree — 0010 made edit
 * mode decorate rather than restructure, so a pick is one attribute on one
 * element and a click is read by delegation. Both of those cross a same-origin
 * document boundary unchanged: `contentDocument.querySelector` for the mark,
 * one listener on `contentDocument` for the click. The work was done in 2026-08
 * by whoever decided not to pass a selected flag down.
 *
 * What does change is **when**: the document loads asynchronously and reloads
 * when the size changes, so marking waits for `load` rather than running on
 * mount. A mark applied to the previous document is a mark on a page that is
 * being replaced.
 *
 * ## Scaled to fit, and the scale is said out loud
 *
 * A desktop page is 1280 wide and this pane is not. Scaling is what every device
 * emulator does and it is honest — the page is laid out at the real width and
 * then drawn smaller, so nothing about the layout is a guess. What would not be
 * honest is leaving a reader to assume the text is that size, so the percentage
 * is on the frame.
 */
export const DevicePane = ({
  treeId,
  viewport,
}: {
  readonly treeId: string
  readonly viewport: Viewport
}) => {
  const { picked, pick, clear } = useSelection()
  const stage = useRef<HTMLDivElement>(null)
  const frame = useRef<HTMLIFrameElement>(null)
  const [scale, setScale] = useState(1)
  const [loaded, setLoaded] = useState(false)

  const marks = picked
    .map((row) => addressedNodeId(row.addressing))
    .filter((nodeId): nodeId is NodeId => nodeId !== null)
    .join(" ")

  /*
   * The document is replaced when the size changes, so anything attached to the
   * old one is gone. `loaded` is reset here rather than in the `onLoad` handler
   * because the gap between the two is a window in which the effects below
   * would otherwise reach into a document that is on its way out.
   */
  useEffect(() => setLoaded(false), [viewport.name])

  /** Fit the device to the pane, never magnify it past its own size. */
  useEffect(() => {
    const element = stage.current
    if (!element) return

    const measure = () =>
      setScale(Math.min(1, element.clientWidth / viewport.width))

    measure()

    const observer = new ResizeObserver(measure)
    observer.observe(element)

    return () => observer.disconnect()
  }, [viewport.width])

  /**
   * The mark, applied inside the document rather than passed into it.
   *
   * Same two lines the inline surface used, against `contentDocument`. A
   * cross-origin frame would throw here; this one is served by the same origin
   * on purpose, and that is the whole of what makes a pane like this buildable
   * without a message protocol.
   */
  useEffect(() => {
    const inside = frame.current?.contentDocument
    if (!loaded || !inside) return

    for (const element of inside.querySelectorAll("[data-loom-selected]")) {
      element.removeAttribute("data-loom-selected")
    }

    for (const nodeId of marks === "" ? [] : marks.split(" ")) {
      inside
        .querySelector(`[${LOOM_NODE_ATTRIBUTE}="${nodeId}"]`)
        ?.setAttribute("data-loom-selected", "true")
    }
  }, [marks, loaded])

  /**
   * Clicks, by delegation, exactly as before — and a click on the page itself
   * and not on any part of it still lets everything go, which is the gesture a
   * toggling selection cannot express any other way.
   */
  useEffect(() => {
    const inside = frame.current?.contentDocument
    if (!loaded || !inside) return

    const onClick = (event: Event) => {
      const { target } = event
      if (!(target instanceof Element)) return

      const nodeId = target.closest(`[${LOOM_NODE_ATTRIBUTE}]`)?.getAttribute(LOOM_NODE_ATTRIBUTE)

      if (nodeId === null || nodeId === undefined) clear()
      else pick(nodeId)
    }

    inside.addEventListener("click", onClick)

    return () => inside.removeEventListener("click", onClick)
  }, [loaded, pick, clear])

  const onLoad = useCallback(() => setLoaded(true), [])

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <nav aria-label="Screen size" className="flex flex-wrap items-center gap-1 text-xs">
          {VIEWPORTS.map((option) =>
            /*
             * The size you are on is text, not a link. A link to the thing you
             * are already looking at is a promise that something will happen.
             */
            option.name === viewport.name ? (
              <span
                key={option.name}
                aria-current="true"
                className="bg-surface-hover rounded-sm px-2 py-1 font-medium"
                title={option.meaning}
              >
                {option.label}
              </span>
            ) : (
              <Link
                key={option.name}
                href={viewportAddress(treeId, option.name)}
                scroll={false}
                className="text-ink-muted hover:bg-surface-hover rounded-sm px-2 py-1 no-underline"
                title={option.meaning}
              >
                {option.label}
              </Link>
            )
          )}
        </nav>

        <p className="text-ink-muted text-2xs">
          {viewport.width} × {viewport.height}
          {scale < 1 && ` · shown at ${Math.round(scale * 100)}%`}
        </p>
      </div>

      <p className="text-ink-muted text-xs">{viewport.meaning}</p>

      <div
        ref={stage}
        className="bg-surface-preview border-edge-subtle overflow-hidden rounded-md border p-4"
      >
        {/*
          * The frame is laid out at the scaled size and the document inside it
          * at the real one. Reserving the unscaled height would leave a column
          * of empty pane under a phone that is a third of the height it claims.
          */}
        <div
          style={{ height: viewport.height * scale, width: viewport.width * scale }}
          className="mx-auto"
        >
          <iframe
            ref={frame}
            onLoad={onLoad}
            src={surfaceAddress(treeId, viewport.name)}
            title={`Your page at ${viewport.label} size`}
            width={viewport.width}
            height={viewport.height}
            style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}
            className="border-edge-subtle bg-surface-base block rounded-sm border"
          />
        </div>
      </div>
    </div>
  )
}
