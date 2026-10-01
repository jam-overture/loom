import type { BehaviorName } from "./behavior.js"

/**
 * The handle a primitive has on a control it did not build.
 *
 * A behavior arrives as a node with nothing left to configure, and that is what
 * makes placing it the whole of a primitive's part. It also means the primitive
 * is handed an element it cannot name: the class it would aim a rule at, and the
 * one line of that rule an inline style would otherwise beat. Both are here, in
 * one module the controls and the seam can share, because a control importing
 * them from the seam that imports the control is a cycle.
 */

/**
 * The class every control carries, and the stem of the second one naming which
 * behavior built it: `loom-control loom-control-copy`.
 *
 * Until this existed, a primitive styling the control it had been handed had two
 * options and neither was good. An element selector guesses what a control
 * renders — `button`, which stopped being true the first time a behavior
 * rendered an input, as `adjust` does. A wrapper of the primitive's own exists
 * only so there is something to select, and costs a box on every page. A stable
 * class removes both, and costs the runtime one attribute.
 *
 * A plain class rather than a data attribute because it is written for a
 * stylesheet, and a stylesheet author writes `.loom-control-copy`. Nothing reads
 * it back: what a control publishes is an attribute or a custom property, and
 * those are documented apart from this because they are the parts that carry
 * state.
 */
export const CONTROL_CLASS = "loom-control"

/** The classes the runtime stamps on the control one behavior builds. */
export const controlClass = (name: BehaviorName): string =>
  `${CONTROL_CLASS} ${CONTROL_CLASS}-${name}`

/**
 * The custom property that decides whether a control is displayed — every
 * control at once.
 *
 * A class gives a primitive somewhere to aim a rule. It does not give it a rule
 * that *wins*. Every control sets its own presentation as an inline `style`, for
 * the reason each control file states: the render seam may not depend on
 * `src/primitives/`, and a control that only looks right under a mounted theme
 * renders invisible in a preview pane that mounts none. An inline declaration
 * beats every selector a stylesheet can write short of `!important`, so
 * `.loom-control-disclose { display: none }` silently does nothing — and the
 * primitive that most needs it is the one whose control belongs on a phone and
 * not on a laptop.
 *
 * A custom property crosses that boundary because it is substituted *into* the
 * inline declaration rather than competing with it. The control writes
 * `display: var(…, inline-flex)`; a primitive sets the property in whatever media
 * query it likes, on any ancestor, and inheritance carries it down. The fallback
 * is what a page renders when nobody has set anything, so this is additive by
 * construction: a primitive that says nothing sees no change.
 *
 * **Hiding a control does not clear what it publishes.** A disclosure whose
 * button is displayed `none` still carries its attribute, and the sibling rule
 * keyed on that attribute still matches — so a primitive that hides the control
 * at a width has to stop hiding the region at that width too, in the same query.
 * That is the one sharp edge here, and it is the primitive's to hold because the
 * runtime does not know which region is which.
 */
export const CONTROL_DISPLAY_PROPERTY = "--loom-control-display"

/**
 * The custom property that decides whether *one* behavior's control is
 * displayed: `--loom-copy-display`.
 *
 * The group property is the common case and this is the escape from it. A
 * primitive that places two controls — a code panel that copies and folds — has
 * one subtree and therefore one inherited value, so without a per-behavior name
 * hiding either would hide both.
 */
export const controlDisplayProperty = (name: BehaviorName): string => `--loom-${name}-display`

/**
 * The value a control writes for `display`: its own, behind the two properties a
 * primitive may override it with.
 *
 * Nested deliberately, and in this order. The specific name wins over the group
 * name, the group name wins over the control's own resting value, and a
 * deployment that sets neither gets exactly what the control set before any of
 * this existed.
 */
export const controlDisplay = (name: BehaviorName, resting: string): string =>
  `var(${controlDisplayProperty(name)}, var(${CONTROL_DISPLAY_PROPERTY}, ${resting}))`
