/**
 * The present contract's one name, in a module with nothing else in it.
 *
 * It lives apart from `behaviour.ts` for the reason `disclosed.ts` does: code
 * that only needs to *read* whether a region is showing should not have to
 * import the React controls that write it (0136).
 */

/**
 * The attribute a presentation control stamps on **the element the primitive
 * placed it in**: `"true"` while the region it opens is showing, `"false"`
 * otherwise.
 *
 * **This is the whole of the contract between the runtime and a primitive that
 * takes `present`.** It is an attribute for `disclosed.ts`'s reason — a
 * stylesheet is what reads it — and it is on the *parent* for
 * [0096](../../decisions/0096-a-behaviour-publishes-a-value-on-the-element-the-primitive-placed-it-in.md)'s,
 * with the opposite half of that record's reasoning doing the work.
 *
 * `data-loom-disclosed` sits on the control's own button and is read
 * **sideways**, by a sibling selector, because the region a disclosure opens is
 * laid out beside its button. An overlay is not: a dialog's panel, a dropdown's
 * menu and a lightbox's frame are all *inside* the box the primitive owns and
 * the trigger is one element within it. A sibling selector cannot reach from the
 * button to a region that is not its sibling, and the primitive cannot make it
 * one without giving the trigger a wrapper whose only purpose is to be selected
 * from — which is the cost `control.ts` already records against that shape.
 *
 * So the state goes on the parent, where a **descendant** selector reaches
 * anything the primitive laid out:
 *
 * ```css
 * [data-loom-presented="false"] .my-panel { display: none }
 * ```
 *
 * The two properties that make the sibling form safe hold here unchanged, and
 * they are the reason the rule must be written in this direction rather than
 * its inverse. It matches nothing until the control has mounted, which is the
 * no-scripting case — so the region must default to *visible* and be hidden by
 * the rule, never shown by it, or a page served without scripting hides a panel
 * behind a button that never arrives. And `display: none` takes the region out
 * of the accessibility tree as well as the layout, so a closed panel is closed
 * for a screen reader too, which the trigger's `aria-expanded` then describes
 * correctly instead of contradicting.
 */
export const PRESENTED_ATTRIBUTE = "data-loom-presented"

/**
 * The event a dismiss control dispatches to close the presentation it sits
 * inside: bubbling, so the nearest presentation above it hears it and no other.
 *
 * This is the part of the seam that has no counterpart in `disclose`, and it is
 * here because of the one thing a disclosure never has to do — **be closed by
 * something that is not the control that opened it.** A menu is closed by its
 * own button. A dialog is closed by a cross inside the panel, by Escape, and by
 * a press on the page behind it; a dropdown by choosing something; a lightbox by
 * any of the three. The first of those is a second control, and a click handler
 * is a function, so it is the runtime's to build for the same reason the first
 * one is (0009).
 *
 * Two controls of one primitive therefore have to agree about one boolean, and
 * nothing in the seam let them. A behaviour is built as an independent node the
 * primitive places where it likes, so the two have no common React ancestor to
 * hold state, no provider between them, and no way to be handed a shared object:
 * `build` runs on the server and a control's props cross the client boundary, so
 * anything passed between them has to be serialisable.
 *
 * What they do share is the **DOM**, because the primitive placed both of them
 * in it — and a bubbling event is the one channel that needs no common ancestor
 * named in advance, no key to agree on, and nothing to clean up. The dismiss
 * control dispatches from its own button; the presentation control listens on
 * the element it was placed in. If the primitive laid the region out inside that
 * element, which is what presenting a region means, the event arrives. If it did
 * not, nothing happens — the same way a sibling selector matches nothing when a
 * disclosure's region is not its sibling.
 *
 * A module-level store keyed by node id was the alternative and is worse in the
 * way that matters: it would make two controls that are not in each other's
 * subtree agree anyway, which reads as a feature and is really a guarantee that
 * the first primitive to place them apart gets a dialog closed by a button
 * somewhere else on the page.
 */
export const DISMISS_EVENT = "loom:dismiss"
