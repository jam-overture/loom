"use client"

import {
  createElement,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react"

import {
  ADJUST_MAXIMUM,
  ADJUST_MINIMUM,
  ADJUST_PROPERTY,
  ADJUST_RESTING,
  ADJUST_RESTING_PROPERTY,
} from "./behaviour.js"
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
 * A primitive reads the value as `var(--loom-adjust, 35)` with its own declared
 * position as the fallback, so a page served with scripting off shows the still
 * comparison at the position the tree asked for — which is what most pages using
 * this actually are. Nothing is hidden behind a control that never arrives.
 *
 * **And it publishes nothing until the reader moves it**, which is the half that
 * had to be learned from a photograph. Appearing is not an instruction: a
 * control that wrote its own resting value the moment it mounted overwrote the
 * fallback it was built to defend, so a band authored at 35 rendered at 35 and
 * jumped to the runtime's midpoint as hydration landed. Where it starts is the
 * primitive's to declare — {@link ADJUST_RESTING_PROPERTY}, read off the
 * element it was placed in — and what it publishes is the reader's alone. See
 * [0226](../../decisions/0226-a-primitive-declares-where-its-control-rests-and-the-control-publishes-nothing-until-the-reader-moves-it.md).
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

/**
 * Where the primitive asked its control to start, read off the element the
 * control was placed in.
 *
 * The **computed** value rather than the inline one, because a custom property
 * is a cascaded value and a primitive may declare it in a rule as readily as in
 * a style attribute. It inherits, like any custom property, which is the same
 * reach `ADJUST_PROPERTY` has in the other direction.
 *
 * Clamped and rounded rather than trusted. The range is the runtime's (0096), so
 * a number outside it is not a position this control can take, and a fractional
 * one is not a position a step-1 input can hold — state and thumb would disagree
 * from the first frame. Anything unreadable falls back to {@link ADJUST_RESTING},
 * which is also what a primitive declaring nothing gets: a control that refused
 * to render because a stylesheet said `--loom-adjust-resting: thirty` would be a
 * missing comparison, and the still version is right there in the `var()`
 * fallback.
 */
const restingIn = (element: HTMLElement): number => {
  const declared = getComputedStyle(element).getPropertyValue(ADJUST_RESTING_PROPERTY).trim()

  if (declared === "") return ADJUST_RESTING

  const value = Number(declared)

  if (!Number.isFinite(value)) return ADJUST_RESTING

  return Math.min(ADJUST_MAXIMUM, Math.max(ADJUST_MINIMUM, Math.round(value)))
}

/**
 * The input itself, split from the capability check so that the two things that
 * must happen in a browser are not conditioned on each other.
 *
 * It exists for the adoption below. Reading the parent needs the input mounted,
 * which needs the check to have passed — so the read cannot share an effect with
 * the check, and a `useLayoutEffect` in the component that also renders on the
 * server is a warning about a hook that does nothing there. A component that
 * mounts only once scripting is proved has no server render to warn about.
 */
const AdjustSlider = ({ label }: AdjustControlProps) => {
  const input = useRef<HTMLInputElement | null>(null)
  const [position, setPosition] = useState(ADJUST_RESTING)
  const [moved, setMoved] = useState(false)

  /**
   * Before the first paint, not after it. A passive effect here would let the
   * browser paint one frame with the thumb at the runtime's midpoint on a page
   * that declared something else — the whole defect in miniature, a sixtieth of
   * a second long. A layout effect's `setPosition` re-renders synchronously, so
   * the first frame the reader sees is already the declared one.
   */
  useLayoutEffect(() => {
    const parent = input.current?.parentElement

    if (parent) setPosition(restingIn(parent))
  }, [])

  /**
   * `moved` is the whole of the contract this effect keeps: until the reader has
   * moved the control there is nothing to publish, because the primitive's own
   * `var()` fallback already says where the divider is and this agrees with it.
   * Writing the same number anyway would be indistinguishable on a page whose
   * fallback matches and wrong on every page whose fallback does not.
   *
   * The cleanup removes the property rather than leaving the last value behind.
   * A primitive that unmounts its control — a media query that stops offering
   * the comparison, a node the tree no longer holds — should fall back to its
   * own declared position, and a stale custom property on an element the runtime
   * does not own would quietly outlive the thing that set it.
   */
  useEffect(() => {
    const parent = input.current?.parentElement

    if (!parent || !moved) return undefined

    parent.style.setProperty(ADJUST_PROPERTY, String(position))

    return () => {
      parent.style.removeProperty(ADJUST_PROPERTY)
    }
  }, [moved, position])

  const change = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setPosition(Number(event.target.value))
    setMoved(true)
  }, [])

  return createElement("input", {
    ref: input,
    type: "range",
    className: controlClass("adjust"),
    min: ADJUST_MINIMUM,
    max: ADJUST_MAXIMUM,
    value: position,
    "aria-label": label,
    onChange: change,
    style: INPUT_STYLE,
  })
}

export const AdjustControl = ({ label }: AdjustControlProps) => {
  const [usable, setUsable] = useState(false)

  /**
   * Deliberately an effect rather than a render-time check, for the reason the
   * other two controls give: anything read while rendering would make the
   * server's markup and the browser's first render disagree, and React resolves
   * that by keeping the server's — so the control would be missing exactly where
   * it works. That the effect ran is the whole of the capability check.
   */
  useEffect(() => setUsable(true), [])

  return usable ? createElement(AdjustSlider, { label }) : null
}
