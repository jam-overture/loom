import { z } from "zod"

import { createDataRegistry, defineSource, describeDataUnavailable } from "./data/adapter.js"
import { resolveTreeData } from "./data/resolve.js"
import { sequentialIdFactory, type IdFactory } from "./ids.js"
import type { JsonObject } from "./json.js"
import { describeRenderDiagnostic } from "./render/diagnostics.js"
import { DATA_PROP_KEY, SUBMIT_PROP_KEY, THEME_PROP_KEY } from "./reserved-props.js"
import { createEndpointRegistry, defineEndpoint, describeSubmissionUnavailable } from "./submit/endpoint.js"
import { resolveTreeSubmissions } from "./submit/resolve.js"
import { STARTER_PALETTES } from "./theme/library.js"
import { createThemeRegistry } from "./theme/registry.js"
import { themeSelectionSchema, type ThemeSelection } from "./theme/theme.js"
import { buildElement, buildSlot, buildText } from "./tree/builders.js"
import type { ElementNode } from "./tree/node.js"
import { createTree } from "./tree/tree.js"

import { defineSpecimen, WIDE } from "../tools/specimen/specimen.js"

/**
 * Three refusals, each photographed with the clause it ends on and what that
 * clause costs.
 *
 * There is no pixel in this change and no primitive. What it changes is the one
 * sentence three seams write when a tree names an id nothing registered — a
 * palette, a data source, a form's destination — each of which answered by
 * printing the whole registry, whose length is the host's to set rather than
 * the runtime's.
 *
 * So the subject is the sentence, and the only honest way to photograph it is
 * to produce it. **Nothing in the three blocks below is typed into this file.**
 * Each is built by resolving a real selection against a real registry and
 * handing the refusal to the describer the diagnostics use, and the character
 * count under each one is that string's own `length`.
 *
 * Which is also what makes the pair work. Run this sheet with
 * `--against origin/main` and the harness points it at the older library: the
 * blocks fill with the unbounded sentences, the counts recompute, and the two
 * pictures differ in the only thing this change touches. The three figures in
 * the opening band are the same three strings measured, so they move with them.
 */

const PALETTES = STARTER_PALETTES.map((palette) => palette.id)

/**
 * A registry per seam, built the way a deployment builds one, because the point
 * being argued is about the size of a host's registry and a stub of two entries
 * cannot make it. Ten sources and nine endpoints is a small real deployment;
 * twenty-one palettes is this repository's own starter library.
 */
const SOURCE_IDS = [
  "catalogue.services",
  "catalogue.products",
  "crm.contacts",
  "crm.accounts",
  "billing.invoices",
  "analytics.pageviews",
  "analytics.sessions",
  "cms.posts",
  "inventory.stock",
  "support.tickets",
] as const

const ENDPOINT_IDS = [
  "contact.enquiry",
  "contact.callback",
  "newsletter.subscribe",
  "booking.request",
  "quote.request",
  "support.ticket",
  "careers.application",
  "feedback.survey",
  "trial.signup",
] as const

const dataRegistry = createDataRegistry(
  SOURCE_IDS.map((id) =>
    defineSource({
      id,
      description: `answers ${id}`,
      params: z.object({}),
      answers: z.array(z.string()),
      adapter: { fetch: () => Promise.resolve({ ok: true as const, value: [] }) },
    })
  )
)
if (!dataRegistry.ok) throw new Error(`specimen data registry refused: ${dataRegistry.error.code}`)

const endpointRegistry = createEndpointRegistry(
  ENDPOINT_IDS.map((id) =>
    defineEndpoint({
      id,
      description: `receives ${id}`,
      endpoint: {
        target: () =>
          Promise.resolve({
            ok: true as const,
            value: { action: `/api/${id}`, method: "post" as const, fields: [] },
          }),
      },
    })
  )
)
if (!endpointRegistry.ok) {
  throw new Error(`specimen endpoint registry refused: ${endpointRegistry.error.code}`)
}

/** The unresolved-theme sentence, from the registry's own refusal. */
const themeSentence = (): string => {
  const registry = createThemeRegistry()
  const resolved = registry.resolve(
    themeSelectionSchema.parse({
      palette: "sunset",
      fontPack: "editorial-serif",
      stylePreset: "comfortable",
    })
  )

  if (resolved.ok) throw new Error("the specimen's palette resolved, so there is no refusal to show")

  return describeRenderDiagnostic({
    code: "theme-unresolved",
    nodeId: sequentialIdFactory().nodeId(),
    error: resolved.error,
  })
}

/** The unanswered-binding sentence, from a real resolution of a real tree. */
const dataSentence = async (): Promise<string> => {
  const ids = sequentialIdFactory()
  const tree = createTree(
    buildElement(ids, {
      type: "loom.page",
      props: { [DATA_PROP_KEY]: { rows: { source: "catalog.services" } } } as never,
    }),
    ids
  )

  const resolution = await resolveTreeData(tree, { registry: dataRegistry.value })
  const outcome = resolution.lookup(tree.root.id)["rows"]

  if (outcome?.status !== "unavailable") throw new Error("the specimen's binding was answered")

  return describeDataUnavailable(outcome.unavailable)
}

