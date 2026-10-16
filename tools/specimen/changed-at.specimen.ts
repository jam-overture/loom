import { createElement, type CSSProperties, type ReactNode } from "react"
import { z } from "zod"
import { PGlite } from "@electric-sql/pglite"
import { drizzle } from "drizzle-orm/pglite"

import { sequentialIdFactory } from "../../src/ids.js"
import { colour, family, monospace, size, space } from "../../src/primitives/tokens.js"
import type { LoomPrimitiveProps } from "../../src/render/primitive.js"
import { THEME_PROP_KEY } from "../../src/reserved-props.js"
import { definePrimitive } from "../../src/sdk/definition.js"
import { memoryTreeStore } from "../../src/store/memory.js"
import { ensureTreeStoreSchema } from "../../src/store/migrate.js"
import { postgresTreeStore } from "../../src/store/postgres.js"
import type { TreeListing, TreeStore } from "../../src/store/store.js"
import { buildElement, buildText } from "../../src/tree/builders.js"
import { createTree } from "../../src/tree/tree.js"
import { themeSelectionSchema, type ThemeSelection } from "../../src/theme/theme.js"

import { defineSpecimen, WIDE } from "./specimen.js"

/**
 * When each page last changed, read back out of two stores that share no code.
 *
 * **Nothing in either column is typed into this file.** Every stamp below is
 * what `list()` returned after a real `append`, in a `Map` on the left and in
 * Postgres compiled to WebAssembly on the right. The rows are built from the
 * listing's own keys, so a store that started filling `changedAt` from a
 * creation time, or stopped omitting it on an untouched page, would change this
 * image — which is the only property that makes a screenshot worth putting in a
 * report.
 *
 * The reading is the first row against the other three: `never touched` is the
 * one page with no stamp, and it is the one page still at revision 0. The two
 * stamps that are present are the ones the appends were given, not the time the
 * picture was taken, and the third row's is the *second* of its two appends.
 */

const idsFor = (namespace: string) => sequentialIdFactory(namespace)

const treeOf = (namespace: string) => {
  const ids = idsFor(namespace)
  const headline = buildText(ids, "A page")

  return {
    ids,
    tree: createTree(buildElement(ids, { type: "loom.page", children: [headline] }), ids),
    headline: headline.id,
  }
}

const appendAt = async (
  store: TreeStore,
  namespace: string,
  stamps: readonly string[]
): Promise<void> => {
  const { tree, ids, headline } = treeOf(namespace)
  const created = await store.create(tree)
  if (!created.ok) throw new Error(created.error.code)

  for (const [index, appliedAt] of stamps.entries()) {
    const appended = await store.append(tree.treeId, {
      proposalId: ids.proposalId(),
      delta: {
        deltaId: ids.deltaId(),
        treeId: tree.treeId,
        baseRevision: index,
        operations: [
          { op: "configure", nodeId: headline, set: { value: `Edit ${index + 1}` }, unset: [] },
        ],
      },
      provenance: {
        origin: "user-instruction",
        interpreter: "scripted",
        authoredBy: "model",
        confidence: 0.9,
        interpretedAt: appliedAt,
      },
      appliedAt,
    })
    if (!appended.ok) throw new Error(appended.error.code)
  }
}

/**
 * One page never touched, one changed once, one changed twice.
 *
 * The namespaces are chosen so the listing's own `treeId` ordering puts them in
 * that order, because 0020's ordering is the one still in force and this picture
 * must not imply otherwise.
 */
const STAGE: readonly (readonly [string, readonly string[]])[] = [
  ["a", []],
  ["b", ["2026-03-02T11:12:13.000Z"]],
  ["c", ["2026-04-01T09:00:00.000Z", "2026-09-09T07:00:00.000Z"]],
]

const listingsFrom = async (store: TreeStore): Promise<readonly TreeListing[]> => {
  for (const [namespace, stamps] of STAGE) await appendAt(store, namespace, stamps)

  const page = await store.list()
  if (!page.ok) throw new Error(page.error.code)

  return page.value.trees
}

const postgresStore = async (): Promise<TreeStore> => {
  const db = drizzle(new PGlite())
  await ensureTreeStoreSchema(db)

  return postgresTreeStore(db)
}

const IN_MEMORY = await listingsFrom(memoryTreeStore())
const IN_POSTGRES = await listingsFrom(await postgresStore())

const HEADING: CSSProperties = {
  display: "block",
  marginBottom: space(3),
  fontFamily: family("body"),
  fontSize: size(1),
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: colour("fg-subtle"),
}

const ROW: CSSProperties = {
  display: "flex",
  gap: space(3),
  padding: `${space(2)} 0`,
  borderTop: `1px solid ${colour("border-subtle")}`,
  fontFamily: monospace(),
  fontSize: size(2),
  color: colour("fg-default"),
}

const ABSENT: CSSProperties = { color: colour("fg-subtle"), fontStyle: "italic" }

const panelSchema = z.object({ store: z.enum(["memory", "postgres"]) })

type Which = z.infer<typeof panelSchema>["store"]

const LISTED: Readonly<Record<Which, readonly TreeListing[]>> = {
  memory: IN_MEMORY,
  postgres: IN_POSTGRES,
}

/**
 * The stamp, or the absence, taken from the key rather than from a value.
 *
 * `"changedAt" in listing` and not `listing.changedAt === undefined`, because
 * the contract's promise is about the key: a store that set it to `undefined`
 * would read the same the second way, and that is the thing 0277 forbids.
 */
const stampOf = (listing: TreeListing): ReactNode =>
  "changedAt" in listing
    ? createElement("span", null, listing.changedAt)
    : createElement("span", { style: ABSENT }, "no stamp")

const panel = definePrimitive({
  type: "spec.changed-at",
  description:
    "Every tree one store listed, with the revision it is at and the stamp the listing carried.",
  props: panelSchema,
  component: ({ props }: LoomPrimitiveProps<{ store: Which }>) =>
    createElement(
      "div",
      null,
      createElement("span", { style: HEADING }, "tree · revision · changedAt"),
      ...LISTED[props.store].map((listing) =>
        createElement(
          "div",
          { key: listing.treeId, style: ROW },
          createElement("span", { style: { flex: "0 0 5.5em" } }, listing.treeId),
          createElement("span", { style: { flex: "0 0 3em" } }, `r${listing.revision}`),
          createElement("span", { style: { flex: "1 1 0" } }, stampOf(listing))
        )
      )
    ),
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
      buildElement(idFactory, { type: "spec.changed-at", props: { store: which } }),
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
        children: [buildText(idFactory, "When each page last changed, out of both stores")],
      }),
      buildElement(idFactory, {
        type: "loom.prose",
        props: { size: "lead" },
        children: [
          buildText(
            idFactory,
            "Every stamp below is what list() returned after a real append — nothing here is typed into the file. The reading is the first row against the other two: the page nobody has touched is the one page with no stamp, and it is the one page still at revision 0. The third row carries the second of its two appends, not the first.",
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
            "The reference implementation. changedAt is the newest log entry's appliedAt, read off the log rather than stored beside it.",
            "memory"
          ),
          column(
            idFactory,
            "In Postgres",
            "The same three pages through a left join on the log's primary key, in Postgres compiled to WebAssembly. The stamps match the column to the left.",
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
  name: "changed-at",
  title: "When each page last changed, out of both stores",
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
