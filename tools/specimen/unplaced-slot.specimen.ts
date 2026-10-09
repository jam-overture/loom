import { createElement, type CSSProperties, type ReactNode } from "react"
import { z } from "zod"

import { sequentialIdFactory } from "../../src/ids.js"
import { colour, family, monospace, size, space } from "../../src/primitives/tokens.js"
import { slotNameSchema } from "../../src/primitive-type.js"
import type { LoomPrimitiveProps } from "../../src/render/primitive.js"
import type { SlotPlacer } from "../../src/render/slots.js"
import { THEME_PROP_KEY } from "../../src/reserved-props.js"
import { assessChange } from "../../src/runtime/assessment.js"
import { gate } from "../../src/runtime/gate.js"
import { defaultGatePolicy } from "../../src/runtime/policy.js"
import { definePrimitive } from "../../src/sdk/definition.js"
import { buildIntent, buildProposal } from "../../src/testing/doubles.js"
import { themeSelectionSchema, type ThemeSelection } from "../../src/theme/theme.js"
import { buildElement, buildSlot, buildText } from "../../src/tree/builders.js"
import type { TreeDelta } from "../../src/tree/delta.js"
import { createTree } from "../../src/tree/tree.js"

import { defineSpecimen, WIDE } from "./specimen.js"

/**
 * The same delta, twice — the picture of what 0250 adds, and the sibling of the
 * `unread-binding` sheet beside it.
 *
 * A model is asked to put a paragraph in a panel. It writes a region correctly in
 * every way the seams could already check: the type is registered, the props are
 * valid, the content is well-formed. It fills `body`, and `spec.panel` places
 * `header`.
 *
 * On the left is what every deployment did until this run and what every
 * deployment that hands no placer still does: the change is judged `low`,
 * applied, appended to the log, and served. The page draws. The paragraph and
 * everything under it is dropped on the floor, on every request, until somebody
 * reads render diagnostics.
 *
 * On the right is the same delta against the same policy, with the registry
 * handed to the write path. Nothing else differs — not the tree, not the
 * proposal, not the confidence, not the policy.
 *
 * **Nothing in either column is typed into this file.** Both call `assessChange`
 * and `gate`, the two functions the composition runtime calls, and draw what
 * comes back: the disposition's kind, the rule that fired, and the factor's own
 * detail line. The `body` in the right-hand column is the runtime saying it,
 * which is the whole claim — the refusal carries the string a repairer rewrites.
 */

const PANEL = "spec.panel"

const panel = definePrimitive({
  type: PANEL,
  description: "A panel with one region, which is the only region it places.",
  props: z.object({}),
  slots: ["header"],
  component: ({ loom }: LoomPrimitiveProps) =>
    createElement("section", null, loom.slots["header"] ?? null),
})

/**
 * The registry's half, as a placer over one type.
 *
 * A real host hands its registry, which satisfies `SlotPlacer` already. A
 * specimen cannot: `createPrimitiveRegistry` would want every type on the page
 * registered, and the page is a `loom.section` full of house primitives. So this
 * answers for `spec.panel` and `undefined` for everything else, which is exactly
 * what a registry holding only that type would answer.
 *
 * It reads the declaration rather than repeating it, so the sheet cannot end up
 * arguing against a list the primitive above does not have.
 */
const placesHeader: SlotPlacer = {
  slotsPlacedBy: (type) =>
    type === PANEL ? panel.slots.map((name) => slotNameSchema.parse(name)) : undefined,
}

type Verdict = {
  readonly kind: string
  readonly rule: string
  readonly detail: string
}

/**
 * One judgement, run for real.
 *
 * The tree is rebuilt per column rather than shared, for the reason the sheet
 * beside this one gives: `assessChange` needs the revision the delta names, and
 * two judgements of one tree would have to agree about which of them moved it.
 * Neither applies anything — the point of the picture is the verdict, and a
 * verdict is what the Gate returns before anybody writes.
 */
