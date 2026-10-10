import { createElement, type CSSProperties, type ReactNode } from "react"
import { z } from "zod"

import { nodeDataOf } from "../../src/data/resolution.js"
import type { JsonValue } from "../../src/json.js"
import { sequentialIdFactory } from "../../src/ids.js"
import { colour, monospace, size, space } from "../../src/primitives/tokens.js"
import { primitiveTypeSchema } from "../../src/primitive-type.js"
import type { LoomPrimitiveProps } from "../../src/render/primitive.js"
import { THEME_PROP_KEY } from "../../src/reserved-props.js"
import { auditRegistry, type RegistryAudit, type RegistryAuditOptions } from "../../src/sdk/audit.js"
import type { ProbeAnswers } from "../../src/sdk/conformance.js"
import { definePrimitive } from "../../src/sdk/definition.js"
import { createPrimitiveRegistry } from "../../src/sdk/registry.js"
import { themeSelectionSchema, type ThemeSelection } from "../../src/theme/theme.js"
import { buildElement, buildText } from "../../src/tree/builders.js"
import { createTree } from "../../src/tree/tree.js"

import { defineSpecimen, WIDE } from "./specimen.js"

/**
 * One registry, audited three times — the picture of what 0251 adds.
 *
 * Two bound primitives, each correct: they draw a region when their binding
 * answers and a line of their own when it did not. The probe can only ask a
 * primitive about its props, so with no answer at all both take the
 * did-not-answer branch under every configuration and every region they declare
 * reads as dropped content.
 *
 * The first two columns are the point. `unplacedSlots` is **identical** in them:
 * four regions reported dropped, four primitives apparently broken. In the left
 * column nobody handed the audit an answer. In the middle one somebody did, and
 * keyed it under a name neither primitive reads — which is the failure mode the
 * new list creates, because a host told to empty `notAnswered` can satisfy a
 * list that only counted answers without any of them landing.
 *
 * `notAnswered` is the only line that tells those two apart, and it names the
 * cause: `no-answers` on the left, `names-not-answered` in the middle. On the
 * right the same registry, handed the names it reads, reports nothing at all.
 *
 * **Nothing in any column is typed into this file.** Each one calls
 * `auditRegistry` on the same registry with different options and prints what
 * comes back.
 */

const listing = definePrimitive({
  type: "spec.bound-listing",
  description: "Draws rows, an empty region, or a line saying it could not read them.",
  props: z.object({ binding: z.string().optional() }),
  slots: ["rows", "empty"],
  reads: [{ fromProp: "binding", default: "entries" }],
  component: ({ loom, props }) => {
    const answer = loom.data[props.binding ?? "entries"]

    if (!answer || answer.status !== "ready") {
      return createElement("p", null, "could not be read")
    }

    return createElement(
      "div",
      null,
      Array.isArray(answer.value) && answer.value.length > 0
        ? loom.slots["rows"]
        : loom.slots["empty"]
    )
  },
})

const tally = definePrimitive({
  type: "spec.bound-tally",
  description: "Draws a total, or a line saying it could not read one.",
  props: z.object({}),
  slots: ["total"],
  reads: ["counts"],
  component: ({ loom }: LoomPrimitiveProps) => {
    const answer = loom.data["counts"]

    if (!answer || answer.status !== "ready") {
      return createElement("p", null, "could not be read")
    }

    return createElement("div", null, loom.slots["total"] ?? null)
  },
})

const LISTING = primitiveTypeSchema.parse(listing.type)
const TALLY = primitiveTypeSchema.parse(tally.type)

const answeredUnder = (name: string, value: JsonValue): ProbeAnswers => ({
  data: nodeDataOf({ [name]: { status: "ready", value } }),
})

/**
 * Both states the listing draws, because a region is reachable only in one of
 * them: rows for a list with something in it, empty for a list with nothing.
 * Declaring one state would leave the other region reported dropped, which is
 * this audit's stated limit rather than a fault in the primitive.
 */
const bothStates = (name: string): readonly ProbeAnswers[] => [
  answeredUnder(name, [{ title: "one" }]),
  answeredUnder(name, []),
]

