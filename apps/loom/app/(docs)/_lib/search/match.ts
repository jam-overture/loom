import type { SearchEntry, SearchIndex } from "./model"

/**
 * What "matching" means here, written down rather than tuned by feel.
 *
 * The rule in one sentence: **an entry has to match every word you typed
 * somewhere, and it is ranked by the best place each word was found.** Typing
 * two words narrows; it never widens. That is the behaviour a person expects
 * from a search box without being told, and it is the reason a query like
 * `gate reversible` finds the one heading rather than everything about either.
 *
 * There is no fuzzy matching and no stemming. Both would find more and both
 * would produce results a reader cannot account for — and this index is small
 * and its titles are the site's own words, so the honest failure mode is a
 * reader typing a word that genuinely is not on the site.
 */

const TITLE_EXACT = 100
const TITLE_PREFIX = 80
const TITLE_WORD = 60
const TITLE_ANYWHERE = 40
const CONTEXT = 20
const SUMMARY = 12

/**
 * **Prose first, names second**, and this is the rule rather than a nudge.
 *
 * It is here because the first version was not, and the first version was
 * wrong in a way that only showed up on the screen. Typing `gate` returned the
 * exports `gate`, `GatePolicy` and `gatePolicySchema` — an exact match and two
 * prefix matches — and only then the page called *What the Gate decides*. That
 * is defensible arithmetic and it is the wrong answer for this site, whose
 * reader is assumed not to have the model in their head. Somebody who does not
 * yet know what the Gate *is* should not have to scroll past three symbols to
 * find the page that tells them.
 *
 * A band rather than a bonus is what makes it hold: no field score can lift a
 * name above a page, so the rule is one a person can repeat — **the site's own
 * pages and sections come first, and the API names follow.** Nothing is hidden
 * by it. A reader who wants `definePrimitive` types `definePrimitive`, no page
 * or heading is called that, and the export is the first result as it should
 * be.
 */
const PROSE_BAND = 1000

const KIND_BONUS: Readonly<Record<SearchEntry["kind"], number>> = {
  page: PROSE_BAND + 8,
  heading: PROSE_BAND + 4,
  export: 0,
}

const NOT_WORD = /[^\p{L}\p{N}]+/u

/**
 * The words in a title, including the ones a camel hump hides.
 *
 * `planReverts` is two words to a reader and one to a string, so somebody
 * typing `revert` should get the same word-start credit they would get from
 * `plan`. Without this the runtime's own naming convention would be the thing
 * making its exports hard to find.
 */
const wordsOf = (text: string): readonly string[] =>
  text
    .replace(/([\p{Ll}\p{N}])(\p{Lu})/gu, "$1 $2")
    .toLowerCase()
    .split(NOT_WORD)
    .filter((word) => word !== "")

/** Where one typed word was found, at the best price it was found for. */
const scoreTerm = (entry: SearchEntry, term: string): number => {
  const title = entry.title.toLowerCase()

  if (title === term) return TITLE_EXACT
  if (title.startsWith(term)) return TITLE_PREFIX
  if (wordsOf(entry.title).some((word) => word.startsWith(term))) return TITLE_WORD
  if (title.includes(term)) return TITLE_ANYWHERE
  if (entry.context.toLowerCase().includes(term)) return CONTEXT
  if (entry.summary.toLowerCase().includes(term)) return SUMMARY

  return 0
}

export const searchTerms = (query: string): readonly string[] =>
  query
    .toLowerCase()
    .split(/\s+/)
    .filter((term) => term !== "")

export type SearchHit = {
  readonly entry: SearchEntry
  readonly score: number
}

/**
 * The ranked answer.
 *
 * Ties are broken by the shorter title and then by the order the index was
 * built in, so the same query always returns the same list in the same order. A
 * search box whose results shuffle between two identical queries is one a
 * reader stops trusting.
 */
export const searchDocs = (index: SearchIndex, query: string, limit: number): readonly SearchHit[] => {
  const terms = searchTerms(query)

  if (terms.length === 0) return []

  return index.entries
    .map((entry, position) => {
      const scores = terms.map((term) => scoreTerm(entry, term))

      return {
        entry,
        position,
        score: scores.some((score) => score === 0)
          ? 0
          : scores.reduce((total, score) => total + score, 0) + KIND_BONUS[entry.kind],
      }
    })
    .filter((hit) => hit.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.entry.title.length - b.entry.title.length ||
        a.position - b.position
    )
    .slice(0, limit)
    .map(({ entry, score }) => ({ entry, score }))
}
