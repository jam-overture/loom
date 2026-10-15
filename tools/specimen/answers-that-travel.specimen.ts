import { createElement, type CSSProperties, type ReactNode } from "react"
import { z } from "zod"

import { createDataRegistry, defineSource, describeDataUnavailable } from "../../src/data/adapter.js"
import { describeBindingError } from "../../src/data/binding.js"
import { planTreeData } from "../../src/data/plan.js"
import { resolveTreeData } from "../../src/data/resolve.js"
import {
  buildDataResolution,
  type DataAnswers,
  type DataOutcome,
  type DataResolution,
} from "../../src/data/resolution.js"
import { sequentialIdFactory, type NodeId } from "../../src/ids.js"
import { colour, family, monospace, size, space } from "../../src/primitives/tokens.js"
import type { LoomPrimitiveProps } from "../../src/render/primitive.js"
import { DATA_PROP_KEY, THEME_PROP_KEY } from "../../src/reserved-props.js"
import { ok } from "../../src/result.js"
import { definePrimitive } from "../../src/sdk/definition.js"
import { hangingSource } from "../../src/testing/doubles.js"
import { themeSelectionSchema, type ThemeSelection } from "../../src/theme/theme.js"
import { buildElement, buildText } from "../../src/tree/builders.js"
import { createTree } from "../../src/tree/tree.js"

import { defineSpecimen, WIDE } from "./specimen.js"

/**
 * One resolution, read on both sides of a boundary it could not cross before.
 *
 * **Nothing in either column is typed into this file.** The left column is a
 * real `resolveTreeData` over a real tree, with one source that answers and one
 * that never does; the right column is that resolution's `answers` put through
 * `JSON.stringify` and `JSON.parse` — which is what a boundary does to them —
 * and rebuilt with `buildDataResolution(planTreeData(tree), new Map(answers))`.
 * Every line is read back out through `lookup` and `problemsFor`, and the words
 * are `describeDataUnavailable` and `describeBindingError` rather than prose.
 *
 * **The reading is that the columns are the same, and the third row is why that
 * is worth a picture.** A node whose declaration could not be read at all is in
 * `plan.problems` and never in `plan.bindings`, so the obvious way to carry a
 * resolution by hand — derive the nodes from the bindings — drops exactly that
 * row, and the symptom is a page rendering without a diagnostic it earned. The
 * answers travel by request rather than by node, so there is no node list to
 * get wrong (0281).
 *
 * The footer is the payload itself: its size, and the keys with their NUL byte
 * shown. A seam that lost the byte would still produce two matching columns of
 * `not-resolved`, so the keys are printed next to the readings and not instead
 * of them.
 */

const SOURCE = "profile.field"
const NEVER = "catalogue.slow"

/** Five milliseconds, so the sheet is quick and the second row is a real refusal. */
const CEILING_MS = 5

const sources = () => {
  const registry = createDataRegistry([
    defineSource({
      id: SOURCE,
      description: "Answers with a name",
      params: z.object({ of: z.string() }).partial(),
      answers: z.string(),
      adapter: { fetch: () => Promise.resolve(ok("Ada")) },
    }),
    hangingSource(NEVER, "never answers").entry,
  ])

  if (!registry.ok) throw new Error(`specimen source registry refused: ${registry.error.code}`)

  return registry.value
}

const idFactory = sequentialIdFactory()

const answeredNode = buildElement(idFactory, {
  type: "loom.card",
  props: { [DATA_PROP_KEY]: { bio: { source: SOURCE, params: { of: "ada" } } } } as never,
})

const unansweredNode = buildElement(idFactory, {
  type: "loom.card",
  props: { [DATA_PROP_KEY]: { feed: { source: NEVER } } } as never,
})

/** A declaration that is not a map of bindings at all, which parses to nothing. */
const misdeclaredNode = buildElement(idFactory, {
  type: "loom.card",
  props: { [DATA_PROP_KEY]: "feed" } as never,
})

const measured = createTree(
  buildElement(idFactory, {
    type: "loom.page",
    props: { title: "Three nodes" } as never,
    children: [answeredNode, unansweredNode, misdeclaredNode],
  }),
  idFactory
)

const here = await resolveTreeData(measured, { registry: sources(), ceilingMs: CEILING_MS })

/** The boundary, done to the answers exactly as a host's would do it. */
const PAYLOAD = JSON.stringify(here.answers)

const there = buildDataResolution(
  planTreeData(measured),
  new Map(JSON.parse(PAYLOAD) as DataAnswers)
)

const readingOf = (resolution: DataResolution, nodeId: NodeId): string => {
  const bag = resolution.lookup(nodeId)
  const names = Object.keys(bag)

  if (names.length === 0) return "— no answers —"

  return names
    .map((name) => {
      const outcome = bag[name] as DataOutcome

      return outcome.status === "ready"
        ? `${name} = ${JSON.stringify(outcome.value)}`
        : `${name}: ${describeDataUnavailable(outcome.unavailable)}`
    })
    .join("  ·  ")
}

const problemOf = (resolution: DataResolution, nodeId: NodeId): string => {
  const problems = resolution.problemsFor(nodeId)

  if (problems.length === 0) return "— nothing to report —"

  return problems
    .map((problem) =>
      problem.kind === "misdeclared"
        ? `misdeclared: ${describeBindingError(problem.error)}`
        : `${problem.name} unavailable: ${describeDataUnavailable(problem.unavailable)}`
    )
    .join("  ·  ")
}

