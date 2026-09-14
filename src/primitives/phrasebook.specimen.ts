import { sequentialIdFactory } from "../ids.js"
import { THEME_PROP_KEY } from "../reserved-props.js"
import { buildElement } from "../tree/builders.js"
import { createTree } from "../tree/tree.js"
import { themeSelectionSchema, type ThemeSelection } from "../theme/theme.js"

import { defineSpecimen } from "../../tools/specimen/specimen.js"

/**
 * Imported from the band modules rather than from the catalogue's index,
 * because a band is no longer a named export of this package — it is reached by
 * id through `compositionById`, the way a primitive is reached through the
 * registry. Inside the package the module path is the direct route and costs
 * the published surface nothing.
 */
import { articlesBand } from "./compositions/articles-band.js"
import { bentoBand } from "./compositions/bento-band.js"
import { contactBand } from "./compositions/contact-band.js"
import { changelogBand } from "./compositions/changelog-band.js"
import { credentialsBand } from "./compositions/credentials-band.js"
import { integrationsBand } from "./compositions/integrations-band.js"

/**
 * The four bands added on 13 September, in the order they sit in the page
 * sequence, so the catalogue's central claim is what the photograph tests.
 *
 * Only the new four. The other nine have been photographed since they shipped
 * and a shot of all thirteen is a shot of a landing page, which proves the
 * sequence reads and hides whether any one band does — the same reason the debts
 * specimen puts a defect and its absence in one frame rather than showing the
 * fixed state alone.
 */
const build = (theme: ThemeSelection) => {
  const ids = sequentialIdFactory()

  return createTree(
    buildElement(ids, {
      type: "loom.page",
      props: { [THEME_PROP_KEY]: theme, width: "wide", fills: true },
      children: [bentoBand, integrationsBand, credentialsBand, articlesBand, changelogBand, contactBand].map(
        (band) => band.build(ids)
      ),
    }),
    ids
  )
}

export default defineSpecimen({
  name: "phrasebook-two",
  title: "Six more bands the page sequence was missing",
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
  ],
})
