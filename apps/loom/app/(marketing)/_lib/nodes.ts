import {
  buildElement,
  buildSlot,
  buildText,
  type IdFactory,
  type JsonObject,
  type LoomNode,
} from "@loom/runtime"

/**
 * The three nodes every page builds by the dozen, as functions.
 *
 * A heading is a `loom.heading` element whose text is a child node rather than
 * a prop, and writing that out four times per section is how a page tree stops
 * being readable. Nothing here is a component and nothing here is registered:
 * these are constructors for tree nodes, and the tree they produce is the same
 * tree the long-hand would have produced.
 */

export const heading = (
  ids: IdFactory,
  level: number,
  text: string,
  props: JsonObject = {}
): LoomNode =>
  buildElement(ids, {
    type: "loom.heading",
    props: { level, ...props },
    children: [buildText(ids, text)],
  })

export const prose = (ids: IdFactory, text: string, props: JsonObject = {}): LoomNode =>
  buildElement(ids, { type: "loom.prose", props, children: [buildText(ids, text)] })

export const action = (
  ids: IdFactory,
  label: string,
  href: string,
  props: JsonObject = {}
): LoomNode =>
  buildElement(ids, {
    type: "loom.action",
    props: { href, ...props },
    children: [buildText(ids, label)],
  })

/**
 * A link, which is not a button.
 *
 * `loom.action` is the button and this is the link, and the site spent its
 * first two weeks conflating them: the header was five `quiet` actions in a
 * row, because a quiet button was the closest thing the catalogue offered to a
 * menu item. It is not one — it carries a button's padding and pill radius, and
 * five in a row read as five dismissed choices. The primitive arrived in #97,
 * filed against that comment.
 */
export const link = (
  ids: IdFactory,
  label: string,
  href: string,
  props: JsonObject = {}
): LoomNode =>
  buildElement(ids, {
    type: "loom.link",
    props: { href, ...props },
    children: [buildText(ids, label)],
  })

/** A band with its heading in the region the section places it in (0051). */
export const section = (
  ids: IdFactory,
  props: JsonObject,
  headingText: string,
  children: readonly LoomNode[],
  headingProps: JsonObject = {}
): LoomNode =>
  buildElement(ids, {
    type: "loom.section",
    props,
    children: [
      buildSlot(ids, "heading", [heading(ids, 2, headingText, { balance: true, ...headingProps })]),
      ...children,
    ],
  })

export const stack = (ids: IdFactory, props: JsonObject, children: readonly LoomNode[]): LoomNode =>
  buildElement(ids, { type: "loom.stack", props, children: [...children] })
