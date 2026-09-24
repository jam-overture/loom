import { sequentialIdFactory } from "../../src/ids.js"
import { DATA_PROP_KEY, THEME_PROP_KEY } from "../../src/reserved-props.js"
import { buildElement, buildSlot, buildText } from "../../src/tree/builders.js"
import { createTree } from "../../src/tree/tree.js"
import { themeSelectionSchema, type ThemeSelection } from "../../src/theme/theme.js"

import { defineSpecimen } from "./specimen.js"

/**
 * The worked copy for `answers`, and the four states of a bound primitive in
 * one frame.
 *
 * `loom.feed` draws rows, the region the tree gave it for an answer of none, or
 * one of two sentences when it could not read what came back. Until a specimen
 * could declare an answer, exactly one of those four was reachable here — and
 * it is the last one, so every photograph of a bound primitive this harness
 * could take was a photograph of a failure.
 *
 * Each column below binds a different source. The only difference between them
 * is what this file says that source answers with.
 */

const idsOf = () => sequentialIdFactory()

const feed = (
  idFactory: ReturnType<typeof idsOf>,
  heading: string,
  source: string,
  note: string
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
        props: { tone: "muted", size: "small" },
        children: [buildText(idFactory, note)],
      }),
      buildElement(idFactory, {
        type: "loom.feed",
        props: { [DATA_PROP_KEY]: { entries: { source, params: {} } }, density: "tight" },
        children: [
          buildSlot(idFactory, "empty", [
            buildElement(idFactory, {
              type: "loom.empty-state",
              props: { outline: "dashed", stature: "compact", cause: "empty" },
              children: [
                buildElement(idFactory, {
                  type: "loom.heading",
                  props: { level: 4 },
                  children: [buildText(idFactory, "Nothing posted yet")],
                }),
              ],
            }),
          ]),
        ],
      }),
    ],
  })

const build = (theme: ThemeSelection) => {
  const idFactory = idsOf()

  const section = buildElement(idFactory, {
    type: "loom.section",
    props: { eyebrow: "Specimen", width: "wide" },
    children: [
      buildElement(idFactory, {
        type: "loom.heading",
        props: { level: 1, balance: true },
        children: [buildText(idFactory, "One primitive, four answers")],
      }),
      buildElement(idFactory, {
        type: "loom.prose",
        props: { size: "lead" },
        children: [
          buildText(
            idFactory,
            "Four loom.feed nodes, identical but for the source each one binds. What every source answers with is declared in this specimen and resolved before the walk, so nothing here touches a network."
          ),
        ],
      }),
      buildElement(idFactory, {
        type: "loom.grid",
        props: { columns: "two", gap: "loose" },
        children: [
          feed(
            idFactory,
            "Rows",
            "posts.latest",
            "The source answered with a list this primitive can read.",
          ),
          feed(
            idFactory,
            "Nothing to report",
            "posts.drafts",
            "The source answered, with an empty list. The region is the tree's.",
          ),
          feed(
            idFactory,
            "Could not be reached",
            "posts.archive",
            "The source was asked and did not answer.",
          ),
          feed(
            idFactory,
            "A shape it cannot draw",
            "posts.counts",
            "The source answered with something that is not a list of entries.",
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
  name: "answers",
  title: "One primitive, four answers",
  build,
  /**
   * The four states, declared. Three are an answer and one is a failure,
   * because those are the two things a source can say — and the fourth state
   * is an answer the *primitive* refuses, which is why the harness never
   * validates the shape.
   */
  answers: {
    "posts.latest": {
      answer: [
        { title: "A narrower door", meta: "23 September" },
        { title: "The eighth rung", meta: "23 September" },
        { title: "A name a prop gives", meta: "23 September" },
      ],
    },
    "posts.drafts": { answer: [] },
    "posts.archive": {
      unavailable: { code: "unavailable", detail: "the archive did not answer in time" },
    },
    "posts.counts": { answer: { total: 4, thisWeek: 3 } },
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
  ],
})
