import { sequentialIdFactory, type IdFactory } from "../ids.js"
import { DATA_PROP_KEY, THEME_PROP_KEY } from "../reserved-props.js"
import { buildElement, buildSlot, buildText } from "../tree/builders.js"
import { createTree } from "../tree/tree.js"
import { themeSelectionSchema, type ThemeSelection } from "../theme/theme.js"

import { defineSpecimen } from "../../tools/specimen/specimen.js"

import { bannerBand } from "./compositions/banner-band.js"
import { bentoBand } from "./compositions/bento-band.js"
import { changelogBand } from "./compositions/changelog-band.js"
import { codeSessionBand } from "./compositions/code-session-band.js"
import { comparisonBand } from "./compositions/comparison-band.js"
import { faqBand } from "./compositions/faq-band.js"
import { footerBand } from "./compositions/footer-band.js"
import { navBand } from "./compositions/nav-band.js"
import { specsBand } from "./compositions/specs-band.js"
import { whatsOnBand } from "./compositions/whats-on-band.js"

/**
 * Every line this library draws in `border-subtle` **instead of** a fill, on one
 * sheet, under both starter palettes.
 *
 * This is the instrument the 26 September finding asked for and named as the
 * only thing that could close it: *"a sheet that draws every primitive using
 * `border-subtle` under `bold`, and whatever it shows."* That run found two
 * such lines by accident — `loom.orbit`'s guides, which had been drawing
 * nothing at all on one of the two starter palettes since the day the primitive
 * shipped, and `loom.logo`'s plate, caught only because its specimen is
 * photographed under both — and wrote down the rule the pair produced:
 *
 * > **A border beside a fill may be subtle. A border that is the whole mark
 * > takes `border-default`.**
 *
 * ## Why a grep cannot take this picture, and what selected these bands
 *
 * `border-subtle` is correct in most of its seventy-odd uses and the difference
 * is not in the source. It is whether the line is *beside* a fill or *instead
 * of* one, and that is a fact about the render rather than about the
 * declaration. What **is** in the source is the shape of the border property:
 * a `border` is a box and a box is almost always beside its own fill, while a
 * `border-block-start`, a `border-block-end` or a `border-inline-end` is a
 * single edge, and a single edge is the shape a rule has.
 *
 * So the eleven bands below are not a survey of the library. They are every
 * place in it where a one-sided `border-subtle` is load-bearing, which is a
 * list a grep for `border(Block|Inline)` produced and an eye then read. The
 * boxes are deliberately absent: a card, a badge, a tier, a plate and a
 * dashed empty state are all mostly fill, all correct at `border-subtle`, and
 * putting them on this sheet would make it a photograph of the library rather
 * than of the question.
 *
 * ## What each band is here to show
 *
 * | band | the line |
 * | --- | --- |
 * | `nav` | the rule under the top bar |
 * | `banner` | the rule under the announcement strip |
 * | the rules band | `loom.link-trail`'s three separators, `loom.divider`'s three ornaments |
 * | `specs` | `loom.table`'s row lines and `loom.table-grid`'s cell lines |
 * | `comparison` | `loom.comparison-table`'s row lines |
 * | `faq` | the rule between one question and the next |
 * | the ruled feed | `loom.feed`'s row separators, which need an answer to exist |
 * | `whats-on` | the rule between an event's time and the event |
 * | `changelog` | `loom.milestone-list`'s rail |
 * | `code-session` | the rule under a code panel's filename bar |
 * | `bento` | `loom.frame`'s chrome bar and its pin strip |
 * | `footer` | the rule above the site's last band |
 *
 * ## What it is good at
 *
 * **The two palettes are the whole assertion and neither is the control.** The
 * finding's table is the reason: on `editorial` a `border-subtle` hairline is
 * `#efefe9` on `#ffffff`, which is faint and legible; on `bold` it is `#1f1f1f`
 * on `#1a1a1a`, five points of luminance, on a section whose own ground is that
 * same `#1a1a1a`. A line that survives the left-hand column and vanishes in the
 * right-hand one is the defect, and a line that is faint in both is the token
 * doing its job.
 *
 * **Two bands print the comparison inside themselves.** `loom.table` and
 * `loom.comparison-table` draw their header rule in `border-strong` and their
 * body rules in `border-subtle`, so each is a photograph of both tokens at once
 * and the reader needs no second shot to see the size of the difference.
 *
 * ## What it is bad at
 *
 * **It is a catalogue page and no site would be this one.** Eleven bands, two
 * of them chrome, three of them tables, in an order chosen so that adjacent
 * rules do not touch. Nothing here is a claim about rhythm, and the heading
 * levels are flat.
 *
 * **It cannot photograph a line nobody drew.** A rule that is missing because
 * its primitive was never placed looks exactly like a rule that is missing
 * because it is `#1f1f1f` — so the sheet is read against the source rather than
 * on its own, and the twelve rows of the table above are what say a line is
 * meant to be there at all.
 */

