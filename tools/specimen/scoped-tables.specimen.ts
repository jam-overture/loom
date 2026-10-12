import { createElement, type CSSProperties, type ReactNode } from "react"
import { getTableConfig, type PgTable } from "drizzle-orm/pg-core"
import { z } from "zod"

import { sequentialIdFactory } from "../../src/ids.js"
import { colour, family, monospace, size, space } from "../../src/primitives/tokens.js"
import type { LoomPrimitiveProps } from "../../src/render/primitive.js"
import { THEME_PROP_KEY } from "../../src/reserved-props.js"
import { definePrimitive } from "../../src/sdk/definition.js"
import {
  loomReaderFunnels,
  loomReaderPageViews,
  loomReaderRegions,
  loomReaderSignals,
  loomReaderTallies,
} from "../../src/signals/schema.js"
import {
  loomHolds,
  loomPolicyRevisions,
  loomRevisions,
  loomTrees,
} from "../../src/store/schema.js"
import { loomTelemetry } from "../../src/telemetry/schema.js"
import { themeSelectionSchema, type ThemeSelection } from "../../src/theme/theme.js"
import { buildElement, buildText } from "../../src/tree/builders.js"
import { createTree } from "../../src/tree/tree.js"

import { defineSpecimen, WIDE } from "./specimen.js"

/**
 * The ten tables Loom stores under an application, and the key each is read by.
 *
 * **Nothing in either column is typed into this file.** Every key and every
 * index is read off the Drizzle table at render time with `getTableConfig`, so
 * the picture is the schema rather than a drawing of it — a column that stopped
 * leading with the application would change this image, which is the only
 * property that makes a screenshot worth putting in a report.
 *
 * The left column is the claim [0270](../../decisions/0270-the-reader-tables-take-the-application-now-and-the-audience-when-it-is-ratified.md)
 * makes: all ten, one pattern. The right column is the two that do not follow
 * it and why — a picture that hid the exception would be the kind of evidence
 * that is worse than none, and looking for the second of them is what turned up
 * the unscoped delete in `telemetry/postgres.ts`.
 */

const APPLICATION = "application_id"

type Described = {
  readonly table: string
  /** The key the database enforces, in order. Empty when a single column carries it. */
  readonly key: readonly string[]
  /** The columns of each index, in order. */
  readonly indexes: readonly (readonly string[])[]
  /** A single-column primary key, which is how the buffer carries `seq`. */
  readonly surrogate: readonly string[]
}

const describe = (table: PgTable): Described => {
  const config = getTableConfig(table)

  return {
    table: config.name,
    key: config.primaryKeys.flatMap((composite) => composite.columns.map((column) => column.name)),
    indexes: config.indexes.map((index) =>
      index.config.columns.map((column) => (column as { name?: string }).name ?? "(expression)")
    ),
    surrogate: config.columns.filter((column) => column.primary).map((column) => column.name),
  }
}

/** In the order a deployment meets them: the store, then the log, then the readers. */
const SCOPED: readonly PgTable[] = [
  loomTrees,
  loomRevisions,
  loomHolds,
  loomPolicyRevisions,
  loomTelemetry,
  loomReaderSignals,
  loomReaderTallies,
  loomReaderFunnels,
  loomReaderRegions,
  loomReaderPageViews,
]

/** The five this branch moved, so the picture says which half of the ten is new. */
const MOVED: ReadonlySet<string> = new Set([
  "loom_reader_signals",
  "loom_reader_tallies",
  "loom_reader_funnels",
  "loom_reader_regions",
  "loom_reader_page_views",
])

const LABEL: CSSProperties = {
  display: "block",
  marginBottom: space(1),
  fontFamily: family("body"),
  fontSize: size(1),
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: colour("fg-subtle"),
}

const LISTING: CSSProperties = {
  margin: 0,
  fontFamily: monospace(),
  fontSize: size(2),
  lineHeight: 1.7,
  color: colour("fg-default"),
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
}

