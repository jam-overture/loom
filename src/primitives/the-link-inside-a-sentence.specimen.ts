import { sequentialIdFactory, type IdFactory } from "../ids.js"
import type { JsonObject } from "../json.js"
import { THEME_PROP_KEY } from "../reserved-props.js"
import { themeSelectionSchema, type ThemeSelection } from "../theme/theme.js"
import { buildElement, buildSlot, buildText } from "../tree/builders.js"
import type { ElementNode, LoomNode } from "../tree/node.js"
import { createTree } from "../tree/tree.js"

import { defineSpecimen } from "../../tools/specimen/specimen.js"

import { compositionById } from "./compositions/index.js"

/**
 * The sheet the 4 October finding asked for: the same sentence drawn with the
 * link this library had and with the one it did not.
 *
 * `Loom marketing` built an inline link for `/what-you-run`, photographed it on
 * all three palettes and **took it out again**, because `loom.link` is a nav
 * item and three of its properties contradict a phrase inside a paragraph. The
 * finding is a page of prose about three things a camera shows in one frame, so
 * this sheet is the argument rather than a restatement of it.
 *
 * ## Why three palettes and not the usual two
 *
 * Every other specimen in this lane is shot on `editorial` and `bold`, which is
 * the pair that moves type, colour and spacing furthest apart. This one adds
 * **`minimal`, because `minimal` is the whole finding**: its `accent` slot and
 * its `fg-default` slot hold the same hex, deliberately, since a single-ink
 * palette has nothing else to be. A `tone: "accent"` phrase on that palette is
 * the colour of the words either side of it — invisible as a link, in the theme
 * every visitor and every screenshot gets first. A sheet that left it out would
 * be a sheet that could not show what was wrong.
 *
 * The pair in §1 is the one to read at size. The left column is what shipped
 * before today and the right is what ships now, in the same paragraph, at the
 * same size, in the same ink.
 */

const text = (ids: IdFactory, value: string) => buildText(ids, value)

const heading = (ids: IdFactory, value: string, level: number, extra: JsonObject = {}): ElementNode =>
  buildElement(ids, { type: "loom.heading", props: { level, ...extra }, children: [text(ids, value)] })

const prose = (ids: IdFactory, children: readonly LoomNode[], extra: JsonObject = {}): ElementNode =>
  buildElement(ids, { type: "loom.prose", props: extra, children: [...children] })

const navLink = (ids: IdFactory, href: string, words: string, extra: JsonObject = {}): ElementNode =>
  buildElement(ids, { type: "loom.link", props: { href, ...extra }, children: [text(ids, words)] })

const inlineLink = (ids: IdFactory, href: string, words: string, extra: JsonObject = {}): ElementNode =>
  buildElement(ids, { type: "loom.inline-link", props: { href, ...extra }, children: [text(ids, words)] })

const caption = (ids: IdFactory, value: string): ElementNode =>
  prose(ids, [text(ids, value)], { size: "small", tone: "muted" })

const section = (ids: IdFactory, eyebrow: string, title: string, children: readonly LoomNode[]): ElementNode =>
  buildElement(ids, {
    type: "loom.section",
    props: { width: "wide", eyebrow },
    children: [buildSlot(ids, "heading", [heading(ids, title, 2, { balance: true })]), ...children],
  })

/** A band of the catalogue by id, so the sheet photographs what ships. */
const band = (ids: IdFactory, id: string): ElementNode => {
  const composition = compositionById(id)

  if (composition === undefined) throw new Error(`the catalogue has no band called ${id}`)

  return composition.build(ids)
}

const opening = (ids: IdFactory): ElementNode =>
  buildElement(ids, {
    type: "loom.section",
    props: { width: "wide", eyebrow: "The prose layer" },
    children: [
      buildSlot(ids, "heading", [heading(ids, "The one kind of link this library could not draw", 1, { balance: true })]),
      prose(
        ids,
        [
          text(ids, "A nav bar says a word is pressable by where the word is. A paragraph says it with an underline, and until today the only underline in this library was a wipe-in on hover that needed a block box to paint. So the sentence on the marketing site that points at another page of it was written, photographed and "),
          buildElement(ids, { type: "loom.emphasis", props: { tone: "marked" }, children: [text(ids, "deleted")] }),
          text(ids, " — twice."),
        ],
        { size: "lead", measured: true }
      ),
    ],
  })

