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
 * The third control in a row, and the reason it is not `variant: "quiet"`.
 *
 * `control.ts` offers three paints and the library's own note says what each is
 * for: a filled one for the thing you came to do, an outlined one for the thing
 * beside it, and a quiet one for the thing after that. The quiet one is
 * `background: transparent`, `border: 1px solid transparent`, and
 * `color: accent`. Everything it has to tell a reader it can be pressed is that
 * one colour.
 *
 * **On the palette this site is served under, that colour is the colour of the
 * sentence next to it.** `minimal` sets `accent` to `#0a0a0a` and `fg-default`
 * to `#0a0a0a`, and it does so deliberately: `src/theme/library.ts` records
 * that black accent as the maintainer's own call after seeing it green. So the
 * palette is right and the control is the one that is wrong, which is why this
 * is a composition change rather than a palette one.
 *
 * Measured with the repository's own instrument rather than by eye.
 * `colourDifference` puts the two at **0.00** on `minimal` against a
 * just-noticeable difference of 2.3, and under that difference on `graphite`
 * and `obsidian` as well. What is left of a quiet control on this site is that
 * it is **bold** — the same mark `loom.emphasis` puts on a stressed word — and
 * the four places it was used stood it in a row beside a filled pill and an
 * outlined one, where it read as a caption. Photographed on the front door,
 * `/how-it-works` and `/what-you-run` before this changed.
 *
 * **The framework already knew.** `src/theme/separation.ts` declares
 * `fg-default` against `accent` as a `colour-only` pairing and its own comment
 * calls it *"the row that fails"*. Nothing connected that measurement to a site
 * built on the pair in six places, which is what `controls.test.ts` now does.
 *
 * **So the hierarchy is carried by size instead of by colour.** `secondary`
 * draws `border-strong`, which is above the just-noticeable difference against
 * both grounds on all twenty-one starter palettes, and `scale: "small"` is the
 * step down that `quiet` was spending a colour on. A length is relative to the
 * thing beside it and a second colour token is not, which is the lesson
 * `tokens.ts` wrote down on 23 August after `loom.emphasis` rendered a stressed
 * word identically to its sentence under `bold-sans`.
 *
 * **It is not a rule against the variant.** The day the palettes this site
 * offers separate the two slots, `controls.test.ts` says so and this goes back
 * to `quiet` — the premise is an assertion rather than a sentence.
 */
export const TERTIARY_CONTROL: JsonObject = { variant: "secondary", scale: "small" }

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

/**
 * A band with its heading in the region the section places it in (0051).
 *
 * ## Why no band on this site asks for `tone: "surface"`
 *
 * Six of them did until 28 September, and on the palette a visitor arrives on
 * the tone draws **nothing at all except its own padding**. Photographed on all
 * three, which is the only way it is visible:
 *
 * | | `loom.card`, tone `surface` | `loom.section`, tone `surface` |
 * | --- | --- | --- |
 * | fill | `bg-surface` | `bg-surface` |
 * | outline | `1px solid border-subtle` | **none** |
 * | padding | yes | yes, `space(5)` inline |
 *
 * `minimal` sets `bg-surface` to `#ffffff`, which is exactly its `bg-canvas`,
 * and does it **on purpose** — its own comment in `src/theme/library.ts` says
 * components there are "defined by its border instead of by a change of
 * background", and the palette pays for that by making `border-subtle` a step
 * darker than a fill-backed palette needs. A card collects on that bargain. A
 * section does not read a border token at all, so what survives on the house
 * theme is thirty-two pixels of inset with no edge drawn around it: one band in
 * five on `/how-it-works`, two in three on `/what-you-run`, and three of nine on
 * the front door, each stepped in from the left rule every other band sits on,
 * for a reason a reader cannot see because there is nothing there to see.
 *
 * It reads as deliberate on `bold` and `editorial`, where the fill is a real
 * change of colour. That is the trap: the tone is correct on two palettes and is
 * a ragged left margin on the one every screenshot and every visitor gets.
 *
 * So the site stops asking for a plate the house theme cannot draw. **This is a
 * composition change and not a verdict on the tone** — the finding of
 * 28 September is filed for `Loom primitives`, and the day `loom.section`
 * outlines its tones the way `loom.card` already does, the bands that genuinely
 * are a different kind of thing should take it back. `pages.test.ts` holds the
 * rule and names the finding, so putting one back is a line of code and a line
 * of test rather than an argument.
 */
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

/**
 * The same band with its heading **beside** the answer rather than above it,
 * and the measurement that says why the two interior pages need one.
 *
 * `loom.section` lays its heading region, then its content, in a column. That
 * is right for a band whose content fills the width — a grid of figures, a
 * table, the framed demonstration — and it is wrong for the nine bands on
 * `/how-it-works` and `/what-you-run` whose content is two short paragraphs,
 * because a paragraph is capped at the reading measure and a band is not:
 *
 * | | |
 * | --- | --- |
 * | the band, `width: "wide"` | 1120px, less the page's own padding |
 * | a `measured` paragraph in it | `READABLE_MEASURE`, 68ch |
 * | what is left over at 1280 | **roughly half the band, empty, on every one of them** |
 *
 * Nine bands in a row of heading-over-half-empty-band is not spareness, which
 * is what the 26 September cut was for. It is a page that looks like it did not
 * finish loading, and it was invisible to every test this surface has: each
 * band is correct, the overflow measurement only ever reports a page that is
 * too *wide*, and a screenshot is the only instrument that sees it.
 *
 * So the heading goes in the space the paragraph was not using. Three things
 * fall out of that, and all three are why this is a composition rather than a
 * finding for `loom.section`:
 *
 * - **The column becomes the measure.** Each half is ≈ 540px, which is the
 *   reading measure to within a few characters, so the prose inside one sets no
 *   `measured` of its own — `loom.prose`'s own schema says a paragraph in a
 *   narrow column is already measured.
 * - **The heading is held to its column.** `loom.split` declares inline-size
 *   containment per column and `loom.heading` caps its top two steps in `cqi`
 *   for exactly this case — its comment names *one half of a `loom.split`* as
 *   the composition that made the unit change from `vw`.
 * - **A phone keeps the order and loses a little height.** The columns wrap
 *   below ≈ 600px, so at 390 the heading is above the paragraphs exactly as it
 *   was. It is not byte-identical and the report says so: a split column's own
 *   gap is one step tighter than a section's content region, which takes about
 *   44px off each band — 220px off `/how-it-works` and 204px off
 *   `/what-you-run`, measured at 390 against `main`.
 *
 * The eyebrow stays on the section rather than moving into the column with the
 * heading: it is the band's name, `outline.ts` reads it off the band, and it
 * already sits directly above the heading once the heading is left-aligned.
 */
export const splitSection = (
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
      buildElement(ids, {
        type: "loom.split",
        props: { ratio: "even", align: "start" },
        children: [
          buildSlot(ids, "start", [
            heading(ids, 2, headingText, { balance: true, ...headingProps }),
          ]),
          buildSlot(ids, "end", [...children]),
        ],
      }),
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
