import { createElement, type ReactNode } from "react"

import type { PrimitiveType } from "../primitive-type.js"

import { AdjustControl } from "./behaviour-adjust.js"
import { CopyControl } from "./behaviour-copy.js"
import { DiscloseControl } from "./behaviour-disclose.js"
import { DismissControl, PresentControl } from "./behaviour-present.js"
import { NO_CONTROL_NAMES, type ControlNameProps, type ControlNames } from "./control-name.js"
import type { PrimitiveText } from "./text.js"

export { DISCLOSED_ATTRIBUTE } from "./disclosed.js"
export { DISMISS_EVENT, PRESENTED_ATTRIBUTE } from "./presented.js"
export {
  NO_CONTROL_NAME_PROPS,
  NO_CONTROL_NAMES,
  resolveControlNames,
  type ControlNameProps,
  type ControlNames,
} from "./control-name.js"

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
 *
 * `present` and `dismiss` are the fourth and fifth, and they are the first
 * *pair*: a third axis, which is whether a control is answerable to another one.
 * Every member before them is complete on its own, and an overlay is the case
 * where that stops being possible — a dialog is closed by a cross inside the
 * panel as well as by the trigger that opened it, and a click handler is a
 * function whichever button it is on. So `dismiss` is meaningless without
 * `present`, which is a fourth thing the registry checks at registration, and
 * the two agree through the DOM rather than through the seam. `presented.ts`
 * carries why, and [0176](../../decisions/0176-a-control-may-be-answerable-to-another-control-and-they-agree-through-the-dom.md)
 * records what was rejected.
 *
 * A fifth axis arrived with the first control whose word is not the framework's:
 * **where a control's name comes from.** Every member's name is a string its
 * primitive declared, per type, so every code panel's button reads *Copy* and a
 * dictionary can translate all of them at once. That is right for an affordance
 * and wrong for a trigger whose words are the page's own — *Watch the demo* is
 * content, and a dialog opened by a chip reading *Open* is a worse page than no
 * dialog. So a primitive may name one of its own props as where a control takes
 * its name from, the runtime reads it off the node, and the declared string stays
 * underneath as the floor; `control-name.ts` carries why that is narrower than a
 * reserved prop, and
 * [0231](../../decisions/0231-a-primitive-may-name-a-control-from-the-tree-and-its-declared-string-is-the-floor.md)
 * records what was rejected.
 *
 * What a control hands back is not the same question as what a primitive may say
 * about it, and the second one lives in `control.ts`: the class every control
 * carries, and the custom property that decides whether it is displayed. Both
 * exist because a control's presentation is an inline style, which a rule cannot
 * beat.
 */

export const BEHAVIOUR_NAMES = ["copy", "disclose", "adjust", "present", "dismiss"] as const

export type BehaviourName = (typeof BEHAVIOUR_NAMES)[number]


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
 * **The fallback is not optional and not decoration**, and it holds for longer
 * than it first appeared to. The property is absent until **the reader has
 * moved the control**, and absent again the moment it unmounts — so the second
 * argument to `var()` is what a page renders both with scripting off and with
 * scripting on and nobody having touched it yet. It should be the position the
 * primitive's own props declared.
 *
 * It was written as absent until the control *mounted*, which made a declared
 * position visible only on an unscripted page: the control published the
 * runtime's midpoint in its mount effect, so a band authored at 35 rendered at
 * 35 and jumped to 50 as hydration landed. A control now publishes nothing it
 * was not asked for, and says where it starts through
 * {@link ADJUST_RESTING_PROPERTY} instead. Every taker was already required to
 * write a fallback, so the narrower contract takes nothing away from one that
 * followed it.
 *
 * See [0096](../../decisions/0096-a-behaviour-publishes-a-value-on-the-element-the-primitive-placed-it-in.md)
 * for where the property goes and
 * [0226](../../decisions/0226-a-primitive-declares-where-its-control-rests-and-the-control-publishes-nothing-until-the-reader-moves-it.md)
 * for when it is written.
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
 * The property a primitive declares to say **where its control should start**,
 * on the element it places the control in. Read once, at mount, and never
 * again — where the slider goes after that is the reader's.
 *
 * It exists because the obvious route to the same number is closed. `build`
 * receives a node's text and its content, not its props, and that is 0086's
 * shape rather than an omission: props are AI-authored, and a control a model
 * configures is the thing the behaviour seam exists to prevent. So the number
 * does not come through the seam. It comes the way `present` and `dismiss`
 * agree (0176) — **through the DOM**, off the one element the primitive already
 * chose by deciding where the control goes.
 *
 * Nothing new is exposed by that. A primitive taking `adjust` already renders
 * its declared position into the page, as the `var()` fallback the still
 * version is built on; this is the same number written where the control can
 * read it, so the control starts where the page already is:
 *
 * ```ts
 * const wipe = `var(${ADJUST_PROPERTY}, ${position})`
 * // on the element the control is placed in:
 * style: { [ADJUST_RESTING_PROPERTY]: position, ... }
 * ```
 *
 * Declaring it is optional and a primitive that leaves it out gets
 * {@link ADJUST_RESTING}. What it may not do is declare one number here and a
 * different one as the `var()` fallback — the first is where the control
 * starts, the second is what a page with no scripting shows, and a page where
 * those disagree is a page that moves on hydration. See
 * [0226](../../decisions/0226-a-primitive-declares-where-its-control-rests-and-the-control-publishes-nothing-until-the-reader-moves-it.md).
 */
