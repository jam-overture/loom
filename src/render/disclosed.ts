/**
 * The disclose contract's one name, in a module with nothing else in it.
 *
 * It lives apart from `behaviour.ts` so that code which only needs to *read* a
 * disclosure — the reader-signal broadcaster — can import the name without
 * importing the React controls that write it (0136).
 */

/**
 * The attribute a disclosure control stamps on its own button: `"true"` when
 * the region it names is open, `"false"` when it is closed.
 *
 * **This is the whole of the contract between the runtime and a primitive that
 * takes `disclose`**, and it is an attribute rather than a callback or a
 * wrapper because a stylesheet is what has to read it. The control owns one
 * element; the region beside it belongs to the primitive, which alone knows
 * whether the thing being disclosed is a column of links, at what width the
 * collapsing should start, and what should happen to the layout around it. So
 * the runtime says only *open* or *closed*, on the one element it owns, and the
 * primitive writes the rule:
 *
 * ```css
 * [data-loom-disclosed="false"] ~ .my-links { display: none }
 * ```
 *
 * — or `:has([data-loom-disclosed="false"])` on an ancestor if the control is
 * placed inside a wrapper of the primitive's own.
 *
 * Two properties of the selector are worth stating because they are what make
 * it safe. It matches nothing when the control has not rendered, which is the
 * no-scripting case and the reason the region must default to *visible* and be
 * hidden by the rule rather than the other way round. And `display: none` takes
 * the region out of the accessibility tree as well as the layout, so a closed
 * menu is closed for a screen reader too — which `aria-expanded` on the button
 * then describes correctly instead of contradicting.
 */
export const DISCLOSED_ATTRIBUTE = "data-loom-disclosed"
