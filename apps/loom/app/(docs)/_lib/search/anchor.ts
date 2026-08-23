/**
 * The id a heading is given, computed twice and checked against itself.
 *
 * `rehype-slug` puts the id on the heading as the page compiles; this function
 * puts the same id in the search index as the index builds. They are two
 * programs and they have to agree, because a link to `#the-two-questions-it-asks`
 * on a page whose heading is `#the-two-questions-it-asks-1` does not fail — it
 * lands the reader at the top of the page and looks like the search simply is
 * not very good.
 *
 * So they are held together by a test rather than by a comment:
 * `anchor.test.ts` compiles **every heading actually on this site** through the
 * real plugin list and asserts the emitted id is the one this returns. That is
 * the only claim being made. This is not a general-purpose GitHub slugger and
 * does not try to be — it is the subset the site's own headings need, and the
 * day a heading needs more than the subset, the test says so before a reader
 * finds out.
 *
 * The rule, in one sentence a person could repeat: **lower-case it, drop
 * anything that is not a letter, a digit, a space, an underscore or a hyphen,
 * then turn each space into a hyphen.**
 */

const DROPPED = /[^\p{L}\p{N} _-]/gu

export const headingAnchor = (text: string): string =>
  text.toLowerCase().replace(DROPPED, "").replace(/ /g, "-")