const plan = planTreeData(measured)

type Row = {
  readonly label: string
  readonly reading: string
  readonly problem: string
}

const rowsFrom = (resolution: DataResolution): readonly Row[] => [
  {
    label: "the binding that was answered",
    reading: readingOf(resolution, answeredNode.id),
    problem: problemOf(resolution, answeredNode.id),
  },
  {
    label: "the binding nothing answered",
    reading: readingOf(resolution, unansweredNode.id),
    problem: problemOf(resolution, unansweredNode.id),
  },
  {
    label: `the declaration that could not be read — plan.bindings names it: ${
      plan.bindings.some((binding) => binding.nodeId === misdeclaredNode.id) ? "yes" : "no"
    }`,
    reading: readingOf(resolution, misdeclaredNode.id),
    problem: problemOf(resolution, misdeclaredNode.id),
  },
]

const MEASURED = {
  here: rowsFrom(here),
  there: rowsFrom(there),
} as const

const FOOTER = [
  `${here.answers.length} answers · ${PAYLOAD.length} characters of JSON`,
  ...here.answers.map(([key]) => key.replace("\u0000", "\\0")),
].join("\n")

const LABEL: CSSProperties = {
  display: "block",
  marginBottom: space(1),
  fontFamily: family("body"),
  fontSize: size(1),
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: colour("fg-subtle"),
}

const READING: CSSProperties = {
  margin: 0,
  fontFamily: monospace(),
  fontSize: size(2),
  lineHeight: 1.7,
  color: colour("fg-default"),
  fontWeight: 600,
}

const PROBLEM: CSSProperties = {
  margin: 0,
  marginTop: space(1),
  fontFamily: monospace(),
  fontSize: size(2),
  lineHeight: 1.7,
  color: colour("fg-subtle"),
}

const row = (one: Row, key: string): ReactNode =>
  createElement(
    "div",
    { key, style: { marginBottom: space(3) } },
    createElement("span", { style: LABEL }, one.label),
    createElement("p", { style: READING }, one.reading),
    createElement("p", { style: PROBLEM }, one.problem)
  )

const panelSchema = z.object({ side: z.enum(["here", "there"]) })

type Side = z.infer<typeof panelSchema>["side"]

const panel = definePrimitive({
  type: "spec.answers",
  description: "What one resolution reads back as, on one side of a boundary.",
  props: panelSchema,
  component: ({ props }: LoomPrimitiveProps<{ side: Side }>) =>
    createElement("div", null, ...MEASURED[props.side].map((one, at) => row(one, `row-${at}`))),
})

const keys = definePrimitive({
  type: "spec.payload",
  description: "The answers as they travelled: how many, how big, under which keys.",
  props: z.object({}),
  component: () =>
    createElement("p", { style: { ...PROBLEM, whiteSpace: "pre-line", marginTop: 0 } }, FOOTER),
})

const column = (
  factory: ReturnType<typeof sequentialIdFactory>,
  heading: string,
  note: string,
  side: Side
) =>
  buildElement(factory, {
    type: "loom.card",
    props: { tone: "surface", padding: "loose" },
    children: [
      buildElement(factory, {
        type: "loom.heading",
        props: { level: 3 },
        children: [buildText(factory, heading)],
      }),
      buildElement(factory, {
        type: "loom.prose",
        props: { tone: "muted", size: "small" },
        children: [buildText(factory, note)],
      }),
      buildElement(factory, { type: "spec.answers", props: { side } }),
    ],
  })

const build = (theme: ThemeSelection) => {
  const factory = sequentialIdFactory()

  const section = buildElement(factory, {
    type: "loom.section",
    props: { eyebrow: "Specimen", width: "wide" },
    children: [
      buildElement(factory, {
        type: "loom.heading",
        props: { level: 1, balance: true },
        children: [buildText(factory, "The same three readings, on the far side of a letterbox")],
      }),
      buildElement(factory, {
        type: "loom.prose",
        props: { size: "lead" },
        children: [
          buildText(
            factory,
            "One tree, resolved once. The left column is what the resolution answered where the fetching happened. The right column is its answers put through JSON and rebuilt from the tree alone, which is all a browser has. Nothing is transcribed: every line is read back out through lookup and problemsFor, in the seam's own words.",
          ),
        ],
      }),
      buildElement(factory, {
        type: "loom.grid",
        props: { columns: "two", gap: "loose" },
        children: [
          column(
            factory,
            "Here, where the asking happened",
            "resolveTreeData, with one source that answers and one that never does, on a five-millisecond ceiling.",
            "here"
          ),
          column(
            factory,
            "There, with only the tree and the answers",
            "buildDataResolution(planTreeData(tree), new Map(answers)). No node list crossed: the keys are re-derived by the code that minted them.",
            "there"
          ),
        ],
      }),
      buildElement(factory, {
        type: "loom.card",
        props: { tone: "surface", padding: "loose" },
        children: [
          buildElement(factory, {
            type: "loom.heading",
            props: { level: 3 },
            children: [buildText(factory, "What actually went through")],
          }),
          buildElement(factory, { type: "spec.payload", props: {} }),
        ],
      }),
    ],
  })

  return createTree(
    buildElement(factory, {
      type: "loom.page",
      props: { [THEME_PROP_KEY]: theme, width: "wide" },
      children: [section],
    }),
    factory
  )
}

export default defineSpecimen({
  name: "answers-that-travel",
  title: "The same three readings, on the far side of a letterbox",
  build,
  primitives: [panel, keys],
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
