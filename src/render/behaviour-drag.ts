"use client"

import {
  createElement,
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react"

import { DRAG_SCOPE_ATTRIBUTE, DRAG_VALUE_PROPERTY } from "./behaviour.js"

/**
 * The third control in the runtime that runs on the client, and the first whose
 * whole output is a *number*.
 *
 * `copy` acts on the node's text and `disclose` acts on nothing — it says open
 * or closed and the primitive's rule decides what that means. Both are complete
 * in themselves. A wipe is not: dragging a divider is only interesting if
 * something moves with it, and the thing that moves is a `clip-path` on a layer
 * this control has never heard of, in markup the primitive owns
 * ([0086](../../decisions/0086-a-behaviour-is-a-control-the-runtime-builds-and-a-primitive-places.md)
 * says the runtime never reaches into that).
 *
 * So the value travels the only way a value can travel from an element to its
 * ancestors' other subtrees without anybody holding a reference to anybody:
 * **a custom property on a scope the primitive marked.** The primitive stamps
 * `data-loom-drag` on the box that encloses both this control and whatever the
 * number moves, and writes its own rules against `var(--loom-drag)`. This
 * control walks up to that box and sets the property on it. Nothing else passes
 * between them — no ref, no callback, no shared component.
 *
 * **It renders an inert placeholder before it renders itself**, which is where
 * it departs from the other two. They return `null` until an effect proves the
 * capability, because what they need — a clipboard, scripting at all — can be
 * asked about without a DOM. This one needs to know whether it is *inside a
 * scope*, and only a mounted element can answer that. So the first render is a
 * `hidden` span holding the ref, and the control appears in its place once the
 * scope is found. A span with `hidden` is out of the layout and out of the
 * accessibility tree, so a page served with scripting off gets the still
 * version and nothing else — the divider where the primitive's own `var()`
 * fallback puts it, and no handle suggesting otherwise.
 *
 * **Outside a scope it stays a placeholder.** A slider that publishes into
 * nothing is precisely the control the finding behind 0086 refused: it looks
 * draggable, it drags, and the picture does not move. The conformance probe
 * reports the same fault at registration as `unscopedBehaviours`, so this is
 * the second line of defence rather than the first.
 */

export type DragControlProps = {
  /**
   * The control's name, in the language this deployment serves. One string:
   * a slider is called the same thing wherever it happens to be, and its
   * position is carried by `aria-valuenow` rather than by its name.
   */
  readonly label: string
}

/**
 * The full sweep, not the 5–95 a `loom.before-after` prop is bounded to. That
 * bound is about what a *proposal* may write, where an edge at the end is a
 * comparison with one side missing and `remove` says it better. A reader
 * dragging to the end is looking at one picture on purpose, and taking that
 * away would make the control feel broken at exactly the moment somebody is
 * using it hardest.
 */
const MIN = 0
const MAX = 100

/** One per press, ten per page — the ARIA slider pattern's own two sizes. */
const STEP = 1
const COARSE_STEP = 10

/** Where the control starts when the scope names no value of its own. */
const FALLBACK_VALUE = 50

const clamp = (value: number): number => Math.min(MAX, Math.max(MIN, Math.round(value)))

const scopeOf = (element: HTMLElement | null): HTMLElement | null =>
  element?.closest<HTMLElement>(`[${DRAG_SCOPE_ATTRIBUTE}]`) ?? null

/**
 * The number the scope already carries, so the control starts where the page
 * looks rather than jumping on the first key press.
 *
 * Inline first, computed second, and the order matters. The inline style is
 * where a primitive that renders its position per node writes it, and it is the
 * only one of the two that a server render puts in the markup. The computed
 * value catches a primitive that declares the property in a stylesheet instead
 * (0055's shape), where there is nothing inline to read.
 */
const publishedValue = (scope: HTMLElement): number | undefined => {
  const inline = scope.style.getPropertyValue(DRAG_VALUE_PROPERTY).trim()
  const declared =
    inline !== ""
      ? inline
      : typeof getComputedStyle === "function"
        ? getComputedStyle(scope).getPropertyValue(DRAG_VALUE_PROPERTY).trim()
        : ""

  if (declared === "") return undefined

  const parsed = Number(declared)

  return Number.isFinite(parsed) ? clamp(parsed) : undefined
}

/**
 * Which way "forward" points. A wipe is placed with `insetInlineStart` and
 * clipped from the inline start, so under `direction: rtl` the whole comparison
 * is mirrored and a pointer on the right edge means zero. The arrow keys follow
 * the same mirror, which is what the ARIA slider pattern says and what a reader
 * in a right-to-left page expects: the key that moves towards the start of the
 * line decreases.
 */
const isMirrored = (scope: HTMLElement): boolean =>
  typeof getComputedStyle === "function" && getComputedStyle(scope).direction === "rtl"

const valueAt = (scope: HTMLElement, clientX: number): number | undefined => {
  const box = scope.getBoundingClientRect()

  if (box.width === 0) return undefined

  const across = (clientX - box.left) / box.width

  return clamp((isMirrored(scope) ? 1 - across : across) * 100)
}

/**
 * `var()` with a fallback rather than the `tokens.ts` helpers, for the reason
 * the other two controls give: those live in `src/primitives/`, which the
 * render seam must not depend on.
 *
 * The two-tone treatment is not decoration. This control is the one thing in
 * the vocabulary that sits, by definition, on top of content the page did not
 * choose — a photograph, a screenshot, a dark frame and a light one within a
 * few pixels of each other. A single fill in the palette's surface contrasts
 * with the palette's ink and with nothing else, which is a defect
 * `loom.before-after` shipped and fixed in an hour on 25 August. A fill with a
 * one-pixel ring of ink around it always shows one of the two, whatever is
 * underneath.
 */
const GRIP_STYLE = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "3px",
  width: "2.4em",
  height: "2.4em",
  borderRadius: "var(--loom-radius-full, 9999px)",
  background: "var(--loom-bg-surface, #fff)",
  boxShadow: "0 0 0 1px var(--loom-fg-default, currentColor)",
  color: "var(--loom-fg-default, currentColor)",
  cursor: "ew-resize",
  /** Otherwise a drag on a phone scrolls the page instead of moving the edge. */
  touchAction: "none",
  userSelect: "none",
} as const

