import { sequentialIdFactory } from "../ids.js"
import { THEME_PROP_KEY } from "../reserved-props.js"
import { buildElement, buildSlot, buildText } from "../tree/builders.js"
import { createTree } from "../tree/tree.js"
import { themeSelectionSchema, type ThemeSelection } from "../theme/theme.js"

import { defineSpecimen } from "../../tools/specimen/specimen.js"

/**
 * Both states of a region with nothing in it, in one photograph, because the
 * whole claim of `loom.placeholder` is that they are two different things.
 *
 * A shot of either one alone would prove nothing — it would look like a box
 * with a sentence in it. What has to be visible is the *pair*: a dashed edge
 * against a solid one, a page that reads as finished against a page that reads
 * as having failed, and only one of the two offering something to do.
 */
const build = (theme: ThemeSelection) => {
  const ids = sequentialIdFactory()
  const text = (value: string) => buildText(ids, value)

  const band = (eyebrow: string, heading: string, placeholder: ReturnType<typeof buildElement>) =>
    buildElement(ids, {
      type: "loom.section",
      props: { width: "wide", eyebrow },
      children: [
        buildSlot(ids, "heading", [
          buildElement(ids, { type: "loom.heading", props: { level: 2 }, children: [text(heading)] }),
        ]),
        placeholder,
      ],
    })

  return createTree(
    buildElement(ids, {
      type: "loom.page",
      props: { [THEME_PROP_KEY]: theme, width: "wide", fills: true },
      children: [
        band(
          "ready, with nothing in it",
          "The source answered, and the answer is nothing",
          buildElement(ids, {
            type: "loom.placeholder",
            props: {
              state: "empty",
              title: "No deployments yet",
              body: "Point it at a repository and the first one appears here. Nothing is wrong.",
            },
            children: [
              buildSlot(ids, "action", [
                buildElement(ids, {
                  type: "loom.action",
                  props: { href: "/start", variant: "primary" },
                  children: [text("Connect a repository")],
                }),
              ]),
            ],
          })
        ),
        band(
          "could not answer",
          "The source did not answer, which is a different thing",
          buildElement(ids, {
            type: "loom.placeholder",
            props: {
              state: "unavailable",
              title: "We could not load your deployments",
              body: "Nothing is lost and nothing was changed. Try again in a moment.",
            },
          })
        ),
      ],
    }),
    ids
  )
}

export default defineSpecimen({
  name: "states",
  title: "The two states a region with nothing in it can be in",
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
