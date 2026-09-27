import {
  buildElement,
  buildSlot,
  buildText,
  type IdFactory,
  type JsonObject,
  type LoomNode,
} from "@jam-overture/loom"

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

/**
 * The three a table costs, which two pages now pay.
 *
 * `loom.table` is four types deep — a table holding rows holding cells holding
 * text, with the heading row projected into a `columns` region — so the
 * long-hand for a five-row table is unreadable and nobody writes it twice. The
 * rules page wrote these three locally on 28 August; the components page needed
 * exactly them, and a second private copy is how two tables on one site start
 * disagreeing about what a heading cell is.
 *
 * They sit here with `heading` and `prose` because they are the same kind of
 * thing: constructors for nodes, registered nowhere, composing what the library
 * already offers. Nothing about a table is decided here.
 */
export const cell = (ids: IdFactory, text: string, props: JsonObject = {}): LoomNode =>
  buildElement(ids, { type: "loom.table-cell", props, children: [buildText(ids, text)] })

export const row = (ids: IdFactory, cells: readonly LoomNode[]): LoomNode =>
  buildElement(ids, { type: "loom.table-row", props: {}, children: [...cells] })

/** The heading row, in the region a table projects it into (0051). */
export const columns = (ids: IdFactory, headings: readonly string[]): LoomNode =>
  buildSlot(ids, "columns", [row(ids, headings.map((text) => cell(ids, text, { role: "column" })))])

/**
 * A panel of data, and the one prop this site sets on every one of them.
 *
 * `loom.code` renders `white-space: pre` and scrolls sideways, which is right
 * for the thing it was ported for — a shell line broken across two visual rows
 * reads as two commands, and the content's own breaks are the only ones that
 * mean anything. **This site has never printed a command.** All eight of its
 * panels print pretty-printed JSON, and a pretty-printed JSON string value is
 * one line however long the string is: there is no line structure below the
 * printer's to preserve, so nothing is lost by wrapping it and the end of the
 * line is lost by not.
 *
 * That is this lane's own finding of 3 September, and `wrap` was added to the
 * primitive to answer it on 12 September. **No page here ever set it.** Measured
 * on `/how-it-works` three weeks later: seven panels, 341 lines, and the three
 * lines longer than 110 characters are the only three in the whole record
 * written in English — the model's `rationale` twice, saying why it asked for
 * the change, and the refusal's `detail`, saying why it was turned down. At
 * 1280 the panel shows about 125 characters and all three are cut mid-word; at
 * 390 it shows about 39 and roughly a third of every panel goes with them. The
 * band's own caption says *every line stands on its own*, three inches under a
 * line nobody can finish.
 *
 * So the default is the rule rather than the primitive's, and it is a default
 * rather than a fixture: `wrap` is written first, so a panel that one day prints
 * something you are meant to type can say `wrap: false` and be read as the
 * deliberate exception it would be. `pages.test.ts` sweeps every page tree for
 * a panel that says neither.
 */
export const code = (ids: IdFactory, text: string, props: JsonObject = {}): LoomNode =>
  buildElement(ids, {
    type: "loom.code",
    props: { wrap: true, ...props },
    children: [buildText(ids, text)],
  })
