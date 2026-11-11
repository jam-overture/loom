import { gzipSync } from "node:zlib"

import { docsSections } from "../nav"

import { buildSearchIndex, searchProse, searchProseFor } from "./build"
import { searchDocs } from "./match"
import { proseAddressOf, withProse, type SearchProse } from "./model"
import { PROSE_TOTAL_GZIP_CAP, wordsUnder, type ProseCap } from "./room"

/**
 * The savings that would buy this site room without changing what the search
 * box sends, each priced, and the one reason none of them is the answer.
 *
 * **The plain version.** `room.ts` works out how long the next page on this
 * site may be, and today the answer is a few hundred words. The first thing
 * anybody reaching that number says is *then make the index smaller* — drop the
 * little words, lower-case it, take the punctuation out, stop writing the same
 * sentence down nineteen times. Every one of those is a real idea and one of
 * them buys twenty-five times the room the others do.
 *
 * So each is registered here, applied to the real words, and **priced off the
 * live index** rather than argued about. The table it produces is
 * [0353](../../../../../../decisions/0353-the-search-box-sends-a-reader-the-sentences-of-their-own-section-and-the-rest-of-the-site-by-title.md)'s
 * alternatives section, derived rather than typed, for the reason that record
 * gives about every other figure in it: a price written down is a price that
 * was right on the day somebody wrote it.
 *
 * ## The one reason they are all refused
 *
 * **A body is not only matched. It is shown.** `match.ts` cuts a window out of
 * `entry.body`, marks the reader's own words inside it, and puts that on the
 * screen as the row's excerpt — which is how a reader accounts for a result
 * they were offered. So every byte stored here is a byte that may end up in
 * front of somebody, and a saving that normalises the words buys its bytes out
 * of the one thing a result row has to be: *a sentence a reader can read.*
 *
 * That is one sentence and it settles the whole class, which is why the class
 * is registered in one place. What is left after it are the candidates that
 * change **which bodies travel** rather than **how they are written**, and
 * those are the four 0353 measures.
 *
 * ## What `shownInstead` is for
 *
 * The refusal above is a claim about what a reader would see, so it is run
 * rather than asserted: a candidate's words are put into a real index through
 * the published `withProse`, a real query is put through `searchDocs`, and the
 * excerpt that comes back is the excerpt that candidate would have shown. A
 * saving whose cost is described as the excerpt and which turns out not to
 * touch one fails its test beside the description.
 *
 * `identical-bodies-once` is in the registry precisely because it is the one
 * candidate that costs a reader nothing — and it recovers nothing, which is a
 * number worth having rather than an omission. The run that reaches for it
 * should reach past it.
 */

/** A body as the index stores it: the address, and the words under it. */
type Body = readonly [string, string]

/** Bytes rather than characters, the same way every figure in this directory is taken. */
const bytes = (text: string): number => Buffer.byteLength(text, "utf8")

/**
 * A sentence, for the candidate that stores one once.
 *
 * Crude on purpose, and the same crudeness `room.ts` admits to in `wordsIn`:
 * the figure this feeds is an order of magnitude, and a splitter that argued
 * about abbreviations would make it look more exact than the conclusion drawn
 * from it.
 */
const sentencesIn = (text: string): readonly string[] => text.split(/(?<=\.) /u)

/**
 * The words this site's prose is mostly made of, by count.
 *
 * **The membership of this list barely matters**, which is worth saying because
 * a list like this normally invites an argument about whether `no` belongs on
 * it. What it is here to produce is a *price* — about a quarter of the stored
 * bytes — and that figure moves by tens of bytes rather than thousands as words
 * come on and off it. It is the commonest function words of English, cut to the
 * ones that actually appear on this site often enough to weigh anything.
 */
const FUNCTION_WORDS: ReadonlySet<string> = new Set([
  "the", "a", "an", "of", "and", "to", "is", "it", "in", "that", "for", "on",
  "as", "be", "are", "was", "with", "or", "not", "this", "you", "your",
  "which", "what", "from", "at", "its", "no", "so", "but", "have", "has",
  "had", "they", "them", "their", "there", "then", "than", "one", "all", "any",
])

