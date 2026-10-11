import { z } from "zod"

import { createDataRegistry, defineSource } from "../data/adapter.js"
import { resolveTreeData } from "../data/resolve.js"
import { sequentialIdFactory } from "../ids.js"
import { DATA_PROP_KEY, THEME_PROP_KEY } from "../reserved-props.js"
import { describeRenderDiagnostic } from "../render/diagnostics.js"
import { renderLoomTree } from "../render/render.js"
import { ok } from "../result.js"
import { themeSelectionSchema, type ThemeSelection } from "../theme/theme.js"
import { buildElement, buildText } from "../tree/builders.js"
import { createTree } from "../tree/tree.js"

import { defineSpecimen } from "../../tools/specimen/specimen.js"

import {
  brokenUnshownDefinition,
  pageDefinition,
  registryOf,
  UNSHOWN_BREAKAGES,
  type UnshownBreakage,
} from "./definitions.js"

/**
 * The seven faults a lane could not produce, produced.
 *
 * **Nothing on this sheet is typed into this file.** Each card's second line is
 * `describeRenderDiagnostic` called on a diagnostic that came back from a real
 * `renderLoomTree` over a real tree, with a real source answering a real
 * binding — one render per card, the fixture registered the way a lane would
 * register it. The breakage name above it is the only word a caller writes.
 *
 * That is the whole claim of the change behind it. `unshown-unreadable` is the
 * one diagnostic in the union that neither a tree nor a deployment can cause
 * (0206), so before this the sentences below could only be transcribed from the
 * source that writes them. A page that transcribed them would be a page
 * asserting what the runtime says about itself.
 */

const SOURCE = "catalogue.entries"

const sources = () => {
  const registry = createDataRegistry([
    defineSource({
      id: SOURCE,
      description: "The entries this specimen offers",
      params: z.object({}).passthrough(),
      answers: z.array(z.string()),
      adapter: { fetch: () => Promise.resolve(ok(["A row that reads"])) },
    }),
  ])

  if (!registry.ok) throw new Error(`specimen source registry refused: ${registry.error.code}`)

  return registry.value
}

/**
 * One render per breakage, so each sentence below is the whole output of one
 * call rather than one line pulled out of seven.
 *
 * Top-level `await` rather than an async `build`, because a specimen's `build`
 * is a synchronous function of the theme (the harness photographs three trees
 * of one composition) and resolving a binding is not synchronous. The renders
 * happen once, when this module loads; `build` reads what they said.
 */
const sentenceFor = async (breakage: UnshownBreakage): Promise<string> => {
  const definition = brokenUnshownDefinition(breakage)
  const registry = registryOf([pageDefinition, definition])
  const idFactory = sequentialIdFactory()

  const tree = createTree(
    buildElement(idFactory, {
      type: "loom.page",
      props: { title: "One broken declaration" } as never,
      children: [
        buildElement(idFactory, {
          type: definition.type,
          props: { [DATA_PROP_KEY]: { entries: { source: SOURCE } } } as never,
          children: [buildText(idFactory, "")],
        }),
      ],
    }),
    idFactory
  )

  const data = await resolveTreeData(tree, { registry: sources() })
  const rendered = renderLoomTree(tree, { resolver: registry, validator: registry, data })

  if (rendered.diagnostics.length !== 1) {
    throw new Error(
      `specimen: ${breakage} produced ${rendered.diagnostics.length} diagnostics, not one`
    )
  }

  return describeRenderDiagnostic(rendered.diagnostics[0] as never)
}

const REPORTED: readonly (readonly [UnshownBreakage, string])[] = await Promise.all(
  UNSHOWN_BREAKAGES.map(async (breakage) => [breakage, await sentenceFor(breakage)] as const)
)

const card = (
  idFactory: ReturnType<typeof sequentialIdFactory>,
  breakage: string,
  sentence: string
) =>
  buildElement(idFactory, {
    type: "loom.card",
    props: { tone: "surface", padding: "loose" },
    children: [
      buildElement(idFactory, {
        type: "loom.heading",
        props: { level: 3 },
        children: [buildText(idFactory, breakage)],
      }),
      buildElement(idFactory, {
        type: "loom.prose",
        props: { tone: "muted", size: "small" },
        children: [buildText(idFactory, sentence)],
      }),
    ],
  })

const build = (theme: ThemeSelection) => {
  const idFactory = sequentialIdFactory()

  const section = buildElement(idFactory, {
    type: "loom.section",
    props: { eyebrow: "unshown-unreadable", width: "wide" },
    children: [
      buildElement(idFactory, {
        type: "loom.heading",
        props: { level: 1, balance: true },
        children: [
          buildText(idFactory, "Seven faults no tree can cause, each one produced"),
        ],
      }),
      buildElement(idFactory, {
        type: "loom.prose",
        props: { size: "lead" },
        children: [
          buildText(
            idFactory,
            "One registry and one render per card. The word above each sentence is what the caller asked brokenUnshownDefinition to break; the sentence is what renderLoomTree reported back. Nothing here is transcribed."
          ),
        ],
      }),
      buildElement(idFactory, {
        type: "loom.grid",
        props: { columns: "two", gap: "loose" },
        children: REPORTED.map(([breakage, sentence]) => card(idFactory, breakage, sentence)),
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
  name: "broken-declaration",
  title: "The declaration a tree cannot break",
  build,
  themes: [
    {
      label: "minimal",
      selection: themeSelectionSchema.parse({
        palette: "minimal",
        fontPack: "minimal-sans",
        stylePreset: "precise",
      }),
    },
  ],
})
