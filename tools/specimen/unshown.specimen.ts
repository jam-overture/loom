import { createElement, type CSSProperties, type ReactNode } from "react"
import { z } from "zod"

import type { NodeData } from "../../src/data/resolution.js"
import { sequentialIdFactory } from "../../src/ids.js"
import { colour, family, monospace, size, space, weight } from "../../src/primitives/tokens.js"
import { describeRenderDiagnostic } from "../../src/render/diagnostics.js"
import type { LoomPrimitiveProps } from "../../src/render/primitive.js"
import { readUnshown, unshownRows, type UnshownDeclaration } from "../../src/render/unshown.js"
import { DATA_PROP_KEY, THEME_PROP_KEY } from "../../src/reserved-props.js"
import { definePrimitive } from "../../src/sdk/definition.js"
import { themeSelectionSchema, type ThemeSelection } from "../../src/theme/theme.js"
import { buildElement, buildText } from "../../src/tree/builders.js"
import type { LoomNode } from "../../src/tree/node.js"
import { createTree } from "../../src/tree/tree.js"
import { nodeIdSchema } from "../../src/ids.js"
import { primitiveTypeSchema } from "../../src/primitive-type.js"

import { defineSpecimen, WIDE } from "./specimen.js"

/**
 * One answer, two audiences — the picture of the seam 0206 adds.
 *
 * A source answers with twelve rows. Eleven of them carry a `title`; the twelfth
 * carries `headline`, which is the ordinary way this goes wrong — somebody
 * renamed a column. The primitive draws the eleven it can read and tells the
 * reader, without a count, that it could not show everything. That much has been
 * true since the listing shipped.
 *
 * The right-hand column is what did not exist. The count is useful to exactly
 * one person and it is not the reader: it is the author of the page, who wants to
 * know that eleven of twelve rows stopped reading and that it started when the
 * column moved.
 *
 * **The subject is the seam, so the primitives are the smallest things that can
 * hold it.** `loom.feed` is the real primitive with this exposure and declaring
 * `unshown` on it is `Loom primitives`' line to write in `src/primitives/`,
 * which is that lane's directory — filed rather than done. So the left column is
 * `spec.listing`, the same shape with the declaration on it, and the right is
 * `spec.record`.
 *
 * **What the right column draws is not typed into this file.** It calls
 * `readUnshown` on `spec.listing`'s own declaration, `unshownRows` on what comes
 * back, and `describeRenderDiagnostic` on the result — the three functions the
 * render walk calls, in the order it calls them, against the same answer the
 * left column was handed. The numbers in the picture are computed.
 */

const ROW = z.object({ title: z.string(), meta: z.string() })

type Row = z.infer<typeof ROW>

const rowsIn = (value: unknown): readonly Row[] => {
  if (!Array.isArray(value)) return []

  const rows: Row[] = []
  for (const row of value) {
    const read = ROW.safeParse(row)
    if (read.success) rows.push(read.data)
  }

  return rows
}

const givenIn = (data: NodeData): number => {
  const outcome = data["entries"]

  return outcome?.status === "ready" && Array.isArray(outcome.value) ? outcome.value.length : 0
}

const answerIn = (data: NodeData): unknown => {
  const outcome = data["entries"]

  return outcome?.status === "ready" ? outcome.value : undefined
}

/**
 * The declaration, written once and used twice — by the component that draws the
 * rows and by the definition that tells the runtime about them. That is the whole
 * construction the record argues for: declare the function the component calls,
 * and the count on the page and the count in the log cannot disagree.
 */
const readingOfEntries: UnshownDeclaration = (_props, data) => [
  { name: "entries", given: givenIn(data), shown: rowsIn(answerIn(data)).length },
]

const ROW_STYLE: CSSProperties = {
  paddingTop: space(3),
  paddingBottom: space(3),
  borderBottom: `1px solid ${colour("border-subtle")}`,
}

const TITLE: CSSProperties = {
  display: "block",
  fontFamily: family("heading"),
  fontWeight: weight("heading"),
  fontSize: size(4),
  color: colour("fg-default"),
}

const META: CSSProperties = {
  display: "block",
  fontFamily: family("body"),
  fontSize: size(1),
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: colour("fg-subtle"),
}

const NOTICE: CSSProperties = {
  marginTop: space(4),
  fontFamily: family("body"),
  fontSize: size(2),
  color: colour("fg-muted"),
}

const listing = definePrimitive({
  type: "spec.listing",
  description: "A run of entries a source answered with, which says what it could not show.",
  props: z.object({}),
  reads: ["entries"],
  unshown: readingOfEntries,
  text: { unreadable: "Some entries could not be shown." },
  component: ({ loom }: LoomPrimitiveProps<Record<never, never>, "unreadable">) => {
    const answer = answerIn(loom.data)
    const rows = rowsIn(answer)
    const given = givenIn(loom.data)

    return createElement(
      "div",
      null,
      createElement(
        "ul",
        { style: { listStyle: "none", margin: 0, padding: 0 } },
        rows.map((row) =>
          createElement(
            "li",
            { key: row.title, style: ROW_STYLE },
            createElement("span", { style: META }, row.meta),
            createElement("span", { style: TITLE }, row.title)
          )
        )
      ),
      rows.length < given
        ? createElement("p", { style: NOTICE }, loom.text.unreadable)
        : null
    )
  },
})

