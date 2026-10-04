import { sequentialIdFactory, type IdFactory } from "../ids.js"
import type { JsonObject } from "../json.js"
import { THEME_PROP_KEY } from "../reserved-props.js"
import { copyIn } from "../sdk/copy.js"
import { describeRegistryError } from "../sdk/registry.js"
import { themeSelectionSchema, type ThemeSelection } from "../theme/theme.js"
import { buildElement, buildSlot, buildText } from "../tree/builders.js"
import type { ElementNode } from "../tree/node.js"
import { createTree } from "../tree/tree.js"
import { textOf } from "../tree/navigation.js"

import { defineSpecimen } from "../../tools/specimen/specimen.js"

import { STARTER_COMPOSITIONS } from "./compositions/index.js"
import { createStarterPrimitiveRegistry, STARTER_PRIMITIVES } from "./index.js"

/**
 * A sheet of three bands with what a reading now says about each one beside it.
 *
 * Every other specimen in this lane photographs a primitive, because a primitive
 * is a thing you can look at. This run added no primitive and no pixel: it added
 * one declaration to each of a hundred and two files, saying which of that
 * primitive's props hold words a reader reads
 * ([0122](../../decisions/0122-a-primitive-says-which-of-its-props-a-reader-reads.md),
 * [0223](../../decisions/0223-a-prop-is-copy-when-a-reader-could-quote-it.md)).
 *
 * So the subject here is **the sentence rather than the picture**, and the only
 * honest way to photograph it is to put the two together: the band exactly as it
 * ships, and under it the words `copyIn` returns for that same subtree. The right
 * half of every pair is **computed while this page is built** — `copyIn(node,
 * registry)` on the node above it — rather than typed, which is the whole claim.
 * If a declaration were wrong the panel under the band would say so.
 *
 * ## Why these three bands
 *
 * | | what it shows |
 * | --- | --- |
 * | `metrics` | the finding itself: four figures and four labels, all of them props, and `textOf` answers the empty string for the whole band |
 * | `proof-faces` | six names drawn as monograms and a rating whose `score` the component prints — the one `unspoken` row in the catalogue, said out loud |
 * | `pricing` | the payoff at size: 35 words off eleven types, which is what a reviewer sees when a proposal deletes a tier |
 *
 * The closing band is the arithmetic over the whole library, and it is the pair
 * of numbers worth having in one frame: 58 primitives say they show no words of
 * their own, and that is what empties `unread` for every page the other 44 are
 * arranged on.
 */

const built = createStarterPrimitiveRegistry()
if (!built.ok) throw new Error(describeRegistryError(built.error))
const registry = built.value

const text = (ids: IdFactory, value: string) => buildText(ids, value)

const heading = (ids: IdFactory, value: string, level: number): ElementNode =>
  buildElement(ids, { type: "loom.heading", props: { level }, children: [text(ids, value)] })

const prose = (ids: IdFactory, value: string, extra: JsonObject = {}): ElementNode =>
  buildElement(ids, { type: "loom.prose", props: extra, children: [text(ids, value)] })

const stat = (ids: IdFactory, value: string, label: string, caption?: string): ElementNode =>
  buildElement(ids, {
    type: "loom.stat",
    props: { value, label, ...(caption === undefined ? {} : { caption }) },
  })

const compositionBy = (id: string) => {
  const found = STARTER_COMPOSITIONS.find((one) => one.id === id)
  if (!found) throw new Error(`no composition ${id}`)

  return found
}

const DECLARING = STARTER_PRIMITIVES.filter((one) => one.copy !== undefined).length
const SILENT_OF_THEIR_OWN = STARTER_PRIMITIVES.filter((one) => one.copy?.length === 0).length
const WITH_WORDS = STARTER_PRIMITIVES.filter((one) => (one.copy?.length ?? 0) > 0).length
const PROPS_DECLARED = STARTER_PRIMITIVES.reduce((count, one) => count + (one.copy?.length ?? 0), 0)

const catalogueWords = (): number =>
  STARTER_COMPOSITIONS.reduce(
    (count, one) => count + copyIn(one.build(sequentialIdFactory()), registry).words.length,
    0
  )

/**
 * The band, and the reading of that same node.
 *
 * One `IdFactory` for both so the node photographed is the node read — a second
 * build would be a different subtree with different ids saying the same thing,
 * which is the shape of proof that proves nothing.
 */
const pair = (ids: IdFactory, id: string): readonly ElementNode[] => {
  const composition = compositionBy(id)
  const band = composition.build(ids)
  const reading = copyIn(band, registry)
  const unspoken = reading.unspoken.flatMap((one) => one.props.map((prop) => `${one.type}.${prop}`))

  return [
    band,
    buildElement(ids, {
      type: "loom.section",
      props: { tone: "canvas", width: "wide", eyebrow: `copyIn(${id}, registry)` },
      children: [
        buildSlot(ids, "heading", [heading(ids, `${reading.words.length} words, off ${composition.uses.length} types`, 3)]),
        prose(
          ids,
          `textOf of the same subtree: ${JSON.stringify(textOf(band))}. Nothing unread.`,
          { tone: "muted", size: "small" }
        ),
        buildElement(ids, {
          type: "loom.code",
          props: {
            language: `words — ${composition.label}`,
            tone: "source",
            density: "compact",
            wrap: true,
          },
          children: [text(ids, reading.words.join("\n"))],
        }),
        ...(unspoken.length === 0
          ? []
          : [
              buildElement(ids, {
                type: "loom.callout",
                props: { tone: "neutral", title: "One figure it will not coerce" },
                children: [
                  text(
                    ids,
                    `${unspoken.join(", ")} is a number the component prints, so it is declared and comes back in unspoken rather than leaving the reading in silence. A reading that guessed the separator would put a figure on a reviewer's screen the page does not show.`
                  ),
                ],
              }),
            ]),
      ],
    }),
  ]
}