/**
 * The finding, as a pair. Both paragraphs are `loom.prose` at `lead`, one with a
 * `loom.link` in it and one with a `loom.inline-link`, so every difference in
 * the frame is a difference between the two primitives and nothing else.
 */
const theSameSentenceTwice = (ids: IdFactory): ElementNode =>
  section(ids, "§1 · The pair", "The same sentence, with each of the two links in it", [
    buildElement(ids, {
      type: "loom.grid",
      props: { columns: "two", gap: "loose" },
      children: [
        buildElement(ids, {
          type: "loom.stack",
          props: { gap: "snug" },
          children: [
            caption(ids, "Before — loom.link, tone: accent"),
            prose(
              ids,
              [
                text(ids, "Every adaptation this runtime can make is an operation against a tree, and the rule that decides which is "),
                navLink(ids, "/granularity", "written down in one page", { tone: "accent" }),
                text(ids, " that nothing in the library may contradict."),
              ],
              { size: "lead" }
            ),
            caption(ids, "No underline until a pointer arrives. On minimal the accent is the paragraph's own ink, so the phrase reads as bold. It cannot break mid-phrase, and it sits on a line 0.2 shorter than the ones above it."),
          ],
        }),
        buildElement(ids, {
          type: "loom.stack",
          props: { gap: "snug" },
          children: [
            caption(ids, "After — loom.inline-link"),
            prose(
              ids,
              [
                text(ids, "Every adaptation this runtime can make is an operation against a tree, and the rule that decides which is "),
                inlineLink(ids, "/granularity", "written down in one page"),
                text(ids, " that nothing in the library may contradict."),
              ],
              { size: "lead" }
            ),
            caption(ids, "Underlined at rest, in the paragraph's colour, on the paragraph's line. The hover and focus state thickens the rule rather than tinting it, because a tint is no change at all on a single-ink palette."),
          ],
        }),
      ],
    }),
  ])

/** The three things only a sentence can test: an inherited colour, an inherited size, and a phrase long enough to wrap. */
const whatItInherits = (ids: IdFactory): ElementNode =>
  section(ids, "§2 · What it takes from the paragraph", "Three sentences that set the type and lend it their ink", [
    buildElement(ids, {
      type: "loom.stack",
      props: { gap: "normal" },
      children: [
        prose(
          ids,
          [
            text(ids, "At lead size it is lead size: the "),
            inlineLink(ids, "#pricing", "current price list"),
            text(ids, " is a phrase of this sentence and not a word borrowed from another scale."),
          ],
          { size: "lead" }
        ),
        prose(
          ids,
          [
            text(ids, "In a muted paragraph it is muted, which is the case the finding photographed going wrong — an accent phrase came out darker than the sentence around it and read as bold rather than as a link. Here the "),
            inlineLink(ids, "/granularity", "rule it is held to"),
            text(ids, " is exactly as grey as the clause it sits in."),
          ],
          { tone: "muted" }
        ),
        prose(
          ids,
          [
            text(ids, "And at small size, in a footnote, a phrase long enough to run past the end of a line will "),
            inlineLink(ids, "/granularity", "break across that line and carry its underline onto the second one"),
            text(ids, ", which an inline-block cannot do: it would paint two rules at two widths, or refuse to break at all. An outbound phrase says so with a mark a reader can see and a screen reader does not read — "),
            inlineLink(ids, "https://example.com/decisions/0052", "the record that settled it", { external: true }),
            text(ids, "."),
          ],
          { size: "small", tone: "muted", measured: true }
        ),
      ],
    }),
  ])

/**
 * The part that had one design, and the second one the inline link made
 * possible. The canonical says a thing and offers a control beside it; the
 * alternate says one sentence in which the destination is a phrase.
 */
