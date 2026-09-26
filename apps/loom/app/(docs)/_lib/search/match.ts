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
 * *Somewhere* includes **the prose under the heading** and, below that, **the
 * code**. So `gate serverless` can be answered by a section called neither, and
 * `commitIntent` by a page that only ever prints it in a block a reader was
 * invited to copy. Either way the row shows the sentence or the line that
 * answered it — because a result a reader cannot account for is one they stop
 * trusting, and a heading offered for a word that is not in it is exactly
 * that.
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
 * A word in a code block: cheaper still, and the last band there is.
 *
 * The order is the same argument one step further down. A heading *called* what
 * you typed beats one that mentions it in a sentence, which beats one that
 * prints it in a snippet. What this band does is the same thing the prose band
 * does — bring a page into the list at all, so that a reader who saw
 * `commitIntent` in a block, or typed the install command off *Installation*,
 * is handed the page instead of being told the site has never heard of it.
 *
 * It sits below the prose rather than above it for the reason `prose.ts` gives
 * for leaving inline code out of the words: a name is the one query where the
 * export itself should win, and the exports are already the band under
 * everything. Code that could outrank a sentence would put a page that uses a
 * call above the page that explains it.
 */
const CODE = 3

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

/**
 * **A page that only shows a name in a snippet does not get the prose band**,
 * and this is the one thing indexing the code had to be careful about.
 *
 * The band's argument is about English. Somebody who does not yet know what the
 * Gate *is* should not have to scroll past three symbols to reach the page that
 * tells them, and the band is what guarantees that. The prose index could take
 * it for free because prose has no names in it — `prose.ts` elides every span
 * between backticks for exactly this reason.
 *
 * Code has nothing but names, so the band it inherited was wrong the moment it
 * arrived: typing `definePrimitive` returned a heading called *Defining one*
 * ahead of the export spelled letter-for-letter, because a heading in the band
 * outscores any name outside it. That is the failure the band exists to prevent,
 * upside down.
 *
 * So an entry whose *whole* claim is a snippet drops out of the band and takes
 * its place below the names, keeping the same order among themselves. The rule
 * stays one a person can repeat: **a page that says it in words comes before
 * the name; a page that only shows it in a block comes after.** An entry that
 * matched on anything else — a title, a section, a sentence — is in the band as
 * it always was, and a second word found in its code costs it nothing.
 */
const bandedBonus = (entry: SearchEntry, scores: readonly number[]): number =>
  scores.every((score) => score === CODE)
    ? KIND_BONUS[entry.kind] - PROSE_BAND
    : KIND_BONUS[entry.kind]

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
  if (startsAWord(entry.code, term)) return CODE

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
   * The sentence the prose was found in, or the line of code, or nothing where
   * the title already said it. Empty for every result whose title, section or
   * summary carried the whole query — an excerpt there would repeat the row
   * above it.
   */
  readonly excerpt: readonly ExcerptPart[]
  /**
   * Whether that excerpt is a line of code, so the row can set it in the
   * typeface it was written in.
   *
   * A line of TypeScript in the site's prose face reads as prose that has gone
   * wrong. It is also the whole account a reader gets of why a page about
   * something else is in their list, so it has to be recognisable as a snippet
   * at a glance.
   */
  readonly excerptIsCode: boolean
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
 * The one line of code a word was found on.
 *
 * A line rather than a window, because code is written in lines and a cut that
 * ignored them would hand a reader half a call and half of the next one. A line
 * long enough to be a paragraph is windowed as prose would be, which is the
 * only case where the two rules meet.
 */
const lineOf = (code: string, at: number): string => {
  const from = code.lastIndexOf("\n", at) + 1
  const found = code.indexOf("\n", at)
  const raw = code.slice(from, found === -1 ? code.length : found)

  /*
   * Indentation is not information in a one-line excerpt, and dropping it moves
   * the word — so it comes off before the offset is worked out rather than
   * after, which is how a windowed line would otherwise be centred on the wrong
   * character.
   */
  const line = raw.trimStart().trimEnd()
  const within = at - from - (raw.length - raw.trimStart().length)

  return line.length <= BEFORE + AFTER ? line : windowOf(line, within)
}

/**
 * The excerpt, built from the first place the page answered the query, and from
 * the prose before the code.
 *
 * Only the terms a *field* had to carry decide where the cut sits — a word that
 * was already in the title is not why this result is here, and centring on it
 * would show the reader a sentence that does not contain the word they are
 * looking for. Every typed word inside the cut is still marked, because a
 * reader scanning ten rows is looking for their own words in bold.
 *
 * **Prose wins where both could answer.** A query whose words are split across
 * a sentence and a snippet shows the sentence, which is the half more likely to
 * mean something to somebody who does not have the model in their head — and it
 * keeps the rule to one a person can repeat rather than an arithmetic nobody
 * can predict from the screen.
 */
/**
 * Where the page answered: the place the reader's words are most together.
 *
 * It was *the first place any of them appeared*, which is the same thing on a
 * paragraph and is not on a page. A written page's words are cut up by heading,
 * so a body is a few sentences and the first `two` in it is in the sentence
 * about `two`; a generated page's words are the **whole page** in one body
 * (`search/generated.ts`), and the first `two` in 4,500 characters is wherever
 * the word happens to fall. Searching *same declaration reached two ways* on
 * the reference's front door showed a reader a sentence about how long it takes
 * to pick an import — every word they typed was on that page, and none was in
 * the line they were shown.
 *
 * So each place is scored by how many of their words a window centred on it
 * would contain, and the best wins. **Ties go to the earliest**, which keeps
 * the old behaviour wherever the terms are as together at the top as anywhere
 * else, and keeps the same query answering with the same line every time.
 */
const answeredAt = (text: string, carried: readonly string[]): number | undefined => {
  const byTerm = carried.map((term) => placesIn(text, term).map(([at]) => at))
  const starts = byTerm.flat().sort((a, b) => a - b)

  const best = starts.reduce<{ readonly start: number; readonly words: number } | undefined>(
    (found, start) => {
      const words = byTerm.filter((places) =>
        places.some((at) => at >= start - BEFORE && at <= start + AFTER)
      ).length

      return found === undefined || words > found.words ? { start, words } : found
    },
    undefined
  )

  return best?.start
}

const cutFrom = (
  text: string,
  carried: readonly string[],
  terms: readonly string[],
  cut: (text: string, at: number) => string
): readonly ExcerptPart[] => {
  const at = answeredAt(text, carried)

  if (at === undefined) return []

  return marked(cut(text, at), terms)
}

const excerptOf = (
  entry: SearchEntry,
  terms: readonly string[]
): { readonly parts: readonly ExcerptPart[]; readonly isCode: boolean } => {
  const fromProse = terms.filter((term) => scoreTerm(entry, term) === BODY)

  if (fromProse.length > 0) {
    return { parts: cutFrom(entry.body, fromProse, terms, windowOf), isCode: false }
  }

  const fromCode = terms.filter((term) => scoreTerm(entry, term) === CODE)

  if (fromCode.length === 0) return { parts: [], isCode: false }

  return { parts: cutFrom(entry.code, fromCode, terms, lineOf), isCode: true }
}

/** The reader's own words picked out of the excerpt, in the order they appear. */
const marked = (text: string, terms: readonly string[]): readonly ExcerptPart[] => {
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
          : scores.reduce((total, score) => total + score, 0) + bandedBonus(entry, scores),
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
    .map(({ entry, score }) => {
      const { parts, isCode } = excerptOf(entry, terms)

      return { entry, score, excerpt: parts, excerptIsCode: isCode }
    })
}
