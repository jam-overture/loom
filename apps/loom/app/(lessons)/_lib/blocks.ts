import { buildElement, buildText, type IdFactory, type JsonObject, type LoomNode } from "@loom/runtime"

import { card, heading, link, prose, stack } from "./loom"
import type { Block, TableRow } from "./markdown"
import { plainText } from "./text"

/**
 * A lesson's blocks, composed from registered primitives.
 *
 * Nothing here invents a component (0067): a paragraph is `loom.prose`, a
 * snippet is `loom.code`, a pull quote is an outlined `loom.card`. Where the
 * library has nothing to say, this file says so in a comment and files a
 * finding rather than reaching for a `<div>` — the two places that happens are
 * lists and tables, and both are below.
 */

/** A cell that is nothing but a link, which is every cell of an "In the code" table. */
const ONLY_LINK = /^\[(.+)\]\(([^)]+)\)$/

const REPOSITORY = "https://github.com/jam-overture/loom/blob/main"

/**
 * A lesson links sideways — `../src/runtime/interpreter.ts`, `../decisions/0006-…`
 * — and those are paths in a checkout, not routes on this surface. Absolute is
 * also what `loom.link` accepts: a relative href in an AI-authored tree is a
 * link whose destination depends on where the tree happens to be mounted, and
 * the primitive refuses it (see `url.ts`). So a sideways link is resolved
 * against the repository, which is where the file it names actually is.
 */
const repositoryUrl = (href: string, from: string): string | undefined => {
  if (/^https?:/.test(href)) return href
  if (href.startsWith("#")) return undefined

  const path = href.startsWith("../") ? href.slice(3) : `${from}/${href}`

  return `${REPOSITORY}/${path.replace(/^\.\//, "")}`
}

const TERMINAL = new Set(["bash", "sh", "shell", "console"])

const codeNode = (ids: IdFactory, language: string | undefined, code: string): LoomNode => {
  const props: JsonObject = { density: code.includes("\n") ? "comfortable" : "compact" }

  if (language !== undefined) props["language"] = language
  if (language !== undefined && TERMINAL.has(language)) props["tone"] = "terminal"

  return buildElement(ids, { type: "loom.code", props, children: [buildText(ids, code)] })
}

/**
 * A list, as a column of paragraphs each carrying its own marker.
 *
 * The starter library has seven list-shaped primitives and every one of them is
 * a list *of something* — links, perks, milestones, questions and answers. An
 * ordinary ordered list of prose is the one thing it cannot say, so the marker
 * is put in the text where a reader can at least see it. Filed as a finding for
 * `Loom primitives`; a course whose Self-check questions are numbered by a
 * string concatenation is the evidence, not a workaround worth keeping.
 */
const listNodes = (ids: IdFactory, ordered: boolean, items: readonly string[]): readonly LoomNode[] =>
  items.map((item, index) =>
    prose(ids, `${ordered ? `${index + 1}.` : "—"} ${plainText(item)}`)
  )

const cellNode = (ids: IdFactory, text: string, from: string): LoomNode => {
  const only = ONLY_LINK.exec(text)
  const href = only?.[2] === undefined ? undefined : repositoryUrl(only[2], from)

  return only?.[1] !== undefined && href !== undefined
    ? link(ids, plainText(only[1]), href, { tone: "accent", scale: "small" })
    : prose(ids, plainText(text))
}

/**
 * A table, as one card per row.
 *
 * There is no table primitive — `loom.tier-table` is a pricing band and says so
 * — and the reading column here is 44rem, which a four-column table would not
 * survive on a phone regardless. A row becomes a card of labelled values, which
 * loses the column-wise scan and keeps every word. Filed for `Loom primitives`
 * along with the list: they are the same gap seen twice.
 */
const tableNodes = (
  ids: IdFactory,
  headers: TableRow,
  rows: readonly TableRow[],
  from: string
): readonly LoomNode[] =>
  rows.map((row) =>
    card(
      ids,
      { tone: "outline", padding: "snug" },
      row.flatMap((cell, column) => {
        if (cell === "") return []

        const label = headers[column] ?? ""

        return [
          ...(label === "" ? [] : [prose(ids, plainText(label), { size: "small", tone: "muted" })]),
          cellNode(ids, cell, from),
        ]
      })
    )
  )

/**
 * A blockquote is emphasis in these lessons, not attribution — `loom.quote`
 * requires an author because a testimonial has one, and the sentence a lesson
 * pulls out of its own argument does not.
 */
const quoteNode = (ids: IdFactory, blocks: readonly Block[], from: string): LoomNode =>
  card(ids, { tone: "accent", padding: "normal" }, blockNodes(ids, blocks, from))

export const blockNodes = (
  ids: IdFactory,
  blocks: readonly Block[],
  from = "lessons"
): readonly LoomNode[] =>
  blocks.flatMap((block): readonly LoomNode[] => {
    switch (block.kind) {
      case "heading":
        /**
         * Down one level from the file. The lesson's own `#` is the page's `<h1>`
         * and its `##` sections are the parts this surface names, so a `###`
         * inside a section is a `<h4>` here — the outline a screen reader walks
         * has to be the outline of the page, not of the file it was read from.
         */
        return [heading(ids, Math.min(block.level + 1, 6), plainText(block.text), { balance: true })]
      case "paragraph":
        return [prose(ids, plainText(block.text))]
      case "list":
        return listNodes(ids, block.ordered, block.items)
      case "code":
        return [codeNode(ids, block.language, block.code)]
      case "quote":
        return [quoteNode(ids, block.blocks, from)]
      case "table":
        return tableNodes(ids, block.headers, block.rows, from)
      case "rule":
        return [buildElement(ids, { type: "loom.divider", props: { ornament: "rule" }, children: [] })]
    }
  })

/** A column of blocks, for the places that want one node rather than several. */
export const blockStack = (ids: IdFactory, blocks: readonly Block[], from = "lessons"): LoomNode =>
  stack(ids, { direction: "column", gap: "normal" }, blockNodes(ids, blocks, from))