const LOG: CSSProperties = {
  margin: 0,
  fontFamily: monospace(),
  fontSize: size(2),
  lineHeight: 1.6,
  color: colour("fg-default"),
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
}

const LABEL: CSSProperties = {
  display: "block",
  marginBottom: space(3),
  fontFamily: family("body"),
  fontSize: size(1),
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: colour("fg-subtle"),
}

/**
 * The author's half, drawn by calling what the walk calls.
 *
 * It reports on the node beside it rather than on itself, which is the one thing
 * about this primitive no real page would want and the only way to put both
 * audiences in one frame: a diagnostic is collected beside the element and is
 * never in the element.
 */
const record = definePrimitive({
  type: "spec.record",
  description: "What the runtime reports of the answer its sibling was given.",
  props: z.object({ of: z.string() }),
  reads: ["entries"],
  component: ({ loom, props }: LoomPrimitiveProps<{ of: string }>) => {
    const readings = readUnshown(readingOfEntries, {}, loom.data)

    const lines: ReactNode[] = readings.ok
      ? unshownRows(readings.value).map((reading) =>
          createElement(
            "p",
            { key: reading.name, style: LOG },
            describeRenderDiagnostic({
              code: "data-unshown",
              nodeId: nodeIdSchema.parse(props.of),
              type: primitiveTypeSchema.parse("spec.listing"),
              name: reading.name,
              given: reading.given,
              shown: reading.shown,
            })
          )
        )
      : []

    return createElement(
      "div",
      null,
      createElement("span", { style: LABEL }, "diagnostics"),
      lines.length === 0
        ? createElement("p", { style: LOG }, "nothing reported")
        : lines
    )
  },
})

const BINDING = { entries: { source: "posts.latest", params: {} } }

const column = (
  idFactory: ReturnType<typeof sequentialIdFactory>,
  heading: string,
  note: string,
  subject: LoomNode
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
      subject,
    ],
  })

const build = (theme: ThemeSelection) => {
  const idFactory = sequentialIdFactory()

  /**
   * Built before the cards, so the record can name the node it reports on. The
   * walk names the listing's node and a picture that named the reporter's would
   * be the one untrue line in the frame.
   */
  const subject = buildElement(idFactory, {
    type: "spec.listing",
    props: { [DATA_PROP_KEY]: BINDING } as never,
  })

  const section = buildElement(idFactory, {
    type: "loom.section",
    props: { eyebrow: "Specimen", width: "wide" },
    children: [
      buildElement(idFactory, {
        type: "loom.heading",
        props: { level: 1, balance: true },
        children: [buildText(idFactory, "Eleven of twelve, said to the one person who can act on it")],
      }),
      buildElement(idFactory, {
        type: "loom.prose",
        props: { size: "lead" },
        children: [
          buildText(
            idFactory,
            "One source answers both columns with the same twelve rows. Eleven carry a title and the twelfth carries a headline, because somebody renamed a column. The left column is what the reader is told, which carries no count on purpose. The right is what the runtime now reports, which carries both."
          ),
        ],
      }),
      buildElement(idFactory, {
        type: "loom.grid",
        props: { columns: "two", gap: "loose" },
        children: [
          column(
            idFactory,
            "What the reader is told",
            "The eleven rows it could read, and one sentence with no number in it — a plural this library cannot form in every language it may be served in.",
            subject
          ),
          column(
            idFactory,
            "What the author is now told",
            "The same answer, read by the same declaration, reported by the walk. Nothing here is drawn on the page a visitor sees.",
            buildElement(idFactory, {
              type: "spec.record",
              props: { of: subject.id, [DATA_PROP_KEY]: BINDING } as never,
            })
          ),
        ],
      }),
    ],
  })

  const page = buildElement(idFactory, {
    type: "loom.page",
    props: { [THEME_PROP_KEY]: theme, width: "wide" },
    children: [section],
  })

  return createTree(page, idFactory)
}

/**
 * Twelve rows, eleven readable. The twelfth is the defect this whole seam is
 * about: the column it carries its words under was renamed, so the row resolves
 * perfectly, arrives, and is declined.
 */
const TWELVE = [
  ...Array.from({ length: 11 }, (_row, index) => ({
    title: `Entry ${index + 1}`,
    meta: "23 September",
  })),
  { headline: "The row whose column moved", meta: "23 September" },
]

export default defineSpecimen({
  name: "unshown",
  title: "Eleven of twelve, said to the one person who can act on it",
  build,
  primitives: [listing, record],
  answers: { "posts.latest": { answer: TWELVE } },
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
