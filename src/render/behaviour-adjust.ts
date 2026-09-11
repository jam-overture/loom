"use client"

import { createElement, useCallback, useEffect, useRef, useState, type ChangeEvent } from "react"

import { ADJUST_MAXIMUM, ADJUST_MINIMUM, ADJUST_PROPERTY, ADJUST_RESTING } from "./behaviour.js"
import { controlClass, controlDisplay } from "./control.js"

/**
 * The third control that runs on the client, and the first that hands a value
 * back to the primitive that placed it.
 *
 * `copy` acts on the node's own text, which is in the tree. `disclose` acts on a
 * region of the render, and says so by stamping a boolean on its own button that
 * the primitive's stylesheet selects on. Neither gives the primitive a *number*,
 * and a wipe divider is a number: the thing it drives is a `clip-path`, and no
 * attribute selector can be written that means "at 37 per cent".
 *
 * So this control publishes its value as a **CSS custom property** rather than
 * an attribute, and that choice carries a consequence the other two do not have.
 * `var()` resolves by inheritance — downwards — while `data-loom-disclosed` is
 * read sideways by an ordinary sibling selector. A property this control set on
 * its own element would therefore be readable by nothing, because the region it
 * exists to drive is its sibling, not its child. See
 * [0096](../../decisions/0096-a-behaviour-publishes-a-value-on-the-element-the-primitive-placed-it-in.md)
 * for why the property goes on the **parent** instead, and what that costs.
 *
 * **It renders nothing until it knows scripting runs**, for the reason the other
 * two give, and here the fallback is the whole point rather than a consolation.
 * A primitive reads the value as `var(--loom-adjust, 50)` with its own declared
 * position as the fallback, so a page served with scripting off shows the still
 * comparison at the position the tree asked for — which is what most pages using
 * this actually are. Nothing is hidden behind a control that never arrives.
 *
 * **A range input rather than a hand-built handle.** Dragging, arrow keys, Home
 * and End, the announced role and the announced value are all a browser's to get
 * right, and a `role="slider"` div reimplements every one of them worse. The
 * pure-CSS routes were weighed and rejected before this seam existed — a range
 * input cannot drive a clip *in CSS alone*, which is true and is exactly the gap
 * a behaviour fills: the value is read here, in a component, and written where
 * a stylesheet can reach it.
 */

export type AdjustControlProps = {
  /**
   * The control's name, in the language this deployment serves. A slider with no
   * accessible name is announced as a bare "slider", which is the failure the
   * text seam exists to prevent — so the seam drops the control rather than
   * render it nameless, and this never receives a blank.
   */
  readonly label: string
}

/**
 * `var()` with a fallback rather than the `tokens.ts` helpers, for the reason
 * both other controls give: those live in `src/primitives/`, which the render
 * seam must not depend on, and a control that only looks right on a themed page
 * renders invisible in a preview pane that mounts no theme.
 *
 * `accentColor` is the one line that matters. It is the only way to theme a
 * range input's thumb and track without replacing the whole control with
 * pseudo-element rules per engine — which would be the hand-built handle this
 * deliberately is not.
 *
 * `display` is set here rather than left to the browser, which is the one line
 * that is not about appearance. The other two controls set it inline and so
 * cannot be hidden by a rule; making this one the exception would mean the
 * property that hides a control hides two of three. `inline-block` is what a
 * range input is displayed as anyway, so writing it down changes no page.
 */
const INPUT_STYLE = {
  accentColor: "var(--loom-accent, currentColor)",
  display: controlDisplay("adjust", "inline-block"),
  cursor: "grab",
  margin: 0,
  verticalAlign: "middle",
} as const

export const AdjustControl = ({ label }: AdjustControlProps) => {
  const [usable, setUsable] = useState(false)
  const [value, setValue] = useState(ADJUST_RESTING)
  const input = useRef<HTMLInputElement | null>(null)

  /**
   * Deliberately an effect rather than a render-time check, for the reason the
   * other two controls give: anything read while rendering would make the
   * server's markup and the browser's first render disagree, and React resolves
   * that by keeping the server's — so the control would be missing exactly where
   * it works. That the effect ran is the whole of the capability check.
   */
  useEffect(() => setUsable(true), [])

  /**
   * `usable` is a dependency and not a redundant one: the first run happens
   * while the control is still rendering nothing, so the ref is empty and there
   * is no parent to write to. The write has to happen again once there is.
   *
   * The cleanup removes the property rather than leaving the last value behind.
   * A primitive that unmounts its control — a media query that stops offering
   * the comparison, a node the tree no longer holds — should fall back to its
   * own declared position, and a stale custom property on an element the runtime
   * does not own would quietly outlive the thing that set it.
   */
  useEffect(() => {
    const parent = input.current?.parentElement

    if (!parent) return undefined

    parent.style.setProperty(ADJUST_PROPERTY, String(value))

    return () => {
      parent.style.removeProperty(ADJUST_PROPERTY)
    }
  }, [value, usable])

  const change = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setValue(Number(event.target.value))
  }, [])

  if (!usable) return null

  return createElement("input", {
    ref: input,
    type: "range",
    className: controlClass("adjust"),
    min: ADJUST_MINIMUM,
    max: ADJUST_MAXIMUM,
    value,
    "aria-label": label,
    onChange: change,
    style: INPUT_STYLE,
  })
}
