"use client"

import { createElement, useCallback, useEffect, useRef, useState, type MouseEvent } from "react"

import { controlClass, controlDisplay } from "./control.js"
import { DISMISS_EVENT, PRESENTED_ATTRIBUTE } from "./presented.js"

/**
 * The fourth and fifth controls that run on the client, and the first pair that
 * has to agree about anything.
 *
 * `copy`, `disclose` and `adjust` are each one control answering to nobody. A
 * presentation is two: the trigger that opens a region and the cross inside it
 * that closes it. `presented.ts` carries why that could not be a shared store
 * and is a bubbling event instead, and why the state is published on the
 * element the primitive placed the trigger in rather than on the trigger.
 *
 * **What this is not.** It is not a dialog. The runtime opens and closes a
 * boolean and says so in the markup; whether the region that boolean governs is
 * a centred panel over a scrim, a menu under a button or a frame filling the
 * viewport is the primitive's, along with every pixel of it. That is 0092's
 * split, unchanged — the control owns its button and the primitive owns the
 * region — extended to the case where the region needs a second button.
 *
 * **What a primitive still has to do, and the runtime cannot.** A modal traps
 * focus, marks the rest of the page inert, and stops the document behind it
 * scrolling. None of that is here, and none of it is a behavior: they are
 * facts about the region and the page around it, which is the half the primitive
 * owns. A primitive that presents a *modal* region has to arrange them and this
 * seam neither helps nor hinders it.
 */

export type PresentControlProps = {
  /**
   * The trigger's name, in the language this deployment serves. Constant across
   * both states, for the reason the disclosure control gives: `aria-expanded`
   * carries the state and a control that renames itself says it twice.
   */
  readonly label: string
}

export type DismissControlProps = {
  /**
   * The close control's name. Unlike every other control in the vocabulary this
   * one is **not rendered as text** — see {@link DismissControl}.
   */
  readonly label: string
}

/**
 * `var()` with a fallback rather than the `tokens.ts` helpers, for the reason
 * every control in this directory gives: those live in `src/primitives/`, which
 * the render seam must not depend on, and a control that only looks right under
 * a mounted theme renders invisible in a preview pane that mounts none.
 */
const TRIGGER_STYLE = {
  display: controlDisplay("present", "inline-flex"),
  alignItems: "center",
  gap: "var(--loom-spacing-2, 8px)",
  paddingBlock: "var(--loom-spacing-1, 4px)",
  paddingInline: "var(--loom-spacing-3, 12px)",
  fontFamily: "inherit",
  fontSize: "var(--loom-scale-1, 0.75rem)",
  lineHeight: 1.2,
  color: "var(--loom-fg-default, currentColor)",
  background: "var(--loom-bg-surface, transparent)",
  border: "1px solid var(--loom-border-subtle, currentColor)",
  borderRadius: "var(--loom-radius-sm, 4px)",
  cursor: "pointer",
} as const

/**
 * Square, and sized in `em` so it tracks whatever the region sets around it. The
 * glyph is a multiplication sign rather than a lowercase x, which is the
 * character that is actually a cross at every weight.
 */
const CLOSE_STYLE = {
  display: controlDisplay("dismiss", "inline-flex"),
  alignItems: "center",
  justifyContent: "center",
  inlineSize: "1.75em",
  blockSize: "1.75em",
  padding: 0,
  fontFamily: "inherit",
  fontSize: "var(--loom-scale-2, 0.875rem)",
  lineHeight: 1,
  color: "var(--loom-fg-muted, currentColor)",
  background: "transparent",
  border: "1px solid transparent",
  borderRadius: "var(--loom-radius-full, 999px)",
  cursor: "pointer",
} as const

/**
 * The trigger. It opens the region, publishes whether the region is showing, and
 * closes it again on any of the three things that close an overlay.
 *
 * **It renders nothing until it knows scripting runs**, for the reason all three
 * earlier controls give, and the consequence here is the one that decides which
 * way a primitive must write its rule. No button means no attribute, no
 * attribute means no rule matches, and the region is simply *there* — so a
 * primitive hides its region with `[data-loom-presented="false"] .region` and
 * never reveals it with the `"true"` form. Written the other way, a page served
 * without scripting has a panel nothing can open and nothing to say why.
 *
 * **Escape and a press outside close it; a press inside does not.** "Outside" is
 * measured against the element this control was placed in, which is the same
 * element the state is published on and therefore the same box the primitive
 * laid the region out inside. The one case that needs stating is a region drawn
 * over the whole viewport: its scrim is inside that element too, so a press on
 * it is an inside press and will not dismiss. A primitive doing that places a
 * `dismiss` control, which is what it is for.
 */
