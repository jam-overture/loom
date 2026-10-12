import { createElement, type CSSProperties, type ReactNode } from "react"
import { z } from "zod"

import type { JsonObject } from "../../src/json.js"
import { sequentialIdFactory } from "../../src/ids.js"
import { colour, monospace, size, space } from "../../src/primitives/tokens.js"
import { primitiveTypeSchema } from "../../src/primitive-type.js"
import type { LoomPrimitiveProps } from "../../src/render/primitive.js"
import { THEME_PROP_KEY } from "../../src/reserved-props.js"
import { auditRegistry, type RegistryAudit, type RegistryAuditOptions } from "../../src/sdk/audit.js"
import { definePrimitive } from "../../src/sdk/definition.js"
import { createPrimitiveRegistry } from "../../src/sdk/registry.js"
import { themeSelectionSchema, type ThemeSelection } from "../../src/theme/theme.js"
import { buildElement, buildText } from "../../src/tree/builders.js"
import { createTree } from "../../src/tree/tree.js"

import { defineSpecimen, WIDE } from "./specimen.js"

/**
 * One registry, audited three times — the picture of what 0267 adds.
 *
 * One primitive, correct, in the style the starter library happens never to use:
 * it **reads** a required prop instead of handing it to React. The probe's
 * default configuration is the empty bag, which this primitive's own schema
 * refuses, so the only call the audit could make is one no tree the Gate accepts
 * could produce — and it throws.
 *
 * Until this run that call reported a **fault**: a row in
 * `throwsOnDeclaredProps`, whose own doc comment reads *a tree the validator
 * accepts can take the page down*, with `{}` as the reproduction — a bag the
 * validator would have refused. It landed in `notProbeable` as well, beside the
 * class and hook-using components that are legitimately unjudgeable, so every
 * other list on the audit went quiet about it.
 *
 * The left column is that same call today: no fault claimed, and
 * `notConfigured` naming what the call was missing — the prop, the reason, and
 * the refusal in the validator's own words. `refusedConfigurations` is the row
 * that used to be reported as the fault, now carried as what it is.
 *
 * The middle column is one props bag handed over and refused as well, which is
 * the failure the remedy creates and the reason the two causes are told apart.
 * The right column is a bag the schema accepts: the component is judged for the
 * first time, and it decorates.
 *
 * **Nothing in any column is typed into this file.** Each one calls
 * `auditRegistry` on the same registry with different options and prints what
 * comes back.
 */

const shouting = definePrimitive({
  type: "spec.shouting",
  description: "Prints a required service name in capitals.",
  props: z.object({ service: z.string().min(1).max(60) }).strict(),
  component: ({ loom, props }) =>
    createElement("div", { ...loom.editable }, props.service.toUpperCase()),
})

const SHOUTING = primitiveTypeSchema.parse(shouting.type)

/**
 * The three calls, by the one thing that differs between them: what the caller
 * said. Keyed rather than indexed so a column names the call it made.
 */
const CALLS: Readonly<Record<string, RegistryAuditOptions>> = {
  nothing: {},
  refusedProps: { props: new Map([[SHOUTING, [{ name: "Acme" }]]]) },
  acceptedProps: { props: new Map([[SHOUTING, [{ service: "Acme" }]]]) },
}

/**
 * The audit, run for real.
 *
 * Built per column rather than shared, because the registry is the *constant*
 * here: the claim is that one primitive reads three ways depending on what the
 * caller handed over.
 */
const audit = (call: string): RegistryAudit | undefined => {
  const built = createPrimitiveRegistry([shouting])

  if (!built.ok) return undefined

  return auditRegistry(built.value, CALLS[call] ?? {})
}

const bag = (props: JsonObject): string => JSON.stringify(props)

const throwing = (audited: RegistryAudit): string =>
  audited.throwsOnDeclaredProps.length === 0
    ? "(none)"
    : audited.throwsOnDeclaredProps
        .map((entry) => `${entry.type}: ${entry.failures.map((failure) => bag(failure.props)).join(", ")}`)
        .join("\n")

const unprobeable = (audited: RegistryAudit): string =>
  audited.notProbeable.length === 0 ? "(none)" : audited.notProbeable.join("\n")

const unconfigured = (audited: RegistryAudit): string =>
  audited.notConfigured.length === 0
    ? "(none)"
    : audited.notConfigured
        .map(
          (entry) =>
            `${entry.type}: ${entry.reason}\nrequires ${entry.required.join(", ")}\nrefused ${entry.refused
              .map((refusal) => bag(refusal.props))
              .join(", ")}`
        )
        .join("\n")

const decorated = (audited: RegistryAudit): string =>
  audited.notDecorated.length === 0
    ? audited.audits.some((entry) => entry.verdict.outcome === "decorates")
      ? "decorates"
      : "(nothing said)"
    : audited.notDecorated.join("\n")

/** The configurations the probe used and the schema refused, as the audit carries them. */
const refused = (audited: RegistryAudit): string => {
  const bags = audited.audits.flatMap((entry) =>
    entry.refusedConfigurations.map((refusal) => `${entry.type}: ${bag(refusal.props)}`)
  )

  return bags.length === 0 ? "(none)" : bags.join("\n")
}

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
      line("throwsOnDeclaredProps", throwing(audited), "threw"),
      line("notProbeable", unprobeable(audited), "unprobeable"),
      line("refusedConfigurations", refused(audited), "refusedConfigurations"),
      line("notConfigured", unconfigured(audited), "unconfigured"),
      line("notDecorated", decorated(audited), "decorated")
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
          buildText(idFactory, "One primitive that reads a required prop, and the bag no tree could carry"),
        ],
      }),
      buildElement(idFactory, {
        type: "loom.prose",
        props: { size: "lead" },
        children: [
          buildText(
            idFactory,
            "The probe starts from the empty props bag. For a primitive that requires a prop, that is a configuration its own schema refuses — fine for the thirty-two in the starter library that hand their props to React, and a throw for the first one that reads one. What the audit used to do with that throw was call it a fault of the component, with a reproduction the validator would have rejected.",
          ),
        ],
      }),
      buildElement(idFactory, {
        type: "loom.grid",
        props: { columns: "three", gap: "loose" },
        children: [
          column(
            idFactory,
            "Handed nothing",
            "Every audit of such a primitive until somebody opts in. No fault is claimed now, and the audit says what the call was missing.",
            "nothing"
          ),
          column(
            idFactory,
            "Handed props it refuses",
            "Somebody opted in and handed a bag keyed under a prop the schema does not declare. Exactly as unjudged as the left column, and it says which of the two happened.",
            "refusedProps"
          ),
          column(
            idFactory,
            "Handed props it accepts",
            "The same registry, configured. The component is judged for the first time — it decorates — and every list is empty.",
            "acceptedProps"
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
  name: "unconfigured",
  title: "One primitive that reads a required prop, and the bag no tree could carry",
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