/** The unreachable-destination sentence, from a real resolution of a real tree. */
const submitSentence = async (): Promise<string> => {
  const ids = sequentialIdFactory()
  const tree = createTree(
    buildElement(ids, {
      type: "loom.form",
      props: { [SUBMIT_PROP_KEY]: { to: "contact.enquiries" } } as never,
    }),
    ids
  )

  const resolution = await resolveTreeSubmissions(tree, { registry: endpointRegistry.value })
  const outcome = resolution.lookup(tree.root.id)

  if (outcome?.status !== "unavailable") throw new Error("the specimen's endpoint resolved")

  return describeSubmissionUnavailable(outcome.unavailable)
}

type Refusal = {
  readonly seam: string
  readonly asked: string
  readonly registered: number
  readonly sentence: string
}

const REFUSALS: readonly Refusal[] = [
  {
    seam: "theme · describeThemeError",
    asked: '"sunset", against the starter palettes',
    registered: PALETTES.length,
    sentence: themeSentence(),
  },
  {
    seam: "data · describeDataUnavailable",
    asked: '"catalog.services", one letter short of a registered id',
    registered: SOURCE_IDS.length,
    sentence: await dataSentence(),
  },
  {
    seam: "submit · describeSubmissionUnavailable",
    asked: '"contact.enquiries", one letter long',
    registered: ENDPOINT_IDS.length,
    sentence: await submitSentence(),
  },
]

const LONGEST = Math.max(...REFUSALS.map((refusal) => refusal.sentence.length))
const TOTAL = REFUSALS.reduce((count, refusal) => count + refusal.sentence.length, 0)

const text = (ids: IdFactory, value: string) => buildText(ids, value)

const heading = (ids: IdFactory, value: string, level: number): ElementNode =>
  buildElement(ids, { type: "loom.heading", props: { level }, children: [text(ids, value)] })

const prose = (ids: IdFactory, value: string, extra: JsonObject = {}): ElementNode =>
  buildElement(ids, { type: "loom.prose", props: extra, children: [text(ids, value)] })

const stat = (ids: IdFactory, value: string, label: string, caption: string): ElementNode =>
  buildElement(ids, { type: "loom.stat", props: { value, label, caption } })

const opening = (ids: IdFactory): ElementNode =>
  buildElement(ids, {
    type: "loom.section",
    props: { tone: "surface", width: "wide", eyebrow: "What a refusal says you could have written" },
    children: [
      buildSlot(ids, "heading", [
        heading(ids, "Three seams list a registry, and none of them sets its length", 1),
      ]),
      prose(
        ids,
        "A palette, a data source and a form's destination are each refused by name, and each refusal offers the ids that were registered so a reader can see what they should have typed. The instinct is right; the whole list is the wrong shape for it, because how many a deployment registers is the deployment's business. Every figure and every sentence on this sheet is produced while the page is built.",
        { size: "lead", measured: true }
      ),
      buildElement(ids, {
        type: "loom.stat-grid",
        props: { columns: "three", align: "start" },
        children: [
          stat(ids, `${LONGEST}`, "Longest of the three", "characters, as measured below"),
          stat(ids, `${TOTAL}`, "The three together", "characters"),
          stat(
            ids,
            `${PALETTES.length + SOURCE_IDS.length + ENDPOINT_IDS.length}`,
            "Ids registered across the three",
            "and the sentences do not grow with them"
          ),
        ],
      }),
    ],
  })

const panel = (ids: IdFactory, refusal: Refusal): ElementNode =>
  buildElement(ids, {
    type: "loom.section",
    props: { tone: "canvas", width: "wide", eyebrow: refusal.seam },
    children: [
      buildSlot(ids, "heading", [
        heading(ids, `${refusal.sentence.length} characters, ${refusal.registered} registered`, 3),
      ]),
      prose(ids, `Asked for ${refusal.asked}.`, { tone: "muted", size: "small" }),
      buildElement(ids, {
        type: "loom.code",
        props: { language: "the sentence, as returned", tone: "source", density: "compact", wrap: true },
        children: [text(ids, refusal.sentence)],
      }),
    ],
  })

const closing = (ids: IdFactory): ElementNode =>
  buildElement(ids, {
    type: "loom.callout",
    props: { tone: "neutral", title: "What the cap does not take away" },
    children: [
      text(
        ids,
        "Each refusal still carries every id it knows, and each registry still publishes its whole catalogue, so a panel that wants all of them reads them rather than parsing a sentence. The count in brackets is what keeps the clause honest: five names and nothing else would read as the first five somebody registered, and a reader who believed that would go looking in the wrong place."
      ),
    ],
  })

export default defineSpecimen({
  name: "registered-the-list-nobody-could-read",
  title: "Three refusals and the registry each one used to print whole",
  build: (theme: ThemeSelection) => {
    const ids = sequentialIdFactory()

    return createTree(
      buildElement(ids, {
        type: "loom.page",
        props: { [THEME_PROP_KEY]: theme } as never,
        children: [
          opening(ids),
          ...REFUSALS.map((refusal) => panel(ids, refusal)),
          closing(ids),
        ],
      }),
      ids
    )
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
})
