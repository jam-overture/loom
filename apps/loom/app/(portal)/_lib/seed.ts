import {
  buildElement,
  buildText,
  createTree,
  sequentialIdFactory,
  type LoomTree,
} from "@jam-overture/loom"
import { THEME_PROP_KEY } from "@jam-overture/loom/react"

/**
 * A tree to look at. Built through the public builders rather than written as a
 * literal, so it cannot drift out of the shape `parseTree` accepts — the seed is
 * the first thing the preview pane renders, and a seed that failed to parse would
 * look like a renderer bug.
 *
 * ## Rebuilt on 11 October against the library
 *
 * Every prop here used to be one of the portal's own four primitives' and none
 * of them survived the exchange `registry.ts` describes: `variant: "outlined"`
 * is `tone: "outline"`, a heading's `level` is required rather than optional,
 * and prose's `"normal"` tone is the library's `"default"`. Three refusals, each
 * of which would have been a page that parsed and would not render.
 *
 * **The root now names a theme**, which is the part that is new rather than
 * renamed. A library primitive reads its colour, family and size off the
 * resolved theme, so a tree that names none renders with every variable behind
 * it undefined. The selection is the library's own first palette, pack and
 * preset — the deployment's default rather than a choice this seed is making,
 * and a proposal may name any other the registry holds (0049).
 */
export const seedTree = (): LoomTree => {
  const ids = sequentialIdFactory("seed")

  return createTree(
    buildElement(ids, {
      type: "loom.page",
      props: {
        [THEME_PROP_KEY]: { palette: "minimal", fontPack: "minimal-sans", stylePreset: "precise" },
      },
      children: [
        buildElement(ids, {
          type: "loom.heading",
          props: { level: 1 },
          children: [buildText(ids, "Loom")],
        }),
        buildElement(ids, {
          type: "loom.prose",
          props: { tone: "muted" },
          children: [buildText(ids, "This page is a stored tree, rendered through the runtime.")],
        }),
        buildElement(ids, {
          type: "loom.card",
          props: { tone: "outline" },
          children: [
            buildElement(ids, {
              type: "loom.heading",
              props: { level: 3 },
              children: [buildText(ids, "Every change is a delta")],
            }),
            buildElement(ids, {
              type: "loom.prose",
              props: {},
              children: [
                buildText(ids, "Nothing here was written as markup. A proposal produced it."),
              ],
            }),
          ],
        }),
      ],
    }),
    ids
  )
}