const opening = (ids: IdFactory): ElementNode =>
  buildElement(ids, {
    type: "loom.section",
    props: { tone: "surface", width: "wide", eyebrow: "0122 · 0114 · 0223" },
    children: [
      buildSlot(ids, "heading", [
        heading(ids, "Every primitive now says which of its props are words", 1),
      ]),
      prose(
        ids,
        "A fixed field stays a prop (0052), so most of what a page says is in props and a walk over text children answers for almost none of it. Each pair below is a band of the catalogue and the words a reading returns for that same subtree, computed as this page is built.",
        { size: "lead", measured: true }
      ),
      buildElement(ids, {
        type: "loom.stat-grid",
        props: { columns: "four", align: "start" },
        children: [
          stat(ids, `${DECLARING}/${STARTER_PRIMITIVES.length}`, "Declare copy", "was 0 for three weeks"),
          stat(ids, `${SILENT_OF_THEIR_OWN}`, "Say they show no words of their own", "the half that empties unread"),
          stat(ids, `${PROPS_DECLARED}`, "Props declared as words", `across ${WITH_WORDS} primitives`),
          stat(ids, `${catalogueWords()}`, "Words a reading finds in the catalogue", `over ${STARTER_COMPOSITIONS.length} bands`),
        ],
      }),
    ],
  })

const closing = (ids: IdFactory): ElementNode =>
  buildElement(ids, {
    type: "loom.section",
    props: { tone: "surface", width: "wide", eyebrow: "The same question, before and after" },
    children: [
      buildSlot(ids, "heading", [heading(ids, "What each surface was told, and is told now", 2)]),
      buildElement(ids, {
        type: "loom.table",
        props: { tone: "panel", rules: "rows", density: "comfortable", prose: true },
        children: [
          buildElement(ids, {
            type: "loom.table-row",
            children: [
              buildElement(ids, { type: "loom.table-cell", props: { role: "column" }, children: [text(ids, "The question")] }),
              buildElement(ids, { type: "loom.table-cell", props: { role: "column" }, children: [text(ids, "Before")] }),
              buildElement(ids, { type: "loom.table-cell", props: { role: "column" }, children: [text(ids, "After")] }),
            ],
          }),
          buildElement(ids, {
            type: "loom.table-row",
            children: [
              buildElement(ids, { type: "loom.table-cell", props: { role: "row" }, children: [text(ids, "Which words does this change take away?")] }),
              buildElement(ids, { type: "loom.table-cell", children: [text(ids, "3 pieces")] }),
              buildElement(ids, { type: "loom.table-cell", children: [text(ids, "the figures and their labels, quoted")] }),
            ],
          }),
          buildElement(ids, {
            type: "loom.table-row",
            children: [
              buildElement(ids, { type: "loom.table-cell", props: { role: "row" }, children: [text(ids, "Which copy did a reader reach?")] }),
              buildElement(ids, { type: "loom.table-cell", children: [text(ids, "the empty list, for every page")] }),
              buildElement(ids, { type: "loom.table-cell", children: [text(ids, "the words of the parts a counter names")] }),
            ],
          }),
          buildElement(ids, {
            type: "loom.table-row",
            children: [
              buildElement(ids, { type: "loom.table-cell", props: { role: "row" }, children: [text(ids, "Which type carries a page's title?")] }),
              buildElement(ids, { type: "loom.table-cell", children: [text(ids, "an array each host writes again")] }),
              buildElement(ids, { type: "loom.table-cell", children: [text(ids, 'typesWithRole("heading")')] }),
            ],
          }),
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
        opening(ids),
        ...pair(ids, "metrics"),
        ...pair(ids, "proof-faces"),
        ...pair(ids, "pricing"),
        closing(ids),
      ],
    }),
    ids
  )
}

export default defineSpecimen({
  name: "2026-10-04-primitives-the-words-nothing-declared",
  title:
    "Three bands of the catalogue, each with the words a reading returns for that same subtree under it: the metrics band whose textOf is empty, the faces band whose rating prints a number nothing will coerce, and the pricing band at thirty-five words",
  build,
  /**
   * Tall because the sheet is eight bands and three of them are a list of
   * everything a band says. The phone shot is where the code panels earn
   * `wrap: true` — a quoted sentence at 390px is four lines and must not put the
   * page in a horizontal scroll.
   */
  viewports: [
    { label: "wide", width: 1280, height: 3600, deviceScaleFactor: 2 },
    { label: "phone", width: 390, height: 844, deviceScaleFactor: 2 },
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
  ],
})
