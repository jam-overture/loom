import { sequentialIdFactory } from "../ids.js"
import { THEME_PROP_KEY } from "../reserved-props.js"
import { buildElement, buildSlot, buildText } from "../tree/builders.js"
import { createTree } from "../tree/tree.js"
import { themeSelectionSchema, type ThemeSelection } from "../theme/theme.js"

import { defineSpecimen } from "../../tools/specimen/specimen.js"

/**
 * The two things this run built, arranged so that what they do and what the
 * library did without them are **in the same photograph**.
 *
 * That is the whole design of this specimen and it is the lesson the debts
 * specimen recorded: a shot of the fixed state alone proves nothing, because it
 * looks like every other shot. So the pricing row runs an unlit tier beside two
 * lit ones rather than lighting all three, and the headline band sets the same
 * sentence twice — once in the three tones that already existed and once with
 * the wash — so a reader can see whether the wash is a fourth thing or a fourth
 * name for a thing.
 *
 * **What it cannot show is `trace` travelling**, which is a screenshot's
 * standing limit rather than this one's: a still frame catches the conic rim at
 * whatever angle the animation had reached, and the claim that it *moves* is
 * asserted in `library.test.ts` where it can be read rather than guessed at from
 * an image. What the photograph does settle is that the rim is lit at all, and
 * under `editorial` — the low-chroma palette — that it is lit *enough*.
 */

const build = (theme: ThemeSelection) => {
  const idFactory = sequentialIdFactory()
  const text = (value: string) => buildText(idFactory, value)

  const tone = (value: string, word: string) =>
    buildElement(idFactory, {
      type: "loom.prose",
      props: { size: "lead" },
      children: [
        text(`${value}: the tier a page is actually `),
        buildElement(idFactory, {
          type: "loom.emphasis",
          props: { tone: value },
          children: [text(word)],
        }),
      ],
    })

  const tier = (
    light: "ring" | "trace" | "glow" | null,
    name: string,
    price: string,
    line: string
  ) => {
    const card = buildElement(idFactory, {
      type: "loom.card",
      props: { tone: "surface", padding: "roomy" },
      children: [
        ...(light === "trace"
          ? [
              buildElement(idFactory, {
                type: "loom.badge",
                props: { tone: "accent" },
                children: [text("Most popular")],
              }),
            ]
          : []),
        buildElement(idFactory, {
          type: "loom.heading",
          props: { level: 3 },
          children: [text(name)],
        }),
        buildElement(idFactory, {
          type: "loom.heading",
          props: { level: 2 },
          children: [text(price)],
        }),
        buildElement(idFactory, { type: "loom.prose", props: { tone: "muted" }, children: [text(line)] }),
      ],
    })

    return light === null
      ? card
      : buildElement(idFactory, {
          type: "loom.halo",
          props: { light, corners: "lg" },
          children: [card],
        })
  }

  const headline = buildElement(idFactory, {
    type: "loom.section",
    props: { eyebrow: "One word of it", width: "wide" },
    children: [
      buildSlot(idFactory, "heading", [
        buildElement(idFactory, {
          type: "loom.heading",
          props: { level: 1, balance: true },
          children: [
            text("Nothing here could make one word "),
            buildElement(idFactory, {
              type: "loom.emphasis",
              props: { tone: "washed" },
              children: [text("catch the eye")],
            }),
          ],
        }),
      ]),
      buildElement(idFactory, {
        type: "loom.prose",
        props: { measured: true, tone: "muted" },
        children: [
          text("The wash is addressable: moving it from one word to another is a delta against a node that keeps its author, not a prop that repaints the line."),
        ],
      }),
      tone("strong", "selling"),
      tone("subtle", "selling"),
      tone("marked", "selling"),
      tone("washed", "selling"),
    ],
  })

  const pricing = buildElement(idFactory, {
    type: "loom.section",
    props: { eyebrow: "One among several", width: "wide" },
    children: [
      buildSlot(idFactory, "heading", [
        buildElement(idFactory, {
          type: "loom.heading",
          props: { level: 2 },
          children: [text("Three tiers, and the one the page is selling")],
        }),
      ]),
      buildElement(idFactory, {
        type: "loom.grid",
        props: { columns: "three", gap: "loose" },
        children: [
          tier(null, "Starter", "Free", "No halo at all, which is what every tier looked like until now."),
          tier("trace", "Studio", "$24", "A rim with the light travelling round it."),
          tier("glow", "Agency", "$96", "A bloom outside the box — the half a backdrop cannot draw."),
        ],
      }),
    ],
  })

  const rims = buildElement(idFactory, {
    type: "loom.section",
    props: { eyebrow: "The three lights", width: "wide" },
    children: [
      buildSlot(idFactory, "heading", [
        buildElement(idFactory, {
          type: "loom.heading",
          props: { level: 2 },
          children: [text("Told apart at a glance, which is the membership test")],
        }),
      ]),
      buildElement(idFactory, {
        type: "loom.grid",
        props: { columns: "three", gap: "loose" },
        children: [
          tier("ring", "ring", "—", "A hairline of gradient, traced round the edge."),
          tier("trace", "trace", "—", "The same rim, lit by a light that goes round."),
          tier("glow", "glow", "—", "Soft, outside the edge, with no crisp line anywhere."),
        ],
      }),
    ],
  })

  const inside = buildElement(idFactory, {
    type: "loom.backdrop",
    props: { paint: "spotlight" },
    children: [
      buildElement(idFactory, {
        type: "loom.section",
        props: { eyebrow: "Over a paint", width: "wide" },
        children: [
          buildSlot(idFactory, "heading", [
            buildElement(idFactory, {
              type: "loom.heading",
              props: { level: 2 },
              children: [text("A halo inside a backdrop, which is the pair working")],
            }),
          ]),
          buildElement(idFactory, {
            type: "loom.grid",
            props: { columns: "two", gap: "loose" },
            children: [
              tier("ring", "Lit on weather", "—", "The rim reads against a paint as well as against a flat ground."),
              tier("glow", "Bloomed on weather", "—", "And the glow is not clipped by the backdrop it sits inside."),
            ],
          }),
        ],
      }),
    ],
  })

  const page = buildElement(idFactory, {
    type: "loom.page",
    props: { [THEME_PROP_KEY]: theme, width: "wide", fills: true },
    children: [headline, pricing, rims, inside],
  })

  return createTree(page, idFactory)
}

export default defineSpecimen({
  name: "catches-the-eye",
  title: "What catches the eye",
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
