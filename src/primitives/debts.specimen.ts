import { sequentialIdFactory } from "../ids.js"
import { THEME_PROP_KEY } from "../reserved-props.js"
import { buildElement, buildSlot, buildText } from "../tree/builders.js"
import { createTree } from "../tree/tree.js"
import { themeSelectionSchema, type ThemeSelection } from "../theme/theme.js"

import { defineSpecimen } from "../../tools/specimen/specimen.js"

/**
 * The four things another lane measured against this library, in one tree.
 *
 * Every band here exists because a finding named it, and each is arranged so
 * that the defect and its absence are **in the same photograph** — a wrapped
 * panel above the unwrapped one, an adaptive frame beside a fixed one. A shot
 * of the fixed state alone proves nothing: it looks like every other shot.
 *
 * What it cannot show is the sandbox, which is an attribute rather than a
 * pixel, and what it cannot show working is a same-origin frame — the specimen
 * harness wires no frame registry, so every `loom.embed` here renders its
 * refusal notice. That is not a gap in the picture: the refusal box **keeps the
 * frame's ratio**, which is exactly the thing these two tiles are for, and the
 * sandbox is asserted in `library.test.ts` where it can be read rather than
 * guessed at from an image.
 */

const LONG_LINE =
  '{"id":"n_7","type":"loom.prose","props":{"tone":"muted","note":"a JSON string value is one line however long the string is, which is the whole of the finding"}}'

const codePanel = (idFactory: ReturnType<typeof sequentialIdFactory>, wrap: boolean) =>
  buildElement(idFactory, {
    type: "loom.code",
    props: {
      language: wrap ? "wrap: true" : "wrap: false (today)",
      caption: wrap
        ? "Every character of the line is on the page."
        : "The line runs on behind a horizontal gesture inside the panel.",
      ...(wrap ? { wrap: true } : {}),
    },
    children: [buildText(idFactory, LONG_LINE)],
  })

const frameTile = (
  idFactory: ReturnType<typeof sequentialIdFactory>,
  aspect: "adaptive" | "wide",
  caption: string
) =>
  buildElement(idFactory, {
    type: "loom.embed",
    props: {
      src: "https://example.com/framed",
      title: `A framed application, ${aspect}`,
      aspect,
      caption,
    },
  })

const milestone = (
  idFactory: ReturnType<typeof sequentialIdFactory>,
  marker: string,
  title: string,
  body: string
) =>
  buildElement(idFactory, {
    type: "loom.milestone",
    props: { marker, title, body },
  })

const build = (theme: ThemeSelection) => {
  const idFactory = sequentialIdFactory()

  const code = buildElement(idFactory, {
    type: "loom.section",
    props: { eyebrow: "3 September", width: "readable" },
    children: [
      buildElement(idFactory, {
        type: "loom.heading",
        props: { level: 2, balance: true },
        children: [buildText(idFactory, "Printed data is not code")],
      }),
      codePanel(idFactory, true),
      codePanel(idFactory, false),
    ],
  })

  const frames = buildElement(idFactory, {
    type: "loom.section",
    props: { eyebrow: "4 September", width: "wide", tone: "surface" },
    children: [
      buildElement(idFactory, {
        type: "loom.heading",
        props: { level: 2, balance: true },
        children: [buildText(idFactory, "A phone is not a laptop")],
      }),
      frameTile(
        idFactory,
        "adaptive",
        "adaptive, full width — 16/10 here, 3/4 on the phone shot. The 12px the control was short of."
      ),
      frameTile(
        idFactory,
        "wide",
        "wide, full width — 16/9 at both, which is 197px tall on a phone."
      ),
      /**
       * The half a viewport query cannot answer, and the reason the threshold is
       * read off the frame rather than the window: **this column is narrow on a
       * 1280px screen.** The tile beside it is the same prop at full width one
       * band above, and the two are different shapes in the same photograph.
       */
      buildElement(idFactory, {
        type: "loom.split",
        props: { ratio: "even", align: "start" },
        children: [
          buildSlot(idFactory, "start", [
            frameTile(
              idFactory,
              "adaptive",
              "adaptive, in half a split — still 3/4 at 1280, because 492px is narrow wherever it is."
            ),
          ]),
          buildSlot(idFactory, "end", [
            buildElement(idFactory, {
              type: "loom.prose",
              props: { tone: "muted" },
              children: [
                buildText(
                  idFactory,
                  "A window query would have given this column the laptop shape, because the window is a laptop. The frame is what is narrow, so the frame is what is asked."
                ),
              ],
            }),
          ]),
        ],
      }),
    ],
  })

  const rail = buildElement(idFactory, {
    type: "loom.section",
    props: { eyebrow: "5 September", width: "readable" },
    children: [
      buildElement(idFactory, {
        type: "loom.heading",
        props: { level: 2, balance: true },
        children: [buildText(idFactory, "The marker gutter, on the width that found it")],
      }),
      buildElement(idFactory, {
        type: "loom.milestone-list",
        props: { rail: "line" },
        children: [
          milestone(
            idFactory,
            "1 September",
            "You asked for something",
            "The entry whose title wrapped to three lines, on the band a visitor is meant to read closely."
          ),
          milestone(
            idFactory,
            "5 September",
            "And the band was five screens tall",
            "Two records cost 3,202px of phone against 763px of desktop — four times as much, for the same words."
          ),
          milestone(
            idFactory,
            "11 September",
            "The column moved above the title",
            "A container query below 26rem, and a :has() rule for a list where no entry sets a marker at all."
          ),
        ],
      }),
    ],
  })

  const page = buildElement(idFactory, {
    type: "loom.page",
    props: { [THEME_PROP_KEY]: theme, width: "wide" },
    children: [code, frames, rail],
  })

  return createTree(page, idFactory)
}

export default defineSpecimen({
  name: "debts",
  title: "The debts this library owed",
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