export const PresentControl = ({ label }: PresentControlProps) => {
  const [usable, setUsable] = useState(false)
  const [open, setOpen] = useState(false)
  const trigger = useRef<HTMLButtonElement | null>(null)

  /**
   * Deliberately an effect rather than a render-time check, for the reason the
   * copy control gives: anything read while rendering would make the server's
   * markup and the browser's first render disagree, and React resolves that by
   * keeping the server's — so the control would be missing exactly where it
   * works.
   */
  useEffect(() => setUsable(true), [])

  const toggle = useCallback(() => setOpen((was) => !was), [])

  /**
   * The published state, on the parent. `adjust` writes a custom property on the
   * same element for a different reason — inheritance runs downwards — and this
   * writes an attribute there because a descendant selector does too.
   *
   * The parent is read from the ref rather than held, so the cleanup removes the
   * attribute from the element it was written to even when the button has
   * already gone.
   */
  useEffect(() => {
    const parent = trigger.current?.parentElement
    if (!parent) return

    parent.setAttribute(PRESENTED_ATTRIBUTE, open ? "true" : "false")

    return () => parent.removeAttribute(PRESENTED_ATTRIBUTE)
  }, [open, usable])

  /**
   * The three ways out, attached only while the region is showing. A dismiss
   * event that arrives while it is closed is a control the primitive rendered
   * inside a hidden region, which cannot be pressed — so there is nothing to
   * hear and nothing listening costs nothing.
   */
  useEffect(() => {
    if (!open) return

    const parent = trigger.current?.parentElement
    if (!parent) return

    const close = () => setOpen(false)

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close()
    }

    const onPointerDown = (event: Event) => {
      const target = event.target
      if (target instanceof Node && parent.contains(target)) return
      close()
    }

    document.addEventListener("keydown", onKeyDown)
    document.addEventListener("pointerdown", onPointerDown)
    parent.addEventListener(DISMISS_EVENT, close)

    return () => {
      document.removeEventListener("keydown", onKeyDown)
      document.removeEventListener("pointerdown", onPointerDown)
      parent.removeEventListener(DISMISS_EVENT, close)
    }
  }, [open])

  if (!usable) return null

  return createElement(
    "button",
    {
      type: "button",
      ref: trigger,
      className: controlClass("present"),
      onClick: toggle,
      "aria-expanded": open,
      style: TRIGGER_STYLE,
    },
    label
  )
}

/**
 * The cross inside the region.
 *
 * **The only control in the vocabulary whose name is not rendered as text.** A
 * close affordance on an overlay is a glyph everywhere a reader has ever met
 * one, and a panel with the word "Close" spelled out beside the cross is a panel
 * nobody designed. The text seam's guarantee is untouched and is the reason this
 * is safe rather than a shortcut: the name is still declared by the primitive,
 * still translated by the deployment's dictionary, still refused at registration
 * if it is blank — it arrives as `aria-label` instead of as a child, so a screen
 * reader is told what the button is and an eye is shown the cross.
 *
 * **It carries no state and reads none.** It does not know whether the region
 * around it is open, because it does not have to: a closed region is hidden by
 * the primitive's own rule and a button inside a `display: none` subtree cannot
 * be pressed. So this dispatches and stops, and the trigger above it decides
 * what that means.
 */
export const DismissControl = ({ label }: DismissControlProps) => {
  const [usable, setUsable] = useState(false)

  useEffect(() => setUsable(true), [])

  const dismiss = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    event.currentTarget.dispatchEvent(new CustomEvent(DISMISS_EVENT, { bubbles: true }))
  }, [])

  if (!usable) return null

  return createElement(
    "button",
    {
      type: "button",
      className: controlClass("dismiss"),
      onClick: dismiss,
      "aria-label": label,
      style: CLOSE_STYLE,
    },
    createElement("span", { "aria-hidden": true }, "×")
  )
}
