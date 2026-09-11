"use client"

import { createElement, useCallback, useEffect, useState } from "react"

import { DISCLOSED_ATTRIBUTE } from "./behaviour.js"
import { controlClass, controlDisplay } from "./control.js"

/**
 * A button that opens and closes the region beside it.
 *
 * The second control in the runtime that runs on the client, and it exists for
 * the same reason as the first: a disclosure is a behaviour, a behaviour is a
 * function, and a primitive's props are JSON
 * ([0009](../../decisions/0009-a-primitive-declares-its-props-and-the-seam-enforces-them.md)).
 * See `behaviour.ts` for why that makes it the runtime's to build rather than
 * the primitive's, and 0091 for why the *region* is nonetheless the primitive's
 * to hide.
 *
 * **It owns one element and no more.** The control does not wrap the region,
 * does not reach for it with a ref, and is not told where it is. It stamps its
 * own state on its own button as `data-loom-disclosed`, and the primitive's
 * stylesheet decides what that means for the layout it owns — an ordinary
 * sibling or `:has()` selector, in whatever media query the primitive wants the
 * collapsing to apply to. That keeps the two halves at arm's length: the
 * runtime knows nothing about navigation bars, and `loom.nav` gets to keep the
 * box model it already has instead of taking a wrapper it did not ask for,
 * which is the same objection 0086 raised against reading the DOM for the copy
 * text.
 *
 * **One name, not two.** The button is called the same thing open and closed,
 * and `aria-expanded` carries the state — the disclosure pattern as the ARIA
 * practices state it. A control that renames itself "Close" when it opens says
 * the state twice and says it differently to a screen reader than to an eye,
 * which is why `copy` takes two strings for its momentary confirmation and this
 * takes one for its name.
 *
 * **It renders nothing until it knows it will work**, exactly as the copy
 * control does, and here the stakes are higher rather than lower. The capability
 * it needs is that scripting runs at all, which the effect below is the proof
 * of. Ship the button in the server's markup instead and a page served with
 * scripting off gets a dead button, with — because the stylesheet keys off the
 * closed state — every link in the menu hidden behind it and no way to reach
 * one. Rendering late inverts that failure into a safe one: no button means no
 * attribute, no attribute means no rule matches, and the region is simply
 * visible the way it was before any of this existed.
 *
 * The cost is a paint. On a phone the region is briefly open and then collapses
 * once hydration lands, which is visible and is the honest price of not being
 * able to hide something before knowing it can be got back. A primitive that
 * minds can transition the collapse; nothing here guesses.
 */

export type DiscloseControlProps = {
  /**
   * The control's name, in the language this deployment serves. Constant across
   * both states — see above.
   */
  readonly label: string
}

const GLYPH_BAR = {
  display: "block",
  width: "0.875em",
  height: "1.5px",
  background: "currentColor",
  borderRadius: "1px",
} as const

/**
 * `var()` with a fallback rather than the `tokens.ts` helpers, for the reason
 * the copy control gives: those live in `src/primitives/`, which the render seam
 * must not depend on, and a control that only looks right on a themed page
 * renders invisible in a preview pane that mounts no theme.
 *
 * `display` is the exception a primitive may take back, and this is the control
 * that needed it first: a menu button belongs on a phone and not on a laptop,
 * which is a rule about the button rather than about the region beside it. See
 * `controlDisplay` for the two names that override it, and for the sharp edge —
 * a hidden button still carries its state, so the rule keyed on that state has
 * to be lifted in the same query.
 */
const BUTTON_STYLE = {
  display: controlDisplay("disclose", "inline-flex"),
  alignItems: "center",
  gap: "var(--loom-spacing-2, 8px)",
  paddingBlock: "var(--loom-spacing-1, 4px)",
  paddingInline: "var(--loom-spacing-2, 8px)",
  fontFamily: "inherit",
  fontSize: "var(--loom-scale-1, 0.75rem)",
  lineHeight: 1.2,
  color: "var(--loom-fg-muted, currentColor)",
  background: "var(--loom-bg-surface, transparent)",
  border: "1px solid var(--loom-border-subtle, currentColor)",
  borderRadius: "var(--loom-radius-sm, 4px)",
  cursor: "pointer",
} as const

const GLYPH_STYLE = {
  display: "inline-flex",
  flexDirection: "column",
  justifyContent: "center",
  gap: "3px",
} as const

/**
 * Two bars rather than three. It reads as a menu at this size, and the third
 * bar is the one that turns a glyph into a logo at small sizes. `aria-hidden`
 * because the button already has a name and a screen reader announcing "image"
 * beside it is noise.
 */
const glyph = (): ReturnType<typeof createElement> =>
  createElement(
    "span",
    { "aria-hidden": true, style: GLYPH_STYLE },
    createElement("span", { key: "a", style: GLYPH_BAR }),
    createElement("span", { key: "b", style: GLYPH_BAR })
  )

export const DiscloseControl = ({ label }: DiscloseControlProps) => {
  const [usable, setUsable] = useState(false)
  const [open, setOpen] = useState(false)

  /**
   * Deliberately an effect rather than a render-time check, for the reason the
   * copy control gives: anything read while rendering would make the server's
   * markup and the browser's first render disagree, and React resolves that by
   * keeping the server's — so the control would be missing exactly where it
   * works. That the effect ran is the whole of the capability check; there is
   * no second thing to ask for.
   */
  useEffect(() => setUsable(true), [])

  const toggle = useCallback(() => setOpen((was) => !was), [])

  if (!usable) return null

  return createElement(
    "button",
    {
      type: "button",
      className: controlClass("disclose"),
      onClick: toggle,
      "aria-expanded": open,
      [DISCLOSED_ATTRIBUTE]: open ? "true" : "false",
      style: BUTTON_STYLE,
    },
    glyph(),
    createElement("span", { key: "label" }, label)
  )
}
