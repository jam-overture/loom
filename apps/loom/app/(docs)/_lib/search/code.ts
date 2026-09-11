import { fenceSpansIn, outsideFences } from "../fences/spans"

import { headingAnchor } from "./anchor"
import { readPageSource } from "./headings"

/**
 * The code on a page, section by section, so a name a reader saw in a block can
 * be found again.
 *
 * This is the last of the four things a person types into a documentation
 * search box that this site could not answer. It could find a page by its
 * title, a heading by its name, a published export by its spelling, and — since
 * the prose was indexed — a sentence by a word in it. What it could not find
 * was **the code**, which on this site is thirty-odd blocks with a copy button
 * on each and is the reason many readers are here at all.
 *
 * The failure was specific and silent. A reader who had seen
 * `commitIntent` in a snippet, or typed `pnpm add @loom/runtime`
 * from *Installation*, got *the site says nothing about that* — from a site
 * whose blocks say it plainly. Worse, it was the reverse of what a reader
 * assumes: prose is the vaguer half and was searchable, code is the exact half
 * and was not.
 *
 * **What counts as code here is what a reader can see in a block**, and nothing
 * finer. Every fence on the page, whatever its language and whatever it claims
 * to be: a `bash` block is how somebody finds the install command, and a
 * `sketch` is still on the screen even though nothing compiles it. That rule is
 * one a person can repeat, and it means this half of the index cannot drift out
 * of step with the vocabulary in `fences/model.ts` — a sixth kind of fence is
 * searchable the day it is written, with nobody told to come back here.
 *
 * **Inline code is still not indexed**, and that is unchanged rather than
 * overlooked: `prose.ts` explains why, and the reference's *named on* band
 * already answers *which pages print this name* from exactly those spans. What
 * a fence adds is the shape of the call — the argument you pass, the field you
 * read off the result — which no other index on the site holds.
 */

export type CodeSection = {
  /**
   * The anchor of the heading the block sits under — the same anchor
   * `headings.ts` produces, so the code can be joined to the entry that links
   * to it. Empty for a block above the page's first heading.
   */
  readonly anchor: string
  /** Every block under that heading, in reading order, one per line-run. */
  readonly code: string
}

/** The heading levels the search indexes, and so the levels that open a section. */
const INDEXED_LEVELS: readonly number[] = [2, 3]

const HEADING = /^(#{1,6})\s+(.+?)\s*$/

const stripInline = (text: string): string => text.replace(/[`*_]/g, "")

/**
 * The code in a page's source, gathered under the heading it sits beneath.
 *
 * One walk down the page rather than two: `outsideFences` says where the
 * headings are and `fenceSpansIn` says where the blocks are, both keyed to the
 * same line numbers, so the anchor in force when a block opens is the anchor
 * that block belongs to.
 *
 * A heading below `###` does not open a section, for the reason `prose.ts`
 * gives — an `####` is a label inside a section a reader was already sent to,
 * and code that stopped there would be findable by nothing.
 */
export const codeSectionsIn = (source: string): readonly CodeSection[] => {
  const blocks = new Map(fenceSpansIn(source).map((span) => [span.opensAt, span.code]))

  const gathered = outsideFences(source).reduce<{
    readonly anchor: string
    readonly sections: readonly CodeSection[]
  }>(
    (state, line, index) => {
      const block = blocks.get(index + 1)

      if (block !== undefined) {
        return block.trim() === ""
          ? state
          : { ...state, sections: [...state.sections, { anchor: state.anchor, code: block }] }
      }

      const heading = HEADING.exec(line)

      if (heading === null) return state

      const level = (heading[1] ?? "").length

      if (!INDEXED_LEVELS.includes(level)) return state

      return { ...state, anchor: headingAnchor(stripInline(heading[2] ?? "")) }
    },
    { anchor: "", sections: [] }
  )

  return gathered.sections
}

/**
 * Every section's code on a written page, keyed by the anchor it sits under.
 *
 * Two blocks under one heading are joined with a blank line between them, which
 * is what a reader sees on the page and is enough to keep the last line of one
 * from reading as the first line of the next — the excerpt in the results list
 * shows a single line, and a line that spanned two blocks would be a line
 * nobody can copy.
 */
export const readPageCode = (sectionSlug: string, pageSlug: string): ReadonlyMap<string, string> =>
  codeSectionsIn(readPageSource(sectionSlug, pageSlug)).reduce<Map<string, string>>(
    (gathered, { anchor, code }) => {
      const already = gathered.get(anchor)

      return gathered.set(anchor, already === undefined ? code : `${already}\n\n${code}`)
    },
    new Map()
  )
