import { createElement, type ReactNode } from "react"

import type { PrimitiveType } from "../primitive-type.js"

import { AdjustControl } from "./behaviour-adjust.js"
import { CopyControl } from "./behaviour-copy.js"
import { DiscloseControl } from "./behaviour-disclose.js"
import type { PrimitiveText } from "./text.js"

/**
 * The behaviour seam: the things a primitive *does* that its props cannot carry.
 *
 * It is the fourth gap of the shape §4e, §4f and §4g each answered. Data is a
 * question props cannot ask; text is a string props must not hold; a submission
 * is an address props may not name. A **behaviour** is an interaction props
 * cannot express at all — a click handler is a function, and a primitive's
 * props are JSON.
 *
 * The case that forced it is the copy button on a code panel: every reference
 * site a developer reads has one, and `loom.code` could not have one, because
 * there was nowhere for a behaviour to come from. `interactive` was the closest
 * thing and it is not that — it *describes* a target so the Gate can refuse a
 * bad nesting, and describing one does not create one.
 *
 * **A behaviour is a control the framework builds and a primitive places.** Not
 * a prop, not a script a host remembers to install, not a client boundary each
 * primitive opens for itself:
 *
 * - **Not a prop**, for 0055's reason. A prop is written by a model and weighed
 *   by the Gate as a small reversible change, and "this button now copies
 *   something else" is not that. Nothing in the tree names a behaviour; the
 *   registered component does, and a human approved that component once.
 * - **Not a host-installed script**, for 0055's other reason. A primitive that
 *   works only where somebody remembered to link something fails silently, in
 *   someone else's deployment, with nothing in the render to say why.
 * - **Not a client boundary per primitive.** That is the shape this could have
 *   taken and the reason it does not is the closed set. The things a Loom page
 *   may *do* are as much a bounded vocabulary as the primitives it may name and
 *   the schemes a URL may use (0053); a library where any component may open a
 *   boundary has no such list, and nothing to check against it.
 *
 * So the vocabulary is here, one entry per behaviour, and `src/primitives/`
 * declares from it and never implements. Three things follow, and each one is a
 * check the registry can make at registration rather than a bug someone finds
 * on a page:
 *
 * - A control needs an **accessible name**, so a behaviour names the text keys
 *   the primitive must declare — and they resolve through the ordinary text
 *   seam, so a German deployment translates the copy button with the dictionary
 *   it already has.
 * - A control **is a target**, so a primitive that takes one must say it is
 *   `interactive` — otherwise the Gate would let a code panel with a copy
 *   button sit inside a linked card, which is a button inside an anchor and one
 *   of the two silently stops working.
 * - A behaviour the primitive **never places** is a control that never appears,
 *   which is what the conformance probe reports the same way it reports a
 *   declared slot nobody rendered.
 *
 * What a control acts on comes from the **tree**, not from the DOM. The copy
 * button copies the text of the node it belongs to, read off the same tree the
 * page was projected from — so it is right before the browser has laid anything
 * out, needs no ref into markup the primitive owns, and copies what the page
 * *says* rather than whatever text happened to render beside it.
 *
 * Two members later that is still true of what a control *reads*, and the
 * vocabulary has grown a second axis it says nothing about: what a control hands
 * *back*. `copy` hands back nothing. `disclose` hands back a boolean, on its own
 * element, which a sibling selector reaches. `adjust` hands back a number, on the
 * element the primitive placed it in, because inheritance is the only way a
 * stylesheet can compute with one. Each is the smallest thing that reaches the
 * layout it has to reach, and
 * [0096](../../decisions/0096-a-behaviour-publishes-a-value-on-the-element-the-primitive-placed-it-in.md)
 * records why the third could not be the second.
 */

export const BEHAVIOUR_NAMES = ["copy", "disclose", "adjust"] as const

export type BehaviourName = (typeof BEHAVIOUR_NAMES)[number]

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

