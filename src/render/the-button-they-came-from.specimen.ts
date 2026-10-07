import { sequentialIdFactory, type IdFactory } from "../ids.js"
import type { JsonObject } from "../json.js"
import { THEME_PROP_KEY } from "../reserved-props.js"
import { buildElement, buildSlot, buildText } from "../tree/builders.js"
import type { ElementNode } from "../tree/node.js"
import { createTree } from "../tree/tree.js"
import { themeSelectionSchema, type ThemeSelection } from "../theme/theme.js"

import { defineSpecimen, WIDE } from "../../tools/specimen/specimen.js"

/**
 * Where a reader is standing after the region they were standing in closes
 * (0237).
 *
 * **The first sheet in this repository driven entirely by a keyboard**, and it
 * had to be. Every other picture of a behaviour is taken with a mouse, and the
 * state this one is about is invisible to one: a browser paints a focus ring on
 * the strength of the **last input having been a keyboard**, so a `click`
 * journey reaches the same closed lightbox and photographs no focus anywhere.
 * `ShotStep.key` exists for this sheet, the same way `live` and `states` existed
 * for the sheet that first photographed a dialog.
 *
 * ## The three states, and the middle one is the control
 *
 * | state | what it is for |
 * | --- | --- |
 * | `arrived` | the tile as hydration settles, with the ring on the trigger a Tab put it on — the page before anything opened |
 * | `inside` | the lightbox open with the ring on its cross, which is where a keyboard reader ends up |
 * | `back on the trigger` | the same page after Escape: closed, and the ring back on the button the reader came from |
 *
 * **The third picture is the whole claim and the first is what makes it
 * readable.** A ring on the trigger means nothing on its own — it is also where
 * the ring was before anything opened. The pair is the evidence: the reader was
 * demonstrably *elsewhere* in the second shot, and the third is not a page that
 * never moved.
 *
 * On `main` the third shot has **no ring on anything**, which is the defect: the
 * cross is inside a subtree the primitive's rule has just hidden, so the browser
 * blurs it and focus falls to `<body>`. The next Tab starts again from the top of
 * the document.
 *
 * ## Why a lightbox and not the popover beside it
 *
 * The cross. `dismiss` is the only way out of a region that covers the viewport
 * (0176, clause 5) and the lightbox is the primitive that places one, so it is
 * the one primitive where the *whole* of 0237's table is reachable: Escape with
 * the reader inside, and a cross that answers without being asked where focus
 * is.
 *
 * ## Why one theme, and why the wide viewport only
 *
 * A focus ring is the browser's, drawn outside the element's own box, and it is
 * the same ring under every palette this library ships. A second theme would be
 * a second picture of one browser default — which is the opposite of the reason
 * the behaviours sheet is photographed under two.
 *
 * The phone is left out for a sharper reason, and it is the one `PHONE` grew a
 * `touch` field to make true: a phone reports a coarse pointer and no keyboard,
 * so a Tab-and-Escape journey photographed at 390 pixels is a picture of
 * something that does not happen there. The driver would still send the keys and
 * the shot would still come back — which is exactly the kind of picture that
 * reads as evidence and is not.
 */

const text = (ids: IdFactory, value: string) => buildText(ids, value)

const prose = (ids: IdFactory, value: string, extra: JsonObject = {}): ElementNode =>
  buildElement(ids, { type: "loom.prose", props: extra, children: [text(ids, value)] })

const heading = (ids: IdFactory, value: string, level: number): ElementNode =>
  buildElement(ids, { type: "loom.heading", props: { level }, children: [text(ids, value)] })

/**
 * The stand-in for a photograph, for the behaviours sheet's reason:
 * `mediaUrlSchema` refuses `data:` and a specimen may reach no network, so the
 * thing inside the tile is chrome this library draws around real words.
 */
const frame = (ids: IdFactory, label: string, title: string, body: string): ElementNode =>
  buildElement(ids, {
    type: "loom.frame",
    props: { chrome: "browser", label },
    children: [
      buildSlot(ids, "surface", [
        buildElement(ids, {
          type: "loom.card",
          props: { tone: "plain", padding: "normal" },
          children: [
            buildElement(ids, {
              type: "loom.stack",
              props: { direction: "column", gap: "snug", align: "stretch" },
              children: [heading(ids, title, 3), prose(ids, body, { size: "small", tone: "muted" })],
            }),
          ],
        }),
      ]),
    ],
  })

/**
 * **One** lightbox, and the single tile is deliberate where the behaviours sheet
 * has a grid of three. A keyboard journey is counted in Tab presses, so every
 * extra focusable element on the page is a number in three `do` lists that has
 * to be re-counted when the tree changes. One tile makes the first Tab the
 * trigger and the next the cross, which is a journey a reader of the states can
 * check against the picture without running anything.
 */
const tile = (ids: IdFactory): ElementNode =>
  buildElement(ids, {
    type: "loom.section",
    props: { width: "readable" },
    children: [
      heading(ids, "Where the reader is put back", 2),
      prose(
        ids,
        "Open the tile from the keyboard, tab to the cross, and press Escape. The ring on the button is the whole of it.",
        { tone: "muted" }
      ),
      buildElement(ids, {
        type: "loom.lightbox",
        props: { aspect: "wide", caption: "The record, at the size it was drawn for" },
        children: [
          buildSlot(ids, "preview", [
            frame(
              ids,
              "loom.dev/the-record",
              "The record",
              "A thumbnail, at the size a page has room for."
            ),
          ]),
          buildSlot(ids, "full", [
            frame(
              ids,
              "loom.dev/the-record",
              "The record, in full",
              "The same screen at the size it was drawn for, which is a second region holding a second thing — and the one region in this library that covers the viewport, so the cross is the only way out of it."
            ),
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
      children: [tile(ids)],
    }),
    ids
  )
}

export default defineSpecimen({
  name: "2026-10-07-framework-the-button-they-came-from",
  title:
    "A lightbox closed from the keyboard, and the trigger the reader is put back on — arrived, inside, and back out again",
  build,
  viewports: [WIDE],
  themes: [
    {
      label: "minimal",
      selection: themeSelectionSchema.parse({
        palette: "minimal",
        fontPack: "minimal-sans",
        stylePreset: "comfortable",
      }),
    },
  ],
  live: {
    states: [
      { label: "arrived", do: [{ key: "Tab" }] },
      {
        label: "inside",
        do: [{ key: "Tab" }, { key: "Enter" }, { wait: 400 }, { key: "Tab" }],
      },
      {
        label: "back on the trigger",
        do: [{ key: "Tab" }, { key: "Enter" }, { wait: 400 }, { key: "Tab" }, { key: "Escape" }, { wait: 400 }],
      },
    ],
  },
})
