import type { JsonObject } from "../json.js"

import type { BehaviourName } from "./behaviour.js"

/**
 * Where a control's name comes from when the primitive's own vocabulary is the
 * wrong place to keep it.
 *
 * Every string a control is announced by arrives through the text seam, per
 * type: one `Copy` for every code panel in a deployment, translatable by a
 * dictionary a host already has. That is right for an affordance — a word that
 * names the *mechanism*, which a reader wants to be the same word everywhere —
 * and it is wrong for the one control whose words are the page's own. A trigger
 * that opens a dialog says *Watch the demo*; the next one on the same page says
 * *Book a call*; neither is a thing a dictionary should hold and neither is a
 * fact about the primitive.
 *
 * So a primitive may name **one of its own props** as where a control takes its
 * name from, and the runtime reads it off the node. Three things make that
 * narrower than it sounds, and they are why this is not a reserved prop:
 *
 * - **The primitive opts in, per control.** Nothing a tree writes turns this on.
 *   The declaration lives beside `frames` and `interactive`, in the component a
 *   human approved once, and the registry checks it names a prop the schema
 *   really declares.
 * - **The declared string is still the floor.** A primitive taking a behaviour
 *   must declare its text whether or not it names a prop, so the control has a
 *   name in every language before any node is written — and a node that says
 *   nothing gets it.
 * - **A string is what crosses the seam**, not the props. What a behaviour's
 *   `build` receives is still the node's text, the primitive's strings and now
 *   one resolved word; a control that could read props is a control a model
 *   configures, which is the thing the seam exists to prevent.
 */

/**
 * What a primitive declared: the prop each of its controls is named by.
 *
 * Partial on purpose. A primitive naming one control and leaving the others to
 * their declared strings is the ordinary case — a dialog's trigger carries the
 * page's words and its cross is still *Close*.
 */
export type ControlNameProps = Readonly<Partial<Record<BehaviourName, string>>>

/** The answer for a primitive that named none, which is almost all of them. */
export const NO_CONTROL_NAME_PROPS: ControlNameProps = Object.freeze(
  Object.create(null) as Record<BehaviourName, string>
)

/**
 * What one node resolved to: the words each control is announced by here.
 *
 * Partial again, and for a second reason: a prop the primitive named may be
 * absent from this node, or hold something that is not a usable name, and both
 * mean *this node said nothing* rather than *this control has no name*.
 */
export type ControlNames = Readonly<Partial<Record<BehaviourName, string>>>

/** The answer for a node whose primitive named none, or that filled none in. */
export const NO_CONTROL_NAMES: ControlNames = Object.freeze(
  Object.create(null) as Record<BehaviourName, string>
)

/**
 * Reads the named props off one node.
 *
 * A value survives only if it is a string with something in it. Everything else
 * — absent, `null`, a number, an object, whitespace — is dropped, and dropping
 * it is the whole of the error handling here: what it falls back to is the
 * string the primitive declared, which is a real name in the deployment's
 * language rather than a hole.
 *
 * That is deliberately quieter than the frame seam, which reports a URL it
 * refused. A frame that will not render is a thing the tree asked for and did
 * not get; a name that was not written is a tree declining an option, and the
 * page is correct either way. Nothing here is a diagnostic.
 */
export const resolveControlNames = (
  props: JsonObject,
  declared: ControlNameProps
): ControlNames => {
  const names: Record<string, string> = Object.create(null) as Record<string, string>
  let found = false

  for (const [behaviour, prop] of Object.entries(declared)) {
    if (prop === undefined) continue

    /** Own-property only: a prop called `constructor` must read as absent. */
    const value = Object.hasOwn(props, prop) ? props[prop] : undefined
    if (typeof value !== "string") continue

    const name = value.trim()
    if (name === "") continue

    names[behaviour] = name
    found = true
  }

  return found ? (Object.freeze(names) as ControlNames) : NO_CONTROL_NAMES
}
