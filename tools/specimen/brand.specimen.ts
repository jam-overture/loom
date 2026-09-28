import { sequentialIdFactory } from "../../src/ids.js"
import { navBand } from "../../src/primitives/compositions/nav-band.js"
import { THEME_PROP_KEY } from "../../src/reserved-props.js"
import { themeSelectionSchema, type ThemeSelection } from "../../src/theme/theme.js"
import { buildElement, buildSlot, buildText } from "../../src/tree/builders.js"
import { createTree } from "../../src/tree/tree.js"

import { defineSpecimen } from "./specimen.js"

const MARK = "M5 5h14v6H5z M21 5h6v14h-6z M13 21h14v6H13z M5 13h6v14H5z"

const build = (theme: ThemeSelection) => {
  const ids = sequentialIdFactory()

  const bar = buildElement(ids, {
    type: "loom.nav",
    props: { position: "static", tone: "surface", align: "start" },
    children: [
      buildSlot(ids, "brand", [
        buildElement(ids, {
          type: "loom.brand",
          props: { name: "Loom", mark: MARK, href: "#top" },
        }),
      ]),
      buildElement(ids, {
        type: "loom.link",
        props: { href: "#why" },
        children: [buildText(ids, "Why Loom")],
      }),
      buildElement(ids, {
        type: "loom.link",
        props: { href: "#docs" },
        children: [buildText(ids, "Docs")],
      }),
    ],
  })

  const page = buildElement(ids, {
    type: "loom.page",
    props: { [THEME_PROP_KEY]: theme, width: "wide" },
    children: [
      bar,
      navBand.build(ids),
      buildElement(ids, {
        type: "loom.section",
        props: { width: "wide" },
        children: [
          buildElement(ids, {
            type: "loom.prose",
            props: { tone: "muted" },
            children: [
              buildText(
                ids,
                "Both bars above are loom.brand. The mark is path data drawn inline, so it takes the palette's ink; nothing on this page is styled by hand."
              ),
            ],
          }),
        ],
      }),
    ],
  })

  return createTree(page, ids)
}

export default defineSpecimen({
  name: "brand",
  title: "loom.brand",
  build,
  themes: [
    {
      label: "minimal",
      selection: themeSelectionSchema.parse({
        palette: "minimal",
        fontPack: "minimal-sans",
        stylePreset: "precise",
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
