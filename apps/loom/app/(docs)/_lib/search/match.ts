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
 * *Somewhere* now includes **the prose under the heading**, which is the field
 * added last and the cheapest place to be found. So `gate serverless` can be
 * answered by a section called neither, and the row shows the sentence that
 * answered it — because a result a reader cannot account for is one they stop
 * trusting, and a heading offered for a word that is not in it is exactly that.
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
 * A word in the prose: the cheapest place a term can be found, and on purpose.
 *
 * A heading that is *called* what you typed is a better answer than a heading
 * that *mentions* it once, every time, so the body can never lift an entry past
 * one that matches by name. What it does is bring an entry into the list at all
 * — which is the whole of the difference between a search box that answers
 * "the site says nothing about serverless" and one that hands over the two
 * paragraphs about it.
 */
const BODY = 6

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

const escapedForRegExp = (term: string): string => term.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")

/**
 * Where a typed word may be found in a paragraph: at the start of a word, and
 * nowhere else.
 *
 * The alternative is a plain substring, and a paragraph is long enough for that
 * to be wrong in a way a title never is — `gate` inside *propagate*, `ai` inside
 * *said*. Matching a word's start still lets somebody find `serverless` by
 * typing `server`, which is what a reader halfway through a word expects.
 */
const startsAWord = (text: string, term: string): boolean =>
  new RegExp(`(?<![\\p{L}\\p{N}])${escapedForRegExp(term)}`, "iu").test(text)

/** Where one typed word was found, at the best price it was found for. */
const scoreTerm = (entry: SearchEntry, term: string): number => {
  const title = entry.title.toLowerCase()

  if (title === term) return TITLE_EXACT
  if (title.startsWith(term)) return TITLE_PREFIX
  if (wordsOf(entry.title).some((word) => word.startsWith(term))) return TITLE_WORD
  if (title.includes(term)) return TITLE_ANYWHERE
  if (entry.context.toLowerCase().includes(term)) return CONTEXT
  if (entry.summary.toLowerCase().includes(term)) return SUMMARY
  if (startsAWord(entry.body, term)) return BODY

  return 0
}

export const searchTerms = (query: string): readonly string[] =>
  query
    .toLowerCase()
    .split(/\s+/)
    .filter((term) => term !== "")

/** One run of the excerpt, and whether it is a word the reader typed. */
export type ExcerptPart = {
  readonly text: string
  readonly match: boolean
}

export type SearchHit = {
  readonly entry: SearchEntry
  readonly score: number
  /**
   * The sentence the prose was found in, or nothing where the title already
   * said it. Empty for every result whose title, section or summary carried the
   * whole query — an excerpt there would repeat the row above it.
   */
  readonly excerpt: readonly ExcerptPart[]
}

/** How much of the paragraph either side of the word is worth showing. */
const BEFORE = 48
const AFTER = 132

const ELLIPSIS = "…"

/** Where a word the reader typed sits in the prose, every time it does. */
const placesIn = (text: string, term: string): readonly (readonly [number, number])[] =>
  [...text.matchAll(new RegExp(`(?<![\\p{L}\\p{N}])${escapedForRegExp(term)}`, "giu"))].map(
    (found) => [found.index, found.index + term.length] as const
  )

/**
 * A window on the prose that begins and ends on a whole word.
 *
 * Cutting mid-word reads as a rendering fault rather than as an excerpt, so
 * each edge moves to the nearest space and says so with an ellipsis — except at
 * the ends of the paragraph, where there is nothing being left out and an
 * ellipsis would claim there was.
 */
const windowOf = (body: string, at: number): string => {
  const rawFrom = Math.max(0, at - BEFORE)
  const rawTo = Math.min(body.length, at + AFTER)

  const space = body.indexOf(" ", rawFrom)
  const from = rawFrom === 0 || space === -1 || space > at ? rawFrom : space + 1

  const back = body.lastIndexOf(" ", rawTo)
  const to = rawTo === body.length || back <= at ? rawTo : back

  const cut = body.slice(from, to).trim()

  /*
   * The paragraph marks a name it left out with the same ellipsis (`prose.ts`),
   * so a window that stops beside one would print two in a row. One mark means
   * one omission, whoever made it.
   */
  const lead = from === 0 || cut.startsWith(ELLIPSIS) ? "" : ELLIPSIS
  const tail = to === body.length || cut.endsWith(ELLIPSIS) ? "" : ELLIPSIS

  return `${lead}${cut}${tail}`
}

/**
 * The excerpt, built from the first place the prose answered the query.
 *
 * Only the terms the *body* had to carry decide where the window sits — a word
 * that was already in the title is not why this result is here, and centring on
 * it would show the reader a sentence that does not contain the word they are
 * looking for. Every typed word inside the window is still marked, because a
 * reader scanning ten rows is looking for their own words in bold.
 */
const excerptOf = (entry: SearchEntry, terms: readonly string[]): readonly ExcerptPart[] => {
  const carried = terms.filter((term) => scoreTerm(entry, term) === BODY)

  if (carried.length === 0) return []

  const first = Math.min(...carried.flatMap((term) => placesIn(entry.body, term).map(([at]) => at)))

  if (!Number.isFinite(first)) return []

  const text = windowOf(entry.body, first)

  const marks = terms
    .flatMap((term) => placesIn(text, term))
    .sort(([a], [b]) => a - b)
    .reduce<readonly (readonly [number, number])[]>(
      (kept, place) =>
        (kept[kept.length - 1]?.[1] ?? -1) >= place[0] ? kept : [...kept, place],
      []
    )

  const { parts, end } = marks.reduce<{
    readonly parts: readonly ExcerptPart[]
    readonly end: number
  }>(
    (state, [at, to]) => ({
      parts: [
        ...state.parts,
        ...(at > state.end ? [{ text: text.slice(state.end, at), match: false }] : []),
        { text: text.slice(at, to), match: true },
      ],
      end: to,
    }),
    { parts: [], end: 0 }
  )

  return end < text.length ? [...parts, { text: text.slice(end), match: false }] : parts
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
    /*
     * The excerpt is cut after the ranking and after the limit, so the work of
     * reading a paragraph is done for the ten rows a reader will see rather
     * than for the nine hundred entries they will not.
     */
    .map(({ entry, score }) => ({ entry, score, excerpt: excerptOf(entry, terms) }))
}
