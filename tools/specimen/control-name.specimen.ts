import { createElement, type ReactNode } from "react"
import { z } from "zod"

import { sequentialIdFactory } from "../../src/ids.js"
import { PRESENTED_ATTRIBUTE } from "../../src/render/behaviour.js"
import type { LoomPrimitiveProps } from "../../src/render/primitive.js"
import { THEME_PROP_KEY } from "../../src/reserved-props.js"
import { definePrimitive } from "../../src/sdk/definition.js"
import { themeSelectionSchema, type ThemeSelection } from "../../src/theme/theme.js"
import { buildElement, buildText } from "../../src/tree/builders.js"
import { createTree } from "../../src/tree/tree.js"

import { defineSpecimen, WIDE } from "./specimen.js"

/**
 * Three triggers, one primitive, three different words — and the third one is the
 * floor.
 *
 * Until now every control in the vocabulary was named per *type*: one `Copy` on
 * every code panel in a deployment, which is right for an affordance and is the
 * reason a dialog could not be built. A page's call to action is content, so two
 * dialogs on one screen were two buttons a screen reader announced identically
 * and a trigger reading *Open* was the best the seam could do.
 *
 * `spec.dialog` names its `present` control from its own `label` prop, so the
 * first two triggers below carry what their nodes carry. The third node leaves
 * the prop out and gets the string the primitive declared, which is the half of
 * this worth photographing beside the other two: nothing a tree omits can leave a
 * control without a name.
 *
 * **The cross is not named from the tree**, because this primitive did not say it
 * was. Open a panel in the `presented` shot and the button inside it still reads
 * *Close* — one control named from the page, one from the library, in one
 * primitive.
 *
 * The subject is the seam, so the primitive is the smallest thing that holds it,
 * registered for this specimen only. A dialog anybody's page should be able to
 * use is a finding for `Loom primitives`, not this.
 */

const props = z.object({ label: z.string().optional() }).strict()

type Props = z.infer<typeof props>

const TEXT = { present: "Open", dismiss: "Close" } as const

type TextKey = keyof typeof TEXT

/**
 * Rendered by the primitive rather than linked, because a specimen's document
 * carries no stylesheet of its own and the one rule here is the contract: the
 * boolean lands on the element the trigger was placed in, and a descendant
 * selector is what reaches the panel.
 */
const STYLES = `
.spec-dialog{display:flex;flex-direction:column;gap:10px;align-items:flex-start;padding:16px;border:1px solid currentColor;border-radius:8px}
.spec-panel{padding:12px;border:1px dashed currentColor;border-radius:6px;display:flex;flex-direction:column;gap:8px;align-items:flex-start}
[${PRESENTED_ATTRIBUTE}="false"] .spec-panel{display:none}
`

export const specDialog = definePrimitive({
  type: "spec.dialog",
  description: "A specimen subject whose trigger is named by the node and whose cross is not.",
  props,
  text: TEXT,
  behaviours: ["present", "dismiss"],
  names: { present: "label" },
  interactive: "always",
  component: ({ loom }: LoomPrimitiveProps<Props, TextKey, "present" | "dismiss">): ReactNode =>
    createElement(
      "div",
      { ...loom.editable, className: "spec-dialog" },
      createElement("style", { key: "style" }, STYLES),
      loom.behaviours.present,
      createElement(
        "div",
        { key: "panel", className: "spec-panel" },
        "The panel this trigger opens",
        loom.behaviours.dismiss
      )
    ),
})

const dialog = (ids: ReturnType<typeof sequentialIdFactory>, label?: string) =>
  buildElement(ids, {
    type: "spec.dialog",
    props: label === undefined ? {} : { label },
    children: [],
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
        children: [buildText(idFactory, "Three triggers a dictionary should not hold")],
      }),
      buildElement(idFactory, {
        type: "loom.prose",
        props: { size: "lead" },
        children: [
          buildText(
            idFactory,
            "One primitive, three nodes. The first two name their own trigger, because a call to action is the page's words rather than the library's. The third names nothing and is announced by the string the primitive declared."
          ),
        ],
      }),
      dialog(idFactory, "Watch the demo"),
      dialog(idFactory, "Book a call"),
      dialog(idFactory),
      buildElement(idFactory, {
        type: "loom.prose",
        props: { tone: "muted", size: "small" },
        children: [
          buildText(
            idFactory,
            "The cross inside each panel is still Close. A primitive names the controls whose words are content and leaves the rest to its own vocabulary, which is what keeps one dictionary able to translate the library."
          ),
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
  name: "control-name",
  title: "A control named from the tree",
  build,
  primitives: [specDialog],
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
      /** What hydration produces: three triggers, and only one of the three words is the library's. */
      { label: "settled", do: [] },
      /** The cross the tree did not name, inside the panel the tree did. */
      { label: "presented", do: [{ click: "text=Book a call" }] },
    ],
  },
})