export const ADJUST_RESTING_PROPERTY = "--loom-adjust-resting"

/**
 * Where the control sits when nothing declared otherwise.
 *
 * The midpoint, and it is the runtime's floor rather than the answer: a
 * primitive that has a position of its own says so with
 * {@link ADJUST_RESTING_PROPERTY}, and this is what a primitive with no opinion
 * gets. Fixed rather than declarable per node, for the reason the range is
 * fixed — what a control rests at is not a model's to write.
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
  /**
   * Another member of the vocabulary this one does nothing without.
   *
   * `undefined` for every behaviour that is complete on its own, which is four
   * of the five. It exists for `dismiss`, whose control asks the nearest
   * presentation above it to close: declared without `present`, it renders a
   * button that dispatches an event nothing is listening for, on a region
   * nothing opens. That is a dead control rather than a wrong one, so it is
   * refused at registration rather than reported by the audit — the same
   * judgement the seam already makes about a control with no accessible name.
   */
  readonly requires?: BehaviourName
  /**
   * Builds the control.
   *
   * Three arguments, and each is a different answer to *where does a control's
   * word come from*. `content` is the node's own text, which is what a copy
   * button acts on. `text` is the primitive's declared strings, laid over by
   * whatever dictionary the deployment supplied. `name` is the word this node
   * named its control with, or `undefined` where its primitive named no prop or
   * the node filled none in — so every member decides for itself which of its
   * strings a tree is allowed to replace, and `copy` lets a tree rename the
   * button without touching what it says once it has copied.
   */
  readonly build: (
    content: string,
    text: PrimitiveText<string>,
    name: string | undefined
  ) => ReactNode
}

export const BEHAVIOURS: Readonly<Record<BehaviourName, Behaviour>> = {
  copy: {
    description:
      "A control that puts the node's own text on the clipboard, and shows itself only where the clipboard is actually available.",
    text: ["copy", "copied"],
    rendersControl: true,
    build: (content, text, name) =>
      createElement(CopyControl, {
        value: content,
        label: name ?? text.copy ?? "",
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
    build: (_content, text, name) =>
      createElement(DiscloseControl, {
        label: name ?? text.disclose ?? "",
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
    build: (_content, text, name) =>
      createElement(AdjustControl, {
        label: name ?? text.adjust ?? "",
      }),
  },
  /**
   * The fourth member, and the first whose state something other than its own
   * button can change.
   *
   * It is `disclose` for a region that is not the button's sibling. The state
   * goes on the element the primitive placed the trigger in, so a descendant
   * selector reaches a panel, a menu or a frame laid out anywhere inside that
   * box; Escape and a press outside that box close it, because an overlay a
   * reader cannot get out of is the failure every one of these primitives is
   * judged on. See {@link PRESENTED_ATTRIBUTE}.
   */
  present: {
    description:
      "A control that opens a region the primitive lays out inside it and closes again on Escape, on a press outside, or on a dismiss control within it.",
    text: ["present"],
    rendersControl: true,
    build: (_content, text, name) =>
      createElement(PresentControl, {
        label: name ?? text.present ?? "",
      }),
  },
  /**
   * The fifth, and the only one that is not complete on its own.
   *
   * It publishes nothing and reads nothing. Pressed, it asks the nearest
   * presentation above it to close, and that is the whole of it — see
   * {@link DISMISS_EVENT} for why a bubbling event rather than a shared store,
   * and `behaviour-present.ts` for why this is the one control whose name is
   * not rendered as text.
   */
  dismiss: {
    description:
      "A cross inside a presented region that closes it, for the overlay whose own scrim fills the page and cannot be pressed past.",
    text: ["dismiss"],
    rendersControl: true,
    requires: "present",
    build: (_content, text, name) =>
      createElement(DismissControl, {
        label: name ?? text.dismiss ?? "",
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
  /**
   * The prop each of this type's controls takes its name from, where its author
   * said so.
   *
   * Optional on the interface, and that is the only concession this seam makes
   * to compatibility: a resolver written before a control could be named from a
   * tree answers nothing here and is read as a library whose primitives all name
   * their controls themselves, which is what it is. A registry built by the SDK
   * always answers.
   */
  readonly controlNamePropsFor?: (type: PrimitiveType) => ControlNameProps
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
  text: PrimitiveText<string>,
  named: ControlNames = NO_CONTROL_NAMES
): ResolvedBehaviours => {
  if (names.length === 0) return NO_RESOLVED_BEHAVIOURS

  const behaviours: Record<string, ReactNode> = Object.create(null) as Record<string, ReactNode>
  const unnamed: UnnamedBehaviour[] = []

  for (const name of names) {
    const behaviour = BEHAVIOURS[name]
    const missing = behaviour.text.find((key) => (text[key] ?? "").trim() === "")

    /**
     * Checked before the node's own word is considered, and that order is the
     * decision rather than a detail. A primitive declaring no strings is a
     * primitive whose control has no name in a deployment that translates, and
     * one node happening to carry a usable word does not make it translatable —
     * so a tree cannot talk a nameless control onto the page.
     */
    if (missing !== undefined) {
      unnamed.push({ behaviour: name, key: missing })
      continue
    }

    behaviours[name] = behaviour.build(content, text, named[name])
  }

  return {
    behaviours: Object.freeze(behaviours) as PrimitiveBehaviours<BehaviourName>,
    unnamed: unnamed.length === 0 ? NO_UNNAMED : Object.freeze(unnamed),
  }
}
