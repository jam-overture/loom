import { readFileSync } from "node:fs"
import { join } from "node:path"

import { REPOSITORY_ROOT } from "../architecture/source"
import { docsHref, writtenDocsSections, type DocsPage, type DocsSection } from "../nav"
import { headingAnchor } from "../search/anchor"

import { apiEntries } from "./reference"
import type { ApiEntry } from "./model"

/**
 * Which written page explains a given export, worked out by reading the pages.
 *
 * The reference is generated, and the whole of what it can say about a name is
 * what the declaration file says: a signature, and the first paragraph of its
 * doc comment. That is the right answer to *what is `auditPalette`* and no
 * answer at all to *what is a composed failure*. The prose knows; the reference
 * had no way to point at it.
 *
 * A hand-written map from export to page would close that and would be wrong
 * within a week — the same argument that makes the reference generated in the
 * first place. So this is derived, from the only evidence that cannot lie:
 * **the written pages already print these names**, in fenced blocks and in
 * backticks. A page that stops naming an export stops being offered for it, in
 * the same commit; a page that starts naming one is offered from then on, with
 * nobody told to update anything.
 *
 * What it deliberately does not claim is *coverage*. A name printed on a page is
 * evidence that the page is somewhere to look, not that the page teaches the
 * export. The wording on the reference says "named on" for exactly that reason,
 * and the count of how few exports any page names is stated rather than hidden.
 */

/** One place a written page prints an export's name. */
export type ProseMention = {
  /** `/docs/getting-started/your-first-tree#building-a-tree`. */
  readonly href: string
  /** What the rail calls the page. */
  readonly pageTitle: string
  readonly sectionTitle: string
  /** The nearest heading above the mention, or empty when it is in the opening. */
  readonly headingText: string
}

/** Every export a page names, keyed by name, in the order the page names them. */
export type ProseMentionIndex = ReadonlyMap<string, readonly ProseMention[]>