/**
 * The custom property an adjust control publishes its value on: a plain number
 * between {@link ADJUST_MINIMUM} and {@link ADJUST_MAXIMUM}, no unit.
 *
 * **This is the whole of the contract between the runtime and a primitive that
 * takes `adjust`**, and it is a custom property rather than an attribute for the
 * one reason an attribute cannot be made to work: what this hands back is a
 * number a stylesheet has to *compute with*, and there is no portable way to
 * read an attribute's value into a length. `attr()` outside `content` is not
 * something a library may rely on today.
 *
 * A property is read with `var()`, which resolves by **inheritance**, and that
 * is what makes this behaviour differ from `disclose` in a way worth stating
 * rather than glossing. `data-loom-disclosed` is read *sideways*, by an ordinary
 * sibling selector, so the control stamping it on its own button reaches the
 * region beside it. Inheritance runs downwards only, so a property set on the
 * control's own element would be readable by nothing at all — least of all the
 * sibling region the control exists to drive.
 *
 * So the control writes this property on **the element the primitive placed it
 * in**, its parent, and the primitive reads it from anywhere in that subtree.
 * The unit is left off deliberately, so one value serves every use:
 *
 * ```css
 * .after { clip-path: inset(0 calc(100% - var(--loom-adjust, 50) * 1%) 0 0) }
 * ```
 *
 * **The fallback is not optional and not decoration.** The property is absent
 * until the control has mounted and proved scripting runs, and absent again the
 * moment it unmounts — so the second argument to `var()` is what a page served
 * with scripting off renders, and it should be the position the primitive's own
 * props declared. That is what keeps the still version of a comparison the thing
 * that ships, rather than a blank waiting on a control that may never arrive.
 *
 * See [0096](../../decisions/0096-a-behaviour-publishes-a-value-on-the-element-the-primitive-placed-it-in.md).
 */
export const ADJUST_PROPERTY = "--loom-adjust"

/** The bottom of an adjust control's range. */
export const ADJUST_MINIMUM = 0

/**
 * The top of an adjust control's range.
 *
 * A percentage rather than a unit interval, because every use so far multiplies
 * by `1%` and a stylesheet author reading `var(--loom-adjust)` should see the
 * number they would have typed. Fixed rather than declarable for the reason the
 * seam gives about props: what a control ranges over is not a model's to write.
 */
export const ADJUST_MAXIMUM = 100

/**
 * Where the control sits before anybody moves it.
 *
 * The midpoint, and it is the control's rather than the primitive's on purpose.
 * `build` receives the node's text and its content, not its props, so there is
 * nothing here that could read a declared position — and nothing that needs to:
 * the primitive supplies its own position as the `var()` fallback, which covers
 * the case that actually matters, the page where the control never mounts. Once
 * a reader has a slider in front of them, where it started is theirs to change.
 */
export const ADJUST_RESTING = 50

type Behaviour = {
  /** One line, for the reference. A behaviour is never shown to a model. */
  readonly description: string
  /**
   * The text keys the primitive must declare for this control to have a name.
   * Checked at registration, so a control with no accessible name is not
   * reachable by leaving something out.
   */
  readonly text: readonly string[]
  /**
   * Whether it puts something on the page the reader aims at. Everything so far
   * does; the field exists because the check it drives — that the primitive
   * declares itself `interactive` — would be wrong to apply to a behaviour that
   * renders nothing, and the first of those is a question of when, not if.
   */
  readonly rendersControl: boolean
  readonly build: (content: string, text: PrimitiveText<string>) => ReactNode
}

export const BEHAVIOURS: Readonly<Record<BehaviourName, Behaviour>> = {
  copy: {
    description:
      "A control that puts the node's own text on the clipboard, and shows itself only where the clipboard is actually available.",
    text: ["copy", "copied"],
    rendersControl: true,
    build: (content, text) =>
      createElement(CopyControl, {
        value: content,
        label: text.copy ?? "",
        copiedLabel: text.copied ?? "",
      }),
  },
  /**
   * The second member, and the first that does not act on the node's text.
   *
   * `copy` reads `content` because what it acts on is in the tree. A disclosure
   * acts on a *region of the render*, which is not in the tree and is not the
   * runtime's to reach for — so the control publishes its state as
   * `DISCLOSED_ATTRIBUTE` and the primitive's stylesheet does the rest. That
   * asymmetry is the point rather than an omission: it is what lets a behaviour
   * be a single node the primitive places, in the case where the thing being
   * behaved on is layout the primitive owns.
   */
  disclose: {
    description:
      "A control that opens and closes a region the primitive lays out beside it, and shows itself only where scripting actually runs.",
    text: ["disclose"],
    rendersControl: true,
    build: (_content, text) =>
      createElement(DiscloseControl, {
        label: text.disclose ?? "",
      }),
  },
  /**
   * The third member, and the first that hands a value *back*.
   *
   * `copy` reads the node's text because what it acts on is in the tree.
   * `disclose` publishes a boolean because what it acts on is layout the
   * primitive owns and a sibling selector can reach. This publishes a number,
   * because what it acts on is a length a stylesheet has to compute — and that
   * is the one thing neither of the other two shapes can express.
   *
   * It is the first control that writes to an element the runtime did not
   * create, which is a cost recorded rather than a detail (0096). The element is
   * the one the primitive placed the control in, so it is chosen and not
   * discovered; see {@link ADJUST_PROPERTY}.
   */
  adjust: {
    description:
      "A control the reader drags to choose a number, published to the primitive as a CSS custom property so a stylesheet can compute a length from it.",
    text: ["adjust"],
    rendersControl: true,
    build: (_content, text) =>
      createElement(AdjustControl, {
        label: text.adjust ?? "",
      }),
  },
}

