import { readFileSync, readdirSync, existsSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

import { docsHref, writtenDocsSections } from "./nav"

/**
 * What one page says about another, in a form a test can check.
 *
 * A documentation site's pages are not independent. One page ends where the
 * next begins, a section reorders, a page is renamed — and the sentences that
 * *pointed* at the moved thing go on reading perfectly while quietly being
 * false. Nothing renders differently, no build breaks, and the reader who
 * follows the pointer is the one who finds out.
 *
 * Two kinds of pointer live on this site and both are collected here.
 *
 * A **link** names a page by address. It is wrong when the address stops
 * resolving, which happens on any rename.
 *
 * A **quotation** names a page by its words: a blockquote directly under a link
 * to the page it came from. It is wrong when the quoted page stops saying the
 * quoted thing — the failure a link check cannot see, because the address is
 * still perfectly good. That is the one that got through: a page rested a whole
 * section on a sentence another page had since rewritten, and said so in a
 * paraphrase nobody could check.
 *
 * So the convention is that **a page quoting another page quotes it verbatim**,
 * under the link, and this module finds those pairs so a test can go and read
 * the other page.
 */

const docsRoot = fileURLToPath(new URL("../docs", import.meta.url))

export type WrittenPage = {
  /** `<section>/<page>`, for a failure message that names the file. */
  readonly id: string
  readonly href: string
  readonly source: string
}

/** Every written page's MDX, read once. */
export const writtenPages = (): readonly WrittenPage[] =>
  writtenDocsSections.flatMap((section) =>
    section.pages.map((page) => ({
      id: `${section.slug}/${page.slug}`,
      href: docsHref(section.slug, page.slug),
      source: readFileSync(join(docsRoot, section.slug, page.slug, "page.mdx"), "utf8"),
    }))
  )

/**
 * Whether a `/docs/...` address resolves.
 *
 * The generated sections are checked against the filesystem rather than the
 * navigation, because their pages have no `page.mdx`: `/docs/api-reference/react`
 * is served by one dynamic route from a generated list, so what makes the
 * address good is that the route exists and the list contains the entry — which
 * is `nav.ts`, and is why both halves are asked here.
 */
const INTERNAL_LINK = /\]\((\/docs[^)\s]*)\)/g

export const internalLinksIn = (source: string): readonly string[] =>
  [...source.matchAll(INTERNAL_LINK)].flatMap((match) => (match[1] === undefined ? [] : [match[1]]))

/** Every address the site could serve, for the check that a link resolves. */
export const servableHrefs = (): ReadonlySet<string> => {
  const written = readdirSync(docsRoot, { withFileTypes: true })
    .filter((section) => section.isDirectory())
    .flatMap((section) =>
      readdirSync(join(docsRoot, section.name), { withFileTypes: true })
        .filter((page) => page.isDirectory())
        .filter((page) => existsSync(join(docsRoot, section.name, page.name, "page.mdx")))
        .map((page) => docsHref(section.name, page.name))
    )

  return new Set(["/docs", ...written])
}

export type Quotation = {
  /** The page doing the quoting. */
  readonly from: string
  /** The address it says the words came from. */
  readonly source: string
  /** The words, as one line with the blockquote markers and wrapping removed. */
  readonly quoted: string
}

/**
 * A link to another page, then a blockquote — the site's way of resting a
 * paragraph on somebody else's sentence.
 *
 * The prose between the two is deliberately allowed: a quotation reads better
 * introduced than dropped in, and the pairing that matters is *this page cites
 * that page*, not the exact number of words in between. Anything further than a
 * short lead-in is not being introduced, it is a different subject, so the gap
 * is bounded rather than open.
 */
const QUOTATION = /\]\((\/docs\/[^)\s]+)\)([^>]{0,400}?)\n>([^\n]+(?:\n>[^\n]*)*)/g

const flatten = (block: string): string =>
  block
    .split("\n")
    .map((line) => line.replace(/^>\s?/, "").trim())
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()

export const quotationsIn = (page: WrittenPage): readonly Quotation[] =>
  [...page.source.matchAll(QUOTATION)].flatMap((match) =>
    match[1] === undefined || match[3] === undefined
      ? []
      : [{ from: page.id, source: match[1], quoted: flatten(match[3]) }]
  )

/**
 * The quoted words as they would have to appear in the other page's MDX.
 *
 * A page wraps its prose at eighty columns, so a sentence that is one line here
 * is three lines there with newlines and indentation in the middle of it. The
 * comparison is therefore on whitespace-collapsed text on both sides —
 * emphasis, which is part of what the other page wrote, is left alone.
 */
export const collapse = (source: string): string => source.replace(/\s+/g, " ")