const judge = (places: SlotPlacer | undefined): Verdict => {
  const idFactory = sequentialIdFactory("spec")

  const subject = buildElement(idFactory, { type: PANEL })
  const page = buildElement(idFactory, { type: "loom.page", children: [subject] })
  const tree = createTree(page, idFactory)

  const delta: TreeDelta = {
    deltaId: idFactory.deltaId(),
    treeId: tree.treeId,
    baseRevision: tree.revision,
    operations: [
      {
        op: "insert",
        parentId: subject.id,
        index: 0,
        node: buildSlot(idFactory, "body", [
          buildText(idFactory, "Book a call and we will come to you."),
        ]),
      },
    ],
  }

  const intent = buildIntent(idFactory, { treeId: tree.treeId, baseRevision: tree.revision })
  const proposal = buildProposal(idFactory, { intentId: intent.intentId, delta })

  const assessed = assessChange(tree, proposal, defaultGatePolicy, idFactory.deltaId(), {
    slotPlacer: places,
  })

  if (!assessed.ok) return { kind: "not applicable", rule: assessed.error.code, detail: "" }

  const disposition = gate(assessed.value, defaultGatePolicy)

  return {
    kind: disposition.kind,
    rule: disposition.reason.code,
    detail: assessed.value.stakes.factors.map((factor) => factor.detail).join("; "),
  }
}

const LABEL: CSSProperties = {
  display: "block",
  marginBottom: space(2),
  fontFamily: family("body"),
  fontSize: size(1),
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: colour("fg-subtle"),
}

const LOG: CSSProperties = {
  margin: 0,
  marginBottom: space(4),
  fontFamily: monospace(),
  fontSize: size(2),
  lineHeight: 1.6,
  color: colour("fg-default"),
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
}

const line = (label: string, value: string, key: string): ReactNode =>
  createElement(
    "div",
    { key },
    createElement("span", { style: LABEL }, label),
    createElement("p", { style: LOG }, value)
  )

const verdictPanel = definePrimitive({
  type: "spec.verdict",
  description: "What the Gate answered, for a write path handed a placer or handed none.",
  props: z.object({ wired: z.boolean() }),
  component: ({ props }: LoomPrimitiveProps<{ wired: boolean }>) => {
    const verdict = judge(props.wired ? placesHeader : undefined)

    return createElement(
      "div",
      null,
      line("disposition", verdict.kind, "kind"),
      line("rule", verdict.rule, "rule"),
      line("what it weighed", verdict.detail || "nothing objected", "detail")
    )
  },
})

const column = (
  idFactory: ReturnType<typeof sequentialIdFactory>,
  heading: string,
  note: string,
  wired: boolean
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
      buildElement(idFactory, { type: "spec.verdict", props: { wired } }),
    ],
  })

const build = (theme: ThemeSelection) => {
  const idFactory = sequentialIdFactory()

  const section = buildElement(idFactory, {
    type: "loom.section",
    props: { eyebrow: "Specimen", width: "wide" },
    children: [
      buildElement(idFactory, {
        type: "loom.heading",
        props: { level: 1, balance: true },
        children: [
          buildText(idFactory, "One delta, one policy, and the only difference is who was asked"),
        ],
      }),
      buildElement(idFactory, {
        type: "loom.prose",
        props: { size: "lead" },
        children: [
          buildText(
            idFactory,
            "A model puts a paragraph in a panel and fills the region called body. The type is registered, the props are valid, the content is well-formed — and the panel places one region, called header. Both columns judge that same delta against the same policy. Only the right-hand one was handed the registry.",
          ),
        ],
      }),
      buildElement(idFactory, {
        type: "loom.grid",
        props: { columns: "two", gap: "loose" },
        children: [
          column(
            idFactory,
            "Handed no placer",
            "Every deployment until this run, and every deployment that does not opt in. Applied, appended, served — and the paragraph is nowhere on the page.",
            false
          ),
          column(
            idFactory,
            "Handed the registry",
            "The same change, refused at the ordinary floor, carrying the region it filled and the type that places no region of that name.",
            true
          ),
        ],
      }),
    ],
  })

  return createTree(
    buildElement(idFactory, {
      type: "loom.page",
      props: { [THEME_PROP_KEY]: theme, width: "wide" },
      children: [section],
    }),
    idFactory
  )
}

export default defineSpecimen({
  name: "unplaced-slot",
  title: "One delta, one policy, and the only difference is who was asked",
  build,
  primitives: [panel, verdictPanel],
  viewports: [WIDE],
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