/**
 * The three calls, by the one thing that differs between them: what the caller
 * said. Keyed rather than indexed so a column names the call it made.
 */
const CALLS: Readonly<Record<string, RegistryAuditOptions>> = {
  nothing: {},
  wrongNames: {
    answers: new Map([
      [LISTING, bothStates("rows")],
      [TALLY, bothStates("totals")],
    ]),
  },
  theNamesTheyRead: {
    answers: new Map([
      [LISTING, bothStates("entries")],
      [TALLY, bothStates("counts")],
    ]),
  },
}

/**
 * The audit, run for real.
 *
 * Built per column rather than shared, because the registry is the *constant*
 * here: two columns that differed in their registry would be arguing about two
 * libraries, and the claim is that one library reads three ways.
 */
const audit = (call: string): RegistryAudit | undefined => {
  const built = createPrimitiveRegistry([listing, tally])

  if (!built.ok) return undefined

  return auditRegistry(built.value, CALLS[call] ?? {})
}

const dropped = (audited: RegistryAudit): string =>
  audited.unplacedSlots.length === 0
    ? "(none)"
    : audited.unplacedSlots.map((entry) => `${entry.type}: ${entry.slots.join(", ")}`).join("\n")

const unanswered = (audited: RegistryAudit): string =>
  audited.notAnswered.length === 0
    ? "(none)"
    : audited.notAnswered.map((entry) => `${entry.type}: ${entry.reason}`).join("\n")

const LABEL: CSSProperties = {
  display: "block",
  marginBottom: space(2),
  fontFamily: monospace(),
  fontSize: size(1),
  letterSpacing: "0.04em",
  color: colour("fg-subtle"),
}

const LOG: CSSProperties = {
  margin: 0,
  marginBottom: space(4),
  fontFamily: monospace(),
  fontSize: size(1),
  lineHeight: 1.7,
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

const auditPanel = definePrimitive({
  type: "spec.audit",
  description: "What auditRegistry reported for one registry, under one caller's options.",
  props: z.object({ call: z.string() }),
  component: ({ props }: LoomPrimitiveProps<{ call: string }>) => {
    const audited = audit(props.call)

    if (!audited) return createElement("p", { style: LOG }, "the registry did not build")

    return createElement(
      "div",
      null,
      line("unplacedSlots", dropped(audited), "dropped"),
      line("notAnswered", unanswered(audited), "unanswered")
    )
  },
})

const column = (
  idFactory: ReturnType<typeof sequentialIdFactory>,
  heading: string,
  note: string,
  call: string
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
      buildElement(idFactory, { type: "spec.audit", props: { call } }),
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
          buildText(idFactory, "The same two primitives, and the only difference is what the audit was told"),
        ],
      }),
      buildElement(idFactory, {
        type: "loom.prose",
        props: { size: "lead" },
        children: [
          buildText(
            idFactory,
            "Two bound primitives draw a region when their binding answers and a line of their own when it did not. Probed with no answer they take the second branch every time, so every region they declare reads as dropped. The first two columns report that identically — and until this run, nothing on the audit said why the left one is the instrument's blind spot and the middle one is a caller's mistake.",
          ),
        ],
      }),
      buildElement(idFactory, {
        type: "loom.grid",
        props: { columns: "three", gap: "loose" },
        children: [
          column(
            idFactory,
            "Handed no answers",
            "Every audit of a bound primitive until somebody opts in. Four regions reported dropped, and the primitives are correct.",
            "nothing"
          ),
          column(
            idFactory,
            "Handed answers keyed wrong",
            "Somebody opted in and keyed the answers under names neither primitive reads. The dropped regions are identical to the left column.",
            "wrongNames"
          ),
          column(
            idFactory,
            "Handed the names they read",
            "The same registry, answered. Nothing is dropped and nothing is unanswered, which is the library telling the truth about itself.",
            "theNamesTheyRead"
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
  name: "not-answered",
  title: "The same two primitives, and the only difference is what the audit was told",
  build,
  primitives: [auditPanel],
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
