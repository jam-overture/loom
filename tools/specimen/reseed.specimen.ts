import { createElement, type CSSProperties, type ReactNode } from "react"
import { z } from "zod"

import { sequentialIdFactory } from "../../src/ids.js"
import { colour, family, monospace, size, space } from "../../src/primitives/tokens.js"
import type { LoomPrimitiveProps } from "../../src/render/primitive.js"
import { THEME_PROP_KEY } from "../../src/reserved-props.js"
import { definePrimitive } from "../../src/sdk/definition.js"
import { describeReseedPlan, planReseed } from "../../src/store/reseed.js"
import { sampleTree } from "../../src/testing/fixtures.js"
import { themeSelectionSchema, type ThemeSelection } from "../../src/theme/theme.js"
import { applyOperation } from "../../src/tree/apply.js"
import { buildElement, buildText } from "../../src/tree/builders.js"
import { compareTrees } from "../../src/tree/compare.js"
import type { TreeOperation } from "../../src/tree/delta.js"
import type { LoomNode } from "../../src/tree/node.js"
import { outlineTree } from "../../src/tree/outline.js"
import { createTree, withRoot, type LoomTree } from "../../src/tree/tree.js"

import { defineSpecimen, WIDE } from "./specimen.js"

/**
 * A page that drifted, the operations that put it back, and the page after them.
 *
 * 0259 made this site's pages rows in the store and seeding create-if-absent, so
 * editing a builder stopped changing the site. `Loom portal` filed the
 * consequence on 12 October: there was no supported way back. This is the way
 * back, and the picture is of the thing a reviewer has to be able to read — not
 * that the page is correct again, but **what was proposed in order to make it
 * so**.
 *
 * The middle column is the whole claim. A reseed is not a reset: it is four
 * ordinary operations against a known base revision, each one legible on its own,
 * which is why it can carry provenance, be judged by the Gate, and be undone like
 * anything else in the log.
 *
 * **Nothing in any column is typed into this file.** The left outline is a tree
 * built by `sampleTree()` and then edited by the four deltas under `DRIFT`; the
 * middle is `planReseed`'s own `operations`, printed; the right is the left tree
 * with those operations applied. The last line is `compareTrees` answering, at
 * render time, whether the right column is the builder's page.
 */

/** What happened to the page after it was seeded — somebody's four accepted changes. */
const DRIFT: readonly TreeOperation[] = ((): readonly TreeOperation[] => {
  const { ids } = sampleTree()
  const late = sequentialIdFactory("late")

  return [
    { op: "configure", nodeId: ids.headline, set: { value: "Hello again" }, unset: [] },
    { op: "configure", nodeId: ids.card, set: { variant: "filled" }, unset: ["elevation"] },
    { op: "remove", nodeId: ids.footer },
    {
      op: "insert",
      parentId: ids.page,
      index: 0,
      node: buildElement(late, {
        type: "loom.card",
        props: { tone: "surface" },
        children: [buildText(late, "A banner somebody added")],
      }),
    },
  ]
})()

const advanced = (tree: LoomTree, operations: readonly TreeOperation[]): LoomTree => {
  const reached = operations.reduce<LoomNode>((root, operation) => {
    const applied = applyOperation(root, operation)
    if (!applied.ok) throw new Error(`${operation.op}: ${applied.error.code}`)

    return applied.value
  }, tree.root)

  if (reached.kind !== "element") throw new Error("the root stopped being an element")

  return { ...withRoot(tree, reached), revision: tree.revision + operations.length }
}

const authored = (): LoomTree => sampleTree().tree
const stored = (): LoomTree => advanced(authored(), DRIFT)

const labelOf = (node: LoomNode): string => {
  switch (node.kind) {
    case "element":
      return node.type
    case "slot":
      return `slot ${node.name}`
    case "text":
      return JSON.stringify(node.value)
  }
}

