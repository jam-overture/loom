import { createElement, type ReactNode } from "react"
import { z } from "zod"

import { sequentialIdFactory } from "../../src/ids.js"
import type { LoomPrimitiveProps } from "../../src/render/primitive.js"
import { DISCLOSED_ATTRIBUTE, PRESENTED_ATTRIBUTE } from "../../src/render/behaviour.js"
import { DATA_PROP_KEY, THEME_PROP_KEY } from "../../src/reserved-props.js"
import { definePrimitive } from "../../src/sdk/definition.js"
import { themeSelectionSchema, type ThemeSelection } from "../../src/theme/theme.js"
import { buildElement, buildSlot, buildText } from "../../src/tree/builders.js"
import { createTree } from "../../src/tree/tree.js"

import { defineSpecimen } from "./specimen.js"
import { WIDE } from "./specimen.js"

/**
 * The behaviour vocabulary, photographed.
 *
 * Five members shipped between 24 August and 23 September and not one of them
 * had ever appeared in a picture in this repository, because every control
 * returns `null` until an effect proves scripting runs and a specimen page had
 * no scripting in it. Three lanes wrote a private bundle-and-serve script in
 * four days rather than go without. This is that picture, taken by the harness.
 *
 * **The subject is the seam, so the primitive is the smallest thing that can
 * hold it.** `spec.behaviours` places all five controls and the three regions
 * they drive, has no props, and is registered for this specimen only through
 * `Specimen.primitives`. It is deliberately not a primitive anybody's page would
 * want: `loom.nav` and `loom.code` are the two real ones that take a behaviour
 * today, between them they cover two of the five, and adding three more to the
 * starter library to have something to photograph would be this lane editing
 * `src/primitives/` — which is `Loom primitives`' directory.
 *
 * **What each region proves is the contract, not the control.** A control
 * publishes and the primitive reads: `disclose` stamps a boolean on its own
 * button and a sibling rule hides the menu; `present` stamps one on the element
 * the trigger was placed in and a descendant rule hides the panel; `adjust`
 * writes a number as a custom property on that same parent and a width computes
 * from it. Each rule is written in the direction the seam requires — the region
 * is visible and the rule hides it — so the page served without scripting shows
 * every region open, which is what the `settled` shot is worth comparing
 * against.
 *
 * **The band at the foot is bound, and it is here because it is the one subject
 * that needs both seams at once.** `loom.feed` draws rows only if something
 * answered the source it binds, and the five controls above it exist only once
 * the page has been hydrated — so this page cannot be photographed as it is
 * without `answers` and `live` being declared together, which is what nothing
 * could do until the two seams met in `specimenElement`.
 *
 * **What the photograph is not evidence of.** The rows are resolved on the
 * server whether or not the page is live, and React's production build settles a
 * hydration mismatch by keeping the server's markup and saying nothing — so a
 * picture with rows in it cannot tell you the browser's own resolve agreed. What
 * can is building the page twice and comparing, which is a test rather than a
 * shot (`specimen.test.ts`, *both seams in one element*). The picture's job is
 * the controls; the agreement's job is the test.
 */

const props = z.object({}).strict()

type Props = z.infer<typeof props>

const TEXT = {
  copy: "Copy",
  copied: "Copied",
  disclose: "Menu",
  adjust: "Reveal",
  present: "Open the panel",
  dismiss: "Close",
} as const

type TextKey = keyof typeof TEXT

/**
 * Rendered by the primitive rather than linked, because a specimen's document
 * carries no stylesheet of its own on purpose (`page.ts`) and these three rules
 * are the subject rather than decoration. They are also the one thing here that
 * cannot be an inline style: every one of them is a selector.
 */
const STYLES = `
.spec-slab{display:flex;flex-direction:column;gap:20px;padding:20px;border:1px solid currentColor;border-radius:8px}
.spec-group{display:flex;flex-direction:column;gap:8px;align-items:flex-start}
.spec-region{padding:12px;border:1px dashed currentColor;border-radius:6px}
[${DISCLOSED_ATTRIBUTE}="false"] ~ .spec-menu{display:none}
[${PRESENTED_ATTRIBUTE}="false"] .spec-panel{display:none}
.spec-track{width:240px;height:12px;border:1px solid currentColor;border-radius:999px;overflow:hidden}
.spec-fill{height:100%;background:currentColor;width:calc(var(--loom-adjust, 50) * 1%)}
`

const group = (key: string, children: readonly ReactNode[]): ReactNode =>
  createElement("div", { key, className: "spec-group" }, ...children)

const region = (key: string, className: string, label: string): ReactNode =>
  createElement("div", { key, className: `spec-region ${className}` }, label)