export const isBehaviourName = (value: string): value is BehaviourName =>
  (BEHAVIOUR_NAMES as readonly string[]).includes(value)

/**
 * The controls a primitive receives, by declared behaviour name — already built
 * and ready to place, the way `loom.slots` hands over rendered regions.
 *
 * A node rather than a component on purpose. There is nothing left for the
 * primitive to configure: the text came from its own declarations and the
 * content came from the tree, so a component here would be a component with no
 * props anybody could get right or wrong. Placing it is the whole of the
 * primitive's part, and where it goes is the whole of its discretion.
 *
 * `TName` is the union of names the primitive declared, so reading a behaviour
 * it did not ask for does not compile — the same bargain `loom.text` makes.
 */
export type PrimitiveBehaviours<TName extends BehaviourName = never> = Readonly<
  Record<TName, ReactNode>
>

/**
 * The map handed to a primitive that declared none. Null-prototype for the
 * reason `NO_TEXT` gives: `constructor` is not a behaviour name today, and a
 * lookup that answered with a function off `Object.prototype` if it ever were
 * is not a thing anyone should have to debug from a rendered page.
 */
export const NO_BEHAVIOURS: PrimitiveBehaviours<BehaviourName> = Object.freeze(
  Object.create(null) as Record<BehaviourName, ReactNode>
)

/**
 * The renderer's whole dependency on the seam: which behaviours a type declared.
 *
 * A separate interface for the reason `TextResolver` is one, with the opposite
 * conclusion about wiring: there is nothing for a host to supply here, because
 * a behaviour's implementation is this package's and its strings arrive through
 * the text seam. So a registry built by §4's SDK answers this, and a resolver
 * that is not one has no declarations to lose.
 */
export interface BehaviourResolver {
  readonly behavioursFor: (type: PrimitiveType) => readonly BehaviourName[]
}

export const isBehaviourResolver = (value: object): value is BehaviourResolver =>
  typeof (value as Partial<BehaviourResolver>).behavioursFor === "function"

/** A declared behaviour whose control could not be given a name. */
export type UnnamedBehaviour = {
  readonly behaviour: BehaviourName
  readonly key: string
}

export type ResolvedBehaviours = {
  readonly behaviours: PrimitiveBehaviours<BehaviourName>
  /**
   * Behaviours left out because a key resolved to nothing. The registry refuses
   * a primitive that declares neither, so the way here is a host dictionary
   * that answers a declared key with a blank — which `overlayText` has no
   * business second-guessing and this has no business rendering.
   */
  readonly unnamed: readonly UnnamedBehaviour[]
}

const NO_UNNAMED: readonly UnnamedBehaviour[] = Object.freeze([])

export const NO_RESOLVED_BEHAVIOURS: ResolvedBehaviours = Object.freeze({
  behaviours: NO_BEHAVIOURS,
  unnamed: NO_UNNAMED,
})

/**
 * Builds the controls for one node.
 *
 * A behaviour whose text is missing or blank is **dropped rather than rendered
 * nameless**. That is the same judgement the text seam makes about a control
 * with no accessible name, taken one step further because there is a whole
 * control to leave out here rather than a string to fall back on: a copy button
 * a screen reader announces as "button" is worse than a page with no copy
 * button, in exactly the way the finding that asked for this said a fake one
 * would be.
 */
export const resolveBehaviours = (
  names: readonly BehaviourName[],
  content: string,
  text: PrimitiveText<string>
): ResolvedBehaviours => {
  if (names.length === 0) return NO_RESOLVED_BEHAVIOURS

  const behaviours: Record<string, ReactNode> = Object.create(null) as Record<string, ReactNode>
  const unnamed: UnnamedBehaviour[] = []

  for (const name of names) {
    const behaviour = BEHAVIOURS[name]
    const missing = behaviour.text.find((key) => (text[key] ?? "").trim() === "")

    if (missing !== undefined) {
      unnamed.push({ behaviour: name, key: missing })
      continue
    }

    behaviours[name] = behaviour.build(content, text)
  }

  return {
    behaviours: Object.freeze(behaviours) as PrimitiveBehaviours<BehaviourName>,
    unnamed: unnamed.length === 0 ? NO_UNNAMED : Object.freeze(unnamed),
  }
}
