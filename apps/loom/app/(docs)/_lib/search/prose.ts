import { headingAnchor } from "./anchor"
import { readPageSource } from "./headings"

/**
 * The words on a page, section by section, for the search box to look through.
 *
 * Until this existed the index held the site's **table of contents**: page
 * titles, headings and every published name. A reader searching for a word that
 * is in a sentence rather than in a heading — `serverless`, `CSRF`, `rollback`
 * — was told the site says nothing on the subject, by a page that says quite a
 * lot on the subject two paragraphs down.
 *
 * So a section's prose travels with the heading entry that already points at
 * it. Nothing new appears in the results list: the same headings are found,
 * they are simply findable by what they say rather than only by what they are
 * called.
 *
 * **Two things are deliberately not words, and both rules have a wrong answer.**
 *
 * - **Fenced code is skipped**, which is what `headings.ts` already does and for
 *   a related reason: a fence is a thing to copy rather than a thing to read,
 *   and a reader who searches `import` wants prose about importing, not the
 *   forty blocks that begin with the keyword.
 * - **Inline code is skipped too** — every span between backticks. This is the
 *   rule worth defending. The site already answers *which pages show this name*
 *   from exactly those spans, in the band at the top of every reference page,
 *   and a name is the one query where the export itself should win: prose
 *   outranks names here by design (see `match.ts`), so letting `planReverts`
 *   into a page's body would put a page above the export a reader typed
 *   letter-for-letter. **The body index is the words, not the names.**
 */

export type ProseSection = {
  /**
   * The anchor of the heading this prose sits under — the same anchor
   * `headings.ts` produces, so a body can be joined to the entry that links to
   * it. Empty for a page's opening paragraphs, which belong to the page itself.
   */
  readonly anchor: string
  /** The prose, as one line of plain words. Never empty — an empty section is dropped. */
  readonly text: string
}

const FENCE = /^\s*(?:```|~~~)/
const HEADING = /^(#{1,6})\s+(.+?)\s*$/

/** `import …` and `export const metadata = …`: an MDX page's machinery, not its prose. */
const MDX_STATEMENT = /^(?:import|export)\s/

/** The heading levels the search indexes, and so the levels that open a body. */
const INDEXED_LEVELS: readonly number[] = [2, 3]

const stripInline = (text: string): string => text.replace(/[`*_]/g, "")

/**
 * What is left where a name was.
 *
 * The names have to go — see above — but taking one out of the middle of a
 * sentence leaves prose that reads as a mistake: *"it asks the you passed"* was
 * the first excerpt this produced. An ellipsis says a word was left out, which
 * is what happened, and it costs a reader nothing to skip.
 */
const ELIDED = "…"

/**
 * Markdown and MDX reduced to the words a reader sees, in the order they see
 * them.
 *
 * Tags go and what is between them stays, because `<Callout>` holds a sentence
 * somebody wrote and `<Example id="first-tree" />` holds nothing. A link keeps
 * its words and loses its href, for the same reason a heading keeps its words:
 * the reader searches for what is on the screen.
 */
const plainText = (markdown: string): string =>
  markdown
    .replace(/<[^>]*>/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/`[^`]*`/g, ELIDED)
    .replace(/^\s*(?:[-*+]|\d+\.)\s+/gm, " ")
    .replace(/^\s*>+/gm, " ")
    .replace(/[*_|#]/g, " ")
    .replace(/\s+/g, " ")
    /* Two names in a row are one omission to a reader, not two. */
    .replace(new RegExp(`${ELIDED}(?:[\\s,;]*${ELIDED})+`, "g"), ELIDED)
    .replace(new RegExp(`\\s+([,.;:)])`, "g"), "$1")
    .trim()

type Reading = {
  readonly fenced: boolean
  readonly anchor: string
  readonly lines: readonly string[]
  readonly sections: readonly ProseSection[]
}

const closed = (state: Reading): readonly ProseSection[] => {
  const text = plainText(state.lines.join("\n"))

  return text === "" ? state.sections : [...state.sections, { anchor: state.anchor, text }]
}

/**
 * The prose in a page's source, as a pure function of the text.
 *
 * Separated from the file read the way `headingsIn` is, so the rules above can
 * be held against markdown written to exercise them rather than against
 * whichever page happens to exercise them this week — which is what stops
 * another lane's ordinary writing turning this directory red.
 *
 * A heading below the indexed levels does not open a section: an `####` is a
 * label inside a section a reader was already sent to, and a body that stopped
 * there would leave those words findable by nothing.
 */
export const proseSectionsIn = (source: string): readonly ProseSection[] => {
  const state = source.split("\n").reduce<Reading>(
    (reading, line) => {
      if (FENCE.test(line)) return { ...reading, fenced: !reading.fenced }
      if (reading.fenced) return reading
      if (MDX_STATEMENT.test(line)) return reading

      const heading = HEADING.exec(line)

      if (heading === null) return { ...reading, lines: [...reading.lines, line] }

      const level = (heading[1] ?? "").length

      if (!INDEXED_LEVELS.includes(level)) return reading

      return {
        ...reading,
        anchor: headingAnchor(stripInline(heading[2] ?? "")),
        lines: [],
        sections: closed(reading),
      }
    },
    { fenced: false, anchor: "", lines: [], sections: [] }
  )

  return closed(state)
}

/** Every section's prose on a written page, keyed by the anchor it sits under. */
export const readPageProse = (sectionSlug: string, pageSlug: string): ReadonlyMap<string, string> =>
  new Map(proseSectionsIn(readPageSource(sectionSlug, pageSlug)).map(({ anchor, text }) => [anchor, text]))