const LED: CSSProperties = { ...LISTING, color: colour("fg-default"), fontWeight: 600 }

const UNLED: CSSProperties = { ...LISTING, color: colour("fg-subtle") }

/**
 * One row: the table, and the key it is read by with the application marked
 * where it leads.
 *
 * The two styles are the whole of the reading. A key that starts with
 * `application_id` is one no query can span by omission; a key that does not is
 * one where that has to be true some other way, and the right column is the
 * only such case.
 */
const row = (described: Described, key: string): ReactNode => {
  const columns = described.key.length > 0 ? described.key : described.surrogate
  const led = columns[0] === APPLICATION

  return createElement(
    "div",
    { key, style: { marginBottom: space(3) } },
    createElement(
      "span",
      { style: LABEL },
      `${described.table}${MOVED.has(described.table) ? " — this branch" : ""}`
    ),
    createElement("p", { style: led ? LED : UNLED }, columns.join(", "))
  )
}

const panelSchema = z.object({ column: z.enum(["keys", "exception"]) })

type Column = z.infer<typeof panelSchema>["column"]

const panel = definePrimitive({
  type: "spec.scoped",
  description:
    "The key every scoped table is read by, or the two whose key is a sequence rather than the application.",
  props: panelSchema,
  component: ({ props }: LoomPrimitiveProps<{ column: Column }>) => {
    const described = SCOPED.map(describe)

    if (props.column === "keys") {
      return createElement(
        "div",
        null,
        ...described.map((one, at) => row(one, `row-${at}`))
      )
    }

    /** The journals, which are the tables a composite key would say nothing extra about. */
    const sequenced = described.filter((one) => one.key.length === 0)
    const led = described.filter((one) => one.key[0] === APPLICATION)

    return createElement(
      "div",
      null,
      ...sequenced.flatMap((journal, at) => [
        createElement(
          "div",
          { key: `key-${at}`, style: { marginBottom: space(1) } },
          createElement("span", { style: LABEL }, `${journal.table} — its key`),
          createElement("p", { style: UNLED }, journal.surrogate.join(", "))
        ),
        createElement(
          "div",
          { key: `index-${at}`, style: { marginBottom: space(3) } },
          createElement("span", { style: LABEL }, "and its index, which is what the reads use"),
          createElement(
            "p",
            { style: LED },
            journal.indexes.map((columns) => columns.join(", ")).join("\n")
          )
        ),
      ]),
      createElement(
        "div",
        null,
        createElement("span", { style: LABEL }, "keys led by the application"),
        createElement("p", { style: LISTING }, `${led.length} of ${described.length}`)
      )
    )
  },
})

const column = (
  idFactory: ReturnType<typeof sequentialIdFactory>,
  heading: string,
  note: string,
  which: Column
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
      buildElement(idFactory, { type: "spec.scoped", props: { column: which } }),
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
          buildText(idFactory, "Ten tables, one application, and the two keys that are sequences"),
        ],
      }),
      buildElement(idFactory, {
        type: "loom.prose",
        props: { size: "lead" },
        children: [
          buildText(
            idFactory,
            "Every key below is read off the Drizzle table at render time, not written here. Eight of the ten lead with application_id, so a query cannot span two applications by forgetting to filter. The other two are the append-only journals, keyed by a database-wide sequence: they are scoped by their index and by every statement that touches them, including the delete retention runs — which is where this branch found one that was not.",
          ),
        ],
      }),
      buildElement(idFactory, {
        type: "loom.grid",
        props: { columns: "two", gap: "loose" },
        children: [
          column(
            idFactory,
            "The key each table is read by",
            "In the order a deployment meets them. The five marked are the ones this branch moved.",
            "keys"
          ),
          column(
            idFactory,
            "The exceptions, stated rather than hidden",
            "The two journals. Their keys stay seq, because seq is already unique across every application the database holds — so the filter has to be in each statement instead.",
            "exception"
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
  name: "scoped-tables",
  title: "Ten tables, one application, and the two keys that are sequences",
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
