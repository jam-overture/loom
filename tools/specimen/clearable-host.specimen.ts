import { createElement, type CSSProperties, type ReactNode } from "react"
import { PGlite } from "@electric-sql/pglite"
import { drizzle } from "drizzle-orm/pglite"
import { z } from "zod"

import {
  applicationIdSchema,
  applicationSchema,
  type Application,
} from "../../src/application/application.js"
import type { ApplicationStore } from "../../src/application/store.js"
import { memoryApplicationStore } from "../../src/application/memory.js"
import { sequentialIdFactory } from "../../src/ids.js"
import { colour, family, monospace, size, space } from "../../src/primitives/tokens.js"
import { DEFAULT_PROJECT_ID } from "../../src/project/project.js"
import type { LoomPrimitiveProps } from "../../src/render/primitive.js"
import { THEME_PROP_KEY } from "../../src/reserved-props.js"
import { definePrimitive } from "../../src/sdk/definition.js"
import { ensureApplicationStoreSchema } from "../../src/store/migrate.js"
import { postgresApplicationStore } from "../../src/store/postgres-applications.js"
import { themeSelectionSchema, type ThemeSelection } from "../../src/theme/theme.js"
import { buildElement, buildText } from "../../src/tree/builders.js"
import { createTree } from "../../src/tree/tree.js"

import { defineSpecimen, WIDE } from "./specimen.js"

/**
 * What the four calls do to an application's host, in the two stores that have
 * to agree about it.
 *
 * **Nothing in either column is typed into this file.** Each row is a real
 * `rename` against a real store — a `Map` on the left, Postgres compiled to
 * WebAssembly on the right — and what it prints is read back out of the store
 * with `get` afterwards. A store that stopped clearing, or that started reading
 * an empty string as the absence, would change this image, which is the only
 * property that makes a screenshot worth putting in a report.
 *
 * The reading is the third row against the first. Before this branch those two
 * calls were the same call: both left the host alone, so the one that meant
 * *remove it* reported success and removed nothing. The fourth row is the claim
 * that `null` is the only spelling of nothing — an empty string is refused by
 * both stores rather than quietly taken as a clearing.
 */

const UNSET = "— no host at all —"

type Step = {
  /** The patch, as a caller writes it. */
  readonly asked: string
  /** What the store answered, and what the row says afterwards. */
  readonly became: string
  readonly refused: boolean
}

const hosted = (applicationId: string): Application =>
  applicationSchema.parse({
    applicationId: applicationIdSchema.parse(applicationId),
    projectId: DEFAULT_PROJECT_ID,
    name: "The bakery",
    createdAt: "2026-10-13T12:00:00.000Z",
    host: "old.example.com",
  })

/**
 * One state, on an application of its own.
 *
 * A fresh row per call rather than four calls down one row, so that every line
 * of the picture starts from the same host and the column reads as four answers
 * to one question instead of a history.
 */
const step = async (
  store: ApplicationStore,
  applicationId: string,
  asked: string,
  to: { readonly name?: string; readonly host?: string | null }
): Promise<Step> => {
  const application = hosted(applicationId)
  await store.create(application)

  const renamed = await store.rename(application.applicationId, to)
  const read = await store.get(application.applicationId)

  if (!renamed.ok) {
    return {
      asked,
      became: read.ok && read.value.host !== undefined ? read.value.host : UNSET,
      refused: true,
    }
  }

  return {
    asked,
    became: read.ok && read.value.host !== undefined ? read.value.host : UNSET,
    refused: false,
  }
}

const threeStatesAndTheRefusal = async (store: ApplicationStore): Promise<readonly Step[]> => [
  await step(store, "app_absent", "{ name: \"After\" }", { name: "After" }),
  await step(store, "app_given", "{ host: \"shop.example.com\" }", { host: "shop.example.com" }),
  await step(store, "app_cleared", "{ host: null }", { host: null }),
  await step(store, "app_empty", "{ host: \"\" }", { host: "" }),
]

const postgresStore = async (): Promise<ApplicationStore> => {
  const db = drizzle(new PGlite())
  await ensureApplicationStoreSchema(db)

  return postgresApplicationStore(db)
}

const MEASURED = {
  memory: await threeStatesAndTheRefusal(memoryApplicationStore()),
  postgres: await threeStatesAndTheRefusal(await postgresStore()),
} as const

const LABEL: CSSProperties = {
  display: "block",
  marginBottom: space(1),
  fontFamily: family("body"),
  fontSize: size(1),
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: colour("fg-subtle"),
}

const CALL: CSSProperties = {
  margin: 0,
  fontFamily: monospace(),
  fontSize: size(2),
  lineHeight: 1.7,
  color: colour("fg-subtle"),
}

const BECAME: CSSProperties = {
  margin: 0,
  fontFamily: monospace(),
  fontSize: size(2),
  lineHeight: 1.7,
  color: colour("fg-default"),
  fontWeight: 600,
}

const REFUSED: CSSProperties = { ...BECAME, fontWeight: 400, fontStyle: "italic" }

const row = (one: Step, key: string): ReactNode =>
  createElement(
    "div",
    { key, style: { marginBottom: space(3) } },
    createElement("span", { style: LABEL }, "rename"),
    createElement("p", { style: CALL }, one.asked),
    createElement("span", { style: LABEL }, one.refused ? "refused — the host is still" : "the host is now"),
    createElement("p", { style: one.refused ? REFUSED : BECAME }, one.became)
  )

const panelSchema = z.object({ store: z.enum(["memory", "postgres"]) })

type Which = z.infer<typeof panelSchema>["store"]

const panel = definePrimitive({
  type: "spec.clearable",
  description: "What four rename calls do to an application's host, in one of the two stores.",
  props: panelSchema,
  component: ({ props }: LoomPrimitiveProps<{ store: Which }>) =>
    createElement("div", null, ...MEASURED[props.store].map((one, at) => row(one, `row-${at}`))),
})

const column = (
  idFactory: ReturnType<typeof sequentialIdFactory>,
  heading: string,
  note: string,
  which: Which
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
      buildElement(idFactory, { type: "spec.clearable", props: { store: which } }),
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
        children: [buildText(idFactory, "Left alone, given, and taken away")],
      }),
      buildElement(idFactory, {
        type: "loom.prose",
        props: { size: "lead" },
        children: [
          buildText(
            idFactory,
            "Every host below is read back out of the store after a real rename, not written here. Each application starts with old.example.com. A patch that leaves the host out leaves it alone; one that gives a value sets it; one that says null removes it, which is the call that had nowhere to go before this branch. An empty string is refused by both stores, because one spelling of nothing per field is the whole point of the third state.",
          ),
        ],
      }),
      buildElement(idFactory, {
        type: "loom.grid",
        props: { columns: "two", gap: "loose" },
        children: [
          column(
            idFactory,
            "In a Map",
            "memoryApplicationStore, which calls itself the reference implementation.",
            "memory"
          ),
          column(
            idFactory,
            "In Postgres",
            "postgresApplicationStore, against Postgres compiled to WebAssembly. A cleared host is a NULL column here and a missing key there, and both read back as the same absence.",
            "postgres"
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
  name: "clearable-host",
  title: "Left alone, given, and taken away",
  build,
  primitives: [panel],
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
