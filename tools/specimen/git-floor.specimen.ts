import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

import { createElement, type CSSProperties, type ReactNode } from "react"
import { z } from "zod"

import { colour, family, monospace, size, space } from "../../src/primitives/tokens.js"
import type { LoomPrimitiveProps } from "../../src/render/primitive.js"
import { THEME_PROP_KEY } from "../../src/reserved-props.js"
import { definePrimitive } from "../../src/sdk/definition.js"
import { sequentialIdFactory } from "../../src/ids.js"
import { themeSelectionSchema, type ThemeSelection } from "../../src/theme/theme.js"
import { buildElement, buildText } from "../../src/tree/builders.js"
import { createTree } from "../../src/tree/tree.js"

import {
  argvLiterals,
  GIT_FLOOR,
  NEWER_THAN_FLOOR,
  reasonText,
  runsGit,
  unportable,
  versionText,
} from "../git/portability.js"

import { defineSpecimen, WIDE } from "./specimen.js"

/**
 * The floor, and the sweep that holds this repository to it.
 *
 * **Nothing in either column is typed into this file.** The left card is
 * `NEWER_THAN_FLOOR` read out of the module, printed in the module's own order.
 * The right card is a sweep run at build time over every source under `tools/`
 * and `src/` that names git — the same sweep `portability.test.ts` runs — and
 * the two rows under it are the two spellings this branch replaced, put back
 * through `unportable` so the sentence beside each one is the sentence a reader
 * of the failure would have got.
 *
 * The reading is that the right card's count is **nought of** a number that is
 * not nought: the sweep is reading real files and finding nothing, which is the
 * only arrangement of those two figures worth a picture. A sweep that read no
 * files would also report nothing.
 */

const ROOT = fileURLToPath(new URL("../../", import.meta.url))
const HERE = fileURLToPath(new URL("../git/", import.meta.url))

const sourcesUnder = (directory: string): readonly string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return entry.name === "node_modules" ? [] : sourcesUnder(path)
    return entry.name.endsWith(".ts") || entry.name.endsWith(".tsx") ? [path] : []
  })

const sweep = (): { readonly read: number; readonly reasons: readonly string[] } => {
  const sources = [...sourcesUnder(join(ROOT, "tools")), ...sourcesUnder(join(ROOT, "src"))]
  const running = sources.filter(
    (path) => !path.startsWith(HERE) && runsGit(readFileSync(path, "utf8"))
  )

  return {
    read: running.length,
    reasons: running.flatMap((path) =>
      argvLiterals(readFileSync(path, "utf8"))
        .flatMap(unportable)
        .map((found) => `${path.slice(ROOT.length)} — ${reasonText(found)}`)
    ),
  }
}

/**
 * The two argvs this branch replaced, read as a reader of the failure reads
 * them.
 *
 * Written as one string and split rather than as a list of literals, because
 * the sweep reads lists of literals and this file would otherwise be the one
 * place in the repository that trips it on purpose. A picture that has to be
 * exempted from the check it is a picture of is worth avoiding.
 */
const REPLACED: readonly { readonly where: string; readonly argv: readonly string[] }[] = [
  { where: "tools/specimen/against.test.ts", argv: "init -q -b main".split(" ") },
  { where: "tools/queue/git.ts", argv: "worktree remove --force <path>".split(" ") },
]

const MEASURED = {
  floor: versionText(GIT_FLOOR),
  table: NEWER_THAN_FLOOR.map((entry) => ({
    invocation: `git ${entry.tokens.join(" ")}`,
    since: versionText(entry.since),
    instead: entry.instead,
  })),
  swept: sweep(),
  replaced: REPLACED.map(({ where, argv }) => ({
    where,
    said: unportable(argv).map(reasonText),
  })),
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

const CODE: CSSProperties = {
  margin: 0,
  fontFamily: monospace(),
  fontSize: size(2),
  lineHeight: 1.7,
  color: colour("fg-default"),
  fontWeight: 600,
}

const NOTE: CSSProperties = {
  margin: 0,
  fontFamily: family("body"),
  fontSize: size(2),
  lineHeight: 1.6,
  color: colour("fg-subtle"),
}

const FIGURE: CSSProperties = {
  margin: 0,
  fontFamily: monospace(),
  fontSize: size(4),
  lineHeight: 1.2,
  color: colour("fg-default"),
  fontWeight: 700,
}

const block = (key: string, children: readonly ReactNode[]): ReactNode =>
  createElement("div", { key, style: { marginBottom: space(3) } }, ...children)

const theTable = (): ReactNode =>
  createElement(
    "div",
    null,
    ...MEASURED.table.map((row, at) =>
      block(`row-${at}`, [
        createElement("span", { key: "l", style: LABEL }, `needs ${row.since}`),
        createElement("p", { key: "c", style: CODE }, row.invocation),
        createElement("p", { key: "n", style: NOTE }, row.instead),
      ])
    )
  )

const theSweep = (): ReactNode =>
  createElement(
    "div",
    null,
    block("count", [
      createElement("span", { key: "l", style: LABEL }, "sources that name git, swept"),
      createElement("p", { key: "f", style: FIGURE }, String(MEASURED.swept.read)),
    ]),
    block("reasons", [
      createElement("span", { key: "l", style: LABEL }, "invocations the floor lacks"),
      createElement(
        "p",
        { key: "f", style: FIGURE },
        String(MEASURED.swept.reasons.length)
      ),
      ...MEASURED.swept.reasons.map((reason, at) =>
        createElement("p", { key: `r-${at}`, style: NOTE }, reason)
      ),
    ]),
    ...MEASURED.replaced.map(({ where, said }, at) =>
      block(`replaced-${at}`, [
        createElement("span", { key: "l", style: LABEL }, `replaced in ${where}`),
        ...said.map((sentence, inner) =>
          createElement("p", { key: `s-${inner}`, style: NOTE }, sentence)
        ),
      ])
    )
  )

const panelSchema = z.object({ panel: z.enum(["table", "swept"]) })

type Which = z.infer<typeof panelSchema>["panel"]

const panel = definePrimitive({
  type: "spec.git-floor",
  description: "The invocations the git floor lacks, or the sweep that holds this repository to it.",
  props: panelSchema,
  component: ({ props }: LoomPrimitiveProps<{ panel: Which }>) =>
    props.panel === "table" ? theTable() : theSweep(),
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
      buildElement(idFactory, { type: "spec.git-floor", props: { panel: which } }),
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
        children: [buildText(idFactory, `The git every machine has is ${MEASURED.floor}`)],
      }),
      buildElement(idFactory, {
        type: "loom.prose",
        props: { size: "lead" },
        children: [
          buildText(
            idFactory,
            "The left column is the table read out of the module, not written here: each row is an invocation the maintainer's git does not have, the release that added it, and the spelling this repository writes instead. The right column is the sweep run while this picture was taken, over every source under tools and src that names git. The two sentences at the bottom of it are the two spellings this branch replaced, put back through the same check — which is what the sweep would have printed had it existed when they were written.",
          ),
        ],
      }),
      buildElement(idFactory, {
        type: "loom.grid",
        props: { columns: "two", gap: "loose" },
        children: [
          column(
            idFactory,
            "What the floor lacks",
            "NEWER_THAN_FLOOR, in the module's own order. Both spellings of a named first branch are separate rows, because a rule naming one spelling stops working the moment somebody reaches for the other.",
            "table"
          ),
          column(
            idFactory,
            "This repository, swept",
            "The second figure is the one that matters and the first is its precondition: a sweep that read no files would report nothing just as loudly.",
            "swept"
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
  name: "git-floor",
  title: "The git every machine has",
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