const bothDesignsOfTheStrip = (ids: IdFactory): ElementNode =>
  section(ids, "§3 · The band", "Both designs of the strip above the navigation", [
    buildElement(ids, {
      type: "loom.stack",
      props: { gap: "normal" },
      children: [
        caption(ids, "banner — news, then a region holding the one thing to do about it"),
        band(ids, "banner"),
        caption(ids, "banner-inline — one sentence, with the page it points at underlined inside it and no region filled at all"),
        band(ids, "banner-inline"),
        caption(ids, "Until today banner was the last part in the catalogue with a single design, so a deployment choosing a strip had no choice to make. The two differ in the set of nodes they build, which is the only bar 0162 sets."),
      ],
    }),
  ])

/** The pager: registered on 21 September, and on a page for the first time. */
const theArchive = (ids: IdFactory): ElementNode =>
  buildElement(ids, {
    type: "loom.stack",
    props: { gap: "snug" },
    children: [
      buildElement(ids, {
        type: "loom.section",
        props: { width: "wide", eyebrow: "\u00a74 \u00b7 The pager" },
        children: [
          buildSlot(ids, "heading", [heading(ids, "A control that has been registered for a fortnight and never drawn", 2, { balance: true })]),
          caption(ids, "loom.link-pager shipped on 21 September and no band in the catalogue had ever put one on a page. The archive design of the writing band is the first, which is the whole of what reach measures: a primitive nobody can see is a primitive nobody has reviewed, whatever the registry says about it."),
        ],
      }),
      band(ids, "articles-index"),
    ],
  })

const closing = (ids: IdFactory): ElementNode =>
  section(ids, "§5 · The measurements", "Three numbers this sheet moves", [
    buildElement(ids, {
      type: "loom.stat-grid",
      props: { columns: "three" },
      children: [
        buildElement(ids, {
          type: "loom.stat",
          props: { value: "103", label: "primitives registered", caption: "loom.inline-link is the hundred and third" },
        }),
        buildElement(ids, {
          type: "loom.stat",
          props: { value: "0", label: "parts with one design", caption: "was one — banner, closed by banner-inline" },
        }),
        buildElement(ids, {
          type: "loom.stat",
          props: { value: "92", label: "primitives a band can reach", caption: "of 103; loom.link-pager joined them" },
        }),
      ],
    }),
  ])

const build = (theme: ThemeSelection) => {
  const ids = sequentialIdFactory()

  return createTree(
    buildElement(ids, {
      type: "loom.page",
      props: { [THEME_PROP_KEY]: theme, width: "wide", fills: true },
      children: [
        opening(ids),
        theSameSentenceTwice(ids),
        whatItInherits(ids),
        bothDesignsOfTheStrip(ids),
        theArchive(ids),
        closing(ids),
      ],
    }),
    ids
  )
}

export default defineSpecimen({
  name: "2026-10-05-primitives-the-link-inside-a-sentence",
  title:
    "The same sentence with each of the two links in it, the three things an inline phrase takes from its paragraph, both designs of the announcement strip, and the pager on a page for the first time",
  build,
  /**
   * Tall because §1 is a pair of columns that becomes a pair of rows on a phone
   * and §4 is a six-cell archive. The phone shot is where the wrapping phrase in
   * §2 earns its place: a long inline link at 390px must break across the line
   * and must not put the page into a horizontal scroll.
   */
  viewports: [
    { label: "wide", width: 1280, height: 3400, deviceScaleFactor: 2, touch: false },
    { label: "phone", width: 390, height: 844, deviceScaleFactor: 2, touch: true },
  ],
  themes: [
    {
      label: "editorial",
      selection: themeSelectionSchema.parse({
        palette: "editorial",
        fontPack: "editorial-serif",
        stylePreset: "comfortable",
      }),
    },
    {
      label: "bold",
      selection: themeSelectionSchema.parse({
        palette: "bold",
        fontPack: "bold-sans",
        stylePreset: "airy-modern",
      }),
    },
    /** The palette the finding is about: its accent slot and its fg-default hold one hex. */
    {
      label: "minimal",
      selection: themeSelectionSchema.parse({
        palette: "minimal",
        fontPack: "minimal-sans",
        stylePreset: "precise",
      }),
    },
  ],
})