const FENCE = /^\s*(?:```|~~~)/
const HEADING = /^(#{2,3})\s+(.+?)\s*$/
const INLINE_CODE = /`([^`]+)`/g

/**
 * An identifier in a piece of code, and never one behind a dot.
 *
 * `result.ok` is a property read on a value; the `ok` this package exports is
 * the function that made it. They share a spelling and nothing else, and a
 * reference that sent a reader to a page because of the former would be
 * guessing. The leading group is what excludes it: a name counts when the
 * character before it is not part of an identifier **and is not a full stop.**
 */
const IDENTIFIER = /(?:^|[^A-Za-z0-9_$.])([A-Za-z_$][A-Za-z0-9_$]*)/g

const identifiersIn = (code: string): readonly string[] =>
  [...code.matchAll(IDENTIFIER)].map((match) => match[1] ?? "")

/**
 * The names a page prints as code, each with the heading it sits under.
 *
 * Only code counts — a fenced block, or a span between backticks. The
 * alternative is matching prose, and prose is where a page says "the registry"
 * and means the idea rather than `createPrimitiveRegistry`. Backticks are how
 * this site already distinguishes the two, on every page, without being asked.
 *
 * The first mention on a page wins. A reader following this link wants the
 * place the page starts talking about the name, and the later occurrences are
 * almost always the same discussion continuing.
 *
 * Pure, and separated from the file read for the same reason `headingsIn` is:
 * the rules with a wrong answer — the dot, the fence, which heading is nearest
 * — are testable against markdown written to exercise them rather than against
 * whichever page happens to exercise them today.
 */
export const namedExportsIn = (
  source: string,
  published: ReadonlySet<string>
): ReadonlyMap<string, string> => {
  const found = new Map<string, string>()
  let fenced = false
  let heading = ""

  for (const line of source.split("\n")) {
    if (FENCE.test(line)) {
      fenced = !fenced
      continue
    }

    if (!fenced) {
      const match = HEADING.exec(line)

      /**
       * The heading moves before its own backticks are read, so a section
       * called *What `ok` is for* offers itself rather than whatever came
       * before it. Stripped the same way `headings.ts` strips one, because
       * `headingAnchor` has to produce the id `rehype-slug` really emitted.
       */
      if (match !== null) heading = (match[2] ?? "").replace(/[`*_]/g, "")
    }

    const code = fenced ? [line] : [...line.matchAll(INLINE_CODE)].map((match) => match[1] ?? "")

    for (const name of code.flatMap(identifiersIn)) {
      if (published.has(name) && !found.has(name)) found.set(name, heading)
    }
  }

  return found
}

/** Every name the package publishes, across every entry point. */
export const publishedNames: ReadonlySet<string> = new Set(
  apiEntries.flatMap((entry) => entry.groups.flatMap((group) => group.symbols.map((s) => s.name)))
)

const docsRoot = join(REPOSITORY_ROOT, "apps", "loom", "app", "(docs)", "docs")

const readWrittenPage = (sectionSlug: string, pageSlug: string): string =>
  readFileSync(join(docsRoot, sectionSlug, pageSlug, "page.mdx"), "utf8")

const mentionOn = (
  section: DocsSection,
  page: DocsPage,
  headingText: string
): ProseMention => ({
  href:
    headingText === ""
      ? docsHref(section.slug, page.slug)
      : `${docsHref(section.slug, page.slug)}#${headingAnchor(headingText)}`,
  pageTitle: page.title,
  sectionTitle: section.title,
  headingText,
})

/**
 * The index, built once from the written pages in reading order.
 *
 * Reading order is what makes the list under an export useful without ranking
 * it: a name printed on both *Your first tree* and *Connecting a model* is
 * offered introduction-first, which is the order somebody who does not have the
 * model in their head wants them in.
 */
export const buildProseMentions = (): ProseMentionIndex => {
  const index = new Map<string, ProseMention[]>()

  for (const section of writtenDocsSections) {
    for (const page of section.pages) {
      for (const [name, heading] of namedExportsIn(
        readWrittenPage(section.slug, page.slug),
        publishedNames
      )) {
        index.set(name, [...(index.get(name) ?? []), mentionOn(section, page, heading)])
      }
    }
  }

  return index
}

export const proseMentions: ProseMentionIndex = buildProseMentions()

/** One page, and how many of an entry point's exports it names. */
export type ProsePage = {
  readonly href: string
  readonly title: string
  readonly sectionTitle: string
  readonly named: number
}

/**
 * The written pages worth offering at the top of an entry point's reference,
 * commonest first.
 *
 * A reader who has landed on a door with three hundred and sixty exports behind
 * it is the reader this section serves worst, and the thing they most need is
 * not a signature — it is the sentence somewhere else on this site that says
 * what the door is for. So the pages that talk about this entry point come
 * before the list of names, ordered by how much of it each one covers.
 *
 * The href is the page rather than a heading: this is an offer to go and read,
 * not a jump to one paragraph.
 */
export const prosePagesFor = (
  entry: ApiEntry,
  mentions: ProseMentionIndex = proseMentions
): readonly ProsePage[] => {
  const counted = new Map<string, ProsePage>()

  for (const group of entry.groups) {
    for (const symbol of group.symbols) {
      for (const mention of mentions.get(symbol.name) ?? []) {
        const href = mention.href.split("#")[0] ?? mention.href
        const seen = counted.get(href)

        counted.set(href, {
          href,
          title: mention.pageTitle,
          sectionTitle: mention.sectionTitle,
          named: (seen?.named ?? 0) + 1,
        })
      }
    }
  }

  return [...counted.values()].sort((a, b) => b.named - a.named || a.title.localeCompare(b.title))
}

/**
 * Everything one reference page needs to know about the prose, resolved before
 * it renders.
 *
 * The component that draws the reference reads no files and looks nothing up:
 * it is handed this and arranges it, which is what lets its tests state a
 * situation — *an export two pages name, an export none do* — instead of
 * arranging for one to exist in the repository.
 *
 * `byName` is narrowed to this entry's own exports, so a page carries the few
 * dozen mentions it can use rather than the whole index.
 */
export type EntryProse = {
  /** The written pages that name any of this entry point's exports. */
  readonly pages: readonly ProsePage[]
  /** How many of its exports are named on one, out of `apiSymbolCount(entry)`. */
  readonly named: number
  readonly byName: ReadonlyMap<string, readonly ProseMention[]>
}

export const entryProseFor = (
  entry: ApiEntry,
  mentions: ProseMentionIndex = proseMentions
): EntryProse => {
  const byName = new Map<string, readonly ProseMention[]>()

  for (const group of entry.groups) {
    for (const symbol of group.symbols) {
      const found = mentions.get(symbol.name)

      if (found !== undefined && found.length > 0) byName.set(symbol.name, found)
    }
  }

  return { pages: prosePagesFor(entry, mentions), named: byName.size, byName }
}