/**
 * The two primitives whose separator is the entire mark, with no band in the
 * catalogue to place them.
 *
 * `loom.link-trail` is one of the ten primitives no starting composition
 * reaches, so this is the first photograph of it inside a page, and its
 * `separator` prop is drawn in all three settings because the chevron is two
 * `border-subtle` edges on a `::before` — a mark with no fill anywhere near it,
 * which is the extreme case of the rule being audited. `loom.divider`'s `rule`
 * ornament already takes `border-default`; its `diamond` flanks the mark with
 * two `border-subtle` hairlines, and those are the same case again.
 */
const rulesBand = (ids: IdFactory) =>
  buildElement(ids, {
    type: "loom.section",
    props: { width: "wide", eyebrow: "Nothing but the line", anchor: "rules" },
    children: [
      buildSlot(ids, "heading", [
        buildElement(ids, {
          type: "loom.heading",
          props: { level: 2 },
          children: [buildText(ids, "Separators, where the separator is the whole mark")],
        }),
      ]),
      buildElement(ids, {
        type: "loom.stack",
        props: { gap: "loose" },
        children: [
          ...(["chevron", "slash", "dot"] as const).map((separator) =>
            buildElement(ids, {
              type: "loom.link-trail",
              props: { separator, scale: "medium" },
              children: [
                buildElement(ids, {
                  type: "loom.link",
                  props: { href: "/", tone: "muted" },
                  children: [buildText(ids, "Home")],
                }),
                buildElement(ids, {
                  type: "loom.link",
                  props: { href: "/library", tone: "muted" },
                  children: [buildText(ids, "Library")],
                }),
                buildElement(ids, {
                  type: "loom.link",
                  props: { href: "/library/borders", tone: "muted", current: true },
                  children: [buildText(ids, `separator: ${separator}`)],
                }),
              ],
            })
          ),
          ...(["rule", "dots", "diamond"] as const).map((ornament) =>
            buildElement(ids, {
              type: "loom.divider",
              props: { ornament, spacing: "tight" },
            })
          ),
        ],
      }),
    ],
  })

/**
 * A `loom.feed` with rows, which needs an answer.
 *
 * The catalogue's own `feed-band` drops in **unbound** on purpose — a
 * composition that arrived already asking a host's database a question would be
 * a page reporting a binding nobody agreed to make — so it photographs as its
 * empty region, and a feed showing an empty state has no row separators to
 * look at. The separators are the thing on this sheet, so this one binds, and
 * the specimen declares the answer below.
 */
const ruledFeedBand = (ids: IdFactory) =>
  buildElement(ids, {
    type: "loom.section",
    props: { width: "wide", eyebrow: "One answer, four rows", anchor: "feed" },
    children: [
      buildSlot(ids, "heading", [
        buildElement(ids, {
          type: "loom.heading",
          props: { level: 2 },
          children: [buildText(ids, "A feed, ruled between its rows")],
        }),
      ]),
      buildElement(ids, {
        type: "loom.feed",
        props: { [DATA_PROP_KEY]: { entries: { source: "posts.latest", params: {} } } },
        children: [
          buildSlot(ids, "empty", [
            buildElement(ids, {
              type: "loom.empty-state",
              props: { outline: "dashed", stature: "compact", cause: "empty" },
              children: [
                buildElement(ids, {
                  type: "loom.heading",
                  props: { level: 3 },
                  children: [buildText(ids, "Nothing posted yet")],
                }),
              ],
            }),
          ]),
        ],
      }),
    ],
  })

const build = (theme: ThemeSelection) => {
  const ids = sequentialIdFactory()

  return createTree(
    buildElement(ids, {
      type: "loom.page",
      props: { [THEME_PROP_KEY]: theme, width: "wide", fills: true },
      children: [
        navBand.build(ids),
        bannerBand.build(ids),
        rulesBand(ids),
        specsBand.build(ids),
        comparisonBand.build(ids),
        faqBand.build(ids),
        ruledFeedBand(ids),
        whatsOnBand.build(ids),
        changelogBand.build(ids),
        codeSessionBand.build(ids),
        bentoBand.build(ids),
        footerBand.build(ids),
      ],
    }),
    ids
  )
}

export default defineSpecimen({
  name: "2026-09-29-primitives-the-lines-that-were-not-there",
  title:
    "Every one-sided border-subtle in the library, under both starter palettes: the rules, the tables, the rails and the chrome",
  build,
  answers: {
    "posts.latest": {
      answer: [
        { title: "A mark that themes", meta: "28 September" },
        { title: "The hero's two measures", meta: "28 September" },
        { title: "A paint needs area", meta: "27 September" },
        { title: "Earning the wide cell", meta: "19 September" },
      ],
    },
  },
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
  ],
})