export const specBehaviours = definePrimitive({
  type: "spec.behaviours",
  description: "A specimen subject that places every control in the behaviour vocabulary.",
  props,
  text: TEXT,
  behaviours: ["copy", "disclose", "adjust", "present", "dismiss"],
  /**
   * Five controls is five targets, and the registry refuses a primitive that
   * takes one without saying so — which is the check that keeps a button out of
   * an anchor.
   */
  interactive: "always",
  component: ({
    loom,
  }: LoomPrimitiveProps<Props, TextKey, "copy" | "disclose" | "adjust" | "present" | "dismiss">) =>
    createElement(
      "div",
      { ...loom.editable, className: "spec-slab" },
      createElement("style", { key: "style" }, STYLES),
      group("copy", [loom.behaviours.copy]),
      /** The menu is a following sibling of the button, which is what the plain contract selects. */
      group("disclose", [loom.behaviours.disclose, region("menu", "spec-menu", "The menu")]),
      /** The number lands on this group, and the fill below reads it by inheritance. */
      group("adjust", [
        loom.behaviours.adjust,
        createElement(
          "div",
          { key: "track", className: "spec-track" },
          createElement("div", { key: "fill", className: "spec-fill" })
        ),
      ]),
      /** The boolean lands on this group, and the panel inside it is what the rule reaches. */
      group("present", [
        loom.behaviours.present,
        createElement(
          "div",
          { key: "panel", className: "spec-region spec-panel" },
          "The panel",
          loom.behaviours.dismiss
        ),
      ])
    ),
})

const build = (theme: ThemeSelection) => {
  const idFactory = sequentialIdFactory()

  const section = buildElement(idFactory, {
    type: "loom.section",
    props: { eyebrow: "Behaviour", width: "readable" },
    children: [
      buildElement(idFactory, {
        type: "loom.heading",
        props: { level: 1, balance: true },
        children: [buildText(idFactory, "Five controls a still page cannot show")],
      }),
      buildElement(idFactory, {
        type: "loom.prose",
        props: { size: "lead" },
        children: [
          buildText(
            idFactory,
            "Every control below returns nothing until an effect proves scripting runs, which is correct on a served page and is why none of them had ever been photographed. This page is hydrated before the shutter."
          ),
        ],
      }),
      buildElement(idFactory, { type: "spec.behaviours", props: {}, children: [] }),
      buildElement(idFactory, {
        type: "loom.heading",
        props: { level: 2 },
        children: [buildText(idFactory, "And a band that was answered")],
      }),
      buildElement(idFactory, {
        type: "loom.prose",
        props: { tone: "muted", size: "small" },
        children: [
          buildText(
            idFactory,
            "These rows come from an answer this specimen declares. The browser that hydrates the controls above builds this band from the same declaration, through the same function — which is what lets one specimen be answered and hydrated at once."
          ),
        ],
      }),
      buildElement(idFactory, {
        type: "loom.feed",
        props: {
          [DATA_PROP_KEY]: { entries: { source: "controls.shipped", params: {} } },
          density: "tight",
        },
        children: [
          buildSlot(idFactory, "empty", [
            buildElement(idFactory, {
              type: "loom.empty-state",
              props: { outline: "dashed", stature: "compact", cause: "empty" },
              children: [
                buildElement(idFactory, {
                  type: "loom.heading",
                  props: { level: 4 },
                  children: [buildText(idFactory, "Nothing answered")],
                }),
              ],
            }),
          ]),
        ],
      }),
    ],
  })

  const page = buildElement(idFactory, {
    type: "loom.page",
    props: { [THEME_PROP_KEY]: theme, width: "readable" },
    children: [section],
  })

  return createTree(page, idFactory)
}

export default defineSpecimen({
  name: "behaviour",
  title: "The behaviour vocabulary",
  build,
  primitives: [specBehaviours],
  /**
   * The other seam, declared on the same specimen. Nothing arbitrates between
   * the two: an answer is a reply held in this module, so the browser's resolve
   * returns what the server's did and the rows survive hydration.
   */
  answers: {
    "controls.shipped": {
      answer: [
        { title: "copy", meta: "24 August" },
        { title: "disclose", meta: "3 September" },
        { title: "adjust", meta: "16 September" },
        { title: "present and dismiss", meta: "23 September" },
      ],
    },
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
  viewports: [WIDE],
  live: {
    states: [
      /** What hydration alone produces: five controls that were not there before. */
      { label: "settled", do: [] },
      { label: "disclosed", do: [{ click: ".loom-control-disclose" }] },
      { label: "presented", do: [{ click: ".loom-control-present" }] },
      /** The pair, closed by the control that is meaningless without the other. */
      {
        label: "dismissed",
        do: [{ click: ".loom-control-present" }, { click: ".loom-control-dismiss" }],
      },
    ],
  },
})