const BAR_STYLE = {
  display: "block",
  width: "2px",
  height: "0.9em",
  borderRadius: "1px",
  background: "currentColor",
} as const

/** Two upright bars: the grip mark, and unlike an arrow it says nothing about which way. */
const grip = (): readonly ReactNode[] => [
  createElement("span", { key: "a", "aria-hidden": true, style: BAR_STYLE }),
  createElement("span", { key: "b", "aria-hidden": true, style: BAR_STYLE }),
]

const KEY_DELTAS: Readonly<Record<string, number>> = {
  ArrowUp: STEP,
  ArrowDown: -STEP,
  PageUp: COARSE_STEP,
  PageDown: -COARSE_STEP,
}

const MIRRORED_KEY_DELTAS: Readonly<Record<string, number>> = {
  ArrowRight: STEP,
  ArrowLeft: -STEP,
}

export const DragControl = ({ label }: DragControlProps) => {
  const element = useRef<HTMLSpanElement | null>(null)
  const [scope, setScope] = useState<HTMLElement | null>(null)
  const [value, setValue] = useState(FALLBACK_VALUE)

  /**
   * Deliberately an effect, for the reason the other two controls give: a check
   * made while rendering would make the server's markup and the browser's first
   * render disagree, and React resolves that by keeping the server's — so the
   * control would be missing exactly where it works. Here it is also the only
   * time the question *can* be asked, since the scope is found by walking the
   * DOM this render puts the element into.
   */
  useEffect(() => {
    const found = scopeOf(element.current)

    setScope(found)

    if (found !== null) setValue(publishedValue(found) ?? FALLBACK_VALUE)
  }, [])

  const publish = useCallback(
    (next: number) => {
      if (scope === null) return

      setValue(next)
      scope.style.setProperty(DRAG_VALUE_PROPERTY, String(next))
    },
    [scope]
  )

  const track = useCallback(
    (event: PointerEvent<HTMLSpanElement>) => {
      if (scope === null) return

      const next = valueAt(scope, event.clientX)

      if (next !== undefined) publish(next)
    },
    [publish, scope]
  )

  const onPointerDown = useCallback(
    (event: PointerEvent<HTMLSpanElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId)
      /** Otherwise the drag selects the text of whatever the wipe is laid over. */
      event.preventDefault()
      track(event)
    },
    [track]
  )

  const onPointerMove = useCallback(
    (event: PointerEvent<HTMLSpanElement>) => {
      if (!event.currentTarget.hasPointerCapture(event.pointerId)) return

      track(event)
    },
    [track]
  )

  const onPointerUp = useCallback((event: PointerEvent<HTMLSpanElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }, [])

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLSpanElement>) => {
      if (scope === null) return

      const sign = isMirrored(scope) ? -1 : 1
      const delta = KEY_DELTAS[event.key] ?? (MIRRORED_KEY_DELTAS[event.key] ?? 0) * sign

      if (delta !== 0) {
        event.preventDefault()
        publish(clamp(value + delta))

        return
      }

      if (event.key === "Home" || event.key === "End") {
        event.preventDefault()
        publish(event.key === "Home" ? MIN : MAX)
      }
    },
    [publish, scope, value]
  )

  if (scope === null) return createElement("span", { ref: element, hidden: true })

  return createElement(
    "span",
    {
      ref: element,
      role: "slider",
      tabIndex: 0,
      "aria-label": label,
      "aria-orientation": "horizontal",
      "aria-valuemin": MIN,
      "aria-valuemax": MAX,
      "aria-valuenow": value,
      /** The unit the number actually is, and not a word in anybody's language. */
      "aria-valuetext": `${value}%`,
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
      onKeyDown,
      style: GRIP_STYLE,
    },
    grip()
  )
}
