import { sequentialIdFactory } from "../../src/ids.js"
import { THEME_PROP_KEY } from "../../src/reserved-props.js"
import { buildElement, buildText } from "../../src/tree/builders.js"
import { createTree } from "../../src/tree/tree.js"
import { themeSelectionSchema, type ThemeSelection } from "../../src/theme/theme.js"

import { defineSpecimen } from "./specimen.js"

/**
 * A worked specimen: the shape a lane copies, and the thing `pnpm specimen`
 * points at when someone wants to see whether the harness works.
 *
 * Deliberately composed out of registered primitives rather than showing a
 * photograph. `mediaUrlSchema` refuses `data:` (0053) and the sandbox reaches no
 * image host, so a stock picture cannot appear here at all — and a page built
 * out of a section, a grid and three cards exercises the library while it
 * proves the harness, which a picture would not.
 *
 * Nothing here is styled by hand. Every difference between the three shots this
 * produces is the palette, the font pack and the style preset the theme names.
 */

const card = (
  idFactory: ReturnType<typeof sequentialIdFactory>,
  heading: string,
  body: string
) =>
  buildElement(idFactory, {
    type: "loom.card",
    props: { tone: "surface", padding: "loose" },
    children: [
      buildElement(idFactory, {
        type: "loom.heading",
        props: { level: 3 },
        children: [buildText(idFactory, heading)],
      }),
      buildElement(idFactory, {
        type: "loom.prose",
        props: { tone: "muted" },
        children: [buildText(idFactory, body)],
      }),
    ],
  })

const build = (theme: ThemeSelection) => {
  const idFactory = sequentialIdFactory()

  const section = buildElement(idFactory, {
    type: "loom.section",
    props: { eyebrow: "Specimen", width: "wide" },
    children: [
      buildElement(idFactory, {
        type: "loom.heading",
        props: { level: 1, balance: true },
        children: [buildText(idFactory, "One tree, three palettes, two viewports")],
      }),
      buildElement(idFactory, {
        type: "loom.prose",
        props: { size: "lead" },
        children: [
          buildText(
            idFactory,
            "Everything on this page is the render seam's own output, photographed at a true phone width and at a laptop width. Nothing below is styled by hand."
          ),
        ],
      }),
      buildElement(idFactory, {
        type: "loom.grid",
        props: { columns: "three", gap: "loose" },
        children: [
          card(
            idFactory,
            "The browser is already here",
            "Its build number changes with the image, so the harness reads the directory rather than naming a version."
          ),
          card(
            idFactory,
            "The page is served",
            "An image URL must be http or https, so a specimen cannot be opened from disk."
          ),
          card(
            idFactory,
            "The width is measured",
            "Every shot reports scrollWidth against innerWidth, which is the defect a screenshot hides."
          ),
        ],
      }),
    ],
  })

  const page = buildElement(idFactory, {
    type: "loom.page",
    props: { [THEME_PROP_KEY]: theme, width: "wide" },
    children: [section],
  })

  return createTree(page, idFactory)
}

export default defineSpecimen({
  name: "example",
  title: "Specimen harness",
  build,
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