/** A word as the list spells it: letters only, so `words,` and `words` are one word. */
const bare = (word: string): string => word.replace(/[^a-z']/giu, "").toLowerCase()

export type ProseSaving = {
  readonly id: string
  /** What it does to the stored words, in a sentence a person could repeat. */
  readonly what: string
  /** What a reader loses by it. `"Nothing"` where they lose nothing. */
  readonly costs: string
  /**
   * The words as this candidate would store them, over the whole site at once.
   *
   * The whole site rather than one file, because two of the candidates are
   * about words appearing twice and *twice* is a fact about the site. Every
   * address is kept, emptied rather than dropped, so that a body this candidate
   * would send nothing for is a body the index has nothing to show from — which
   * is what a reader would meet, and not the same thing as a missing key.
   */
  readonly storedAs: (bodies: readonly Body[]) => readonly Body[]
}

/**
 * Every candidate, cheapest first.
 *
 * The order is the argument: **what a saving buys and what it takes run
 * together.** The one that costs a reader nothing recovers nothing, the one
 * that recovers nearly twenty-five times the rest takes the small words out of
 * every sentence this site would quote back to somebody, and the two in between
 * sit where their prices put them.
 */
export const PROSE_SAVINGS: readonly ProseSaving[] = [
  {
    id: "identical-bodies-once",
    what: "a body whose words are already stored under another address is stored once",
    costs: "Nothing — and it recovers nothing, because no two bodies on this site are identical",
    storedAs: (bodies) => {
      const stored = new Set<string>()

      return bodies.map(([href, words]) => {
        if (stored.has(words)) return [href, ""] as const

        stored.add(words)

        return [href, words] as const
      })
    },
  },
  {
    id: "repeated-sentences-once",
    what: "a sentence already stored under another address is left out of this one",
    costs:
      "The excerpt, on every page but the first: a reader who matches a shared sentence is shown it on one door and offered nothing by the other eighteen",
    storedAs: (bodies) => {
      const stored = new Set<string>()

      return bodies.map(([href, words]) => [
        href,
        sentencesIn(words)
          .filter((sentence) => {
            if (stored.has(sentence)) return false

            stored.add(sentence)

            return true
          })
          .join(" "),
      ] as const)
    },
  },
  {
    id: "lower-cased",
    what: "every stored sentence is lower-cased",
    costs:
      "The excerpt's capitals, so a row quotes `the Gate` as `the gate` and every proper name on this site arrives in the wrong case",
    storedAs: (bodies) => bodies.map(([href, words]) => [href, words.toLowerCase()] as const),
  },
  {
    id: "punctuation-dropped",
    what: "the punctuation comes out of every stored sentence",
    costs: "The excerpt's punctuation, so a quoted sentence arrives as a run of clauses with nothing between them",
    storedAs: (bodies) =>
      bodies.map(([href, words]) => [href, words.replace(/[.,;:!?()"'’“”—–…]/gu, "")] as const),
  },
  {
    id: "function-words-dropped",
    what: "the commonest function words are not stored",
    costs:
      "The excerpt, as a sentence at all — and which page answers: the matcher still looks for every word a reader typed, so a word that is no longer stored can only be found in a title, a section, a summary or a block, and a phrase stops being answered by the page whose sentence says it",
    storedAs: (bodies) =>
      bodies.map(([href, words]) => [
        href,
        words
          .split(" ")
          .filter((word) => !FUNCTION_WORDS.has(bare(word)))
          .join(" "),
      ] as const),
  },
]

export type SavingPrice = {
  readonly id: string
  /** What the five files the box serves would compress to. */
  readonly gz: number
  /** What they would be before compression. */
  readonly raw: number
  /** About how many words of room it would leave a page in this section. */
  readonly words: number
}

/**
 * Measured once, because weighing one candidate means rebuilding the whole
 * index and compressing five files, and the cheapest test here asks for four of
 * them.
 *
 * The same argument and the same safety as `room.ts`'s cache: every function
 * behind this is a pure function of the repository as it sits on disk.
 */
const priced = new Map<string, SavingPrice>()
let index: ReturnType<typeof buildSearchIndex> | undefined
let bodies: readonly Body[] | undefined

/**
 * Every body on the site, read once.
 *
 * `searchProse` walks thirty-five MDX files and renders nineteen reference
 * pages on every call, and nothing in `build.ts` keeps the result — which is
 * right there, where it is called once per served file, and wrong here, where
 * five candidates are each applied to the whole site and then compared against
 * it. Cached for the same reason and with the same safety `room.ts` gives: it
 * is a pure function of the repository as it sits on disk.
 */
const everyBody = (): readonly Body[] => (bodies ??= searchProse().bodies)

/**
 * The five files as this candidate would serve them.
 *
 * Built by rewriting the whole site's bodies and then handing each section's
 * file the words for the addresses it carries — so the bill is taken over the
 * files as served, which is the only honest way to take it (`build.test.ts`
 * says why: four files of one text cost more than one file of it) and the way
 * `room.ts` takes the bill it compares against.
 */
const filesUnder = (saving: ProseSaving): readonly string[] => {
  const rewritten = new Map(saving.storedAs(everyBody()))

  return docsSections.map((section) => {
    const file = searchProseFor(section.slug)

    return JSON.stringify({
      under: file.under,
      bodies: file.bodies.map(([key, words]) => [
        key,
        rewritten.get(proseAddressOf(file.under, key)) ?? words,
      ]),
    })
  })
}

/**
 * What a candidate would cost and what it would buy, in the unit a page is
 * written in.
 *
 * `words` is produced by handing `room.ts` a cap whose `spent` is this
 * candidate's bill — so the conversion from compressed bytes to words is the
 * published one and not a second copy of it, and a candidate's room and the
 * site's room are comparable because they were worked out the same way.
 */
export const priceOf = (saving: ProseSaving, sectionSlug: string): SavingPrice => {
  const key = `${saving.id} ${sectionSlug}`
  const known = priced.get(key)

  if (known !== undefined) return known

  const files = filesUnder(saving)
  const gz = files.reduce((total, file) => total + gzipSync(file).length, 0)
  const cap: ProseCap = {
    what: "every section's words",
    spent: gz,
    cap: PROSE_TOTAL_GZIP_CAP,
    measure: "gzipped",
  }
  const measured: SavingPrice = {
    id: saving.id,
    gz,
    raw: files.reduce((total, file) => total + bytes(file), 0),
    words: wordsUnder(cap, sectionSlug),
  }

  priced.set(key, measured)

  return measured
}

/**
 * The addresses this candidate would store different words under.
 *
 * The other half of what a saving costs, and the half an excerpt cannot show.
 * `repeated-sentences-once` leaves the first page that says a sentence exactly
 * as it is — so the top row of a search is unchanged and the saving looks free
 * — while taking that sentence off the eighteen other doors that also say it.
 * What a reader loses there is not the wording of a row but *the row*, and this
 * is the number that says how many addresses it happens to.
 */
export const addressesChangedBy = (saving: ProseSaving): readonly string[] => {
  const before = new Map(everyBody())

  return saving
    .storedAs(everyBody())
    .filter(([href, words]) => before.get(href) !== words)
    .map(([href]) => href)
}

export type ShownInstead = {
  readonly query: string
  /** The excerpt a reader is shown today, as one line. */
  readonly today: string
  /** The excerpt this candidate would show them for the same query. */
  readonly instead: string
}

/**
 * What a reader would be shown instead, run through the real box.
 *
 * This is the measurement the refusal rests on. A candidate's words go into a
 * real index through the published `withProse`, the query goes through
 * `searchDocs`, and what comes back is the row a reader would have got. The
 * first row whose excerpt is prose is the one taken, because that is the row
 * the saving is about — a code excerpt is cut from `entry.code`, which none of
 * these candidates touches.
 *
 * Undefined where the query answers with no prose excerpt at all, which is a
 * fact about the query rather than about the candidate: the test picks queries
 * this site answers and would rather say so than quietly assert about nothing.
 */
export const shownInstead = (saving: ProseSaving, query: string): ShownInstead | undefined => {
  const built = (index ??= buildSearchIndex())

  const excerpt = (prose: SearchProse): string | undefined => {
    const hit = searchDocs(withProse(built, prose), query, 10).find(
      (found) => !found.excerptIsCode && found.excerpt.length > 0
    )

    return hit === undefined ? undefined : hit.excerpt.map((part) => part.text).join("")
  }

  const today = excerpt({ under: "", bodies: everyBody() })
  const instead = excerpt({ under: "", bodies: saving.storedAs(everyBody()) })

  return today === undefined ? undefined : { query, today, instead: instead ?? "" }
}

/** Every candidate priced for a page written in this section, cheapest first. */
export const savingsPricedIn = (sectionSlug: string): readonly SavingPrice[] =>
  PROSE_SAVINGS.map((saving) => priceOf(saving, sectionSlug))

/**
 * What a run reaching for one of these should read, in the order the sentences
 * matter.
 *
 * Not a fault message — nothing here fails — but the same shape as
 * `room.ts`'s, and for the same reason: the number is read by somebody who has
 * just been told there is no room and is about to spend an afternoon making the
 * index smaller.
 */
export const savingsSentence = (sectionSlug: string): string => {
  const today = PROSE_SAVINGS.map((saving) => priceOf(saving, sectionSlug))
  const best = today.reduce((most, price) => (price.words > most.words ? price : most))

  return `loom: five savings over the stored words are priced in search/savings.ts. The largest, ${best.id}, would leave room for about ${best.words.toLocaleString("en-GB")} words. **None of them is the remedy**: a body is shown as well as matched, so each buys its bytes out of the sentence a result row quotes back to the reader. What is left are the four candidates in decisions/0353, which change which bodies travel rather than how they are written.`
}