const outlineOf = (tree: LoomTree): string =>
  outlineTree(tree.root)
    .map(({ node, depth }) => `${"  ".repeat(depth)}${labelOf(node)}`)
    .join("\n")

const sentenceFor = (operation: TreeOperation): string => {
  switch (operation.op) {
    case "insert":
      return `insert ${labelOf(operation.node)}\n  into ${operation.parentId} at ${operation.index}`
    case "remove":
      return `remove ${operation.nodeId}`
    case "move":
      return `move ${operation.nodeId}\n  to ${operation.parentId} at ${operation.index}`
    case "configure":
      return `configure ${operation.nodeId}\n  set ${JSON.stringify(operation.set)}${
        operation.unset.length === 0 ? "" : `\n  unset ${operation.unset.join(", ")}`
      }`
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

const LISTING: CSSProperties = {
  margin: 0,
  fontFamily: monospace(),
  fontSize: size(2),
  lineHeight: 1.7,
  color: colour("fg-default"),
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
}

const block = (label: string, body: string, key: string): ReactNode =>
  createElement(
    "div",
    { key, style: { marginBottom: space(4) } },
    createElement("span", { style: LABEL }, label),
    createElement("p", { style: LISTING }, body)
  )

type Column = "drifted" | "plan" | "reseeded"

const columnSchema = z.object({ column: z.enum(["drifted", "plan", "reseeded"]) })

const panel = definePrimitive({
  type: "spec.reseed",
  description: "A drifted page, the reseed planned for it, or the page the reseed produces.",
  props: columnSchema,
  component: ({ props }: LoomPrimitiveProps<{ column: Column }>) => {
    const page = stored()
    const plan = planReseed(page, authored())

    if (props.column === "drifted") {
      return createElement(
        "div",
        null,
        block("the page as the store holds it", outlineOf(page), "outline"),
        block("head", `revision ${page.revision}`, "revision")
      )
    }

    if (props.column === "plan") {
      return plan.outcome === "reseedable"
        ? createElement(
            "div",
            null,
            ...plan.operations.map((operation, at) =>
              block(`${at + 1}`, sentenceFor(operation), `op-${at}`)
            ),
            block("and what it costs", describeReseedPlan(plan), "cost")
          )
        : createElement("p", { style: LISTING }, `no reseed: ${plan.outcome}`)
    }

    const put =
      plan.outcome === "reseedable" ? advanced(page, plan.operations) : page

    return createElement(
      "div",
      null,
      block("the page after the reseed", outlineOf(put), "outline"),
      block("head", `revision ${put.revision}`, "revision"),
      block(
        "against the builder's page",
        compareTrees(authored(), put).length === 0
          ? "no differences"
          : `${compareTrees(authored(), put).length} differences`,
        "compared"
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
      buildElement(idFactory, { type: "spec.reseed", props: { column: which } }),
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
        children: [buildText(idFactory, "Putting a page back is a change, and here is the change")],
      }),
      buildElement(idFactory, {
        type: "loom.prose",
        props: { size: "lead" },
        children: [
          buildText(
            idFactory,
            "A seeded page has had four accepted changes since: a new headline, a restyled card, a deleted footer and a banner nobody authored. The builder still produces the original. The middle column is what Loom proposes in order to get back to it — four ordinary operations against revision 4, each one a reviewer can read, none of them a reset."
          ),
        ],
      }),
      buildElement(idFactory, {
        type: "loom.grid",
        props: { columns: "three", gap: "loose" },
        children: [
          column(
            idFactory,
            "What the store holds",
            "Revision 4, and the page the site actually serves.",
            "drifted"
          ),
          column(
            idFactory,
            "The reseed, as planned",
            "planReseed's own operations, printed. The log will carry these with provenance on them.",
            "plan"
          ),
          column(
            idFactory,
            "After the reseed",
            "Revision 8, and compareTrees asked at render time whether it is the builder's page.",
            "reseeded"
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
  name: "reseed",
  title: "Putting a page back is a change, and here is the change",
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
