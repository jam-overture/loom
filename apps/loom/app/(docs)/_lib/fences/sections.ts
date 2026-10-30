import { headingAnchor } from "../search/anchor"

import { fenceSpansIn, outsideFences } from "./spans"

/**
 * Which heading a block sits under, decided once.
 *
 * `spans.ts` already made this move for the question *is this line inside a
 * fence*, after four scanners had each answered it privately and three of them
 * had answered it wrongly. This is the next question down and it was heading
 * the same way: `search/code.ts` worked out the heading in force when a block
 * opens so that a name a reader saw in a snippet is findable, `api/mentions.ts`
 * works out the nearest heading above a mention so a reference entry can link
 * to it, and `landing.ts` needed the same walk for a third purpose.
 *
 * **The level rule is the part worth sharing rather than the walk.** A section
 * here is opened by a `##` or a `###` and by nothing else, because those are
 * the levels the search box indexes and therefore the only anchors a reader can
 * be **sent** to. A `####` is a label inside a section somebody was already
 * sent to; treating it as a landing place would mean promising a reader a
 * fragment that no index on this site hands out.
 *
 * So the section a block belongs to is the same section in all three places by
 * construction, and *the section a reader can land on* is one fact rather than
 * three agreeing ones.
 */

/** The heading levels the search indexes, and so the levels a reader can land on. */
export const LANDING_LEVELS: readonly number[] = [2, 3]

const HEADING = /^(#{1,6})\s+(.+?)\s*$/

/** The inline markdown a heading is allowed, removed as `search/headings.ts` removes it. */
const stripInline = (text: string): string => text.replace(/[`*_]/g, "")

export type BlockSection = {
  /** 1-based line of the block's opening ticks, which is its identity on the page. */
  readonly opensAt: number
  /**
   * The anchor of the heading it sits under — the same anchor `search/anchor.ts`
   * produces, so a block can be joined to the entry that links to it. Empty for
   * a block above the page's first heading, which belongs to the page itself.
   */
  readonly anchor: string
  /** That heading's text, for a failing test to name somewhere a person can see. */
  readonly heading: string
  /** The lines between the fences, verbatim. */
  readonly code: string
}

/**
 * Every block on a page with the section it is in, in reading order.
 *
 * One walk down the page rather than two: `outsideFences` says where the
 * headings are and `fenceSpansIn` says where the blocks are, both keyed to the
 * same line numbers, so the anchor in force when a block opens is the anchor
 * that block belongs to. A `## heading` inside a fence is a shell comment or a
 * markdown example and moves nothing, because the line it is on has already
 * been blanked.
 */
export const blockSectionsIn = (source: string): readonly BlockSection[] => {
  const blocks = new Map(fenceSpansIn(source).map((span) => [span.opensAt, span.code]))

  return outsideFences(source).reduce<{
    readonly anchor: string
    readonly heading: string
    readonly sections: readonly BlockSection[]
  }>(
    (state, line, index) => {
      const code = blocks.get(index + 1)

      if (code !== undefined) {
        return {
          ...state,
          sections: [...state.sections, { opensAt: index + 1, anchor: state.anchor, heading: state.heading, code }],
        }
      }

      const heading = HEADING.exec(line)

      if (heading === null) return state

      if (!LANDING_LEVELS.includes((heading[1] ?? "").length)) return state

      const text = stripInline(heading[2] ?? "")

      return { ...state, anchor: headingAnchor(text), heading: text }
    },
    { anchor: "", heading: "", sections: [] }
  ).sections
}
